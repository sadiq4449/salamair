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
  status: string;
  priority: string;
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
  status: string;
  priority: string;
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
