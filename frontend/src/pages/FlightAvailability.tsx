import { useState } from 'react';
import { ExternalLink, Globe, LayoutGrid, Plane } from 'lucide-react';
import FlightDemoSchedule from './FlightDemoSchedule';

/** Official SalamAir book-a-flight search (same URL as the public site). */
export const SALAMAIR_BOOKING_SEARCH = 'https://booking.salamair.com/en/search';

export default function FlightAvailability() {
  const [mode, setMode] = useState<'live' | 'demo'>('live');

  return (
    <div className="flex flex-col gap-4 min-h-0">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Plane className="h-7 w-7 text-teal-600 shrink-0" />
            Book a flight
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-2xl">
            The live SalamAir booking experience is embedded below (
            <a
              href={SALAMAIR_BOOKING_SEARCH}
              target="_blank"
              rel="noopener noreferrer"
              className="text-teal-600 dark:text-teal-400 font-medium hover:underline"
            >
              booking.salamair.com/en/search
            </a>
            ). Use <span className="font-medium text-gray-700 dark:text-gray-300">Demo schedule</span> for the
            offline reference grid only.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div
            className="inline-flex rounded-lg border border-gray-200 dark:border-gray-700 p-0.5 bg-gray-100/90 dark:bg-gray-800/90"
            role="tablist"
            aria-label="Booking source"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'live'}
              onClick={() => setMode('live')}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                mode === 'live'
                  ? 'bg-white dark:bg-gray-900 text-teal-700 dark:text-teal-300 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <Globe className="h-4 w-4" />
              SalamAir website
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'demo'}
              onClick={() => setMode('demo')}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                mode === 'demo'
                  ? 'bg-white dark:bg-gray-900 text-teal-700 dark:text-teal-300 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <LayoutGrid className="h-4 w-4" />
              Demo schedule
            </button>
          </div>
          <a
            href={SALAMAIR_BOOKING_SEARCH}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm font-medium text-teal-600 dark:text-teal-400 hover:bg-teal-50/80 dark:hover:bg-teal-900/20 transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
            Open in new tab
          </a>
        </div>
      </div>

      {mode === 'live' ? (
        <div className="flex flex-col flex-1 min-h-0 -mx-6">
          <p className="text-xs text-amber-800 dark:text-amber-200/90 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 rounded-lg px-3 py-2 mb-3 mx-6 sm:mx-0">
            If you see a blank area, the airline site may block embedding (browser security). Use{' '}
            <span className="font-medium">Open in new tab</span> — that always loads the full{' '}
            <a
              href={SALAMAIR_BOOKING_SEARCH}
              target="_blank"
              rel="noopener noreferrer"
              className="text-teal-700 dark:text-teal-300 underline"
            >
              SalamAir booking page
            </a>
            .
          </p>
          <div
            className="flex-1 w-full min-h-[min(85vh,900px)] h-[calc(100vh-12.5rem)] rounded-none sm:rounded-xl overflow-hidden border-y sm:border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm"
          >
            <iframe
              title="SalamAir — Book a flight"
              src={SALAMAIR_BOOKING_SEARCH}
              className="w-full h-full border-0 block bg-white"
              referrerPolicy="strict-origin-when-cross-origin"
            />
          </div>
        </div>
      ) : (
        <FlightDemoSchedule />
      )}
    </div>
  );
}
