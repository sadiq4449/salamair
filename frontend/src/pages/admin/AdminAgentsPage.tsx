import { useCallback, useEffect, useState } from 'react';
import { Loader2, Pencil } from 'lucide-react';
import { listAdminAgents, updateAdminAgent } from '../../services/adminService';
import type { AdminAgentItem } from '../../types';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { useToastStore } from '../../store/toastStore';

function apiErr(e: unknown): string {
  const ax = e as { response?: { data?: { error?: { message?: string } } } };
  return ax.response?.data?.error?.message ?? 'Request failed';
}

function fmtCredit(v: string | number) {
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  if (Number.isNaN(n)) return '—';
  return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export default function AdminAgentsPage() {
  const [items, setItems] = useState<AdminAgentItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [edit, setEdit] = useState<AdminAgentItem | null>(null);
  const [company, setCompany] = useState('');
  const [credit, setCredit] = useState('');
  const addToast = useToastStore((s) => s.addToast);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listAdminAgents({ page, limit: 15, search: search || undefined });
      setItems(res.items);
      setTotal(res.total);
    } catch (e) {
      addToast('error', apiErr(e));
    } finally {
      setLoading(false);
    }
  }, [page, search, addToast]);

  useEffect(() => {
    void load();
  }, [load]);

  function openEdit(a: AdminAgentItem) {
    setEdit(a);
    setCompany(a.company_name ?? '');
    setCredit(String(a.credit_limit ?? ''));
  }

  async function onSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!edit) return;
    const lim = parseFloat(credit);
    if (Number.isNaN(lim) || lim < 0) {
      addToast('error', 'Credit limit must be a valid number');
      return;
    }
    try {
      await updateAdminAgent(edit.id, {
        company_name: company || null,
        credit_limit: lim,
      });
      addToast('success', 'Agent profile updated');
      setEdit(null);
      void load();
    } catch (err) {
      addToast('error', apiErr(err));
    }
  }

  const pages = Math.max(1, Math.ceil(total / 15));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-end">
        <div className="w-56">
          <label className="text-xs text-gray-500 dark:text-gray-400">Search</label>
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name, email, company" />
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
                  <th className="px-4 py-3">Agent</th>
                  <th className="px-4 py-3">Company</th>
                  <th className="px-4 py-3">City</th>
                  <th className="px-4 py-3">Credit limit</th>
                  <th className="px-4 py-3">Requests</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {items.map((a) => (
                  <tr key={a.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-800/40">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 dark:text-white">{a.name}</div>
                      <div className="text-gray-500 text-xs">{a.email}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{a.company_name ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{a.city ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-800 dark:text-gray-200">{fmtCredit(a.credit_limit)}</td>
                    <td className="px-4 py-3">{a.requests_count}</td>
                    <td className="px-4 py-3">
                      <span className={a.is_active ? 'text-emerald-600' : 'text-red-500'}>
                        {a.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        className="p-1.5 rounded text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                        title="Edit profile"
                        onClick={() => openEdit(a)}
                      >
                        <Pencil size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-800 text-sm text-gray-500">
          <span>
            Page {page} of {pages} ({total} agents)
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

      {edit && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4">
          <form
            onSubmit={onSaveEdit}
            className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-md w-full p-6 space-y-4 border border-gray-200 dark:border-gray-700"
          >
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Edit agent profile</h2>
            <p className="text-sm text-gray-500">{edit.name}</p>
            <Input
              placeholder="Company name"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
            />
            <Input
              required
              type="number"
              min={0}
              step="0.01"
              placeholder="Credit limit"
              value={credit}
              onChange={(e) => setCredit(e.target.value)}
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => setEdit(null)}>
                Cancel
              </Button>
              <Button type="submit">Save</Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
