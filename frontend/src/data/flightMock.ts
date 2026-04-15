/** Demo-style schedule data (UI.demo_design/agent.js FLIGHTS). Not live inventory. */
export interface FlightRow {
  id: string;
  route: string;
  from: string;
  to: string;
  fromCity: string;
  toCity: string;
  dep: string;
  arr: string;
  duration: string;
  date: string;
  seats: number;
  price: number;
  aircraft: string;
}

export const MOCK_FLIGHTS: FlightRow[] = [
  { id: 'OV101', route: 'MCT-DXB', from: 'MCT', to: 'DXB', fromCity: 'Muscat', toCity: 'Dubai', dep: '06:00', arr: '07:30', duration: '1h 30m', date: '2026-02-01', seats: 42, price: 95, aircraft: 'A320' },
  { id: 'OV103', route: 'MCT-DXB', from: 'MCT', to: 'DXB', fromCity: 'Muscat', toCity: 'Dubai', dep: '14:00', arr: '15:30', duration: '1h 30m', date: '2026-02-01', seats: 18, price: 110, aircraft: 'A320neo' },
  { id: 'OV201', route: 'MCT-KHI', from: 'MCT', to: 'KHI', fromCity: 'Muscat', toCity: 'Karachi', dep: '08:00', arr: '10:30', duration: '2h 30m', date: '2026-02-05', seats: 35, price: 85, aircraft: 'B737' },
  { id: 'OV203', route: 'MCT-KHI', from: 'MCT', to: 'KHI', fromCity: 'Muscat', toCity: 'Karachi', dep: '22:00', arr: '00:30', duration: '2h 30m', date: '2026-02-05', seats: 8, price: 75, aircraft: 'B737' },
  { id: 'OV301', route: 'MCT-BKK', from: 'MCT', to: 'BKK', fromCity: 'Muscat', toCity: 'Bangkok', dep: '09:00', arr: '14:00', duration: '5h', date: '2026-02-10', seats: 22, price: 140, aircraft: 'A321' },
  { id: 'OV303', route: 'MCT-BKK', from: 'MCT', to: 'BKK', fromCity: 'Muscat', toCity: 'Bangkok', dep: '23:00', arr: '04:00', duration: '5h', date: '2026-02-10', seats: 5, price: 125, aircraft: 'A321' },
  { id: 'OV401', route: 'MCT-COK', from: 'MCT', to: 'COK', fromCity: 'Muscat', toCity: 'Kochi', dep: '07:30', arr: '12:30', duration: '3h 30m', date: '2026-02-15', seats: 30, price: 105, aircraft: 'A320' },
  { id: 'OV501', route: 'MCT-MLE', from: 'MCT', to: 'MLE', fromCity: 'Muscat', toCity: 'Maldives', dep: '10:00', arr: '15:00', duration: '4h 30m', date: '2026-02-01', seats: 12, price: 150, aircraft: 'A320neo' },
];

export const ROUTE_OPTIONS = ['', 'MCT-DXB', 'MCT-KHI', 'MCT-BKK', 'MCT-COK', 'MCT-MLE'] as const;
