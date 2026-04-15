import { useCallback, useEffect, useMemo, useState, type ElementType } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  BarChart3,
  Clock,
  Download,
  Loader2,
  Mail,
  Minus,
  Percent,
} from 'lucide-react';
import api from '../services/api';
import { rangeFromPreset, toYMD } from '../utils/dateRange';
import { TOKEN_KEY } from '../utils/constants';
import { useAuth } from '../hooks/useAuth';

/** UI.demo_design agent.css / sales.css — chart accent */
const TEAL = '#0d9488';
const ROUTE_CHART_COLORS = ['#0d9488', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#10b981', '#6366f1', '#ec4899'];

const STATUS_BUCKET_COLORS: Record<string, string> = {
  Approved: '#10b981',
  Pending: '#f59e0b',
  Rejected: '#ef4444',
  'RM Review': '#8b5cf6',
};

function bucketStatusLabel(status: string): string {
  if (status === 'approved') return 'Approved';
  if (status === 'rejected') return 'Rejected';
  if (status === 'rm_pending') return 'RM Review';
  return 'Pending';
}

function aggregateStatusForDemo(dist: Record<string, number> | undefined) {
  const out: Record<string, number> = { Approved: 0, Pending: 0, Rejected: 0, 'RM Review': 0 };
  if (!dist) return out;
  for (const [k, v] of Object.entries(dist)) {
    const b = bucketStatusLabel(k);
    out[b] = (out[b] ?? 0) + v;
  }
  return out;
}

function formatPeriodTick(p: string) {
  if (/^\d{4}-\d{2}$/.test(p)) {
    const [y, m] = p.split('-');
    const d = new Date(Number(y), Number(m) - 1, 1);
    return d.toLocaleString('en', { month: 'short', year: 'numeric' });
  }
  return p;
}

function formatMoneyOmr(n: number) {
  return `${Math.round(n).toLocaleString('en-US')} OMR`;
}

interface KpiPayload {
  total_requests: number;
  total_requests_change: number;
  approval_rate: number;
  approval_rate_change: number;
  avg_response_time_hours: number;
  avg_response_time_change: number;
  total_revenue: number;
  total_revenue_change: number;
  pending_requests: number;
  active_agents: number;
  status_distribution?: Record<string, number>;
}

interface SalesOverview {
  queue_pending: number;
  approval_rate: number;
  rejected_count: number;
  avg_response_time_hours: number;
  rm_emails_sent: number;
}

interface AgentRow {
  id: string;
  name: string;
  company?: string;
  city: string;
  total_requests: number;
  approved: number;
  rejected?: number;
  pending?: number;
  total_revenue: number;
  approval_rate: number;
  avg_response_time_hours: number;
}

type QuickPreset = 'today' | 'week' | 'month' | 'quarter' | null;
type TableSortKey = 'name' | 'revenue' | 'requests' | 'approval_rate' | 'avg_response_time_hours';

function StatShell({
  icon: Icon,
  iconClass,
  children,
}: {
  icon: ElementType;
  iconClass: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[12px] border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-[22px] shadow-[0_1px_3px_rgba(0,0,0,0.1)] flex items-start gap-3.5 transition-all hover:-translate-y-0.5 hover:shadow-[0_4px_6px_rgba(0,0,0,0.1)]">
      <div
        className={`w-[46px] h-[46px] rounded-lg flex items-center justify-center shrink-0 text-lg ${iconClass}`}
      >
        <Icon className="h-5 w-5" strokeWidth={2} />
      </div>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

function DeltaSch({
  value,
  invert,
}: {
  value: number;
  /** When true, decrease is positive (green). */
  invert?: boolean;
}) {
  if (value === 0 || Number.isNaN(value)) {
    return (
      <div className="text-[0.72rem] font-semibold mt-1.5 text-gray-400 flex items-center gap-1">
        <Minus className="h-3 w-3" /> 0%
      </div>
    );
  }
  const up = value > 0;
  const good = invert ? !up : up;
  return (
    <div
      className={`text-[0.72rem] font-semibold mt-1.5 flex items-center gap-1 ${
        good ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
      }`}
    >
      {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {Math.abs(value).toFixed(1)}%
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-[12px] border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-[22px] animate-pulse flex gap-3.5">
      <div className="w-[46px] h-[46px] rounded-lg bg-gray-200 dark:bg-gray-700 shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="h-8 w-28 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>
    </div>
  );
}

function SkeletonChart() {
  return (
    <div className="rounded-[12px] border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden animate-pulse">
      <div className="px-6 py-[18px] border-b border-gray-200 dark:border-gray-700">
        <div className="h-4 w-40 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>
      <div className="p-6 h-[280px] bg-gray-50 dark:bg-gray-800/40" />
    </div>
  );
}

/** UI.demo_design `.cd` card */
function DemoCard({ title, right, children }: { title: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-[12px] border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-[0_1px_3px_rgba(0,0,0,0.1)] overflow-hidden transition-shadow hover:shadow-[0_4px_6px_rgba(0,0,0,0.1)]">
      <div className="px-6 py-[18px] border-b border-gray-200 dark:border-gray-700 flex items-center justify-between gap-3">
        <h3 className="text-[1.05rem] font-semibold text-gray-900 dark:text-white">{title}</h3>
        {right}
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

const PAGE_SIZE = 10;

export default function Analytics() {
  const { isAgent, isSales, isAdmin } = useAuth();
  const isSalesOrAdmin = Boolean(isSales || isAdmin);

  const [preset, setPreset] = useState<QuickPreset>('month');
  const [from, setFrom] = useState(() => toYMD(rangeFromPreset('month').from));
  const [to, setTo] = useState(() => toYMD(rangeFromPreset('month').to));

  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<KpiPayload | null>(null);
  const [salesOverview, setSalesOverview] = useState<SalesOverview | null>(null);
  const [revenueSeries, setRevenueSeries] = useState<Array<{ period: string; revenue: number }>>([]);
  const [monthlyApprovals, setMonthlyApprovals] = useState<
    Array<{ period: string; approved: number; rejected: number }>
  >([]);
  const [routeDonut, setRouteDonut] = useState<Array<{ route: string; revenue: number }>>([]);
  const [dailyTrends, setDailyTrends] = useState<
    Array<{ date: string; submitted: number; approved: number; rejected: number }>
  >([]);
  const [cities, setCities] = useState<Array<{ city: string; requests: number; revenue: number; agents: number }>>([]);
  const [agents, setAgents] = useState<AgentRow[]>([]);

  const [tableSort, setTableSort] = useState<{ key: TableSortKey; dir: 'asc' | 'desc' }>({
    key: 'revenue',
    dir: 'desc',
  });
  const [tablePage, setTablePage] = useState(0);

  const applyPreset = useCallback((p: 'today' | 'week' | 'month' | 'quarter') => {
    setPreset(p);
    const { from: f, to: t } = rangeFromPreset(p);
    setFrom(toYMD(f));
    setTo(toYMD(t));
    setTablePage(0);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setKpis(null);
    setSalesOverview(null);
    setRevenueSeries([]);
    setMonthlyApprovals([]);
    setRouteDonut([]);
    setDailyTrends([]);
    setCities([]);
    setAgents([]);

    try {
      if (isAgent) {
        const [kRes, revRes] = await Promise.all([
          api.get('/analytics/kpis', { params: { from, to } }),
          api.get('/analytics/revenue', { params: { from, to, granularity: 'monthly' } }),
        ]);
        setKpis(kRes.data.kpis);
        setRevenueSeries((revRes.data.data ?? []).map((x: { period: string; revenue: number }) => ({
          period: x.period,
          revenue: x.revenue,
        })));
      } else {
        const range = { from, to };
        const [kRes, sRes, mRes, rRes, dRes, cRes, aRes] = await Promise.all([
          api.get('/analytics/kpis', { params: range }),
          api.get('/analytics/sales-overview', { params: range }),
          api.get('/analytics/request-trends', { params: { ...range, granularity: 'monthly' } }),
          api.get('/analytics/route-revenue', { params: { ...range, limit: 8 } }),
          api.get('/analytics/request-trends', { params: { ...range, granularity: 'daily' } }),
          api.get('/analytics/city-breakdown', { params: range }),
          api.get('/analytics/agent-performance', { params: { ...range, limit: 500, sort: 'revenue' } }),
        ]);
        setKpis(kRes.data.kpis);
        setSalesOverview(sRes.data.overview);
        setMonthlyApprovals(
          (mRes.data.data ?? []).map(
            (x: { date: string; approved: number; rejected: number }) => ({
              period: x.date,
              approved: x.approved,
              rejected: x.rejected,
            }),
          ),
        );
        setRouteDonut(rRes.data.data ?? []);
        setDailyTrends(dRes.data.data ?? []);
        setCities(cRes.data.data ?? []);
        setAgents(aRes.data.agents ?? []);
      }
    } catch {
      setKpis(null);
    } finally {
      setLoading(false);
    }
  }, [from, to, isAgent]);

  useEffect(() => {
    load();
  }, [load]);

  const pieDemoData = useMemo(() => {
    const agg = aggregateStatusForDemo(kpis?.status_distribution);
    return Object.entries(agg)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({ name, value }));
  }, [kpis]);

  const sortedAgents = useMemo(() => {
    const list = [...agents];
    const { key, dir } = tableSort;
    const m = dir === 'asc' ? 1 : -1;
    list.sort((a, b) => {
      if (key === 'name') {
        const va = a.name.toLowerCase();
        const vb = b.name.toLowerCase();
        return va < vb ? -m : va > vb ? m : 0;
      }
      if (key === 'revenue') {
        const va = a.total_revenue;
        const vb = b.total_revenue;
        return va < vb ? -m : va > vb ? m : 0;
      }
      if (key === 'requests') {
        const va = a.total_requests;
        const vb = b.total_requests;
        return va < vb ? -m : va > vb ? m : 0;
      }
      const va = Number(a[key] ?? 0);
      const vb = Number(b[key] ?? 0);
      return va < vb ? -m : va > vb ? m : 0;
    });
    return list;
  }, [agents, tableSort]);

  const pagedAgents = useMemo(() => {
    const start = tablePage * PAGE_SIZE;
    return sortedAgents.slice(start, start + PAGE_SIZE);
  }, [sortedAgents, tablePage]);

  const tablePages = Math.max(1, Math.ceil(sortedAgents.length / PAGE_SIZE));

  useEffect(() => {
    setTablePage(0);
  }, [tableSort, agents.length, from, to]);

  const toggleSort = (key: TableSortKey) => {
    setTableSort((prev) =>
      prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'desc' },
    );
  };

  const exportFile = async (type: string, format: 'csv' | 'xlsx') => {
    const token = localStorage.getItem(TOKEN_KEY);
    const q = new URLSearchParams({
      type,
      format,
      from,
      to,
      granularity:
        type === 'revenue' ? 'monthly' : type === 'request_trends' || type === 'agent_performance' ? 'daily' : 'daily',
    });
    const res = await fetch(`/api/v1/analytics/export?${q}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics_${type}_${from}_${to}.${format}`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const revenueTitle =
    preset === 'month' ? 'Revenue this month' : preset === 'week' ? 'Revenue this week' : 'Revenue';

  const headerSubtitle = isAgent
    ? 'Performance for the selected period (agent portal layout).'
    : 'Pipeline metrics and charts (sales portal layout).';

  const thBtn = (label: string, key: TableSortKey) => (
    <button
      type="button"
      onClick={() => toggleSort(key)}
      className="inline-flex items-center gap-1 uppercase tracking-wide hover:text-gray-800 dark:hover:text-gray-200"
    >
      {label}
      {tableSort.key === key ? (tableSort.dir === 'asc' ? ' ↑' : ' ↓') : ''}
    </button>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="h-7 w-7 text-teal-600" />
            Analytics
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{headerSubtitle}</p>
        </div>

        {/* UI.demo_design `.tb` + `.fg2` toolbar */}
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3">
          <div className="flex flex-wrap gap-2">
            {(['today', 'week', 'month', 'quarter'] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => applyPreset(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  preset === p
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {p === 'today' ? 'Today' : p === 'week' ? 'This week' : p === 'month' ? 'This month' : 'This quarter'}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <input
              type="date"
              value={from}
              onChange={(e) => {
                setFrom(e.target.value);
                setPreset(null);
              }}
              className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-2.5 py-2 text-gray-900 dark:text-white text-sm"
            />
            <span className="text-gray-400">—</span>
            <input
              type="date"
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
                setPreset(null);
              }}
              className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-2.5 py-2 text-gray-900 dark:text-white text-sm"
            />
          </div>
          {isSalesOrAdmin && (
            <div className="flex flex-wrap gap-2">
              <select
                className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-2 py-2 text-xs font-medium text-gray-700 dark:text-gray-200"
                onChange={(e) => {
                  const v = e.target.value;
                  if (!v) return;
                  const [t, f] = v.split('|');
                  exportFile(t, f as 'csv' | 'xlsx');
                  e.target.selectedIndex = 0;
                }}
                defaultValue=""
              >
                <option value="" disabled>
                  Export…
                </option>
                <option value="agent_performance|csv">Agents (CSV)</option>
                <option value="agent_performance|xlsx">Agents (Excel)</option>
                <option value="kpis|csv">KPIs (CSV)</option>
                <option value="revenue|csv">Revenue (CSV)</option>
                <option value="request_trends|csv">Request trends (CSV)</option>
                <option value="city_breakdown|csv">City breakdown (CSV)</option>
                <option value="route_revenue|csv">Route revenue (CSV)</option>
              </select>
            </div>
          )}
          {isAgent && (
            <button
              type="button"
              onClick={() => exportFile('kpis', 'csv')}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <Download className="h-3.5 w-3.5" />
              Export KPIs
            </button>
          )}
        </div>
      </div>

      {/* ——— Agent: UI.demo_design agent.html #pg-analytics ——— */}
      {isAgent && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-[18px]">
            {loading && !kpis ? (
              <>
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </>
            ) : kpis ? (
              <>
                <StatShell icon={Banknote} iconClass="bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300">
                  <div className="text-[1.65rem] font-bold text-gray-900 dark:text-white leading-tight">
                    {formatMoneyOmr(kpis.total_revenue)}
                  </div>
                  <div className="text-[0.82rem] text-gray-500 dark:text-gray-400 mt-0.5">{revenueTitle}</div>
                  <DeltaSch value={kpis.total_revenue_change} />
                </StatShell>
                <StatShell icon={Percent} iconClass="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                  <div className="text-[1.65rem] font-bold text-gray-900 dark:text-white leading-tight">
                    {kpis.approval_rate}%
                  </div>
                  <div className="text-[0.82rem] text-gray-500 dark:text-gray-400 mt-0.5">Approval rate</div>
                  <DeltaSch value={kpis.approval_rate_change} />
                </StatShell>
                <StatShell icon={Clock} iconClass="bg-blue-100 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300">
                  <div className="text-[1.65rem] font-bold text-gray-900 dark:text-white leading-tight">
                    {kpis.avg_response_time_hours}h
                  </div>
                  <div className="text-[0.82rem] text-gray-500 dark:text-gray-400 mt-0.5">Avg response time</div>
                  <DeltaSch value={kpis.avg_response_time_change} invert />
                </StatShell>
              </>
            ) : (
              <div className="col-span-full text-center py-8 text-gray-500">Could not load analytics.</div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
            {loading ? (
              <>
                <SkeletonChart />
                <SkeletonChart />
              </>
            ) : (
              <>
                <DemoCard title="Revenue trend">
                  <div className="relative h-[280px]">
                    {revenueSeries.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-gray-400 text-sm">No data</div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={revenueSeries} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor={TEAL} stopOpacity={0.35} />
                              <stop offset="100%" stopColor={TEAL} stopOpacity={0.02} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                          <XAxis
                            dataKey="period"
                            tick={{ fontSize: 11 }}
                            tickFormatter={formatPeriodTick}
                            stroke="#9ca3af"
                          />
                          <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" />
                          <Tooltip
                            formatter={(value) => {
                              const n = Number(value ?? 0);
                              return [`${Math.round(n).toLocaleString('en-US')} OMR`, 'Revenue'];
                            }}
                            labelFormatter={(label) => formatPeriodTick(String(label ?? ''))}
                          />
                          <Area
                            type="monotone"
                            dataKey="revenue"
                            stroke={TEAL}
                            strokeWidth={2}
                            fill="url(#revFill)"
                            name="Revenue (OMR)"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </DemoCard>
                <DemoCard title="Status distribution">
                  <div className="relative h-[280px]">
                    {pieDemoData.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-gray-400 text-sm">No status data</div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieDemoData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={58}
                            outerRadius={96}
                            paddingAngle={2}
                          >
                            {pieDemoData.map((entry, i) => (
                              <Cell
                                key={entry.name}
                                fill={STATUS_BUCKET_COLORS[entry.name] ?? ROUTE_CHART_COLORS[i % ROUTE_CHART_COLORS.length]}
                              />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: 12 }} />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </DemoCard>
              </>
            )}
          </div>
        </>
      )}

      {/* ——— Sales / Admin: UI.demo_design sales.html #pg-analytics ——— */}
      {isSalesOrAdmin && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-[18px]">
            {loading && !kpis ? (
              <>
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </>
            ) : kpis ? (
              <>
                <StatShell icon={Banknote} iconClass="bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300">
                  <div className="text-[1.65rem] font-bold text-gray-900 dark:text-white leading-tight">
                    {formatMoneyOmr(kpis.total_revenue)}
                  </div>
                  <div className="text-[0.82rem] text-gray-500 dark:text-gray-400 mt-0.5">Total revenue</div>
                  <DeltaSch value={kpis.total_revenue_change} />
                </StatShell>
                <StatShell icon={Percent} iconClass="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                  <div className="text-[1.65rem] font-bold text-gray-900 dark:text-white leading-tight">
                    {kpis.approval_rate}%
                  </div>
                  <div className="text-[0.82rem] text-gray-500 dark:text-gray-400 mt-0.5">Approval rate</div>
                  <DeltaSch value={kpis.approval_rate_change} />
                </StatShell>
                <StatShell icon={Clock} iconClass="bg-blue-100 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300">
                  <div className="text-[1.65rem] font-bold text-gray-900 dark:text-white leading-tight">
                    {(salesOverview?.avg_response_time_hours ?? kpis.avg_response_time_hours)}h
                  </div>
                  <div className="text-[0.82rem] text-gray-500 dark:text-gray-400 mt-0.5">Avg response time</div>
                  <DeltaSch value={kpis.avg_response_time_change} invert />
                </StatShell>
                <StatShell icon={Mail} iconClass="bg-orange-100 text-orange-600 dark:bg-orange-950/40 dark:text-orange-300">
                  <div className="text-[1.65rem] font-bold text-gray-900 dark:text-white leading-tight">
                    {salesOverview?.rm_emails_sent ?? 0}
                  </div>
                  <div className="text-[0.82rem] text-gray-500 dark:text-gray-400 mt-0.5">RM emails sent</div>
                </StatShell>
              </>
            ) : (
              <div className="col-span-full text-center py-8 text-gray-500">Could not load analytics.</div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {loading ? (
              <>
                <SkeletonChart />
                <SkeletonChart />
              </>
            ) : (
              <>
                <DemoCard title="Monthly approvals">
                  <div className="h-[280px]">
                    {monthlyApprovals.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-gray-400 text-sm">No data</div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={monthlyApprovals} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                          <XAxis
                            dataKey="period"
                            tick={{ fontSize: 11 }}
                            tickFormatter={formatPeriodTick}
                            stroke="#9ca3af"
                          />
                          <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" allowDecimals={false} />
                          <Tooltip labelFormatter={(label) => formatPeriodTick(String(label ?? ''))} />
                          <Legend wrapperStyle={{ fontSize: 12 }} />
                          <Bar dataKey="approved" name="Approved" fill="#10b981" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="rejected" name="Rejected" fill="#ef4444" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </DemoCard>
                <DemoCard title="Route revenue">
                  <div className="h-[280px]">
                    {routeDonut.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-gray-400 text-sm">No route data</div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={routeDonut}
                            dataKey="revenue"
                            nameKey="route"
                            cx="50%"
                            cy="50%"
                            innerRadius={52}
                            outerRadius={88}
                            paddingAngle={2}
                          >
                            {routeDonut.map((_, i) => (
                              <Cell key={i} fill={ROUTE_CHART_COLORS[i % ROUTE_CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value) =>
                              `${Math.round(Number(value ?? 0)).toLocaleString('en-US')} OMR`
                            }
                          />
                          <Legend verticalAlign="bottom" height={40} wrapperStyle={{ fontSize: 11 }} />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </DemoCard>
              </>
            )}
          </div>

          <DemoCard title="Daily request volume">
            <div className="h-[260px]">
              {loading ? (
                <div className="h-full flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
                </div>
              ) : dailyTrends.length === 0 ? (
                <div className="h-full flex items-center justify-center text-gray-400 text-sm">No data</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dailyTrends} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#9ca3af" />
                    <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" allowDecimals={false} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Line type="monotone" dataKey="submitted" stroke={TEAL} name="Submitted" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="approved" stroke="#10b981" name="Approved" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="rejected" stroke="#ef4444" name="Rejected" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </DemoCard>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <DemoCard title="Requests by city">
              <div className="h-[280px]">
                {loading ? (
                  <div className="h-full flex justify-center items-center">
                    <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
                  </div>
                ) : cities.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-gray-400 text-sm">No city data</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={cities.slice(0, 12)} layout="vertical" margin={{ left: 4, right: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="city" width={96} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="requests" fill="#2563eb" name="Requests" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </DemoCard>
            <DemoCard title="Avg response time (hours)">
              <div className="h-[280px]">
                {loading || dailyTrends.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                    {loading ? <Loader2 className="h-8 w-8 animate-spin text-teal-600" /> : 'No data'}
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={dailyTrends.map((d) => ({
                        ...d,
                        avg_response_time_hours: (d as { avg_response_time_hours?: number }).avg_response_time_hours ?? 0,
                      }))}
                    >
                      <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="avg_response_time_hours"
                        stroke="#8b5cf6"
                        name="Hours"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </DemoCard>
          </div>

          <div className="rounded-[12px] border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
            <div className="px-6 py-[18px] border-b border-gray-200 dark:border-gray-700 flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-[1.05rem] font-semibold text-gray-900 dark:text-white">Agent performance</h3>
              <span className="text-xs text-gray-500">
                {sortedAgents.length} agent{sortedAgents.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="overflow-x-auto">
              {loading ? (
                <div className="py-16 flex justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
                </div>
              ) : sortedAgents.length === 0 ? (
                <div className="py-12 text-center text-gray-400 text-sm">No agents in this period</div>
              ) : (
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-800/50 text-left text-[0.68rem] font-semibold text-gray-500 uppercase tracking-wide">
                      <th className="px-5 py-3">#</th>
                      <th className="px-5 py-3">{thBtn('Agent', 'name')}</th>
                      <th className="px-5 py-3">City</th>
                      <th className="px-5 py-3 text-right">{thBtn('Requests', 'requests')}</th>
                      <th className="px-5 py-3 text-right">Approved</th>
                      <th className="px-5 py-3 text-right">{thBtn('Rate', 'approval_rate')}</th>
                      <th className="px-5 py-3 text-right">{thBtn('Revenue', 'revenue')}</th>
                      <th className="px-5 py-3 text-right">{thBtn('Avg resp (h)', 'avg_response_time_hours')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedAgents.map((a, idx) => (
                      <tr
                        key={a.id}
                        className="border-t border-gray-200 dark:border-gray-700 hover:bg-gray-50/80 dark:hover:bg-gray-800/40"
                      >
                        <td className="px-5 py-3 text-gray-500">{tablePage * PAGE_SIZE + idx + 1}</td>
                        <td className="px-5 py-3 font-medium text-gray-900 dark:text-white">{a.name}</td>
                        <td className="px-5 py-3 text-gray-600 dark:text-gray-300">{a.city}</td>
                        <td className="px-5 py-3 text-right tabular-nums">{a.total_requests}</td>
                        <td className="px-5 py-3 text-right tabular-nums">{a.approved}</td>
                        <td className="px-5 py-3 text-right tabular-nums">{a.approval_rate}%</td>
                        <td className="px-5 py-3 text-right tabular-nums">{formatMoneyOmr(a.total_revenue)}</td>
                        <td className="px-5 py-3 text-right tabular-nums">{a.avg_response_time_hours}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            {sortedAgents.length > PAGE_SIZE && (
              <div className="px-5 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between text-xs text-gray-600 dark:text-gray-300">
                <button
                  type="button"
                  disabled={tablePage <= 0}
                  onClick={() => setTablePage((p) => Math.max(0, p - 1))}
                  className="font-semibold text-teal-600 disabled:opacity-40"
                >
                  Previous
                </button>
                <span>
                  Page {tablePage + 1} of {tablePages}
                </span>
                <button
                  type="button"
                  disabled={tablePage >= tablePages - 1}
                  onClick={() => setTablePage((p) => Math.min(tablePages - 1, p + 1))}
                  className="font-semibold text-teal-600 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
