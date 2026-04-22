import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ChevronDown,
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
import MiniCalendar from './MiniCalendar';

type TripKind = 'oneway' | 'round' | 'multi';

function addDays(isoDate: string, days: number): string {
  const d = new Date(isoDate + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/** e.g. "30 Apr, 2026" — matches Salam Air booking copy. */
function formatBookDisplayDate(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return '—';
  const d = new Date(iso + 'T12:00:00');
  const mon = d.toLocaleString('en-GB', { month: 'short' });
  return `${d.getDate()} ${mon}, ${d.getFullYear()}`;
}

function airportNameLine(opt: { code: string; label: string } | undefined): string {
  if (!opt) return '';
  const city = opt.label.includes(' — ') ? opt.label.split(' — ')[1]?.trim() : opt.label;
  return city ? `${city} International Airport` : opt.code;
}

function defaultMonthFor(iso: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return { year: new Date().getFullYear(), month0: new Date().getMonth() };
  return { year: Number(m[1]), month0: Number(m[2]) - 1 };
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
  'h-10 w-full rounded-lg border border-[#E0E0E0] bg-white px-3 text-sm text-gray-900 shadow-sm transition-colors focus:border-[#00A9C1] focus:outline-none focus:ring-2 focus:ring-[#00A9C1]/20 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100';

function AirportPillSelect({
  label,
  'aria-label': aria,
  value,
  onChange,
  options,
}: {
  label: string;
  'aria-label': string;
  value: string;
  onChange: (code: string) => void;
  options: { code: string; label: string }[];
}) {
  const opt = options.find((o) => o.code === value) ?? options[0];
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {label}
      </span>
      <div className="relative min-h-[5.5rem] rounded border border-[#E0E0E0] bg-white px-4 py-3 pr-11 shadow-sm dark:border-gray-600 dark:bg-gray-900">
        <select
          className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label={aria}
        >
          {options.map((o) => (
            <option key={o.code} value={o.code}>
              {o.label}
            </option>
          ))}
        </select>
        <div className="pointer-events-none flex min-h-[4.25rem] flex-col justify-center">
          <span className="text-2xl font-bold tracking-tight text-[#00A9C1] sm:text-3xl">
            {value}
          </span>
          <span className="mt-0.5 line-clamp-2 text-sm text-slate-800 dark:text-slate-200">
            {airportNameLine(opt)}
          </span>
        </div>
        <ChevronDown
          className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
          aria-hidden
        />
      </div>
    </div>
  );
}

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
  const [tripKind, setTripKind] = useState<TripKind>('round');
  const [from2, setFrom2] = useState('DXB');
  const [to2, setTo2] = useState('MCT');
  const [depart, setDepart] = useState(defaultOutbound);
  const [returnDate, setReturnDate] = useState(() => addDays(defaultOutbound(), 7));
  const [depart2, setDepart2] = useState(() => addDays(defaultOutbound(), 7));
  const [adults, setAdults] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<FlightsPayload | null>(null);

  const [minIso] = useState(() => new Date().toISOString().slice(0, 10));

  const fromOptions = useMemo(
    () => AIRPORT_OPTIONS.filter((a) => a.code !== to),
    [to]
  );
  const toOptions = useMemo(
    () => AIRPORT_OPTIONS.filter((a) => a.code !== from),
    [from]
  );
  const from2Options = useMemo(
    () => AIRPORT_OPTIONS.filter((a) => a.code !== to2),
    [to2]
  );
  const to2Options = useMemo(
    () => AIRPORT_OPTIONS.filter((a) => a.code !== from2),
    [from2]
  );

  useEffect(() => {
    if (from !== to || AIRPORT_OPTIONS.length < 2) return;
    const next = AIRPORT_OPTIONS.find((a) => a.code !== from);
    if (next) setTo(next.code);
  }, [from, to]);

  useEffect(() => {
    if (from2 !== to2 || AIRPORT_OPTIONS.length < 2) return;
    const next = AIRPORT_OPTIONS.find((a) => a.code !== from2);
    if (next) setTo2(next.code);
  }, [from2, to2]);

  useEffect(() => {
    if (tripKind !== 'round') return;
    if (returnDate < depart) setReturnDate(depart);
  }, [depart, returnDate, tripKind]);

  useEffect(() => {
    if (tripKind !== 'multi') return;
    if (depart2 < depart) setDepart2(depart);
  }, [depart, depart2, tripKind]);

  async function runSearch() {
    if (from === to) {
      setError('Choose different origin and destination.');
      return;
    }
    if (tripKind === 'multi') {
      if (from2 === to2) {
        setError('Second leg: choose different origin and destination.');
        return;
      }
    }
    const datesStr =
      tripKind === 'round' ? `${depart}|${returnDate}` : tripKind === 'multi' ? `${depart}|${depart2}` : depart;
    const routeStr = tripKind === 'multi' ? `${from}-${to}|${from2}-${to2}` : `${from}-${to}`;
    const flightType: 'oneway' | 'round' | 'multi' =
      tripKind === 'oneway' ? 'oneway' : tripKind === 'round' ? 'round' : 'multi';

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
          route: routeStr,
          counts: `${adults}-0-0-0`,
          dates: datesStr,
          flightType,
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
        <div className="px-4 pb-0 pt-5 dark:border-gray-800 sm:px-6 sm:pt-6">
          <div className="border-b-4 border-[#00A9C1]">
            <div className="flex flex-wrap items-end justify-between gap-3 pb-2">
              <h2 className="text-base font-extrabold uppercase tracking-wide text-slate-900 sm:text-lg dark:text-slate-100">
                Book your flight
              </h2>
              <details className="group text-xs text-gray-500 dark:text-gray-400">
                <summary className="flex cursor-pointer list-none items-center gap-1.5 rounded-lg px-2 py-1 font-medium text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800 [&::-webkit-details-marker]:hidden">
                  <Info className="h-3.5 w-3.5 text-[#00A9C1] dark:text-teal-400" aria-hidden />
                  How this works
                </summary>
                <p className="mt-2 max-w-md rounded-lg bg-gray-50 px-3 py-2 text-[11px] leading-relaxed text-gray-600 dark:bg-gray-800/80 dark:text-gray-400">
                  Availability is loaded from SalamAir through this portal (not an embedded iframe). Complete booking
                  and payment on{' '}
                  <a
                    href={BOOKING_SALAMAIR}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-[#00A9C1] hover:underline dark:text-teal-400"
                  >
                    booking.salamair.com
                  </a>
                  .
                </p>
              </details>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6">
          <div className="mb-5 flex flex-wrap gap-x-6 gap-y-2">
            {(
              [
                { id: 'round' as const, label: 'Round trip' },
                { id: 'oneway' as const, label: 'One way' },
                { id: 'multi' as const, label: 'Multicity' },
              ] as const
            ).map((opt) => (
              <label
                key={opt.id}
                className="inline-flex cursor-pointer select-none items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400"
              >
                <input
                  type="radio"
                  name="book-trip"
                  className="h-4 w-4 border-gray-300 text-[#00A9C1] focus:ring-[#00A9C1]"
                  checked={tripKind === opt.id}
                  onChange={() => setTripKind(opt.id)}
                />
                {opt.label}
              </label>
            ))}
          </div>

          {tripKind === 'multi' && (
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-gray-500">Leg 1</p>
          )}
          <div
            className={`grid grid-cols-1 gap-4 ${tripKind === 'multi' ? 'md:grid-cols-2' : 'md:grid-cols-2'}`}
          >
            <AirportPillSelect
              label="From"
              aria-label="Origin airport"
              value={from}
              onChange={setFrom}
              options={fromOptions}
            />
            <AirportPillSelect
              label="To"
              aria-label="Destination airport"
              value={to}
              onChange={setTo}
              options={toOptions}
            />
          </div>

          {tripKind === 'multi' && (
            <>
              <p className="mb-2 mt-6 text-[11px] font-bold uppercase tracking-wider text-gray-500">Leg 2</p>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <AirportPillSelect
                  label="From"
                  aria-label="Second leg origin"
                  value={from2}
                  onChange={setFrom2}
                  options={from2Options}
                />
                <AirportPillSelect
                  label="To"
                  aria-label="Second leg destination"
                  value={to2}
                  onChange={setTo2}
                  options={to2Options}
                />
              </div>
            </>
          )}

          <div
            className={`mt-5 grid grid-cols-1 gap-4 ${
              tripKind === 'oneway' ? '' : 'md:grid-cols-2'
            }`}
          >
            <div>
              <div className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                {tripKind === 'multi' ? 'Leg 1 ' : null}
                <span>Departing</span>{' '}
                <span className="font-semibold text-[#00A9C1] tabular-nums">
                  {formatBookDisplayDate(depart)}
                </span>
              </div>
              <MiniCalendar
                value={depart}
                onChange={setDepart}
                minDate={minIso}
                defaultMonth={defaultMonthFor(depart)}
              />
            </div>
            {tripKind === 'round' && (
              <div>
                <div className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                  <span>Returning</span>{' '}
                  <span className="font-semibold text-[#00A9C1] tabular-nums">
                    {formatBookDisplayDate(returnDate)}
                  </span>
                </div>
                <MiniCalendar
                  value={returnDate}
                  onChange={setReturnDate}
                  minDate={depart}
                  defaultMonth={defaultMonthFor(returnDate)}
                />
              </div>
            )}
            {tripKind === 'multi' && (
              <div>
                <div className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                  <span>Leg 2 departing</span>{' '}
                  <span className="font-semibold text-[#00A9C1] tabular-nums">
                    {formatBookDisplayDate(depart2)}
                  </span>
                </div>
                <MiniCalendar
                  value={depart2}
                  onChange={setDepart2}
                  minDate={depart}
                  defaultMonth={defaultMonthFor(depart2)}
                />
              </div>
            )}
          </div>

          <div className="mt-5 flex max-w-md flex-col gap-1.5 sm:flex-row sm:items-end sm:gap-4">
            <label className="flex min-w-0 flex-1 flex-col gap-1.5 sm:max-w-[8rem]">
              <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">Adults</span>
              <input
                type="number"
                min={1}
                max={9}
                value={adults}
                onChange={(e) => setAdults(Math.min(9, Math.max(1, Number(e.target.value) || 1)))}
                className={fieldClass}
                aria-label="Adult passengers"
              />
            </label>
          </div>

          <div className="mt-6 flex justify-stretch border-t border-gray-100 pt-4 dark:border-gray-800 sm:justify-end">
            <Button
              type="button"
              variant="primary"
              size="md"
              className="h-12 w-full min-w-[12.5rem] justify-center rounded-lg !bg-[#00A9C1] !text-white shadow-md !hover:bg-[#009aad] sm:w-auto text-sm font-bold uppercase tracking-wide"
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
