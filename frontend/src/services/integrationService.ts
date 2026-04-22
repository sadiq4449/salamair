import api from './api';

export interface GmailStatus {
  gmail_connected: boolean;
  /** True if Google OAuth web client is set (redirect + client) so "Connect Gmail" can run. */
  gmail_configured: boolean;
  /** Client id + secret present (needed for Gmail API). */
  gmail_client_configured?: boolean;
  /** Server env: shared refresh token for sales↔agent sends (no per-user Connect). */
  shared_gmail_for_agent_thread?: boolean;
  /** True if this tab will send via Gmail API (user or shared token), not only SMTP. */
  agent_thread_uses_gmail?: boolean;
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
