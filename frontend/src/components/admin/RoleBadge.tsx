import type { UserRole } from '../../types';

const styles: Record<UserRole, string> = {
  agent: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200',
  sales: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
  admin: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200',
};

const labels: Record<UserRole, string> = {
  agent: 'Agent',
  sales: 'Sales',
  admin: 'Admin',
};

export default function RoleBadge({ role }: { role: string }) {
  const r = role as UserRole;
  const cls = styles[r] ?? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
  const label = labels[r] ?? role;
  return (
    <span className={`inline-flex px-2 py-0.5 rounded text-[0.7rem] font-semibold uppercase tracking-wide ${cls}`}>
      {label}
    </span>
  );
}
