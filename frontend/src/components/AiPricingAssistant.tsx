import { Bot } from 'lucide-react';
import type { Priority, RequestStatus } from '../types';
import { demoConfidencePercent, demoRecommendationLabel, demoSuggestedPriceOmR } from '../utils/demoAiHelpers';

interface Props {
  price: number;
  priority: Priority;
  status: RequestStatus;
}

/** Demo-style “AI Assistant” card (heuristic pricing — matches UI.demo_design). */
export default function AiPricingAssistant({ price, priority, status }: Props) {
  const suggested = demoSuggestedPriceOmR(price, priority);
  const conf = demoConfidencePercent(priority);
  const rec = demoRecommendationLabel(status, price, suggested);

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gradient-to-br from-slate-50 to-white dark:from-gray-900 dark:to-gray-950 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center text-teal-700 dark:text-teal-300">
          <Bot size={20} />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">AI Assistant</p>
          <p className="text-[0.7rem] text-gray-500 dark:text-gray-400">Smart pricing analysis</p>
        </div>
      </div>
      <div className="p-4 space-y-3">
        <div>
          <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-gray-400">Suggested price</p>
          <p className="text-2xl font-bold text-teal-600 dark:text-teal-400">{suggested} OMR</p>
        </div>
        <div>
          <div className="flex justify-between text-[0.7rem] text-gray-500 mb-1">
            <span>Confidence</span>
            <span className="font-semibold text-gray-700 dark:text-gray-300">{conf}%</span>
          </div>
          <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-teal-500 to-blue-500 transition-all"
              style={{ width: `${conf}%` }}
            />
          </div>
        </div>
        <div
          className={`rounded-lg px-3 py-2 text-sm flex items-center gap-2 ${
            rec.variant === 'success'
              ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-900/25 dark:text-emerald-200'
              : rec.variant === 'warning'
              ? 'bg-amber-50 text-amber-900 dark:bg-amber-900/25 dark:text-amber-100'
              : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200'
          }`}
        >
          <span className="font-medium">{rec.text}</span>
        </div>
      </div>
    </div>
  );
}
