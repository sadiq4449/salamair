import { useNavigate } from 'react-router-dom';
import {
  CheckCheck,
  Bell,
  BellRing,
  FileCheck2,
  FileX2,
  ArrowRightLeft,
  CircleCheck,
  CircleX,
  Send,
  Mail,
  MessageSquare,
  AlertTriangle,
  AlertOctagon,
  UserCheck,
  Loader2,
} from 'lucide-react';
import { useNotificationStore } from '../../store/notificationStore';
import { useAuth } from '../../hooks/useAuth';
import type { NotificationItem, NotificationType } from '../../types';

const typeIconMap: Record<NotificationType, React.ElementType> = {
  REQUEST_CREATED: Bell,
  REQUEST_APPROVED: FileCheck2,
  REQUEST_REJECTED: FileX2,
  COUNTER_OFFERED: ArrowRightLeft,
  COUNTER_ACCEPTED: CircleCheck,
  COUNTER_REJECTED: CircleX,
  SENT_TO_RM: Send,
  EMAIL_RECEIVED: Mail,
  NEW_MESSAGE: MessageSquare,
  SLA_WARNING: AlertTriangle,
  SLA_BREACHED: AlertOctagon,
  REQUEST_ASSIGNED: UserCheck,
  REMINDER: BellRing,
};

const typeColorMap: Record<NotificationType, string> = {
  REQUEST_CREATED: 'text-blue-500 bg-blue-50 dark:bg-blue-900/30',
  REQUEST_APPROVED: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/30',
  REQUEST_REJECTED: 'text-red-500 bg-red-50 dark:bg-red-900/30',
  COUNTER_OFFERED: 'text-amber-500 bg-amber-50 dark:bg-amber-900/30',
  COUNTER_ACCEPTED: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/30',
  COUNTER_REJECTED: 'text-rose-500 bg-rose-50 dark:bg-rose-900/30',
  SENT_TO_RM: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30',
  EMAIL_RECEIVED: 'text-purple-500 bg-purple-50 dark:bg-purple-900/30',
  NEW_MESSAGE: 'text-teal-500 bg-teal-50 dark:bg-teal-900/30',
  SLA_WARNING: 'text-orange-500 bg-orange-50 dark:bg-orange-900/30',
  SLA_BREACHED: 'text-red-600 bg-red-50 dark:bg-red-900/30',
  REQUEST_ASSIGNED: 'text-cyan-500 bg-cyan-50 dark:bg-cyan-900/30',
  REMINDER: 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/30',
};

function formatTimeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return date.toLocaleDateString();
}

function NotificationRow({
  notif,
  onClick,
}: {
  notif: NotificationItem;
  onClick: () => void;
}) {
  const Icon = typeIconMap[notif.type] || Bell;
  const colorClass = typeColorMap[notif.type] || 'text-gray-500 bg-gray-50 dark:bg-gray-800';

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${
        !notif.is_read ? 'bg-teal-50/50 dark:bg-teal-900/10' : ''
      }`}
    >
      <div className={`p-2 rounded-lg shrink-0 ${colorClass}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium truncate ${!notif.is_read ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}>
            {notif.title}
          </span>
          {!notif.is_read && (
            <span className="h-2 w-2 rounded-full bg-teal-500 shrink-0" />
          )}
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
          {notif.message}
        </p>
        <div className="flex items-center gap-2 mt-1">
          {notif.request_code && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
              {notif.request_code}
            </span>
          )}
          <span className="text-[10px] text-gray-400">{formatTimeAgo(notif.created_at)}</span>
        </div>
      </div>
    </button>
  );
}

interface Props {
  onClose: () => void;
}

export default function NotificationDropdown({ onClose }: Props) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead } =
    useNotificationStore();

  const handleClick = async (notif: NotificationItem) => {
    if (!notif.is_read) {
      await markAsRead(notif.id);
    }
    if (notif.request_id) {
      const path = user?.role === 'agent'
        ? `/requests/${notif.request_id}`
        : `/pending/${notif.request_id}`;
      navigate(path);
    }
    onClose();
  };

  const handleViewAll = () => {
    navigate('/notifications');
    onClose();
  };

  return (
    <div className="absolute right-0 top-full mt-2 w-96 bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden z-50">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
          Notifications
          {unreadCount > 0 && (
            <span className="ml-2 text-xs font-medium text-teal-600 dark:text-teal-400">
              {unreadCount} new
            </span>
          )}
        </h3>
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="flex items-center gap-1 text-xs text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 font-medium"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Mark all read
          </button>
        )}
      </div>

      <div className="max-h-[400px] overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-teal-500" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <Bell className="h-10 w-10 mb-2 opacity-30" />
            <p className="text-sm">No notifications yet</p>
          </div>
        ) : (
          notifications.slice(0, 10).map((notif) => (
            <NotificationRow
              key={notif.id}
              notif={notif}
              onClick={() => handleClick(notif)}
            />
          ))
        )}
      </div>

      <div className="border-t border-gray-100 dark:border-gray-800 px-4 py-2.5">
        <button
          onClick={handleViewAll}
          className="w-full text-center text-xs font-medium text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300"
        >
          View all notifications
        </button>
      </div>
    </div>
  );
}
