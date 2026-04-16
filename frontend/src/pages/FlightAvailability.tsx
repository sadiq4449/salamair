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
    <div className="flex flex-col gap-4 h-full min-h-0">
      {/* ── Header bar ── */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Plane className="h-7 w-7 text-teal-600 shrink-0" />
            Book a Flight
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-2xl">
            <strong>SalamAir Live</strong> searches availability via our backend (SalamAir&apos;s API). For booking and
            payment, use{' '}
            <a
              href={DIRECT_SALAMAIR}
              target="_blank"
              rel="noopener noreferrer"
              className="text-teal-600 dark:text-teal-400 font-medium hover:underline"
            >
              booking.salamair.com
            </a>{' '}
            in a new tab. Switch to <strong>Demo schedule</strong> for the offline reference grid.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* Tab switcher */}
          <div
            className="inline-flex rounded-lg border border-gray-200 dark:border-gray-700 p-0.5 bg-gray-100/90 dark:bg-gray-800/90"
            role="tablist"
            aria-label="Booking source"
          >
            <TabButton
              active={view === 'live'}
              onClick={() => setView('live')}
              icon={<Globe className="h-4 w-4" />}
              label="SalamAir Live"
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
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm font-medium text-teal-600 dark:text-teal-400 hover:bg-teal-50/80 dark:hover:bg-teal-900/20 transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
            Open in new tab
          </a>
        </div>
      </div>

      {/* ── Content ── */}
      {view === 'live' ? (
        <div className="flex flex-col flex-1 min-h-0 -mx-6 px-6 sm:px-0">
          <div className="flex-1 w-full rounded-none sm:rounded-xl border-y sm:border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/20 p-4 sm:p-6">
            <SalamAirLiveSearch />
          </div>
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
      className={`inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
        active
          ? 'bg-white dark:bg-gray-900 text-teal-700 dark:text-teal-300 shadow-sm'
          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
