import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { searchGlobal, type SearchResponse } from '../services/advancedService';

function stripHighlight(s: string) {
  return s.replace(/\*\*/g, '');
}

export default function SearchPage() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const q = params.get('q') || '';
  const nav = useNavigate();
  const requestPath = (id: string) => (user?.role === 'agent' ? `/requests/${id}` : `/pending/${id}`);
  const [data, setData] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (q.trim().length < 2) {
      setData(null);
      return;
    }
    setLoading(true);
    searchGlobal({ q, type: 'all', limit: 40 })
      .then(setData)
      .finally(() => setLoading(false));
  }, [q]);

  if (q.trim().length < 2) {
    return (
      <p className="text-sm text-gray-500 text-center py-16">Enter at least 2 characters to search.</p>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Results for <span className="font-semibold text-gray-800 dark:text-gray-200">{q}</span>
      </p>
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
        </div>
      ) : !data ? null : (
        <div className="space-y-8">
          <section>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Requests</h3>
            <ul className="space-y-2">
              {data.results.requests.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => nav(requestPath(r.id))}
                    className="text-left w-full rounded-lg border border-gray-100 dark:border-gray-800 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/80 text-sm"
                  >
                    <span className="text-gray-900 dark:text-white font-medium">{stripHighlight(r.highlight)}</span>
                    <span className="block text-xs text-gray-500 mt-0.5">{r.status}</span>
                  </button>
                </li>
              ))}
              {data.results.requests.length === 0 && (
                <p className="text-xs text-gray-400">No matching requests.</p>
              )}
            </ul>
          </section>
          <section>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Messages</h3>
            <ul className="space-y-2">
              {data.results.messages.map((m) => (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => nav(requestPath(m.request_id))}
                    className="text-left w-full rounded-lg border border-gray-100 dark:border-gray-800 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/80 text-sm text-gray-700 dark:text-gray-200"
                  >
                    {stripHighlight(m.highlight)}
                  </button>
                </li>
              ))}
              {data.results.messages.length === 0 && (
                <p className="text-xs text-gray-400">No matching messages.</p>
              )}
            </ul>
          </section>
          <section>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Agents</h3>
            <ul className="space-y-2">
              {data.results.agents.map((a) => (
                <li key={a.id} className="text-sm text-gray-700 dark:text-gray-200 px-1">
                  {stripHighlight(a.highlight)}
                </li>
              ))}
              {data.results.agents.length === 0 && (
                <p className="text-xs text-gray-400">No matching agents (sales/admin only in index).</p>
              )}
            </ul>
          </section>
        </div>
      )}
    </div>
  );
}
