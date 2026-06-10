import { BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { CryptoService } from '@modules/user-management/services/crypto.service';
import { DataSource } from 'typeorm';
import { CreateUserDto, UpdateUserDto } from '../dto/core-business.dto';
import type { UserRecord } from '../core-business.service';

export interface UserAdminRuntimeContext {
  users: Map<string, UserRecord>;
  runtimeMode: 'in-memory' | 'db';
  dataSource?: DataSource;
  cryptoService: CryptoService;
  newId: (prefix: string) => string;
  toIsoTimestamp: (value: string | Date) => string;
}

export class UserAdminRuntimeService {
  constructor(private readonly ctx: UserAdminRuntimeContext) {}

  listUsers(params: { page?: number; pageSize?: number; search?: string }): {
    items: UserRecord[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  } {
    const page = Math.max(1, params.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 10));
    const q = (params.search ?? '').trim().toLowerCase();
    const all = Array.from(this.ctx.users.values())
      .filter((u) => !q || u.name.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || u.phone?.includes(q) || u.code.toLowerCase().includes(q))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const total = all.length;
    const items = all.slice((page - 1) * pageSize, page * pageSize);
    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async listUsersFromDb(params: { page?: number; pageSize?: number; search?: string }): Promise<{
    items: UserRecord[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    if (this.ctx.runtimeMode !== 'db' || !this.ctx.dataSource) {
      return this.listUsers(params);
    }

    const page = Math.max(1, params.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 10));
    const search = (params.search ?? '').trim();
    const searchParam = search ? `%${search}%` : null;
    const [countRows, dataRows] = await Promise.all([
      this.ctx.dataSource.query(
        `SELECT COUNT(*)::int AS total FROM adwest.users
         WHERE ($1::text IS NULL OR name ILIKE $1 OR email ILIKE $1 OR phone ILIKE $1 OR code ILIKE $1)`,
        [searchParam],
      ),
      this.ctx.dataSource.query(
        `SELECT id, code, name, phone, email, role_id, sthan_id, permission_set_id, admin_management, gender, is_super_admin, must_reset_password, active, created_at, updated_at, created_by, updated_by
         FROM adwest.users
         WHERE ($1::text IS NULL OR name ILIKE $1 OR email ILIKE $1 OR phone ILIKE $1 OR code ILIKE $1)
         ORDER BY created_at DESC
         LIMIT $2 OFFSET $3`,
        [searchParam, pageSize, (page - 1) * pageSize],
      ),
    ]);

    const total = (countRows as Array<{ total: number }>)[0].total;
    const items = (dataRows as Array<{
      id: string;
      code: string;
      name: string;
      phone: string | null;
      email: string | null;
      role_id: string | null;
      sthan_id: string | null;
      permission_set_id: string | null;
      admin_management: string | null;
      gender: string | null;
      is_super_admin: boolean;
      must_reset_password: boolean;
      active: boolean;
      created_at: string | Date;
      updated_at: string | Date;
      created_by: string | null;
      updated_by: string | null;
    }>).map((r) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      phone: r.phone ?? undefined,
      email: r.email ?? undefined,
      roleId: r.role_id ?? undefined,
      sthanId: r.sthan_id ?? undefined,
      permissionSetId: r.permission_set_id ?? undefined,
      adminManagement: r.admin_management ?? undefined,
      gender: r.gender ?? undefined,
      isSuperAdmin: r.is_super_admin,
      mustResetPassword: r.must_reset_password,
      active: r.active,
      createdAt: this.ctx.toIsoTimestamp(r.created_at),
      updatedAt: this.ctx.toIsoTimestamp(r.updated_at),
      createdBy: r.created_by ?? undefined,
      updatedBy: r.updated_by ?? undefined,
    }));

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async createUser(dto: CreateUserDto, actorEmail?: string): Promise<UserRecord> {
    if (dto.email) {
      const dup = Array.from(this.ctx.users.values()).find((u) => u.email === dto.email);
      if (dup) throw new BadRequestException(`Email "${dto.email}" is already in use`);
    }

    let code: string;
    do {
      code = this.generateUserCode();
    } while (Array.from(this.ctx.users.values()).some((u) => u.code === code));

    if (this.ctx.runtimeMode !== 'db' || !this.ctx.dataSource) {
      const now = new Date().toISOString();
      const passwordHash = this.ctx.cryptoService.hashPassword(dto.password);
      const record: UserRecord = {
        id: this.ctx.newId('usr'),
        code,
        name: dto.name,
        phone: dto.phone,
        email: dto.email,
        roleId: dto.roleId,
        sthanId: dto.sthanId,
        permissionSetId: dto.permissionSetId,
        adminManagement: dto.adminManagement,
        gender: dto.gender,
        passwordHash,
        isSuperAdmin: dto.isSuperAdmin ?? false,
        mustResetPassword: true,
        active: true,
        createdAt: now,
        updatedAt: now,
        createdBy: actorEmail,
        updatedBy: actorEmail,
      };
      this.ctx.users.set(record.id, record);
      return record;
    }

    const passwordHash = this.ctx.cryptoService.hashPassword(dto.password);
    const rows = (await this.ctx.dataSource.query(
      `INSERT INTO adwest.users (code, name, phone, email, role_id, sthan_id, permission_set_id, admin_management, gender, password_hash, is_super_admin, must_reset_password, reporting_to_role_ids, created_by, updated_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true, $12, $13, $13)
       RETURNING id, code, name, phone, email, role_id, sthan_id, permission_set_id, admin_management, gender, password_hash, is_super_admin, must_reset_password, active, reporting_to_role_ids, created_at, updated_at, created_by, updated_by`,
      [code, dto.name, dto.phone ?? null, dto.email ?? null, dto.roleId ?? null, dto.sthanId ?? null, dto.permissionSetId ?? null, dto.adminManagement ?? null, dto.gender ?? null, passwordHash, dto.isSuperAdmin ?? false, dto.reportingToRoleIds ?? [], actorEmail ?? null],
    )) as Array<{
      id: string;
      code: string;
      name: string;
      phone: string | null;
      email: string | null;
      role_id: string | null;
      sthan_id: string | null;
      permission_set_id: string | null;
      admin_management: string | null;
      gender: string | null;
      password_hash: string | null;
      is_super_admin: boolean;
      must_reset_password: boolean;
      active: boolean;
      reporting_to_role_ids: string[];
      created_at: string | Date;
      updated_at: string | Date;
      created_by: string | null;
      updated_by: string | null;
    }>;
    const r = rows[0];
    const record: UserRecord = {
      id: r.id,
      code: r.code,
      name: r.name,
      phone: r.phone ?? undefined,
      email: r.email ?? undefined,
      roleId: r.role_id ?? undefined,
      sthanId: r.sthan_id ?? undefined,
      permissionSetId: r.permission_set_id ?? undefined,
      adminManagement: r.admin_management ?? undefined,
      gender: r.gender ?? undefined,
      passwordHash: r.password_hash ?? undefined,
      isSuperAdmin: r.is_super_admin,
      mustResetPassword: r.must_reset_password,
      active: r.active,
      reportingToRoleIds: r.reporting_to_role_ids ?? [],
      createdAt: this.ctx.toIsoTimestamp(r.created_at),
      updatedAt: this.ctx.toIsoTimestamp(r.updated_at),
      createdBy: r.created_by ?? undefined,
      updatedBy: r.updated_by ?? undefined,
    };
    this.ctx.users.set(record.id, record);

    await this.ctx.dataSource.query(
      `INSERT INTO adwest.auth_member_users (id, full_name, email, phone, password_hash, failed_attempts, locked_until, active, must_reset_password)
       VALUES ($1, $2, $3, $4, $5, 0, NULL, true, true)
       ON CONFLICT (id) DO UPDATE SET
         full_name = EXCLUDED.full_name,
         email = EXCLUDED.email,
         phone = EXCLUDED.phone,
         password_hash = EXCLUDED.password_hash,
         active = EXCLUDED.active,
         must_reset_password = EXCLUDED.must_reset_password`,
      [record.id, record.name, record.email ?? null, record.phone ?? null, passwordHash],
    );

    return record;
  }

  async updateUser(userId: string, dto: UpdateUserDto, actorEmail?: string): Promise<UserRecord> {
    if (this.ctx.runtimeMode === 'db' && this.ctx.dataSource && !this.ctx.users.has(userId)) {
      const rows = await this.ctx.dataSource.query(
        'SELECT id, code, name, phone, email, role_id, sthan_id, permission_set_id, admin_management, gender, password_hash, is_super_admin, must_reset_password, active, created_by, updated_by, created_at, updated_at FROM adwest.users WHERE id=$1',
        [userId],
      ) as Array<{
        id: string;
        code: string;
        name: string;
        phone: string | null;
        email: string | null;
        role_id: string | null;
        sthan_id: string | null;
        permission_set_id: string | null;
        admin_management: string | null;
        gender: string | null;
        password_hash: string | null;
        is_super_admin: boolean;
        must_reset_password: boolean;
        active: boolean;
        created_by: string | null;
        updated_by: string | null;
        created_at: string | Date;
        updated_at: string | Date;
      }>;
      if (!rows.length) throw new NotFoundException('User not found');
      const r = rows[0];
      this.ctx.users.set(r.id, {
        id: r.id,
        code: r.code,
        name: r.name,
        phone: r.phone ?? undefined,
        email: r.email ?? undefined,
        roleId: r.role_id ?? undefined,
        sthanId: r.sthan_id ?? undefined,
        permissionSetId: r.permission_set_id ?? undefined,
        adminManagement: r.admin_management ?? undefined,
        gender: r.gender ?? undefined,
        passwordHash: r.password_hash ?? undefined,
        isSuperAdmin: r.is_super_admin,
        mustResetPassword: r.must_reset_password,
        active: r.active,
        createdBy: r.created_by ?? undefined,
        updatedBy: r.updated_by ?? undefined,
        createdAt: this.ctx.toIsoTimestamp(r.created_at),
        updatedAt: this.ctx.toIsoTimestamp(r.updated_at),
      });
    }

    const current = this.ctx.users.get(userId);
    if (!current) throw new NotFoundException('User not found');

    if (dto.email && dto.email !== current.email) {
      const dup = Array.from(this.ctx.users.values()).find((u) => u.email === dto.email && u.id !== userId);
      if (dup) throw new BadRequestException(`Email "${dto.email}" is already in use`);
    }

    const newPasswordHash = dto.password !== undefined ? this.ctx.cryptoService.hashPassword(dto.password) : undefined;
    const nextMustReset = dto.password !== undefined ? false : current.mustResetPassword;

    if (this.ctx.runtimeMode !== 'db' || !this.ctx.dataSource) {
      const updated: UserRecord = {
        ...current,
        name: dto.name ?? current.name,
        phone: dto.phone !== undefined ? dto.phone : current.phone,
        email: dto.email !== undefined ? dto.email : current.email,
        roleId: dto.roleId !== undefined ? dto.roleId : current.roleId,
        sthanId: dto.sthanId !== undefined ? dto.sthanId : current.sthanId,
        permissionSetId: dto.permissionSetId !== undefined ? dto.permissionSetId : current.permissionSetId,
        adminManagement: dto.adminManagement !== undefined ? dto.adminManagement : current.adminManagement,
        gender: dto.gender !== undefined ? dto.gender : current.gender,
        passwordHash: newPasswordHash ?? current.passwordHash,
        isSuperAdmin: dto.isSuperAdmin !== undefined ? dto.isSuperAdmin : current.isSuperAdmin,
        mustResetPassword: nextMustReset,
        active: dto.active !== undefined ? dto.active : current.active,
        updatedBy: actorEmail,
        updatedAt: new Date().toISOString(),
      };
      this.ctx.users.set(userId, updated);
      return updated;
    }

    const rows = (await this.ctx.dataSource.query(
      `UPDATE adwest.users
       SET name=$2, phone=$3, email=$4, role_id=$5, sthan_id=$6, permission_set_id=$7, admin_management=$8, gender=$9, password_hash=$10, is_super_admin=$11, active=$12, must_reset_password=$13, reporting_to_role_ids=$14, updated_by=$15, updated_at=now()
       WHERE id=$1
       RETURNING id, code, name, phone, email, role_id, sthan_id, permission_set_id, admin_management, gender, password_hash, is_super_admin, must_reset_password, active, reporting_to_role_ids, created_at, updated_at, created_by, updated_by`,
      [
        userId,
        dto.name ?? current.name,
        dto.phone !== undefined ? dto.phone : current.phone ?? null,
        dto.email !== undefined ? dto.email : current.email ?? null,
        dto.roleId !== undefined ? dto.roleId : current.roleId ?? null,
        dto.sthanId !== undefined ? dto.sthanId : current.sthanId ?? null,
        dto.permissionSetId !== undefined ? dto.permissionSetId : current.permissionSetId ?? null,
        dto.adminManagement !== undefined ? dto.adminManagement : current.adminManagement ?? null,
        dto.gender !== undefined ? dto.gender : current.gender ?? null,
        newPasswordHash ?? current.passwordHash ?? null,
        dto.isSuperAdmin !== undefined ? dto.isSuperAdmin : current.isSuperAdmin ?? false,
        dto.active !== undefined ? dto.active : current.active,
        nextMustReset ?? false,
        dto.reportingToRoleIds !== undefined ? dto.reportingToRoleIds : current.reportingToRoleIds ?? [],
        actorEmail ?? null,
      ],
    )) as unknown as [Array<{
      id: string;
      code: string;
      name: string;
      phone: string | null;
      email: string | null;
      role_id: string | null;
      sthan_id: string | null;
      permission_set_id: string | null;
      admin_management: string | null;
      gender: string | null;
      password_hash: string | null;
      is_super_admin: boolean;
      must_reset_password: boolean;
      active: boolean;
      reporting_to_role_ids: string[];
      created_at: string | Date;
      updated_at: string | Date;
      created_by: string | null;
      updated_by: string | null;
    }>, number];
    const r = rows[0][0];
    const updated: UserRecord = {
      id: r.id,
      code: r.code,
      name: r.name,
      phone: r.phone ?? undefined,
      email: r.email ?? undefined,
      roleId: r.role_id ?? undefined,
      sthanId: r.sthan_id ?? undefined,
      permissionSetId: r.permission_set_id ?? undefined,
      adminManagement: r.admin_management ?? undefined,
      gender: r.gender ?? undefined,
      passwordHash: r.password_hash ?? undefined,
      isSuperAdmin: r.is_super_admin,
      mustResetPassword: r.must_reset_password,
      active: r.active,
      reportingToRoleIds: r.reporting_to_role_ids ?? [],
      createdAt: this.ctx.toIsoTimestamp(r.created_at),
      updatedAt: this.ctx.toIsoTimestamp(r.updated_at),
      createdBy: r.created_by ?? undefined,
      updatedBy: r.updated_by ?? undefined,
    };
    this.ctx.users.set(userId, updated);

    await this.ctx.dataSource.query(
      `UPDATE adwest.auth_member_users
       SET full_name=$2, email=$3, phone=$4, password_hash=$5, active=$6, must_reset_password=$7
       WHERE id=$1`,
      [
        userId,
        updated.name,
        updated.email ?? null,
        updated.phone ?? null,
        updated.passwordHash ?? current.passwordHash ?? null,
        updated.active,
        nextMustReset ?? false,
      ],
    );

    return updated;
  }

  async deleteUser(userId: string): Promise<void> {
    if (!this.ctx.users.has(userId)) throw new NotFoundException('User not found');
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (this.ctx.runtimeMode === 'db' && this.ctx.dataSource && UUID_RE.test(userId)) {
      await this.ctx.dataSource.query('DELETE FROM adwest.users WHERE id=$1', [userId]);
    }
    this.ctx.users.delete(userId);
  }

  async changeOwnPassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    if (this.ctx.runtimeMode === 'db' && this.ctx.dataSource) {
      const rows = await this.ctx.dataSource.query(
        `SELECT password_hash, must_reset_password FROM adwest.users WHERE id=$1`,
        [userId],
      ) as Array<{ password_hash: string | null; must_reset_password: boolean }>;
      if (!rows.length || !rows[0].password_hash) throw new NotFoundException('User not found');
      if (!rows[0].must_reset_password && !this.ctx.cryptoService.verifyPassword(currentPassword, rows[0].password_hash)) {
        throw new UnauthorizedException('Current password is incorrect');
      }
      const passwordHash = this.ctx.cryptoService.hashPassword(newPassword);
      await this.ctx.dataSource.query(
        `UPDATE adwest.users SET password_hash=$2, must_reset_password=false, updated_at=now() WHERE id=$1`,
        [userId, passwordHash],
      );
      await this.ctx.dataSource.query(
        `UPDATE adwest.auth_member_users SET password_hash=$2, must_reset_password=false WHERE id=$1`,
        [userId, passwordHash],
      );
      return;
    }

    const current = this.ctx.users.get(userId);
    if (!current) throw new NotFoundException('User not found');
    if (!this.ctx.cryptoService.verifyPassword(currentPassword, current.passwordHash ?? '')) {
      throw new UnauthorizedException('Current password is incorrect');
    }
    const passwordHash = this.ctx.cryptoService.hashPassword(newPassword);
    this.ctx.users.set(userId, { ...current, passwordHash, mustResetPassword: false, updatedAt: new Date().toISOString() });
  }

  private generateUserCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'USR-';
    for (let i = 0; i < 6; i += 1) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  }
}
