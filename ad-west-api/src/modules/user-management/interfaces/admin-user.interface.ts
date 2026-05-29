import { AdminRole, ScopeType } from '../enums/admin-role.enum';

export interface RoleAssignment {
  role: AdminRole;
  scopeType: ScopeType;
  scopeId?: string;
  effectiveFrom?: string;
  effectiveTo?: string;
}

export interface AdminUser {
  id: string;
  code: string;
  name: string;
  email: string;
  roleDefinitionId?: string;
  passwordHash: string;
  active: boolean;
  failedAttempts: number;
  lockedUntil?: number;
  roles: RoleAssignment[];
  createdAt: string;
  updatedAt: string;
}
