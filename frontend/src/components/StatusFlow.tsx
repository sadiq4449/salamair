import { Check } from 'lucide-react';
import type { RequestStatus } from '../types';

const steps = [
  { key: 'draft', label: 'Draft' },
  { key: 'submitted', label: 'Submitted' },
  { key: 'under_review', label: 'Review' },
  { key: 'decision', label: 'Decision' },
];

const statusToStepIndex: Record<string, number> = {
  draft: 0,
  submitted: 1,
  under_review: 2,
  rm_pending: 2,
  approved: 3,
  rejected: 3,
  counter_offered: 3,
};

interface StatusFlowProps {
  status: RequestStatus;
}

export default function StatusFlow({ status }: StatusFlowProps) {
  const currentIdx = statusToStepIndex[status] ?? 0;

  return (
    <div className="flex items-center w-full mt-4">
      {steps.map((step, idx) => {
        const isDone = idx < currentIdx;
        const isCurrent = idx === currentIdx;

        return (
          <div key={step.key} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-colors ${
                  isDone
                    ? 'bg-teal-600 border-teal-600 text-white'
                    : isCurrent
                    ? 'bg-teal-50 border-teal-600 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400'
                    : 'bg-gray-100 border-gray-300 text-gray-400 dark:bg-gray-800 dark:border-gray-600'
                }`}
              >
                {isDone ? <Check size={16} /> : idx + 1}
              </div>
              <span
                className={`mt-1.5 text-[0.65rem] font-medium whitespace-nowrap ${
                  isDone || isCurrent
                    ? 'text-teal-700 dark:text-teal-400'
                    : 'text-gray-400 dark:text-gray-500'
                }`}
              >
                {step.label}
              </span>
            </div>
            {idx < steps.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-2 mt-[-1rem] ${
                  idx < currentIdx
                    ? 'bg-teal-600'
                    : 'bg-gray-200 dark:bg-gray-700'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
