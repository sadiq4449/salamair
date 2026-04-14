import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Send, AlertTriangle, CheckCircle, Eye } from 'lucide-react';
import { useRequestStore } from '../../store/requestStore';
import PriorityDot from '../../components/ui/PriorityDot';

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
    { label: 'Pending Requests', value: stats.pending, icon: Clock, iconBg: 'bg-amber-100 dark:bg-amber-900/30', iconColor: 'text-amber-600 dark:text-amber-400' },
    { label: 'RM Pending', value: stats.rmPending, icon: Send, iconBg: 'bg-purple-100 dark:bg-purple-900/30', iconColor: 'text-purple-600 dark:text-purple-400' },
    { label: 'Urgent Requests', value: stats.urgent, icon: AlertTriangle, iconBg: 'bg-red-100 dark:bg-red-900/30', iconColor: 'text-red-600 dark:text-red-400' },
    { label: 'Processed', value: stats.processed, icon: CheckCircle, iconBg: 'bg-emerald-100 dark:bg-emerald-900/30', iconColor: 'text-emerald-600 dark:text-emerald-400' },
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
            className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm p-5"
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
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">Pending Review</h3>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
            {pendingRequests.length}
          </span>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin h-6 w-6 border-2 border-teal-600 border-t-transparent rounded-full" />
          </div>
        ) : pendingRequests.length === 0 ? (
          <div className="text-center py-12 text-gray-400 dark:text-gray-500">
            <CheckCircle className="mx-auto h-10 w-10 mb-2 opacity-50" />
            <p className="text-sm">All caught up! No pending requests.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">REQ ID</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Agent</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Route</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Pax</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Price</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Priority</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Waiting</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {pendingRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-6 py-3.5 font-semibold text-gray-900 dark:text-white">{req.request_code}</td>
                    <td className="px-6 py-3.5 text-gray-600 dark:text-gray-300">{req.agent_name ?? '—'}</td>
                    <td className="px-6 py-3.5 text-gray-600 dark:text-gray-300">{req.route}</td>
                    <td className="px-6 py-3.5 text-gray-600 dark:text-gray-300">{req.pax}</td>
                    <td className="px-6 py-3.5 text-gray-600 dark:text-gray-300">{Number(req.price).toFixed(2)} OMR</td>
                    <td className="px-6 py-3.5"><PriorityDot priority={req.priority} /></td>
                    <td className="px-6 py-3.5 text-gray-500 dark:text-gray-400">{timeSince(req.created_at)}</td>
                    <td className="px-6 py-3.5">
                      <button
                        onClick={() => navigate(`/pending/${req.id}`)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400 rounded-lg text-sm font-medium hover:bg-teal-100 dark:hover:bg-teal-900/50 transition-colors"
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
