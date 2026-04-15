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
    <header className="sticky top-0 z-30 h-16 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="md:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div>
          <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500 mb-0.5">
            <span>Home</span>
            <ChevronRight className="h-3 w-3" />
            <span className="text-gray-600 dark:text-gray-300">{pageTitle}</span>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white leading-tight">
            {pageTitle}
          </h2>
        </div>
      </div>

      <div className="hidden md:flex flex-1 justify-center px-4 max-w-xl mx-auto">
        <GlobalSearchBar />
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <NotificationBell />
      </div>
    </header>
  );
}
