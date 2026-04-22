import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Paperclip, Loader2, RefreshCw, Mail } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useRequestStore } from '../../store/requestStore';
import { useNotificationStore } from '../../store/notificationStore';
import { useEmailStore } from '../../store/emailStore';
import AdminRequestControls from '../../components/admin/AdminRequestControls';
import StatusBadge from '../../components/ui/StatusBadge';
import StatusFlow from '../../components/StatusFlow';
import SlaIndicator from '../../components/SlaIndicator';
import RequestTagsEditor from '../../components/RequestTagsEditor';
import RequestHistoryPanel from '../../components/RequestHistoryPanel';
import UnifiedTimeline from '../../components/chat/UnifiedTimeline';
import EmailThreadView from '../../components/EmailThreadView';
import AiPricingAssistant from '../../components/AiPricingAssistant';
import CounterOfferPanel from '../../components/CounterOfferPanel';
import Button from '../../components/ui/Button';
import RequestDealExportButtons from '../../components/RequestDealExportButtons';

/** Backend may omit status on legacy rows; treat as pending when awaiting agent action. */
function isPendingOfferStatus(status: string | undefined | null): boolean {
  const t = (status ?? 'pending').trim().toLowerCase();
  return t === 'pending' || t === '';
}

export default function RequestDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentRequest, isDetailLoading, history, fetchRequest, clearCurrent } = useRequestStore();
  const { clearThread } = useEmailStore();
  const [commTab, setCommTab] = useState<'chat' | 'agentEmail' | 'rmEmail'>('chat');

  useEffect(() => {
    if (id) {
      void fetchRequest(id);
    }
    return () => {
      clearCurrent();
      clearThread();
    };
  }, [id, fetchRequest, clearCurrent, clearThread]);

  // Refetch when returning to the tab (agent may have missed a counter-offer while away).
  useEffect(() => {
    if (!id) return;
    const onVis = () => {
      if (document.visibilityState === 'visible') fetchRequest(id);
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [id, fetchRequest]);

  // When a COUNTER_OFFERED notification arrives for this request, reload detail (fixes stale open tabs).
  useEffect(() => {
    if (!id) return;
    return useNotificationStore.subscribe((state, prev) => {
      const prevLen = prev?.notifications?.length ?? 0;
      if (state.notifications.length <= prevLen) return;
      const newest = state.notifications[0];
      if (newest?.type === 'COUNTER_OFFERED' && newest.request_id === id) {
        fetchRequest(id);
      }
    });
  }, [id, fetchRequest]);

  if (isDetailLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    );
  }

  if (!currentRequest) {
    return (
      <div className="text-center py-20 text-gray-400">
        <p>Request not found</p>
      </div>
    );
  }

  const req = currentRequest;
  const pendingCounterOffer =
    req.status === 'counter_offered'
      ? (req.counter_offers ?? []).find((o) => isPendingOfferStatus(o.status)) ?? null
      : null;
  const showCounterOfferFallback = req.status === 'counter_offered' && !pendingCounterOffer;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors shrink-0"
        >
          <ArrowLeft size={16} />
          Back to Requests
        </button>
        {id && <RequestDealExportButtons requestId={id} />}
      </div>

      {user?.role === 'admin' && id && <AdminRequestControls request={req} requestId={id} />}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-5">
          {/* Request Info Card */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">Request Information</h3>
              <StatusBadge status={req.status} />
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
                <InfoItem label="Request ID" value={req.request_code} />
                <InfoItem label="Route" value={req.route} />
                <InfoItem label="Travel Date" value={req.travel_date ?? '—'} />
                <InfoItem label="Passengers" value={String(req.pax)} />
                <InfoItem label="Proposed Price" value={`${Number(req.price).toFixed(2)} OMR`} highlight />
                <InfoItem label="Agent" value={req.agent.name} />
              </div>
              <StatusFlow status={req.status} />
              {!['approved', 'rejected', 'draft'].includes(req.status) && id && (
                <div className="mt-4">
                  <SlaIndicator requestId={id} />
                </div>
              )}
              {id && (
                <RequestTagsEditor
                  requestId={id}
                  initialTags={req.tags ?? []}
                  onUpdated={() => id && fetchRequest(id)}
                />
              )}
            </div>
          </div>

          <RequestHistoryPanel events={history} />

          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">Communication</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                Use <strong className="text-gray-600 dark:text-gray-300">Portal chat</strong> for quick messages,{' '}
                <strong className="text-gray-600 dark:text-gray-300">email to / from sales</strong> for formal copies, and
                read the <strong className="text-gray-600 dark:text-gray-300">RM thread</strong> (read-only).
              </p>
              <div className="flex flex-wrap border-b-2 border-gray-200 dark:border-gray-700 gap-x-1">
                <button
                  type="button"
                  onClick={() => setCommTab('chat')}
                  className={`px-3 py-2.5 text-sm font-semibold border-b-2 -mb-[2px] transition-colors ${
                    commTab === 'chat'
                      ? 'border-teal-600 text-teal-700 dark:text-teal-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                  }`}
                >
                  Portal chat
                </button>
                <button
                  type="button"
                  onClick={() => setCommTab('agentEmail')}
                  className={`px-3 py-2.5 text-sm font-semibold border-b-2 -mb-[2px] transition-colors flex items-center gap-1.5 ${
                    commTab === 'agentEmail'
                      ? 'border-teal-600 text-teal-700 dark:text-teal-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                  }`}
                >
                  <Mail size={14} aria-hidden />
                  Email with sales
                </button>
                <button
                  type="button"
                  onClick={() => setCommTab('rmEmail')}
                  className={`px-3 py-2.5 text-sm font-semibold border-b-2 -mb-[2px] transition-colors flex items-center gap-1.5 ${
                    commTab === 'rmEmail'
                      ? 'border-teal-600 text-teal-700 dark:text-teal-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                  }`}
                >
                  <Mail size={14} aria-hidden />
                  Sales &amp; RM
                </button>
              </div>
            </div>
            <div className="p-6">
              {commTab === 'chat' ? (
                <UnifiedTimeline requestId={id!} />
              ) : commTab === 'agentEmail' ? (
                <EmailThreadView
                  key="agent-smtp"
                  requestId={id!}
                  channel="agent_sales"
                  requestStatus={req.status}
                  canReply
                  canSimulate={false}
                />
              ) : (
                <EmailThreadView
                  key="rm-smtp"
                  requestId={id!}
                  channel="rm"
                  requestStatus={req.status}
                  canReply={false}
                  canSimulate={false}
                  autoSyncInbox={false}
                />
              )}
            </div>
          </div>
        </div>

        {/* Right Column (demo: AI assistant + notes) */}
        <div className="space-y-5">
          {pendingCounterOffer && id && (
            <CounterOfferPanel requestId={id} offer={pendingCounterOffer} />
          )}

          {showCounterOfferFallback && id && (
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-amber-200 dark:border-amber-900/50 shadow-sm p-5 space-y-3">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">Counter offer</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                A counter offer is waiting for your response. If details do not appear, refresh — the latest offer loads from the server.
              </p>
              <Button
                type="button"
                variant="outline"
                fullWidth
                onClick={() => fetchRequest(id)}
                isLoading={isDetailLoading}
              >
                <RefreshCw size={16} />
                Refresh request
              </Button>
            </div>
          )}

          <AiPricingAssistant
            price={Number(req.price)}
            priority={req.priority}
            status={req.status}
            route={req.route}
            pax={req.pax}
            requestCode={req.request_code}
            travelDate={req.travel_date}
          />

          {/* Notes Card */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">Notes</h3>
            </div>
            <div className="p-6">
              {req.notes ? (
                <p className="text-sm text-gray-600 dark:text-gray-400">{req.notes}</p>
              ) : (
                <p className="text-sm text-gray-400 dark:text-gray-500 italic">No notes added</p>
              )}
            </div>
          </div>

          {/* Attachments Card */}
          {req.attachments && req.attachments.length > 0 && (
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm">
              <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800">
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">Attachments</h3>
              </div>
              <div className="p-4 space-y-2">
                {req.attachments.map((att) => (
                  <a
                    key={att.id}
                    href={att.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <Paperclip size={14} className="text-gray-400" />
                    <span className="text-sm text-teal-600 dark:text-teal-400 truncate">{att.filename}</span>
                    <span className="text-xs text-gray-400 ml-auto">{(att.file_size / 1024).toFixed(0)} KB</span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoItem({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">{label}</p>
      <p className={`text-sm font-semibold ${highlight ? 'text-teal-600 dark:text-teal-400' : 'text-gray-900 dark:text-white'}`}>
        {value}
      </p>
    </div>
  );
}
