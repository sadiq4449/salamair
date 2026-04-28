import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Eye, FileText, RotateCcw } from 'lucide-react';
import { useRequestStore } from '../../store/requestStore';
import StatusBadge from '../../components/ui/StatusBadge';
import PriorityDot from '../../components/ui/PriorityDot';
import Button from '../../components/ui/Button';
import CreateRequestModal from '../../components/CreateRequestModal';
import SlaIndicator from '../../components/SlaIndicator';
import { listTags, type TagDto } from '../../services/advancedService';
const STATUS_OPTIONS = [
  { value: '', label: 'All Status' },
  { value: 'draft', label: 'Draft' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'rm_pending', label: 'RM Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

const AIRPORTS = [
  { value: '', label: 'All' },
  { value: 'MCT', label: 'MCT' },
  { value: 'DXB', label: 'DXB' },
  { value: 'KHI', label: 'KHI' },
  { value: 'BKK', label: 'BKK' },
  { value: 'COK', label: 'COK' },
  { value: 'MLE', label: 'MLE' },
];

export default function RequestList() {
  const navigate = useNavigate();
  const { requests, fetchRequests, isLoading, filters, setFilters, resetFilters } = useRequestStore();
  const [showCreate, setShowCreate] = useState(false);
  const [searchLocal, setSearchLocal] = useState(filters.search || '');
  const [tagOptions, setTagOptions] = useState<TagDto[]>([]);

  useEffect(() => {
    listTags().then(setTagOptions).catch(() => setTagOptions([]));
  }, []);

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
    'px-3 py-2 border rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 outline-none transition-all duration-200 focus:border-[#00A99D] focus:ring-2 focus:ring-[#00A99D]';

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search requests..."
              value={searchLocal}
              onChange={(e) => setSearchLocal(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 outline-none transition-all duration-200 focus:border-[#00A99D] focus:ring-2 focus:ring-[#00A99D]"
            />
          </div>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus size={16} />
          New Request
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <select value={filters.status || ''} onChange={(e) => handleFilterChange('status', e.target.value)} className={selectClass}>
          {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select value={filters.origin || ''} onChange={(e) => handleFilterChange('origin', e.target.value)} className={selectClass}>
          <option value="">Origin</option>
          {AIRPORTS.slice(1).map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
        </select>
        <select value={filters.destination || ''} onChange={(e) => handleFilterChange('destination', e.target.value)} className={selectClass}>
          <option value="">Destination</option>
          {AIRPORTS.slice(1).map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
        </select>
        <select
          value={filters.tag_ids || ''}
          onChange={(e) => handleFilterChange('tag_ids', e.target.value)}
          className={selectClass}
        >
          <option value="">Any tag</option>
          {tagOptions.map((t: TagDto) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={filters.date_from || ''}
          onChange={(e) => handleFilterChange('date_from', e.target.value)}
          className={selectClass}
          placeholder="From"
        />
        <input
          type="date"
          value={filters.date_to || ''}
          onChange={(e) => handleFilterChange('date_to', e.target.value)}
          className={selectClass}
          placeholder="To"
        />
        <button
          onClick={handleReset}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200"
        >
          <RotateCcw size={14} />
          Reset
        </button>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-border dark:border-gray-800 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin h-6 w-6 border-2 border-[#00A99D] border-t-transparent rounded-full" />
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-16 text-gray-400 dark:text-gray-500">
            <FileText className="mx-auto h-12 w-12 mb-3 opacity-50" />
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">No requests found</p>
            <p className="text-sm mt-1 text-gray-500 dark:text-gray-400">Try adjusting your filters or create a new request</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm bg-white dark:bg-gray-900">
              <thead className="bg-gray-50 dark:bg-gray-800/60">
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600 dark:text-gray-300">REQ ID</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600 dark:text-gray-300">Route</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600 dark:text-gray-300">Date</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600 dark:text-gray-300">Pax</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600 dark:text-gray-300">Price</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600 dark:text-gray-300">Status</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600 dark:text-gray-300">Tags</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600 dark:text-gray-300">SLA</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600 dark:text-gray-300">Priority</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600 dark:text-gray-300">Created</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600 dark:text-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {requests.map((req) => (
                  <tr key={req.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all duration-200">
                    <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">{req.request_code}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{req.route}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{req.travel_date ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{req.pax}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{Number(req.price).toFixed(2)} OMR</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={req.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(req.tags ?? []).map((t) => (
                          <span
                            key={t.id}
                            className="inline-flex items-center px-1.5 py-0.5 rounded text-[0.65rem] font-medium text-white max-w-[7rem] truncate"
                            style={{ backgroundColor: t.color }}
                            title={t.name}
                          >
                            {t.name}
                          </span>
                        ))}
                        {(req.tags ?? []).length === 0 && <span className="text-gray-400">—</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {['submitted', 'under_review', 'rm_pending', 'counter_offered'].includes(req.status) ? (
                        <SlaIndicator requestId={req.id} compact />
                      ) : (
                        <span className="text-gray-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <PriorityDot priority={req.priority} />
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                      {new Date(req.created_at).toLocaleDateString()}
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
        onCreated={() => fetchRequests()}
      />
    </div>
  );
}
