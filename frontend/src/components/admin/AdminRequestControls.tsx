import { useEffect, useState } from 'react';
import { Loader2, Save, Shield } from 'lucide-react';
import Button from '../ui/Button';
import { useRequestStore } from '../../store/requestStore';
import type { RequestDetail } from '../../types';

const STATUS_OPTIONS = [
  'draft',
  'submitted',
  'under_review',
  'rm_pending',
  'approved',
  'rejected',
  'counter_offered',
];

interface Props {
  request: RequestDetail;
  requestId: string;
}

export default function AdminRequestControls({ request, requestId }: Props) {
  const { updateRequest, updateStatus, fetchRequest, isLoading } = useRequestStore();
  const [fields, setFields] = useState({
    route: request.route,
    pax: String(request.pax),
    price: String(request.price),
    notes: request.notes ?? '',
    priority: request.priority,
    travel_date: request.travel_date ?? '',
    return_date: request.return_date ?? '',
  });
  const [forcedStatus, setForcedStatus] = useState(request.status);
  const [forceReason, setForceReason] = useState('');

  useEffect(() => {
    setFields({
      route: request.route,
      pax: String(request.pax),
      price: String(request.price),
      notes: request.notes ?? '',
      priority: request.priority,
      travel_date: request.travel_date ?? '',
      return_date: request.return_date ?? '',
    });
    setForcedStatus(request.status);
  }, [request]);

  async function handleSaveFields(e: React.FormEvent) {
    e.preventDefault();
    await updateRequest(requestId, {
      route: fields.route,
      pax: Number(fields.pax),
      price: Number(fields.price),
      notes: fields.notes || undefined,
      priority: fields.priority,
      travel_date: fields.travel_date || undefined,
      return_date: fields.return_date || undefined,
    });
    await fetchRequest(requestId);
  }

  async function handleForceStatus(e: React.FormEvent) {
    e.preventDefault();
    if (forcedStatus === request.status) return;
    await updateStatus(requestId, {
      status: forcedStatus,
      reason: forceReason || undefined,
      force: true,
    });
    setForceReason('');
    await fetchRequest(requestId);
  }

  return (
    <div className="space-y-5">
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-purple-200 dark:border-purple-900/40 shadow-sm">
        <div className="px-6 py-4 border-b border-purple-100 dark:border-purple-900/30 flex items-center gap-2">
          <Shield className="h-5 w-5 text-purple-600" />
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">Administrator — edit request</h3>
        </div>
        <form onSubmit={handleSaveFields} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block text-sm">
              <span className="text-gray-600 dark:text-gray-400">Route</span>
              <input
                className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
                value={fields.route}
                onChange={(e) => setFields((f) => ({ ...f, route: e.target.value }))}
                required
              />
            </label>
            <label className="block text-sm">
              <span className="text-gray-600 dark:text-gray-400">PAX</span>
              <input
                type="number"
                min={1}
                className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
                value={fields.pax}
                onChange={(e) => setFields((f) => ({ ...f, pax: e.target.value }))}
                required
              />
            </label>
            <label className="block text-sm">
              <span className="text-gray-600 dark:text-gray-400">Price (OMR)</span>
              <input
                type="number"
                step="0.01"
                min={0}
                className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
                value={fields.price}
                onChange={(e) => setFields((f) => ({ ...f, price: e.target.value }))}
                required
              />
            </label>
            <label className="block text-sm">
              <span className="text-gray-600 dark:text-gray-400">Priority</span>
              <select
                className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
                value={fields.priority}
                onChange={(e) => setFields((f) => ({ ...f, priority: e.target.value }))}
              >
                <option value="normal">normal</option>
                <option value="urgent">urgent</option>
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-gray-600 dark:text-gray-400">Travel date</span>
              <input
                type="date"
                className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
                value={fields.travel_date}
                onChange={(e) => setFields((f) => ({ ...f, travel_date: e.target.value }))}
              />
            </label>
            <label className="block text-sm">
              <span className="text-gray-600 dark:text-gray-400">Return date</span>
              <input
                type="date"
                className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
                value={fields.return_date}
                onChange={(e) => setFields((f) => ({ ...f, return_date: e.target.value }))}
              />
            </label>
          </div>
          <label className="block text-sm">
            <span className="text-gray-600 dark:text-gray-400">Notes</span>
            <textarea
              rows={3}
              className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
              value={fields.notes}
              onChange={(e) => setFields((f) => ({ ...f, notes: e.target.value }))}
            />
          </label>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? <Loader2 className="animate-spin h-4 w-4" /> : <Save size={16} />}
            Save changes
          </Button>
        </form>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-amber-200 dark:border-amber-900/40 shadow-sm">
        <div className="px-6 py-4 border-b border-amber-100 dark:border-amber-900/30">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">Set status (admin override)</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Bypasses normal workflow rules. Use for corrections only.
          </p>
        </div>
        <form onSubmit={handleForceStatus} className="p-6 space-y-4 flex flex-col sm:flex-row sm:items-end gap-4">
          <label className="block text-sm flex-1">
            <span className="text-gray-600 dark:text-gray-400">Status</span>
            <select
              className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
              value={forcedStatus}
              onChange={(e) => setForcedStatus(e.target.value)}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm flex-[2]">
            <span className="text-gray-600 dark:text-gray-400">Reason (optional)</span>
            <input
              className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
              value={forceReason}
              onChange={(e) => setForceReason(e.target.value)}
              placeholder="e.g. Data correction after RM call"
            />
          </label>
          <Button type="submit" variant="warning" disabled={isLoading || forcedStatus === request.status}>
            Apply status
          </Button>
        </form>
      </div>
    </div>
  );
}
