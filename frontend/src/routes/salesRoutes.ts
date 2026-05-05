import { lazy } from 'react';
import type { RoleRouteConfig } from './agentRoutes';

export const salesRoutes: RoleRouteConfig[] = [
  { path: '/pending', roles: ['sales', 'admin'], Component: lazy(() => import('../pages/sales/PendingApprovals')) },
  { path: '/pending/:id', roles: ['sales', 'admin'], Component: lazy(() => import('../pages/sales/SalesRequestDetail')) },
  { path: '/inbox', roles: ['sales', 'admin'], Component: lazy(() => import('../pages/sales/EmailInbox')) },
  { path: '/city-view', roles: ['sales', 'admin'], Component: lazy(() => import('../pages/sales/CityWiseView')) },
  { path: '/agent-history', roles: ['sales', 'admin'], Component: lazy(() => import('../pages/sales/AgentHistoryPage')) },
  { path: '/sla-dashboard', roles: ['sales', 'admin'], Component: lazy(() => import('../pages/SlaDashboardPage')) },
];
