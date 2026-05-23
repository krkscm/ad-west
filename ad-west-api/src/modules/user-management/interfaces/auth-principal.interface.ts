import { AdminRole } from '../enums/admin-role.enum';

export interface AuthPrincipal {
  userId: string;
  type: 'admin' | 'member';
  email?: string;
  memberId?: string;
  roles: AdminRole[];
  sessionId: string;
}
