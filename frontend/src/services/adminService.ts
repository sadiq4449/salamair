import api from './api';
import type {
  AdminAgentItem,
  AdminAgentListResponse,
  AdminConfigItem,
  AdminCreateUserPayload,
  AdminCreateUserResponse,
  AdminEmailStatus,
  AdminEmailTestSendResponse,
  AdminLogListResponse,
  AdminStats,
  AdminUpdateUserPayload,
  AdminUserListResponse,
  AdminUpdateUserResponse,
  AdminPasswordResetResponse,
  PollInboxResponse,
} from '../types';

export async function getAdminStats(): Promise<AdminStats> {
  const { data } = await api.get<AdminStats>('/admin/stats');
  return data;
}

export async function getAdminEmailStatus(): Promise<AdminEmailStatus> {
  const { data } = await api.get<AdminEmailStatus>('/admin/email/status');
  return data;
}

export async function postAdminEmailTestSend(to?: string): Promise<AdminEmailTestSendResponse> {
  const { data } = await api.post<AdminEmailTestSendResponse>('/admin/email/test-send', {
    to: to || undefined,
  });
  return data;
}

export async function postAdminEmailTestInbox(): Promise<PollInboxResponse> {
  const { data } = await api.post<PollInboxResponse>('/admin/email/test-inbox');
  return data;
}

export async function listAdminUsers(params: {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  is_active?: boolean;
}): Promise<AdminUserListResponse> {
  const { data } = await api.get<AdminUserListResponse>('/admin/users', { params });
  return data;
}

export async function createAdminUser(payload: AdminCreateUserPayload): Promise<AdminCreateUserResponse> {
  const { data } = await api.post<AdminCreateUserResponse>('/admin/users', payload);
  return data;
}

export async function updateAdminUser(
  id: string,
  payload: AdminUpdateUserPayload
): Promise<AdminUpdateUserResponse> {
  const { data } = await api.put<AdminUpdateUserResponse>(`/admin/users/${id}`, payload);
  return data;
}

export async function deactivateAdminUser(id: string): Promise<{ message: string }> {
  const { data } = await api.put<{ message: string }>(`/admin/users/${id}/deactivate`);
  return data;
}

export async function activateAdminUser(id: string): Promise<{ message: string }> {
  const { data } = await api.put<{ message: string }>(`/admin/users/${id}/activate`);
  return data;
}

export async function resetAdminUserPassword(id: string): Promise<AdminPasswordResetResponse> {
  const { data } = await api.post<AdminPasswordResetResponse>(`/admin/users/${id}/reset-password`);
  return data;
}

export async function listAdminAgents(params: {
  page?: number;
  limit?: number;
  search?: string;
}): Promise<AdminAgentListResponse> {
  const { data } = await api.get<AdminAgentListResponse>('/admin/agents', { params });
  return data;
}

export async function updateAdminAgent(
  id: string,
  payload: { company_name?: string | null; credit_limit?: number }
): Promise<AdminAgentItem> {
  const { data } = await api.put<AdminAgentItem>(`/admin/agents/${id}`, payload);
  return data;
}

export async function listAdminLogs(params: {
  page?: number;
  limit?: number;
  action?: string;
  actor_id?: string;
  from?: string;
  to?: string;
}): Promise<AdminLogListResponse> {
  const { data } = await api.get<AdminLogListResponse>('/admin/logs', { params });
  return data;
}

export async function getAdminConfig(): Promise<{ items: AdminConfigItem[] }> {
  const { data } = await api.get<{ items: AdminConfigItem[] }>('/admin/config');
  return data;
}

export async function updateAdminConfig(
  items: { key: string; value: string }[]
): Promise<{ items: AdminConfigItem[] }> {
  const { data } = await api.put<{ items: AdminConfigItem[] }>('/admin/config', { items });
  return data;
}
