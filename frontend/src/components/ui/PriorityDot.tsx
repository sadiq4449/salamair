import type { Priority } from '../../types';

interface PriorityDotProps {
  priority: Priority;
}

export default function PriorityDot({ priority }: PriorityDotProps) {
  const isUrgent = priority === 'urgent';
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={`inline-block w-2 h-2 rounded-full ${
          isUrgent ? 'bg-red-500' : 'bg-gray-400'
        }`}
      />
      <span
        className={`text-xs font-medium capitalize ${
          isUrgent ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'
        }`}
      >
        {priority}
      </span>
    </span>
  );
}
