import { ExternalLink } from 'lucide-react';
import SalamAirBrandLogo from '../components/branding/SalamAirBrandLogo';
import SalamAirLiveSearch from '../components/flight/SalamAirLiveSearch';

/** Direct link to SalamAir's own site (full booking UI + payment). */
const DIRECT_SALAMAIR = 'https://booking.salamair.com/en/search';

export default function FlightAvailability() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 h-full min-h-0 w-full">
      <div className="flex flex-col gap-4 border-b border-gray-200/90 pb-5 dark:border-gray-700/80 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <div className="min-w-0 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
          <div className="shrink-0">
            <SalamAirBrandLogo heightClass="h-9 sm:h-10" className="max-w-[12rem] sm:max-w-[14rem]" />
          </div>
          <h1 className="text-lg font-bold tracking-tight text-gray-900 dark:text-white sm:text-xl">
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
