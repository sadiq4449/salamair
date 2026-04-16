import { useState, useEffect } from 'react';
import { X, Mail, Paperclip, Send, Loader2, AlertTriangle } from 'lucide-react';
import { useEmailStore } from '../store/emailStore';
import type { RequestDetail } from '../types';
import { DEMO_SMART_REPLIES } from '../utils/demoAiHelpers';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  request: RequestDetail;
  onSent?: () => void;
}

export default function EmailPreviewModal({ isOpen, onClose, request, onSent }: Props) {
  const { sendEmail, isSending, error, clearError } = useEmailStore();
  const [smtpWarning, setSmtpWarning] = useState<string | null>(null);
  const [message, setMessage] = useState(
    `Please review and approve the fare for ${request.route} route.\n\nDetails:\n- Passengers: ${request.pax}\n- Requested Price: ${Number(request.price).toFixed(2)} OMR\n- Travel Date: ${request.travel_date ?? 'N/A'}`
  );
  const [rmEmail, setRmEmail] = useState('rm@salamair.com');
  const [includeAttachments, setIncludeAttachments] = useState(true);

  useEffect(() => {
    if (isOpen) {
      clearError();
      setSmtpWarning(null);
    }
  }, [isOpen, clearError]);

  if (!isOpen) return null;

  const subject = `[${request.request_code}] Fare Approval Request - ${request.route}`;

  async function handleSend() {
    try {
      const result = await sendEmail({
        request_id: request.id,
        to: rmEmail,
        message: message.trim(),
        include_attachments: includeAttachments,
      });
      if (result.smtp_delivered === false) {
        const detail = [result.message, result.smtp_error].filter(Boolean).join('\n\n');
        setSmtpWarning(detail);
        return;
      }
      onSent?.();
      onClose();
    } catch {
      /* error text is in store */
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-100 dark:border-gray-800 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <Mail size={18} className="text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">Send to Revenue Management</h3>
              <p className="text-xs text-gray-400">Preview email before sending</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* From / To / Subject */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-gray-400 uppercase w-16 shrink-0">From</span>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Sender comes from the server (<code className="text-xs">SMTP_FROM_EMAIL</code>; use{' '}
                <code className="text-xs">RESEND_API_KEY</code> on Railway Hobby) — not shown in the preview
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-gray-400 uppercase w-16 shrink-0">To</span>
              <input
                type="email"
                value={rmEmail}
                onChange={(e) => setRmEmail(e.target.value)}
                className="flex-1 px-3 py-1.5 border rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 outline-none focus:border-teal-500"
              />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-gray-400 uppercase w-16 shrink-0">Subject</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">{subject}</span>
            </div>
          </div>

          <hr className="border-gray-100 dark:border-gray-800" />

          {/* Request Summary */}
          <div className="grid grid-cols-3 gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div>
              <p className="text-[0.65rem] text-gray-400 uppercase font-semibold">Route</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">{request.route}</p>
            </div>
            <div>
              <p className="text-[0.65rem] text-gray-400 uppercase font-semibold">Pax</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">{request.pax}</p>
            </div>
            <div>
              <p className="text-[0.65rem] text-gray-400 uppercase font-semibold">Price</p>
              <p className="text-sm font-semibold text-teal-600 dark:text-teal-400">{Number(request.price).toFixed(2)} OMR</p>
            </div>
          </div>

          {/* Smart replies (UI.demo_design sales — chips for RM message) */}
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Smart replies</p>
            <div className="flex flex-wrap gap-2">
              {DEMO_SMART_REPLIES(Number(request.price), request.route, request.pax).map((line, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setMessage(line)}
                  className="text-left text-xs px-2.5 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-violet-100 dark:hover:bg-violet-900/30 transition-colors max-w-full"
                >
                  {line}
                </button>
              ))}
            </div>
          </div>

          {/* Message */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              className="w-full px-3.5 py-2.5 border rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 resize-none"
            />
          </div>

          {/* Attachments toggle */}
          {request.attachments && request.attachments.length > 0 && (
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={includeAttachments}
                onChange={(e) => setIncludeAttachments(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
              />
              <Paperclip size={14} className="text-gray-400" />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Include {request.attachments.length} attachment{request.attachments.length > 1 ? 's' : ''}
              </span>
            </label>
          )}
        </div>

        {(error || smtpWarning) && (
          <div className="px-6 pb-2 space-y-2">
            {error && (
              <div className="flex gap-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-3 py-2 text-sm text-red-800 dark:text-red-200">
                <AlertTriangle className="shrink-0 mt-0.5" size={16} />
                <span>{error}</span>
              </div>
            )}
            {smtpWarning && (
              <div className="flex gap-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-3 py-2 text-sm text-amber-900 dark:text-amber-100">
                <AlertTriangle className="shrink-0 mt-0.5" size={16} />
                <span>{smtpWarning}</span>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 dark:border-gray-800">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={isSending || !message.trim()}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold bg-purple-600 text-white hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            Send to RM
          </button>
        </div>
      </div>
    </div>
  );
}
