import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Database,
  Loader2,
  Search,
  RefreshCw,
  Pencil,
  Trash2,
  Mail,
  X,
} from 'lucide-react';
import Button from '../../components/ui/Button';
import StatusBadge from '../../components/ui/StatusBadge';
import {
  explorerListRequests,
  explorerUpdateRequest,
  explorerDeleteRequest,
  explorerListMessages,
  explorerUpdateMessage,
  explorerDeleteMessage,
  explorerListHistory,
  explorerUpdateHistory,
  explorerDeleteHistory,
  explorerListNotifications,
  explorerUpdateNotification,
  explorerDeleteNotification,
  explorerListCounterOffers,
  explorerUpdateCounterOffer,
  explorerDeleteCounterOffer,
  explorerListSla,
  explorerUpdateSla,
  explorerDeleteSla,
  explorerListChatAttachments,
  explorerUpdateChatAttachment,
  explorerDeleteChatAttachment,
} from '../../services/adminService';
import type {
  AdminDbRequestRow,
  AdminDbMessageRow,
  AdminDbHistoryRow,
  AdminDbNotificationRow,
  AdminDbCounterOfferRow,
  AdminDbSlaRow,
  AdminDbChatAttachmentRow,
  RequestStatus,
} from '../../types';
import { useToastStore } from '../../store/toastStore';

type TabId =
  | 'requests'
  | 'messages'
  | 'history'
  | 'notifications'
  | 'counters'
  | 'sla'
  | 'chat_att';

const TABS: { id: TabId; label: string }[] = [
  { id: 'requests', label: 'Requests' },
  { id: 'messages', label: 'Chat / timeline' },
  { id: 'history', label: 'Request history' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'counters', label: 'Counter offers' },
  { id: 'sla', label: 'SLA rows' },
  { id: 'chat_att', label: 'Chat files' },
];

function fmt(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export default function AdminDataHubPage() {
  const addToast = useToastStore((s) => s.addToast);
  const [tab, setTab] = useState<TabId>('requests');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);

  const [reqRows, setReqRows] = useState<AdminDbRequestRow[]>([]);
  const [msgRows, setMsgRows] = useState<AdminDbMessageRow[]>([]);
  const [histRows, setHistRows] = useState<AdminDbHistoryRow[]>([]);
  const [notifRows, setNotifRows] = useState<AdminDbNotificationRow[]>([]);
  const [coRows, setCoRows] = useState<AdminDbCounterOfferRow[]>([]);
  const [slaRows, setSlaRows] = useState<AdminDbSlaRow[]>([]);
  const [caRows, setCaRows] = useState<AdminDbChatAttachmentRow[]>([]);

  const [editReq, setEditReq] = useState<AdminDbRequestRow | null>(null);
  const [editMsg, setEditMsg] = useState<AdminDbMessageRow | null>(null);
  const [editHist, setEditHist] = useState<AdminDbHistoryRow | null>(null);
  const [editNotif, setEditNotif] = useState<AdminDbNotificationRow | null>(null);
  const [editCo, setEditCo] = useState<AdminDbCounterOfferRow | null>(null);
  const [editSla, setEditSla] = useState<AdminDbSlaRow | null>(null);
  const [editCa, setEditCa] = useState<AdminDbChatAttachmentRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit, search: search.trim() || undefined };
      if (tab === 'requests') {
        const r = await explorerListRequests(params);
        setReqRows(r.items);
        setTotal(r.total);
      } else if (tab === 'messages') {
        const r = await explorerListMessages(params);
        setMsgRows(r.items);
        setTotal(r.total);
      } else if (tab === 'history') {
        const r = await explorerListHistory(params);
        setHistRows(r.items);
        setTotal(r.total);
      } else if (tab === 'notifications') {
        const r = await explorerListNotifications(params);
        setNotifRows(r.items);
        setTotal(r.total);
      } else if (tab === 'counters') {
        const r = await explorerListCounterOffers(params);
        setCoRows(r.items);
        setTotal(r.total);
      } else if (tab === 'sla') {
        const r = await explorerListSla(params);
        setSlaRows(r.items);
        setTotal(r.total);
      } else if (tab === 'chat_att') {
        const r = await explorerListChatAttachments(params);
        setCaRows(r.items);
        setTotal(r.total);
      }
    } catch (e: unknown) {
      const ax = e as { response?: { data?: { error?: { message?: string } } } };
      addToast('error', ax.response?.data?.error?.message ?? 'Load failed');
    } finally {
      setLoading(false);
    }
  }, [tab, page, limit, search, addToast]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [tab, search]);

  const pages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-teal-200 dark:border-teal-900/50 bg-teal-50/80 dark:bg-teal-950/30 px-4 py-3 text-sm text-teal-900 dark:text-teal-100">
        <p className="font-semibold flex items-center gap-2">
          <Database className="h-5 w-5" />
          Full database access (admin only)
        </p>
        <p className="mt-1 text-teal-800/90 dark:text-teal-200/90">
          Edit or delete rows here — no Railway SQL or backend console needed. RM SMTP/IMAP email threads and email
          attachments are on{' '}
          <Link className="underline font-medium inline-flex items-center gap-1" to="/admin/mail">
            <Mail className="h-4 w-4" />
            Mail and files
          </Link>
          .
        </p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-gray-200 dark:border-gray-800 pb-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-3 py-2 rounded-lg text-sm font-medium ${
              tab === t.id
                ? 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-200'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
            placeholder="Search…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void load()}
          />
        </div>
        <Button type="button" variant="secondary" onClick={() => void load()}>
          <RefreshCw size={16} />
          Refresh
        </Button>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 min-h-[240px]">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
          </div>
        ) : (
          <>
            {total === 0 && (
              <div className="text-center py-12 text-sm text-gray-500">
                No rows for this section. Try clearing search or open another tab.
              </div>
            )}
            {total > 0 && tab === 'requests' && (
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-gray-50 dark:bg-gray-800/50 text-left text-gray-600 dark:text-gray-300">
                    <th className="px-3 py-2">Code</th>
                    <th className="px-3 py-2">Route</th>
                    <th className="px-3 py-2">Agent</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Price</th>
                    <th className="px-3 py-2">Updated</th>
                    <th className="px-3 py-2 w-24" />
                  </tr>
                </thead>
                <tbody>
                  {reqRows.map((r) => (
                    <tr key={r.id} className="border-b border-gray-100 dark:border-gray-800">
                      <td className="px-3 py-2 font-semibold text-gray-900 dark:text-white">{r.request_code}</td>
                      <td className="px-3 py-2">{r.route}</td>
                      <td className="px-3 py-2">{r.agent_name ?? '—'}</td>
                      <td className="px-3 py-2">
                        <StatusBadge status={r.status as RequestStatus} />
                      </td>
                      <td className="px-3 py-2">{r.price}</td>
                      <td className="px-3 py-2 text-gray-500">{fmt(r.updated_at)}</td>
                      <td className="px-3 py-2">
                        <div className="flex gap-1">
                          <button type="button" className="p-1 text-purple-600" onClick={() => setEditReq(r)}>
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            className="p-1 text-red-600"
                            onClick={() => {
                              if (window.confirm(`Delete request ${r.request_code}?`))
                                explorerDeleteRequest(r.id).then(load).catch(() => addToast('error', 'Delete failed'));
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {total > 0 && tab === 'messages' && (
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-gray-50 dark:bg-gray-800/50 text-left">
                    <th className="px-3 py-2">Request</th>
                    <th className="px-3 py-2">Type</th>
                    <th className="px-3 py-2">Preview</th>
                    <th className="px-3 py-2">Time</th>
                    <th className="px-3 py-2 w-24" />
                  </tr>
                </thead>
                <tbody>
                  {msgRows.map((m) => (
                    <tr key={m.id} className="border-b border-gray-100 dark:border-gray-800 align-top">
                      <td className="px-3 py-2 font-mono text-[11px]">{m.request_code}</td>
                      <td className="px-3 py-2">{m.type}</td>
                      <td className="px-3 py-2 max-w-md line-clamp-3">{m.content}</td>
                      <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{fmt(m.created_at)}</td>
                      <td className="px-3 py-2">
                        <div className="flex gap-1">
                          <button type="button" className="p-1 text-purple-600" onClick={() => setEditMsg(m)}>
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            className="p-1 text-red-600"
                            onClick={() => {
                              if (window.confirm('Delete this message row?'))
                                explorerDeleteMessage(m.id).then(load).catch(() => addToast('error', 'Delete failed'));
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {total > 0 && tab === 'history' && (
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-gray-50 dark:bg-gray-800/50 text-left">
                    <th className="px-3 py-2">Request</th>
                    <th className="px-3 py-2">Action</th>
                    <th className="px-3 py-2">Details</th>
                    <th className="px-3 py-2">Time</th>
                    <th className="px-3 py-2 w-24" />
                  </tr>
                </thead>
                <tbody>
                  {histRows.map((h) => (
                    <tr key={h.id} className="border-b border-gray-100 dark:border-gray-800 align-top">
                      <td className="px-3 py-2">{h.request_code}</td>
                      <td className="px-3 py-2">{h.action}</td>
                      <td className="px-3 py-2 max-w-sm line-clamp-2">{h.details ?? '—'}</td>
                      <td className="px-3 py-2 text-gray-500">{fmt(h.created_at)}</td>
                      <td className="px-3 py-2">
                        <div className="flex gap-1">
                          <button type="button" className="p-1 text-purple-600" onClick={() => setEditHist(h)}>
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            className="p-1 text-red-600"
                            onClick={() => {
                              if (window.confirm('Delete history row?'))
                                explorerDeleteHistory(h.id).then(load).catch(() => addToast('error', 'Delete failed'));
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {total > 0 && tab === 'notifications' && (
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-gray-50 dark:bg-gray-800/50 text-left">
                    <th className="px-3 py-2">User</th>
                    <th className="px-3 py-2">Title</th>
                    <th className="px-3 py-2">Read</th>
                    <th className="px-3 py-2">Time</th>
                    <th className="px-3 py-2 w-24" />
                  </tr>
                </thead>
                <tbody>
                  {notifRows.map((n) => (
                    <tr key={n.id} className="border-b border-gray-100 dark:border-gray-800 align-top">
                      <td className="px-3 py-2 break-all">{n.user_email}</td>
                      <td className="px-3 py-2 max-w-xs line-clamp-2">{n.title}</td>
                      <td className="px-3 py-2">{n.is_read ? 'yes' : 'no'}</td>
                      <td className="px-3 py-2 text-gray-500">{fmt(n.created_at)}</td>
                      <td className="px-3 py-2">
                        <div className="flex gap-1">
                          <button type="button" className="p-1 text-purple-600" onClick={() => setEditNotif(n)}>
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            className="p-1 text-red-600"
                            onClick={() => {
                              if (window.confirm('Delete notification?'))
                                explorerDeleteNotification(n.id).then(load).catch(() => addToast('error', 'Delete failed'));
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {total > 0 && tab === 'counters' && (
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-gray-50 dark:bg-gray-800/50 text-left">
                    <th className="px-3 py-2">Request</th>
                    <th className="px-3 py-2">Counter</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2 w-24" />
                  </tr>
                </thead>
                <tbody>
                  {coRows.map((c) => (
                    <tr key={c.id} className="border-b border-gray-100 dark:border-gray-800">
                      <td className="px-3 py-2">{c.request_code}</td>
                      <td className="px-3 py-2">{c.counter_price}</td>
                      <td className="px-3 py-2">{c.status}</td>
                      <td className="px-3 py-2">
                        <div className="flex gap-1">
                          <button type="button" className="p-1 text-purple-600" onClick={() => setEditCo(c)}>
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            className="p-1 text-red-600"
                            onClick={() => {
                              if (window.confirm('Delete counter offer?'))
                                explorerDeleteCounterOffer(c.id).then(load).catch(() => addToast('error', 'Delete failed'));
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {total > 0 && tab === 'sla' && (
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-gray-50 dark:bg-gray-800/50 text-left">
                    <th className="px-3 py-2">Request</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Deadline</th>
                    <th className="px-3 py-2">Breached</th>
                    <th className="px-3 py-2 w-24" />
                  </tr>
                </thead>
                <tbody>
                  {slaRows.map((s) => (
                    <tr key={s.id} className="border-b border-gray-100 dark:border-gray-800">
                      <td className="px-3 py-2">{s.request_code}</td>
                      <td className="px-3 py-2">{s.status}</td>
                      <td className="px-3 py-2">{fmt(s.deadline_at)}</td>
                      <td className="px-3 py-2">{s.is_breached ? 'yes' : 'no'}</td>
                      <td className="px-3 py-2">
                        <div className="flex gap-1">
                          <button type="button" className="p-1 text-purple-600" onClick={() => setEditSla(s)}>
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            className="p-1 text-red-600"
                            onClick={() => {
                              if (window.confirm('Delete SLA row?'))
                                explorerDeleteSla(s.id).then(load).catch(() => addToast('error', 'Delete failed'));
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {total > 0 && tab === 'chat_att' && (
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-gray-50 dark:bg-gray-800/50 text-left">
                    <th className="px-3 py-2">Request</th>
                    <th className="px-3 py-2">File</th>
                    <th className="px-3 py-2">Size</th>
                    <th className="px-3 py-2 w-24" />
                  </tr>
                </thead>
                <tbody>
                  {caRows.map((a) => (
                    <tr key={a.id} className="border-b border-gray-100 dark:border-gray-800">
                      <td className="px-3 py-2">{a.request_code}</td>
                      <td className="px-3 py-2">
                        <a href={a.file_url} target="_blank" rel="noopener noreferrer" className="text-teal-600 break-all">
                          {a.filename}
                        </a>
                      </td>
                      <td className="px-3 py-2">{a.file_size}</td>
                      <td className="px-3 py-2">
                        <div className="flex gap-1">
                          <button type="button" className="p-1 text-purple-600" onClick={() => setEditCa(a)}>
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            className="p-1 text-red-600"
                            onClick={() => {
                              if (window.confirm('Delete chat attachment row?'))
                                explorerDeleteChatAttachment(a.id).then(load).catch(() => addToast('error', 'Delete failed'));
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}
      </div>

      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>
          Page {page} / {pages} — {total} rows
        </span>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Prev
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page >= pages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      </div>

      {editReq && (
        <Modal title={`Edit ${editReq.request_code}`} onClose={() => setEditReq(null)}>
          <ReqEditForm
            row={editReq}
            onSave={async (payload) => {
              await explorerUpdateRequest(editReq.id, payload);
              addToast('success', 'Saved');
              setEditReq(null);
              void load();
            }}
          />
        </Modal>
      )}
      {editMsg && (
        <Modal title="Edit message" onClose={() => setEditMsg(null)}>
          <MsgEditForm
            row={editMsg}
            onSave={async (payload) => {
              await explorerUpdateMessage(editMsg.id, payload);
              addToast('success', 'Saved');
              setEditMsg(null);
              void load();
            }}
          />
        </Modal>
      )}
      {editHist && (
        <Modal title="Edit history details" onClose={() => setEditHist(null)}>
          <textarea
            className="w-full border rounded-lg p-2 text-sm min-h-[120px]"
            defaultValue={editHist.details ?? ''}
            id="hist-details"
          />
          <div className="flex justify-end gap-2 mt-3">
            <Button type="button" variant="secondary" onClick={() => setEditHist(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={async () => {
                const el = document.getElementById('hist-details') as HTMLTextAreaElement;
                await explorerUpdateHistory(editHist.id, { details: el.value });
                addToast('success', 'Saved');
                setEditHist(null);
                void load();
              }}
            >
              Save
            </Button>
          </div>
        </Modal>
      )}
      {editNotif && (
        <Modal title="Edit notification" onClose={() => setEditNotif(null)}>
          <NotifEditForm
            row={editNotif}
            onSave={async (payload) => {
              await explorerUpdateNotification(editNotif.id, payload);
              addToast('success', 'Saved');
              setEditNotif(null);
              void load();
            }}
          />
        </Modal>
      )}
      {editCo && (
        <Modal title="Edit counter offer" onClose={() => setEditCo(null)}>
          <CoEditForm
            row={editCo}
            onSave={async (payload) => {
              await explorerUpdateCounterOffer(editCo.id, payload);
              addToast('success', 'Saved');
              setEditCo(null);
              void load();
            }}
          />
        </Modal>
      )}
      {editSla && (
        <Modal title="Edit SLA row" onClose={() => setEditSla(null)}>
          <SlaEditForm
            row={editSla}
            onSave={async (payload) => {
              await explorerUpdateSla(editSla.id, payload);
              addToast('success', 'Saved');
              setEditSla(null);
              void load();
            }}
          />
        </Modal>
      )}
      {editCa && (
        <Modal title="Edit chat attachment" onClose={() => setEditCa(null)}>
          <CaEditForm
            row={editCa}
            onSave={async (payload) => {
              await explorerUpdateChatAttachment(editCa.id, payload);
              addToast('success', 'Saved');
              setEditCa(null);
              void load();
            }}
          />
        </Modal>
      )}
    </div>
  );
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-5 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900 dark:text-white">{title}</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ReqEditForm({
  row,
  onSave,
}: {
  row: AdminDbRequestRow;
  onSave: (p: Record<string, unknown>) => Promise<void>;
}) {
  const [route, setRoute] = useState(row.route);
  const [pax, setPax] = useState(String(row.pax));
  const [price, setPrice] = useState(String(row.price));
  const [status, setStatus] = useState(row.status);
  const [priority, setPriority] = useState(row.priority);
  const [notes, setNotes] = useState(row.notes ?? '');
  const [td, setTd] = useState(row.travel_date ?? '');
  const [rd, setRd] = useState(row.return_date ?? '');
  const [assign, setAssign] = useState(row.assigned_to ?? '');

  return (
    <div className="space-y-2 text-sm">
      <label className="block">
        Route
        <input className="mt-1 w-full border rounded px-2 py-1.5" value={route} onChange={(e) => setRoute(e.target.value)} />
      </label>
      <label className="block">
        PAX
        <input className="mt-1 w-full border rounded px-2 py-1.5" value={pax} onChange={(e) => setPax(e.target.value)} />
      </label>
      <label className="block">
        Price
        <input className="mt-1 w-full border rounded px-2 py-1.5" value={price} onChange={(e) => setPrice(e.target.value)} />
      </label>
      <label className="block">
        Status
        <input className="mt-1 w-full border rounded px-2 py-1.5" value={status} onChange={(e) => setStatus(e.target.value)} />
      </label>
      <label className="block">
        Priority
        <select
          className="mt-1 w-full border rounded px-2 py-1.5"
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
        >
          <option value="normal">normal</option>
          <option value="urgent">urgent</option>
        </select>
      </label>
      <label className="block">
        Notes
        <textarea className="mt-1 w-full border rounded px-2 py-1.5" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </label>
      <label className="block">
        Travel date
        <input type="date" className="mt-1 w-full border rounded px-2 py-1.5" value={td} onChange={(e) => setTd(e.target.value)} />
      </label>
      <label className="block">
        Return date
        <input type="date" className="mt-1 w-full border rounded px-2 py-1.5" value={rd} onChange={(e) => setRd(e.target.value)} />
      </label>
      <label className="block">
        Assigned user id (optional)
        <input className="mt-1 w-full border rounded px-2 py-1.5 font-mono text-xs" value={assign} onChange={(e) => setAssign(e.target.value)} />
      </label>
      <div className="flex justify-end gap-2 pt-2">
        <Button
          type="button"
          onClick={() =>
            onSave({
              route,
              pax: Number(pax),
              price: Number(price),
              status,
              priority,
              notes: notes || undefined,
              travel_date: td || undefined,
              return_date: rd || undefined,
              assigned_to: assign.trim() ? assign.trim() : null,
            })
          }
        >
          Save
        </Button>
      </div>
    </div>
  );
}

function MsgEditForm({
  row,
  onSave,
}: {
  row: AdminDbMessageRow;
  onSave: (p: {
    content?: string;
    type?: string;
    sender_role?: string | null;
    is_internal?: boolean;
  }) => Promise<void>;
}) {
  const [content, setContent] = useState(row.content);
  const [type, setType] = useState(row.type);
  const [role, setRole] = useState(row.sender_role ?? '');
  const [internal, setInternal] = useState(row.is_internal);
  return (
    <div className="space-y-2 text-sm">
      <label className="block">
        Content
        <textarea className="mt-1 w-full border rounded px-2 py-1.5 font-mono text-xs" rows={8} value={content} onChange={(e) => setContent(e.target.value)} />
      </label>
      <label className="block">
        Type
        <input className="mt-1 w-full border rounded px-2 py-1.5" value={type} onChange={(e) => setType(e.target.value)} />
      </label>
      <label className="block">
        Sender role
        <input className="mt-1 w-full border rounded px-2 py-1.5" value={role} onChange={(e) => setRole(e.target.value)} />
      </label>
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={internal} onChange={(e) => setInternal(e.target.checked)} />
        Internal
      </label>
      <div className="flex justify-end pt-2">
        <Button type="button" onClick={() => onSave({ content, type, sender_role: role || null, is_internal: internal })}>
          Save
        </Button>
      </div>
    </div>
  );
}

function NotifEditForm({
  row,
  onSave,
}: {
  row: AdminDbNotificationRow;
  onSave: (p: { title?: string; message?: string; is_read?: boolean }) => Promise<void>;
}) {
  const [title, setTitle] = useState(row.title);
  const [message, setMessage] = useState(row.message);
  const [read, setRead] = useState(row.is_read);
  return (
    <div className="space-y-2 text-sm">
      <label className="block">
        Title
        <input className="mt-1 w-full border rounded px-2 py-1.5" value={title} onChange={(e) => setTitle(e.target.value)} />
      </label>
      <label className="block">
        Message
        <textarea className="mt-1 w-full border rounded px-2 py-1.5" rows={4} value={message} onChange={(e) => setMessage(e.target.value)} />
      </label>
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={read} onChange={(e) => setRead(e.target.checked)} />
        Read
      </label>
      <div className="flex justify-end pt-2">
        <Button type="button" onClick={() => onSave({ title, message, is_read: read })}>
          Save
        </Button>
      </div>
    </div>
  );
}

function CoEditForm({
  row,
  onSave,
}: {
  row: AdminDbCounterOfferRow;
  onSave: (p: { counter_price?: number; message?: string | null; status?: string }) => Promise<void>;
}) {
  const [cp, setCp] = useState(String(row.counter_price));
  const [msg, setMsg] = useState(row.message ?? '');
  const [st, setSt] = useState(row.status);
  return (
    <div className="space-y-2 text-sm">
      <label className="block">
        Counter price
        <input className="mt-1 w-full border rounded px-2 py-1.5" value={cp} onChange={(e) => setCp(e.target.value)} />
      </label>
      <label className="block">
        Message
        <textarea className="mt-1 w-full border rounded px-2 py-1.5" rows={3} value={msg} onChange={(e) => setMsg(e.target.value)} />
      </label>
      <label className="block">
        Status
        <input className="mt-1 w-full border rounded px-2 py-1.5" value={st} onChange={(e) => setSt(e.target.value)} />
      </label>
      <div className="flex justify-end pt-2">
        <Button type="button" onClick={() => onSave({ counter_price: Number(cp), message: msg || null, status: st })}>
          Save
        </Button>
      </div>
    </div>
  );
}

function SlaEditForm({
  row,
  onSave,
}: {
  row: AdminDbSlaRow;
  onSave: (p: { deadline_at?: string | null; completed_at?: string | null; is_breached?: boolean }) => Promise<void>;
}) {
  const [dl, setDl] = useState(row.deadline_at.slice(0, 16));
  const [comp, setComp] = useState(row.completed_at ? row.completed_at.slice(0, 16) : '');
  const [br, setBr] = useState(row.is_breached);
  return (
    <div className="space-y-2 text-sm">
      <label className="block">
        Deadline (local)
        <input
          type="datetime-local"
          className="mt-1 w-full border rounded px-2 py-1.5"
          value={dl}
          onChange={(e) => setDl(e.target.value)}
        />
      </label>
      <label className="block">
        Completed (local, empty = null)
        <input
          type="datetime-local"
          className="mt-1 w-full border rounded px-2 py-1.5"
          value={comp}
          onChange={(e) => setComp(e.target.value)}
        />
      </label>
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={br} onChange={(e) => setBr(e.target.checked)} />
        Breached
      </label>
      <div className="flex justify-end pt-2">
        <Button
          type="button"
          onClick={() =>
            onSave({
              deadline_at: new Date(dl).toISOString(),
              completed_at: comp ? new Date(comp).toISOString() : null,
              is_breached: br,
            })
          }
        >
          Save
        </Button>
      </div>
    </div>
  );
}

function CaEditForm({
  row,
  onSave,
}: {
  row: AdminDbChatAttachmentRow;
  onSave: (p: { filename?: string; file_url?: string; file_type?: string }) => Promise<void>;
}) {
  const [fn, setFn] = useState(row.filename);
  const [url, setUrl] = useState(row.file_url);
  const [ft, setFt] = useState(row.file_type);
  return (
    <div className="space-y-2 text-sm">
      <label className="block">
        Filename
        <input className="mt-1 w-full border rounded px-2 py-1.5" value={fn} onChange={(e) => setFn(e.target.value)} />
      </label>
      <label className="block">
        URL
        <input className="mt-1 w-full border rounded px-2 py-1.5 font-mono text-xs" value={url} onChange={(e) => setUrl(e.target.value)} />
      </label>
      <label className="block">
        MIME
        <input className="mt-1 w-full border rounded px-2 py-1.5" value={ft} onChange={(e) => setFt(e.target.value)} />
      </label>
      <div className="flex justify-end pt-2">
        <Button type="button" onClick={() => onSave({ filename: fn, file_url: url, file_type: ft })}>
          Save
        </Button>
      </div>
    </div>
  );
}
