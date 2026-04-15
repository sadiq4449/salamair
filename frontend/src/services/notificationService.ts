import api from './api';
import type {
  NotificationListResponse,
  NotificationPreferences,
  SlaResponse,
} from '../types';

export const notificationService = {
  getNotifications: async (params?: {
    is_read?: boolean;
    type?: string;
    page?: number;
    limit?: number;
  }): Promise<NotificationListResponse> => {
    const { data } = await api.get('/notifications', { params });
    return data;
  },

  getUnreadCount: async (): Promise<{ unread_count: number }> => {
    const { data } = await api.get('/notifications/unread-count');
    return data;
  },

  markAsRead: async (id: string): Promise<void> => {
    await api.put(`/notifications/${id}/read`);
  },

  markAllAsRead: async (): Promise<{ message: string; count: number }> => {
    const { data } = await api.put('/notifications/read-all');
    return data;
  },

  getPreferences: async (): Promise<NotificationPreferences> => {
    const { data } = await api.get('/notifications/preferences');
    return data;
  },

  updatePreferences: async (
    prefs: Partial<NotificationPreferences>
  ): Promise<NotificationPreferences> => {
    const { data } = await api.put('/notifications/preferences', prefs);
    return data;
  },

  getRequestSla: async (requestId: string): Promise<SlaResponse> => {
    const { data } = await api.get(`/requests/${requestId}/sla`);
    return data;
  },
};
