import { useMemo, useState, type ComponentType } from 'react';
import {
  ArrowRightCircle,
  Bed,
  ChevronDown,
  FileText,
  Plane,
  Search,
  UserCircle,
} from 'lucide-react';
import MiniCalendar from '../components/flight/MiniCalendar';
import { AIRPORT_OPTIONS, MOCK_FLIGHTS, type FlightRow } from '../data/flightMock';

type TripType = 'roundTrip' | 'oneWay' | 'multiCity';

const SALAM_BOOKING = 'https://booking.salamair.com/en/search';

function seatBand(seats: number) {
  if (seats <= 10) return { label: 'Low', cls: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' };
  if (seats <= 25) return { label: 'Medium', cls: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' };
  return { label: 'High', cls: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' };
}

function formatDisplayDate(iso: string) {
  if (!iso) return '';
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function matchesTextQuery(f: FlightRow, q: string) {
  if (!q.trim()) return true;
  const s = q.toLowerCase();
  return (
    f.id.toLowerCase().includes(s) ||
    f.route.toLowerCase().includes(s) ||
    f.fromCity.toLowerCase().includes(s) ||
    f.toCity.toLowerCase().includes(s)
  );
}

function matchesTripFilter(
  f: FlightRow,
  tripType: TripType,
  from: string,
  to: string,
  departDate: string,
  returnDate: string,
  multi: [{ from: string; to: string; date: string }, { from: string; to: string; date: string }]
) {
  if (tripType === 'oneWay') {
    if (from && f.from !== from) return false;
    if (to && f.to !== to) return false;
    if (departDate && f.date !== departDate) return false;
    return true;
  }

  if (tripType === 'roundTrip') {
    const outbound =
      (!from || f.from === from) && (!to || f.to === to) && (!departDate || f.date === departDate);
    const inbound =
      !!returnDate &&
      !!from &&
      !!to &&
      f.from === to &&
      f.to === from &&
      f.date === returnDate;
    return outbound || inbound;
  }

  const [a, b] = multi;
  const legA =
    (!a.from || f.from === a.from) &&
    (!a.to || f.to === a.to) &&
    (!a.date || f.date === a.date);
  const legB =
    (!b.from || f.from === b.from) &&
    (!b.to || f.to === b.to) &&
    (!b.date || f.date === b.date);
  return legA || legB;
}

const DATE_MIN = '2026-01-01';
const DATE_MAX = '2027-12-31';

const DEFAULT_FROM = 'MCT';
const DEFAULT_TO = 'DXB';

/** Offline demo schedule (mock data). For live booking use the SalamAir embed on Flight availability. */
export default function FlightDemoSchedule() {
  const [q, setQ] = useState('');
  const [tripType, setTripType] = useState<TripType>('roundTrip');
  const [from, setFrom] = useState(DEFAULT_FROM);
  const [to, setTo] = useState(DEFAULT_TO);
  const [departDate, setDepartDate] = useState('2026-02-01');
  const [returnDate, setReturnDate] = useState('2026-02-08');
  const [multi, setMulti] = useState([
    { from: 'MCT', to: 'DXB', date: '2026-02-01' },
    { from: 'DXB', to: 'MCT', date: '2026-02-08' },
  ] as [{ from: string; to: string; date: string }, { from: string; to: string; date: string }]);

  const filtered = useMemo(() => {
    return MOCK_FLIGHTS.filter(
      (f) =>
        matchesTextQuery(f, q) &&
        matchesTripFilter(f, tripType, from, to, departDate, returnDate, multi)
    );
  }, [q, tripType, from, to, departDate, returnDate, multi]);

  const fieldClass =
    'w-full appearance-none rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 pl-3 pr-9 py-2.5 text-sm text-gray-900 dark:text-white outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/15';

  return (
    <div className="space-y-8">
      <div className="flex flex-col xl:flex-row gap-8 xl:gap-10 xl:items-start">
        <div className="flex-1 min-w-0 space-y-6">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-white border-b-[3px] border-slate-800 dark:border-slate-200 inline-block pb-1">
              BOOK YOUR FLIGHT
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">
              Same flow as{' '}
              <a
                href={SALAM_BOOKING}
                target="_blank"
                rel="noopener noreferrer"
                className="text-teal-600 dark:text-teal-400 hover:underline font-medium"
              >
                booking.salamair.com
              </a>{' '}
              — demo schedule only (not live inventory).
            </p>
          </div>

          <div
            className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 sm:p-6 shadow-sm"
            role="search"
            aria-label="Flight search"
          >
            <div className="flex flex-wrap gap-4 sm:gap-6 mb-5">
              {(
                [
                  ['roundTrip', 'ROUND TRIP'],
                  ['oneWay', 'ONE WAY'],
                  ['multiCity', 'MULTICITY'],
                ] as const
              ).map(([value, label]) => (
                <label key={value} className="inline-flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="radio"
                    name="tripType"
                    checked={tripType === value}
                    onChange={() => setTripType(value)}
                    className="h-4 w-4 border-gray-300 text-teal-600 focus:ring-teal-500"
                  />
                  <span className="text-sm font-semibold text-gray-800 dark:text-gray-100 tracking-wide">
                    {label}
                  </span>
                </label>
              ))}
            </div>

            {tripType !== 'multiCity' ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                      From
                    </label>
                    <div className="relative">
                      <select
                        value={from}
                        onChange={(e) => setFrom(e.target.value)}
                        className={fieldClass}
                      >
                        {AIRPORT_OPTIONS.map((a) => (
                          <option key={a.code} value={a.code}>
                            {a.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                      To
                    </label>
                    <div className="relative">
                      <select
                        value={to}
                        onChange={(e) => setTo(e.target.value)}
                        className={fieldClass}
                      >
                        {AIRPORT_OPTIONS.map((a) => (
                          <option key={a.code} value={a.code}>
                            {a.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                      Departing
                    </label>
                    <div className="rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50 px-3 py-2.5 text-sm text-gray-900 dark:text-white">
                      {departDate ? formatDisplayDate(departDate) : 'Select date'}
                    </div>
                  </div>
                  <div className={tripType === 'oneWay' ? 'opacity-50 pointer-events-none' : ''}>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                      Returning
                    </label>
                    <div className="rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50 px-3 py-2.5 text-sm text-gray-900 dark:text-white">
                      {tripType === 'oneWay'
                        ? '—'
                        : returnDate
                          ? formatDisplayDate(returnDate)
                          : 'Select date'}
                    </div>
                  </div>
                </div>

                <div
                  className={`grid gap-4 ${tripType === 'roundTrip' ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 max-w-sm'}`}
                >
                  <div>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Departure</p>
                    <MiniCalendar
                      value={departDate}
                      onChange={setDepartDate}
                      minDate={DATE_MIN}
                      maxDate={DATE_MAX}
                      defaultMonth={{ year: 2026, month0: 1 }}
                    />
                  </div>
                  {tripType === 'roundTrip' && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Return</p>
                      <MiniCalendar
                        value={returnDate}
                        onChange={(iso) => {
                          if (departDate && iso < departDate) return;
                          setReturnDate(iso);
                        }}
                        minDate={departDate || DATE_MIN}
                        maxDate={DATE_MAX}
                        defaultMonth={{ year: 2026, month0: 1 }}
                      />
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="space-y-8">
                {[0, 1].map((idx) => (
                  <div
                    key={idx}
                    className="border-t border-gray-100 dark:border-gray-800 first:border-t-0 pt-6 first:pt-0"
                  >
                    <p className="text-sm font-semibold text-slate-800 dark:text-white mb-3">
                      Flight {idx + 1}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                          From
                        </label>
                        <div className="relative">
                          <select
                            value={multi[idx].from}
                            onChange={(e) => {
                              const next = [...multi] as typeof multi;
                              next[idx] = { ...next[idx], from: e.target.value };
                              setMulti(next);
                            }}
                            className={fieldClass}
                          >
                            {AIRPORT_OPTIONS.map((a) => (
                              <option key={a.code} value={a.code}>
                                {a.label}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                          To
                        </label>
                        <div className="relative">
                          <select
                            value={multi[idx].to}
                            onChange={(e) => {
                              const next = [...multi] as typeof multi;
                              next[idx] = { ...next[idx], to: e.target.value };
                              setMulti(next);
                            }}
                            className={fieldClass}
                          >
                            {AIRPORT_OPTIONS.map((a) => (
                              <option key={a.code} value={a.code}>
                                {a.label}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        </div>
                      </div>
                    </div>
                    <div className="mb-2 text-xs text-gray-500 dark:text-gray-400">
                      Date:{' '}
                      {multi[idx].date
                        ? formatDisplayDate(multi[idx].date)
                        : 'Select in calendar'}
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
                        defaultMonth={{ year: 2026, month0: 1 }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="search"
                  placeholder="Search flight no., city, route…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white"
                />
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 shrink-0">
                {filtered.length} flight{filtered.length === 1 ? '' : 's'} shown
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-[18px]">
              {filtered.map((f) => (
                <FlightCard key={`${f.id}-${f.date}`} f={f} />
              ))}
            </div>

            {filtered.length === 0 && (
              <div className="text-center py-16 text-gray-500 dark:text-gray-400">
                <Plane className="h-12 w-12 mx-auto mb-3 opacity-40" />
                <p className="font-medium">No flights match your search</p>
                <p className="text-sm mt-1">Adjust airports, dates, or trip type.</p>
              </div>
            )}
          </div>
        </div>

        <aside className="xl:w-72 shrink-0 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden shadow-sm">
          <nav className="divide-y divide-gray-100 dark:divide-gray-800" aria-label="Quick links">
            <QuickLink href={SALAM_BOOKING} icon={Plane} label="Book a flight" />
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

function QuickLink({
  href,
  icon: Icon,
  label,
  internal,
}: {
  href: string;
  icon: ComponentType<{ className?: string }>;
  label: string;
  internal?: boolean;
}) {
  const className =
    'flex items-center gap-3 px-4 py-3.5 text-sm font-medium text-teal-600 dark:text-teal-400 hover:bg-teal-50/80 dark:hover:bg-teal-900/20 transition-colors';
  const inner = (
    <>
      <Icon className="h-5 w-5 text-gray-400 shrink-0" />
      <span>{label}</span>
    </>
  );
  if (internal) {
    return (
      <a href={href} className={className}>
        {inner}
      </a>
    );
  }
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {inner}
    </a>
  );
}

function FlightCard({ f }: { f: FlightRow }) {
  const band = seatBand(f.seats);
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-md">
      <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
        <div>
          <div className="text-lg font-bold text-gray-900 dark:text-white">{f.route}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">{f.date}</div>
        </div>
        <span className="text-sm font-semibold text-teal-600 dark:text-teal-400">{f.id}</span>
      </div>
      <div className="p-5 space-y-4">
        <div className="flex justify-between items-center gap-4">
          <div className="text-center flex-1">
            <div className="text-lg font-bold text-gray-900 dark:text-white">{f.from}</div>
            <div className="text-xs text-gray-500">{f.fromCity}</div>
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mt-1">{f.dep}</div>
          </div>
          <div className="text-center text-gray-400 text-xs shrink-0">
            <Plane className="h-4 w-4 mx-auto text-teal-500" />
            <div className="mt-1">{f.duration}</div>
          </div>
          <div className="text-center flex-1">
            <div className="text-lg font-bold text-gray-900 dark:text-white">{f.to}</div>
            <div className="text-xs text-gray-500">{f.toCity}</div>
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mt-1">{f.arr}</div>
          </div>
        </div>
        <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-800">
          <div>
            <div className="text-xs text-gray-500 uppercase tracking-wide">From</div>
            <div className="text-xl font-bold text-teal-600 dark:text-teal-400">
              {f.price} <span className="text-sm font-normal text-gray-500">OMR</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-500">Seats</div>
            <div className="flex items-center gap-2 justify-end mt-0.5">
              <span className="font-semibold text-gray-900 dark:text-white">{f.seats}</span>
              <span className={`text-[0.65rem] font-semibold px-2 py-0.5 rounded ${band.cls}`}>{band.label}</span>
            </div>
          </div>
        </div>
        <div className="text-xs text-gray-500 flex justify-between">
          <span>{f.aircraft}</span>
        </div>
      </div>
    </div>
  );
}
