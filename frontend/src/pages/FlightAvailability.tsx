import { useState } from 'react';
import { ExternalLink, Globe, LayoutGrid, Plane } from 'lucide-react';
import FlightDemoSchedule from './FlightDemoSchedule';

/** The real SalamAir search page served through our reverse proxy. */
const PROXY_SALAMAIR = '/api/v1/proxy/salamair/en/search';

/** Direct link for "open in new tab". */
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
            The live{' '}
            <a
              href={DIRECT_SALAMAIR}
              target="_blank"
              rel="noopener noreferrer"
              className="text-teal-600 dark:text-teal-400 font-medium hover:underline"
            >
              SalamAir booking page
            </a>{' '}
            is loaded below. Switch to <strong>Demo schedule</strong> for the offline reference grid.
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
        <div className="flex flex-col flex-1 min-h-0 -mx-6">
          <div className="flex-1 w-full min-h-[min(85vh,900px)] h-[calc(100vh-11rem)] rounded-none sm:rounded-xl overflow-hidden border-y sm:border border-gray-200 dark:border-gray-700 bg-white shadow-sm">
            <iframe
              title="SalamAir — Book a Flight"
              src={PROXY_SALAMAIR}
              className="w-full h-full border-0 block bg-white"
              sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
            />
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
