import { useEffect, useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import type { RequestDetail } from '../types';
import { buildDemoEmailSummaryPoints } from '../utils/demoAiHelpers';

interface Props {
  request: RequestDetail;
}

/** Demo-style “AI Summary” for Sales ↔ RM context (local heuristics, short delay like the HTML demo). */
export default function EmailThreadSummaryCard({ request }: Props) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(false);
    const t = window.setTimeout(() => setReady(true), 600);
    return () => window.clearTimeout(t);
  }, [
    request.id,
    request.status,
    request.priority,
    request.notes,
    request.tags,
  ]);

  const tagNames = (request.tags ?? []).map((t) => t.name);
  const points = buildDemoEmailSummaryPoints({
    request_code: request.request_code,
    route: request.route,
    pax: request.pax,
    price: Number(request.price),
    priority: request.priority,
    status: request.status,
    tagNames,
    notes: request.notes,
  });

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center text-violet-700 dark:text-violet-300">
          <Sparkles size={18} />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">AI Summary</p>
          <p className="text-[0.7rem] text-gray-500 dark:text-gray-400">Email thread summary</p>
        </div>
      </div>
      <div className="p-4 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
        {!ready ? (
          <div className="flex items-center gap-2 text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin text-violet-500" />
            <span>Analyzing request context…</span>
          </div>
        ) : (
          <div className="rounded-lg border-l-4 border-violet-500 bg-violet-50/60 dark:bg-violet-950/30 pl-3 py-2 pr-2">
            <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 mb-2">Key points</p>
            <ul className="list-disc pl-4 space-y-1.5 text-[0.85rem]">
              {points.map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
