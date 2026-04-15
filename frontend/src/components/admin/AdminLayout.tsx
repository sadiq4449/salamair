import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, Users, Building2, ScrollText, Sliders, Bell, Tag, ListOrdered } from 'lucide-react';

const links = [
  { to: '/admin/dashboard', label: 'Overview', icon: LayoutDashboard },
  { to: '/admin/requests', label: 'All requests', icon: ListOrdered },
  { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/agents', label: 'Agents', icon: Building2 },
  { to: '/admin/logs', label: 'Logs', icon: ScrollText },
  { to: '/admin/config', label: 'Config', icon: Sliders },
  { to: '/admin/reminders', label: 'Reminders', icon: Bell },
  { to: '/admin/tags', label: 'Tags', icon: Tag },
];

export default function AdminLayout() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Administration</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          User governance, agent profiles, audit logs, and system settings.
        </p>
      </div>

      <nav className="flex flex-wrap gap-2 border-b border-gray-200 dark:border-gray-800 pb-3">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-200'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`
            }
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>

      <Outlet />
    </div>
  );
}
