import { ExternalLink, Plane } from 'lucide-react';
import SalamAirLiveSearch from '../components/flight/SalamAirLiveSearch';

/** Direct link to SalamAir's own site (full booking UI + payment). */
const DIRECT_SALAMAIR = 'https://booking.salamair.com/en/search';

export default function FlightAvailability() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 h-full min-h-0 w-full">
      <div className="flex flex-col gap-4 border-b border-gray-200/90 pb-5 dark:border-gray-700/80 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-2xl flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-600/10 dark:bg-teal-500/15">
              <Plane className="h-5 w-5 text-teal-600 dark:text-teal-400" aria-hidden />
            </span>
            Book a flight
          </h1>
        </div>

        <a
          href={DIRECT_SALAMAIR}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center gap-2 self-start rounded-xl border border-teal-200 bg-teal-50/90 px-3.5 py-2 text-sm font-semibold text-teal-800 shadow-sm transition-colors hover:bg-teal-100/90 dark:border-teal-800/60 dark:bg-teal-950/50 dark:text-teal-200 dark:hover:bg-teal-900/40 sm:self-auto"
        >
          <ExternalLink className="h-4 w-4 opacity-90" />
          SalamAir.com
        </a>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <SalamAirLiveSearch />
      </div>
    </div>
  );
}
