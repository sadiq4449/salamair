import api from './api';

export interface PricingAssistantBody {
  price: number;
  priority: string;
  status: string;
  route?: string;
  pax?: number;
  request_code?: string;
}

export interface PricingAssistantResult {
  suggested_price_omr: number;
  confidence_percent: number;
  recommendation: string;
  source: 'groq' | 'fallback';
}

export function fetchPricingAssistant(
  body: PricingAssistantBody,
  signal?: AbortSignal
): Promise<PricingAssistantResult> {
  return api
    .post<PricingAssistantResult>('/ai/pricing-assistant', body, { signal })
    .then((r) => r.data);
}
