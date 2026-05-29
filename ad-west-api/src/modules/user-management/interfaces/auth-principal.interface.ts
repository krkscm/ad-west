import { AdminRole } from '../enums/admin-role.enum';
import { RoleAssignment } from './admin-user.interface';

export interface AuthPrincipal {
  userId: string;
  type: 'admin' | 'member';
  email?: string;
  memberId?: string;
  roles: AdminRole[];
  roleAssignments?: RoleAssignment[];
  sessionId: string;
}
