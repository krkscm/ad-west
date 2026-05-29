import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthPrincipal } from '@modules/user-management/interfaces/auth-principal.interface';
import { CryptoService } from '@modules/user-management/services/crypto.service';

@Injectable()
export class CoreMemberAuthGuard implements CanActivate {
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

    if (!payload || payload.type !== 'member') {
      throw new UnauthorizedException('Invalid member token');
    }

    req.user = {
      userId: payload.sub,
      memberId: payload.memberId || payload.sub,
      type: 'member',
      email: payload.email,
      roles: [],
      sessionId: payload.sid,
    };

    return true;
  }
}
