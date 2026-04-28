import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Paperclip, Loader2, CheckCircle, DollarSign, Mail, XCircle } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useRequestStore } from '../../store/requestStore';
import AdminRequestControls from '../../components/admin/AdminRequestControls';
import { useEmailStore } from '../../store/emailStore';
import StatusBadge from '../../components/ui/StatusBadge';
import StatusFlow from '../../components/StatusFlow';
import SlaIndicator from '../../components/SlaIndicator';
import RequestTagsEditor from '../../components/RequestTagsEditor';
import RequestHistoryPanel from '../../components/RequestHistoryPanel';
import SalesInternalNoteForm from '../../components/SalesInternalNoteForm';
import Button from '../../components/ui/Button';
import CounterOfferModal from '../../components/CounterOfferModal';
import EmailPreviewModal from '../../components/EmailPreviewModal';
import EmailThreadView from '../../components/EmailThreadView';
import UnifiedTimeline from '../../components/chat/UnifiedTimeline';
import AiPricingAssistant from '../../components/AiPricingAssistant';
import EmailThreadSummaryCard from '../../components/EmailThreadSummaryCard';
import type { CounterOffer } from '../../types';
import RequestDealExportButtons from '../../components/RequestDealExportButtons';
import { useToastStore } from '../../store/toastStore';

export default function SalesRequestDetail() {
  const { user } = useAuth();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentRequest, isDetailLoading, isLoading, history, fetchRequest, updateStatus, clearCurrent } = useRequestStore();
  const { clearThread } = useEmailStore();
  const { addToast } = useToastStore();
  const [activeTab, setActiveTab] = useState<'chat' | 'agentEmail' | 'rmEmail'>('chat');
  const [showCounter, setShowCounter] = useState(false);
  const [showEmailPreview, setShowEmailPreview] = useState(false);

  useEffect(() => {
    if (id) {
      void fetchRequest(id);
    }
    return () => { clearCurrent(); clearThread(); };
  }, [id, fetchRequest, clearCurrent, clearThread]);

  if (isDetailLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-[#00A99D]" />
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
  const isTerminal = ['approved', 'rejected'].includes(req.status);

  async function handleApprove() {
    if (id) await updateStatus(id, { status: 'approved' });
  }

  async function handleReject() {
    if (id) await updateStatus(id, { status: 'rejected' });
  }

  function handleEmailSent() {
    addToast('success', 'Email sent to Revenue Management.');
    if (id) void fetchRequest(id);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-sm text-[#00A99D] hover:text-[#009688] dark:text-[#2dd4bf] transition-all duration-200 shrink-0"
        >
          <ArrowLeft size={16} />
          Back to Queue
        </button>
        {id && <RequestDealExportButtons requestId={id} />}
      </div>

      {user?.role === 'admin' && id && <AdminRequestControls request={req} requestId={id} />}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-5">
          {/* Request Info Card */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-border dark:border-gray-800 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border dark:border-gray-800">
              <h3 className="text-xl font-semibold text-gray-800 dark:text-white">Request Information</h3>
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
              {!isTerminal && id && (
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

          {/* Communication Card */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-border dark:border-gray-800 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-border dark:border-gray-800">
              <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-3">Communication</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                <strong className="text-gray-700 dark:text-gray-300">Portal chat</strong> (instant),{' '}
                <strong className="text-gray-700 dark:text-gray-300">formal email to the agent</strong> (copied in the
                portal), and <strong className="text-gray-700 dark:text-gray-300">email to RM</strong>.
              </p>
              <div className="flex flex-wrap border-b-2 border-border dark:border-gray-700 gap-x-1">
                <button
                  type="button"
                  onClick={() => setActiveTab('chat')}
                  className={`px-3 py-2.5 text-sm font-semibold border-b-2 -mb-[2px] transition-all duration-200 ${
                    activeTab === 'chat'
                      ? 'border-[#00A99D] text-[#00A99D] dark:text-[#2dd4bf]'
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                  }`}
                >
                  Portal chat
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('agentEmail')}
                  className={`px-3 py-2.5 text-sm font-semibold border-b-2 -mb-[2px] transition-all duration-200 flex items-center gap-1.5 ${
                    activeTab === 'agentEmail'
                      ? 'border-[#00A99D] text-[#00A99D] dark:text-[#2dd4bf]'
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                  }`}
                >
                  <Mail size={14} />
                  Email to agent
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('rmEmail')}
                  className={`px-3 py-2.5 text-sm font-semibold border-b-2 -mb-[2px] transition-all duration-200 flex items-center gap-1.5 ${
                    activeTab === 'rmEmail'
                      ? 'border-[#00A99D] text-[#00A99D] dark:text-[#2dd4bf]'
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                  }`}
                >
                  <Mail size={14} />
                  Email to RM
                </button>
              </div>
            </div>
            <div className="p-6">
              {activeTab === 'chat' ? (
                <UnifiedTimeline requestId={id!} />
              ) : activeTab === 'agentEmail' ? (
                <EmailThreadView
                  key="agent-smtp"
                  requestId={id!}
                  channel="agent_sales"
                  requestRoute={req.route}
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
                  canReply
                  canSimulate
                />
              )}
            </div>
          </div>
        </div>

        {/* Right Column — order matches UI.demo_design/sales.html (AI, summary, actions, notes) */}
        <div className="space-y-5">
          <AiPricingAssistant
            price={Number(req.price)}
            priority={req.priority}
            status={req.status}
            route={req.route}
            pax={req.pax}
            requestCode={req.request_code}
            travelDate={req.travel_date}
          />
          <EmailThreadSummaryCard key={req.id} request={req} />

          {(user?.role === 'sales' || user?.role === 'admin') && id && <SalesInternalNoteForm requestId={id} />}

          {!isTerminal && (
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-border dark:border-gray-800 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-border dark:border-gray-800">
                <h3 className="text-xl font-semibold text-gray-800 dark:text-white">Actions</h3>
              </div>
              <div className="p-4 space-y-2.5">
                {req.status === 'counter_offered' ? (
                  <p className="text-sm text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/40 rounded-lg px-3 py-2.5 transition-all duration-200">
                    Awaiting agent response to the counter offer. Sales actions are paused until the agent accepts or rejects.
                  </p>
                ) : (
                  <>
                    <Button variant="success" fullWidth onClick={handleApprove} isLoading={isLoading}>
                      <CheckCircle size={16} />
                      Approve Request
                    </Button>
                    <Button variant="warning" fullWidth onClick={() => setShowCounter(true)}>
                      <DollarSign size={16} />
                      Counter Offer
                    </Button>
                    <Button variant="purple" fullWidth onClick={() => setShowEmailPreview(true)}>
                      <Mail size={16} />
                      Send to RM
                    </Button>
                    <Button variant="danger" fullWidth onClick={handleReject} isLoading={isLoading}>
                      <XCircle size={16} />
                      Reject
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}

          {(req.counter_offers ?? []).length > 0 && (
            <CounterOfferHistoryCard offers={req.counter_offers ?? []} />
          )}

          {/* Attachments */}
          {req.attachments && req.attachments.length > 0 && (
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-border dark:border-gray-800 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-border dark:border-gray-800">
                <h3 className="text-xl font-semibold text-gray-800 dark:text-white">Attachments</h3>
              </div>
              <div className="p-4 space-y-2">
                {req.attachments.map((att) => (
                  <a
                    key={att.id}
                    href={att.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200"
                  >
                    <Paperclip size={14} className="text-gray-400" />
                    <span className="text-sm text-[#00A99D] dark:text-[#2dd4bf] truncate">{att.filename}</span>
                    <span className="text-xs text-gray-400 ml-auto">{(att.file_size / 1024).toFixed(0)} KB</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Notes Card */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-border dark:border-gray-800 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-border dark:border-gray-800">
              <h3 className="text-xl font-semibold text-gray-800 dark:text-white">Notes</h3>
            </div>
            <div className="p-6">
              {req.notes ? (
                <p className="text-sm text-gray-600 dark:text-gray-400">{req.notes}</p>
              ) : (
                <p className="text-sm text-gray-400 dark:text-gray-500 italic">No notes added</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {id && (
        <CounterOfferModal
          isOpen={showCounter}
          onClose={() => setShowCounter(false)}
          requestId={id}
          currentPrice={req.price}
        />
      )}

      {currentRequest && (
        <EmailPreviewModal
          isOpen={showEmailPreview}
          onClose={() => setShowEmailPreview(false)}
          request={currentRequest}
          onSent={handleEmailSent}
        />
      )}
    </div>
  );
}

function InfoItem({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
      <p className={`text-sm font-semibold ${highlight ? 'text-[#00A99D] dark:text-[#2dd4bf]' : 'text-gray-900 dark:text-white'}`}>
        {value}
      </p>
    </div>
  );
}

const OFFER_STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-900/40',
  accepted: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-900/40',
  rejected: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-900/40',
};

function CounterOfferHistoryCard({ offers }: { offers: CounterOffer[] }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-border dark:border-gray-800 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-border dark:border-gray-800">
        <h3 className="text-xl font-semibold text-gray-800 dark:text-white">Counter Offers</h3>
      </div>
      <div className="p-4 space-y-2.5">
        {offers.map((o) => {
          const badge = OFFER_STATUS_STYLES[o.status] ?? OFFER_STATUS_STYLES.pending;
          return (
            <div
              key={o.id}
              className="rounded-lg border border-border dark:border-gray-800 p-3 space-y-1.5 transition-all duration-200"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {Number(o.counter_price).toFixed(2)} OMR
                    <span className="ml-2 text-xs font-normal text-gray-400 dark:text-gray-500 line-through">
                      {Number(o.original_price).toFixed(2)}
                    </span>
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {o.creator_name ? `by ${o.creator_name}` : 'by sales'} · {new Date(o.created_at).toLocaleString()}
                  </p>
                </div>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[0.65rem] font-semibold uppercase tracking-wide border ${badge}`}
                >
                  {o.status}
                </span>
              </div>
              {o.message && (
                <p className="text-xs text-gray-600 dark:text-gray-300 whitespace-pre-wrap">{o.message}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
