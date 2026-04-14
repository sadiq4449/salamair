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

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: { field: string; message: string }[];
  };
}
