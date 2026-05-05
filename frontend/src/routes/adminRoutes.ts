import { lazy } from 'react';
import type { ComponentType, LazyExoticComponent } from 'react';

type RouteComponent = LazyExoticComponent<ComponentType>;

export interface AdminChildRoute {
  path: string;
  Component: RouteComponent;
}

export const AdminLayoutLazy = lazy(() => import('../components/admin/AdminLayout'));

export const adminChildRoutes: AdminChildRoute[] = [
  { path: 'dashboard', Component: lazy(() => import('../pages/admin/AdminDashboardPage')) },
  { path: 'data-hub', Component: lazy(() => import('../pages/admin/AdminDataHubPage')) },
  { path: 'users', Component: lazy(() => import('../pages/admin/AdminUsersPage')) },
  { path: 'agents', Component: lazy(() => import('../pages/admin/AdminAgentsPage')) },
  { path: 'logs', Component: lazy(() => import('../pages/admin/AdminLogsPage')) },
  { path: 'config', Component: lazy(() => import('../pages/admin/AdminConfigPage')) },
  { path: 'reminders', Component: lazy(() => import('../pages/admin/AdminRemindersPage')) },
  { path: 'tags', Component: lazy(() => import('../pages/admin/AdminTagsPage')) },
  { path: 'requests', Component: lazy(() => import('../pages/admin/AdminAllRequestsPage')) },
  { path: 'mail', Component: lazy(() => import('../pages/admin/AdminMailDataPage')) },
];
