import { History, User } from 'lucide-react';
import type { HistoryEvent } from '../types';

function formatStatusLabel(raw: string) {
  return raw
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return iso;
  }
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function actionLabel(action: string) {
  const a = (action || '').toLowerCase().replace(/_/g, ' ');
  return a ? a.replace(/\b\w/g, (c) => c.toUpperCase()) : 'Event';
}

interface Props {
  events: HistoryEvent[];
}

export default function RequestHistoryPanel({ events }: Props) {
  if (events.length === 0) {
    return (
      <div className="rounded-xl border border-border dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm overflow-hidden transition-all duration-200">
        <div className="px-6 py-4 border-b border-border dark:border-gray-800 flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#00A99D]/10 dark:bg-[#00A99D]/15 flex items-center justify-center text-[#00A99D] dark:text-[#2dd4bf]">
            <History size={16} />
          </div>
          <h3 className="text-xl font-semibold text-gray-800 dark:text-white">Activity log</h3>
        </div>
        <p className="p-6 text-sm text-gray-500 dark:text-gray-400">No history yet. Status changes and notes will appear here.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm overflow-hidden transition-all duration-200">
      <div className="px-6 py-4 border-b border-border dark:border-gray-800 flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-[#00A99D]/10 dark:bg-[#00A99D]/15 flex items-center justify-center text-[#00A99D] dark:text-[#2dd4bf]">
          <History size={16} />
        </div>
        <h3 className="text-xl font-semibold text-gray-800 dark:text-white">Activity log</h3>
      </div>
      <ul className="divide-y divide-gray-100 dark:divide-gray-800 max-h-[min(24rem,50vh)] overflow-y-auto">
        {events.map((e) => (
          <li key={e.id} className="px-6 py-3.5 text-sm transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-800/50">
            <div className="flex items-start justify-between gap-2 mb-1">
              <span className="font-medium text-gray-900 dark:text-white">{actionLabel(e.action)}</span>
              <time className="shrink-0 text-xs text-gray-500 dark:text-gray-500">{formatTime(e.created_at)}</time>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mb-1">
              <User className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span>{e.actor_name || 'System'}</span>
            </div>
            {e.from_status != null && e.to_status != null && (
              <p className="text-xs text-gray-600 dark:text-gray-300 mb-1">
                {formatStatusLabel(e.from_status)} → {formatStatusLabel(e.to_status)}
              </p>
            )}
            {e.details && (
              <p className="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap break-words leading-relaxed">
                {e.details}
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
