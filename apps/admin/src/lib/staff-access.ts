import { L } from './domain';

export type StaffRole = 'ADMIN' | 'MANAGER' | 'RECEPTIONIST' | 'HOUSEKEEPING';
export type StaffAccount = { id: string; email: string; fullName: string | null; role: StaffRole; isActive: boolean; pendingActivation: boolean; createdAt: string };
export const roles: StaffRole[] = ['ADMIN', 'MANAGER', 'RECEPTIONIST', 'HOUSEKEEPING'];
export const roleNames = { ADMIN: L('Administrator', 'Quản trị viên'), MANAGER: L('Manager', 'Quản lý'), RECEPTIONIST: L('Receptionist', 'Lễ tân'), HOUSEKEEPING: L('Housekeeping', 'Buồng phòng') };
export function manageableRoles(role: StaffRole): StaffRole[] { return role === 'ADMIN' ? roles : role === 'MANAGER' ? ['RECEPTIONIST', 'HOUSEKEEPING'] : []; }
export function canAccess(role: StaffRole, path: string) {
  if (role === 'ADMIN' || role === 'MANAGER') return true;
  if (['/dashboard', '/profile', '/profile/security', '/housekeeping'].includes(path)) return true;
  return role === 'RECEPTIONIST' && ['/inventory', '/reservations', '/front-desk', '/payments', '/guests'].includes(path);
}
