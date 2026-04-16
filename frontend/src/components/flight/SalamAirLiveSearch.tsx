import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
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
    <div className="rounded-2xl border border-gray-200/90 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900/80 overflow-hidden">
      <div className="border-b-2 border-teal-600 px-4 sm:px-6 pt-5 pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-xs font-bold tracking-[0.2em] text-teal-700 dark:text-teal-400">
              Departing flight
            </h3>
            <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gray-700 dark:text-gray-200">
              <Plane className="h-4 w-4 text-teal-600 dark:text-teal-400 shrink-0" aria-hidden />
              <span className="font-semibold">
                {originLabel} <span className="font-normal text-gray-400">to</span> {destLabel}
              </span>
            </div>
            {headlineDateIso && (
              <p className="mt-1 text-sm font-medium text-teal-600 dark:text-teal-400">
                {formatRouteDateLine(headlineDateIso)}
              </p>
            )}
          </div>
          <a
            href={BOOKING_SALAMAIR}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 self-start text-xs font-semibold uppercase tracking-wide text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300"
          >
            Book on SalamAir
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>

      <div className="px-3 sm:px-5 py-4">
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

        <p className="mt-4 text-center text-xs text-gray-500 dark:text-gray-400">
          Fares are indicative (lowest in this calendar window). Full schedules and booking are on{' '}
          <a
            href={BOOKING_SALAMAIR}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-teal-600 underline-offset-2 hover:underline dark:text-teal-400"
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
    <div className="flex flex-col gap-4 min-h-[min(85vh,900px)]">
      <p className="text-sm text-gray-600 dark:text-gray-400 max-w-3xl">
        Live availability uses SalamAir&apos;s booking API through our server (your session is not shared with
        booking.salamair.com). Embedding their website in a frame does not work here because their API only allows
        calls from their own domain.
      </p>

      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/40 p-4 shadow-sm">
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 lg:items-end">
          <label className="sm:col-span-1 lg:col-span-2 flex flex-col gap-1 text-xs font-medium text-gray-600 dark:text-gray-400">
            <span>Origin</span>
            <span className="text-[10px] font-normal text-gray-500 dark:text-gray-500 leading-tight">
              Airport you depart from
            </span>
            <select
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              aria-label="Origin airport"
              className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 mt-0.5"
            >
              {fromOptions.map((opt) => (
                <option key={opt.code} value={opt.code}>
                  {formatAirportOption(opt)}
                </option>
              ))}
            </select>
          </label>
          <label className="sm:col-span-1 lg:col-span-2 flex flex-col gap-1 text-xs font-medium text-gray-600 dark:text-gray-400">
            <span>Destination</span>
            <span className="text-[10px] font-normal text-gray-500 dark:text-gray-500 leading-tight">
              Airport you fly to
            </span>
            <select
              value={to}
              onChange={(e) => setTo(e.target.value)}
              aria-label="Destination airport"
              className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 mt-0.5"
            >
              {toOptions.map((opt) => (
                <option key={opt.code} value={opt.code}>
                  {formatAirportOption(opt)}
                </option>
              ))}
            </select>
          </label>

          <div className="sm:col-span-1 lg:col-span-2 flex flex-col gap-1">
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Trip</span>
            <div className="inline-flex rounded-lg border border-gray-200 dark:border-gray-600 p-0.5">
              <button
                type="button"
                onClick={() => setTripKind('oneway')}
                className={`rounded-md px-3 py-2 text-xs font-medium ${
                  tripKind === 'oneway'
                    ? 'bg-teal-600 text-white'
                    : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                One way
              </button>
              <button
                type="button"
                onClick={() => setTripKind('round')}
                className={`rounded-md px-3 py-2 text-xs font-medium ${
                  tripKind === 'round'
                    ? 'bg-teal-600 text-white'
                    : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                Return
              </button>
            </div>
          </div>

          <label className="sm:col-span-1 lg:col-span-2 flex flex-col gap-1 text-xs font-medium text-gray-600 dark:text-gray-400">
            Depart
            <input
              type="date"
              value={depart}
              onChange={(e) => setDepart(e.target.value)}
              className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
            />
          </label>

          {tripKind === 'round' && (
            <label className="sm:col-span-1 lg:col-span-2 flex flex-col gap-1 text-xs font-medium text-gray-600 dark:text-gray-400">
              Return
              <input
                type="date"
                value={returnDate}
                onChange={(e) => setReturnDate(e.target.value)}
                min={depart}
                className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
              />
            </label>
          )}

          <label className="sm:col-span-1 lg:col-span-2 flex flex-col gap-1 text-xs font-medium text-gray-600 dark:text-gray-400">
            Adults
            <input
              type="number"
              min={1}
              max={9}
              value={adults}
              onChange={(e) => setAdults(Math.min(9, Math.max(1, Number(e.target.value) || 1)))}
              className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
            />
          </label>
        </div>

        <div className="mt-3 flex justify-stretch sm:justify-end">
          <Button
            type="button"
            variant="primary"
            size="md"
            className="w-full sm:w-auto sm:min-w-[12.5rem] px-5 justify-center"
            onClick={() => void runSearch()}
            disabled={loading}
            isLoading={loading}
          >
            <Search className="h-4 w-4 shrink-0" aria-hidden />
            Search flights
          </Button>
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
