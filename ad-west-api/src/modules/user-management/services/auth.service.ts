import {
  Inject,
  Injectable,
  Optional,
  UnauthorizedException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { USER_STORE } from '../constants';
import { AdminRole } from '../enums/admin-role.enum';
import { AuthPrincipal } from '../interfaces/auth-principal.interface';
import { AdminLoginDto } from '../dto/admin-login.dto';
import { MemberLoginDto } from '../dto/member-login.dto';
import { UserStore } from '../interfaces/user-store.interface';
import { AuditService } from './audit.service';
import { CryptoService } from './crypto.service';
import { GoogleIntegrationConfigService } from './google-integration-config.service';
import { MailService } from './mail.service';
import { RoleAssignment } from '../interfaces/admin-user.interface';
import { DataSource } from 'typeorm';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

interface GoogleOAuthState {
  returnOrigin: string;
  expiresAt: number;
}

interface GoogleProfile {
  name: string;
  email: string;
  picture?: string;
}

interface GoogleSessionToken {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  profile: GoogleProfile;
}

interface GmailInboxItem {
  id: string;
  subject: string;
  from: string;
  date: string;
  snippet: string;
}

@Injectable()
export class AuthService {
  private readonly googleOauthStates = new Map<string, GoogleOAuthState>();
  private readonly googleSessionTokens = new Map<string, GoogleSessionToken>();

  constructor(
    @Inject(USER_STORE) private readonly store: UserStore,
    private readonly cryptoService: CryptoService,
    private readonly auditService: AuditService,
    private readonly googleIntegrationConfigService: GoogleIntegrationConfigService,
    private readonly mailService: MailService,
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

    const selectClause =
      'SELECT id, code, name, email, phone, password_hash, active, is_super_admin, must_reset_password FROM adwest.users';

    const isEmail = normalizedIdentifier.includes('@');
    const isPhone = /^\+?[0-9]{7,20}$/.test(normalizedIdentifier);

    let rows: Array<{
      id: string;
      code: string;
      name: string;
      email: string | null;
      phone: string | null;
      password_hash: string | null;
      active: boolean;
      is_super_admin: boolean;
      must_reset_password: boolean;
    }> = [];

    if (isEmail) {
      rows = await this.dataSource.query(
        `${selectClause} WHERE lower(email) = lower($1) LIMIT 1`,
        [normalizedIdentifier],
      ) as typeof rows;
    } else if (isPhone) {
      rows = await this.dataSource.query(
        `${selectClause} WHERE phone = $1 LIMIT 1`,
        [normalizedIdentifier],
      ) as typeof rows;
    } else {
      rows = await this.dataSource.query(
        `${selectClause} WHERE code = $1 LIMIT 1`,
        [normalizedIdentifier],
      ) as typeof rows;
    }

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

    const member = await this.store.getMemberById(payload.sub);
    if (!member || !member.active) {
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

  async forgotPassword(email: string): Promise<void> {
    if (!this.dataSource) return;

    const normalizedEmail = email.toLowerCase().trim();
    const rows = await this.dataSource.query(
      `SELECT id, active FROM adwest.auth_admin_users WHERE lower(email) = $1 LIMIT 1`,
      [normalizedEmail],
    ) as Array<{ id: string; active: boolean }>;

    if (!rows[0] || !rows[0].active) return;

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await this.dataSource.query(
      `DELETE FROM adwest.admin_password_reset_tokens WHERE user_email = $1`,
      [normalizedEmail],
    );
    await this.dataSource.query(
      `INSERT INTO adwest.admin_password_reset_tokens (token, user_email, expires_at) VALUES ($1, $2, $3)`,
      [token, normalizedEmail, expiresAt],
    );

    const webOrigin = process.env.WEB_APP_ORIGIN || 'http://localhost:3000';
    const resetLink = `${webOrigin}/reset-password?token=${token}`;

    await this.mailService.sendMail({
      to: normalizedEmail,
      subject: 'AD West — Password Reset Request',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#f8f9fb;border-radius:10px;">
          <h2 style="color:#1e293b;margin:0 0 8px;">Password Reset</h2>
          <p style="color:#475569;margin:0 0 24px;">We received a request to reset your AD West admin account password. Click the button below to set a new password. This link expires in <strong>1 hour</strong>.</p>
          <a href="${resetLink}" style="display:inline-block;padding:12px 28px;background:#6366f1;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">Reset Password</a>
          <p style="color:#94a3b8;font-size:12px;margin:24px 0 0;">If you did not request this, you can safely ignore this email. Your password will not change.</p>
          <p style="color:#94a3b8;font-size:12px;margin:8px 0 0;">Or copy this link: ${resetLink}</p>
        </div>
      `,
    });
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    if (!this.dataSource) {
      throw new UnauthorizedException('Password reset is not available.');
    }

    const rows = await this.dataSource.query(
      `SELECT token, user_email, expires_at FROM adwest.admin_password_reset_tokens WHERE token = $1 LIMIT 1`,
      [token],
    ) as Array<{ token: string; user_email: string; expires_at: string }>;

    const record = rows[0];
    if (!record || new Date(record.expires_at) < new Date()) {
      throw new UnauthorizedException('This reset link is invalid or has expired.');
    }

    const userRows = await this.dataSource.query(
      `SELECT id, active FROM adwest.auth_admin_users WHERE lower(email) = $1 LIMIT 1`,
      [record.user_email],
    ) as Array<{ id: string; active: boolean }>;

    if (!userRows[0] || !userRows[0].active) {
      throw new UnauthorizedException('Account not found or inactive.');
    }

    const passwordHash = this.cryptoService.hashPassword(newPassword);

    await this.dataSource.query(
      `UPDATE adwest.auth_admin_users
       SET password_hash = $1, must_reset_password = FALSE, failed_attempts = 0, locked_until = NULL
       WHERE lower(email) = $2`,
      [passwordHash, record.user_email],
    );

    await this.dataSource.query(
      `DELETE FROM adwest.admin_password_reset_tokens WHERE token = $1`,
      [token],
    );
  }

  async adminLogout(principal: AuthPrincipal): Promise<void> {
    this.googleSessionTokens.delete(principal.sessionId);
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

  async buildGoogleAuthUrl(returnOrigin?: string): Promise<string> {
    const config = await this.googleIntegrationConfigService.getResolvedConfig();
    const clientId = config.clientId;
    const redirectUri = config.redirectUri;
    if (!clientId || !redirectUri) {
      throw new UnauthorizedException('Google OAuth is not configured.');
    }
    if (!config.enabled) {
      throw new UnauthorizedException('Google OAuth is currently disabled in settings.');
    }

    const state = this.cryptoService.randomId('gstate');
    const safeOrigin = this.resolveReturnOrigin(returnOrigin, config.webAppOrigin);
    this.googleOauthStates.set(state, {
      returnOrigin: safeOrigin,
      expiresAt: Date.now() + 10 * 60 * 1000,
    });

    const scope = config.oauthScopes
      || 'openid email profile https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.readonly';

    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', scope);
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('prompt', 'consent');
    authUrl.searchParams.set('state', state);

    return authUrl.toString();
  }

  async completeGoogleAuth(code: string, state: string): Promise<{ accessToken: string; profile: GoogleProfile; returnOrigin: string }> {
    const stateEntry = this.googleOauthStates.get(state);
    this.googleOauthStates.delete(state);
    if (!stateEntry || stateEntry.expiresAt < Date.now()) {
      throw new UnauthorizedException('Google login state is invalid or expired.');
    }

    const tokenPayload = await this.exchangeGoogleCodeForTokens(code);
    const profile = await this.fetchGoogleProfile(tokenPayload.access_token);

    const result = await this.issueGoogleAdminSession(profile, tokenPayload.access_token, tokenPayload.refresh_token, tokenPayload.expires_in);

    await this.auditService.log({
      actorId: result.userId,
      actorType: 'admin',
      action: 'admin_google_login_success',
      targetType: 'admin_user',
      targetId: result.userId,
      details: { email: profile.email },
    });

    return {
      accessToken: result.accessToken,
      profile,
      returnOrigin: stateEntry.returnOrigin,
    };
  }

  async sendGmailMessage(principal: AuthPrincipal, to: string, subject: string, body: string): Promise<{ success: boolean; messageId: string }> {
    const accessToken = await this.ensureGoogleAccessToken(principal.sessionId);

    const rawMessage = [
      `To: ${to}`,
      `Subject: ${subject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=UTF-8',
      '',
      body,
    ].join('\r\n');

    const encodedMessage = Buffer.from(rawMessage)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '');

    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw: encodedMessage }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new UnauthorizedException(`Failed to send Gmail message. ${errorBody}`);
    }

    const payload = await response.json() as { id?: string };
    return { success: true, messageId: payload.id ?? '' };
  }

  async listInboxEmails(principal: AuthPrincipal, maxResults = 10): Promise<GmailInboxItem[]> {
    const accessToken = await this.ensureGoogleAccessToken(principal.sessionId);
    const listUrl = new URL('https://gmail.googleapis.com/gmail/v1/users/me/messages');
    listUrl.searchParams.set('maxResults', String(maxResults));
    listUrl.searchParams.set('labelIds', 'INBOX');

    const listResponse = await fetch(listUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!listResponse.ok) {
      const errorBody = await listResponse.text();
      throw new UnauthorizedException(`Failed to fetch inbox list. ${errorBody}`);
    }

    const listPayload = await listResponse.json() as { messages?: Array<{ id: string }> };
    const messages = listPayload.messages ?? [];
    if (messages.length === 0) {
      return [];
    }

    const emailRows = await Promise.all(
      messages.map(async (message) => {
        const detailsUrl = new URL(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${message.id}`);
        detailsUrl.searchParams.set('format', 'metadata');
        detailsUrl.searchParams.set('metadataHeaders', 'Subject');
        detailsUrl.searchParams.set('metadataHeaders', 'From');
        detailsUrl.searchParams.set('metadataHeaders', 'Date');

        const detailsResponse = await fetch(detailsUrl, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (!detailsResponse.ok) {
          return {
            id: message.id,
            subject: '(Unable to load subject)',
            from: '(Unknown sender)',
            date: '',
            snippet: '',
          };
        }

        const details = await detailsResponse.json() as {
          id?: string;
          snippet?: string;
          payload?: { headers?: Array<{ name: string; value: string }> };
        };

        const headers = details.payload?.headers ?? [];
        const readHeader = (name: string) => headers.find((header) => header.name.toLowerCase() === name.toLowerCase())?.value ?? '';

        return {
          id: details.id ?? message.id,
          subject: readHeader('Subject') || '(No Subject)',
          from: readHeader('From') || '(Unknown sender)',
          date: readHeader('Date'),
          snippet: details.snippet ?? '',
        };
      }),
    );

    return emailRows;
  }

  private resolveReturnOrigin(returnOrigin: string | undefined, fallbackOrigin: string): string {
    if (!returnOrigin) {
      return fallbackOrigin;
    }

    try {
      const parsed = new URL(returnOrigin);
      return `${parsed.protocol}//${parsed.host}`;
    } catch {
      return fallbackOrigin;
    }
  }

  private async exchangeGoogleCodeForTokens(code: string): Promise<{ access_token: string; refresh_token?: string; expires_in: number }> {
    const config = await this.googleIntegrationConfigService.getResolvedConfig();
    const clientId = config.clientId;
    const clientSecret = config.clientSecret;
    const redirectUri = config.redirectUri;

    if (!clientId || !clientSecret || !redirectUri) {
      throw new UnauthorizedException('Google OAuth settings are missing required values.');
    }

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const errorBody = await tokenResponse.text();
      throw new UnauthorizedException(`Google token exchange failed. ${errorBody}`);
    }

    const payload = await tokenResponse.json() as { access_token?: string; refresh_token?: string; expires_in?: number };
    if (!payload.access_token || !payload.expires_in) {
      throw new UnauthorizedException('Google token exchange returned incomplete data.');
    }

    return {
      access_token: payload.access_token,
      refresh_token: payload.refresh_token,
      expires_in: payload.expires_in,
    };
  }

  private async fetchGoogleProfile(accessToken: string): Promise<GoogleProfile> {
    const profileResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!profileResponse.ok) {
      const errorBody = await profileResponse.text();
      throw new UnauthorizedException(`Failed to fetch Google profile. ${errorBody}`);
    }

    const profilePayload = await profileResponse.json() as { name?: string; email?: string; picture?: string };
    if (!profilePayload.email) {
      throw new UnauthorizedException('Google profile does not include email.');
    }

    return {
      name: profilePayload.name || profilePayload.email,
      email: profilePayload.email.toLowerCase(),
      picture: profilePayload.picture,
    };
  }

  private async issueGoogleAdminSession(
    profile: GoogleProfile,
    googleAccessToken: string,
    googleRefreshToken: string | undefined,
    googleExpiresIn: number,
  ): Promise<{ userId: string; accessToken: string; sessionId: string }> {
    const adminUser = await this.store.getAdminByEmail(profile.email);
    if (adminUser && adminUser.active) {
      const activeRoleAssignments = this.getActiveRoleAssignments(adminUser.roles);
      const activeRoles = [...new Set(activeRoleAssignments.map((assignment) => assignment.role))];
      if (activeRoles.length === 0) {
        throw new UnauthorizedException('No active role assignment for this account');
      }

      const sessionId = this.cryptoService.randomId('sess');
      const appToken = this.cryptoService.signToken(
        {
          sub: adminUser.id,
          type: 'admin',
          code: adminUser.code,
          name: profile.name,
          email: profile.email,
          picture: profile.picture,
          authProvider: 'google',
          roles: activeRoles,
          roleAssignments: activeRoleAssignments,
          sid: sessionId,
        },
        60 * 60,
      );

      await this.store.saveSession({
        tokenId: sessionId,
        userId: adminUser.id,
        type: 'admin',
        expiresAt: Date.now() + 60 * 60 * 1000,
      });

      this.googleSessionTokens.set(sessionId, {
        accessToken: googleAccessToken,
        refreshToken: googleRefreshToken,
        expiresAt: Date.now() + googleExpiresIn * 1000,
        profile,
      });

      return {
        userId: adminUser.id,
        accessToken: appToken,
        sessionId,
      };
    }

    if (!this.dataSource) {
      throw new UnauthorizedException('Google account is not mapped to an admin user.');
    }

    const rows = await this.dataSource.query(
      'SELECT id, code, name, email, active, is_super_admin FROM adwest.users WHERE lower(email) = lower($1) LIMIT 1',
      [profile.email],
    ) as Array<{ id: string; code: string; name: string; email: string | null; active: boolean; is_super_admin: boolean }>;
    const user = rows[0];
    if (!user || !user.active || !user.is_super_admin) {
      throw new UnauthorizedException('Google account is not authorized for admin access.');
    }

    const sessionId = this.cryptoService.randomId('sess');
    const appToken = this.cryptoService.signToken(
      {
        sub: user.id,
        type: 'admin',
        origin: 'user',
        code: user.code,
        name: profile.name || user.name,
        email: profile.email || user.email || undefined,
        picture: profile.picture,
        authProvider: 'google',
        roles: ['SUPER_ADMIN'],
        roleAssignments: [{ role: AdminRole.SUPER_ADMIN, scopeType: 'global' }],
        sid: sessionId,
      },
      60 * 60,
    );

    await this.store.saveSession({
      tokenId: sessionId,
      userId: user.id,
      type: 'admin',
      expiresAt: Date.now() + 60 * 60 * 1000,
    });

    this.googleSessionTokens.set(sessionId, {
      accessToken: googleAccessToken,
      refreshToken: googleRefreshToken,
      expiresAt: Date.now() + googleExpiresIn * 1000,
      profile,
    });

    return {
      userId: user.id,
      accessToken: appToken,
      sessionId,
    };
  }

  private async ensureGoogleAccessToken(sessionId: string): Promise<string> {
    const record = this.googleSessionTokens.get(sessionId);
    if (!record) {
      throw new UnauthorizedException('Google account is not connected for this session.');
    }

    if (record.expiresAt > Date.now() + 45_000) {
      return record.accessToken;
    }

    if (!record.refreshToken) {
      throw new UnauthorizedException('Google access token expired. Please sign in with Google again.');
    }

    const config = await this.googleIntegrationConfigService.getResolvedConfig();
    const clientId = config.clientId;
    const clientSecret = config.clientSecret;
    if (!clientId || !clientSecret) {
      throw new UnauthorizedException('Google OAuth settings are missing required values.');
    }

    const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: record.refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!refreshResponse.ok) {
      const errorBody = await refreshResponse.text();
      throw new UnauthorizedException(`Google token refresh failed. ${errorBody}`);
    }

    const refreshed = await refreshResponse.json() as { access_token?: string; expires_in?: number };
    if (!refreshed.access_token || !refreshed.expires_in) {
      throw new UnauthorizedException('Google token refresh response is incomplete.');
    }

    const updated: GoogleSessionToken = {
      ...record,
      accessToken: refreshed.access_token,
      expiresAt: Date.now() + refreshed.expires_in * 1000,
    };
    this.googleSessionTokens.set(sessionId, updated);
    return updated.accessToken;
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
