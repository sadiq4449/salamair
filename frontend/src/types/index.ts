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

export interface TagBrief {
  id: string;
  name: string;
  color: string;
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
  /** Sales queue: null = unassigned pool */
  assigned_to?: string | null;
  tags?: TagBrief[];
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
  tags?: TagBrief[];
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
  /** Portal-outgoing HTML (our template); shown in thread when present for nicer layout */
  html_body?: string | null;
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
  smtp_delivered?: boolean;
  smtp_error?: string | null;
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
  smtp_delivered?: boolean;
  smtp_error?: string | null;
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
  segment_status?: string;
}

export interface SlaResponse {
  request_id: string;
  request_code: string;
  status: string;
  sla: SlaInfo | null;
}

// ── Admin (Iteration 8) ──

export interface AdminStats {
  total_users: number;
  active_users_today: number;
  total_agents: number;
  total_sales: number;
  total_admins: number;
  requests_today: number;
  pending_requests: number;
  emails_sent_today: number;
  system_uptime: string;
}

export interface AdminEmailStatus {
  email_sending_active: boolean;
  imap_polling_active: boolean;
  smtp_host: string;
  smtp_port: number;
  smtp_from_email: string;
  smtp_use_tls: boolean;
  smtp_implicit_ssl: boolean;
  smtp_timeout_seconds: number;
  resend_configured: boolean;
  resend_outbound_summary?: string | null;
  resend_test_sender_mode?: boolean;
  smtp_user_configured: boolean;
  smtp_password_configured: boolean;
  email_enabled_env: boolean | null;
  imap_host: string;
  imap_port: number;
  imap_use_ssl: boolean;
  imap_user_configured: boolean;
  imap_password_configured: boolean;
  imap_enabled_env: boolean | null;
  rm_default_email: string;
}

export interface AdminEmailTestSendResponse {
  success: boolean;
  message: string;
  sent_to: string;
  smtp_error?: string | null;
}

export interface AdminUserRow {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  city?: string | null;
  is_active: boolean;
  created_at: string;
  last_login?: string | null;
}

export interface AdminUserListResponse {
  items: AdminUserRow[];
  total: number;
  page: number;
  limit: number;
}

export interface AdminCreateUserPayload {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  city?: string | null;
  company_name?: string | null;
  credit_limit?: number;
}

export interface AdminCreateUserResponse {
  id: string;
  name: string;
  email: string;
  role: string;
  city?: string | null;
  is_active: boolean;
  created_at: string;
}

export interface AdminUpdateUserPayload {
  name?: string;
  email?: string;
  role?: UserRole;
  city?: string | null;
}

export interface AdminUpdateUserResponse {
  message: string;
  user: AdminUserRow;
}

export interface AdminPasswordResetResponse {
  message: string;
  email_sent: boolean;
  temporary_password?: string | null;
}

export interface AdminAgentItem {
  id: string;
  name: string;
  email: string;
  city?: string | null;
  company_name?: string | null;
  credit_limit: string | number;
  requests_count: number;
  is_active: boolean;
}

export interface AdminAgentListResponse {
  items: AdminAgentItem[];
  total: number;
  page: number;
  limit: number;
}

export interface AdminLogActor {
  id: string | null;
  name: string;
  role: string;
}

export interface AdminLogTarget {
  type: string;
  id?: string | null;
  name?: string | null;
}

export interface AdminLogRow {
  id: string;
  action: string;
  actor: AdminLogActor;
  target: AdminLogTarget | null;
  details: string | null;
  ip_address: string | null;
  timestamp: string;
}

export interface AdminLogListResponse {
  items: AdminLogRow[];
  total: number;
  page: number;
  limit: number;
}

export interface AdminConfigItem {
  key: string;
  value: string;
  description?: string | null;
}

/** Admin mail & attachment explorer (human-readable DB view) */
export interface AdminEmailThreadListItem {
  thread_id: string;
  request_id: string;
  request_code: string;
  route: string;
  request_status: string;
  agent_name: string | null;
  subject: string;
  rm_email: string;
  thread_status: string;
  message_count: number;
  last_activity_at: string;
  preview: string;
}

export interface AdminEmailThreadListResponse {
  items: AdminEmailThreadListItem[];
  total: number;
  page: number;
  limit: number;
}

export interface AdminEmailAttachmentItem {
  id: string;
  filename: string;
  file_url: string;
  file_type: string;
  file_size: number;
}

export interface AdminEmailMessageDetail {
  id: string;
  thread_id: string;
  direction: string;
  from_email: string;
  to_email: string;
  subject: string;
  body: string;
  html_body: string | null;
  message_id: string | null;
  in_reply_to: string | null;
  status: string;
  sent_at: string;
  received_at: string | null;
  created_at: string;
  attachments: AdminEmailAttachmentItem[];
}

export interface AdminEmailThreadDetailResponse {
  thread_id: string;
  request_id: string;
  request_code: string;
  route: string;
  request_status: string;
  subject: string;
  rm_email: string;
  thread_status: string;
  created_at: string;
  updated_at: string;
  messages: AdminEmailMessageDetail[];
}

export interface AdminRequestAttachmentListItem {
  id: string;
  request_id: string;
  request_code: string;
  route: string;
  request_status: string;
  agent_name: string | null;
  filename: string;
  file_url: string;
  file_type: string;
  file_size: number;
  uploaded_at: string;
}

export interface AdminRequestAttachmentListResponse {
  items: AdminRequestAttachmentListItem[];
  total: number;
  page: number;
  limit: number;
}

/** Admin DB explorer (/admin/db/*) */
export interface AdminDbRequestRow {
  id: string;
  request_code: string;
  agent_id: string;
  agent_name: string | null;
  route: string;
  pax: number;
  price: number;
  status: string;
  priority: string;
  travel_date: string | null;
  return_date: string | null;
  notes: string | null;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminDbListResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export interface AdminDbMessageRow {
  id: string;
  request_id: string;
  request_code: string;
  sender_id: string | null;
  sender_name: string | null;
  type: string;
  sender_role: string | null;
  content: string;
  is_internal: boolean;
  created_at: string;
}

export interface AdminDbHistoryRow {
  id: string;
  request_id: string;
  request_code: string;
  action: string;
  from_status: string | null;
  to_status: string | null;
  actor_id: string;
  actor_name: string | null;
  details: string | null;
  created_at: string;
}

export interface AdminDbNotificationRow {
  id: string;
  user_id: string;
  user_email: string;
  type: string;
  title: string;
  message: string;
  request_id: string | null;
  request_code: string | null;
  is_read: boolean;
  is_email_sent: boolean;
  created_at: string;
}

export interface AdminDbCounterOfferRow {
  id: string;
  request_id: string;
  request_code: string;
  original_price: number;
  counter_price: number;
  message: string | null;
  created_by: string;
  creator_name: string | null;
  status: string;
  created_at: string;
}

export interface AdminDbSlaRow {
  id: string;
  request_id: string;
  request_code: string;
  status: string;
  started_at: string;
  deadline_at: string;
  completed_at: string | null;
  is_breached: boolean;
}

export interface AdminDbChatAttachmentRow {
  id: string;
  message_id: string;
  request_id: string;
  request_code: string;
  filename: string;
  file_url: string;
  file_type: string;
  file_size: number;
}
