import axios from 'axios';
import { create } from 'zustand';
import { emailService } from '../services/emailService';
import type {
  EmailThread,
  SendEmailPayload,
  SendToAgentEmailPayload,
  ReplyEmailPayload,
  SendEmailResponse,
  ReplyEmailResponse,
  PollInboxResponse,
  EmailThreadChannel,
} from '../types';

function apiErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err) && err.response?.data) {
    const d = err.response.data as {
      error?: { message?: string; details?: { field?: string; message?: string }[] };
      detail?: unknown;
    };
    if (d.error?.message) {
      const base = String(d.error.message);
      const details = d.error.details;
      if (Array.isArray(details) && details.length > 0) {
        const first = details[0];
        if (first?.message) return `${base}: ${first.message}`;
      }
      return base;
    }
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

  fetchThread: (requestId: string, channel?: EmailThreadChannel) => Promise<void>;
  sendToAgent: (payload: SendToAgentEmailPayload) => Promise<SendEmailResponse>;
  clearError: () => void;
  sendEmail: (payload: SendEmailPayload) => Promise<SendEmailResponse>;
  reply: (payload: ReplyEmailPayload) => Promise<ReplyEmailResponse>;
  simulateReply: (requestId: string, message?: string) => Promise<void>;
  pollInbox: (
    requestId?: string,
    opts?: { silent?: boolean; channel?: EmailThreadChannel },
  ) => Promise<PollInboxResponse | null>;
  clearThread: () => void;
}

export const useEmailStore = create<EmailState>((set, get) => ({
  thread: null,
  isLoading: false,
  isSending: false,
  error: null,

  fetchThread: async (requestId, channel = 'rm') => {
    set({ isLoading: true, error: null });
    try {
      const thread = await emailService.getThread(requestId, channel);
      set({ thread, isLoading: false });
    } catch {
      set({ error: 'Failed to load email thread', isLoading: false });
    }
  },

  sendToAgent: async (payload) => {
    set({ isSending: true, error: null });
    try {
      const data = await emailService.sendToAgent(payload);
      await get().fetchThread(payload.request_id, 'agent_sales');
      set({ isSending: false });
      return data;
    } catch (e) {
      set({ error: apiErrorMessage(e), isSending: false });
      throw e;
    }
  },

  clearError: () => set({ error: null }),

  sendEmail: async (payload) => {
    set({ isSending: true, error: null });
    try {
      const data = await emailService.sendEmail(payload);
      try {
        await get().fetchThread(payload.request_id, 'rm');
      } catch (refreshErr) {
        // Send already succeeded; do not show a global error for refresh-only failures.
        console.warn('Email sent; thread refresh failed:', refreshErr);
      }
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
      const ch = get().thread?.thread_channel ?? 'rm';
      await get().fetchThread(payload.request_id, ch);
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
      await get().fetchThread(requestId, 'rm');
      set({ isSending: false });
    } catch {
      set({ error: 'Failed to simulate reply', isSending: false });
    }
  },

  pollInbox: async (requestId, opts) => {
    const silent = opts?.silent ?? false;
    const channel = opts?.channel ?? 'rm';
    if (!silent) {
      set({ isSending: true, error: null });
    }
    try {
      const r = await emailService.pollInbox();
      if (requestId) {
        await get().fetchThread(requestId, channel);
      }
      if (!silent) {
        set({ isSending: false });
      }
      return r;
    } catch {
      if (!silent) {
        set({ error: 'Failed to sync inbox', isSending: false });
      }
      return null;
    }
  },

  clearThread: () => set({ thread: null, error: null }),
}));
