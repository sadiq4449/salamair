import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Home,
  List,
  TrendingUp,
  Clock,
  Shield,
  Plane,
  Moon,
  Sun,
  LogOut,
  X,
  Plus,
  Bell,
  BarChart3,
  Settings2,
  Timer,
  Upload,
  MapPin,
  Inbox,
  Users,
  ListOrdered,
} from 'lucide-react';
import SalamAirBrandLogo from '../branding/SalamAirBrandLogo';
import { useAuth } from '../../hooks/useAuth';
import { ROLE_LABELS } from '../../utils/constants';
import { useThemeStore } from '../../store/themeStore';
import CreateRequestModal from '../CreateRequestModal';

interface NavItem {
  label: string;
  path: string;
  icon: React.ElementType;
}

const navByRole: Record<string, NavItem[]> = {
  agent: [
    { label: 'Dashboard', path: '/dashboard', icon: Home },
    { label: 'All Requests', path: '/requests', icon: List },
    { label: 'Flight availability', path: '/flights', icon: Plane },
    { label: 'Bulk upload', path: '/bulk-upload', icon: Upload },
    { label: 'Analytics', path: '/analytics', icon: BarChart3 },
    { label: 'Notifications', path: '/notifications', icon: Bell },
  ],
  sales: [
    { label: 'Sales Dashboard', path: '/dashboard', icon: TrendingUp },
    { label: 'Pending Approvals', path: '/pending', icon: Clock },
    { label: 'Email aggregation', path: '/inbox', icon: Inbox },
    { label: 'City-wise view', path: '/city-view', icon: MapPin },
    { label: 'Agent history', path: '/agent-history', icon: Users },
    { label: 'Flight availability', path: '/flights', icon: Plane },
    { label: 'SLA dashboard', path: '/sla-dashboard', icon: Timer },
    { label: 'Analytics', path: '/analytics', icon: BarChart3 },
    { label: 'Notifications', path: '/notifications', icon: Bell },
  ],
  admin: [
    { label: 'Dashboard', path: '/dashboard', icon: Shield },
    { label: 'Admin panel', path: '/admin/dashboard', icon: Settings2 },
    { label: 'Pending Approvals', path: '/pending', icon: Clock },
    { label: 'Requests', path: '/requests', icon: List },
    { label: 'All requests', path: '/admin/requests', icon: ListOrdered },
    { label: 'Bulk upload', path: '/bulk-upload', icon: Upload },
    { label: 'Email aggregation', path: '/inbox', icon: Inbox },
    { label: 'SLA dashboard', path: '/sla-dashboard', icon: Timer },
    { label: 'Flight availability', path: '/flights', icon: Plane },
    { label: 'Notifications', path: '/notifications', icon: Bell },
  ],
};

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

function isNavItemActive(itemPath: string, pathname: string): boolean {
  if (itemPath === '/admin/dashboard') {
    return pathname === '/admin' || pathname === '/admin/dashboard';
  }
  if (itemPath.startsWith('/admin/')) {
    return pathname === itemPath || pathname.startsWith(`${itemPath}/`);
  }
  return pathname === itemPath || pathname.startsWith(`${itemPath}/`);
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { isDark, toggle } = useThemeStore();
  const [showCreate, setShowCreate] = useState(false);

  const role = user?.role || 'agent';
  const items = navByRole[role] || navByRole.agent;
  const initials = user?.name
    ?.split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '??';

  function handleNav(path: string) {
    navigate(path);
    if (window.innerWidth <= 768) onClose();
  }

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-[99] md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 left-0 h-screen w-[260px] bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col z-[100] transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Logo — official SalamAir mark */}
        <div className="px-4 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1 pr-1">
            <SalamAirBrandLogo heightClass="h-8 sm:h-9" className="max-h-[2.15rem] sm:max-h-[2.35rem]" />
            <p className="mt-1.5 text-[0.65rem] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              SmartDeal Platform
            </p>
          </div>
          <button className="md:hidden text-gray-400 hover:text-gray-600" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Role badge */}
        <div className="px-5 pt-3 pb-1">
          <span
            className={`inline-block px-3 py-1 rounded-full text-[0.7rem] font-semibold uppercase ${
              role === 'admin'
                ? 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                : role === 'sales'
                ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                : 'bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300'
            }`}
          >
            {ROLE_LABELS[role]}
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 overflow-y-auto">
          <div className="text-[0.65rem] font-semibold uppercase text-gray-400 px-3 pb-2 tracking-wider">
            Main
          </div>
          {items.map((item) => {
            const active = isNavItemActive(item.path, location.pathname);
            return (
              <div
                key={item.path}
                onClick={() => handleNav(item.path)}
                className={`flex items-center gap-3 px-4 py-2.5 my-0.5 rounded-lg cursor-pointer text-[0.88rem] font-medium transition-all duration-200 ${
                  active
                    ? 'bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-800 dark:hover:text-gray-200'
                }`}
              >
                <item.icon size={18} />
                <span>{item.label}</span>
              </div>
            );
          })}
        </nav>

        {/* Agent quick action */}
        {(role === 'agent' || role === 'admin') && (
          <div className="px-3 pb-2">
            <div className="text-[0.65rem] font-semibold uppercase text-gray-400 px-3 pb-2 tracking-wider">
              Actions
            </div>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 w-full px-4 py-2.5 rounded-lg text-sm font-medium bg-teal-600 text-white hover:bg-teal-700 transition-colors"
            >
              <Plus size={16} />
              Create Request
            </button>
          </div>
        )}

        {/* Bottom section */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
          <button
            onClick={toggle}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
            {isDark ? 'Light Mode' : 'Dark Mode'}
          </button>

          <div className="flex items-center gap-3 p-3 rounded-lg">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-teal-600 to-blue-500 flex items-center justify-center text-white font-semibold text-sm shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">
                {user?.name}
              </div>
              <div className="text-[0.72rem] text-gray-400 truncate">{user?.email}</div>
            </div>
            <button
              onClick={logout}
              title="Sign out"
              className="text-gray-400 hover:text-red-500 transition-colors"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {(role === 'agent' || role === 'admin') && (
        <CreateRequestModal
          isOpen={showCreate}
          onClose={() => setShowCreate(false)}
        />
      )}
    </>
  );
}
