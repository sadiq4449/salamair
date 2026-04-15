import axios from 'axios';
import { create } from 'zustand';
import { emailService } from '../services/emailService';
import type {
  EmailThread,
  SendEmailPayload,
  ReplyEmailPayload,
  SendEmailResponse,
  ReplyEmailResponse,
} from '../types';

function apiErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err) && err.response?.data) {
    const d = err.response.data as {
      error?: { message?: string };
      detail?: unknown;
    };
    if (d.error?.message) return String(d.error.message);
    const det = d.detail as { error?: { message?: string } } | string | undefined;
    if (typeof det === 'object' && det?.error?.message) return String(det.error.message);
    if (typeof det === 'string') return det;
  }
  if (err instanceof Error) return err.message;
  return 'Request failed';
}

interface EmailState {
  thread: EmailThread | null;
  isLoading: boolean;
  isSending: boolean;
  error: string | null;

  fetchThread: (requestId: string) => Promise<void>;
  clearError: () => void;
  sendEmail: (payload: SendEmailPayload) => Promise<SendEmailResponse>;
  reply: (payload: ReplyEmailPayload) => Promise<ReplyEmailResponse>;
  simulateReply: (requestId: string, message?: string) => Promise<void>;
  pollInbox: (requestId?: string) => Promise<{ stored: number; skipped?: boolean } | null>;
  clearThread: () => void;
}

export const useEmailStore = create<EmailState>((set, get) => ({
  thread: null,
  isLoading: false,
  isSending: false,
  error: null,

  fetchThread: async (requestId) => {
    set({ isLoading: true, error: null });
    try {
      const thread = await emailService.getThread(requestId);
      set({ thread, isLoading: false });
    } catch {
      set({ error: 'Failed to load email thread', isLoading: false });
    }
  },

  clearError: () => set({ error: null }),

  sendEmail: async (payload) => {
    set({ isSending: true, error: null });
    try {
      const data = await emailService.sendEmail(payload);
      await get().fetchThread(payload.request_id);
      set({ isSending: false });
      return data;
    } catch (e) {
      set({ error: apiErrorMessage(e), isSending: false });
      throw e;
    }
  },

  reply: async (payload) => {
    set({ isSending: true, error: null });
    try {
      const data = await emailService.reply(payload);
      await get().fetchThread(payload.request_id);
      set({ isSending: false });
      return data;
    } catch (e) {
      set({ error: apiErrorMessage(e), isSending: false });
      throw e;
    }
  },

  simulateReply: async (requestId, message) => {
    set({ isSending: true, error: null });
    try {
      await emailService.simulateReply(requestId, message);
      await get().fetchThread(requestId);
      set({ isSending: false });
    } catch {
      set({ error: 'Failed to simulate reply', isSending: false });
    }
  },

  pollInbox: async (requestId) => {
    set({ isSending: true, error: null });
    try {
      const r = await emailService.pollInbox();
      if (requestId) {
        await get().fetchThread(requestId);
      }
      set({ isSending: false });
      return { stored: r.stored, skipped: r.skipped };
    } catch {
      set({ error: 'Failed to sync inbox', isSending: false });
      return null;
    }
  },

  clearThread: () => set({ thread: null, error: null }),
}));
