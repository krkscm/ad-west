import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ROLE_DEFINITION_STORE, USER_STORE } from '../constants';
import { AssignRoleDto } from '../dto/assign-role.dto';
import { CreateAdminUserDto } from '../dto/create-admin-user.dto';
import { ListAdminUsersQueryDto } from '../dto/list-admin-users-query.dto';
import { ResetAdminPasswordDto } from '../dto/reset-admin-password.dto';
import { UpdateAdminProfileDto } from '../dto/update-admin-profile.dto';
import { UpdateAdminUserStatusDto } from '../dto/update-admin-user-status.dto';
import { AuthPrincipal } from '../interfaces/auth-principal.interface';
import { AdminUser, RoleAssignment } from '../interfaces/admin-user.interface';
import { AdminRole } from '../enums/admin-role.enum';
import { RoleDefinitionStore } from '../interfaces/role-definition-store.interface';
import { UserStore } from '../interfaces/user-store.interface';
import { AuditService } from './audit.service';
import { CryptoService } from './crypto.service';

export interface PaginatedAdminUsersResponse {
  items: Array<Omit<AdminUser, 'passwordHash'>>;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

@Injectable()
export class AdminUsersService {
  constructor(
    @Inject(USER_STORE) private readonly store: UserStore,
    @Inject(ROLE_DEFINITION_STORE) private readonly roleDefinitionStore: RoleDefinitionStore,
    private readonly cryptoService: CryptoService,
    private readonly auditService: AuditService,
  ) {}

  async listAdmins(): Promise<Array<Omit<AdminUser, 'passwordHash'>>> {
    const admins = await this.store.getAdmins();
    return admins.map((admin) => this.sanitizeAdmin(admin));
  }

  async listAdminsPaginated(query: ListAdminUsersQueryDto): Promise<PaginatedAdminUsersResponse> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const search = query.search?.trim().toLowerCase();

    let admins = await this.store.getAdmins();
    admins = admins.sort((a, b) => a.name.localeCompare(b.name));

    if (search) {
      admins = admins.filter((admin) => {
        return (
          admin.name.toLowerCase().includes(search) ||
          admin.code.toLowerCase().includes(search) ||
          admin.email.toLowerCase().includes(search)
        );
      });
    }

    const total = admins.length;
    const totalPages = total === 0 ? 1 : Math.ceil(total / pageSize);
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * pageSize;
    const items = admins.slice(start, start + pageSize).map((admin) => this.sanitizeAdmin(admin));

    return {
      items,
      page: safePage,
      pageSize,
      total,
      totalPages,
    };
  }

  async createAdmin(
    dto: CreateAdminUserDto,
    principal: AuthPrincipal,
  ): Promise<Omit<AdminUser, 'passwordHash'>> {
    const normalizedCode = this.normalizeCode(dto.code);
    const existing = await this.store.getAdminByCode(normalizedCode);
    if (existing) {
      throw new BadRequestException('Admin code already exists');
    }

    const roleDefinition = await this.assertRoleDefinitionExists(dto.roleDefinitionId);

    const now = new Date().toISOString();
    const roleAssignment = this.buildRoleAssignmentFromDefinition(roleDefinition, now);
    const admin: AdminUser = {
      id: this.cryptoService.randomId('admin'),
      code: normalizedCode,
      name: dto.name,
      email: this.buildInternalEmail(normalizedCode),
      roleDefinitionId: roleDefinition.id,
      passwordHash: this.cryptoService.hashPassword(dto.password),
      active: dto.active ?? true,
      failedAttempts: 0,
      roles: [roleAssignment],
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
      details: { code: admin.code, roleDefinitionId: admin.roleDefinitionId },
    });

    return this.sanitizeAdmin(admin);
  }

  async updateProfile(
    id: string,
    dto: UpdateAdminProfileDto,
    principal: AuthPrincipal,
  ): Promise<Omit<AdminUser, 'passwordHash'>> {
    const admin = await this.store.getAdminById(id);
    if (!admin) throw new NotFoundException('Admin user not found');

    if (dto.code !== undefined) {
      const normalizedCode = this.normalizeCode(dto.code);
      if (normalizedCode !== admin.code) {
        const existing = await this.store.getAdminByCode(normalizedCode);
        if (existing && existing.id !== admin.id) {
          throw new BadRequestException('Admin code already exists');
        }
      }
      admin.code = normalizedCode;
      admin.email = this.buildInternalEmail(normalizedCode);
    }

    if (dto.name) admin.name = dto.name.trim();
    if (dto.roleDefinitionId !== undefined) {
      const roleDefinition = await this.assertRoleDefinitionExists(dto.roleDefinitionId);
      admin.roleDefinitionId = roleDefinition.id;
      admin.roles = [this.buildRoleAssignmentFromDefinition(roleDefinition, new Date().toISOString())];
    }
    admin.updatedAt = new Date().toISOString();
    await this.store.saveAdmin(admin);

    await this.auditService.log({
      actorId: principal.userId,
      actorType: 'admin',
      action: 'admin_user_profile_updated',
      targetType: 'admin_user',
      targetId: admin.id,
      details: { updatedFields: Object.keys(dto) },
    });

    return this.sanitizeAdmin(admin);
  }

  async updateStatus(
    id: string,
    dto: UpdateAdminUserStatusDto,
    principal: AuthPrincipal,
  ): Promise<Omit<AdminUser, 'passwordHash'>> {
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
  ): Promise<Omit<AdminUser, 'passwordHash'>> {
    const admin = await this.store.getAdminById(id);
    if (!admin) {
      throw new NotFoundException('Admin user not found');
    }

    if (dto.scopeType !== 'global' && !dto.scopeId) {
      throw new BadRequestException('scopeId is required for zone or sreny scope');
    }

    const now = new Date().toISOString();
    const roleAssignment = this.buildRoleAssignment(dto, now);

    admin.roles.push({
      ...roleAssignment,
    });
    admin.updatedAt = now;
    await this.store.saveAdmin(admin);

    await this.auditService.log({
      actorId: principal.userId,
      actorType: 'admin',
      action: 'admin_user_role_assigned',
      targetType: 'admin_user',
      targetId: admin.id,
      details: {
        role: dto.role,
        scopeType: dto.scopeType,
        scopeId: dto.scopeId,
        effectiveFrom: roleAssignment.effectiveFrom,
        effectiveTo: roleAssignment.effectiveTo,
      },
    });

    return this.sanitizeAdmin(admin);
  }

  async deleteAdmin(id: string, principal: AuthPrincipal): Promise<{ success: boolean }> {
    const admin = await this.store.getAdminById(id);
    if (!admin) throw new NotFoundException('Admin user not found');
    if (id === principal.userId) throw new BadRequestException('Cannot delete your own account');

    await this.store.deleteAdmin(id);

    await this.auditService.log({
      actorId: principal.userId,
      actorType: 'admin',
      action: 'admin_user_deleted',
      targetType: 'admin_user',
      targetId: id,
      details: { name: admin.name, email: admin.email },
    });

    return { success: true };
  }

  private sanitizeAdmin(admin: AdminUser): Omit<AdminUser, 'passwordHash'> {
    const { passwordHash: _passwordHash, ...safe } = admin;
    return safe;
  }

  private normalizeCode(code: string): string {
    return code.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '_');
  }

  private buildInternalEmail(code: string): string {
    return `${code.toLowerCase()}@adwest.local`;
  }

  private async assertRoleDefinitionExists(roleDefinitionId: string) {
    const roleDefinition = await this.roleDefinitionStore.findById(roleDefinitionId);
    if (!roleDefinition || !roleDefinition.active) {
      throw new BadRequestException('Active role definition is required');
    }
    return roleDefinition;
  }

  private buildRoleAssignmentFromDefinition(
    roleDefinition: { level: 'ZONE' | 'STHAN' },
    nowIso: string,
  ): RoleAssignment {
    return {
      role: roleDefinition.level === 'ZONE' ? AdminRole.ZONE_ADMIN : AdminRole.SRENY_ADMIN,
      scopeType: roleDefinition.level === 'ZONE' ? 'zone' : 'sreny',
      effectiveFrom: nowIso,
    };
  }

  private buildRoleAssignment(
    dto: Pick<AssignRoleDto, 'role' | 'scopeType' | 'scopeId' | 'effectiveFrom' | 'effectiveTo'>,
    nowIso: string,
  ): RoleAssignment {
    const effectiveFrom = dto.effectiveFrom ?? nowIso;
    const effectiveTo = dto.effectiveTo;

    const fromMs = Date.parse(effectiveFrom);
    if (Number.isNaN(fromMs)) {
      throw new BadRequestException('effectiveFrom must be a valid ISO date string');
    }

    if (effectiveTo) {
      const toMs = Date.parse(effectiveTo);
      if (Number.isNaN(toMs)) {
        throw new BadRequestException('effectiveTo must be a valid ISO date string');
      }

      if (toMs <= fromMs) {
        throw new BadRequestException('effectiveTo must be later than effectiveFrom');
      }
    }

    return {
      role: dto.role,
      scopeType: dto.scopeType,
      scopeId: dto.scopeId,
      effectiveFrom,
      effectiveTo,
    };
  }
}
