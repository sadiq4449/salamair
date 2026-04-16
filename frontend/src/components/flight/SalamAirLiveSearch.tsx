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

interface MarketRow {
  date: string;
  lowestFare: number;
  flights: unknown;
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
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-teal-800 dark:text-teal-300">
              Departing flight
            </h3>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-gray-800 dark:text-gray-100">
              <Plane className="h-4 w-4 shrink-0 text-teal-600 dark:text-teal-400" aria-hidden />
              <span className="font-bold tracking-wide">
                {originLabel}{' '}
                <span className="mx-0.5 font-normal text-teal-600/80 dark:text-teal-400/90">→</span> {destLabel}
              </span>
            </div>
            {headlineDateIso && (
              <p className="mt-1.5 text-sm font-medium text-teal-700 dark:text-teal-400">
                {formatRouteDateLine(headlineDateIso)}
              </p>
            )}
          </div>
          <a
            href={BOOKING_SALAMAIR}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-teal-200 bg-white px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-teal-800 shadow-sm transition-colors hover:bg-teal-50 dark:border-teal-700 dark:bg-teal-950/50 dark:text-teal-200 dark:hover:bg-teal-900/40"
          >
            Book
            <ExternalLink className="h-3.5 w-3.5 opacity-80" />
          </a>
        </div>
      </div>

      <div className="px-3 py-4 sm:px-5">
        <div className="relative flex items-center gap-1">
          <button
            type="button"
            onClick={() => scrollCarousel(-1)}
            className="hidden sm:flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-teal-700 shadow-sm hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-teal-400 dark:hover:bg-gray-700"
            aria-label="Scroll dates left"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <div
            ref={scrollRef}
            className="flex min-h-[6.5rem] flex-1 gap-2 overflow-x-auto scroll-smooth pb-1 pt-0.5 snap-x snap-mandatory scrollbar-thin [-ms-overflow-style:none] [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300 dark:[&::-webkit-scrollbar-thumb]:bg-gray-600"
          >
            {markets.map((m, mi) => {
              const hasPrice = typeof m.lowestFare === 'number' && m.lowestFare > 0;
              const isNoFlights = !hasPrice;
              const isCheapest = hasPrice && cheapestFare !== null && m.lowestFare === cheapestFare;
              const isAnchor =
                departureAnchorIso && m.date ? sameCalendarDay(m.date, departureAnchorIso) : false;
              const { dow, dayMon } = m.date ? formatDayShort(m.date) : { dow: '—', dayMon: '' };

              return (
                <div
                  key={mi}
                  className={`flex min-w-[5.75rem] shrink-0 snap-start flex-col items-center justify-center rounded-xl border px-2 py-2.5 text-center transition-shadow sm:min-w-[6.75rem] ${
                    isAnchor
                      ? 'border-teal-500 ring-2 ring-teal-500/30 dark:border-teal-400 dark:ring-teal-400/25'
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
                    <span
                      className={`mt-1.5 text-sm font-bold tabular-nums ${
                        isCheapest
                          ? 'text-emerald-700 dark:text-emerald-300'
                          : isAnchor
                            ? 'text-teal-700 dark:text-teal-300'
                            : 'text-gray-900 dark:text-gray-100'
                      }`}
                    >
                      {formatFareDisplay(m.lowestFare, currency)}
                    </span>
                  )}
                  {isCheapest && hasPrice && (
                    <span className="mt-1 rounded bg-emerald-600/90 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white dark:bg-emerald-600">
                      Lowest
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => scrollCarousel(1)}
            className="hidden sm:flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-teal-700 shadow-sm hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-teal-400 dark:hover:bg-gray-700"
            aria-label="Scroll dates right"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <p className="mt-4 text-center text-xs text-gray-500 dark:text-gray-500">
          Indicative lowest fares in this date window. Confirm times and book on{' '}
          <a
            href={BOOKING_SALAMAIR}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-teal-600 hover:underline dark:text-teal-400"
          >
            SalamAir
          </a>
          .
        </p>
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
      <div className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-md ring-1 ring-black/[0.03] dark:border-gray-700 dark:bg-gray-900 dark:ring-white/5">
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
