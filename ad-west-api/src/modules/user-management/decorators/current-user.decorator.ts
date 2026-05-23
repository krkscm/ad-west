import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthPrincipal } from '../interfaces/auth-principal.interface';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthPrincipal | undefined => {
    const req = ctx.switchToHttp().getRequest<{ user?: AuthPrincipal }>();
    return req.user;
  },
);
