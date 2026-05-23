import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { USER_STORE } from '../constants';
import { AssignRoleDto } from '../dto/assign-role.dto';
import { CreateAdminUserDto } from '../dto/create-admin-user.dto';
import { ResetAdminPasswordDto } from '../dto/reset-admin-password.dto';
import { UpdateAdminUserStatusDto } from '../dto/update-admin-user-status.dto';
import { AuthPrincipal } from '../interfaces/auth-principal.interface';
import { AdminUser } from '../interfaces/admin-user.interface';
import { UserStore } from '../interfaces/user-store.interface';
import { AuditService } from './audit.service';
import { CryptoService } from './crypto.service';

@Injectable()
export class AdminUsersService {
  constructor(
    @Inject(USER_STORE) private readonly store: UserStore,
    private readonly cryptoService: CryptoService,
    private readonly auditService: AuditService,
  ) {}

  async listAdmins(): Promise<Array<Omit<AdminUser, 'passwordHash' | 'totpSecret'>>> {
    const admins = await this.store.getAdmins();
    return admins.map((admin) => this.sanitizeAdmin(admin));
  }

  async createAdmin(
    dto: CreateAdminUserDto,
    principal: AuthPrincipal,
  ): Promise<Omit<AdminUser, 'passwordHash' | 'totpSecret'>> {
    const existing = await this.store.getAdminByEmail(dto.email);
    if (existing) {
      throw new BadRequestException('Admin user already exists');
    }

    if (dto.scopeType !== 'global' && !dto.scopeId) {
      throw new BadRequestException('scopeId is required for zone or sreny scope');
    }

    const now = new Date().toISOString();
    const admin: AdminUser = {
      id: this.cryptoService.randomId('admin'),
      name: dto.name,
      email: dto.email.toLowerCase(),
      passwordHash: this.cryptoService.hashPassword(dto.password),
      active: true,
      mfaEnabled: false,
      roles: [
        {
          role: dto.role,
          scopeType: dto.scopeType,
          scopeId: dto.scopeId,
        },
      ],
      createdAt: now,
      updatedAt: now,
    };

    await this.store.createAdmin(admin);
    await this.auditService.log({
      actorId: principal.userId,
      actorType: 'admin',
      action: 'admin_user_created',
      targetType: 'admin_user',
      targetId: admin.id,
      details: { email: admin.email },
    });

    return this.sanitizeAdmin(admin);
  }

  async updateStatus(
    id: string,
    dto: UpdateAdminUserStatusDto,
    principal: AuthPrincipal,
  ): Promise<Omit<AdminUser, 'passwordHash' | 'totpSecret'>> {
    const admin = await this.store.getAdminById(id);
    if (!admin) {
      throw new NotFoundException('Admin user not found');
    }

    admin.active = dto.active;
    admin.updatedAt = new Date().toISOString();
    await this.store.saveAdmin(admin);

    await this.auditService.log({
      actorId: principal.userId,
      actorType: 'admin',
      action: 'admin_user_status_updated',
      targetType: 'admin_user',
      targetId: admin.id,
      details: { active: dto.active },
    });

    return this.sanitizeAdmin(admin);
  }

  async resetPassword(
    id: string,
    dto: ResetAdminPasswordDto,
    principal: AuthPrincipal,
  ): Promise<{ success: boolean }> {
    const admin = await this.store.getAdminById(id);
    if (!admin) {
      throw new NotFoundException('Admin user not found');
    }

    admin.passwordHash = this.cryptoService.hashPassword(dto.newPassword);
    admin.updatedAt = new Date().toISOString();
    await this.store.saveAdmin(admin);

    await this.auditService.log({
      actorId: principal.userId,
      actorType: 'admin',
      action: 'admin_user_password_reset',
      targetType: 'admin_user',
      targetId: admin.id,
    });

    return { success: true };
  }

  async assignRole(
    id: string,
    dto: AssignRoleDto,
    principal: AuthPrincipal,
  ): Promise<Omit<AdminUser, 'passwordHash' | 'totpSecret'>> {
    const admin = await this.store.getAdminById(id);
    if (!admin) {
      throw new NotFoundException('Admin user not found');
    }

    if (dto.scopeType !== 'global' && !dto.scopeId) {
      throw new BadRequestException('scopeId is required for zone or sreny scope');
    }

    admin.roles.push({
      role: dto.role,
      scopeType: dto.scopeType,
      scopeId: dto.scopeId,
    });
    admin.updatedAt = new Date().toISOString();
    await this.store.saveAdmin(admin);

    await this.auditService.log({
      actorId: principal.userId,
      actorType: 'admin',
      action: 'admin_user_role_assigned',
      targetType: 'admin_user',
      targetId: admin.id,
      details: { role: dto.role, scopeType: dto.scopeType, scopeId: dto.scopeId },
    });

    return this.sanitizeAdmin(admin);
  }

  private sanitizeAdmin(admin: AdminUser): Omit<AdminUser, 'passwordHash' | 'totpSecret'> {
    const { passwordHash: _passwordHash, totpSecret: _totpSecret, ...safe } = admin;
    return safe;
  }
}
