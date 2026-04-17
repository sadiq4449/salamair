import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  Mail,
  Server,
  Users,
  Loader2,
  Plane,
  Briefcase,
  Shield,
  RefreshCw,
  Send,
  Inbox,
  Database,
} from 'lucide-react';
import {
  getAdminStats,
  getAdminEmailStatus,
  postAdminEmailTestSend,
  postAdminEmailTestInbox,
} from '../../services/adminService';
import type { AdminEmailStatus, AdminStats } from '../../types';
import { useToastStore } from '../../store/toastStore';

function apiErr(e: unknown): string {
  const ax = e as { response?: { data?: { error?: { message?: string } } } };
  return ax.response?.data?.error?.message ?? 'Failed to load stats';
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [emailStatus, setEmailStatus] = useState<AdminEmailStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [emailBusy, setEmailBusy] = useState(false);
  const addToast = useToastStore((s) => s.addToast);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [s, es] = await Promise.all([getAdminStats(), getAdminEmailStatus()]);
        if (!cancelled) {
          setStats(s);
          setEmailStatus(es);
        }
      } catch (e) {
        addToast('error', apiErr(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [addToast]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-teal-600">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!stats) return null;

  const cards = [
    { label: 'Total users', value: stats.total_users, icon: Users },
    { label: 'Active today', value: stats.active_users_today, icon: Activity },
    { label: 'Agents', value: stats.total_agents, icon: Plane },
    { label: 'Sales', value: stats.total_sales, icon: Briefcase },
    { label: 'Admins', value: stats.total_admins, icon: Shield },
    { label: 'Requests today', value: stats.requests_today, icon: Activity },
    { label: 'Pending requests', value: stats.pending_requests, icon: Activity },
    { label: 'Emails sent today', value: stats.emails_sent_today, icon: Mail },
    { label: 'Reported uptime', value: stats.system_uptime, icon: Server },
  ];

  async function refreshEmailStatus() {
    try {
      const es = await getAdminEmailStatus();
      setEmailStatus(es);
    } catch (e) {
      addToast('error', apiErr(e));
    }
  }

  async function runTestSend() {
    setEmailBusy(true);
    try {
      const r = await postAdminEmailTestSend();
      if (r.success) {
        addToast('success', `${r.message} Check ${r.sent_to} inbox (and spam).`);
      } else {
        addToast('error', r.smtp_error ? `${r.message} ${r.smtp_error}` : r.message);
      }
      await refreshEmailStatus();
    } catch (e) {
      addToast('error', apiErr(e));
    } finally {
      setEmailBusy(false);
    }
  }

  async function runTestInbox() {
    setEmailBusy(true);
    try {
      const r = await postAdminEmailTestInbox();
      if (r.skipped) {
        addToast('info', r.reason ?? 'IMAP sync skipped');
      } else if (r.stored > 0) {
        addToast('success', `Imported ${r.stored} message(s). Processed ${r.processed}.`);
      } else {
        addToast(
          'info',
          `No new matching mail (processed ${r.processed}). ${r.errors?.length ? r.errors[0] : ''}`.trim()
        );
      }
    } catch (e) {
      addToast('error', apiErr(e));
    } finally {
      setEmailBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <Link
        to="/admin/data-hub"
        className="flex items-center gap-3 rounded-xl border border-purple-200 dark:border-purple-900/50 bg-purple-50/90 dark:bg-purple-950/40 px-4 py-3 text-sm text-purple-900 dark:text-purple-100 hover:bg-purple-100/90 dark:hover:bg-purple-950/60 transition-colors"
      >
        <Database className="h-5 w-5 shrink-0" />
        <span>
          <span className="font-semibold">All database data</span>
          <span className="block text-xs opacity-90 mt-0.5">
            View and edit requests, chat messages, history, notifications, counter offers, SLA, chat files — without SQL or
            Railway tables.
          </span>
        </span>
      </Link>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map(({ label, value, icon: Icon }) => (
          <div
            key={label}
            className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm"
          >
            <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400 mb-2">
              <Icon size={18} />
              <span className="text-xs font-semibold uppercase tracking-wide">{label}</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
          </div>
        ))}
      </div>

      {emailStatus && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
            <div>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Mail size={18} className="text-teal-600" />
                Email (deploy check)
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-xl">
                After setting SMTP/IMAP on the host, send a test message and poll the inbox. Values below omit
                passwords.
              </p>
            </div>
            <button
              type="button"
              onClick={() => refreshEmailStatus()}
              disabled={emailBusy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <RefreshCw size={14} className={emailBusy ? 'animate-spin' : ''} />
              Refresh status
            </button>
          </div>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-xs mb-4">
            <div className="flex justify-between gap-2 border-b border-gray-100 dark:border-gray-800 pb-1">
              <dt className="text-gray-500">Outbound sending</dt>
              <dd
                className={
                  emailStatus.resend_configured ||
                  (emailStatus.smtp_user_configured && emailStatus.smtp_password_configured)
                    ? 'text-teal-700 dark:text-teal-400 font-medium'
                    : 'text-amber-700 dark:text-amber-400'
                }
              >
                {emailStatus.resend_configured
                  ? 'Resend'
                  : emailStatus.smtp_user_configured && emailStatus.smtp_password_configured
                    ? 'SMTP'
                    : 'no'}
              </dd>
            </div>
            <div className="flex justify-between gap-2 border-b border-gray-100 dark:border-gray-800 pb-1">
              <dt className="text-gray-500">IMAP active</dt>
              <dd className={emailStatus.imap_polling_active ? 'text-teal-700 dark:text-teal-400 font-medium' : 'text-amber-700 dark:text-amber-400'}>
                {emailStatus.imap_polling_active ? 'yes' : 'no'}
              </dd>
            </div>
            <div className="flex justify-between gap-2 border-b border-gray-100 dark:border-gray-800 pb-1 sm:col-span-2">
              <dt className="text-gray-500">Outbound</dt>
              <dd className="text-right text-gray-800 dark:text-gray-200 break-all text-[0.7rem] leading-snug">
                {emailStatus.resend_configured ? (
                  <>
                    <span className="font-mono block">HTTPS api.resend.com</span>
                    {emailStatus.resend_outbound_summary ? (
                      <span className="block mt-1 text-gray-600 dark:text-gray-300">{emailStatus.resend_outbound_summary}</span>
                    ) : (
                      <span className="block mt-1 font-mono">contact in env: {emailStatus.smtp_from_email}</span>
                    )}
                  </>
                ) : (
                  <>
                    {emailStatus.smtp_host}:{emailStatus.smtp_port}{' '}
                    {emailStatus.smtp_implicit_ssl ? 'SSL' : `STARTTLS=${emailStatus.smtp_use_tls ? 'on' : 'off'}`} · timeout{' '}
                    {emailStatus.smtp_timeout_seconds}s · from {emailStatus.smtp_from_email}
                  </>
                )}
              </dd>
            </div>
            <div className="flex justify-between gap-2 border-b border-gray-100 dark:border-gray-800 pb-1 sm:col-span-2">
              <dt className="text-gray-500">Inbound</dt>
              <dd className="text-right font-mono text-gray-800 dark:text-gray-200 break-all">
                {emailStatus.imap_host}:{emailStatus.imap_port} SSL={emailStatus.imap_use_ssl ? 'on' : 'off'}
              </dd>
            </div>
          </dl>
          {emailStatus.resend_configured && emailStatus.resend_test_sender_mode ? (
            <p className="text-xs text-amber-800 dark:text-amber-200/90 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2 mb-3">
              Resend is in <strong>test sender</strong> mode (Gmail/Yahoo From). Only the email tied to your Resend
              account receives outbound mail until you verify a domain and set <code className="font-mono">RESEND_FROM_EMAIL</code>.
              Use <strong>Send test email (to me)</strong> while logged in as that user — it sends to your admin login
              address.
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={runTestSend}
              disabled={emailBusy || !emailStatus.email_sending_active}
              title={!emailStatus.email_sending_active ? 'Configure SMTP on the server first' : 'Send test to your admin email'}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {emailBusy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              Send test email (to me)
            </button>
            <button
              type="button"
              onClick={runTestInbox}
              disabled={emailBusy || !emailStatus.imap_polling_active}
              title={!emailStatus.imap_polling_active ? 'Configure IMAP on the server first' : 'Fetch UNSEEN and match [REQ-…]'}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-teal-600 text-teal-700 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/40 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {emailBusy ? <Loader2 size={16} className="animate-spin" /> : <Inbox size={16} />}
              Test IMAP sync
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
