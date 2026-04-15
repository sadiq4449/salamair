export type UserRole = 'agent' | 'sales' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  city?: string | null;
  is_active: boolean;
  created_at: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: { field: string; message: string }[];
  };
}

export type RequestStatus = 'draft' | 'submitted' | 'under_review' | 'rm_pending' | 'approved' | 'rejected' | 'counter_offered';
export type Priority = 'normal' | 'urgent';

export interface AgentInfo {
  id: string;
  name: string;
  city?: string | null;
}

export interface RequestItem {
  id: string;
  request_code: string;
  agent_id: string;
  agent_name: string | null;
  route: string;
  pax: number;
  price: number;
  travel_date: string | null;
  status: RequestStatus;
  priority: Priority;
  created_at: string;
}

export interface RequestDetail {
  id: string;
  request_code: string;
  agent_id: string;
  agent: AgentInfo;
  route: string;
  pax: number;
  price: number;
  travel_date: string | null;
  return_date: string | null;
  notes: string | null;
  status: RequestStatus;
  priority: Priority;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  attachments: Attachment[];
}

export interface Attachment {
  id: string;
  filename: string;
  file_url: string;
  file_type: string;
  file_size: number;
  uploaded_at: string;
}

export interface RequestListResponse {
  items: RequestItem[];
  total: number;
  page: number;
  limit: number;
}

export interface HistoryEvent {
  id: string;
  action: string;
  from_status: string | null;
  to_status: string | null;
  actor: string;
  details: string | null;
  created_at: string;
}

export interface CounterOffer {
  id: string;
  original_price: number;
  counter_price: number;
  message: string | null;
  status: string;
  created_at: string;
}

// ── Email Types (Iteration 4) ──

export type EmailDirection = 'incoming' | 'outgoing';
export type EmailStatus = 'sent' | 'delivered' | 'bounced' | 'failed' | 'received';

export interface EmailAttachmentItem {
  id: string;
  filename: string;
  file_url: string;
  file_type: string;
  file_size: number;
}

export interface EmailMessageItem {
  id: string;
  direction: EmailDirection;
  from_email: string;
  to_email: string;
  subject: string;
  body: string;
  status: EmailStatus;
  attachments: EmailAttachmentItem[];
  sent_at: string;
  received_at: string | null;
  created_at: string;
}

export interface EmailThread {
  request_code: string;
  thread_id: string;
  subject: string;
  rm_email: string;
  status: string;
  emails: EmailMessageItem[];
}

export interface SendEmailPayload {
  request_id: string;
  to?: string;
  message: string;
  include_attachments?: boolean;
}

export interface ReplyEmailPayload {
  request_id: string;
  thread_id: string;
  message: string;
}

export interface SendEmailResponse {
  message: string;
  email_id: string;
  request_code: string;
  status: string;
  sent_at: string;
}

export interface PollInboxResponse {
  ok: boolean;
  skipped?: boolean;
  reason?: string | null;
  processed: number;
  stored: number;
  errors: string[];
}

export interface ReplyEmailResponse {
  message: string;
  email_id: string;
  sent_at: string;
}

// ── Message / Chat Types (Iteration 5) ──

export type MessageType = 'chat' | 'email' | 'system';

export interface MessageSender {
  id: string | null;
  name: string;
  role: 'agent' | 'sales' | 'rm' | 'system';
}

export interface MessageAttachmentItem {
  id: string;
  filename: string;
  file_url: string;
  file_type: string;
  file_size: number;
}

export interface ChatMessage {
  id: string;
  request_id: string;
  type: MessageType;
  sender: MessageSender | null;
  content: string;
  attachments: MessageAttachmentItem[];
  is_read: boolean;
  timestamp: string;
}

export interface MessageListResponse {
  items: ChatMessage[];
  total: number;
  page: number;
  limit: number;
}

export interface WsEvent {
  event: string;
  data: Record<string, unknown>;
}

export interface TypingUser {
  user_id: string;
  name: string;
  is_typing: boolean;
}

// ── Notification Types (Iteration 6) ──

export type NotificationType =
  | 'REQUEST_CREATED'
  | 'REQUEST_APPROVED'
  | 'REQUEST_REJECTED'
  | 'COUNTER_OFFERED'
  | 'SENT_TO_RM'
  | 'EMAIL_RECEIVED'
  | 'NEW_MESSAGE'
  | 'SLA_WARNING'
  | 'SLA_BREACHED'
  | 'REQUEST_ASSIGNED';

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  request_id: string | null;
  request_code: string | null;
  is_read: boolean;
  created_at: string;
}

export interface NotificationListResponse {
  items: NotificationItem[];
  total: number;
  unread_count: number;
  page: number;
  limit: number;
}

export interface NotificationPreferences {
  in_app_enabled: boolean;
  email_enabled: boolean;
  sound_enabled: boolean;
  types_disabled: string[];
}

export type SlaColor = 'green' | 'yellow' | 'orange' | 'red';

export interface SlaInfo {
  deadline: string;
  remaining_seconds: number;
  total_seconds: number;
  percentage: number;
  color: SlaColor;
  label: string;
}

export interface SlaResponse {
  request_id: string;
  request_code: string;
  status: string;
  sla: SlaInfo | null;
}
