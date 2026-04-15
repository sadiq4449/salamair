import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  CheckCheck,
  Filter,
  FileCheck2,
  FileX2,
  ArrowRightLeft,
  Send,
  Mail,
  MessageSquare,
  AlertTriangle,
  AlertOctagon,
  UserCheck,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Settings,
} from 'lucide-react';
import { useNotificationStore } from '../store/notificationStore';
import { useAuth } from '../hooks/useAuth';
import type { NotificationItem, NotificationType } from '../types';

const typeIconMap: Record<NotificationType, React.ElementType> = {
  REQUEST_CREATED: Bell,
  REQUEST_APPROVED: FileCheck2,
  REQUEST_REJECTED: FileX2,
  COUNTER_OFFERED: ArrowRightLeft,
  SENT_TO_RM: Send,
  EMAIL_RECEIVED: Mail,
  NEW_MESSAGE: MessageSquare,
  SLA_WARNING: AlertTriangle,
  SLA_BREACHED: AlertOctagon,
  REQUEST_ASSIGNED: UserCheck,
};

const typeColorMap: Record<NotificationType, string> = {
  REQUEST_CREATED: 'text-blue-500 bg-blue-50 dark:bg-blue-900/30',
  REQUEST_APPROVED: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/30',
  REQUEST_REJECTED: 'text-red-500 bg-red-50 dark:bg-red-900/30',
  COUNTER_OFFERED: 'text-amber-500 bg-amber-50 dark:bg-amber-900/30',
  SENT_TO_RM: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30',
  EMAIL_RECEIVED: 'text-purple-500 bg-purple-50 dark:bg-purple-900/30',
  NEW_MESSAGE: 'text-teal-500 bg-teal-50 dark:bg-teal-900/30',
  SLA_WARNING: 'text-orange-500 bg-orange-50 dark:bg-orange-900/30',
  SLA_BREACHED: 'text-red-600 bg-red-50 dark:bg-red-900/30',
  REQUEST_ASSIGNED: 'text-cyan-500 bg-cyan-50 dark:bg-cyan-900/30',
};

const typeLabelMap: Record<NotificationType, string> = {
  REQUEST_CREATED: 'Request Created',
  REQUEST_APPROVED: 'Approved',
  REQUEST_REJECTED: 'Rejected',
  COUNTER_OFFERED: 'Counter Offer',
  SENT_TO_RM: 'Sent to RM',
  EMAIL_RECEIVED: 'Email Received',
  NEW_MESSAGE: 'New Message',
  SLA_WARNING: 'SLA Warning',
  SLA_BREACHED: 'SLA Breached',
  REQUEST_ASSIGNED: 'Assigned',
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

type FilterTab = 'all' | 'unread' | 'read';

export default function NotificationsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    notifications,
    unreadCount,
    total,
    page,
    isLoading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
  } = useNotificationStore();

  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [typeFilter, setTypeFilter] = useState<string>('');

  useEffect(() => {
    const params: { is_read?: boolean; type?: string; page?: number } = { page: 1 };
    if (activeTab === 'unread') params.is_read = false;
    else if (activeTab === 'read') params.is_read = true;
    if (typeFilter) params.type = typeFilter;
    fetchNotifications(params);
  }, [activeTab, typeFilter, fetchNotifications]);

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
  };

  const handlePageChange = (newPage: number) => {
    const params: { is_read?: boolean; type?: string; page: number } = { page: newPage };
    if (activeTab === 'unread') params.is_read = false;
    else if (activeTab === 'read') params.is_read = true;
    if (typeFilter) params.type = typeFilter;
    fetchNotifications(params);
  };

  const totalPages = Math.ceil(total / 20);
  const tabs: { key: FilterTab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'unread', label: `Unread (${unreadCount})` },
    { key: 'read', label: 'Read' },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Notifications</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {unreadCount > 0 ? `${unreadCount} unread notifications` : 'All caught up!'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors"
            >
              <CheckCheck className="h-4 w-4" />
              Mark all as read
            </button>
          )}
          <button
            onClick={() => navigate('/notifications/settings')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <Settings className="h-4 w-4" />
            Settings
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-400" />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="text-sm bg-transparent border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-gray-600 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="">All types</option>
            {Object.entries(typeLabelMap).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Notification List */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Bell className="h-12 w-12 mb-3 opacity-30" />
            <p className="text-lg font-medium">No notifications</p>
            <p className="text-sm mt-1">
              {activeTab === 'unread' ? "You're all caught up!" : 'Nothing to show here.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {notifications.map((notif) => {
              const Icon = typeIconMap[notif.type] || Bell;
              const colorClass = typeColorMap[notif.type] || 'text-gray-500 bg-gray-50 dark:bg-gray-800';

              return (
                <button
                  key={notif.id}
                  onClick={() => handleClick(notif)}
                  className={`w-full flex items-start gap-4 px-5 py-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${
                    !notif.is_read ? 'bg-teal-50/30 dark:bg-teal-900/10' : ''
                  }`}
                >
                  <div className={`p-2.5 rounded-xl shrink-0 ${colorClass}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`text-sm font-semibold ${!notif.is_read ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}>
                        {notif.title}
                      </span>
                      {!notif.is_read && (
                        <span className="h-2 w-2 rounded-full bg-teal-500 shrink-0" />
                      )}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                      {notif.message}
                    </p>
                    <div className="flex items-center gap-3 mt-1.5">
                      {notif.request_code && (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                          {notif.request_code}
                        </span>
                      )}
                      <span className="text-xs text-gray-400">{formatTimeAgo(notif.created_at)}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 px-1">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Page {page} of {totalPages} ({total} total)
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePageChange(page - 1)}
              disabled={page <= 1}
              className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => handlePageChange(page + 1)}
              disabled={page >= totalPages}
              className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
