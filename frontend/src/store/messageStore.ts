import { create } from 'zustand';
import { messageService } from '../services/messageService';
import type { ChatMessage, MessageSender, TypingUser } from '../types';

interface OnlineUser {
  user_id: string;
  name: string;
  online: boolean;
}

interface MessageState {
  messages: ChatMessage[];
  total: number;
  page: number;
  isLoading: boolean;
  error: string | null;
  typingUsers: TypingUser[];
  onlineUsers: OnlineUser[];

  fetchMessages: (requestId: string, type?: string, page?: number) => Promise<void>;
  addMessage: (msg: ChatMessage) => void;
  sendMessage: (requestId: string, content: string, sender?: MessageSender | null) => Promise<ChatMessage | null>;
  adminPatchMessage: (messageId: string, content: string) => Promise<void>;
  adminDeleteMessage: (messageId: string) => Promise<void>;
  setTyping: (data: TypingUser) => void;
  setUserOnline: (data: OnlineUser) => void;
  setOnlineUsers: (users: OnlineUser[]) => void;
  clearMessages: () => void;
}

export const useMessageStore = create<MessageState>((set) => ({
  messages: [],
  total: 0,
  page: 1,
  isLoading: false,
  error: null,
  typingUsers: [],
  onlineUsers: [],

  fetchMessages: async (requestId, type = 'all', page = 1) => {
    set({ isLoading: true, error: null });
    try {
      const resp = await messageService.getMessages(requestId, type, page);
      if (page === 1) {
        set({ messages: resp.items, total: resp.total, page, isLoading: false });
      } else {
        set((s) => ({
          messages: [...resp.items, ...s.messages],
          total: resp.total,
          page,
          isLoading: false,
        }));
      }
    } catch {
      set({ error: 'Failed to load messages', isLoading: false });
    }
  },

  addMessage: (msg) => {
    set((s) => {
      if (s.messages.some((m) => m.id === msg.id)) return s;
      return { messages: [...s.messages, msg], total: s.total + 1 };
    });
  },

  sendMessage: async (requestId, content, sender = null) => {
    const optimisticId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const optimisticMessage: ChatMessage = {
      id: optimisticId,
      request_id: requestId,
      type: 'chat',
      sender,
      content,
      attachments: [],
      is_read: true,
      timestamp: new Date().toISOString(),
    };
    set((s) => ({
      messages: [...s.messages, optimisticMessage],
      total: s.total + 1,
      error: null,
    }));

    try {
      const data = await messageService.sendMessage(requestId, content);
      const msg = data as unknown as ChatMessage;
      set((s) => {
        const withoutOptimistic = s.messages.filter((m) => m.id !== optimisticId);
        if (withoutOptimistic.some((m) => m.id === msg.id)) {
          return {
            messages: withoutOptimistic,
            total: Math.max(s.total - 1, 0),
          };
        }
        return {
          messages: [...withoutOptimistic, msg],
          total: withoutOptimistic.length + 1,
        };
      });
      return msg;
    } catch {
      set((s) => ({
        messages: s.messages.filter((m) => m.id !== optimisticId),
        total: Math.max(s.total - 1, 0),
        error: 'Failed to send message',
      }));
      return null;
    }
  },

  adminPatchMessage: async (messageId, content) => {
    try {
      const data = await messageService.adminPatchChatMessage(messageId, content);
      const msg = data as unknown as ChatMessage;
      set((s) => ({
        messages: s.messages.map((m) => (m.id === messageId ? msg : m)),
      }));
    } catch {
      set({ error: 'Failed to update message' });
    }
  },

  adminDeleteMessage: async (messageId) => {
    try {
      await messageService.adminDeleteChatMessage(messageId);
      set((s) => ({
        messages: s.messages.filter((m) => m.id !== messageId),
      }));
    } catch {
      set({ error: 'Failed to delete message' });
    }
  },

  setTyping: (data) => {
    set((s) => {
      if (!data.is_typing) {
        return { typingUsers: s.typingUsers.filter((u) => u.user_id !== data.user_id) };
      }
      if (s.typingUsers.some((u) => u.user_id === data.user_id)) return s;
      return { typingUsers: [...s.typingUsers, data] };
    });

    if (data.is_typing) {
      setTimeout(() => {
        set((s) => ({
          typingUsers: s.typingUsers.filter((u) => u.user_id !== data.user_id),
        }));
      }, 5000);
    }
  },

  setUserOnline: (data) => {
    set((s) => {
      const filtered = s.onlineUsers.filter((u) => u.user_id !== data.user_id);
      if (data.online) {
        return { onlineUsers: [...filtered, data] };
      }
      return { onlineUsers: filtered };
    });
  },

  setOnlineUsers: (users) => set({ onlineUsers: users }),

  clearMessages: () =>
    set({ messages: [], total: 0, page: 1, typingUsers: [], onlineUsers: [], error: null }),
}));
