import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Inbox, Loader2, Mail, Search } from 'lucide-react';
import api from '../../services/api';

interface InboxRow {
  thread_id: string;
  request_id: string;
  request_code: string;
  route: string;
  request_status: string;
  agent_name: string | null;
  subject: string;
  rm_email: string;
  message_count: number;
  last_activity_at: string;
  preview: string;
}

export default function EmailInbox() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<InboxRow[]>([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const { data } = await api.get('/email/inbox', {
          params: { search: search || undefined, limit: 50 },
        });
        if (!cancelled) {
          setRows(data.items ?? []);
          setTotal(data.total ?? 0);
        }
      } catch {
        if (!cancelled) {
          setRows([]);
          setTotal(0);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    const t = window.setTimeout(load, search ? 300 : 0);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [search]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Inbox className="h-7 w-7 text-teal-600" />
          Email aggregation
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          RM email threads across requests. Open a row to review the request and full thread.
        </p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="search"
          placeholder="Search by REQ code or route..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
        />
      </div>

      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-900 dark:text-white">Threads</span>
          <span className="text-xs text-gray-500">{total} total</span>
        </div>
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-16 text-gray-500 text-sm">
            <Mail className="h-10 w-10 mx-auto mb-2 opacity-40" />
            No email threads yet. Send a request to RM from a deal to create one.
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {rows.map((r) => (
              <button
                key={r.thread_id}
                type="button"
                onClick={() => navigate(`/pending/${r.request_id}`)}
                className="w-full text-left px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold text-gray-900 dark:text-white">
                      {r.request_code}{' '}
                      <span className="text-gray-500 font-normal">· {r.route}</span>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-300 mt-0.5 truncate">{r.subject}</div>
                    {r.preview && (
                      <div className="text-xs text-gray-500 mt-1 line-clamp-2">{r.preview}</div>
                    )}
                    <div className="text-xs text-gray-400 mt-2">
                      {r.agent_name ?? '—'} · {r.rm_email} · {r.message_count} message
                      {r.message_count === 1 ? '' : 's'}
                    </div>
                  </div>
                  <div className="text-xs text-gray-400 shrink-0">
                    {new Date(r.last_activity_at).toLocaleString()}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
