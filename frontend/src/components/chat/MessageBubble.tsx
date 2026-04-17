import { useState, useEffect } from 'react';
import { Paperclip, Download, Pencil, Trash2 } from 'lucide-react';
import type { ChatMessage } from '../../types';

const ROLE_STYLES: Record<string, { bg: string; border: string; badge: string; label: string }> = {
  agent: {
    bg: 'bg-blue-50 dark:bg-blue-950/30',
    border: 'border-l-blue-500',
    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
    label: 'Agent',
  },
  sales: {
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    border: 'border-l-emerald-500',
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300',
    label: 'Sales',
  },
  rm: {
    bg: 'bg-orange-50 dark:bg-orange-950/30',
    border: 'border-l-orange-500',
    badge: 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300',
    label: 'RM',
  },
  system: {
    bg: 'bg-gray-50 dark:bg-gray-800/50',
    border: 'border-l-gray-400',
    badge: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
    label: 'System',
  },
  admin: {
    bg: 'bg-purple-50 dark:bg-purple-950/30',
    border: 'border-l-purple-500',
    badge: 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300',
    label: 'Admin',
  },
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function formatFullTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString();
}

interface Props {
  message: ChatMessage;
  isOwnMessage?: boolean;
  canModerate?: boolean;
  onAdminPatch?: (messageId: string, content: string) => void | Promise<void>;
  onAdminDelete?: (messageId: string) => void | Promise<void>;
}

export default function MessageBubble({
  message,
  isOwnMessage,
  canModerate,
  onAdminPatch,
  onAdminDelete,
}: Props) {
  const { type, sender, content, attachments, timestamp, id } = message;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(content);

  useEffect(() => {
    setDraft(content);
  }, [content]);

  if (type === 'system') {
    return (
      <div className="flex justify-center my-3">
        <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800 text-xs text-gray-500 dark:text-gray-400">
          <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
          {content}
          <span className="ml-1 opacity-60" title={formatFullTime(timestamp)}>
            {formatRelativeTime(timestamp)}
          </span>
        </div>
      </div>
    );
  }

  const role = sender?.role || 'system';
  const style = ROLE_STYLES[role] || ROLE_STYLES.system;
  const senderName = sender?.name || 'Unknown';

  const avatarColors: Record<string, string> = {
    agent: 'bg-blue-500',
    sales: 'bg-emerald-500',
    rm: 'bg-orange-500',
    admin: 'bg-purple-500',
    system: 'bg-gray-500',
  };

  return (
    <div className={`flex gap-3 ${isOwnMessage ? 'flex-row-reverse' : ''}`}>
      <div
        className={`w-8 h-8 rounded-full ${avatarColors[role] || 'bg-gray-500'} flex items-center justify-center text-white text-xs font-bold shrink-0`}
      >
        {getInitials(senderName)}
      </div>
      <div className={`flex-1 max-w-[80%] ${isOwnMessage ? 'items-end' : ''}`}>
        <div className="flex items-center gap-2 mb-1">
          {!isOwnMessage && (
            <span className="text-sm font-semibold text-gray-900 dark:text-white">{senderName}</span>
          )}
          {isOwnMessage && (
            <span className="text-sm font-semibold text-gray-900 dark:text-white ml-auto">You</span>
          )}
          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${style.badge}`}>
            {style.label}
          </span>
          {type === 'email' && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
              Email
            </span>
          )}
          <span
            className="text-[11px] text-gray-400 dark:text-gray-500 ml-auto"
            title={formatFullTime(timestamp)}
          >
            {formatRelativeTime(timestamp)}
          </span>
        </div>
        <div
          className={`${style.bg} border-l-3 ${style.border} rounded-lg px-4 py-3 text-sm text-gray-700 dark:text-gray-300 leading-relaxed`}
        >
          {editing ? (
            <div className="space-y-2">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={4}
                className="w-full text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 p-2"
              />
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  className="text-xs px-2 py-1 rounded bg-gray-200 dark:bg-gray-700"
                  onClick={() => {
                    setDraft(content);
                    setEditing(false);
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="text-xs px-2 py-1 rounded bg-teal-600 text-white"
                  onClick={async () => {
                    if (onAdminPatch && draft.trim()) {
                      await onAdminPatch(id, draft.trim());
                      setEditing(false);
                    }
                  }}
                >
                  Save
                </button>
              </div>
            </div>
          ) : (
            content
          )}
        </div>
        {canModerate && type === 'chat' && onAdminPatch && onAdminDelete && !editing && (
          <div className="flex gap-2 mt-1 justify-end">
            <button
              type="button"
              className="text-[11px] inline-flex items-center gap-1 text-purple-600 hover:underline"
              onClick={() => {
                setDraft(content);
                setEditing(true);
              }}
            >
              <Pencil size={12} />
              Edit
            </button>
            <button
              type="button"
              className="text-[11px] inline-flex items-center gap-1 text-red-600 hover:underline"
              onClick={() => {
                if (typeof window !== 'undefined' && window.confirm('Delete this chat message?')) {
                  void onAdminDelete(id);
                }
              }}
            >
              <Trash2 size={12} />
              Delete
            </button>
          </div>
        )}
        {attachments.length > 0 && (
          <div className="mt-2 space-y-1">
            {attachments.map((att) => (
              <a
                key={att.id}
                href={att.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-teal-400 transition-colors group"
              >
                <Paperclip size={14} className="text-gray-400 group-hover:text-teal-500" />
                <span className="text-xs text-gray-600 dark:text-gray-300 truncate flex-1">{att.filename}</span>
                <span className="text-[10px] text-gray-400">{(att.file_size / 1024).toFixed(0)} KB</span>
                <Download size={12} className="text-gray-400 group-hover:text-teal-500" />
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
