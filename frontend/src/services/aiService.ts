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

export interface FlightChatContext {
  route?: string;
  travel_date?: string;
  pax?: number;
}

export interface FlightChatResult {
  answer: string;
  source: 'live_api' | 'clarify' | 'no_groq' | 'api_error';
}

export function postFlightChat(
  message: string,
  context: FlightChatContext | undefined,
  signal?: AbortSignal
): Promise<FlightChatResult> {
  return api
    .post<FlightChatResult>(
      '/ai/flight-chat',
      { message, context: context && Object.keys(context).length ? context : undefined },
      { signal }
    )
    .then((r) => r.data);
}
