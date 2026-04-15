import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Eye, FileText, RotateCcw, List } from 'lucide-react';
import { useRequestStore } from '../../store/requestStore';
import StatusBadge from '../../components/ui/StatusBadge';
import PriorityDot from '../../components/ui/PriorityDot';
import SlaIndicator from '../../components/SlaIndicator';

const STATUS_OPTIONS = [
  { value: '', label: 'All Status' },
  { value: 'draft', label: 'Draft' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'rm_pending', label: 'RM Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'counter_offered', label: 'Counter Offered' },
];

const AIRPORTS = ['MCT', 'DXB', 'KHI', 'BKK', 'COK', 'MLE'];

/** Super-admin “All requests” grid (UI.demo_design admin.html pg-requests). */
export default function AdminAllRequestsPage() {
  const navigate = useNavigate();
  const { requests, fetchRequests, isLoading, filters, setFilters, resetFilters } = useRequestStore();
  const [searchLocal, setSearchLocal] = useState(filters.search || '');

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  function handleSearch() {
    setFilters({ search: searchLocal });
    fetchRequests({ search: searchLocal });
  }

  function handleFilterChange(field: string, value: string) {
    setFilters({ [field]: value });
    fetchRequests({ ...filters, [field]: value });
  }

  function handleReset() {
    setSearchLocal('');
    resetFilters();
    fetchRequests({
      page: 1,
      limit: 20,
      search: '',
      status: '',
      origin: '',
      destination: '',
      date_from: '',
      date_to: '',
      tag_ids: '',
    });
  }

  const selectClass =
    'px-3 py-2 border rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 outline-none focus:border-teal-500 focus:ring-3 focus:ring-teal-500/10';

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-gray-900 dark:text-white">
        <List className="h-6 w-6 text-teal-600" />
        <h2 className="text-lg font-semibold">All requests</h2>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search all requests..."
            value={searchLocal}
            onChange={(e) => setSearchLocal(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 outline-none focus:border-teal-500"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <select
          value={filters.status || ''}
          onChange={(e) => handleFilterChange('status', e.target.value)}
          className={selectClass}
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <select
          value={filters.origin || ''}
          onChange={(e) => handleFilterChange('origin', e.target.value)}
          className={selectClass}
        >
          <option value="">Origin</option>
          {AIRPORTS.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        <select
          value={filters.destination || ''}
          onChange={(e) => handleFilterChange('destination', e.target.value)}
          className={selectClass}
        >
          <option value="">Destination</option>
          {AIRPORTS.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Agent"
          value={filters.agent || ''}
          onChange={(e) => handleFilterChange('agent', e.target.value)}
          className={`${selectClass} max-w-[140px]`}
        />
        <input
          type="date"
          value={filters.date_from || ''}
          onChange={(e) => handleFilterChange('date_from', e.target.value)}
          className={selectClass}
        />
        <input
          type="date"
          value={filters.date_to || ''}
          onChange={(e) => handleFilterChange('date_to', e.target.value)}
          className={selectClass}
        />
        <button
          type="button"
          onClick={handleReset}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400"
        >
          <RotateCcw size={14} />
          Reset
        </button>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin h-6 w-6 border-2 border-teal-600 border-t-transparent rounded-full" />
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <FileText className="mx-auto h-12 w-12 mb-3 opacity-50" />
            <p className="text-sm">No requests found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">REQ ID</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Agent</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Route</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Pax</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Price</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Priority</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">SLA</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {requests.map((req) => (
                  <tr key={req.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-6 py-3.5 font-semibold text-gray-900 dark:text-white">{req.request_code}</td>
                    <td className="px-6 py-3.5 text-gray-600 dark:text-gray-300">{req.agent_name ?? '—'}</td>
                    <td className="px-6 py-3.5 text-gray-600 dark:text-gray-300">{req.route}</td>
                    <td className="px-6 py-3.5 text-gray-600 dark:text-gray-300">{req.travel_date ?? '—'}</td>
                    <td className="px-6 py-3.5">{req.pax}</td>
                    <td className="px-6 py-3.5">{Number(req.price).toFixed(2)} OMR</td>
                    <td className="px-6 py-3.5">
                      <StatusBadge status={req.status} />
                    </td>
                    <td className="px-6 py-3.5">
                      <PriorityDot priority={req.priority} />
                    </td>
                    <td className="px-6 py-3.5 min-w-[140px]">
                      {['approved', 'rejected', 'draft'].includes(req.status) ? (
                        <span className="text-xs text-gray-400">—</span>
                      ) : (
                        <SlaIndicator requestId={req.id} compact />
                      )}
                    </td>
                    <td className="px-6 py-3.5">
                      <button
                        type="button"
                        onClick={() => navigate(`/pending/${req.id}`)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400 rounded-lg text-sm font-medium"
                      >
                        <Eye size={14} />
                        Open
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
