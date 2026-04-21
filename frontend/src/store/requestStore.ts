import { create } from 'zustand';
import { requestService } from '../services/requestService';
import type { RequestItem, RequestDetail, HistoryEvent } from '../types';
import type { RequestFilters, CreateRequestData, UpdateRequestData, StatusUpdateData, CounterOfferData, NoteData } from '../services/requestService';

interface RequestState {
  requests: RequestItem[];
  currentRequest: RequestDetail | null;
  history: HistoryEvent[];
  total: number;
  page: number;
  limit: number;
  isLoading: boolean;
  isDetailLoading: boolean;
  error: string | null;
  filters: RequestFilters;

  setFilters: (filters: Partial<RequestFilters>) => void;
  resetFilters: () => void;
  fetchRequests: (params?: RequestFilters) => Promise<void>;
  fetchRequest: (id: string) => Promise<void>;
  fetchSalesQueue: (params?: RequestFilters) => Promise<void>;
  createRequest: (data: CreateRequestData) => Promise<RequestDetail>;
  updateRequest: (id: string, data: UpdateRequestData) => Promise<void>;
  updateStatus: (id: string, data: StatusUpdateData) => Promise<void>;
  createCounterOffer: (id: string, data: CounterOfferData) => Promise<void>;
  acceptCounterOffer: (id: string, offerId: string) => Promise<void>;
  rejectCounterOffer: (id: string, offerId: string, reason?: string) => Promise<void>;
  sendToRM: (id: string) => Promise<void>;
  fetchHistory: (id: string) => Promise<void>;
  addNote: (id: string, data: NoteData) => Promise<void>;
  clearCurrent: () => void;
}

const defaultFilters: RequestFilters = {
  page: 1,
  limit: 20,
  search: '',
  status: '',
  origin: '',
  destination: '',
  date_from: '',
  date_to: '',
  tag_ids: '',
};

export const useRequestStore = create<RequestState>((set, get) => ({
  requests: [],
  currentRequest: null,
  history: [],
  total: 0,
  page: 1,
  limit: 20,
  isLoading: false,
  isDetailLoading: false,
  error: null,
  filters: { ...defaultFilters },

  setFilters: (newFilters) =>
    set((state) => ({ filters: { ...state.filters, ...newFilters } })),

  resetFilters: () => set({ filters: { ...defaultFilters } }),

  fetchRequests: async (params) => {
    set({ isLoading: true, error: null });
    try {
      const merged = { ...get().filters, ...params };
      const res = await requestService.getRequests(merged);
      set({ requests: res.items, total: res.total, page: res.page, limit: res.limit, isLoading: false });
    } catch {
      set({ error: 'Failed to load requests', isLoading: false });
    }
  },

  fetchRequest: async (id) => {
    set({ isDetailLoading: true, error: null });
    try {
      const detail = await requestService.getRequest(id);
      set({ currentRequest: detail, isDetailLoading: false });
    } catch {
      set({ error: 'Failed to load request', isDetailLoading: false });
    }
  },

  fetchSalesQueue: async (params) => {
    set({ isLoading: true, error: null });
    try {
      const merged = { ...get().filters, ...params };
      const res = await requestService.getSalesQueue(merged);
      set({ requests: res.items, total: res.total, page: res.page, limit: res.limit, isLoading: false });
    } catch {
      set({ error: 'Failed to load sales queue', isLoading: false });
    }
  },

  createRequest: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const result = await requestService.createRequest(data);
      set({ isLoading: false });
      return result;
    } catch {
      set({ error: 'Failed to create request', isLoading: false });
      throw new Error('Failed to create request');
    }
  },

  updateRequest: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await requestService.updateRequest(id, data);
      set({ currentRequest: updated, isLoading: false });
    } catch {
      set({ error: 'Failed to update request', isLoading: false });
    }
  },

  updateStatus: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await requestService.updateStatus(id, data);
      set({ currentRequest: updated, isLoading: false });
    } catch {
      set({ error: 'Failed to update status', isLoading: false });
    }
  },

  createCounterOffer: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      await requestService.createCounterOffer(id, data);
      const updated = await requestService.getRequest(id);
      set({ currentRequest: updated, isLoading: false });
    } catch (err) {
      set({ error: 'Failed to send counter offer', isLoading: false });
      throw err;
    }
  },

  acceptCounterOffer: async (id, offerId) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await requestService.acceptCounterOffer(id, offerId);
      set({ currentRequest: updated, isLoading: false });
    } catch (err) {
      set({ error: 'Failed to accept counter offer', isLoading: false });
      throw err;
    }
  },

  rejectCounterOffer: async (id, offerId, reason) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await requestService.rejectCounterOffer(id, offerId, reason);
      set({ currentRequest: updated, isLoading: false });
    } catch (err) {
      set({ error: 'Failed to reject counter offer', isLoading: false });
      throw err;
    }
  },

  sendToRM: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await requestService.sendToRM(id);
      set({ currentRequest: updated, isLoading: false });
    } catch {
      set({ error: 'Failed to send to RM', isLoading: false });
    }
  },

  fetchHistory: async (id) => {
    try {
      const events = await requestService.getHistory(id);
      set({ history: events });
    } catch {
      set({ history: [] });
    }
  },

  addNote: async (id, data) => {
    try {
      await requestService.addNote(id, data);
    } catch {
      set({ error: 'Failed to add note' });
    }
  },

  clearCurrent: () => set({ currentRequest: null, history: [] }),
}));
