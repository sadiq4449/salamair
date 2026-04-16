import { useMemo, useState } from 'react';
import { AlertCircle, Search } from 'lucide-react';
import axios from 'axios';
import Button from '../ui/Button';
import { AIRPORT_OPTIONS } from '../../data/flightMock';
import { salamairCreateSession, salamairSearchFlights } from '../../services/salamairApi';

type TripKind = 'oneway' | 'round';

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

  const airportCodes = useMemo(() => AIRPORT_OPTIONS.map((a) => a.code), []);

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
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-12 lg:items-end">
          <label className="lg:col-span-2 flex flex-col gap-1 text-xs font-medium text-gray-600 dark:text-gray-400">
            From
            <select
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
            >
              {airportCodes.map((code) => (
                <option key={code} value={code}>
                  {AIRPORT_OPTIONS.find((a) => a.code === code)?.label ?? code}
                </option>
              ))}
            </select>
          </label>
          <label className="lg:col-span-2 flex flex-col gap-1 text-xs font-medium text-gray-600 dark:text-gray-400">
            To
            <select
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
            >
              {airportCodes.map((code) => (
                <option key={code} value={code}>
                  {AIRPORT_OPTIONS.find((a) => a.code === code)?.label ?? code}
                </option>
              ))}
            </select>
          </label>

          <div className="lg:col-span-2 flex flex-col gap-1">
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

          <label className="lg:col-span-2 flex flex-col gap-1 text-xs font-medium text-gray-600 dark:text-gray-400">
            Depart
            <input
              type="date"
              value={depart}
              onChange={(e) => setDepart(e.target.value)}
              className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
            />
          </label>

          {tripKind === 'round' && (
            <label className="lg:col-span-2 flex flex-col gap-1 text-xs font-medium text-gray-600 dark:text-gray-400">
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

          <label className="lg:col-span-1 flex flex-col gap-1 text-xs font-medium text-gray-600 dark:text-gray-400">
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

          <div className="lg:col-span-1 flex items-end">
            <Button
              type="button"
              variant="primary"
              className="w-full"
              onClick={() => void runSearch()}
              disabled={loading}
              isLoading={loading}
            >
              <Search className="h-4 w-4" />
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
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/30 overflow-hidden">
          {payload.additionalMessage && (
            <div className="px-4 py-2 text-sm bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 border-b border-amber-100 dark:border-amber-900/40">
              {payload.additionalMessage}
            </div>
          )}
          <div className="p-4 space-y-6">
            {!payload.trips?.length && (
              <p className="text-sm text-gray-600 dark:text-gray-400">No trip data returned for this search.</p>
            )}
            {payload.trips?.map((trip, ti) => (
              <div key={ti} className="space-y-2">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                  {(trip.originCity ?? trip.origin ?? '?') +
                    ' → ' +
                    (trip.destinationCity ?? trip.destination ?? '?')}
                  {trip.currencyCode ? (
                    <span className="ml-2 font-normal text-gray-500 dark:text-gray-400">
                      ({trip.currencyCode})
                    </span>
                  ) : null}
                </h3>
                <div className="overflow-x-auto rounded-lg border border-gray-100 dark:border-gray-800">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-800/80 text-left text-xs uppercase text-gray-500 dark:text-gray-400">
                        <th className="px-3 py-2">Date</th>
                        <th className="px-3 py-2">Lowest fare</th>
                        <th className="px-3 py-2">Flights</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {(trip.markets ?? []).map((m, mi) => (
                        <tr key={mi} className="text-gray-900 dark:text-gray-100">
                          <td className="px-3 py-2 whitespace-nowrap">
                            {m.date ? new Date(m.date).toLocaleDateString() : '—'}
                          </td>
                          <td className="px-3 py-2">
                            {typeof m.lowestFare === 'number' && m.lowestFare > 0
                              ? m.lowestFare.toFixed(2)
                              : '—'}
                          </td>
                          <td className="px-3 py-2 text-gray-600 dark:text-gray-400">
                            {m.flights == null ? 'No inventory in response' : 'See details on SalamAir'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
