import { useMemo, useState } from 'react';
import { Plane, Search } from 'lucide-react';
import { MOCK_FLIGHTS, ROUTE_OPTIONS, type FlightRow } from '../data/flightMock';

const DATE_OPTIONS = ['', ...Array.from(new Set(MOCK_FLIGHTS.map((f) => f.date))).sort()];

function seatBand(seats: number) {
  if (seats <= 10) return { label: 'Low', cls: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' };
  if (seats <= 25) return { label: 'Medium', cls: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' };
  return { label: 'High', cls: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' };
}

export default function FlightAvailability() {
  const [q, setQ] = useState('');
  const [route, setRoute] = useState<string>('');
  const [date, setDate] = useState<string>('');

  const filtered = useMemo(() => {
    return MOCK_FLIGHTS.filter((f) => {
      if (route && f.route !== route) return false;
      if (date && f.date !== date) return false;
      if (!q.trim()) return true;
      const s = q.toLowerCase();
      return (
        f.id.toLowerCase().includes(s) ||
        f.route.toLowerCase().includes(s) ||
        f.fromCity.toLowerCase().includes(s) ||
        f.toCity.toLowerCase().includes(s)
      );
    });
  }, [q, route, date]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Plane className="h-7 w-7 text-teal-600" />
          Flight availability
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Reference schedule for planning (demo data — not live inventory).
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between flex-wrap">
        <div className="relative flex-1 max-w-md min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="search"
            placeholder="Search flights, city, flight no..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={route}
            onChange={(e) => setRoute(e.target.value)}
            className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-white w-full sm:w-44"
          >
            {ROUTE_OPTIONS.map((r) => (
              <option key={r || 'all'} value={r}>
                {r ? r : 'All routes'}
              </option>
            ))}
          </select>
          <select
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-white w-full sm:w-44"
          >
            {DATE_OPTIONS.map((d) => (
              <option key={d || 'all-dates'} value={d}>
                {d ? d : 'All dates'}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-[18px]">
        {filtered.map((f) => (
          <FlightCard key={f.id} f={f} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-gray-500 dark:text-gray-400">
          <Plane className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <p className="font-medium">No flights match your filters</p>
          <p className="text-sm mt-1">Try clearing search or selecting “All routes”.</p>
        </div>
      )}
    </div>
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
