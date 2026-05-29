import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthPrincipal } from '@modules/user-management/interfaces/auth-principal.interface';
import { CryptoService } from '@modules/user-management/services/crypto.service';
import { RoleAssignment } from '@modules/user-management/interfaces/admin-user.interface';
import { AdminRole } from '@modules/user-management/enums/admin-role.enum';

@Injectable()
export class GatewayAdminAuthGuard implements CanActivate {
  constructor(private readonly cryptoService: CryptoService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context
      .switchToHttp()
      .getRequest<{ headers: Record<string, string | undefined>; user?: AuthPrincipal }>();

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
      : (payload.roles as AdminRole[]).map((role) => ({ role, scopeType: 'global' as const }));

    const activeAssignments = sourceAssignments.filter((a) => {
      const now = Date.now();
      if (a.effectiveFrom && new Date(a.effectiveFrom).getTime() > now) return false;
      if (a.effectiveTo && new Date(a.effectiveTo).getTime() < now) return false;
      return true;
    });

    if (activeAssignments.length === 0) {
      throw new UnauthorizedException('No active role assignment for this account');
    }

    const activeRoles = [...new Set(activeAssignments.map((a) => a.role as AdminRole))];

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
}
