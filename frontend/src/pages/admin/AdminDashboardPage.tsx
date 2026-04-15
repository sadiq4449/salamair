import { useEffect, useState } from 'react';
import { Activity, Mail, Server, Users, Loader2, Plane, Briefcase, Shield } from 'lucide-react';
import { getAdminStats } from '../../services/adminService';
import type { AdminStats } from '../../types';
import { useToastStore } from '../../store/toastStore';

function apiErr(e: unknown): string {
  const ax = e as { response?: { data?: { error?: { message?: string } } } };
  return ax.response?.data?.error?.message ?? 'Failed to load stats';
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const addToast = useToastStore((s) => s.addToast);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const s = await getAdminStats();
        if (!cancelled) setStats(s);
      } catch (e) {
        addToast('error', apiErr(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [addToast]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-teal-600">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!stats) return null;

  const cards = [
    { label: 'Total users', value: stats.total_users, icon: Users },
    { label: 'Active today', value: stats.active_users_today, icon: Activity },
    { label: 'Agents', value: stats.total_agents, icon: Plane },
    { label: 'Sales', value: stats.total_sales, icon: Briefcase },
    { label: 'Admins', value: stats.total_admins, icon: Shield },
    { label: 'Requests today', value: stats.requests_today, icon: Activity },
    { label: 'Pending requests', value: stats.pending_requests, icon: Activity },
    { label: 'Emails sent today', value: stats.emails_sent_today, icon: Mail },
    { label: 'Reported uptime', value: stats.system_uptime, icon: Server },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {cards.map(({ label, value, icon: Icon }) => (
        <div
          key={label}
          className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm"
        >
          <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400 mb-2">
            <Icon size={18} />
            <span className="text-xs font-semibold uppercase tracking-wide">{label}</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
        </div>
      ))}
    </div>
  );
}
