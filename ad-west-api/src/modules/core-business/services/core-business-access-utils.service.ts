import { AuthPrincipal } from '@modules/user-management/interfaces/auth-principal.interface';
import { AdminRole } from '@modules/user-management/enums/admin-role.enum';
import type { UserRecord } from '../core-business.types';

export class CoreBusinessAccessUtilsService {
  hasZoneRights(principal: AuthPrincipal): boolean {
    const roleAssignments = principal.roleAssignments ?? [];
    if (roleAssignments.some((assignment) => assignment.scopeType === 'zone' || assignment.scopeType === 'global')) {
      return true;
    }

    // Backward compatibility for legacy tokens that may not include roleAssignments.
    const roles = (Array.isArray(principal.roles) ? principal.roles : []) as AdminRole[];
    return roles.includes(AdminRole.SUPER_ADMIN) || roles.includes(AdminRole.ZONE_ADMIN);
  }

  canViewCreatorData(principal: AuthPrincipal, creatorUserId: string, users: Map<string, UserRecord>): boolean {
    if (principal.userId === creatorUserId) {
      return true;
    }

    const creator = users.get(creatorUserId);
    if (!creator?.reportingToRoleIds?.length) {
      return false;
    }

    const viewer = this.resolvePrincipalUser(principal, users);
    if (!viewer?.roleId) {
      return false;
    }

    const reportingRoleIds = new Set(creator.reportingToRoleIds.map((roleId) => roleId.trim()).filter((roleId) => roleId.length > 0));
    return reportingRoleIds.has(viewer.roleId);
  }

  private resolvePrincipalUser(principal: AuthPrincipal, users: Map<string, UserRecord>): UserRecord | undefined {
    const direct = users.get(principal.userId);
    if (direct) {
      return direct;
    }

    if (!principal.email) {
      return undefined;
    }

    const normalizedEmail = principal.email.toLowerCase();
    return Array.from(users.values()).find((user) => user.email?.toLowerCase() === normalizedEmail);
  }
}