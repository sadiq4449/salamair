import type { Priority, RequestStatus } from '../types';

/** Heuristic “AI” pricing aligned with UI.demo_design/sales.js updateAI */
export function demoSuggestedPriceOmR(price: number, priority: Priority): number {
  const p = Number(price);
  if (Number.isNaN(p) || p <= 0) return 0;
  const base = p > 100 ? p * 0.9 : p * 0.95;
  const urgentAdj = priority === 'urgent' ? 0.98 : 1;
  return Math.round(base * urgentAdj);
}

export function demoConfidencePercent(priority: Priority): number {
  return priority === 'urgent' ? 75 : 88;
}

export function demoRecommendationLabel(
  status: RequestStatus,
  price: number,
  suggested: number
): { text: string; variant: 'success' | 'warning' | 'neutral' } {
  if (status === 'approved') {
    return { text: 'Recommendation: Approved', variant: 'success' };
  }
  if (status === 'rejected') {
    return { text: 'Recommendation: Review terms', variant: 'warning' };
  }
  if (suggested < price * 0.92) {
    return { text: 'Recommendation: Negotiate or counter', variant: 'warning' };
  }
  return { text: 'Recommendation: Accept', variant: 'success' };
}

export interface SummaryInput {
  request_code: string;
  route: string;
  pax: number;
  price: number;
  priority: Priority;
  status: RequestStatus;
  tagNames: string[];
  notes: string | null;
}

/** Bullet list for the “AI Summary” card (demo-style heuristics, no external API). */
export function buildDemoEmailSummaryPoints(req: SummaryInput): string[] {
  const points: string[] = [];
  const tags = req.tagNames.map((t) => t.toLowerCase());

  if (req.priority === 'urgent') {
    points.push('Urgent request — prioritize a timely response.');
  }
  if (tags.some((t) => t.includes('vip'))) {
    points.push('Tagged as VIP — high-value relationship.');
  }
  if (tags.some((t) => t.includes('corporate'))) {
    points.push('Corporate booking — potential repeat business.');
  }
  if (req.pax >= 20) {
    points.push(`Large group (${req.pax} pax) — bulk fare rules may apply.`);
  }
  if (req.price < 90) {
    points.push('Price is below typical threshold — align with RM if needed.');
  }
  const statusMsg: Partial<Record<RequestStatus, string>> = {
    submitted: 'Request newly submitted — initial review.',
    under_review: 'Under sales review — negotiation may be in progress.',
    rm_pending: 'Awaiting RM — revenue verification.',
    approved: 'Approved — proceed with next steps.',
    rejected: 'Rejected — consider counter or revised terms.',
    counter_offered: 'Counter offered — awaiting agent response.',
  };
  const sm = statusMsg[req.status];
  if (sm) points.push(sm);

  if (req.notes?.trim()) {
    const snippet = req.notes.trim().slice(0, 120);
    points.push(`Agent notes mention: “${snippet}${req.notes.length > 120 ? '…' : ''}”`);
  }

  return points.length > 0 ? points : ['No strong signals — standard fare request.'];
}

export const DEMO_SMART_REPLIES = (price: number, route: string, pax: number) => [
  `Please approve ${price.toFixed(2)} OMR — high value agent, urgent group`,
  `Requesting approval for ${route}, ${pax} passengers`,
  'VIP client — need urgent response',
  'Can we negotiate on this rate?',
  'RM approval needed — fare below threshold',
];
