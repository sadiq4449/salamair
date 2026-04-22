import api from './api';
import type {
  AdminAgentItem,
  AdminAgentListResponse,
  AdminConfigItem,
  AdminCreateUserPayload,
  AdminCreateUserResponse,
  AdminEmailAttachmentItem,
  AdminEmailMessageDetail,
  AdminEmailStatus,
  AdminEmailTestSendResponse,
  AdminEmailThreadDetailResponse,
  AdminEmailThreadListResponse,
  AdminLogListResponse,
  AdminPasswordResetResponse,
  AdminRequestAttachmentListItem,
  AdminRequestAttachmentListResponse,
  AdminDbRequestRow,
  AdminDbListResponse,
  AdminDbMessageRow,
  AdminDbHistoryRow,
  AdminDbNotificationRow,
  AdminDbCounterOfferRow,
  AdminDbSlaRow,
  AdminDbChatAttachmentRow,
  AdminStats,
  AdminUpdateUserPayload,
  AdminUserListResponse,
  AdminUpdateUserResponse,
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

export async function adminListEmailThreads(params: {
  page?: number;
  limit?: number;
  search?: string;
}): Promise<AdminEmailThreadListResponse> {
  const { data } = await api.get<AdminEmailThreadListResponse>('/admin/email-threads', { params });
  return data;
}

function _filenameFromContentDisposition(cd: string | undefined, fallback: string): string {
  if (!cd) return fallback;
  const star = /filename\*=(?:UTF-8'')?([^;\n]+)/i.exec(cd);
  if (star) {
    try {
      return decodeURIComponent(star[1].trim().replace(/^["']|["']$/g, ''));
    } catch {
      /* fall through */
    }
  }
  const q = /filename="([^"]+)"/i.exec(cd);
  if (q) return q[1];
  const u = /filename=([^;\s]+)/i.exec(cd);
  return u ? u[1].replace(/^["']|["']$/g, '') : fallback;
}

function _triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Admin: download all Sales ↔ RM email threads (ZIP = one .txt per request, or single TXT). */
/** Admin: one PDF of users, all requests (deal+chat+RM), and system audit log — for text backup. */
export async function adminDownloadFullPortalBackupPdf(): Promise<void> {
  const res = await api.get('/admin/backup/full-pdf', { responseType: 'blob' });
  const name = _filenameFromContentDisposition(
    res.headers['content-disposition'] as string | undefined,
    'smartdeal-full-backup.pdf'
  );
  _triggerBlobDownload(res.data as Blob, name);
}

export async function adminDownloadAllEmailThreads(format: 'zip' | 'txt' = 'zip'): Promise<void> {
  const fallback = format === 'zip' ? 'rm-email-threads-all.zip' : 'rm-email-threads-all.txt';
  const res = await api.get('/admin/email-threads/export', {
    params: { format },
    responseType: 'blob',
  });
  const name = _filenameFromContentDisposition(
    res.headers['content-disposition'] as string | undefined,
    fallback
  );
  _triggerBlobDownload(res.data as Blob, name);
}

/** Admin: download one thread as plain text. */
export async function adminDownloadEmailThread(threadId: string): Promise<void> {
  const res = await api.get(`/admin/email-threads/${threadId}/export`, { responseType: 'blob' });
  const name = _filenameFromContentDisposition(
    res.headers['content-disposition'] as string | undefined,
    `thread-${threadId}.txt`
  );
  _triggerBlobDownload(res.data as Blob, name);
}

export async function adminGetEmailThread(threadId: string): Promise<AdminEmailThreadDetailResponse> {
  const { data } = await api.get<AdminEmailThreadDetailResponse>(`/admin/email-threads/${threadId}`);
  return data;
}

export async function adminUpdateEmailThread(
  threadId: string,
  payload: { subject?: string; rm_email?: string; status?: string }
): Promise<AdminEmailThreadDetailResponse> {
  const { data } = await api.put<AdminEmailThreadDetailResponse>(`/admin/email-threads/${threadId}`, payload);
  return data;
}

export async function adminDeleteEmailThread(threadId: string): Promise<void> {
  await api.delete(`/admin/email-threads/${threadId}`);
}

export async function adminUpdateEmailMessage(
  messageId: string,
  payload: {
    subject?: string;
    body?: string;
    html_body?: string | null;
    from_email?: string;
    to_email?: string;
    direction?: string;
    status?: string;
  }
): Promise<AdminEmailMessageDetail> {
  const { data } = await api.put<AdminEmailMessageDetail>(`/admin/email-messages/${messageId}`, payload);
  return data;
}

export async function adminDeleteEmailMessage(messageId: string): Promise<void> {
  await api.delete(`/admin/email-messages/${messageId}`);
}

export async function adminUpdateEmailAttachment(
  attachmentId: string,
  payload: { filename?: string; file_url?: string; file_type?: string }
): Promise<AdminEmailAttachmentItem> {
  const { data } = await api.put<AdminEmailAttachmentItem>(`/admin/email-attachments/${attachmentId}`, payload);
  return data;
}

export async function adminDeleteEmailAttachment(attachmentId: string): Promise<void> {
  await api.delete(`/admin/email-attachments/${attachmentId}`);
}

export async function adminListRequestAttachments(params: {
  page?: number;
  limit?: number;
  search?: string;
}): Promise<AdminRequestAttachmentListResponse> {
  const { data } = await api.get<AdminRequestAttachmentListResponse>('/admin/request-attachments', { params });
  return data;
}

export async function adminUpdateRequestAttachment(
  attachmentId: string,
  payload: { filename?: string; file_url?: string; file_type?: string }
): Promise<AdminRequestAttachmentListItem> {
  const { data } = await api.put<AdminRequestAttachmentListItem>(
    `/admin/request-attachments/${attachmentId}`,
    payload
  );
  return data;
}

export async function adminDeleteRequestAttachment(attachmentId: string): Promise<void> {
  await api.delete(`/admin/request-attachments/${attachmentId}`);
}

const DB = '/admin/db';

export async function explorerListRequests(params: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}): Promise<AdminDbListResponse<AdminDbRequestRow>> {
  const { data } = await api.get<AdminDbListResponse<AdminDbRequestRow>>(`${DB}/requests`, { params });
  return data;
}

export async function explorerUpdateRequest(
  id: string,
  payload: Record<string, unknown>
): Promise<AdminDbRequestRow> {
  const { data } = await api.put<AdminDbRequestRow>(`${DB}/requests/${id}`, payload);
  return data;
}

export async function explorerDeleteRequest(id: string): Promise<void> {
  await api.delete(`${DB}/requests/${id}`);
}

export async function explorerListMessages(params: {
  page?: number;
  limit?: number;
  search?: string;
  type?: string;
}): Promise<AdminDbListResponse<AdminDbMessageRow>> {
  const { data } = await api.get<AdminDbListResponse<AdminDbMessageRow>>(`${DB}/messages`, { params });
  return data;
}

export async function explorerUpdateMessage(
  id: string,
  payload: { content?: string; type?: string; sender_role?: string | null; is_internal?: boolean }
): Promise<AdminDbMessageRow> {
  const { data } = await api.put<AdminDbMessageRow>(`${DB}/messages/${id}`, payload);
  return data;
}

export async function explorerDeleteMessage(id: string): Promise<void> {
  await api.delete(`${DB}/messages/${id}`);
}

export async function explorerListHistory(params: {
  page?: number;
  limit?: number;
  search?: string;
}): Promise<AdminDbListResponse<AdminDbHistoryRow>> {
  const { data } = await api.get<AdminDbListResponse<AdminDbHistoryRow>>(`${DB}/request-history`, { params });
  return data;
}

export async function explorerUpdateHistory(id: string, payload: { details?: string }): Promise<AdminDbHistoryRow> {
  const { data } = await api.put<AdminDbHistoryRow>(`${DB}/request-history/${id}`, payload);
  return data;
}

export async function explorerDeleteHistory(id: string): Promise<void> {
  await api.delete(`${DB}/request-history/${id}`);
}

export async function explorerListNotifications(params: {
  page?: number;
  limit?: number;
  search?: string;
}): Promise<AdminDbListResponse<AdminDbNotificationRow>> {
  const { data } = await api.get<AdminDbListResponse<AdminDbNotificationRow>>(`${DB}/notifications`, { params });
  return data;
}

export async function explorerUpdateNotification(
  id: string,
  payload: { title?: string; message?: string; is_read?: boolean }
): Promise<AdminDbNotificationRow> {
  const { data } = await api.put<AdminDbNotificationRow>(`${DB}/notifications/${id}`, payload);
  return data;
}

export async function explorerDeleteNotification(id: string): Promise<void> {
  await api.delete(`${DB}/notifications/${id}`);
}

export async function explorerListCounterOffers(params: {
  page?: number;
  limit?: number;
  search?: string;
}): Promise<AdminDbListResponse<AdminDbCounterOfferRow>> {
  const { data } = await api.get<AdminDbListResponse<AdminDbCounterOfferRow>>(`${DB}/counter-offers`, { params });
  return data;
}

export async function explorerUpdateCounterOffer(
  id: string,
  payload: { counter_price?: number; message?: string | null; status?: string }
): Promise<AdminDbCounterOfferRow> {
  const { data } = await api.put<AdminDbCounterOfferRow>(`${DB}/counter-offers/${id}`, payload);
  return data;
}

export async function explorerDeleteCounterOffer(id: string): Promise<void> {
  await api.delete(`${DB}/counter-offers/${id}`);
}

export async function explorerListSla(params: {
  page?: number;
  limit?: number;
  search?: string;
}): Promise<AdminDbListResponse<AdminDbSlaRow>> {
  const { data } = await api.get<AdminDbListResponse<AdminDbSlaRow>>(`${DB}/sla`, { params });
  return data;
}

export async function explorerUpdateSla(
  id: string,
  payload: {
    deadline_at?: string | null;
    completed_at?: string | null;
    is_breached?: boolean;
  }
): Promise<AdminDbSlaRow> {
  const { data } = await api.put<AdminDbSlaRow>(`${DB}/sla/${id}`, payload);
  return data;
}

export async function explorerDeleteSla(id: string): Promise<void> {
  await api.delete(`${DB}/sla/${id}`);
}

export async function explorerListChatAttachments(params: {
  page?: number;
  limit?: number;
  search?: string;
}): Promise<AdminDbListResponse<AdminDbChatAttachmentRow>> {
  const { data } = await api.get<AdminDbListResponse<AdminDbChatAttachmentRow>>(`${DB}/chat-attachments`, { params });
  return data;
}

export async function explorerUpdateChatAttachment(
  id: string,
  payload: { filename?: string; file_url?: string; file_type?: string }
): Promise<AdminDbChatAttachmentRow> {
  const { data } = await api.put<AdminDbChatAttachmentRow>(`${DB}/chat-attachments/${id}`, payload);
  return data;
}

export async function explorerDeleteChatAttachment(id: string): Promise<void> {
  await api.delete(`${DB}/chat-attachments/${id}`);
}
