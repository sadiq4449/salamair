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
}

export interface StatusUpdateData {
  status: string;
  notes?: string;
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
    const { data } = await api.post<RequestDetail>('/requests', payload);
    return data;
  },

  async updateRequest(id: string, payload: Partial<CreateRequestData>): Promise<RequestDetail> {
    const { data } = await api.put<RequestDetail>(`/requests/${id}`, payload);
    return data;
  },

  async uploadAttachment(id: string, file: File): Promise<Attachment> {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await api.post<Attachment>(`/requests/${id}/attachments`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
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
    const { data } = await api.put<RequestDetail>(`/requests/${id}/status`, payload);
    return data;
  },

  async createCounterOffer(id: string, payload: CounterOfferData): Promise<CounterOffer> {
    const { data } = await api.post<CounterOffer>(`/requests/${id}/counter`, payload);
    return data;
  },

  async sendToRM(id: string): Promise<RequestDetail> {
    const { data } = await api.post<RequestDetail>(`/requests/${id}/send-to-rm`);
    return data;
  },

  async getHistory(id: string): Promise<HistoryEvent[]> {
    const { data } = await api.get<HistoryEvent[]>(`/requests/${id}/history`);
    return data;
  },

  async addNote(id: string, payload: NoteData): Promise<void> {
    await api.post(`/requests/${id}/notes`, payload);
  },
};
