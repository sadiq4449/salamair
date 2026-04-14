import { Bell, Menu, ChevronRight } from 'lucide-react';
import { useLocation } from 'react-router-dom';

interface HeaderProps {
  onMenuClick: () => void;
}

const titleMap: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/requests': 'All Requests',
  '/approvals': 'Pending Approvals',
  '/analytics': 'Analytics',
  '/users': 'User Management',
};

export default function Header({ onMenuClick }: HeaderProps) {
  const { pathname } = useLocation();
  const pageTitle = titleMap[pathname] ?? 'Dashboard';

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

      <div className="flex items-center gap-3">
        <button className="relative p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-gray-900" />
        </button>
      </div>
    </header>
  );
}
