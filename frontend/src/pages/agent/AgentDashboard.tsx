import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Clock, CheckCircle, XCircle, Plus, List, Eye, Plane } from 'lucide-react';
import { useRequestStore } from '../../store/requestStore';
import StatusBadge from '../../components/ui/StatusBadge';
import PriorityDot from '../../components/ui/PriorityDot';
import Button from '../../components/ui/Button';
import CreateRequestModal from '../../components/CreateRequestModal';
export default function AgentDashboard() {
  const navigate = useNavigate();
  const { requests, fetchRequests, isLoading } = useRequestStore();
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    fetchRequests({ limit: 100 });
  }, [fetchRequests]);

  const stats = {
    total: requests.length,
    pending: requests.filter((r) => ['submitted', 'under_review', 'rm_pending'].includes(r.status)).length,
    approved: requests.filter((r) => r.status === 'approved').length,
    rejected: requests.filter((r) => r.status === 'rejected').length,
  };

  const recentRequests = requests.slice(0, 5);

  const statCards = [
    {
      label: 'Total Requests',
      value: stats.total,
      icon: FileText,
      iconBg: 'bg-[#00A99D]/10 dark:bg-[#00A99D]/20',
      iconColor: 'text-[#00A99D] dark:text-[#2dd4bf]',
    },
    {
      label: 'Pending',
      value: stats.pending,
      icon: Clock,
      iconBg: 'bg-yellow-100 dark:bg-yellow-900/30',
      iconColor: 'text-yellow-700 dark:text-yellow-400',
    },
    {
      label: 'Approved',
      value: stats.approved,
      icon: CheckCircle,
      iconBg: 'bg-green-100 dark:bg-green-900/30',
      iconColor: 'text-green-700 dark:text-green-400',
    },
    {
      label: 'Rejected',
      value: stats.rejected,
      icon: XCircle,
      iconBg: 'bg-red-100 dark:bg-red-900/30',
      iconColor: 'text-red-700 dark:text-red-400',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
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

      {/* Quick Actions */}
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={() => setShowCreate(true)}>
          <Plus size={16} />
          Create New Request
        </Button>
        <Button variant="outline" onClick={() => navigate('/flights')}>
          <Plane size={16} />
          Check Flights
        </Button>
        <Button variant="outline" onClick={() => navigate('/requests')}>
          <List size={16} />
          All Requests
        </Button>
      </div>

      {/* Recent Requests Table */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-border dark:border-gray-800 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border dark:border-gray-800">
          <h3 className="text-xl font-semibold text-gray-800 dark:text-white">Recent Requests</h3>
          <button
            onClick={() => navigate('/requests')}
            className="text-sm text-[#00A99D] hover:text-[#009688] dark:text-[#2dd4bf] font-medium transition-all duration-200"
          >
            View All →
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin h-6 w-6 border-2 border-[#00A99D] border-t-transparent rounded-full" />
          </div>
        ) : recentRequests.length === 0 ? (
          <div className="text-center py-12 text-gray-400 dark:text-gray-500">
            <FileText className="mx-auto h-10 w-10 mb-2 opacity-50" />
            <p className="text-sm">No requests yet. Create your first request!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm bg-white dark:bg-gray-900">
              <thead className="bg-gray-50 dark:bg-gray-800/60">
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600 dark:text-gray-300">REQ ID</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600 dark:text-gray-300">Route</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600 dark:text-gray-300">Pax</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600 dark:text-gray-300">Price</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600 dark:text-gray-300">Status</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600 dark:text-gray-300">Priority</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600 dark:text-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {recentRequests.map((req) => (
                  <tr
                    key={req.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all duration-200"
                  >
                    <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">{req.request_code}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{req.route}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{req.pax}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{Number(req.price).toFixed(2)} OMR</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={req.status} />
                    </td>
                    <td className="px-4 py-3">
                      <PriorityDot priority={req.priority} />
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => navigate(`/requests/${req.id}`)}
                        className="inline-flex items-center gap-1 text-[#00A99D] hover:text-[#009688] dark:text-[#2dd4bf] font-medium text-sm transition-all duration-200"
                      >
                        <Eye size={14} />
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <CreateRequestModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={() => fetchRequests({ limit: 100 })}
      />
    </div>
  );
}
