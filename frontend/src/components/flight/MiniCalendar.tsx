import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function toISODate(y: number, m0: number, d: number) {
  return `${y}-${pad(m0 + 1)}-${pad(d)}`;
}

function parseISODate(iso: string): { y: number; m0: number; d: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  if (mo < 0 || mo > 11 || d < 1 || d > 31) return null;
  return { y, m0: mo, d };
}

function isToday(y: number, m0: number, d: number) {
  const now = new Date();
  return y === now.getFullYear() && m0 === now.getMonth() && d === now.getDate();
}

type Props = {
  value: string;
  onChange: (iso: string) => void;
  defaultMonth?: { year: number; month0: number };
  minDate?: string;
  maxDate?: string;
  className?: string;
  /** Show previous-month control (Salam Air–style: hide on left calendar if only “forward” is needed). */
  showNavPrev?: boolean;
  /** Show next-month control. */
  showNavNext?: boolean;
};

export default function MiniCalendar({
  value,
  onChange,
  defaultMonth = { year: new Date().getFullYear(), month0: new Date().getMonth() },
  minDate,
  maxDate,
  className = '',
  showNavPrev = true,
  showNavNext = true,
}: Props) {
  const selected = value ? parseISODate(value) : null;

  const [viewYear, setViewYear] = useState(() => (selected ? selected.y : defaultMonth.year));
  const [viewMonth0, setViewMonth0] = useState(() => (selected ? selected.m0 : defaultMonth.month0));

  useEffect(() => {
    if (selected) {
      setViewYear(selected.y);
      setViewMonth0(selected.m0);
    }
  }, [value]);

  const monthLabel = useMemo(
    () =>
      new Date(viewYear, viewMonth0, 1)
        .toLocaleString('en-US', { month: 'long', year: 'numeric' })
        .toUpperCase(),
    [viewYear, viewMonth0]
  );

  const cells = useMemo(() => {
    const first = new Date(viewYear, viewMonth0, 1);
    const startPad = first.getDay();
    const daysInMonth = new Date(viewYear, viewMonth0 + 1, 0).getDate();
    const out: ({ day: number } | null)[] = [];
    for (let i = 0; i < startPad; i++) out.push(null);
    for (let d = 1; d <= daysInMonth; d++) out.push({ day: d });
    return out;
  }, [viewYear, viewMonth0]);

  function isDisabled(y: number, m0: number, d: number) {
    const iso = toISODate(y, m0, d);
    if (minDate && iso < minDate) return true;
    if (maxDate && iso > maxDate) return true;
    return false;
  }

  function goNext() {
    const n = new Date(viewYear, viewMonth0 + 1, 1);
    setViewYear(n.getFullYear());
    setViewMonth0(n.getMonth());
  }

  function goPrev() {
    const n = new Date(viewYear, viewMonth0 - 1, 1);
    setViewYear(n.getFullYear());
    setViewMonth0(n.getMonth());
  }

  const maxMonth = maxDate ? parseISODate(maxDate) : null;
  const minMonth = minDate ? parseISODate(minDate) : null;
  const nextDisabled =
    maxMonth && (viewYear > maxMonth.y || (viewYear === maxMonth.y && viewMonth0 >= maxMonth.m0));
  const prevDisabled =
    minMonth && (viewYear < minMonth.y || (viewYear === minMonth.y && viewMonth0 <= minMonth.m0));

  return (
    <div
      className={`overflow-hidden rounded border border-[#E0E0E0] bg-white dark:border-gray-600 dark:bg-gray-900 ${className}`}
    >
      {/* Month header — green controls like Salam Air main site */}
      <div className="flex items-center justify-between bg-gray-100 px-2 py-2 dark:bg-gray-800 sm:px-3">
        {showNavPrev ? (
          <button
            type="button"
            onClick={goPrev}
            disabled={!!prevDisabled}
            className="rounded p-1 text-gray-500 hover:text-[#76B82A] disabled:cursor-not-allowed disabled:opacity-30 dark:text-gray-400"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        ) : (
          <span className="w-7" aria-hidden />
        )}
        <span className="text-[11px] font-bold tracking-wider text-gray-800 dark:text-gray-200 sm:text-xs">
          {monthLabel}
        </span>
        {showNavNext ? (
          <button
            type="button"
            onClick={goNext}
            disabled={!!nextDisabled}
            className="rounded-md bg-[#76B82A] p-1.5 text-white hover:bg-[#6aa823] disabled:cursor-not-allowed disabled:opacity-30"
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        ) : (
          <span className="w-7" aria-hidden />
        )}
      </div>

      <div className="p-2.5">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 text-center text-[11px] font-semibold text-gray-500 dark:text-gray-400 mb-1">
          {WEEKDAYS.map((w) => (
            <div key={w} className="py-1">
              {w}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 gap-px">
          {cells.map((cell, i) => {
            if (!cell) return <div key={`e-${i}`} className="aspect-square min-h-[30px]" />;
            const d = cell.day;
            const iso = toISODate(viewYear, viewMonth0, d);
            const disabled = isDisabled(viewYear, viewMonth0, d);
            const isSel =
              selected && selected.y === viewYear && selected.m0 === viewMonth0 && selected.d === d;
            const today = isToday(viewYear, viewMonth0, d);

            return (
              <button
                key={iso}
                type="button"
                disabled={disabled}
                onClick={() => !disabled && onChange(iso)}
                className={[
                  'flex aspect-square min-h-[30px] items-center justify-center rounded-sm text-xs transition-colors',
                  disabled
                    ? 'cursor-not-allowed text-gray-300 dark:text-gray-600'
                    : 'text-gray-800 hover:bg-[#00A9C1]/10 dark:text-gray-200',
                  isSel
                    ? 'bg-[#00A9C1] font-bold text-white hover:bg-[#00A9C1]'
                    : '',
                  today && !isSel ? 'font-bold text-[#76B82A]' : '',
                ].join(' ')}
              >
                {d}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
