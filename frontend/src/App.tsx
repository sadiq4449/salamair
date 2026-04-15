import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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

            {/* Agent routes */}
            <Route path="/requests" element={<RoleRoute roles={['agent']}><RequestList /></RoleRoute>} />
            <Route path="/requests/:id" element={<RoleRoute roles={['agent']}><RequestDetail /></RoleRoute>} />

            {/* Sales routes */}
            <Route path="/pending" element={<RoleRoute roles={['sales', 'admin']}><PendingApprovals /></RoleRoute>} />
            <Route path="/pending/:id" element={<RoleRoute roles={['sales', 'admin']}><SalesRequestDetail /></RoleRoute>} />

            {/* Notification routes (all roles) */}
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/notifications/settings" element={<NotificationSettings />} />
            <Route
              path="/analytics"
              element={
                <RoleRoute roles={['agent', 'sales', 'admin']}>
                  <Analytics />
                </RoleRoute>
              }
            />
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AppInit>

      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </BrowserRouter>
  );
}
