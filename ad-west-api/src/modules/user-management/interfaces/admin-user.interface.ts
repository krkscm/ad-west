import { AdminRole, ScopeType } from '../enums/admin-role.enum';

export interface RoleAssignment {
  role: AdminRole;
  scopeType: ScopeType;
  scopeId?: string;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  active: boolean;
  mfaEnabled: boolean;
  totpSecret?: string;
  roles: RoleAssignment[];
  createdAt: string;
  updatedAt: string;
}
