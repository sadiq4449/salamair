import { create } from 'zustand';
import { emailService } from '../services/emailService';
import type { EmailThread, SendEmailPayload, ReplyEmailPayload } from '../types';

interface EmailState {
  thread: EmailThread | null;
  isLoading: boolean;
  isSending: boolean;
  error: string | null;

  fetchThread: (requestId: string) => Promise<void>;
  sendEmail: (payload: SendEmailPayload) => Promise<void>;
  reply: (payload: ReplyEmailPayload) => Promise<void>;
  simulateReply: (requestId: string, message?: string) => Promise<void>;
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

  sendEmail: async (payload) => {
    set({ isSending: true, error: null });
    try {
      await emailService.sendEmail(payload);
      await get().fetchThread(payload.request_id);
      set({ isSending: false });
    } catch {
      set({ error: 'Failed to send email', isSending: false });
      throw new Error('Failed to send email');
    }
  },

  reply: async (payload) => {
    set({ isSending: true, error: null });
    try {
      await emailService.reply(payload);
      await get().fetchThread(payload.request_id);
      set({ isSending: false });
    } catch {
      set({ error: 'Failed to send reply', isSending: false });
      throw new Error('Failed to send reply');
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

  clearThread: () => set({ thread: null, error: null }),
}));
