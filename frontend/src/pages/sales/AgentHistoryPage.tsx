import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Loader2, Search } from 'lucide-react';
import { useRequestStore } from '../../store/requestStore';
import { listAdminAgents } from '../../services/adminService';
import { useAuth } from '../../hooks/useAuth';
import type { AdminAgentItem } from '../../types';
import type { RequestItem } from '../../types';

type Agg = {
  agentId: string;
  name: string;
  company: string | null;
  email?: string;
  total: number;
  approved: number;
  pending: number;
  rejected: number;
};

function aggregateFromRequests(requests: RequestItem[]): Agg[] {
  const map = new Map<string, Agg>();
  for (const r of requests) {
    const id = r.agent_id;
    const name = r.agent_name ?? 'Unknown';
    if (!map.has(id)) {
      map.set(id, {
        agentId: id,
        name,
        company: null,
        total: 0,
        approved: 0,
        pending: 0,
        rejected: 0,
      });
    }
    const row = map.get(id)!;
    row.total += 1;
    if (r.status === 'approved') row.approved += 1;
    else if (r.status === 'rejected') row.rejected += 1;
    else if (!['draft'].includes(r.status)) row.pending += 1;
  }
  return Array.from(map.values()).sort((a, b) => b.total - a.total);
}

/** Sales: stats from request list. Admin: enriched with `/admin/agents` when available. */
export default function AgentHistoryPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { requests, fetchRequests, isLoading } = useRequestStore();
  const [adminAgents, setAdminAgents] = useState<AdminAgentItem[] | null>(null);
  const [q, setQ] = useState('');

  useEffect(() => {
    fetchRequests({ page: 1, limit: 100 });
  }, [fetchRequests]);

  useEffect(() => {
    if (user?.role !== 'admin') {
      setAdminAgents(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await listAdminAgents({ limit: 100 });
        if (!cancelled) setAdminAgents(res.items);
      } catch {
        if (!cancelled) setAdminAgents([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.role]);

  const merged = useMemo(() => {
    const base = aggregateFromRequests(requests);
    if (!adminAgents?.length) return base;
    return base.map((b) => {
      const a = adminAgents.find((x) => x.id === b.agentId);
      if (!a) return b;
      return {
        ...b,
        company: a.company_name ?? b.company,
        email: a.email,
      };
    });
  }, [requests, adminAgents]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return merged;
    return merged.filter(
      (x) =>
        x.name.toLowerCase().includes(s) ||
        (x.company && x.company.toLowerCase().includes(s)) ||
        (x.email && x.email.toLowerCase().includes(s))
    );
  }, [merged, q]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Users className="h-7 w-7 text-teal-600" />
          Agent history
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Per-agent volume from recent requests (up to 100 loaded). Admins also merge company names from agent profiles.
        </p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search agents…"
          className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((a) => (
            <button
              key={a.agentId}
              type="button"
              onClick={() => navigate(`/pending?search=${encodeURIComponent(a.name)}`)}
              className="text-left rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 shadow-sm hover:border-teal-300 dark:hover:border-teal-700 transition-colors"
            >
              <div className="flex items-start gap-3 mb-4">
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-teal-500 to-blue-500 text-white font-bold flex items-center justify-center text-sm">
                  {a.name
                    .split(' ')
                    .map((w) => w[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
                <div>
                  <div className="font-semibold text-gray-900 dark:text-white">{a.name}</div>
                  <div className="text-xs text-gray-500">{a.company ?? a.email ?? '—'}</div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <div className="text-lg font-bold text-gray-900 dark:text-white">{a.total}</div>
                  <div className="text-[0.65rem] uppercase text-gray-400">Total</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{a.approved}</div>
                  <div className="text-[0.65rem] uppercase text-gray-400">Approved</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-amber-600 dark:text-amber-400">{a.pending}</div>
                  <div className="text-[0.65rem] uppercase text-gray-400">Open</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {!isLoading && filtered.length === 0 && (
        <p className="text-center text-gray-500 py-8">No agents match your search.</p>
      )}
    </div>
  );
}
