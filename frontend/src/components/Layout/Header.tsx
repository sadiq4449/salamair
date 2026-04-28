import { Menu, ChevronRight } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import NotificationBell from '../notifications/NotificationBell';
import GlobalSearchBar from '../GlobalSearchBar';

interface HeaderProps {
  onMenuClick: () => void;
}

const titleMap: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/requests': 'All Requests',
  '/pending': 'Pending Approvals',
  '/notifications': 'Notifications',
  '/notifications/settings': 'Notification Settings',
  '/search': 'Search',
  '/sla-dashboard': 'SLA dashboard',
  '/bulk-upload': 'Bulk upload',
};

export default function Header({ onMenuClick }: HeaderProps) {
  const { pathname } = useLocation();
  const resolveTitle = () => {
    if (titleMap[pathname]) return titleMap[pathname];
    if (pathname.startsWith('/requests/')) return 'Request Detail';
    if (pathname.startsWith('/pending/')) return 'Request Review';
    if (pathname.startsWith('/admin/reminders')) return 'Reminder settings';
    if (pathname.startsWith('/admin/tags')) return 'Tags';
    return 'Dashboard';
  };
  const pageTitle = resolveTitle();

  return (
    <header className="sticky top-0 z-30 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-border dark:border-gray-800 flex items-center justify-between px-6 py-3">
      <div className="flex items-center gap-4 min-w-0">
        <button
          onClick={onMenuClick}
          className="md:hidden shrink-0 p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 mb-0.5">
            <span>Home</span>
            <ChevronRight className="h-3 w-3 shrink-0" />
            <span className="text-gray-600 dark:text-gray-300 truncate">{pageTitle}</span>
          </div>
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white leading-tight truncate">
            {pageTitle}
          </h2>
        </div>
      </div>

      <div className="hidden md:flex flex-1 justify-center items-center px-4 max-w-xl mx-auto min-w-0">
        <GlobalSearchBar />
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <NotificationBell />
      </div>
    </header>
  );
}
