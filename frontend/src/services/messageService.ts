import api from './api';
import type { MessageListResponse } from '../types';

export const messageService = {
  async getMessages(
    requestId: string,
    type: string = 'all',
    page: number = 1,
    limit: number = 50,
  ): Promise<MessageListResponse> {
    const { data } = await api.get<MessageListResponse>(
      `/messages/${requestId}`,
      { params: { type, page, limit } },
    );
    return data;
  },

  async sendMessage(requestId: string, content: string): Promise<Record<string, unknown>> {
    const { data } = await api.post('/messages', {
      request_id: requestId,
      content,
      type: 'chat',
    });
    return data;
  },

  async uploadAttachment(requestId: string, messageId: string, file: File): Promise<Record<string, unknown>> {
    const form = new FormData();
    form.append('file', file);
    const { data } = await api.post('/messages/attachment', form, {
      params: { request_id: requestId, message_id: messageId },
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  async markRead(messageIds: string[]): Promise<void> {
    await api.post('/messages/read', messageIds);
  },

  async adminPatchChatMessage(messageId: string, content: string): Promise<Record<string, unknown>> {
    const { data } = await api.patch(`/messages/chat/${messageId}`, { content });
    return data;
  },

  async adminDeleteChatMessage(messageId: string): Promise<void> {
    await api.delete(`/messages/chat/${messageId}`);
  },
};
