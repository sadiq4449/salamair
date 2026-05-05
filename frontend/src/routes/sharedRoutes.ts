import { lazy } from 'react';
import type { RoleRouteConfig } from './agentRoutes';

export const sharedRoutes: RoleRouteConfig[] = [
  { path: '/flights', roles: ['agent', 'sales', 'admin'], Component: lazy(() => import('../pages/FlightAvailability')) },
  { path: '/notifications', roles: ['agent', 'sales', 'admin'], Component: lazy(() => import('../pages/NotificationsPage')) },
  {
    path: '/notifications/settings',
    roles: ['agent', 'sales', 'admin'],
    Component: lazy(() => import('../pages/NotificationSettings')),
  },
  { path: '/search', roles: ['agent', 'sales', 'admin'], Component: lazy(() => import('../pages/SearchPage')) },
];
