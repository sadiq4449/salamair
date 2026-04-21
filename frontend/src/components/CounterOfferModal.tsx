import { useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import Button from './ui/Button';
import { useRequestStore } from '../store/requestStore';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  requestId: string;
  currentPrice: number;
}

export default function CounterOfferModal({ isOpen, onClose, requestId, currentPrice }: Props) {
  const { createCounterOffer, isLoading } = useRequestStore();
  const [counterPrice, setCounterPrice] = useState('');
  const [message, setMessage] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);

  function extractApiError(err: unknown, fallback: string): string {
    const e = err as { response?: { data?: { error?: { message?: string } } } };
    return e?.response?.data?.error?.message ?? fallback;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    const priceNum = Number(counterPrice);
    if (!Number.isFinite(priceNum) || priceNum <= 0) {
      setSubmitError('Counter price must be greater than zero');
      return;
    }
    if (Math.abs(priceNum - Number(currentPrice)) < 0.01) {
      setSubmitError('Counter price must differ from the current price');
      return;
    }
    try {
      await createCounterOffer(requestId, {
        counter_price: priceNum,
        message: message || undefined,
      });
      setCounterPrice('');
      setMessage('');
      onClose();
    } catch (err) {
      setSubmitError(extractApiError(err, 'Failed to send counter offer'));
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-100 dark:border-gray-800 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Counter Offer</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Current Offer */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Current Offer (OMR)</label>
            <input
              type="text"
              value={Number(currentPrice).toFixed(2)}
              readOnly
              className="w-full px-3.5 py-2.5 border rounded-lg text-sm bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-300 dark:border-gray-600 cursor-not-allowed"
            />
          </div>

          {/* Counter Price */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Counter Price (OMR)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={counterPrice}
              onChange={(e) => setCounterPrice(e.target.value)}
              required
              placeholder="0.00"
              className="w-full px-3.5 py-2.5 border rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 outline-none focus:border-teal-500 focus:ring-3 focus:ring-teal-500/10"
            />
          </div>

          {/* Message */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              placeholder="Reason for counter offer..."
              className="w-full px-3.5 py-2.5 border rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 outline-none focus:border-teal-500 focus:ring-3 focus:ring-teal-500/10 resize-none"
            />
          </div>

          {submitError && (
            <div
              role="alert"
              className="px-3 py-2 rounded-lg text-sm bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900/50"
            >
              {submitError}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="warning" isLoading={isLoading}>
              Send Counter Offer
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
