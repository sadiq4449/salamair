import { useEffect, useState } from 'react';
import { Bot, Loader2 } from 'lucide-react';
import type { Priority, RequestStatus } from '../types';
import {
  demoConfidencePercent,
  demoRecommendationLabel,
  demoSuggestedPriceOmR,
} from '../utils/demoAiHelpers';
import { fetchPricingAssistant, type PricingAssistantResult } from '../services/aiService';

interface Props {
  price: number;
  priority: Priority;
  status: RequestStatus;
  route?: string | null;
  pax?: number | null;
  requestCode?: string | null;
}

function toneFromRecommendation(text: string): 'success' | 'warning' | 'neutral' {
  const t = text.toLowerCase();
  if (/\b(accept|approved|approve)\b/.test(t)) return 'success';
  if (/\b(negotiat|counter|reject|review|wait|hold|caution|rm)\b/.test(t)) return 'warning';
  return 'neutral';
}

export default function AiPricingAssistant({
  price,
  priority,
  status,
  route,
  pax,
  requestCode,
}: Props) {
  const [insight, setInsight] = useState<PricingAssistantResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ac = new AbortController();
    setLoading(true);
    fetchPricingAssistant(
      {
        price,
        priority,
        status,
        ...(route != null && route !== '' ? { route } : {}),
        ...(pax != null && pax >= 0 ? { pax } : {}),
        ...(requestCode != null && requestCode !== '' ? { request_code: requestCode } : {}),
      },
      ac.signal
    )
      .then(setInsight)
      .catch(() => setInsight(null))
      .finally(() => {
        if (!ac.signal.aborted) setLoading(false);
      });
    return () => ac.abort();
  }, [price, priority, status, route, pax, requestCode]);

  const fallbackSuggested = demoSuggestedPriceOmR(price, priority);
  const fallbackConf = demoConfidencePercent(priority);
  const fallbackRec = demoRecommendationLabel(status, price, fallbackSuggested);

  const suggested = insight?.suggested_price_omr ?? fallbackSuggested;
  const conf = insight?.confidence_percent ?? fallbackConf;
  const rec = insight
    ? insight.source === 'groq'
      ? { text: insight.recommendation, variant: toneFromRecommendation(insight.recommendation) }
      : { text: insight.recommendation, variant: fallbackRec.variant }
    : fallbackRec;

  const subtitle = loading
    ? 'Analyzing…'
    : insight?.source === 'groq'
      ? 'Powered by Groq'
      : 'Smart pricing analysis';

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gradient-to-br from-slate-50 to-white dark:from-gray-900 dark:to-gray-950 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center text-teal-700 dark:text-teal-300">
          <Bot size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">AI Assistant</p>
          <p className="text-[0.7rem] text-gray-500 dark:text-gray-400 truncate">{subtitle}</p>
        </div>
        {loading && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-teal-600" aria-hidden />}
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
