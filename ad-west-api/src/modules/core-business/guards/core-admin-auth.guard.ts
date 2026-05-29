import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AdminRole } from '@modules/user-management/enums/admin-role.enum';
import { RoleAssignment } from '@modules/user-management/interfaces/admin-user.interface';
import { AuthPrincipal } from '@modules/user-management/interfaces/auth-principal.interface';
import { CryptoService } from '@modules/user-management/services/crypto.service';

@Injectable()
export class CoreAdminAuthGuard implements CanActivate {
  constructor(private readonly cryptoService: CryptoService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context
      .switchToHttp()
      .getRequest<{ headers: Record<string, string | undefined>; path?: string; url?: string; user?: AuthPrincipal }>();

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing bearer token');
    }

    const token = authHeader.replace('Bearer ', '').trim();
    const payload = this.cryptoService.verifyToken(token);

    if (!payload || payload.type !== 'admin') {
      throw new UnauthorizedException('Invalid admin token');
    }

    const sourceAssignments: RoleAssignment[] = payload.roleAssignments?.length
      ? payload.roleAssignments
      : (payload.roles as AdminRole[]).map((role) => ({ role, scopeType: 'global' }));

    const activeAssignments = this.getActiveAssignments(sourceAssignments);
    const activeRoles = [...new Set(activeAssignments.map((assignment) => assignment.role as AdminRole))];
    if (activeRoles.length === 0) {
      throw new UnauthorizedException('No active role assignment for this account');
    }

    this.assertRolePolicy(activeRoles, req.path ?? req.url ?? '');

    req.user = {
      userId: payload.sub,
      type: 'admin',
      email: payload.email,
      roles: activeRoles,
      roleAssignments: activeAssignments,
      sessionId: payload.sid,
    };

    return true;
  }

  private getActiveAssignments(assignments: RoleAssignment[]): RoleAssignment[] {
    const now = Date.now();

    return assignments.filter((assignment) => {
      const startsAt = assignment.effectiveFrom ? Date.parse(assignment.effectiveFrom) : undefined;
      const endsAt = assignment.effectiveTo ? Date.parse(assignment.effectiveTo) : undefined;

      if (startsAt !== undefined && !Number.isNaN(startsAt) && now < startsAt) {
        return false;
      }

      if (endsAt !== undefined && !Number.isNaN(endsAt) && now >= endsAt) {
        return false;
      }

      return true;
    });
  }

  private assertRolePolicy(roles: AdminRole[], rawPath: string): void {
    if (roles.includes(AdminRole.SUPER_ADMIN) || roles.includes(AdminRole.ZONE_ADMIN)) {
      return;
    }

    if (!roles.includes(AdminRole.SRENY_ADMIN)) {
      throw new ForbiddenException('Insufficient role');
    }

    const normalizedPath = rawPath
      .replace(/^\//, '')
      .replace(/^api\/v1\//, '');

    const srenyAdminAllowedPrefixes = [
      'programs/',
      'registrations/',
      'attendance/',
      'helpdesk/',
      'documents/',
      'org/sreni-definitions/',
    ];

    const isAllowed = srenyAdminAllowedPrefixes.some((prefix) => normalizedPath.startsWith(prefix));
    if (!isAllowed) {
      throw new ForbiddenException('Sreny admin access is restricted for this operation');
    }
  }
}
