import {
  Inject,
  Injectable,
  Optional,
  UnauthorizedException,
} from '@nestjs/common';
import { USER_STORE } from '../constants';
import { AdminRole } from '../enums/admin-role.enum';
import { AuthPrincipal } from '../interfaces/auth-principal.interface';
import { AdminLoginDto } from '../dto/admin-login.dto';
import { MemberLoginDto } from '../dto/member-login.dto';
import { UserStore } from '../interfaces/user-store.interface';
import { AuditService } from './audit.service';
import { CryptoService } from './crypto.service';
import { RoleAssignment } from '../interfaces/admin-user.interface';
import { DataSource } from 'typeorm';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

@Injectable()
export class AuthService {
  constructor(
    @Inject(USER_STORE) private readonly store: UserStore,
    private readonly cryptoService: CryptoService,
    private readonly auditService: AuditService,
    @Optional() @Inject(DataSource) private readonly dataSource?: DataSource,
  ) {}

  async adminLogin(
    dto: AdminLoginDto,
  ): Promise<{ accessToken: string }> {
    if (!this.cryptoService.verifyCaptcha(dto.captchaToken, dto.captchaAnswer)) {
      throw new UnauthorizedException('Captcha validation failed');
    }

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

    if (user.lockedUntil && user.lockedUntil > Date.now()) {
      throw new UnauthorizedException('Account temporarily locked. Please try again later.');
    }

    const validPassword = this.cryptoService.verifyPassword(dto.password, user.passwordHash);
    if (!validPassword) {
      user.failedAttempts += 1;
      if (user.failedAttempts >= MAX_FAILED_ATTEMPTS) {
        user.lockedUntil = Date.now() + LOCKOUT_MS;
        user.failedAttempts = 0;
      }
      user.updatedAt = new Date().toISOString();
      await this.store.saveAdmin(user);

      await this.auditService.log({
        actorId: user.id,
        actorType: 'admin',
        action: 'admin_login_failed',
        targetType: 'admin_user',
        targetId: user.id,
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    user.failedAttempts = 0;
    user.lockedUntil = undefined;
    user.updatedAt = new Date().toISOString();
    await this.store.saveAdmin(user);

    const activeRoleAssignments = this.getActiveRoleAssignments(user.roles);
    const activeRoles = [...new Set(activeRoleAssignments.map((assignment) => assignment.role))];
    if (activeRoles.length === 0) {
      throw new UnauthorizedException('No active role assignment for this account');
    }

    const sessionId = this.cryptoService.randomId('sess');
    const token = this.cryptoService.signToken(
      {
        sub: user.id,
        type: 'admin',
        code: user.code,
        roles: activeRoles,
        roleAssignments: activeRoleAssignments,
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

    return { accessToken: token };
  }

  async login(
    identifier: string,
    password: string,
    captchaToken: string,
    captchaAnswer: string,
  ): Promise<{ accessToken: string }> {
    if (!this.cryptoService.verifyCaptcha(captchaToken, captchaAnswer)) {
      throw new UnauthorizedException('Captcha validation failed');
    }

    const normalizedIdentifier = identifier.trim();
    const userResult = await this.tryCoreUserLogin(normalizedIdentifier, password);
    if (userResult) {
      return userResult;
    }

    const memberResult = await this.tryMemberLogin(normalizedIdentifier, password);
    if (memberResult) {
      return memberResult;
    }

    const adminResult = await this.tryAdminLogin(normalizedIdentifier, password);
    if (adminResult) {
      return adminResult;
    }

    throw new UnauthorizedException('Invalid credentials');
  }

  async memberLogin(dto: MemberLoginDto): Promise<{ accessToken: string }> {
    if (!this.cryptoService.verifyCaptcha(dto.captchaToken, dto.captchaAnswer)) {
      throw new UnauthorizedException('Captcha validation failed');
    }

    const identifier = dto.identifier.trim();
    const isEmail = identifier.includes('@');
    const member = await this.store.findMemberByIdentity(
      isEmail ? undefined : identifier,
      isEmail ? identifier : undefined,
    );

    if (!member || !member.active) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (member.lockedUntil && member.lockedUntil > Date.now()) {
      throw new UnauthorizedException('Account temporarily locked. Please try again later.');
    }

    const validPassword = this.cryptoService.verifyPassword(dto.password, member.passwordHash);
    if (!validPassword) {
      member.failedAttempts += 1;
      if (member.failedAttempts >= MAX_FAILED_ATTEMPTS) {
        member.lockedUntil = Date.now() + LOCKOUT_MS;
        member.failedAttempts = 0;
      }
      await this.store.saveMember(member);
      throw new UnauthorizedException('Invalid credentials');
    }

    member.failedAttempts = 0;
    member.lockedUntil = undefined;
    await this.store.saveMember(member);

    const sessionId = this.cryptoService.randomId('msess');
    const token = this.cryptoService.signToken(
      {
        sub: member.id,
        type: 'member',
        roles: [],
        sid: sessionId,
        memberId: member.id,
      },
      60 * 60,
    );

    await this.store.saveSession({
      tokenId: sessionId,
      userId: member.id,
      type: 'member',
      expiresAt: Date.now() + 60 * 60 * 1000,
    });

    await this.auditService.log({
      actorId: member.id,
      actorType: 'member',
      action: 'member_login_success',
      targetType: 'member_user',
      targetId: member.id,
    });

    return { accessToken: token };
  }

  private async tryMemberLogin(
    identifier: string,
    password: string,
  ): Promise<{ accessToken: string } | null> {
    const isEmail = identifier.includes('@');
    const member = await this.store.findMemberByIdentity(
      isEmail ? undefined : identifier,
      isEmail ? identifier : undefined,
    );

    if (!member || !member.active) {
      return null;
    }

    if (member.lockedUntil && member.lockedUntil > Date.now()) {
      throw new UnauthorizedException('Account temporarily locked. Please try again later.');
    }

    const validPassword = this.cryptoService.verifyPassword(password, member.passwordHash);
    if (!validPassword) {
      member.failedAttempts += 1;
      if (member.failedAttempts >= MAX_FAILED_ATTEMPTS) {
        member.lockedUntil = Date.now() + LOCKOUT_MS;
        member.failedAttempts = 0;
      }
      await this.store.saveMember(member);
      throw new UnauthorizedException('Invalid credentials');
    }

    member.failedAttempts = 0;
    member.lockedUntil = undefined;
    await this.store.saveMember(member);

    const sessionId = this.cryptoService.randomId('msess');
    const token = this.cryptoService.signToken(
      {
        sub: member.id,
        type: 'member',
        roles: [],
        sid: sessionId,
        memberId: member.id,
      },
      60 * 60,
    );

    await this.store.saveSession({
      tokenId: sessionId,
      userId: member.id,
      type: 'member',
      expiresAt: Date.now() + 60 * 60 * 1000,
    });

    await this.auditService.log({
      actorId: member.id,
      actorType: 'member',
      action: 'member_login_success',
      targetType: 'member_user',
      targetId: member.id,
    });

    return { accessToken: token };
  }

  private async tryAdminLogin(
    identifier: string,
    password: string,
  ): Promise<{ accessToken: string } | null> {
    const normalizedIdentifier = identifier.trim();
    const user = await this.store.getAdminByCode(normalizedIdentifier)
      ?? await this.store.getAdminByEmail(normalizedIdentifier.toLowerCase());
    if (!user || !user.active) {
      return null;
    }

    if (user.lockedUntil && user.lockedUntil > Date.now()) {
      throw new UnauthorizedException('Account temporarily locked. Please try again later.');
    }

    const validPassword = this.cryptoService.verifyPassword(password, user.passwordHash);
    if (!validPassword) {
      user.failedAttempts += 1;
      if (user.failedAttempts >= MAX_FAILED_ATTEMPTS) {
        user.lockedUntil = Date.now() + LOCKOUT_MS;
        user.failedAttempts = 0;
      }
      user.updatedAt = new Date().toISOString();
      await this.store.saveAdmin(user);

      await this.auditService.log({
        actorId: user.id,
        actorType: 'admin',
        action: 'admin_login_failed',
        targetType: 'admin_user',
        targetId: user.id,
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    user.failedAttempts = 0;
    user.lockedUntil = undefined;
    user.updatedAt = new Date().toISOString();
    await this.store.saveAdmin(user);

    const activeRoleAssignments = this.getActiveRoleAssignments(user.roles);
    const activeRoles = [...new Set(activeRoleAssignments.map((assignment) => assignment.role))];
    if (activeRoles.length === 0) {
      throw new UnauthorizedException('No active role assignment for this account');
    }

    const sessionId = this.cryptoService.randomId('sess');
    const token = this.cryptoService.signToken(
      {
        sub: user.id,
        type: 'admin',
        code: user.code,
        roles: activeRoles,
        roleAssignments: activeRoleAssignments,
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

    return { accessToken: token };
  }

  createCaptchaChallenge(): {
    captchaToken: string;
    captchaImage: string;
    expiresInSeconds: number;
  } {
    return this.cryptoService.createCaptchaChallenge();
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

    if (payload.origin === 'user') {
      if (!this.dataSource) {
        return null;
      }

      const rows = await this.dataSource.query(
        'SELECT id, code, name, email, active, is_super_admin FROM adwest.users WHERE id = $1 LIMIT 1',
        [payload.sub],
      ) as Array<{ id: string; code: string; name: string; email: string | null; active: boolean; is_super_admin: boolean }>;
      const user = rows[0];
      if (!user || !user.active || !user.is_super_admin) {
        return null;
      }

      const sourceAssignments = payload.roleAssignments?.length
        ? payload.roleAssignments
        : [{ role: AdminRole.SUPER_ADMIN, scopeType: 'global' as const }];
      const activeRoleAssignments = this.getActiveRoleAssignments(sourceAssignments);
      const activeRoles = [...new Set(activeRoleAssignments.map((assignment) => assignment.role))];
      if (activeRoles.length === 0) {
        return null;
      }

      return {
        userId: user.id,
        type: 'admin',
        email: user.email ?? undefined,
        roles: activeRoles,
        roleAssignments: activeRoleAssignments,
        sessionId: payload.sid,
      };
    }

    const user = await this.store.getAdminById(payload.sub);
    if (!user || !user.active) {
      return null;
    }

    const sourceAssignments = payload.roleAssignments?.length
      ? payload.roleAssignments
      : user.roles;

    const activeRoleAssignments = this.getActiveRoleAssignments(sourceAssignments);
    const activeRoles = [...new Set(activeRoleAssignments.map((assignment) => assignment.role))];
    if (activeRoles.length === 0) {
      return null;
    }

    return {
      userId: user.id,
      type: 'admin',
      email: user.email,
      roles: activeRoles,
      roleAssignments: activeRoleAssignments,
      sessionId: payload.sid,
    };
  }

  private async tryCoreUserLogin(
    identifier: string,
    password: string,
  ): Promise<{ accessToken: string } | null> {
    if (!this.dataSource) {
      return null;
    }

    const normalizedIdentifier = identifier.trim();

    const rows = await this.dataSource.query(
      `SELECT id, code, name, email, phone, password_hash, active, is_super_admin, must_reset_password
       FROM adwest.users
       WHERE lower(email) = lower($1)
          OR phone = $1
          OR code = $1
       ORDER BY created_at ASC
       LIMIT 1`,
      [normalizedIdentifier],
    ) as Array<{ id: string; code: string; name: string; email: string | null; phone: string | null; password_hash: string | null; active: boolean; is_super_admin: boolean; must_reset_password: boolean }>;

    const user = rows[0];
    if (!user || !user.active || !user.password_hash) {
      return null;
    }

    const validPassword = this.cryptoService.verifyPassword(password, user.password_hash);
    if (!validPassword) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.is_super_admin) {
      return null;
    }

    const sessionId = this.cryptoService.randomId('sess');
    const token = this.cryptoService.signToken(
      {
        sub: user.id,
        type: 'admin',
        origin: 'user',
        code: user.code,
        name: user.name,
        roles: ['SUPER_ADMIN'],
        sid: sessionId,
        email: user.email ?? undefined,
        mustResetPassword: user.must_reset_password || undefined,
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
      details: { source: 'user', email: user.email },
    });

    return { accessToken: token };
  }

  async verifyMemberToken(token: string): Promise<AuthPrincipal | null> {
    const payload = this.cryptoService.verifyToken(token);
    if (!payload || payload.type !== 'member') {
      return null;
    }

    const session = await this.store.getSession(payload.sid);
    if (!session || session.type !== 'member' || session.expiresAt < Date.now()) {
      return null;
    }

    const members = await this.store.getMembers();
    const member = members.find((item) => item.id === payload.sub && item.active);
    if (!member) {
      return null;
    }

    return {
      userId: member.id,
      memberId: member.id,
      type: 'member',
      email: member.email,
      roles: [],
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

  getBootstrapAdmin(): { email: string; password: string; roles: AdminRole[] } {
    return {
      email: 'super.admin@adwest.local',
      password: 'SuperAdmin@123',
      roles: [AdminRole.SUPER_ADMIN],
    };
  }

  private getActiveRoleAssignments(roleAssignments: RoleAssignment[]): RoleAssignment[] {
    return roleAssignments
      .filter((assignment) => this.isRoleAssignmentActive(assignment, Date.now()));
  }

  private isRoleAssignmentActive(assignment: RoleAssignment, nowMs: number): boolean {
    const startsAt = assignment.effectiveFrom ? Date.parse(assignment.effectiveFrom) : undefined;
    const endsAt = assignment.effectiveTo ? Date.parse(assignment.effectiveTo) : undefined;

    if (startsAt !== undefined && !Number.isNaN(startsAt) && nowMs < startsAt) {
      return false;
    }

    if (endsAt !== undefined && !Number.isNaN(endsAt) && nowMs >= endsAt) {
      return false;
    }

    return true;
  }
}
