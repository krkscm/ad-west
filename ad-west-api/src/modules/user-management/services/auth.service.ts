import {
  BadRequestException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { USER_STORE } from '../constants';
import { AdminRole } from '../enums/admin-role.enum';
import { AuthPrincipal } from '../interfaces/auth-principal.interface';
import { AdminLoginDto } from '../dto/admin-login.dto';
import { MemberRequestOtpDto } from '../dto/member-request-otp.dto';
import { MemberVerifyOtpDto } from '../dto/member-verify-otp.dto';
import { MfaVerifyDto } from '../dto/mfa-verify.dto';
import { UserStore } from '../interfaces/user-store.interface';
import { AuditService } from './audit.service';
import { CryptoService } from './crypto.service';

@Injectable()
export class AuthService {
  constructor(
    @Inject(USER_STORE) private readonly store: UserStore,
    private readonly cryptoService: CryptoService,
    private readonly auditService: AuditService,
  ) {}

  async adminLogin(
    dto: AdminLoginDto,
  ): Promise<{ accessToken: string; mfaRequired: boolean }> {
    const user = await this.store.getAdminByEmail(dto.email);
    if (!user || !user.active) {
      await this.auditService.log({
        actorId: dto.email,
        actorType: 'system',
        action: 'admin_login_failed',
        targetType: 'admin_user',
        targetId: dto.email,
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    const validPassword = this.cryptoService.verifyPassword(dto.password, user.passwordHash);
    if (!validPassword) {
      await this.auditService.log({
        actorId: user.id,
        actorType: 'admin',
        action: 'admin_login_failed',
        targetType: 'admin_user',
        targetId: user.id,
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.mfaEnabled) {
      if (!dto.totpCode || !user.totpSecret) {
        return { accessToken: '', mfaRequired: true };
      }

      const validTotp = this.cryptoService.verifyTotp(user.totpSecret, dto.totpCode);
      if (!validTotp) {
        throw new UnauthorizedException('Invalid MFA code');
      }
    }

    const sessionId = this.cryptoService.randomId('sess');
    const token = this.cryptoService.signToken(
      {
        sub: user.id,
        type: 'admin',
        roles: user.roles.map((item) => item.role),
        sid: sessionId,
        email: user.email,
      },
      60 * 60,
    );

    await this.store.saveSession({
      tokenId: sessionId,
      userId: user.id,
      type: 'admin',
      expiresAt: Date.now() + 60 * 60 * 1000,
    });

    await this.auditService.log({
      actorId: user.id,
      actorType: 'admin',
      action: 'admin_login_success',
      targetType: 'admin_user',
      targetId: user.id,
    });

    return { accessToken: token, mfaRequired: false };
  }

  async verifyAdminToken(token: string): Promise<AuthPrincipal | null> {
    const payload = this.cryptoService.verifyToken(token);
    if (!payload || payload.type !== 'admin') {
      return null;
    }

    const session = await this.store.getSession(payload.sid);
    if (!session || session.type !== 'admin' || session.expiresAt < Date.now()) {
      return null;
    }

    const user = await this.store.getAdminById(payload.sub);
    if (!user || !user.active) {
      return null;
    }

    return {
      userId: user.id,
      type: 'admin',
      email: user.email,
      roles: user.roles.map((item) => item.role),
      sessionId: payload.sid,
    };
  }

  async adminLogout(principal: AuthPrincipal): Promise<void> {
    await this.store.revokeSession(principal.sessionId);
    await this.auditService.log({
      actorId: principal.userId,
      actorType: 'admin',
      action: 'admin_logout',
      targetType: 'session',
      targetId: principal.sessionId,
    });
  }

  async enrollMfa(
    principal: AuthPrincipal,
  ): Promise<{ secret: string; otpauthUrl: string }> {
    const user = await this.store.getAdminById(principal.userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const secret = this.cryptoService.createTotpSecret();
    user.totpSecret = secret;
    user.updatedAt = new Date().toISOString();
    await this.store.saveAdmin(user);

    const otpauthUrl = `otpauth://totp/ADWest:${encodeURIComponent(user.email)}?secret=${secret}&issuer=ADWest`;

    await this.auditService.log({
      actorId: user.id,
      actorType: 'admin',
      action: 'admin_mfa_enroll',
      targetType: 'admin_user',
      targetId: user.id,
    });

    return { secret, otpauthUrl };
  }

  async verifyAndEnableMfa(
    principal: AuthPrincipal,
    dto: MfaVerifyDto,
  ): Promise<{ enabled: boolean }> {
    const user = await this.store.getAdminById(principal.userId);
    if (!user || !user.totpSecret) {
      throw new BadRequestException('MFA not enrolled');
    }

    const valid = this.cryptoService.verifyTotp(user.totpSecret, dto.code);
    if (!valid) {
      throw new UnauthorizedException('Invalid MFA code');
    }

    user.mfaEnabled = true;
    user.updatedAt = new Date().toISOString();
    await this.store.saveAdmin(user);

    await this.auditService.log({
      actorId: user.id,
      actorType: 'admin',
      action: 'admin_mfa_enabled',
      targetType: 'admin_user',
      targetId: user.id,
    });

    return { enabled: true };
  }

  async requestMemberOtp(
    dto: MemberRequestOtpDto,
  ): Promise<{ requestId: string; expiresInSeconds: number; debugCode?: string }> {
    if (!dto.phone && !dto.email) {
      throw new BadRequestException('Either phone or email must be provided');
    }

    const member = await this.store.findMemberByIdentity(
      dto.name,
      dto.phone,
      dto.email,
    );
    if (!member || !member.active) {
      throw new UnauthorizedException('Member not found');
    }

    const requestId = this.cryptoService.randomId('otp');
    const code = this.cryptoService.randomNumericCode(6);
    const expiresAt = Date.now() + 10 * 60 * 1000;
    const destination = member.email || member.phone || '';

    await this.store.saveOtp({
      id: requestId,
      purpose: 'member-login',
      memberId: member.id,
      destination,
      code,
      expiresAt,
      attempts: 0,
    });

    await this.auditService.log({
      actorId: member.id,
      actorType: 'member',
      action: 'member_otp_requested',
      targetType: 'member_user',
      targetId: member.id,
      details: {
        workflow: 'N8N-COM-013',
      },
    });

    return {
      requestId,
      expiresInSeconds: 600,
      ...(process.env.NODE_ENV !== 'production' && { debugCode: code }),
    };
  }

  async verifyMemberOtp(dto: MemberVerifyOtpDto): Promise<{ accessToken: string }> {
    const otp = await this.store.getOtp(dto.requestId);
    if (!otp) {
      throw new UnauthorizedException('OTP request not found');
    }

    if (otp.expiresAt < Date.now()) {
      await this.store.removeOtp(dto.requestId);
      throw new UnauthorizedException('OTP expired');
    }

    otp.attempts += 1;
    if (otp.attempts > 5) {
      await this.store.removeOtp(dto.requestId);
      throw new UnauthorizedException('Too many OTP attempts');
    }

    if (otp.code !== dto.code) {
      await this.store.saveOtp(otp);
      throw new UnauthorizedException('Invalid OTP code');
    }

    const sessionId = this.cryptoService.randomId('msess');
    const token = this.cryptoService.signToken(
      {
        sub: otp.memberId,
        type: 'member',
        roles: [],
        sid: sessionId,
        memberId: otp.memberId,
      },
      60 * 60,
    );

    await this.store.saveSession({
      tokenId: sessionId,
      userId: otp.memberId,
      type: 'member',
      expiresAt: Date.now() + 60 * 60 * 1000,
    });

    await this.store.removeOtp(dto.requestId);

    await this.auditService.log({
      actorId: otp.memberId,
      actorType: 'member',
      action: 'member_otp_verified',
      targetType: 'member_user',
      targetId: otp.memberId,
    });

    return { accessToken: token };
  }

  getBootstrapAdmin(): { email: string; password: string; roles: AdminRole[] } {
    return {
      email: 'admin@adwest.local',
      password: 'Admin@123',
      roles: [AdminRole.SUPER_ADMIN],
    };
  }
}
