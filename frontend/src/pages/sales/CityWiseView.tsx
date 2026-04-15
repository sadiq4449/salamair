import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Loader2 } from 'lucide-react';
import { useRequestStore } from '../../store/requestStore';
import StatusBadge from '../../components/ui/StatusBadge';

const CITY_TABS: { code: string; name: string }[] = [
  { code: 'ALL', name: 'All cities' },
  { code: 'MCT', name: 'Muscat' },
  { code: 'DXB', name: 'Dubai' },
  { code: 'KHI', name: 'Karachi' },
  { code: 'BKK', name: 'Bangkok' },
  { code: 'COK', name: 'Kochi' },
  { code: 'MLE', name: 'Maldives' },
];

function routeMatchesCity(route: string, code: string): boolean {
  if (code === 'ALL') return true;
  const compact = route.replace(/\s/g, '').toUpperCase();
  return compact.includes(code);
}

/** Mirrors UI.demo_design “City-Wise View” — filters loaded requests by airport code in the route string. */
export default function CityWiseView() {
  const navigate = useNavigate();
  const { requests, fetchRequests, isLoading } = useRequestStore();
  const [city, setCity] = useState('ALL');

  useEffect(() => {
    fetchRequests({ page: 1, limit: 100 });
  }, [fetchRequests]);

  const filtered = useMemo(
    () => requests.filter((r) => routeMatchesCity(r.route, city)),
    [requests, city]
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <MapPin className="h-7 w-7 text-teal-600" />
          City-wise view
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Requests whose route mentions the selected airport code (same behaviour as the static demo).
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {CITY_TABS.map((c) => (
          <button
            key={c.code}
            type="button"
            onClick={() => setCity(c.code)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              city === c.code
                ? 'bg-teal-600 text-white'
                : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 text-left text-xs uppercase text-gray-500">
                  <th className="px-5 py-3">REQ ID</th>
                  <th className="px-5 py-3">Agent</th>
                  <th className="px-5 py-3">Route</th>
                  <th className="px-5 py-3">Pax</th>
                  <th className="px-5 py-3">Price</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Created</th>
                  <th className="px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-5 py-3 font-semibold text-gray-900 dark:text-white">{r.request_code}</td>
                    <td className="px-5 py-3 text-gray-600 dark:text-gray-300">{r.agent_name ?? '—'}</td>
                    <td className="px-5 py-3 text-gray-600 dark:text-gray-300">{r.route}</td>
                    <td className="px-5 py-3">{r.pax}</td>
                    <td className="px-5 py-3">{Number(r.price).toFixed(2)} OMR</td>
                    <td className="px-5 py-3">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-5 py-3 text-gray-500 text-xs">
                      {new Date(r.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3">
                      <button
                        type="button"
                        onClick={() => navigate(`/pending/${r.id}`)}
                        className="text-teal-600 dark:text-teal-400 font-medium hover:underline"
                      >
                        Open
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!isLoading && filtered.length === 0 && (
          <p className="text-center py-12 text-gray-500">No requests for this filter.</p>
        )}
      </div>
    </div>
  );
}
