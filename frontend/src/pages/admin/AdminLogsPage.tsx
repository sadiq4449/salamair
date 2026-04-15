import { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { listAdminLogs } from '../../services/adminService';
import type { AdminLogRow } from '../../types';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { useToastStore } from '../../store/toastStore';

function apiErr(e: unknown): string {
  const ax = e as { response?: { data?: { error?: { message?: string } } } };
  return ax.response?.data?.error?.message ?? 'Request failed';
}

export default function AdminLogsPage() {
  const [items, setItems] = useState<AdminLogRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState('');
  const [actorId, setActorId] = useState('');
  const [from, setFrom] = useState('');
  const [toDate, setToDate] = useState('');
  const addToast = useToastStore((s) => s.addToast);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listAdminLogs({
        page,
        limit: 25,
        action: action || undefined,
        actor_id: actorId.trim() || undefined,
        from: from || undefined,
        to: toDate || undefined,
      });
      setItems(res.items);
      setTotal(res.total);
    } catch (e) {
      addToast('error', apiErr(e));
    } finally {
      setLoading(false);
    }
  }, [page, action, actorId, from, toDate, addToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const pages = Math.max(1, Math.ceil(total / 25));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-end">
        <div className="w-44">
          <label className="text-xs text-gray-500 dark:text-gray-400">Action</label>
          <Input value={action} onChange={(e) => setAction(e.target.value)} placeholder="e.g. user_created" />
        </div>
        <div className="w-56">
          <label className="text-xs text-gray-500 dark:text-gray-400">Actor user ID</label>
          <Input value={actorId} onChange={(e) => setActorId(e.target.value)} placeholder="UUID" />
        </div>
        <div className="w-40">
          <label className="text-xs text-gray-500 dark:text-gray-400">From</label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="w-40">
          <label className="text-xs text-gray-500 dark:text-gray-400">To</label>
          <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        </div>
        <Button type="button" variant="secondary" onClick={() => void load()}>
          Apply
        </Button>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex justify-center py-16 text-teal-600">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800/80 text-left text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3">Time</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Actor</th>
                  <th className="px-4 py-3">Target</th>
                  <th className="px-4 py-3">Details</th>
                  <th className="px-4 py-3">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {items.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-800/40 align-top">
                    <td className="px-4 py-3 whitespace-nowrap text-gray-600 dark:text-gray-300">
                      {new Date(row.timestamp).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-teal-700 dark:text-teal-300">{row.action}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 dark:text-white">{row.actor.name}</div>
                      <div className="text-xs text-gray-500">{row.actor.role}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                      {row.target ? (
                        <>
                          <span className="font-mono text-xs">{row.target.type}</span>
                          {row.target.name && <div>{row.target.name}</div>}
                        </>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300 max-w-xs truncate" title={row.details ?? ''}>
                      {row.details ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 font-mono">{row.ip_address ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-800 text-sm text-gray-500">
          <span>
            Page {page} of {pages} ({total} entries)
          </span>
          <div className="space-x-2">
            <Button type="button" variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Prev
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={page >= pages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
