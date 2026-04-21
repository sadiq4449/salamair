import api from './api';
import type {
  RequestListResponse,
  RequestDetail,
  Attachment,
  HistoryEvent,
  CounterOffer,
} from '../types';

export interface RequestFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  origin?: string;
  destination?: string;
  date_from?: string;
  date_to?: string;
  agent?: string;
  tag_ids?: string;
}

export interface CreateRequestData {
  route: string;
  pax: number;
  travel_date: string;
  return_date?: string;
  price: number;
  priority: string;
  notes?: string;
  status?: string;
  /** Required when an administrator creates a request on behalf of an agent */
  agent_id?: string;
}

/**
 * Fields editable via `PUT /requests/{id}`. Status changes live on
 * `/sales/requests/{id}/status` (see `updateStatus` below); `agent_id`
 * is only settable at creation time. Keeping these out of the update
 * payload matches the backend `RequestUpdate` schema (extra="forbid").
 */
export interface UpdateRequestData {
  route?: string;
  pax?: number;
  travel_date?: string;
  return_date?: string;
  price?: number;
  priority?: string;
  notes?: string;
}

export interface StatusUpdateData {
  status: string;
  notes?: string;
  reason?: string;
  /** Administrator only: bypass workflow transition rules */
  force?: boolean;
}

export interface CounterOfferData {
  counter_price: number;
  message?: string;
}

export interface NoteData {
  content: string;
}

export const requestService = {
  async getRequests(params: RequestFilters = {}): Promise<RequestListResponse> {
    const { data } = await api.get<RequestListResponse>('/requests', { params });
    return data;
  },

  async getRequest(id: string): Promise<RequestDetail> {
    const { data } = await api.get<RequestDetail>(`/requests/${id}`);
    return data;
  },

  async createRequest(payload: CreateRequestData): Promise<RequestDetail> {
    const { status, agent_id, ...rest } = payload;
    const body: Record<string, unknown> = {
      ...rest,
      is_draft: status === 'draft',
    };
    if (agent_id) body.agent_id = agent_id;
    const { data } = await api.post<RequestDetail>('/requests', body);
    return data;
  },

  async updateRequest(id: string, payload: UpdateRequestData): Promise<RequestDetail> {
    const { data } = await api.put<RequestDetail>(`/requests/${id}`, payload);
    return data;
  },

  async uploadAttachment(id: string, file: File): Promise<Attachment> {
    const formData = new FormData();
    formData.append('file', file);
    // Do NOT set Content-Type manually; the browser must set the multipart boundary.
    const { data } = await api.post<Attachment>(`/requests/${id}/attachments`, formData, {
      headers: { 'Content-Type': undefined },
    });
    return data;
  },

  async getAttachments(id: string): Promise<Attachment[]> {
    const { data } = await api.get<Attachment[]>(`/requests/${id}/attachments`);
    return data;
  },

  async getSalesQueue(params: RequestFilters = {}): Promise<RequestListResponse> {
    const { data } = await api.get<RequestListResponse>('/sales/queue', { params });
    return data;
  },

  async updateStatus(id: string, payload: StatusUpdateData): Promise<RequestDetail> {
    await api.put(`/sales/requests/${id}/status`, {
      status: payload.status,
      reason: payload.reason ?? payload.notes,
      force: payload.force ?? false,
    });
    return requestService.getRequest(id);
  },

  async createCounterOffer(id: string, payload: CounterOfferData): Promise<CounterOffer> {
    const { data } = await api.post<CounterOffer>(`/sales/requests/${id}/counter`, payload);
    return data;
  },

  async acceptCounterOffer(id: string, offerId: string): Promise<RequestDetail> {
    await api.post(`/requests/${id}/counter/${offerId}/accept`);
    return requestService.getRequest(id);
  },

  async rejectCounterOffer(id: string, offerId: string, reason?: string): Promise<RequestDetail> {
    const body = reason ? { reason } : {};
    await api.post(`/requests/${id}/counter/${offerId}/reject`, body);
    return requestService.getRequest(id);
  },

  async sendToRM(id: string): Promise<RequestDetail> {
    await api.post(`/sales/requests/${id}/send-to-rm`);
    return requestService.getRequest(id);
  },

  async getHistory(id: string): Promise<HistoryEvent[]> {
    const { data } = await api.get<HistoryEvent[]>(`/sales/requests/${id}/history`);
    return data;
  },

  async addNote(id: string, payload: NoteData): Promise<void> {
    await api.post(`/sales/requests/${id}/notes`, { note: payload.content });
  },
};
