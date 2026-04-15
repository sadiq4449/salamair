import { create } from 'zustand';
import { notificationService } from '../services/notificationService';
import type { NotificationItem, NotificationPreferences } from '../types';

interface NotificationState {
  notifications: NotificationItem[];
  unreadCount: number;
  total: number;
  page: number;
  isLoading: boolean;
  preferences: NotificationPreferences | null;

  fetchNotifications: (params?: { is_read?: boolean; type?: string; page?: number }) => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  addRealtimeNotification: (notif: NotificationItem) => void;
  fetchPreferences: () => Promise<void>;
  updatePreferences: (prefs: Partial<NotificationPreferences>) => Promise<void>;
  reset: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,
  total: 0,
  page: 1,
  isLoading: false,
  preferences: null,

  fetchNotifications: async (params) => {
    set({ isLoading: true });
    try {
      const res = await notificationService.getNotifications({
        page: params?.page || 1,
        limit: 20,
        ...params,
      });
      set({
        notifications: res.items,
        total: res.total,
        unreadCount: res.unread_count,
        page: res.page,
        isLoading: false,
      });
    } catch {
      set({ isLoading: false });
    }
  },

  fetchUnreadCount: async () => {
    try {
      const res = await notificationService.getUnreadCount();
      set({ unreadCount: res.unread_count });
    } catch {
      // silently fail
    }
  },

  markAsRead: async (id: string) => {
    try {
      await notificationService.markAsRead(id);
      set((state) => ({
        notifications: state.notifications.map((n) =>
          n.id === id ? { ...n, is_read: true } : n
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      }));
    } catch {
      // silently fail
    }
  },

  markAllAsRead: async () => {
    try {
      await notificationService.markAllAsRead();
      set((state) => ({
        notifications: state.notifications.map((n) => ({ ...n, is_read: true })),
        unreadCount: 0,
      }));
    } catch {
      // silently fail
    }
  },

  addRealtimeNotification: (notif: NotificationItem) => {
    set((state) => ({
      notifications: [notif, ...state.notifications],
      unreadCount: state.unreadCount + 1,
      total: state.total + 1,
    }));
  },

  fetchPreferences: async () => {
    try {
      const prefs = await notificationService.getPreferences();
      set({ preferences: prefs });
    } catch {
      // silently fail
    }
  },

  updatePreferences: async (prefs: Partial<NotificationPreferences>) => {
    try {
      const updated = await notificationService.updatePreferences(prefs);
      set({ preferences: updated });
    } catch {
      // silently fail
    }
  },

  reset: () => set({ notifications: [], unreadCount: 0, total: 0, page: 1, preferences: null }),
}));
