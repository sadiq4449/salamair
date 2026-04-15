import api from './api';
import type {
  EmailThread,
  SendEmailPayload,
  SendEmailResponse,
  ReplyEmailPayload,
  ReplyEmailResponse,
  PollInboxResponse,
} from '../types';

export const emailService = {
  async sendEmail(payload: SendEmailPayload): Promise<SendEmailResponse> {
    const { data } = await api.post<SendEmailResponse>('/email/send', payload);
    return data;
  },

  async getThread(requestId: string): Promise<EmailThread> {
    const { data } = await api.get<EmailThread>(`/email/thread/${requestId}`);
    return data;
  },

  async reply(payload: ReplyEmailPayload): Promise<ReplyEmailResponse> {
    const { data } = await api.post<ReplyEmailResponse>('/email/reply', payload);
    return data;
  },

  async simulateReply(requestId: string, message?: string): Promise<void> {
    await api.post('/email/simulate-reply', {
      request_id: requestId,
      message: message || 'Approved with fare as requested. Valid for 7 days.',
    });
  },

  async pollInbox(secret?: string): Promise<PollInboxResponse> {
    const headers: Record<string, string> = {};
    if (secret) {
      headers['X-Email-Poll-Secret'] = secret;
    }
    const { data } = await api.post<PollInboxResponse>('/email/poll-inbox', {}, { headers });
    return data;
  },
};
