import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Info,
  Plane,
  Search,
} from 'lucide-react';
import axios from 'axios';
import Button from '../ui/Button';
import { AIRPORT_OPTIONS } from '../../data/flightMock';
import { salamairCreateSession, salamairSearchFlights } from '../../services/salamairApi';

type TripKind = 'oneway' | 'round';

/** "MCT — Muscat" → show city first so Origin vs Destination reads clearly. */
function formatAirportOption(opt: { code: string; label: string }): string {
  const sep = ' — ';
  if (opt.label.includes(sep)) {
    const city = opt.label.split(sep)[1]?.trim() ?? opt.code;
    return `${city} (${opt.code})`;
  }
  return opt.label;
}

function addDays(isoDate: string, days: number): string {
  const d = new Date(isoDate + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function defaultOutbound(): string {
  const d = new Date();
  d.setDate(d.getDate() + 14);
  return d.toISOString().slice(0, 10);
}

/** Matches SalamAir `api/flights` market payload (first flight used for schedule). */
interface SalamAirFlightOffer {
  departureDate?: string;
  arrivalDate?: string;
  segments?: Array<{
    flightNumber?: string;
    operatingFlightNumber?: string;
    departureDate?: string;
    arrivalDate?: string;
    flightTime?: number;
    stops?: number;
    originCode?: string;
    destinationCode?: string;
    legs?: Array<{
      departureDate?: string;
      arrivalDate?: string;
      flightNumber?: string;
      operatingFlightNumber?: string;
      carrierCode?: string;
      origin?: string;
      destination?: string;
      flightTime?: number;
    }>;
  }>;
}

interface MarketRow {
  date: string;
  lowestFare: number;
  flights: SalamAirFlightOffer[] | null;
}

function formatClock(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
}

/** First segment / leg times (local as returned by API). */
function formatDurationMinutes(totalMin: number): string {
  if (!totalMin || totalMin < 1) return '—';
  const h = Math.floor(totalMin / 60);
  const m = Math.round(totalMin % 60);
  if (h <= 0) return `${m}min`;
  if (m === 0) return `${h}hr`;
  return `${h}hr ${m}min`;
}

/** Full first-leg detail for “original SalamAir” style row. */
function extractLegDetail(m: MarketRow): {
  dep: string;
  arr: string;
  origin: string;
  dest: string;
  durationLabel: string;
  metaLine: string;
} | null {
  const flights = m.flights;
  if (!Array.isArray(flights) || flights.length === 0) return null;
  const top = flights[0];
  const seg = Array.isArray(top.segments) && top.segments.length > 0 ? top.segments[0] : null;
  const leg = seg?.legs && seg.legs.length > 0 ? seg.legs[0] : null;

  const depIso = leg?.departureDate ?? seg?.departureDate ?? top.departureDate;
  const arrIso = leg?.arrivalDate ?? seg?.arrivalDate ?? top.arrivalDate;
  if (!depIso || !arrIso) return null;

  const origin = (leg?.origin ?? seg?.originCode ?? '?').toString();
  const dest = (leg?.destination ?? seg?.destinationCode ?? '?').toString();
  const fn =
    leg?.flightNumber ??
    leg?.operatingFlightNumber ??
    seg?.flightNumber ??
    seg?.operatingFlightNumber;
  const carrier = leg?.carrierCode ?? 'OV';
  const stops = typeof seg?.stops === 'number' ? seg.stops : 0;
  const durMin = seg?.flightTime ?? leg?.flightTime ?? 0;

  const metaLine = [
    fn ? `${carrier}${fn}` : carrier,
    stops <= 0 ? 'Direct' : `${stops} stop(s)`,
    durMin ? `Total duration ${formatDurationMinutes(durMin)}` : null,
  ]
    .filter(Boolean)
    .join(' | ');

  return {
    dep: formatClock(depIso),
    arr: formatClock(arrIso),
    origin,
    dest,
    durationLabel: formatDurationMinutes(durMin),
    metaLine,
  };
}

function extractScheduleFromMarket(m: MarketRow): {
  dep: string;
  arr: string;
  flightLabel?: string;
} | null {
  const flights = m.flights;
  if (!Array.isArray(flights) || flights.length === 0) return null;
  const top = flights[0];
  const seg = Array.isArray(top.segments) && top.segments.length > 0 ? top.segments[0] : null;
  const leg = seg?.legs && seg.legs.length > 0 ? seg.legs[0] : null;

  const depIso = leg?.departureDate ?? seg?.departureDate ?? top.departureDate;
  const arrIso = leg?.arrivalDate ?? seg?.arrivalDate ?? top.arrivalDate;
  if (!depIso || !arrIso) return null;

  const fn =
    leg?.flightNumber ??
    leg?.operatingFlightNumber ??
    seg?.flightNumber ??
    seg?.operatingFlightNumber;
  const carrier = leg?.carrierCode ?? 'OV';

  return {
    dep: formatClock(depIso),
    arr: formatClock(arrIso),
    flightLabel: fn ? `${carrier} ${fn}` : undefined,
  };
}

interface TripBlock {
  origin?: string;
  destination?: string;
  originCity?: string;
  destinationCity?: string;
  currencyCode?: string;
  markets?: MarketRow[];
}

interface FlightsPayload {
  trips?: TripBlock[];
  additionalMessage?: string | null;
  currencies?: string[];
  searchRequest?: {
    departureDate?: string;
    originStationCode?: string;
    destinationStationCode?: string;
  };
}

const BOOKING_SALAMAIR = 'https://booking.salamair.com/en/search';

const fieldClass =
  'h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 shadow-sm transition-colors placeholder:text-gray-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:focus:border-teal-400 dark:focus:ring-teal-500/25';

function formatFareDisplay(amount: number, currencyCode: string | undefined): string {
  if (amount <= 0) return '';
  const code = (currencyCode ?? 'USD').slice(0, 3);
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: code,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${code} ${amount.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  }
}

function formatDayShort(iso: string): { dow: string; dayMon: string } {
  const d = new Date(iso);
  return {
    dow: d.toLocaleDateString('en-GB', { weekday: 'short' }),
    dayMon: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
  };
}

function formatRouteDateLine(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function sameCalendarDay(a: string, b: string): boolean {
  const da = new Date(a.includes('T') ? a : `${a}T12:00:00`);
  const db = new Date(b.includes('T') ? b : `${b}T12:00:00`);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

function DepartingFlightBlock({
  trip,
  departureAnchorIso,
}: {
  trip: TripBlock;
  departureAnchorIso?: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const markets = trip.markets ?? [];
  const currency = trip.currencyCode;

  const positiveFares = useMemo(
    () => markets.map((m) => m.lowestFare).filter((f) => f > 0),
    [trip.markets]
  );
  const cheapestFare = positiveFares.length ? Math.min(...positiveFares) : null;

  const originLabel = (trip.originCity ?? trip.origin ?? '?').toUpperCase();
  const destLabel = (trip.destinationCity ?? trip.destination ?? '?').toUpperCase();

  const headlineDateIso = departureAnchorIso ?? markets[0]?.date;

  const defaultMarketIndex = useMemo(() => {
    if (!markets.length) return 0;
    if (departureAnchorIso) {
      const idx = markets.findIndex((m) => m.date && sameCalendarDay(m.date, departureAnchorIso));
      if (idx >= 0) return idx;
    }
    const firstPrice = markets.findIndex((m) => typeof m.lowestFare === 'number' && m.lowestFare > 0);
    return firstPrice >= 0 ? firstPrice : 0;
  }, [markets, departureAnchorIso]);

  const [selectedMarketIndex, setSelectedMarketIndex] = useState(0);

  useEffect(() => {
    setSelectedMarketIndex(defaultMarketIndex);
  }, [defaultMarketIndex]);

  const selectedMarket = markets[selectedMarketIndex];
  const legDetail = selectedMarket ? extractLegDetail(selectedMarket) : null;

  function scrollCarousel(dir: -1 | 1) {
    const el = scrollRef.current;
    if (!el) return;
    const w = el.clientWidth * 0.6 * dir;
    el.scrollBy({ left: w, behavior: 'smooth' });
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-md ring-1 ring-black/[0.03] dark:border-gray-700 dark:bg-gray-900 dark:ring-white/5">
      <div className="h-1 bg-gradient-to-r from-teal-600 via-teal-500 to-emerald-500" aria-hidden />
      <div className="border-b border-teal-700/15 bg-gradient-to-b from-teal-50/90 to-white px-4 py-4 dark:border-teal-900/30 dark:from-teal-950/40 dark:to-gray-900 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-800 dark:text-teal-300">
              Departing flight
            </h3>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-gray-800 dark:text-gray-100">
              <Plane className="h-4 w-4 shrink-0 text-lime-600 dark:text-lime-400" aria-hidden />
              <span className="font-bold tracking-wide">
                {originLabel}{' '}
                <span className="mx-0.5 font-normal text-lime-700/90 dark:text-lime-400/90">TO</span> {destLabel}
              </span>
            </div>
            {headlineDateIso && (
              <p className="mt-1.5 text-sm font-semibold uppercase tracking-wide text-lime-600 dark:text-lime-400">
                {formatRouteDateLine(headlineDateIso)}
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            {currency && (
              <span className="rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-semibold text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200">
                {currency}
              </span>
            )}
            <a
              href="#find-flights"
              className="text-xs font-bold uppercase tracking-wide text-sky-600 hover:underline dark:text-sky-400"
            >
              Modify search
            </a>
            <a
              href={BOOKING_SALAMAIR}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-teal-200 bg-white px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-teal-800 shadow-sm transition-colors hover:bg-teal-50 dark:border-teal-700 dark:bg-teal-950/50 dark:text-teal-200 dark:hover:bg-teal-900/40"
            >
              Book on SalamAir
              <ExternalLink className="h-3.5 w-3.5 opacity-80" />
            </a>
          </div>
        </div>
      </div>

      <div className="px-3 py-4 sm:px-5">
        <div className="relative flex items-center gap-1">
          <button
            type="button"
            onClick={() => scrollCarousel(-1)}
            className="hidden sm:flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-amber-200/80 bg-amber-50 text-teal-800 shadow-sm hover:bg-amber-100 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-teal-300 dark:hover:bg-amber-900/30"
            aria-label="Scroll dates left"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <div
            ref={scrollRef}
            className="flex min-h-[7.5rem] flex-1 gap-2 overflow-x-auto scroll-smooth pb-1 pt-0.5 snap-x snap-mandatory scrollbar-thin [-ms-overflow-style:none] [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300 dark:[&::-webkit-scrollbar-thumb]:bg-gray-600"
          >
            {markets.map((m, mi) => {
              const hasPrice = typeof m.lowestFare === 'number' && m.lowestFare > 0;
              const isNoFlights = !hasPrice;
              const isCheapest = hasPrice && cheapestFare !== null && m.lowestFare === cheapestFare;
              const isSelected = mi === selectedMarketIndex;
              const { dow, dayMon } = m.date ? formatDayShort(m.date) : { dow: '—', dayMon: '' };
              const sched = extractScheduleFromMarket(m);

              return (
                <button
                  key={mi}
                  type="button"
                  onClick={() => hasPrice && setSelectedMarketIndex(mi)}
                  disabled={!hasPrice}
                  className={`flex min-w-[6.25rem] shrink-0 snap-start flex-col items-center justify-center rounded-xl border px-2 py-2 text-center transition-all sm:min-w-[7rem] ${
                    !hasPrice
                      ? 'cursor-not-allowed opacity-70'
                      : 'cursor-pointer hover:border-lime-400/80'
                  } ${
                    isSelected && hasPrice
                      ? 'border-lime-500 bg-white ring-2 ring-lime-400/40 dark:border-lime-400 dark:ring-lime-500/30'
                      : isCheapest && hasPrice
                        ? 'border-emerald-400 bg-emerald-50/90 dark:border-emerald-500/60 dark:bg-emerald-950/40'
                        : 'border-gray-200 bg-gray-50/50 dark:border-gray-600 dark:bg-gray-800/40'
                  }`}
                >
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    {dow}
                  </span>
                  <span className="text-[11px] text-gray-700 dark:text-gray-200">{dayMon}</span>
                  {isNoFlights ? (
                    <span className="mt-1.5 text-[10px] leading-tight text-gray-400 dark:text-gray-500">
                      No flights
                    </span>
                  ) : (
                    <>
                      <span
                        className={`mt-1.5 text-sm font-bold tabular-nums ${
                          isCheapest
                            ? 'text-emerald-700 dark:text-emerald-300'
                            : isSelected
                              ? 'text-lime-700 dark:text-lime-300'
                              : 'text-gray-900 dark:text-gray-100'
                        }`}
                      >
                        {formatFareDisplay(m.lowestFare, currency)}
                      </span>
                      {sched && (
                        <span className="mt-1 text-[9px] font-medium leading-tight tabular-nums text-gray-600 dark:text-gray-400">
                          {sched.dep}–{sched.arr}
                        </span>
                      )}
                    </>
                  )}
                  {isCheapest && hasPrice && (
                    <span className="mt-1 rounded bg-emerald-600/90 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white dark:bg-emerald-600">
                      Lowest
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => scrollCarousel(1)}
            className="hidden sm:flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-amber-200/80 bg-amber-50 text-teal-800 shadow-sm hover:bg-amber-100 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-teal-300 dark:hover:bg-amber-900/30"
            aria-label="Scroll dates right"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {selectedMarket && legDetail && selectedMarket.lowestFare > 0 && (
          <div className="mt-6 space-y-3 border-t border-gray-100 pt-5 dark:border-gray-800">
            <p className="text-center text-xs text-gray-500 dark:text-gray-400">
              {selectedMarket.date ? formatRouteDateLine(selectedMarket.date) : ''}
            </p>
            <div className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-600 dark:bg-gray-800/40 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
              <div className="flex flex-1 flex-col items-center justify-center gap-3 sm:flex-row sm:gap-8">
                <div className="text-center sm:text-right">
                  <div className="text-3xl font-bold tabular-nums text-gray-900 dark:text-white">{legDetail.dep}</div>
                  <div className="mt-0.5 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    {legDetail.origin} — Departure
                  </div>
                </div>
                <div
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-lime-100 text-lime-700 shadow-inner dark:bg-lime-900/40 dark:text-lime-300"
                  aria-hidden
                >
                  <Plane className="h-6 w-6" />
                </div>
                <div className="text-center sm:text-left">
                  <div className="text-3xl font-bold tabular-nums text-gray-900 dark:text-white">{legDetail.arr}</div>
                  <div className="mt-0.5 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    {legDetail.dest} — Arrival
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 flex-col justify-center rounded-xl bg-gradient-to-br from-lime-500 to-emerald-600 px-5 py-4 text-center text-white shadow-md lg:min-w-[11rem]">
                <span className="text-xs font-semibold uppercase tracking-wide opacity-95">From</span>
                <span className="text-2xl font-bold tabular-nums">
                  {formatFareDisplay(selectedMarket.lowestFare, currency)}
                </span>
              </div>
            </div>
            {legDetail.metaLine && (
              <p className="text-center text-xs text-gray-600 dark:text-gray-400">{legDetail.metaLine}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SalamAirLiveSearch() {
  const [from, setFrom] = useState('MCT');
  const [to, setTo] = useState('DXB');
  const [tripKind, setTripKind] = useState<TripKind>('oneway');
  const [depart, setDepart] = useState(defaultOutbound);
  const [returnDate, setReturnDate] = useState(() => addDays(defaultOutbound(), 7));
  const [adults, setAdults] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<FlightsPayload | null>(null);

  const fromOptions = useMemo(
    () => AIRPORT_OPTIONS.filter((a) => a.code !== to),
    [to]
  );
  const toOptions = useMemo(
    () => AIRPORT_OPTIONS.filter((a) => a.code !== from),
    [from]
  );

  useEffect(() => {
    if (from !== to || AIRPORT_OPTIONS.length < 2) return;
    const next = AIRPORT_OPTIONS.find((a) => a.code !== from);
    if (next) setTo(next.code);
  }, [from, to]);

  const datesStr =
    tripKind === 'round' ? `${depart}|${returnDate}` : depart;

  async function runSearch() {
    if (from === to) {
      setError('Choose different origin and destination.');
      return;
    }
    setError(null);
    setPayload(null);
    setLoading(true);
    try {
      const { token } = await salamairCreateSession();
      if (!token) {
        setError('SalamAir did not return a session. Try again in a moment.');
        return;
      }
      const res = await salamairSearchFlights(
        {
          route: `${from}-${to}`,
          counts: `${adults}-0-0-0`,
          dates: datesStr,
          flightType: tripKind === 'round' ? 'round' : 'oneway',
          days: 7,
        },
        token
      );
      setPayload(res.data as FlightsPayload);
    } catch (e) {
      if (axios.isAxiosError(e)) {
        const msg =
          (e.response?.data as { error?: { message?: string } })?.error?.message ??
          e.message;
        setError(msg || 'Search failed.');
      } else {
        setError('Search failed.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 pb-8 min-h-[min(85vh,900px)]">
      {/* Search card — airline-style strip + compact form */}
      <div
        id="find-flights"
        className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-md ring-1 ring-black/[0.03] dark:border-gray-700 dark:bg-gray-900 dark:ring-white/5 scroll-mt-4"
      >
        <div className="h-1.5 bg-gradient-to-r from-teal-600 via-teal-500 to-emerald-500" aria-hidden />
        <div className="border-b border-gray-100 px-4 py-3.5 dark:border-gray-800 sm:px-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-bold uppercase tracking-[0.12em] text-teal-800 dark:text-teal-300">
              Find flights
            </h2>
            <details className="group text-xs text-gray-500 dark:text-gray-400">
              <summary className="flex cursor-pointer list-none items-center gap-1.5 rounded-lg px-2 py-1 font-medium text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800 [&::-webkit-details-marker]:hidden">
                <Info className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" aria-hidden />
                How this works
              </summary>
              <p className="mt-2 max-w-md rounded-lg bg-gray-50 px-3 py-2 text-[11px] leading-relaxed text-gray-600 dark:bg-gray-800/80 dark:text-gray-400">
                Availability is loaded from SalamAir through this portal (not an embedded iframe). Complete booking
                and payment on{' '}
                <a
                  href={BOOKING_SALAMAIR}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-teal-600 hover:underline dark:text-teal-400"
                >
                  booking.salamair.com
                </a>
                .
              </p>
            </details>
          </div>
        </div>

        <div className="p-4 sm:p-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-12 lg:items-end lg:gap-x-3 lg:gap-y-3">
            <label className="sm:col-span-1 lg:col-span-2 flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">From</span>
              <select
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                aria-label="Origin airport"
                className={fieldClass}
              >
                {fromOptions.map((opt) => (
                  <option key={opt.code} value={opt.code}>
                    {formatAirportOption(opt)}
                  </option>
                ))}
              </select>
            </label>
            <label className="sm:col-span-1 lg:col-span-2 flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">To</span>
              <select
                value={to}
                onChange={(e) => setTo(e.target.value)}
                aria-label="Destination airport"
                className={fieldClass}
              >
                {toOptions.map((opt) => (
                  <option key={opt.code} value={opt.code}>
                    {formatAirportOption(opt)}
                  </option>
                ))}
              </select>
            </label>

            <div className="sm:col-span-1 lg:col-span-2 flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Trip</span>
              <div className="flex h-11 rounded-lg border border-gray-200 bg-gray-50/80 p-0.5 dark:border-gray-600 dark:bg-gray-800/50">
                <button
                  type="button"
                  onClick={() => setTripKind('oneway')}
                  className={`flex-1 rounded-md text-xs font-semibold transition-colors ${
                    tripKind === 'oneway'
                      ? 'bg-white text-teal-700 shadow-sm dark:bg-gray-700 dark:text-teal-300'
                      : 'text-gray-600 dark:text-gray-400'
                  }`}
                >
                  One way
                </button>
                <button
                  type="button"
                  onClick={() => setTripKind('round')}
                  className={`flex-1 rounded-md text-xs font-semibold transition-colors ${
                    tripKind === 'round'
                      ? 'bg-white text-teal-700 shadow-sm dark:bg-gray-700 dark:text-teal-300'
                      : 'text-gray-600 dark:text-gray-400'
                  }`}
                >
                  Return
                </button>
              </div>
            </div>

            <label className="sm:col-span-1 lg:col-span-2 flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Depart</span>
              <input
                type="date"
                value={depart}
                onChange={(e) => setDepart(e.target.value)}
                className={fieldClass}
              />
            </label>

            {tripKind === 'round' && (
              <label className="sm:col-span-1 lg:col-span-2 flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Return</span>
                <input
                  type="date"
                  value={returnDate}
                  onChange={(e) => setReturnDate(e.target.value)}
                  min={depart}
                  className={fieldClass}
                />
              </label>
            )}

            <label className="sm:col-span-1 lg:col-span-2 flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Adults</span>
              <input
                type="number"
                min={1}
                max={9}
                value={adults}
                onChange={(e) => setAdults(Math.min(9, Math.max(1, Number(e.target.value) || 1)))}
                className={fieldClass}
              />
            </label>
          </div>

          <div className="mt-5 flex justify-stretch border-t border-gray-100 pt-4 dark:border-gray-800 sm:justify-end">
            <Button
              type="button"
              variant="primary"
              size="md"
              className="h-11 w-full min-w-[12.5rem] justify-center rounded-xl px-6 text-sm font-bold shadow-md sm:w-auto"
              onClick={() => void runSearch()}
              disabled={loading}
              isLoading={loading}
            >
              <Search className="h-4 w-4 shrink-0" aria-hidden />
              Search flights
            </Button>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {payload && (
        <div className="space-y-4">
          {payload.additionalMessage && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
              {payload.additionalMessage}
            </div>
          )}
          {!payload.trips?.length && (
            <p className="text-sm text-gray-600 dark:text-gray-400">No trip data returned for this search.</p>
          )}
          {payload.trips?.map((trip, ti) => (
            <DepartingFlightBlock
              key={ti}
              trip={trip}
              departureAnchorIso={
                payload.searchRequest?.departureDate ?? `${depart}T12:00:00`
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
