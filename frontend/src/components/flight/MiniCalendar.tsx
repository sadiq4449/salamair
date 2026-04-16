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

type Props = {
  value: string;
  onChange: (iso: string) => void;
  /** Month shown when user has not picked a date matching a month yet */
  defaultMonth?: { year: number; month0: number };
  minDate?: string;
  maxDate?: string;
  className?: string;
};

export default function MiniCalendar({
  value,
  onChange,
  defaultMonth = { year: new Date().getFullYear(), month0: new Date().getMonth() },
  minDate,
  maxDate,
  className = '',
}: Props) {
  const selected = value ? parseISODate(value) : null;

  const [viewYear, setViewYear] = useState(() =>
    selected ? selected.y : defaultMonth.year
  );
  const [viewMonth0, setViewMonth0] = useState(() =>
    selected ? selected.m0 : defaultMonth.month0
  );

  useEffect(() => {
    if (selected) {
      setViewYear(selected.y);
      setViewMonth0(selected.m0);
    }
  }, [value]);

  const monthLabel = useMemo(() => {
    return new Date(viewYear, viewMonth0, 1).toLocaleString('en-US', {
      month: 'long',
      year: 'numeric',
    });
  }, [viewYear, viewMonth0]);

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

  const maxMonth = maxDate ? parseISODate(maxDate) : null;
  const minMonth = minDate ? parseISODate(minDate) : null;
  const nextDisabled =
    maxMonth &&
    (viewYear > maxMonth.y || (viewYear === maxMonth.y && viewMonth0 >= maxMonth.m0));
  const prevDisabled =
    minMonth &&
    (viewYear < minMonth.y || (viewYear === minMonth.y && viewMonth0 <= minMonth.m0));

  function goPrev() {
    const n = new Date(viewYear, viewMonth0 - 1, 1);
    setViewYear(n.getFullYear());
    setViewMonth0(n.getMonth());
  }

  return (
    <div
      className={`rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 p-3 shadow-sm ${className}`}
    >
      <div className="flex items-center justify-between mb-2 gap-1">
        <button
          type="button"
          onClick={goPrev}
          disabled={!!prevDisabled}
          className="p-1 rounded-md text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/30 disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <span className="text-sm font-semibold text-gray-800 dark:text-gray-100 flex-1 text-center">
          {monthLabel}
        </span>
        <button
          type="button"
          onClick={goNext}
          disabled={!!nextDisabled}
          className="p-1 rounded-md text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/30 disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
          aria-label="Next month"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-0.5 text-center text-[0.65rem] font-medium text-gray-500 dark:text-gray-400 mb-1">
        {WEEKDAYS.map((w) => (
          <div key={w} className="py-1">
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((cell, i) => {
          if (!cell) return <div key={`e-${i}`} className="aspect-square min-h-[28px]" />;
          const d = cell.day;
          const iso = toISODate(viewYear, viewMonth0, d);
          const disabled = isDisabled(viewYear, viewMonth0, d);
          const isSel = selected && selected.y === viewYear && selected.m0 === viewMonth0 && selected.d === d;
          return (
            <button
              key={iso}
              type="button"
              disabled={disabled}
              onClick={() => !disabled && onChange(iso)}
              className={[
                'aspect-square min-h-[28px] text-xs rounded transition-colors',
                disabled
                  ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                  : 'text-gray-800 dark:text-gray-100 hover:bg-sky-100 dark:hover:bg-sky-900/40',
                isSel ? 'bg-sky-200 dark:bg-sky-800 font-semibold' : '',
              ].join(' ')}
            >
              {d}
            </button>
          );
        })}
      </div>
    </div>
  );
}
