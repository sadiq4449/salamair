import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Paperclip, Send, Loader2, CheckCircle, DollarSign, Mail, XCircle } from 'lucide-react';
import { useRequestStore } from '../../store/requestStore';
import StatusBadge from '../../components/ui/StatusBadge';
import StatusFlow from '../../components/StatusFlow';
import Button from '../../components/ui/Button';
import CounterOfferModal from '../../components/CounterOfferModal';
import type { RequestStatus } from '../../types';

interface Message {
  id: string;
  author: string;
  initials: string;
  color: string;
  time: string;
  text: string;
}

const mockAgentSalesMessages: Message[] = [
  { id: '1', author: 'Agent', initials: 'AG', color: 'bg-teal-500', time: '3 hours ago', text: 'We need urgent approval for this group booking. Client is waiting for confirmation.' },
  { id: '2', author: 'Sales Team', initials: 'ST', color: 'bg-blue-500', time: '2 hours ago', text: 'Reviewing the request now. The pricing looks competitive for this route.' },
];

const mockSalesRMMessages: Message[] = [
  { id: '1', author: 'Sales Team', initials: 'ST', color: 'bg-blue-500', time: '1 hour ago', text: 'Requesting RM approval for special group rate on MCT-DXB route.' },
  { id: '2', author: 'RM Team', initials: 'RM', color: 'bg-purple-500', time: '30 min ago', text: 'Checking fare class availability. Will confirm shortly.' },
];

export default function SalesRequestDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentRequest, isDetailLoading, isLoading, fetchRequest, fetchHistory, updateStatus, sendToRM, clearCurrent } = useRequestStore();
  const [activeTab, setActiveTab] = useState<'agent-sales' | 'sales-rm'>('agent-sales');
  const [newMessage, setNewMessage] = useState('');
  const [showCounter, setShowCounter] = useState(false);

  useEffect(() => {
    if (id) {
      fetchRequest(id);
      fetchHistory(id);
    }
    return () => clearCurrent();
  }, [id, fetchRequest, fetchHistory, clearCurrent]);

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
  const messages = activeTab === 'agent-sales' ? mockAgentSalesMessages : mockSalesRMMessages;
  const isTerminal = ['approved', 'rejected'].includes(req.status);

  async function handleApprove() {
    if (id) await updateStatus(id, { status: 'approved' });
  }

  async function handleReject() {
    if (id) await updateStatus(id, { status: 'rejected' });
  }

  async function handleSendToRM() {
    if (id) await sendToRM(id);
  }

  return (
    <div className="space-y-5">
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
      >
        <ArrowLeft size={16} />
        Back to Queue
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-5">
          {/* Request Info Card */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">Request Information</h3>
              <StatusBadge status={req.status as RequestStatus} />
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
                <InfoItem label="Request ID" value={req.request_code} />
                <InfoItem label="Route" value={req.route} />
                <InfoItem label="Travel Date" value={req.travel_date ?? '—'} />
                <InfoItem label="Passengers" value={String(req.pax)} />
                <InfoItem label="Proposed Price" value={`${req.price.toFixed(2)} OMR`} highlight />
                <InfoItem label="Agent" value={req.agent.name} />
              </div>

              <StatusFlow status={req.status as RequestStatus} />
            </div>
          </div>

          {/* Communication Card */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">Communication</h3>
              <div className="flex gap-1">
                <button
                  onClick={() => setActiveTab('agent-sales')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === 'agent-sales'
                      ? 'bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400'
                      : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                  }`}
                >
                  Agent ↔ Sales
                </button>
                <button
                  onClick={() => setActiveTab('sales-rm')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === 'sales-rm'
                      ? 'bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400'
                      : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                  }`}
                >
                  Sales ↔ RM (Email)
                </button>
              </div>
            </div>
            <div className="p-6">
              {/* Message Timeline */}
              <div className="space-y-4 mb-5">
                {messages.map((msg) => (
                  <div key={msg.id} className="flex gap-3">
                    <div className={`w-9 h-9 rounded-full ${msg.color} flex items-center justify-center text-white text-xs font-semibold shrink-0`}>
                      {msg.initials}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">{msg.author}</span>
                        <span className="text-xs text-gray-400">{msg.time}</span>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-800 border-l-3 border-teal-400 rounded-lg px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                        {msg.text}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Input area */}
              <div className="flex items-center gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
                <input
                  type="text"
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="flex-1 px-4 py-2.5 border rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 outline-none focus:border-teal-500 focus:ring-3 focus:ring-teal-500/10"
                />
                <button className="p-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                  <Paperclip size={18} />
                </button>
                <button className="p-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors">
                  <Send size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-5">
          {/* Actions Card */}
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
                <Button variant="purple" fullWidth onClick={handleSendToRM} isLoading={isLoading}>
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
