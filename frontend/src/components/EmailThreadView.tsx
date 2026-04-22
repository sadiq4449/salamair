import { useEffect, useState } from 'react';
import { Send, Paperclip, Mail, Reply, Loader2, Download, ArrowUpRight, ArrowDownLeft, RefreshCw, Bell } from 'lucide-react';
import { useEmailStore } from '../store/emailStore';
import { useToastStore } from '../store/toastStore';
import { useAuth } from '../hooks/useAuth';
import { integrationService } from '../services/integrationService';
import type { EmailMessageItem, RequestStatus, EmailThreadChannel } from '../types';

const EMPTY_THREAD_ID = '00000000-0000-0000-0000-000000000000';

interface Props {
  requestId: string;
  /** rm = Revenue Management; agent_sales = formal SMTP with the agent. */
  channel?: EmailThreadChannel;
  canReply?: boolean;
  canSimulate?: boolean;
  requestStatus?: RequestStatus;
  autoSyncInbox?: boolean;
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

function formatFullDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function EmailBubble({ email, channel }: { email: EmailMessageItem; channel: EmailThreadChannel }) {
  const isOutgoing = email.direction === 'outgoing';
  const deliveryFailed = isOutgoing && email.status === 'failed';
  const deliveryOk = isOutgoing && email.status === 'sent';
  const showHtml = isOutgoing && Boolean(email.html_body?.trim());
  const outgoingLabel = channel === 'rm' ? 'Sales (portal)' : 'Outbound (email)';
  const incomingLabel = channel === 'rm' ? 'RM / inbox' : 'Inbound (email)';

  return (
    <div className="flex gap-3">
      <div
        className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0 ${
          isOutgoing ? 'bg-teal-500' : 'bg-amber-500'
        }`}
      >
        {isOutgoing ? <ArrowUpRight size={16} /> : <ArrowDownLeft size={16} />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className="text-sm font-semibold text-gray-900 dark:text-white">
            {isOutgoing ? outgoingLabel : incomingLabel}
          </span>
          <span
            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[0.6rem] font-semibold uppercase ${
              email.status === 'received'
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                : email.status === 'sent'
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                  : email.status === 'failed'
                    ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
            }`}
          >
            {email.status === 'sent' && isOutgoing ? 'sent' : email.status}
          </span>
        </div>
        {deliveryFailed && (
          <div className="mb-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200">
            <strong className="font-semibold">Not delivered.</strong> The portal saved this draft, but the mail server did not accept the message.
            On the server, set valid <code className="rounded bg-red-100 px-0.5 dark:bg-red-900/50">SMTP_USER</code>,{' '}
            <code className="rounded bg-red-100 px-0.5 dark:bg-red-900/50">SMTP_PASSWORD</code>, and{' '}
            <code className="rounded bg-red-100 px-0.5 dark:bg-red-900/50">SMTP_FROM_EMAIL</code> (Gmail: app password). Do not set{' '}
            <code className="rounded bg-red-100 px-0.5 dark:bg-red-900/50">EMAIL_ENABLED=false</code> unless you intend to disable sending.
          </div>
        )}
        {deliveryOk && (
          <p className="mb-2 text-[0.7rem] text-gray-500 dark:text-gray-400">
            Delivered to <span className="font-medium">{email.to_email}</span>.
            {channel === 'rm' ? ' If RM sees nothing, check spam.' : ' If the agent sees nothing, check spam.'}
          </p>
        )}

        <article
          className={`rounded-xl border overflow-hidden shadow-sm ${
            isOutgoing
              ? deliveryFailed
                ? 'border-red-200 dark:border-red-900/50 bg-white dark:bg-gray-900'
                : 'border-teal-200/80 dark:border-teal-900/40 bg-white dark:bg-gray-900'
              : 'border-amber-200/80 dark:border-amber-900/40 bg-white dark:bg-gray-900'
          }`}
        >
          <header className="px-4 py-2.5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/90 dark:bg-gray-950/60">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white leading-snug pr-2">{email.subject}</h3>
            <dl className="mt-2 grid gap-1 text-[0.7rem] text-gray-500 dark:text-gray-400">
              <div className="flex flex-wrap gap-x-4 gap-y-0.5">
                <div>
                  <span className="text-gray-400">From </span>
                  <span className="font-medium text-gray-700 dark:text-gray-300 break-all">{email.from_email}</span>
                </div>
                <div>
                  <span className="text-gray-400">To </span>
                  <span className="font-medium text-gray-700 dark:text-gray-300 break-all">{email.to_email}</span>
                </div>
              </div>
              <div className="text-gray-400 dark:text-gray-500" title={formatFullDate(email.sent_at)}>
                {formatFullDate(email.sent_at)} <span className="text-gray-400">· {formatTime(email.sent_at)}</span>
              </div>
            </dl>
          </header>
          <div className="px-4 py-3 text-sm">
            {showHtml ? (
              <div
                className="email-thread-html max-w-full overflow-x-auto text-[13px] leading-relaxed text-gray-800 dark:text-gray-200 [&_*]:max-w-full [&_img]:max-h-40 [&_table]:text-xs [&_a]:text-teal-600"
                dangerouslySetInnerHTML={{ __html: email.html_body as string }}
              />
            ) : (
              <div className="whitespace-pre-wrap leading-relaxed text-gray-800 dark:text-gray-200">{email.body}</div>
            )}
          </div>
        </article>

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
  channel = 'rm',
  canReply = false,
  canSimulate = false,
  requestStatus,
  autoSyncInbox = true,
}: Props) {
  const { thread, isLoading, isSending, fetchThread, reply, sendToAgent, simulateReply, pollInbox } = useEmailStore();
  const { addToast } = useToastStore();
  const { isSales, isAdmin, isAgent } = useAuth();
  const isAgentViewer = isAgent;
  const canPollInbox = isSales || isAdmin;
  const [replyText, setReplyText] = useState('');
  const [firstToAgentText, setFirstToAgentText] = useState('');
  const [gmailStatus, setGmailStatus] = useState<{
    connected: boolean;
    configured: boolean;
    clientConfigured: boolean;
    sharedMailbox: boolean;
    agentThreadUsesGmail: boolean;
  } | null>(null);
  const [gmailActionLoading, setGmailActionLoading] = useState(false);

  useEffect(() => {
    if (channel !== 'agent_sales' || !canReply) {
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const s = await integrationService.getGmailStatus();
        if (!cancelled) {
          setGmailStatus({
            connected: s.gmail_connected,
            configured: s.gmail_configured,
            clientConfigured: s.gmail_client_configured ?? false,
            sharedMailbox: s.shared_gmail_for_agent_thread ?? false,
            agentThreadUsesGmail: s.agent_thread_uses_gmail ?? false,
          });
        }
      } catch {
        if (!cancelled) {
          setGmailStatus({
            connected: false,
            configured: false,
            clientConfigured: false,
            sharedMailbox: false,
            agentThreadUsesGmail: false,
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [channel, canReply, requestId]);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get('gmail_connected') !== '1') return;
    addToast('success', 'Gmail connected. This thread can send from your Google account (when the server is configured).');
    p.delete('gmail_connected');
    const u = new URL(window.location.href);
    const qs = p.toString();
    u.search = qs ? `?${qs}` : '';
    window.history.replaceState({}, '', u.toString());
    setGmailStatus((prev) =>
      prev
        ? { ...prev, connected: true, agentThreadUsesGmail: true }
        : {
            connected: true,
            configured: true,
            clientConfigured: true,
            sharedMailbox: false,
            agentThreadUsesGmail: true,
          }
    );
  }, [addToast]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await fetchThread(requestId, channel);
      if (cancelled || !autoSyncInbox || !canPollInbox) return;
      const r = await pollInbox(requestId, { silent: true, channel });
      if (cancelled || !r) return;
      if (r.stored > 0) {
        addToast('success', `Imported ${r.stored} email(s) from inbox.`);
        await fetchThread(requestId, channel);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [requestId, channel, autoSyncInbox, canPollInbox, fetchThread, pollInbox, addToast]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
      </div>
    );
  }

  const emails = thread?.emails ?? [];
  const hasMessages = emails.length > 0;
  const isStubThread =
    !thread || thread.status === 'empty' || !thread.thread_id || thread.thread_id === EMPTY_THREAD_ID;
  const hasThreadRecord = !isStubThread;
  const hasOutgoingFailed = emails.some((e) => e.direction === 'outgoing' && e.status === 'failed');

  async function handleReply() {
    if (!replyText.trim() || !thread || isStubThread) return;
    try {
      await reply({ request_id: requestId, thread_id: thread.thread_id, message: replyText.trim() });
      setReplyText('');
    } catch {
      /* store */
    }
  }

  async function handleFirstToAgent() {
    if (!firstToAgentText.trim() || channel !== 'agent_sales') return;
    try {
      await sendToAgent({ request_id: requestId, message: firstToAgentText.trim() });
      setFirstToAgentText('');
      addToast('success', 'Email sent to the agent’s mailbox.');
    } catch {
      /* store */
    }
  }

  async function handleConnectGmail() {
    setGmailActionLoading(true);
    try {
      const url = await integrationService.getGmailAuthorizeUrl();
      window.location.href = url;
    } catch {
      addToast('error', 'Could not start Gmail connection. Is Google OAuth configured on the server?');
    } finally {
      setGmailActionLoading(false);
    }
  }

  async function handleDisconnectGmail() {
    setGmailActionLoading(true);
    try {
      await integrationService.disconnectGmail();
      setGmailStatus((s) => (s ? { ...s, connected: false } : s));
      addToast(
        'success',
        'Personal Gmail disconnected. This tab can still use the app Gmail (if configured on the server) or SMTP/Resend.'
      );
    } catch {
      addToast('error', 'Could not disconnect Gmail.');
    } finally {
      setGmailActionLoading(false);
    }
  }

  async function handleSimulate() {
    await simulateReply(requestId);
  }

  async function handleNudgeRm() {
    if (!thread || isStubThread) return;
    const text = 'Reminder: Pending fare approval for this request. Please respond at your earliest convenience.';
    try {
      await reply({ request_id: requestId, thread_id: thread.thread_id, message: text });
      addToast('success', 'Reminder sent on the RM email thread.');
    } catch {
      /* store */
    }
  }

  async function handlePollInbox() {
    const r = await pollInbox(requestId, { channel: channel === 'agent_sales' ? 'agent_sales' : 'rm' });
    if (r === null) return;
    if (r.skipped) {
      addToast('info', 'IMAP sync is disabled on the server. Set IMAP_USER and IMAP_PASSWORD (or remove IMAP_ENABLED=false).');
    } else if (r.stored > 0) {
      addToast('success', `Imported ${r.stored} new email(s) from inbox.`);
    } else {
      const scanned = typeof r.processed === 'number' && r.processed > 0 ? ` Scanned ${r.processed} message(s).` : '';
      const errHint = r.errors?.length && r.errors[0] ? ` ${r.errors[0]}` : '';
      addToast('info', `No new replies imported for this deal.${scanned} Replies need [REQ-…] in the subject.${errHint}`);
    }
  }

  const showRmIntro = channel === 'rm' && isAgentViewer;
  const showAgentSalesIntro = channel === 'agent_sales' && isAgentViewer;
  const showSalesIntroRm = channel === 'rm' && !isAgentViewer;
  const showSalesIntroAgent = channel === 'agent_sales' && !isAgentViewer;
  const threadTitle = channel === 'rm' ? 'RM email thread' : 'Sales ↔ Agent (email)';
  const subEmail = thread?.rm_email ?? (channel === 'rm' ? 'rm@…' : '…');

  return (
    <div>
      {showAgentSalesIntro && (
        <p className="mb-3 text-[0.7rem] text-gray-500 dark:text-gray-400 leading-relaxed">
          <strong className="text-gray-700 dark:text-gray-300">Formal email</strong> between you and <strong>sales</strong> (in addition
          to <strong>Portal chat</strong>). Replies from your email client appear here when the mailbox is synced. Your profile email must
          match the address you send from.
        </p>
      )}
      {showRmIntro && (
        <p className="mb-3 text-[0.7rem] text-gray-500 dark:text-gray-400 leading-relaxed">
          <strong className="text-gray-700 dark:text-gray-300">Read-only.</strong> This is the email between <strong>Sales</strong> and{' '}
          <strong>Revenue Management (RM)</strong> for this request. Message sales in <strong>Portal chat</strong> or the{' '}
          <strong>Sales ↔ Agent (email)</strong> tab.
        </p>
      )}
      {showSalesIntroAgent && (
        <p className="mb-3 text-[0.7rem] text-gray-500 dark:text-gray-400 leading-relaxed">
          Outbound email to the <strong>agent’s email on file</strong> (in addition to portal chat). You can use your <strong>own Gmail</strong> via
          Connect below, or the server’s SMTP. IMAP <strong>Sync inbox</strong> imports replies; subjects should include the request code.
        </p>
      )}
      {channel === 'agent_sales' && canReply && (isSales || isAdmin || isAgent) && gmailStatus && (
        <div className="mb-4 flex flex-col gap-2 rounded-lg border border-slate-200/90 bg-slate-50/90 px-3 py-2.5 text-xs dark:border-slate-600 dark:bg-slate-900/50">
          {!gmailStatus.clientConfigured ? (
            <p className="text-gray-600 dark:text-gray-400">
              Set <code className="text-[0.65rem]">GOOGLE_OAUTH_CLIENT_ID</code> and{' '}
              <code className="text-[0.65rem]">GOOGLE_OAUTH_CLIENT_SECRET</code> on the API so this tab can use Gmail (or add a server refresh
              token for the app mailbox). Until then, outbound may use SMTP/Resend, which can fail on some hosts.
            </p>
          ) : gmailStatus.agentThreadUsesGmail && gmailStatus.sharedMailbox && !gmailStatus.connected ? (
            <div className="space-y-2">
              <p className="text-emerald-800 dark:text-emerald-200/90">
                <strong className="font-semibold">Gmail (API) is on</strong> for this tab: messages send over HTTPS from the app mailbox. RM
                email is unchanged (still SMTP).
              </p>
              {gmailStatus.configured && (
                <p className="text-gray-600 dark:text-gray-400">
                  Optional: <strong className="text-gray-700 dark:text-gray-300">Connect Gmail</strong> to send this thread from your own Google
                  address instead.
                </p>
              )}
              {gmailStatus.configured && (
                <button
                  type="button"
                  onClick={handleConnectGmail}
                  disabled={gmailActionLoading}
                  className="shrink-0 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-[0.7rem] font-medium text-slate-800 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 disabled:opacity-50"
                >
                  {gmailActionLoading ? '…' : 'Connect my Gmail'}
                </button>
              )}
            </div>
          ) : gmailStatus.agentThreadUsesGmail && gmailStatus.connected ? (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-gray-700 dark:text-gray-300">
                <strong className="font-semibold">Gmail</strong> is connected for you. This tab sends through the Gmail API.
              </span>
              <button
                type="button"
                onClick={handleDisconnectGmail}
                disabled={gmailActionLoading}
                className="shrink-0 rounded-md border border-slate-300 bg-white px-2 py-1 text-[0.7rem] font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 disabled:opacity-50"
              >
                {gmailActionLoading ? '…' : 'Disconnect my Gmail'}
              </button>
            </div>
          ) : !gmailStatus.agentThreadUsesGmail && gmailStatus.configured ? (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-gray-700 dark:text-gray-300">
                <strong className="font-semibold">Connect Gmail</strong> to send the sales ↔ agent thread via Gmail, or set{' '}
                <code className="text-[0.65rem]">GMAIL_AGENT_THREAD_REFRESH_TOKEN</code> on the server for a shared app mailbox. Otherwise
                delivery uses SMTP/Resend and may not work.
              </span>
              <button
                type="button"
                onClick={handleConnectGmail}
                disabled={gmailActionLoading}
                className="shrink-0 rounded-md bg-slate-800 px-2.5 py-1.5 text-[0.7rem] font-semibold text-white hover:bg-slate-900 dark:bg-slate-200 dark:text-slate-900 dark:hover:bg-white disabled:opacity-50"
              >
                {gmailActionLoading ? '…' : 'Connect Gmail'}
              </button>
            </div>
          ) : !gmailStatus.agentThreadUsesGmail && !gmailStatus.configured ? (
            <p className="text-gray-600 dark:text-gray-400">
              Gmail API: add <code className="text-[0.65rem]">GMAIL_AGENT_THREAD_REFRESH_TOKEN</code> to the server (with the same client id/secret) so
              this tab can send on HTTPS, or set <code className="text-[0.65rem]">GOOGLE_OAUTH_REDIRECT_URI</code> and use <strong>Connect Gmail</strong>.
            </p>
          ) : null}
        </div>
      )}
      {showSalesIntroRm && (
        <p className="mb-3 text-[0.7rem] text-gray-500 dark:text-gray-400 leading-relaxed">
          Thread order is oldest → newest. RM replies are pulled when you open this tab (same mailbox as{' '}
          <code className="font-mono text-[0.65rem]">IMAP_USER</code>). Use <strong className="text-gray-700 dark:text-gray-300">Sync inbox</strong>{' '}
          to refresh. <code className="font-mono text-[0.65rem]">[REQ-…]</code> in the subject. RM:{' '}
          <strong className="text-gray-700 dark:text-gray-300">{thread?.rm_email ?? 'rm@…'}</strong>.
        </p>
      )}
      {hasOutgoingFailed && (
        <div className="mb-4 flex gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5 text-xs text-amber-950 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-100">
          <Mail className="shrink-0 mt-0.5" size={14} />
          <span>
            At least one outgoing message was <strong>not</strong> accepted by the mail server. Configure production SMTP (e.g. Railway) or
            resend after fixing credentials.
          </span>
        </div>
      )}

      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100 dark:border-gray-800">
        <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
          <Mail size={16} className="text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">{threadTitle}</p>
          <p className="text-xs text-gray-400 break-all">{subEmail}</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {hasMessages && (
            <span className="text-xs text-gray-400">
              {emails.length} email{emails.length > 1 ? 's' : ''}
            </span>
          )}
          {canReply && canPollInbox && (
            <button
              type="button"
              onClick={handlePollInbox}
              disabled={isSending}
              title="Fetch new messages from the mailbox (IMAP)"
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/20 hover:bg-teal-100 dark:hover:bg-teal-900/40 disabled:opacity-50"
            >
              {isSending ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
              Sync inbox
            </button>
          )}
        </div>
      </div>

      {channel === 'agent_sales' && canReply && (isSales || isAdmin) && isStubThread && (
        <div className="mb-6 space-y-2 rounded-lg border border-teal-200 bg-teal-50/50 p-4 dark:border-teal-900/50 dark:bg-teal-950/20">
          <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Start the email thread to the agent</p>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            Sends to the address on the agent’s user profile. They will also see <strong>Portal chat</strong> for instant messages.
          </p>
          <textarea
            value={firstToAgentText}
            onChange={(e) => setFirstToAgentText(e.target.value)}
            rows={3}
            placeholder="Write your first email to the agent…"
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
          />
          <button
            type="button"
            onClick={handleFirstToAgent}
            disabled={isSending || !firstToAgentText.trim()}
            className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
          >
            {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Send to agent’s email
          </button>
        </div>
      )}

      {!hasMessages && !(channel === 'agent_sales' && canReply && (isSales || isAdmin) && isStubThread) ? (
        <div className="text-center py-8">
          <div className="w-14 h-14 mx-auto mb-3 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
            <Mail size={24} className="text-gray-400" />
          </div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">No messages yet</p>
          <p className="text-xs text-gray-400 mt-1">
            {channel === 'rm' ? 'Send to RM to start the RM thread' : isStubThread && (isSales || isAdmin) ? 'Use the form above to email the agent' : '—'}
          </p>
        </div>
      ) : hasMessages ? (
        <div className="space-y-5 max-h-[min(520px,70vh)] overflow-y-auto pr-1">
          {emails.map((email) => (
            <EmailBubble key={email.id} email={email} channel={channel} />
          ))}
        </div>
      ) : null}

      {canReply && hasThreadRecord && hasMessages && (
        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder={channel === 'rm' ? 'Type a reply to RM…' : 'Reply in this email thread…'}
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleReply()}
              className="flex-1 px-4 py-2.5 border rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10"
            />
            <button
              type="button"
              onClick={handleReply}
              disabled={isSending || !replyText.trim()}
              className="p-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            </button>
          </div>
          <div className="mt-2 flex flex-col gap-2">
            {canSimulate && channel === 'rm' && (
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
            {canReply && requestStatus === 'rm_pending' && hasMessages && channel === 'rm' && (
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
