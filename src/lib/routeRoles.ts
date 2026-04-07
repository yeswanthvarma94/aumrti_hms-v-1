import { ALL_MODULES } from './modules';

export const ROUTE_ROLES: Record<string, string[]> = {};

ALL_MODULES.forEach(m => {
  const path = m.route.split('?')[0];
  ROUTE_ROLES[path] = m.roles;
});

// Override / add explicit admin-only routes
ROUTE_ROLES['/settings'] = ['super_admin', 'hospital_admin'];
ROUTE_ROLES['/accounts'] = ['accountant', 'cfo', 'super_admin', 'hospital_admin'];
ROUTE_ROLES['/hr'] = ['hr_manager', 'super_admin', 'hospital_admin'];
ROUTE_ROLES['/admin/go-live'] = ['super_admin', 'hospital_admin'];
ROUTE_ROLES['/admin/data-migration'] = ['super_admin', 'hospital_admin'];
