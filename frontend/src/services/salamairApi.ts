/**
 * SalamAir booking API (https://api.salamair.com) via our backend proxy.
 * CORS on their API only allows booking.salamair.com; the portal uses
 * /api/v1/proxy/salamair-api/* with a normal JWT (see api.ts interceptor).
 */

import api from './api';

const PREFIX = '/proxy/salamair-api';

export type SalamAirTripType = 'oneway' | 'round' | 'multi';

export interface SalamAirFlightSearchParams {
  /** e.g. "MCT|DXB" or multi "A-B|C-D" */
  route: string;
  /** adult-child-infant-extra */
  counts: string;
  /** "YYYY-MM-DD" or "YYYY-MM-DD|YYYY-MM-DD" */
  dates: string;
  flightType: SalamAirTripType;
  /** Calendar window size (default 7 in their UI) */
  days?: number;
  promoCode?: string;
  currencyCode?: string;
  source?: string;
}

/** POST /api/session — returns token from response headers. */
export async function salamairCreateSession(): Promise<{ token: string | null; version: string | null }> {
  const res = await api.post(`${PREFIX}/api/session`, {}, { validateStatus: () => true });
  const token =
    (res.headers['x-session-token'] as string | undefined) ??
    (res.headers['X-Session-Token'] as string | undefined) ??
    null;
  const version =
    (res.headers['x-api-version'] as string | undefined) ??
    (res.headers['X-Api-Version'] as string | undefined) ??
    null;
  return { token, version };
}

function buildFlightsQuery(p: SalamAirFlightSearchParams): string {
  const routes = p.route.split('|');
  const counts = p.counts.split('-');
  const dates = p.dates.split('|');
  const days = typeof p.days === 'number' ? p.days : 7;

  const trip =
    p.flightType === 'oneway' ? '1' : p.flightType === 'multi' ? '3' : '2';

  const first = routes[0]?.split('-') ?? [];
  let stations = `OriginStationCode=${first[0]}&DestinationStationCode=${first[1]}`;
  if (routes.length > 1) {
    const second = routes[1].split('-');
    stations += `&OriginStationCode2=${second[0]}&DestinationStationCode2=${second[1]}`;
  }

  let datePart = `DepartureDate=${dates[0]}`;
  if (dates.length > 1) {
    datePart += p.flightType === 'multi' ? `&DepartureDate2=${dates[1]}` : `&ReturnDate=${dates[1]}`;
  }

  let q = `TripType=${trip}&${stations}&${datePart}`;
  q += `&AdultCount=${counts[0] ?? '1'}&ChildCount=${counts[1] ?? '0'}&InfantCount=${counts[2] ?? '0'}&extraCount=${counts[3] ?? '0'}&days=${days}`;

  if (p.promoCode) q += `&PromoCode=${encodeURIComponent(p.promoCode)}`;
  if (p.source) q += `&AgentId=${encodeURIComponent(p.source)}`;
  if (p.currencyCode) q += `&currencyCode=${encodeURIComponent(p.currencyCode)}`;

  return q;
}

/** GET api/flights?… — requires X-Session-Token (SalamAir session, not portal JWT). */
export async function salamairSearchFlights(
  params: SalamAirFlightSearchParams,
  sessionToken: string,
  culture = 'en'
) {
  const qs = buildFlightsQuery(params);
  return api.get(`${PREFIX}/api/flights?${qs}`, {
    headers: {
      'X-Session-Token': sessionToken,
      Culture: culture,
    },
  });
}
