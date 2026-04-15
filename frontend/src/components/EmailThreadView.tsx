import { useEffect, useState } from 'react';
import { Send, Paperclip, Mail, Reply, Loader2, Download, ArrowUpRight, ArrowDownLeft, RefreshCw, Bell } from 'lucide-react';
import { useEmailStore } from '../store/emailStore';
import { useToastStore } from '../store/toastStore';
import type { EmailMessageItem, RequestStatus } from '../types';

interface Props {
  requestId: string;
  canReply?: boolean;
  canSimulate?: boolean;
  /** When set, shows “Nudge RM” for rm_pending (demo parity). */
  requestStatus?: RequestStatus;
}

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function EmailBubble({ email }: { email: EmailMessageItem }) {
  const isOutgoing = email.direction === 'outgoing';
  const deliveryFailed = isOutgoing && email.status === 'failed';
  const deliveryOk = isOutgoing && email.status === 'sent';

  return (
    <div className="flex gap-3">
      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0 ${
        isOutgoing ? 'bg-teal-500' : 'bg-amber-500'
      }`}>
        {isOutgoing ? <ArrowUpRight size={16} /> : <ArrowDownLeft size={16} />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="text-sm font-semibold text-gray-900 dark:text-white">
            {isOutgoing ? 'Sales Team' : 'Revenue Management'}
          </span>
          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[0.6rem] font-semibold uppercase ${
            email.status === 'received' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
              : email.status === 'sent' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
              : email.status === 'failed' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
              : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
          }`}>
            {email.status === 'sent' && isOutgoing ? 'smtp sent' : email.status}
          </span>
          <span className="text-xs text-gray-400 ml-auto shrink-0">{formatTime(email.sent_at)}</span>
        </div>
        {deliveryFailed && (
          <div className="mb-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200">
            <strong className="font-semibold">Not delivered.</strong> The portal saved this draft, but the mail server did not accept the message.
            On Railway, set <code className="rounded bg-red-100 px-0.5 dark:bg-red-900/50">EMAIL_ENABLED=true</code> and valid Gmail{' '}
            <code className="rounded bg-red-100 px-0.5 dark:bg-red-900/50">SMTP_*</code> variables, then send again.
          </div>
        )}
        {deliveryOk && (
          <p className="mb-2 text-[0.7rem] text-gray-500 dark:text-gray-400">
            Handed to your SMTP server for <span className="font-medium">{email.to_email}</span>. If RM sees nothing, check spam and that the address exists.
          </p>
        )}
        <div className={`rounded-xl px-4 py-3 text-sm leading-relaxed ${
          isOutgoing
            ? deliveryFailed
              ? 'bg-red-50/80 dark:bg-red-950/20 border-l-3 border-red-400 text-gray-700 dark:text-gray-300'
              : 'bg-teal-50 dark:bg-teal-900/20 border-l-3 border-teal-400 text-gray-700 dark:text-gray-300'
            : 'bg-amber-50 dark:bg-amber-900/20 border-l-3 border-amber-400 text-gray-700 dark:text-gray-300'
        }`}>
          <p className="text-xs text-gray-400 mb-1.5">
            {email.from_email} → {email.to_email}
          </p>
          <p className="whitespace-pre-wrap">{email.body}</p>
        </div>
        {email.attachments.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {email.attachments.map((att) => (
              <a
                key={att.id}
                href={att.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                <Paperclip size={12} />
                <span className="truncate max-w-[140px]">{att.filename}</span>
                <Download size={12} className="shrink-0" />
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function EmailThreadView({
  requestId,
  canReply = false,
  canSimulate = false,
  requestStatus,
}: Props) {
  const { thread, isLoading, isSending, fetchThread, reply, simulateReply, pollInbox } = useEmailStore();
  const { addToast } = useToastStore();
  const [replyText, setReplyText] = useState('');

  useEffect(() => {
    fetchThread(requestId);
  }, [requestId, fetchThread]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
      </div>
    );
  }

  const emails = thread?.emails ?? [];
  const hasThread = thread && thread.status !== 'empty' && emails.length > 0;
  const hasOutgoingFailed = emails.some((e) => e.direction === 'outgoing' && e.status === 'failed');

  async function handleReply() {
    if (!replyText.trim() || !thread || thread.status === 'empty') return;
    try {
      await reply({ request_id: requestId, thread_id: thread.thread_id, message: replyText.trim() });
      setReplyText('');
    } catch { /* handled in store */ }
  }

  async function handleSimulate() {
    await simulateReply(requestId);
  }

  async function handlePollInbox() {
    const r = await pollInbox(requestId);
    if (r === null) return;
    if (r.skipped) {
      addToast('info', 'IMAP sync is disabled on the server. Set IMAP_ENABLED and credentials.');
    } else if (r.stored > 0) {
      addToast('success', `Imported ${r.stored} new email(s) from inbox.`);
    } else {
      addToast('info', 'No new emails in inbox (or none matched a request REQ code).');
    }
  }

  return (
    <div>
      <p className="mb-3 text-[0.7rem] text-gray-500 dark:text-gray-400 leading-relaxed">
        This panel shows what the <strong className="text-gray-700 dark:text-gray-300">portal stored</strong>. Real delivery to RM only happens when SMTP succeeds (badge <strong>smtp sent</strong>).
        The address <strong className="text-gray-700 dark:text-gray-300">{thread?.rm_email ?? 'rm@…'}</strong> must be a real inbox you can open.
      </p>
      {hasOutgoingFailed && (
        <div className="mb-4 flex gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5 text-xs text-amber-950 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-100">
          <Mail className="shrink-0 mt-0.5" size={14} />
          <span>
            At least one outgoing message was <strong>not</strong> accepted by the mail server (status failed). Configure production SMTP on the host (e.g. Railway variables) or resend after fixing credentials.
          </span>
        </div>
      )}
      {/* Email Header */}
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100 dark:border-gray-800">
        <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
          <Mail size={16} className="text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">RM Email Thread</p>
          <p className="text-xs text-gray-400">{thread?.rm_email ?? 'rm@salamair.com'}</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {hasThread && (
            <span className="text-xs text-gray-400">{emails.length} email{emails.length > 1 ? 's' : ''}</span>
          )}
          {canReply && (
            <button
              type="button"
              onClick={handlePollInbox}
              disabled={isSending}
              title="Fetch new replies from the mailbox (IMAP)"
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/20 hover:bg-teal-100 dark:hover:bg-teal-900/40 disabled:opacity-50"
            >
              {isSending ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
              Sync inbox
            </button>
          )}
        </div>
      </div>

      {!hasThread ? (
        <div className="text-center py-8">
          <div className="w-14 h-14 mx-auto mb-3 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
            <Mail size={24} className="text-gray-400" />
          </div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">No emails yet</p>
          <p className="text-xs text-gray-400 mt-1">Send a request to RM to start the email thread</p>
        </div>
      ) : (
        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
          {emails.map((email) => (
            <EmailBubble key={email.id} email={email} />
          ))}
        </div>
      )}

      {/* Reply / Simulate */}
      {canReply && hasThread && (
        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Type a reply to RM..."
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleReply()}
              className="flex-1 px-4 py-2.5 border rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10"
            />
            <button
              onClick={handleReply}
              disabled={isSending || !replyText.trim()}
              className="p-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            </button>
          </div>
          <div className="mt-2 flex flex-col gap-2">
            {canSimulate && (
              <button
                type="button"
                onClick={handleSimulate}
                disabled={isSending}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors disabled:opacity-50"
              >
                <Reply size={14} />
                Simulate RM Reply
              </button>
            )}
            {canReply && canSimulate && requestStatus === 'rm_pending' && hasThread && (
              <button
                type="button"
                onClick={handleNudgeRm}
                disabled={isSending}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium bg-violet-50 text-violet-800 dark:bg-violet-900/25 dark:text-violet-200 hover:bg-violet-100 dark:hover:bg-violet-900/40 transition-colors disabled:opacity-50"
              >
                <Bell size={14} />
                Nudge RM
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
