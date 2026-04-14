import type { RequestStatus } from '../../types';

const statusConfig: Record<RequestStatus, { label: string; className: string }> = {
  draft: {
    label: 'Draft',
    className: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  },
  submitted: {
    label: 'Submitted',
    className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  },
  under_review: {
    label: 'Under Review',
    className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  },
  rm_pending: {
    label: 'RM Pending',
    className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  },
  approved: {
    label: 'Approved',
    className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  },
  rejected: {
    label: 'Rejected',
    className: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  },
  counter_offered: {
    label: 'Counter Offered',
    className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  },
};

interface StatusBadgeProps {
  status: RequestStatus;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status] ?? statusConfig.draft;
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${config.className}`}
    >
      {config.label}
    </span>
  );
}
