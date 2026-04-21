import { useState } from 'react';
import { ArrowRightLeft, Check, X } from 'lucide-react';
import Button from './ui/Button';
import { useRequestStore } from '../store/requestStore';
import { useToastStore } from '../store/toastStore';
import type { CounterOffer } from '../types';

interface Props {
  requestId: string;
  offer: CounterOffer;
}

/**
 * Action card rendered on the agent's request detail page when the most
 * recent counter offer is still pending. Lets the agent accept the
 * proposed price (request becomes `approved`) or reject it (request
 * returns to `submitted` so sales can re-evaluate).
 */
export default function CounterOfferPanel({ requestId, offer }: Props) {
  const { acceptCounterOffer, rejectCounterOffer, isLoading } = useRequestStore();
  const { addToast } = useToastStore();
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [reason, setReason] = useState('');

  function extractApiError(err: unknown, fallback: string): string {
    const e = err as { response?: { data?: { error?: { message?: string } } } };
    return e?.response?.data?.error?.message ?? fallback;
  }

  async function handleAccept() {
    try {
      await acceptCounterOffer(requestId, offer.id);
      addToast('success', 'Counter offer accepted — request approved');
    } catch (err) {
      addToast('error', extractApiError(err, 'Failed to accept counter offer'));
    }
  }

  async function handleReject() {
    try {
      await rejectCounterOffer(requestId, offer.id, reason.trim() || undefined);
      setReason('');
      setShowRejectForm(false);
      addToast('info', 'Counter offer rejected — request returned to sales');
    } catch (err) {
      addToast('error', extractApiError(err, 'Failed to reject counter offer'));
    }
  }

  const delta = offer.counter_price - offer.original_price;
  const deltaLabel = `${delta >= 0 ? '+' : ''}${delta.toFixed(2)} OMR`;
  const deltaClass =
    delta > 0
      ? 'text-red-600 dark:text-red-400'
      : delta < 0
        ? 'text-emerald-600 dark:text-emerald-400'
        : 'text-gray-500 dark:text-gray-400';

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-amber-200 dark:border-amber-900/50 shadow-sm ring-1 ring-amber-100 dark:ring-amber-900/30">
      <div className="flex items-center gap-2 px-6 py-4 border-b border-amber-100 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-900/20 rounded-t-xl">
        <ArrowRightLeft size={16} className="text-amber-600 dark:text-amber-400" />
        <h3 className="text-base font-semibold text-gray-900 dark:text-white">Counter Offer Received</h3>
      </div>
      <div className="p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">Your Price</p>
            <p className="text-sm font-semibold text-gray-600 dark:text-gray-300 line-through">
              {Number(offer.original_price).toFixed(2)} OMR
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">Sales Counter</p>
            <p className="text-lg font-bold text-amber-600 dark:text-amber-400">
              {Number(offer.counter_price).toFixed(2)} OMR
            </p>
            <p className={`text-xs font-medium mt-0.5 ${deltaClass}`}>{deltaLabel}</p>
          </div>
        </div>

        {offer.message && (
          <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 p-3 border border-gray-100 dark:border-gray-700">
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">
              Message{offer.creator_name ? ` from ${offer.creator_name}` : ''}
            </p>
            <p className="text-sm text-gray-700 dark:text-gray-200 whitespace-pre-wrap">{offer.message}</p>
          </div>
        )}

        {!showRejectForm ? (
          <div className="flex items-center gap-2.5 pt-1">
            <Button variant="success" fullWidth onClick={handleAccept} isLoading={isLoading}>
              <Check size={16} />
              Accept
            </Button>
            <Button
              variant="danger"
              fullWidth
              onClick={() => setShowRejectForm(true)}
              disabled={isLoading}
            >
              <X size={16} />
              Reject
            </Button>
          </div>
        ) : (
          <div className="space-y-2.5 pt-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Reason <span className="text-xs text-gray-400">(optional)</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              maxLength={500}
              placeholder="Why is this counter not acceptable?"
              className="w-full px-3.5 py-2.5 border rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 outline-none focus:border-teal-500 focus:ring-3 focus:ring-teal-500/10 resize-none"
            />
            <div className="flex items-center gap-2.5">
              <Button
                type="button"
                variant="outline"
                fullWidth
                onClick={() => {
                  setShowRejectForm(false);
                  setReason('');
                }}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button variant="danger" fullWidth onClick={handleReject} isLoading={isLoading}>
                <X size={16} />
                Confirm Reject
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
