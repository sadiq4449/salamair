import {
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  TrendingUp,
  DollarSign,
  Timer,
  Users,
  UserCheck,
  Activity,
  Shield,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import type { UserRole } from '../types';

interface StatCard {
  label: string;
  value: string;
  change?: string;
  trend?: 'up' | 'down';
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

const dashboardData: Record<UserRole, { title: string; stats: StatCard[] }> = {
  agent: {
    title: 'Agent Dashboard',
    stats: [
      { label: 'Total Requests', value: '24', change: '+3 this week', trend: 'up', icon: FileText, color: 'bg-blue-500' },
      { label: 'Pending', value: '8', change: '2 new today', trend: 'up', icon: Clock, color: 'bg-amber-500' },
      { label: 'Approved', value: '12', change: '+2 today', trend: 'up', icon: CheckCircle2, color: 'bg-emerald-500' },
      { label: 'Rejected', value: '4', change: '-1 this week', trend: 'down', icon: XCircle, color: 'bg-red-500' },
    ],
  },
  sales: {
    title: 'Sales Dashboard',
    stats: [
      { label: 'Pending Review', value: '15', change: '+5 today', trend: 'up', icon: Clock, color: 'bg-amber-500' },
      { label: 'Approved Today', value: '7', change: '+3 vs yesterday', trend: 'up', icon: TrendingUp, color: 'bg-emerald-500' },
      { label: 'Total Revenue', value: '$48.2K', change: '+12%', trend: 'up', icon: DollarSign, color: 'bg-blue-500' },
      { label: 'Avg Response Time', value: '2.4h', change: '-18%', trend: 'down', icon: Timer, color: 'bg-purple-500' },
    ],
  },
  admin: {
    title: 'Admin Dashboard',
    stats: [
      { label: 'Total Users', value: '156', change: '+8 this month', trend: 'up', icon: Users, color: 'bg-blue-500' },
      { label: 'Active Agents', value: '89', change: '95% uptime', trend: 'up', icon: UserCheck, color: 'bg-emerald-500' },
      { label: 'Total Requests', value: '1,247', change: '+124 this week', trend: 'up', icon: FileText, color: 'bg-amber-500' },
      { label: 'System Health', value: '99.9%', change: 'All systems go', trend: 'up', icon: Activity, color: 'bg-teal-500' },
    ],
  },
};

const recentActivity = [
  { id: 1, text: 'New deal request #1042 created', time: '5 min ago', icon: FileText },
  { id: 2, text: 'Deal #1038 approved by sales team', time: '1 hour ago', icon: CheckCircle2 },
  { id: 3, text: 'User "Ahmed K." registered', time: '2 hours ago', icon: UserCheck },
  { id: 4, text: 'System maintenance completed', time: '4 hours ago', icon: Shield },
];

export default function Dashboard() {
  const { user } = useAuth();
  const role = user?.role ?? 'agent';
  const data = dashboardData[role];

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <div className="bg-gradient-to-r from-teal-600 to-teal-500 rounded-xl p-6 text-white shadow-lg shadow-teal-500/20">
        <h1 className="text-2xl font-bold">
          Welcome back, {user?.name?.split(' ')[0] ?? 'User'}!
        </h1>
        <p className="text-teal-100 mt-1 text-sm">
          Here's what's happening on your {data.title.toLowerCase()} today.
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {data.stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {stat.value}
                </p>
              </div>
              <div className={`${stat.color} rounded-lg p-2.5`}>
                <stat.icon className="h-5 w-5 text-white" />
              </div>
            </div>
            {stat.change && (
              <p
                className={`text-xs mt-3 font-medium ${
                  stat.trend === 'up'
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-red-500 dark:text-red-400'
                }`}
              >
                {stat.change}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Recent activity */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">
            Recent Activity
          </h3>
        </div>
        <ul className="divide-y divide-gray-50 dark:divide-gray-800">
          {recentActivity.map((item) => (
            <li key={item.id} className="flex items-center gap-4 px-6 py-4">
              <div className="w-9 h-9 rounded-lg bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-400 dark:text-gray-500">
                <item.icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-700 dark:text-gray-300">{item.text}</p>
              </div>
              <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">
                {item.time}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
