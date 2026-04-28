import { User, Shield, MapPin, Calendar, Mail } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { ROLE_LABELS } from '../utils/constants';
import AgentDashboard from './agent/AgentDashboard';
import SalesDashboard from './sales/SalesDashboard';
import Analytics from './Analytics';

export default function Dashboard() {
  const { user } = useAuth();
  const role = user?.role ?? 'agent';

  if (role === 'agent') return <AgentDashboard />;
  if (role === 'sales') return <SalesDashboard />;

  return <AdminDashboard />;
}

function AdminDashboard() {
  const { user } = useAuth();
  const role = user?.role ?? 'admin';

  const createdDate = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '—';

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <div className="bg-gradient-to-r from-[#003B3F] to-[#00A99D] rounded-xl p-6 text-white shadow-sm transition-all duration-200">
        <h1 className="text-2xl font-bold">
          Welcome back, {user?.name?.split(' ')[0] ?? 'User'}!
        </h1>
        <p className="text-white/85 mt-1 text-sm">
          You are logged in as <span className="font-semibold text-white">{ROLE_LABELS[role]}</span>.
        </p>
      </div>

      {/* Profile card */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-border dark:border-gray-800 shadow-sm">
        <div className="px-6 py-4 border-b border-border dark:border-gray-800">
          <h3 className="text-xl font-semibold text-gray-800 dark:text-white">
            Your Profile
          </h3>
        </div>
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
          <ProfileField icon={User} label="Full Name" value={user?.name ?? '—'} />
          <ProfileField icon={Mail} label="Email" value={user?.email ?? '—'} />
          <ProfileField icon={Shield} label="Role" value={ROLE_LABELS[role]} />
          <ProfileField icon={MapPin} label="City" value={user?.city ?? 'Not set'} />
          <ProfileField icon={Calendar} label="Joined" value={createdDate} />
          <ProfileField
            icon={User}
            label="Status"
            value={user?.is_active ? 'Active' : 'Inactive'}
            valueColor={user?.is_active ? 'text-green-700 dark:text-green-400' : 'text-red-500'}
          />
        </div>
      </div>

      <Analytics embedded />
    </div>
  );
}

function ProfileField({
  icon: Icon,
  label,
  value,
  valueColor,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-400 dark:text-gray-500 shrink-0">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
        <p className={`text-sm font-medium ${valueColor ?? 'text-gray-800 dark:text-gray-200'}`}>
          {value}
        </p>
      </div>
    </div>
  );
}
