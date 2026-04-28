import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Send, AlertTriangle, CheckCircle, Eye } from 'lucide-react';
import { useRequestStore } from '../../store/requestStore';
import PriorityDot from '../../components/ui/PriorityDot';
import type { Priority } from '../../types';

export default function SalesDashboard() {
  const navigate = useNavigate();
  const { requests, fetchSalesQueue, isLoading } = useRequestStore();

  useEffect(() => {
    fetchSalesQueue({ limit: 100 });
  }, [fetchSalesQueue]);

  const stats = {
    pending: requests.filter((r) => ['submitted', 'under_review'].includes(r.status)).length,
    rmPending: requests.filter((r) => r.status === 'rm_pending').length,
    urgent: requests.filter((r) => r.priority === 'urgent').length,
    processed: requests.filter((r) => ['approved', 'rejected', 'counter_offered'].includes(r.status)).length,
  };

  const pendingRequests = requests.filter((r) => ['submitted', 'under_review'].includes(r.status));

  const statCards = [
    {
      label: 'Pending Requests',
      value: stats.pending,
      icon: Clock,
      iconBg: 'bg-yellow-100 dark:bg-yellow-900/30',
      iconColor: 'text-yellow-700 dark:text-yellow-400',
    },
    {
      label: 'RM Pending',
      value: stats.rmPending,
      icon: Send,
      iconBg: 'bg-[#003B3F]/10 dark:bg-[#003B3F]/25',
      iconColor: 'text-[#003B3F] dark:text-[#2dd4bf]',
    },
    {
      label: 'Urgent Requests',
      value: stats.urgent,
      icon: AlertTriangle,
      iconBg: 'bg-red-100 dark:bg-red-900/30',
      iconColor: 'text-red-700 dark:text-red-400',
    },
    {
      label: 'Processed',
      value: stats.processed,
      icon: CheckCircle,
      iconBg: 'bg-green-100 dark:bg-green-900/30',
      iconColor: 'text-green-700 dark:text-green-400',
    },
  ];

  function timeSince(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const hrs = Math.floor(diff / 3600000);
    if (hrs < 1) return '<1h';
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}d`;
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="bg-white dark:bg-gray-900 rounded-xl border border-border dark:border-gray-800 shadow-sm p-5 transition-all duration-200"
          >
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${card.iconBg}`}>
                <card.icon className={`h-6 w-6 ${card.iconColor}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{card.value}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{card.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pending Review Table */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-border dark:border-gray-800 shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-border dark:border-gray-800">
          <h3 className="text-xl font-semibold text-gray-800 dark:text-white">Pending Review</h3>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300">
            {pendingRequests.length}
          </span>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin h-6 w-6 border-2 border-[#00A99D] border-t-transparent rounded-full" />
          </div>
        ) : pendingRequests.length === 0 ? (
          <div className="text-center py-12 text-gray-400 dark:text-gray-500">
            <CheckCircle className="mx-auto h-10 w-10 mb-2 opacity-50" />
            <p className="text-sm">All caught up! No pending requests.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm bg-white dark:bg-gray-900">
              <thead className="bg-gray-50 dark:bg-gray-800/60">
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600 dark:text-gray-300">REQ ID</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600 dark:text-gray-300">Agent</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600 dark:text-gray-300">Route</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600 dark:text-gray-300">Pax</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600 dark:text-gray-300">Price</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600 dark:text-gray-300">Priority</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600 dark:text-gray-300">Waiting</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600 dark:text-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {pendingRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all duration-200">
                    <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">{req.request_code}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{req.agent_name ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{req.route}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{req.pax}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{Number(req.price).toFixed(2)} OMR</td>
                    <td className="px-4 py-3">
                      <PriorityDot priority={req.priority as Priority} />
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{timeSince(req.created_at)}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => navigate(`/pending/${req.id}`)}
                        className="inline-flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium bg-[#00A99D] text-white hover:bg-[#009688] transition-all duration-200"
                      >
                        <Eye size={14} />
                        Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
