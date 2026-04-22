import api from './api';

export interface GmailStatus {
  gmail_connected: boolean;
  gmail_configured: boolean;
}

export const integrationService = {
  async getGmailStatus(): Promise<GmailStatus> {
    const { data } = await api.get<GmailStatus>('/integrations/gmail/status');
    return data;
  },

  async getGmailAuthorizeUrl(): Promise<string> {
    const { data } = await api.get<{ authorization_url: string }>('/integrations/gmail/authorize');
    return data.authorization_url;
  },

  async disconnectGmail(): Promise<{ ok: boolean; disconnected: boolean }> {
    const { data } = await api.delete<{ ok: boolean; disconnected: boolean }>('/integrations/gmail');
    return data;
  },
};
