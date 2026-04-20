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
import Button from '../../components/ui/Button';
import CounterOfferModal from '../../components/CounterOfferModal';
import EmailPreviewModal from '../../components/EmailPreviewModal';
import EmailThreadView from '../../components/EmailThreadView';
import UnifiedTimeline from '../../components/chat/UnifiedTimeline';
import AiPricingAssistant from '../../components/AiPricingAssistant';
import EmailThreadSummaryCard from '../../components/EmailThreadSummaryCard';

export default function SalesRequestDetail() {
  const { user } = useAuth();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    currentRequest,
    isDetailLoading,
    isLoading,
    fetchRequest,
    fetchHistory,
    clearHistory,
    claimRequest,
    updateStatus,
    clearCurrent,
  } = useRequestStore();
  const { clearThread } = useEmailStore();
  const [activeTab, setActiveTab] = useState<'agent-sales' | 'sales-rm'>('agent-sales');
  const [showCounter, setShowCounter] = useState(false);
  const [showEmailPreview, setShowEmailPreview] = useState(false);

  useEffect(() => {
    if (id) {
      fetchRequest(id);
    }
    return () => {
      clearCurrent();
      clearThread();
    };
  }, [id, fetchRequest, clearCurrent, clearThread]);

  const isSales = user?.role === 'sales';
  const conversationUnlocked =
    !isSales || (currentRequest?.assigned_to != null && currentRequest.assigned_to === user?.id);

  useEffect(() => {
    if (!id || !currentRequest) return;
    if (conversationUnlocked) {
      void fetchHistory(id);
    } else {
      clearHistory();
    }
  }, [id, currentRequest?.assigned_to, conversationUnlocked, fetchHistory, clearHistory]);

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
  const isTerminal = ['approved', 'rejected'].includes(req.status);

  async function handleClaim() {
    if (id) await claimRequest(id);
  }

  async function handleApprove() {
    if (id) await updateStatus(id, { status: 'approved' });
  }

  async function handleReject() {
    if (id) await updateStatus(id, { status: 'rejected' });
  }

  function handleEmailSent() {
    if (id) fetchRequest(id);
  }

  return (
    <div className="space-y-5">
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
      >
        <ArrowLeft size={16} />
        Back to Queue
      </button>

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

          {/* Communication Card */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">Communication</h3>
              <div className="flex border-b-2 border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setActiveTab('agent-sales')}
                  className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-[2px] transition-colors ${
                    activeTab === 'agent-sales'
                      ? 'border-teal-600 text-teal-700 dark:text-teal-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                  }`}
                >
                  Agent ↔ Sales
                </button>
                <button
                  onClick={() => setActiveTab('sales-rm')}
                  className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-[2px] transition-colors flex items-center gap-2 ${
                    activeTab === 'sales-rm'
                      ? 'border-teal-600 text-teal-700 dark:text-teal-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                  }`}
                >
                  <Mail size={14} />
                  Sales ↔ RM (Email)
                </button>
              </div>
            </div>
            <div className="p-6">
              {isSales && !conversationUnlocked ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 p-4 text-sm text-amber-900 dark:text-amber-100">
                  <p className="font-medium mb-2">Conversation restricted</p>
                  <p className="text-amber-800/90 dark:text-amber-200/90 mb-3">
                    Chat and RM email are visible only to the sales user assigned to this request. Claim it to
                    continue.
                  </p>
                  <Button variant="warning" onClick={handleClaim} isLoading={isLoading}>
                    Claim this request
                  </Button>
                </div>
              ) : activeTab === 'agent-sales' ? (
                <UnifiedTimeline requestId={id!} />
              ) : (
                <EmailThreadView
                  requestId={id!}
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
          <AiPricingAssistant price={Number(req.price)} priority={req.priority} status={req.status} />
          <EmailThreadSummaryCard key={req.id} request={req} />

          {!isTerminal && (
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm">
              <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800">
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">Actions</h3>
              </div>
              <div className="p-4 space-y-2.5">
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
              </div>
            </div>
          )}

          {/* Attachments */}
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
      <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">{label}</p>
      <p className={`text-sm font-semibold ${highlight ? 'text-teal-600 dark:text-teal-400' : 'text-gray-900 dark:text-white'}`}>
        {value}
      </p>
    </div>
  );
}
