import { useCallback, useEffect, useState } from 'react';
import {
  Mail,
  Paperclip,
  Loader2,
  Search,
  RefreshCw,
  Pencil,
  Trash2,
  X,
  FileText,
} from 'lucide-react';
import Button from '../../components/ui/Button';
import StatusBadge from '../../components/ui/StatusBadge';
import {
  adminListEmailThreads,
  adminGetEmailThread,
  adminUpdateEmailThread,
  adminDeleteEmailThread,
  adminUpdateEmailMessage,
  adminDeleteEmailMessage,
  adminUpdateEmailAttachment,
  adminDeleteEmailAttachment,
  adminListRequestAttachments,
  adminUpdateRequestAttachment,
  adminDeleteRequestAttachment,
} from '../../services/adminService';
import type {
  AdminEmailThreadDetailResponse,
  AdminEmailThreadListItem,
  AdminRequestAttachmentListItem,
  RequestStatus,
} from '../../types';

function formatDt(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function kb(n: number) {
  if (n < 1024) return `${n} B`;
  return `${(n / 1024).toFixed(1)} KB`;
}

export default function AdminMailDataPage() {
  const [tab, setTab] = useState<'rm_mail' | 'request_files'>('rm_mail');

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [loading, setLoading] = useState(false);
  const [threads, setThreads] = useState<AdminEmailThreadListItem[]>([]);
  const [total, setTotal] = useState(0);

  const [files, setFiles] = useState<AdminRequestAttachmentListItem[]>([]);
  const [filesTotal, setFilesTotal] = useState(0);
  const [filesPage, setFilesPage] = useState(1);

  const [detail, setDetail] = useState<AdminEmailThreadDetailResponse | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  const [threadEdit, setThreadEdit] = useState(false);
  const [threadForm, setThreadForm] = useState({ subject: '', rm_email: '', status: '' });

  const [msgEditId, setMsgEditId] = useState<string | null>(null);
  const [msgForm, setMsgForm] = useState({
    subject: '',
    body: '',
    from_email: '',
    to_email: '',
    direction: 'outgoing',
    status: '',
  });

  const [eAttEdit, setEAttEdit] = useState<{ id: string; filename: string; file_url: string; file_type: string } | null>(
    null
  );

  const [reqAttEdit, setReqAttEdit] = useState<AdminRequestAttachmentListItem | null>(null);
  const [reqAttForm, setReqAttForm] = useState({ filename: '', file_url: '', file_type: '' });

  const loadThreads = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminListEmailThreads({ page, limit, search: search.trim() || undefined });
      setThreads(res.items);
      setTotal(res.total);
    } finally {
      setLoading(false);
    }
  }, [page, limit, search]);

  const loadFiles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminListRequestAttachments({
        page: filesPage,
        limit,
        search: search.trim() || undefined,
      });
      setFiles(res.items);
      setFilesTotal(res.total);
    } finally {
      setLoading(false);
    }
  }, [filesPage, limit, search]);

  useEffect(() => {
    if (tab === 'rm_mail') void loadThreads();
    else void loadFiles();
  }, [tab, loadThreads, loadFiles]);

  async function openThread(threadId: string) {
    setDetailOpen(true);
    setDetailLoading(true);
    setThreadEdit(false);
    setMsgEditId(null);
    try {
      const d = await adminGetEmailThread(threadId);
      setDetail(d);
      setThreadForm({ subject: d.subject, rm_email: d.rm_email, status: d.thread_status });
    } finally {
      setDetailLoading(false);
    }
  }

  async function saveThread() {
    if (!detail) return;
    const d = await adminUpdateEmailThread(detail.thread_id, threadForm);
    setDetail(d);
    setThreadEdit(false);
    void loadThreads();
  }

  async function removeThread() {
    if (!detail || !window.confirm('Delete this entire email thread and all messages?')) return;
    await adminDeleteEmailThread(detail.thread_id);
    setDetailOpen(false);
    setDetail(null);
    void loadThreads();
  }

  function startEditMsg(m: AdminEmailThreadDetailResponse['messages'][0]) {
    setMsgEditId(m.id);
    setMsgForm({
      subject: m.subject,
      body: m.body,
      from_email: m.from_email,
      to_email: m.to_email,
      direction: m.direction,
      status: m.status,
    });
  }

  async function saveMsg() {
    if (!msgEditId) return;
    await adminUpdateEmailMessage(msgEditId, {
      subject: msgForm.subject,
      body: msgForm.body,
      from_email: msgForm.from_email,
      to_email: msgForm.to_email,
      direction: msgForm.direction,
      status: msgForm.status,
    });
    setMsgEditId(null);
    if (detail) await openThread(detail.thread_id);
  }

  async function removeMsg(id: string) {
    if (!window.confirm('Delete this email message?')) return;
    await adminDeleteEmailMessage(id);
    if (detail) await openThread(detail.thread_id);
  }

  async function saveEAtt() {
    if (!eAttEdit) return;
    await adminUpdateEmailAttachment(eAttEdit.id, {
      filename: eAttEdit.filename,
      file_url: eAttEdit.file_url,
      file_type: eAttEdit.file_type,
    });
    setEAttEdit(null);
    if (detail) await openThread(detail.thread_id);
  }

  async function removeEAtt(id: string) {
    if (!window.confirm('Remove this attachment row?')) return;
    await adminDeleteEmailAttachment(id);
    if (detail) await openThread(detail.thread_id);
  }

  function startReqAttEdit(row: AdminRequestAttachmentListItem) {
    setReqAttEdit(row);
    setReqAttForm({
      filename: row.filename,
      file_url: row.file_url,
      file_type: row.file_type,
    });
  }

  async function saveReqAtt() {
    if (!reqAttEdit) return;
    const updated = await adminUpdateRequestAttachment(reqAttEdit.id, reqAttForm);
    setFiles((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    setReqAttEdit(null);
  }

  async function removeReqAtt(id: string) {
    if (!window.confirm('Delete this attachment record?')) return;
    await adminDeleteRequestAttachment(id);
    void loadFiles();
  }

  const totalPages = Math.max(1, Math.ceil((tab === 'rm_mail' ? total : filesTotal) / limit));

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Mail className="h-6 w-6 text-teal-600" />
          Mail and files
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-3xl">
          Browse RM email threads, message bodies, and email attachments, plus request file uploads — in normal form (not raw
          SQL). Edit or delete rows when you need to correct data.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-gray-200 dark:border-gray-800 pb-2">
        <button
          type="button"
          onClick={() => {
            setTab('rm_mail');
            setPage(1);
          }}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            tab === 'rm_mail'
              ? 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-200'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
        >
          RM email (threads)
        </button>
        <button
          type="button"
          onClick={() => {
            setTab('request_files');
            setFilesPage(1);
          }}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            tab === 'request_files'
              ? 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-200'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
        >
          Request uploads
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
            placeholder={tab === 'rm_mail' ? 'Search request code, route, subject…' : 'Search request code or filename…'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (tab === 'rm_mail' ? loadThreads() : loadFiles())}
          />
        </div>
        <Button type="button" variant="secondary" onClick={() => (tab === 'rm_mail' ? loadThreads() : loadFiles())}>
          <RefreshCw size={16} />
          Refresh
        </Button>
      </div>

      {tab === 'rm_mail' && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
          {loading && threads.length === 0 ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                    <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Request</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Route</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Agent</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Subject</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">RM email</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Msgs</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Last activity</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {threads.map((t) => (
                    <tr key={t.thread_id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                      <td className="px-4 py-3">
                        <span className="font-semibold text-gray-900 dark:text-white">{t.request_code}</span>
                        <div className="mt-0.5">
                          <StatusBadge status={t.request_status as RequestStatus} />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{t.route}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{t.agent_name ?? '—'}</td>
                      <td className="px-4 py-3 max-w-[220px]">
                        <span className="line-clamp-2 text-gray-800 dark:text-gray-200">{t.subject}</span>
                        <p className="text-xs text-gray-400 mt-1 line-clamp-2">{t.preview}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400 break-all max-w-[140px]">
                        {t.rm_email}
                      </td>
                      <td className="px-4 py-3">{t.message_count}</td>
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{formatDt(t.last_activity_at)}</td>
                      <td className="px-4 py-3">
                        <Button type="button" size="sm" variant="secondary" onClick={() => openThread(t.thread_id)}>
                          Open
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-800 text-sm">
            <span className="text-gray-500">
              Page {page} / {totalPages} — {total} threads
            </span>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      )}

      {tab === 'request_files' && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
          {loading && files.length === 0 ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
            </div>
          ) : files.length === 0 ? (
            <div className="text-center py-16 text-gray-500 text-sm">No request uploads found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                    <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Request</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Agent</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">File</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Size</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Uploaded</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {files.map((f) => (
                    <tr key={f.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                      <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">{f.request_code}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{f.agent_name ?? '—'}</td>
                      <td className="px-4 py-3">
                        <a
                          href={f.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-teal-600 hover:underline break-all"
                        >
                          {f.filename}
                        </a>
                        <div className="text-xs text-gray-400">{f.file_type}</div>
                      </td>
                      <td className="px-4 py-3">{kb(f.file_size)}</td>
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{formatDt(f.uploaded_at)}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button
                            type="button"
                            className="p-1.5 rounded-lg text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/30"
                            title="Edit"
                            onClick={() => startReqAttEdit(f)}
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            type="button"
                            className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30"
                            title="Delete"
                            onClick={() => removeReqAtt(f.id)}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-800 text-sm">
            <span className="text-gray-500">
              Page {filesPage} / {Math.max(1, Math.ceil(filesTotal / limit))} — {filesTotal} files
            </span>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={filesPage <= 1}
                onClick={() => setFilesPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={filesPage >= Math.max(1, Math.ceil(filesTotal / limit))}
                onClick={() => setFilesPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Thread detail modal */}
      {detailOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setDetailOpen(false)} />
          <div className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <Mail className="h-5 w-5 text-teal-600 shrink-0" />
                <div className="min-w-0">
                  <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                    {detail?.request_code ?? '…'} — RM email thread
                  </h3>
                  {detail && (
                    <p className="text-xs text-gray-500 truncate">
                      {detail.route} · {detail.rm_email}
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                className="text-gray-400 hover:text-gray-600"
                onClick={() => setDetailOpen(false)}
                aria-label="Close"
              >
                <X size={22} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {detailLoading && (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
                </div>
              )}
              {!detailLoading && detail && (
                <>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="secondary" size="sm" onClick={() => setThreadEdit((v) => !v)}>
                      <Pencil size={14} />
                      {threadEdit ? 'Cancel edit' : 'Edit thread'}
                    </Button>
                    <Button type="button" variant="danger" size="sm" onClick={removeThread}>
                      <Trash2 size={14} />
                      Delete thread
                    </Button>
                  </div>

                  {threadEdit ? (
                    <div className="rounded-lg border border-purple-200 dark:border-purple-900/40 p-4 space-y-3">
                      <label className="block text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Subject</span>
                        <input
                          className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
                          value={threadForm.subject}
                          onChange={(e) => setThreadForm((f) => ({ ...f, subject: e.target.value }))}
                        />
                      </label>
                      <label className="block text-sm">
                        <span className="text-gray-600 dark:text-gray-400">RM email</span>
                        <input
                          className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
                          value={threadForm.rm_email}
                          onChange={(e) => setThreadForm((f) => ({ ...f, rm_email: e.target.value }))}
                        />
                      </label>
                      <label className="block text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Thread status</span>
                        <input
                          className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
                          value={threadForm.status}
                          onChange={(e) => setThreadForm((f) => ({ ...f, status: e.target.value }))}
                        />
                      </label>
                      <Button type="button" size="sm" onClick={saveThread}>
                        Save thread
                      </Button>
                    </div>
                  ) : null}

                  <div className="space-y-4">
                    {detail.messages.map((m) => (
                      <div
                        key={m.id}
                        className={`rounded-xl border p-4 ${
                          m.direction === 'incoming'
                            ? 'border-amber-200 bg-amber-50/50 dark:border-amber-900/40 dark:bg-amber-950/20'
                            : 'border-teal-200 bg-teal-50/50 dark:border-teal-900/40 dark:bg-teal-950/20'
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                          <div className="text-xs font-semibold uppercase text-gray-500">
                            {m.direction === 'incoming' ? 'Incoming (RM)' : 'Outgoing (portal)'} · {m.status}
                          </div>
                          <div className="flex gap-1">
                            {msgEditId !== m.id ? (
                              <>
                                <button
                                  type="button"
                                  className="p-1.5 rounded text-purple-600 hover:bg-white/50"
                                  onClick={() => startEditMsg(m)}
                                >
                                  <Pencil size={16} />
                                </button>
                                <button
                                  type="button"
                                  className="p-1.5 rounded text-red-600 hover:bg-white/50"
                                  onClick={() => removeMsg(m.id)}
                                >
                                  <Trash2 size={16} />
                                </button>
                              </>
                            ) : null}
                          </div>
                        </div>
                        {msgEditId === m.id ? (
                          <div className="space-y-2">
                            <input
                              className="w-full px-2 py-1.5 rounded border text-sm"
                              value={msgForm.subject}
                              onChange={(e) => setMsgForm((f) => ({ ...f, subject: e.target.value }))}
                            />
                            <textarea
                              rows={6}
                              className="w-full px-2 py-1.5 rounded border text-sm font-mono"
                              value={msgForm.body}
                              onChange={(e) => setMsgForm((f) => ({ ...f, body: e.target.value }))}
                            />
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <input
                                className="px-2 py-1.5 rounded border text-xs"
                                value={msgForm.from_email}
                                onChange={(e) => setMsgForm((f) => ({ ...f, from_email: e.target.value }))}
                                placeholder="From"
                              />
                              <input
                                className="px-2 py-1.5 rounded border text-xs"
                                value={msgForm.to_email}
                                onChange={(e) => setMsgForm((f) => ({ ...f, to_email: e.target.value }))}
                                placeholder="To"
                              />
                              <select
                                className="px-2 py-1.5 rounded border text-xs"
                                value={msgForm.direction}
                                onChange={(e) => setMsgForm((f) => ({ ...f, direction: e.target.value }))}
                              >
                                <option value="incoming">incoming</option>
                                <option value="outgoing">outgoing</option>
                              </select>
                              <input
                                className="px-2 py-1.5 rounded border text-xs"
                                value={msgForm.status}
                                onChange={(e) => setMsgForm((f) => ({ ...f, status: e.target.value }))}
                                placeholder="status"
                              />
                            </div>
                            <div className="flex gap-2">
                              <Button type="button" size="sm" onClick={saveMsg}>
                                Save message
                              </Button>
                              <Button type="button" size="sm" variant="secondary" onClick={() => setMsgEditId(null)}>
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <p className="text-xs text-gray-500 mb-1">
                              {m.from_email} → {m.to_email}
                            </p>
                            <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">{m.subject}</p>
                            <pre className="text-sm whitespace-pre-wrap font-sans text-gray-700 dark:text-gray-300">
                              {m.body}
                            </pre>
                            <p className="text-[11px] text-gray-400 mt-2">{formatDt(m.sent_at)}</p>
                          </>
                        )}

                        {m.attachments.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 space-y-2">
                            <div className="text-xs font-semibold text-gray-500 flex items-center gap-1">
                              <Paperclip size={12} /> Attachments
                            </div>
                            {m.attachments.map((a) => (
                              <div
                                key={a.id}
                                className="flex flex-wrap items-center justify-between gap-2 text-sm bg-white/60 dark:bg-gray-900/40 rounded-lg px-3 py-2"
                              >
                                <a
                                  href={a.file_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-teal-600 hover:underline break-all"
                                >
                                  {a.filename}
                                </a>
                                <span className="text-xs text-gray-400">
                                  {kb(a.file_size)} · {a.file_type}
                                </span>
                                <div className="flex gap-1">
                                  <button
                                    type="button"
                                    className="p-1 text-purple-600"
                                    title="Edit"
                                    onClick={() =>
                                      setEAttEdit({
                                        id: a.id,
                                        filename: a.filename,
                                        file_url: a.file_url,
                                        file_type: a.file_type,
                                      })
                                    }
                                  >
                                    <Pencil size={14} />
                                  </button>
                                  <button
                                    type="button"
                                    className="p-1 text-red-600"
                                    title="Delete"
                                    onClick={() => removeEAtt(a.id)}
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {eAttEdit && (
        <div className="fixed inset-0 z-[210] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setEAttEdit(null)} />
          <div className="relative bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-6 w-full max-w-md space-y-3">
            <h4 className="font-semibold text-gray-900 dark:text-white">Edit email attachment</h4>
            <label className="block text-sm">
              Filename
              <input
                className="mt-1 w-full px-3 py-2 rounded-lg border text-sm"
                value={eAttEdit.filename}
                onChange={(e) => setEAttEdit((x) => (x ? { ...x, filename: e.target.value } : x))}
              />
            </label>
            <label className="block text-sm">
              File URL
              <input
                className="mt-1 w-full px-3 py-2 rounded-lg border text-sm"
                value={eAttEdit.file_url}
                onChange={(e) => setEAttEdit((x) => (x ? { ...x, file_url: e.target.value } : x))}
              />
            </label>
            <label className="block text-sm">
              MIME type
              <input
                className="mt-1 w-full px-3 py-2 rounded-lg border text-sm"
                value={eAttEdit.file_type}
                onChange={(e) => setEAttEdit((x) => (x ? { ...x, file_type: e.target.value } : x))}
              />
            </label>
            <div className="flex gap-2 justify-end pt-2">
              <Button type="button" variant="secondary" onClick={() => setEAttEdit(null)}>
                Cancel
              </Button>
              <Button type="button" onClick={saveEAtt}>
                Save
              </Button>
            </div>
          </div>
        </div>
      )}

      {reqAttEdit && (
        <div className="fixed inset-0 z-[210] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setReqAttEdit(null)} />
          <div className="relative bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-6 w-full max-w-md space-y-3">
            <h4 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <FileText size={18} className="text-teal-600" />
              Edit request file
            </h4>
            <label className="block text-sm">
              Filename
              <input
                className="mt-1 w-full px-3 py-2 rounded-lg border text-sm"
                value={reqAttForm.filename}
                onChange={(e) => setReqAttForm((f) => ({ ...f, filename: e.target.value }))}
              />
            </label>
            <label className="block text-sm">
              File URL
              <input
                className="mt-1 w-full px-3 py-2 rounded-lg border text-sm"
                value={reqAttForm.file_url}
                onChange={(e) => setReqAttForm((f) => ({ ...f, file_url: e.target.value }))}
              />
            </label>
            <label className="block text-sm">
              MIME type
              <input
                className="mt-1 w-full px-3 py-2 rounded-lg border text-sm"
                value={reqAttForm.file_type}
                onChange={(e) => setReqAttForm((f) => ({ ...f, file_type: e.target.value }))}
              />
            </label>
            <div className="flex gap-2 justify-end pt-2">
              <Button type="button" variant="secondary" onClick={() => setReqAttEdit(null)}>
                Cancel
              </Button>
              <Button type="button" onClick={saveReqAtt}>
                Save
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
