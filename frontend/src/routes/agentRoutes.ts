import { lazy } from 'react';
import type { ComponentType, LazyExoticComponent } from 'react';
import type { UserRole } from '../types';

type RouteComponent = LazyExoticComponent<ComponentType>;

export interface RoleRouteConfig {
  path: string;
  roles: UserRole[];
  Component: RouteComponent;
}

export const agentRoutes: RoleRouteConfig[] = [
  { path: '/requests', roles: ['agent', 'admin'], Component: lazy(() => import('../pages/agent/RequestList')) },
  { path: '/requests/:id', roles: ['agent', 'admin'], Component: lazy(() => import('../pages/agent/RequestDetail')) },
  { path: '/bulk-upload', roles: ['agent', 'admin'], Component: lazy(() => import('../pages/BulkUploadPage')) },
];
