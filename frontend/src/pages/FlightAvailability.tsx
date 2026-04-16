import { useState } from 'react';
import { ExternalLink, Globe, LayoutGrid, Plane } from 'lucide-react';
import SalamAirLiveSearch from '../components/flight/SalamAirLiveSearch';
import FlightDemoSchedule from './FlightDemoSchedule';

/** Direct link to SalamAir's own site (full booking UI + payment). */
const DIRECT_SALAMAIR = 'https://booking.salamair.com/en/search';

type ViewMode = 'live' | 'demo';

export default function FlightAvailability() {
  const [view, setView] = useState<ViewMode>('live');

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 h-full min-h-0 w-full">
      {/* Page header — single aligned band */}
      <div className="flex flex-col gap-4 border-b border-gray-200/90 pb-5 dark:border-gray-700/80 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-2xl flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-600/10 dark:bg-teal-500/15">
              <Plane className="h-5 w-5 text-teal-600 dark:text-teal-400" aria-hidden />
            </span>
            Book a flight
          </h1>
          <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">
            Live fares from SalamAir ·{' '}
            <a
              href={DIRECT_SALAMAIR}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-teal-600 hover:underline dark:text-teal-400"
            >
              Open full site
            </a>{' '}
            to book and pay
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:justify-end shrink-0">
          <div
            className="inline-flex rounded-xl border border-gray-200 bg-white p-1 shadow-sm dark:border-gray-600 dark:bg-gray-800/80"
            role="tablist"
            aria-label="Booking source"
          >
            <TabButton
              active={view === 'live'}
              onClick={() => setView('live')}
              icon={<Globe className="h-4 w-4" />}
              label="SalamAir live"
            />
            <TabButton
              active={view === 'demo'}
              onClick={() => setView('demo')}
              icon={<LayoutGrid className="h-4 w-4" />}
              label="Demo schedule"
            />
          </div>

          <a
            href={DIRECT_SALAMAIR}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl border border-teal-200 bg-teal-50/90 px-3.5 py-2 text-sm font-semibold text-teal-800 shadow-sm transition-colors hover:bg-teal-100/90 dark:border-teal-800/60 dark:bg-teal-950/50 dark:text-teal-200 dark:hover:bg-teal-900/40"
          >
            <ExternalLink className="h-4 w-4 opacity-90" />
            SalamAir.com
          </a>
        </div>
      </div>

      {view === 'live' ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <SalamAirLiveSearch />
        </div>
      ) : (
        <FlightDemoSchedule />
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors ${
        active
          ? 'bg-teal-600 text-white shadow-sm dark:bg-teal-600'
          : 'text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-700/50 dark:hover:text-gray-200'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
