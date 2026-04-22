import { ALL_MODULES } from './modules';

export const ROUTE_ROLES: Record<string, string[]> = {};

ALL_MODULES.forEach(m => {
  const path = m.route.split('?')[0];
  ROUTE_ROLES[path] = m.roles;
});

// Override / add explicit admin-only routes
ROUTE_ROLES['/settings'] = ['super_admin', 'hospital_admin'];
ROUTE_ROLES['/accounts'] = ['accountant', 'billing_executive', 'billing_staff', 'cfo', 'super_admin', 'hospital_admin'];
ROUTE_ROLES['/hr'] = ['hr_manager', 'super_admin', 'hospital_admin'];
ROUTE_ROLES['/billing'] = ['accountant', 'billing_executive', 'billing_staff', 'super_admin', 'hospital_admin'];
ROUTE_ROLES['/lab'] = ['lab_technician', 'lab_tech', 'doctor', 'super_admin', 'hospital_admin'];
ROUTE_ROLES['/radiology'] = ['radiologist', 'doctor', 'super_admin', 'hospital_admin'];
ROUTE_ROLES['/admin/go-live'] = ['super_admin', 'hospital_admin'];
ROUTE_ROLES['/admin/data-migration'] = ['super_admin', 'hospital_admin'];
// Strict admin-only — RoleGuard already bypasses for super_admin / hospital_admin
ROUTE_ROLES['/admin/bill-number-audit'] = ['admin'];
ROUTE_ROLES['/assets'] = ['accountant', 'cfo', 'super_admin', 'hospital_admin'];

// Core authenticated routes
ROUTE_ROLES['/dashboard'] = [
  'doctor', 'nurse', 'receptionist', 'pharmacist',
  'lab_technician', 'lab_tech',
  'radiologist',
  'billing_executive', 'billing_staff', 'accountant',
  'hr_manager', 'cfo',
  'super_admin', 'hospital_admin',
];
ROUTE_ROLES['/patients'] = ['doctor', 'nurse', 'receptionist', 'super_admin', 'hospital_admin'];
ROUTE_ROLES['/modules'] = ['super_admin', 'hospital_admin'];
ROUTE_ROLES['/schedule'] = ['receptionist', 'doctor', 'nurse', 'super_admin', 'hospital_admin'];

