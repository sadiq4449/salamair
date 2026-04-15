import { useEffect, useState } from 'react';
import { Clock, AlertTriangle, AlertOctagon } from 'lucide-react';
import { notificationService } from '../services/notificationService';
import type { SlaInfo, SlaColor } from '../types';

const colorConfig: Record<SlaColor, { bg: string; text: string; ring: string; icon: React.ElementType }> = {
  green: {
    bg: 'bg-emerald-50 dark:bg-emerald-900/20',
    text: 'text-emerald-700 dark:text-emerald-400',
    ring: 'ring-emerald-200 dark:ring-emerald-800',
    icon: Clock,
  },
  yellow: {
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    text: 'text-amber-700 dark:text-amber-400',
    ring: 'ring-amber-200 dark:ring-amber-800',
    icon: Clock,
  },
  orange: {
    bg: 'bg-orange-50 dark:bg-orange-900/20',
    text: 'text-orange-700 dark:text-orange-400',
    ring: 'ring-orange-200 dark:ring-orange-800',
    icon: AlertTriangle,
  },
  red: {
    bg: 'bg-red-50 dark:bg-red-900/20',
    text: 'text-red-700 dark:text-red-400',
    ring: 'ring-red-200 dark:ring-red-800',
    icon: AlertOctagon,
  },
};

function formatDuration(seconds: number): string {
  if (seconds <= 0) return 'Overdue';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

interface SlaIndicatorProps {
  requestId: string;
  compact?: boolean;
}

export default function SlaIndicator({ requestId, compact = false }: SlaIndicatorProps) {
  const [sla, setSla] = useState<SlaInfo | null>(null);
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    notificationService.getRequestSla(requestId).then((res) => {
      if (res.sla) {
        setSla(res.sla);
        setRemaining(res.sla.remaining_seconds);
      }
    }).catch(() => {});
  }, [requestId]);

  useEffect(() => {
    if (!sla || remaining <= 0) return;
    const timer = setInterval(() => {
      setRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [sla, remaining]);

  if (!sla) return null;

  const currentColor = remaining <= 0
    ? 'red'
    : remaining / sla.total_seconds < 0.25
    ? 'orange'
    : remaining / sla.total_seconds < 0.5
    ? 'yellow'
    : 'green';

  const config = colorConfig[currentColor];
  const Icon = config.icon;
  const percentage = Math.max(0, Math.min(100, (remaining / sla.total_seconds) * 100));

  if (compact) {
    return (
      <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium ring-1 ${config.bg} ${config.text} ${config.ring}`}>
        <Icon className="h-3 w-3" />
        <span>{formatDuration(remaining)}</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 px-3 py-2.5 rounded-lg ring-1 ${config.bg} ${config.ring}`}>
      <Icon className={`h-4 w-4 shrink-0 ${config.text}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className={`text-xs font-semibold ${config.text}`}>
            SLA: {remaining > 0 ? sla.label : 'Overdue'}
          </span>
          <span className={`text-xs font-medium ${config.text}`}>
            {formatDuration(remaining)}
          </span>
        </div>
        <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${
              currentColor === 'green' ? 'bg-emerald-500' :
              currentColor === 'yellow' ? 'bg-amber-500' :
              currentColor === 'orange' ? 'bg-orange-500' :
              'bg-red-500'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    </div>
  );
}
