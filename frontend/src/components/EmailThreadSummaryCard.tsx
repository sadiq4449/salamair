import { useEffect, useState } from 'react';
import { Sparkles, Loader2, Inbox } from 'lucide-react';
import type { RequestDetail } from '../types';
import { buildDemoEmailSummaryPoints } from '../utils/demoAiHelpers';
import { messageService } from '../services/messageService';
import { emailService } from '../services/emailService';
import { fetchEmailThreadSummary } from '../services/aiService';

interface Props {
  request: RequestDetail;
}

function safeRequestPrice(p: string | number | null | undefined): number {
  const n = Number(p ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export default function EmailThreadSummaryCard({ request }: Props) {
  const requestId = request.id;
  const [loading, setLoading] = useState(true);
  const [chatTotal, setChatTotal] = useState(0);
  const [emailCount, setEmailCount] = useState(0);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [points, setPoints] = useState<string[]>([]);
  const [source, setSource] = useState<'groq' | 'fallback' | 'local' | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setChatTotal(0);
    setEmailCount(0);
    Promise.all([messageService.getMessages(requestId, 'all', 1, 50), emailService.getThread(requestId)])
      .then(([msgRes, thread]) => {
        if (cancelled) return;
        setChatTotal(msgRes.total);
        setEmailCount(thread.emails?.length ?? 0);
      })
      .catch(() => {
        if (!cancelled) {
          setChatTotal(0);
          setEmailCount(0);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [requestId]);

  const totalMsgs = chatTotal + emailCount;

  useEffect(() => {
    if (loading || totalMsgs === 0) {
      setPoints([]);
      setSource(null);
      return;
    }
    const ac = new AbortController();
    setSummaryLoading(true);
    setPoints([]);
    setSource(null);
    const tagNames = (request.tags ?? []).map((t) => t.name);
    fetchEmailThreadSummary(
      {
        request_code: request.request_code,
        route: request.route,
        pax: request.pax,
        price: safeRequestPrice(request.price),
        priority: request.priority,
        status: request.status,
        tag_names: tagNames,
        notes: request.notes ?? null,
        chat_message_count: chatTotal,
        email_message_count: emailCount,
      },
      ac.signal
    )
      .then((res) => {
        if (ac.signal.aborted) return;
        setPoints(res.points);
        setSource(res.source);
      })
      .catch(() => {
        if (ac.signal.aborted) return;
        setPoints(
          buildDemoEmailSummaryPoints({
            request_code: request.request_code,
            route: request.route,
            pax: request.pax,
            price: safeRequestPrice(request.price),
            priority: request.priority,
            status: request.status,
            tagNames,
            notes: request.notes,
          })
        );
        setSource('local');
      })
      .finally(() => {
        if (!ac.signal.aborted) setSummaryLoading(false);
      });
    return () => ac.abort();
  }, [
    loading,
    totalMsgs,
    chatTotal,
    emailCount,
    requestId,
    request.status,
    request.priority,
    request.notes,
    request.request_code,
    request.route,
    request.pax,
    request.price,
    request.tags,
  ]);

  const subtitle =
    source === 'groq'
      ? 'Powered by Groq'
      : source === 'fallback'
        ? 'Heuristic summary (configure Groq for LLM insights)'
        : source === 'local'
          ? 'Offline heuristics (API unavailable)'
          : 'Thread summary';

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center text-violet-700 dark:text-violet-300">
          <Sparkles size={18} />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">AI Summary</p>
          <p className="text-[0.7rem] text-gray-500 dark:text-gray-400">{subtitle}</p>
        </div>
      </div>
      <div className="p-4 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
        {loading ? (
          <div className="flex items-center gap-2 text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin text-violet-500" />
            <span>Loading conversation context…</span>
          </div>
        ) : totalMsgs === 0 ? (
          <div className="text-center py-6 text-gray-400 dark:text-gray-500">
            <Inbox className="mx-auto h-10 w-10 mb-2 opacity-60" />
            <p className="text-sm">No messages to summarize</p>
            <p className="text-xs mt-1">Start the Agent ↔ Sales chat or RM email thread to see insights.</p>
          </div>
        ) : summaryLoading ? (
          <div className="flex items-center gap-2 text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin text-violet-500" />
            <span>
              Analyzing {totalMsgs} message{totalMsgs === 1 ? '' : 's'}…
            </span>
          </div>
        ) : points.length > 0 ? (
          <div className="rounded-lg border-l-4 border-violet-500 bg-violet-50/60 dark:bg-violet-950/30 pl-3 py-2 pr-2">
            <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 mb-2">
              Key points ({totalMsgs} message{totalMsgs === 1 ? '' : 's'} analyzed)
            </p>
            <ul className="list-disc pl-4 space-y-1.5 text-[0.85rem]">
              {points.map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}
