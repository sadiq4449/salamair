import api from './api';

export interface TagDto {
  id: string;
  name: string;
  color: string;
  usage_count?: number;
}

export interface SlaDashboard {
  compliance_rate: number;
  total_tracked: number;
  on_track: number;
  at_risk: number;
  breached: number;
  overdue_requests: {
    request_code: string;
    status: string;
    sla_deadline: string;
    overdue_hours: number;
    assigned_to: string;
  }[];
}

export interface SearchResponse {
  query: string;
  results: {
    requests: { id: string; request_code: string; route: string; status: string; highlight: string }[];
    agents: { id: string; name: string; email: string; highlight: string }[];
    messages: { id: string; request_code: string; request_id: string; content: string; highlight: string }[];
  };
  total: number;
}

export interface ReminderRule {
  id: string;
  trigger_status: string;
  delay_hours: number;
  reminder_type: string;
  message_template: string;
  is_active: boolean;
}

export async function getSlaDashboard(): Promise<SlaDashboard> {
  const { data } = await api.get<SlaDashboard>('/sla/dashboard');
  return data;
}

export async function getSlaTimeline(requestId: string): Promise<{ timeline: unknown[] }> {
  const { data } = await api.get(`/sla/requests/${requestId}`);
  return data;
}

export async function searchGlobal(params: {
  q: string;
  type?: string;
  page?: number;
  limit?: number;
}): Promise<SearchResponse> {
  const { data } = await api.get<SearchResponse>('/search', { params });
  return data;
}

export async function listTags(): Promise<TagDto[]> {
  const { data } = await api.get<TagDto[]>('/tags');
  return data;
}

export async function createTag(payload: { name: string; color: string }): Promise<TagDto> {
  const { data } = await api.post<TagDto>('/tags', payload);
  return data;
}

export async function deleteTag(id: string): Promise<void> {
  await api.delete(`/tags/${id}`);
}

export async function updateRequestTags(requestId: string, tagIds: string[]): Promise<{ tags: TagDto[] }> {
  const { data } = await api.post(`/requests/${requestId}/tags`, { tag_ids: tagIds });
  return data;
}

export async function getReminderRules(): Promise<{ rules: ReminderRule[] }> {
  const { data } = await api.get('/admin/reminders');
  return data;
}

export async function saveReminderRules(
  rules: (Partial<ReminderRule> & { id: string })[]
): Promise<{ rules: ReminderRule[] }> {
  const { data } = await api.put('/admin/reminders', { rules });
  return data;
}

export async function runRemindersNow(): Promise<{ notifications_created: number; emails_sent: number }> {
  const { data } = await api.post('/admin/reminders/run');
  return data;
}

export async function bulkPreview(file: File): Promise<{
  total_rows: number;
  valid_rows: number;
  invalid_rows: number;
  preview: { row: number; route: string; pax: number; price: number; valid: boolean; errors?: string[] }[];
  error?: string;
}> {
  const fd = new FormData();
  fd.append('file', file);
  const { data } = await api.post('/requests/bulk-preview', fd, {
    headers: { 'Content-Type': undefined },
  });
  return data;
}

export async function bulkUpload(
  file: File,
  agentId?: string,
): Promise<{
  message: string;
  total_rows: number;
  created: number;
  failed: number;
  results: { row: number; request_code?: string; status: string; error?: string }[];
}> {
  const fd = new FormData();
  fd.append('file', file);
  const { data } = await api.post('/requests/bulk-upload', fd, {
    params: agentId ? { agent_id: agentId } : {},
    headers: { 'Content-Type': undefined },
  });
  return data;
}

export async function downloadBulkTemplateBlob(): Promise<Blob> {
  const { data } = await api.get<Blob>('/requests/bulk-template', { responseType: 'blob' });
  return data;
}
