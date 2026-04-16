import { useState, type ComponentType } from 'react';
import {
  ArrowRightCircle,
  Bed,
  ChevronDown,
  FileText,
  LayoutGrid,
  Plane,
  Search as SearchIcon,
  UserCircle,
} from 'lucide-react';
import MiniCalendar from '../components/flight/MiniCalendar';
import { AIRPORT_OPTIONS } from '../data/flightMock';
import FlightDemoSchedule from './FlightDemoSchedule';

export const SALAMAIR_BOOKING_SEARCH = 'https://booking.salamair.com/en/search';

type TripType = 'roundTrip' | 'oneWay' | 'multiCity';
type ViewMode = 'booking' | 'demo';

const DATE_MIN = '2026-01-01';
const DATE_MAX = '2027-12-31';

function formatDisplayDate(iso: string) {
  if (!iso) return '';
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function FlightAvailability() {
  const [view, setView] = useState<ViewMode>('booking');
  const [tripType, setTripType] = useState<TripType>('roundTrip');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [departDate, setDepartDate] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [multi, setMulti] = useState([
    { from: '', to: '', date: '' },
    { from: '', to: '', date: '' },
  ] as [{ from: string; to: string; date: string }, { from: string; to: string; date: string }]);

  function handleSearch() {
    window.open(SALAMAIR_BOOKING_SEARCH, '_blank', 'noopener,noreferrer');
  }

  if (view === 'demo') {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setView('booking')}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm font-medium text-teal-600 dark:text-teal-400 hover:bg-teal-50/80 dark:hover:bg-teal-900/20 transition-colors"
          >
            <Plane className="h-4 w-4" />
            Back to Book a Flight
          </button>
        </div>
        <FlightDemoSchedule />
      </div>
    );
  }

  const selectCls =
    'w-full appearance-none rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 pl-3 pr-8 py-3 text-sm text-gray-600 dark:text-gray-300 outline-none focus:border-[#7ab929] focus:ring-1 focus:ring-[#7ab929]/30';

  return (
    <div className="space-y-0">
      {/* ── SalamAir header bar ── */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <div className="text-[#7ab929] font-extrabold text-2xl leading-none tracking-tight flex items-baseline gap-0.5">
              <svg viewBox="0 0 24 24" className="h-7 w-7 text-[#7ab929] shrink-0 -mt-0.5" fill="currentColor">
                <path d="M4 20 L12 4 L14 10 L20 12 L14 14 L12 20 L10 14 L4 12 Z" />
              </svg>
              <span className="text-[#7ab929]">Salam</span>
              <span className="text-gray-500 dark:text-gray-400">Air</span>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setView('demo')}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-teal-600 dark:hover:text-teal-400 hover:border-teal-300 dark:hover:border-teal-700 transition-colors"
        >
          <LayoutGrid className="h-3.5 w-3.5" />
          Demo schedule
        </button>
      </div>

      {/* ── Main layout ── */}
      <div className="flex flex-col xl:flex-row gap-6 xl:gap-8 items-start">
        {/* ── Left: booking form ── */}
        <div className="flex-1 min-w-0">
          {/* Title */}
          <div className="mb-5">
            <h1 className="text-xl sm:text-2xl font-extrabold text-[#2d3748] dark:text-white tracking-tight">
              BOOK YOUR FLIGHT
            </h1>
            <div className="h-[3px] bg-gradient-to-r from-[#7ab929] to-[#4a9d2f] rounded-full mt-1.5 w-full max-w-[320px]" />
          </div>

          {/* Trip type radios */}
          <div className="flex flex-wrap gap-5 sm:gap-7 mb-6">
            {(
              [
                ['roundTrip', 'ROUND TRIP'],
                ['oneWay', 'ONE WAY'],
                ['multiCity', 'MULTICITY'],
              ] as const
            ).map(([val, label]) => (
              <label key={val} className="inline-flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="radio"
                  name="tripType"
                  checked={tripType === val}
                  onChange={() => setTripType(val)}
                  className="h-[18px] w-[18px] border-2 border-gray-400 text-[#7ab929] focus:ring-[#7ab929]/40"
                />
                <span className="text-sm font-semibold text-gray-600 dark:text-gray-300 tracking-wide">
                  {label}
                </span>
              </label>
            ))}
          </div>

          {tripType !== 'multiCity' ? (
            <>
              {/* From / To */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                <div className="relative">
                  <select value={from} onChange={(e) => setFrom(e.target.value)} className={selectCls}>
                    <option value="">From</option>
                    {AIRPORT_OPTIONS.map((a) => (
                      <option key={a.code} value={a.code}>
                        {a.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>
                <div className="relative">
                  <select value={to} onChange={(e) => setTo(e.target.value)} className={selectCls}>
                    <option value="">To</option>
                    {AIRPORT_OPTIONS.map((a) => (
                      <option key={a.code} value={a.code}>
                        {a.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>
              </div>

              {/* Departing / Returning display */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                <div className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-3 text-sm text-gray-500 dark:text-gray-400">
                  {departDate ? formatDisplayDate(departDate) : 'Departing'}
                </div>
                <div
                  className={`rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-3 text-sm text-gray-500 dark:text-gray-400 ${
                    tripType === 'oneWay' ? 'opacity-40 pointer-events-none' : ''
                  }`}
                >
                  {tripType === 'oneWay'
                    ? 'Returning'
                    : returnDate
                      ? formatDisplayDate(returnDate)
                      : 'Returning'}
                </div>
              </div>

              {/* Calendars */}
              <div
                className={`grid gap-4 mb-6 ${
                  tripType === 'roundTrip' ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 max-w-sm'
                }`}
              >
                <MiniCalendar
                  value={departDate}
                  onChange={setDepartDate}
                  minDate={DATE_MIN}
                  maxDate={DATE_MAX}
                />
                {tripType === 'roundTrip' && (
                  <MiniCalendar
                    value={returnDate}
                    onChange={(iso) => {
                      if (departDate && iso < departDate) return;
                      setReturnDate(iso);
                    }}
                    minDate={departDate || DATE_MIN}
                    maxDate={DATE_MAX}
                  />
                )}
              </div>
            </>
          ) : (
            /* ── Multicity legs ── */
            <div className="space-y-8 mb-6">
              {[0, 1].map((idx) => (
                <div
                  key={idx}
                  className="border-t border-gray-200 dark:border-gray-700 first:border-t-0 pt-5 first:pt-0"
                >
                  <p className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-3">
                    Flight {idx + 1}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <div className="relative">
                      <select
                        value={multi[idx].from}
                        onChange={(e) => {
                          const next = [...multi] as typeof multi;
                          next[idx] = { ...next[idx], from: e.target.value };
                          setMulti(next);
                        }}
                        className={selectCls}
                      >
                        <option value="">From</option>
                        {AIRPORT_OPTIONS.map((a) => (
                          <option key={a.code} value={a.code}>
                            {a.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    </div>
                    <div className="relative">
                      <select
                        value={multi[idx].to}
                        onChange={(e) => {
                          const next = [...multi] as typeof multi;
                          next[idx] = { ...next[idx], to: e.target.value };
                          setMulti(next);
                        }}
                        className={selectCls}
                      >
                        <option value="">To</option>
                        {AIRPORT_OPTIONS.map((a) => (
                          <option key={a.code} value={a.code}>
                            {a.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    </div>
                  </div>
                  <div className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-3 text-sm text-gray-500 dark:text-gray-400 mb-3">
                    {multi[idx].date ? formatDisplayDate(multi[idx].date) : 'Departing'}
                  </div>
                  <div className="max-w-sm">
                    <MiniCalendar
                      value={multi[idx].date}
                      onChange={(iso) => {
                        const next = [...multi] as typeof multi;
                        next[idx] = { ...next[idx], date: iso };
                        setMulti(next);
                      }}
                      minDate={DATE_MIN}
                      maxDate={DATE_MAX}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Search Flights button */}
          <button
            type="button"
            onClick={handleSearch}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-[#7ab929] hover:bg-[#6aa823] active:bg-[#5b9420] text-white font-bold text-sm px-8 py-3.5 shadow-md shadow-[#7ab929]/20 transition-all focus:outline-none focus:ring-2 focus:ring-[#7ab929]/40"
          >
            <SearchIcon className="h-5 w-5" />
            Search Flights on SalamAir
          </button>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
            Opens the official{' '}
            <a
              href={SALAMAIR_BOOKING_SEARCH}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#7ab929] hover:underline"
            >
              booking.salamair.com
            </a>{' '}
            in a new tab.
          </p>
        </div>

        {/* ── Right sidebar: Quick Links ── */}
        <aside className="xl:w-64 w-full shrink-0">
          <nav
            className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden divide-y divide-gray-100 dark:divide-gray-800 shadow-sm"
            aria-label="Quick links"
          >
            <QuickLink href={SALAMAIR_BOOKING_SEARCH} icon={Plane} label="Book a flight" accent />
            <QuickLink href="https://www.salamair.com/en/" icon={Bed} label="Book a hotel" />
            <QuickLink
              href="https://booking.salamair.com/en/manage-booking"
              icon={ArrowRightCircle}
              label="Manage my Booking"
            />
            <QuickLink
              href="https://booking.salamair.com/en/online-check-in"
              icon={ArrowRightCircle}
              label="Web Check in"
            />
            <QuickLink href="/login" icon={UserCircle} label="Agent login" internal />
            <QuickLink href="https://www.salamair.com/en/contact" icon={FileText} label="Contact us" />
          </nav>
        </aside>
      </div>
    </div>
  );
}

/* ── QuickLink ── */
function QuickLink({
  href,
  icon: Icon,
  label,
  internal,
  accent,
}: {
  href: string;
  icon: ComponentType<{ className?: string }>;
  label: string;
  internal?: boolean;
  accent?: boolean;
}) {
  const cls = [
    'flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors',
    accent
      ? 'text-[#7ab929] hover:bg-[#7ab929]/5'
      : 'text-[#7ab929] hover:bg-gray-50 dark:hover:bg-gray-800/60',
  ].join(' ');
  const inner = (
    <>
      <Icon className="h-5 w-5 text-gray-400 shrink-0" />
      <span>{label}</span>
    </>
  );
  if (internal) {
    return (
      <a href={href} className={cls}>
        {inner}
      </a>
    );
  }
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>
      {inner}
    </a>
  );
}
