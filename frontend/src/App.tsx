import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AdminLayout from './components/admin/AdminLayout';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import AdminUsersPage from './pages/admin/AdminUsersPage';
import AdminAgentsPage from './pages/admin/AdminAgentsPage';
import AdminLogsPage from './pages/admin/AdminLogsPage';
import AdminConfigPage from './pages/admin/AdminConfigPage';
import AdminRemindersPage from './pages/admin/AdminRemindersPage';
import AdminTagsPage from './pages/admin/AdminTagsPage';
import AdminAllRequestsPage from './pages/admin/AdminAllRequestsPage';
import AdminMailDataPage from './pages/admin/AdminMailDataPage';
import AdminDataHubPage from './pages/admin/AdminDataHubPage';
import SlaDashboardPage from './pages/SlaDashboardPage';
import BulkUploadPage from './pages/BulkUploadPage';
import FlightAvailability from './pages/FlightAvailability';
import EmailInbox from './pages/sales/EmailInbox';
import CityWiseView from './pages/sales/CityWiseView';
import AgentHistoryPage from './pages/sales/AgentHistoryPage';
import SearchPage from './pages/SearchPage';
import { useEffect } from 'react';
import { useAuth } from './hooks/useAuth';
import AppLayout from './components/Layout/AppLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import RequestList from './pages/agent/RequestList';
import RequestDetail from './pages/agent/RequestDetail';
import PendingApprovals from './pages/sales/PendingApprovals';
import SalesRequestDetail from './pages/sales/SalesRequestDetail';
import NotificationsPage from './pages/NotificationsPage';
import NotificationSettings from './pages/NotificationSettings';
import Analytics from './pages/Analytics';
import { ToastContainer } from './components/ui/Toast';
import { useToastStore } from './store/toastStore';
import { useNotificationSocket } from './hooks/useNotificationSocket';
import { Loader2 } from 'lucide-react';
import type { UserRole } from './types';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function RoleRoute({ roles, children }: { roles: UserRole[]; children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user || !roles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
}

/** Admins see analytics on the main Dashboard; keep /analytics for agents & sales only. */
function AnalyticsEntry() {
  const { user } = useAuth();
  if (user?.role === 'admin') {
    return <Navigate to="/dashboard" replace />;
  }
  return <Analytics />;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

function NotificationSocketProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) {
    return <NotificationSocketInner>{children}</NotificationSocketInner>;
  }
  return <>{children}</>;
}

function NotificationSocketInner({ children }: { children: React.ReactNode }) {
  useNotificationSocket();
  return <>{children}</>;
}

function AppInit({ children }: { children: React.ReactNode }) {
  const { loadUser } = useAuth();

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  return <NotificationSocketProvider>{children}</NotificationSocketProvider>;
}

export default function App() {
  const { toasts, removeToast } = useToastStore();

  return (
    <BrowserRouter>
      <AppInit>
        <Routes>
          <Route
            path="/login"
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            }
          />

          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<Dashboard />} />

            {/* Agent routes (administrators have full access to the same flows) */}
            <Route path="/requests" element={<RoleRoute roles={['agent', 'admin']}><RequestList /></RoleRoute>} />
            <Route path="/requests/:id" element={<RoleRoute roles={['agent', 'admin']}><RequestDetail /></RoleRoute>} />
            <Route
              path="/bulk-upload"
              element={
                <RoleRoute roles={['agent', 'admin']}>
                  <BulkUploadPage />
                </RoleRoute>
              }
            />

            {/* Shared reference data (demo: flight grid) */}
            <Route
              path="/flights"
              element={
                <RoleRoute roles={['agent', 'sales', 'admin']}>
                  <FlightAvailability />
                </RoleRoute>
              }
            />

            {/* Sales routes */}
            <Route path="/pending" element={<RoleRoute roles={['sales', 'admin']}><PendingApprovals /></RoleRoute>} />
            <Route path="/pending/:id" element={<RoleRoute roles={['sales', 'admin']}><SalesRequestDetail /></RoleRoute>} />
            <Route
              path="/inbox"
              element={
                <RoleRoute roles={['sales', 'admin']}>
                  <EmailInbox />
                </RoleRoute>
              }
            />
            <Route
              path="/city-view"
              element={
                <RoleRoute roles={['sales', 'admin']}>
                  <CityWiseView />
                </RoleRoute>
              }
            />
            <Route
              path="/agent-history"
              element={
                <RoleRoute roles={['sales', 'admin']}>
                  <AgentHistoryPage />
                </RoleRoute>
              }
            />
            <Route
              path="/sla-dashboard"
              element={
                <RoleRoute roles={['sales', 'admin']}>
                  <SlaDashboardPage />
                </RoleRoute>
              }
            />

            {/* Notification routes (all roles) */}
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/notifications/settings" element={<NotificationSettings />} />
            <Route path="/search" element={<SearchPage />} />
            <Route
              path="/analytics"
              element={
                <RoleRoute roles={['agent', 'sales', 'admin']}>
                  <AnalyticsEntry />
                </RoleRoute>
              }
            />

            <Route
              path="/admin"
              element={
                <RoleRoute roles={['admin']}>
                  <AdminLayout />
                </RoleRoute>
              }
            >
              <Route index element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="dashboard" element={<AdminDashboardPage />} />
              <Route path="data-hub" element={<AdminDataHubPage />} />
              <Route path="users" element={<AdminUsersPage />} />
              <Route path="agents" element={<AdminAgentsPage />} />
              <Route path="logs" element={<AdminLogsPage />} />
              <Route path="config" element={<AdminConfigPage />} />
              <Route path="reminders" element={<AdminRemindersPage />} />
              <Route path="tags" element={<AdminTagsPage />} />
              <Route path="requests" element={<AdminAllRequestsPage />} />
              <Route path="mail" element={<AdminMailDataPage />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AppInit>

      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </BrowserRouter>
  );
}
