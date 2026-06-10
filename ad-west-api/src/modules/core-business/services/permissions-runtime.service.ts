import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CreatePermissionDto, CreatePermissionSetDto, SetPermissionSetItemsDto, UpdatePermissionDto, UpdatePermissionSetDto } from '../dto/core-business.dto';
import type { PermissionRecord, PermissionSetRecord } from '../core-business.service';

export interface PermissionsRuntimeContext {
  permissions: Map<string, PermissionRecord>;
  permissionSets: Map<string, PermissionSetRecord>;
  runtimeMode: 'in-memory' | 'db';
  dataSource?: DataSource;
  newId: (prefix: string) => string;
  toIsoTimestamp: (value: string | Date) => string;
}

export class PermissionsRuntimeService {
  constructor(private readonly ctx: PermissionsRuntimeContext) {}

  listPermissions(): PermissionRecord[] {
    return Array.from(this.ctx.permissions.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  async listPermissionsFromDb(params: { page?: number; pageSize?: number; search?: string; locationId?: string }): Promise<{
    items: PermissionRecord[]; total: number; page: number; pageSize: number; totalPages: number;
  }> {
    const page = Math.max(1, params.page ?? 1);
    const pageSize = Math.min(1000, Math.max(1, params.pageSize ?? 10));
    if (this.ctx.runtimeMode !== 'db' || !this.ctx.dataSource) {
      const q = (params.search ?? '').trim().toLowerCase();
      let all = Array.from(this.ctx.permissions.values());
      if (params.locationId) all = all.filter((p) => p.locationId === params.locationId);
      if (q) all = all.filter((p) => p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q));
      all.sort((a, b) => a.name.localeCompare(b.name));
      const total = all.length;
      return { items: all.slice((page - 1) * pageSize, page * pageSize), total, page, pageSize, totalPages: Math.ceil(total / pageSize) || 1 };
    }
    const searchParam = params.search?.trim() ? `%${params.search.trim()}%` : null;
    const locationParam = params.locationId ?? null;
    const [countRows, dataRows] = await Promise.all([
      this.ctx.dataSource.query(
        `SELECT COUNT(*)::int AS total FROM adwest.permissions WHERE ($1::text IS NULL OR name ILIKE $1 OR code ILIKE $1) AND ($2::text IS NULL OR location_id = $2)`,
        [searchParam, locationParam],
      ),
      this.ctx.dataSource.query(
        `SELECT id, location_id, sreni_id, code, name, description, active, created_at, updated_at, created_by, updated_by FROM adwest.permissions WHERE ($1::text IS NULL OR name ILIKE $1 OR code ILIKE $1) AND ($2::text IS NULL OR location_id = $2) ORDER BY name LIMIT $3 OFFSET $4`,
        [searchParam, locationParam, pageSize, (page - 1) * pageSize],
      ),
    ]);
    const total = (countRows as Array<{ total: number }>)[0].total;
    const items = (dataRows as Array<{
      id: string; location_id: string; sreni_id: string; code: string; name: string;
      description: string | null; active: boolean; created_at: string | Date; updated_at: string | Date;
      created_by: string | null; updated_by: string | null;
    }>).map((r) => ({
      id: r.id, locationId: r.location_id, sreniId: r.sreni_id, code: r.code, name: r.name,
      description: r.description ?? undefined, active: r.active,
      createdAt: this.ctx.toIsoTimestamp(r.created_at), updatedAt: this.ctx.toIsoTimestamp(r.updated_at),
      createdBy: r.created_by ?? undefined, updatedBy: r.updated_by ?? undefined,
    }));
    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) || 1 };
  }

  async createPermission(dto: CreatePermissionDto, actorEmail?: string): Promise<PermissionRecord> {
    const dupPair = Array.from(this.ctx.permissions.values()).find(
      (p) => p.locationId === dto.locationId && p.sreniId === dto.sreniId,
    );
    if (dupPair) throw new BadRequestException('A permission for this location and sreni already exists');

    const dupCode = Array.from(this.ctx.permissions.values()).find((p) => p.code === dto.code);
    if (dupCode) throw new BadRequestException(`Permission code "${dto.code}" already exists`);

    if (this.ctx.runtimeMode !== 'db' || !this.ctx.dataSource) {
      const now = new Date().toISOString();
      const record: PermissionRecord = {
        id: this.ctx.newId('perm'),
        locationId: dto.locationId, sreniId: dto.sreniId,
        code: dto.code, name: dto.name,
        description: dto.description,
        active: true, createdAt: now, updatedAt: now,
        createdBy: actorEmail, updatedBy: actorEmail,
      };
      this.ctx.permissions.set(record.id, record);
      return record;
    }

    const rows = (await this.ctx.dataSource.query(
      `INSERT INTO adwest.permissions (location_id, sreni_id, code, name, description, created_by, updated_by)
       VALUES ($1, $2, $3, $4, $5, $6, $6)
       RETURNING id, location_id, sreni_id, code, name, description, active, created_at, updated_at, created_by, updated_by`,
      [dto.locationId, dto.sreniId, dto.code, dto.name, dto.description ?? null, actorEmail ?? null],
    )) as Array<{ id: string; location_id: string; sreni_id: string; code: string; name: string; description: string | null; active: boolean; created_at: string | Date; updated_at: string | Date; created_by: string | null; updated_by: string | null }>;
    const r = rows[0];
    const record: PermissionRecord = {
      id: r.id, locationId: r.location_id, sreniId: r.sreni_id,
      code: r.code, name: r.name,
      description: r.description ?? undefined,
      active: r.active, createdAt: this.ctx.toIsoTimestamp(r.created_at), updatedAt: this.ctx.toIsoTimestamp(r.updated_at),
      createdBy: r.created_by ?? undefined, updatedBy: r.updated_by ?? undefined,
    };
    this.ctx.permissions.set(record.id, record);
    return record;
  }

  async updatePermission(permId: string, dto: UpdatePermissionDto, actorEmail?: string): Promise<PermissionRecord> {
    if (this.ctx.runtimeMode === 'db' && this.ctx.dataSource && !this.ctx.permissions.has(permId)) {
      const rows = await this.ctx.dataSource.query(
        'SELECT id, location_id, sreni_id, code, name, description, active, created_by, updated_by, created_at, updated_at FROM adwest.permissions WHERE id=$1',
        [permId],
      ) as Array<{ id: string; location_id: string; sreni_id: string; code: string; name: string; description: string | null; active: boolean; created_by: string | null; updated_by: string | null; created_at: string | Date; updated_at: string | Date }>;
      if (!rows.length) throw new NotFoundException('Permission not found');
      const r = rows[0];
      this.ctx.permissions.set(r.id, { id: r.id, locationId: r.location_id, sreniId: r.sreni_id, code: r.code, name: r.name, description: r.description ?? undefined, active: r.active, createdBy: r.created_by ?? undefined, updatedBy: r.updated_by ?? undefined, createdAt: this.ctx.toIsoTimestamp(r.created_at), updatedAt: this.ctx.toIsoTimestamp(r.updated_at) });
    }
    const current = this.ctx.permissions.get(permId);
    if (!current) throw new NotFoundException('Permission not found');

    if (dto.code && dto.code !== current.code) {
      const clash = Array.from(this.ctx.permissions.values()).find((p) => p.code === dto.code && p.id !== permId);
      if (clash) throw new BadRequestException(`Permission code "${dto.code}" already exists`);
    }

    if (this.ctx.runtimeMode !== 'db' || !this.ctx.dataSource) {
      const updated: PermissionRecord = {
        ...current,
        code: dto.code ?? current.code,
        name: dto.name ?? current.name,
        description: dto.description !== undefined ? dto.description : current.description,
        active: dto.active !== undefined ? dto.active : current.active,
        updatedBy: actorEmail, updatedAt: new Date().toISOString(),
      };
      this.ctx.permissions.set(permId, updated);
      return updated;
    }

    const rows = (await this.ctx.dataSource.query(
      `UPDATE adwest.permissions
       SET code=$2, name=$3, description=$4, active=$5, updated_by=$6, updated_at=now()
       WHERE id=$1
       RETURNING id, location_id, sreni_id, code, name, description, active, created_at, updated_at, created_by, updated_by`,
      [permId, dto.code ?? current.code, dto.name ?? current.name,
       dto.description !== undefined ? dto.description : current.description ?? null,
       dto.active !== undefined ? dto.active : current.active, actorEmail ?? null],
    )) as unknown as [Array<{ id: string; location_id: string; sreni_id: string; code: string; name: string; description: string | null; active: boolean; created_at: string | Date; updated_at: string | Date; created_by: string | null; updated_by: string | null }>, number];
    const r = rows[0][0];
    const updated: PermissionRecord = {
      id: r.id, locationId: r.location_id, sreniId: r.sreni_id,
      code: r.code, name: r.name,
      description: r.description ?? undefined,
      active: r.active, createdAt: this.ctx.toIsoTimestamp(r.created_at), updatedAt: this.ctx.toIsoTimestamp(r.updated_at),
      createdBy: r.created_by ?? undefined, updatedBy: r.updated_by ?? undefined,
    };
    this.ctx.permissions.set(permId, updated);
    return updated;
  }

  async deletePermission(permId: string): Promise<void> {
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (this.ctx.runtimeMode === 'db' && this.ctx.dataSource && UUID_RE.test(permId)) {
      const deleted = await this.ctx.dataSource.query('DELETE FROM adwest.permissions WHERE id=$1 RETURNING id', [permId]) as Array<{ id: string }>;
      if (!deleted.length) throw new NotFoundException('Permission not found');
      this.ctx.permissions.delete(permId);
      return;
    }
    if (!this.ctx.permissions.has(permId)) throw new NotFoundException('Permission not found');
    this.ctx.permissions.delete(permId);
  }

  listPermissionSets(): PermissionSetRecord[] {
    return Array.from(this.ctx.permissionSets.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  async listPermissionSetsFromDb(params: { page?: number; pageSize?: number; search?: string }): Promise<{
    items: PermissionSetRecord[]; total: number; page: number; pageSize: number; totalPages: number;
  }> {
    const page = Math.max(1, params.page ?? 1);
    const pageSize = Math.min(1000, Math.max(1, params.pageSize ?? 10));
    if (this.ctx.runtimeMode !== 'db' || !this.ctx.dataSource) {
      const q = (params.search ?? '').trim().toLowerCase();
      let all = Array.from(this.ctx.permissionSets.values());
      if (q) all = all.filter((s) => s.name.toLowerCase().includes(q) || s.description?.toLowerCase().includes(q));
      all.sort((a, b) => a.name.localeCompare(b.name));
      const total = all.length;
      return { items: all.slice((page - 1) * pageSize, page * pageSize), total, page, pageSize, totalPages: Math.ceil(total / pageSize) || 1 };
    }
    const searchParam = params.search?.trim() ? `%${params.search.trim()}%` : null;
    const [countRows, dataRows] = await Promise.all([
      this.ctx.dataSource.query(
        `SELECT COUNT(*)::int AS total FROM adwest.permission_sets WHERE ($1::text IS NULL OR name ILIKE $1 OR description ILIKE $1)`,
        [searchParam],
      ),
      this.ctx.dataSource.query(
        `SELECT ps.id, ps.name, ps.description, ps.active, ps.created_at, ps.updated_at, ps.created_by, ps.updated_by,
          COALESCE(json_agg(psi.permission_id) FILTER (WHERE psi.permission_id IS NOT NULL), '[]') AS permission_ids
         FROM adwest.permission_sets ps
         LEFT JOIN adwest.permission_set_items psi ON ps.id = psi.permission_set_id
         WHERE ($1::text IS NULL OR ps.name ILIKE $1 OR ps.description ILIKE $1)
         GROUP BY ps.id ORDER BY ps.name LIMIT $2 OFFSET $3`,
        [searchParam, pageSize, (page - 1) * pageSize],
      ),
    ]);
    const total = (countRows as Array<{ total: number }>)[0].total;
    const items = (dataRows as Array<{
      id: string; name: string; description: string | null; active: boolean;
      created_at: string | Date; updated_at: string | Date; created_by: string | null; updated_by: string | null;
      permission_ids: string[];
    }>).map((r) => ({
      id: r.id, name: r.name, description: r.description ?? undefined,
      active: r.active, permissionIds: r.permission_ids ?? [],
      createdAt: this.ctx.toIsoTimestamp(r.created_at), updatedAt: this.ctx.toIsoTimestamp(r.updated_at),
      createdBy: r.created_by ?? undefined, updatedBy: r.updated_by ?? undefined,
    }));
    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) || 1 };
  }

  async createPermissionSet(dto: CreatePermissionSetDto, actorEmail?: string): Promise<PermissionSetRecord> {
    const clash = Array.from(this.ctx.permissionSets.values()).find((s) => s.name === dto.name);
    if (clash) throw new BadRequestException(`Permission set "${dto.name}" already exists`);

    const permIds = dto.permissionIds ?? [];
    for (const pid of permIds) {
      if (!this.ctx.permissions.has(pid)) throw new BadRequestException(`Permission ${pid} not found`);
    }

    if (this.ctx.runtimeMode !== 'db' || !this.ctx.dataSource) {
      const now = new Date().toISOString();
      const record: PermissionSetRecord = {
        id: this.ctx.newId('pset'), name: dto.name, description: dto.description,
        active: true, permissionIds: permIds, createdAt: now, updatedAt: now,
        createdBy: actorEmail, updatedBy: actorEmail,
      };
      this.ctx.permissionSets.set(record.id, record);
      return record;
    }

    const rows = (await this.ctx.dataSource.query(
      `INSERT INTO adwest.permission_sets (name, description, created_by, updated_by)
       VALUES ($1, $2, $3, $3)
       RETURNING id, name, description, active, created_at, updated_at, created_by, updated_by`,
      [dto.name, dto.description ?? null, actorEmail ?? null],
    )) as Array<{ id: string; name: string; description: string | null; active: boolean; created_at: string | Date; updated_at: string | Date; created_by: string | null; updated_by: string | null }>;
    const r = rows[0];

    if (permIds.length > 0) {
      const values = permIds.map((_, i) => `($1, $${i + 2})`).join(', ');
      await this.ctx.dataSource.query(
        `INSERT INTO adwest.permission_set_items (permission_set_id, permission_id) VALUES ${values}`,
        [r.id, ...permIds],
      );
    }

    const record: PermissionSetRecord = {
      id: r.id, name: r.name, description: r.description ?? undefined,
      active: r.active, permissionIds: permIds,
      createdAt: this.ctx.toIsoTimestamp(r.created_at), updatedAt: this.ctx.toIsoTimestamp(r.updated_at),
      createdBy: r.created_by ?? undefined, updatedBy: r.updated_by ?? undefined,
    };
    this.ctx.permissionSets.set(record.id, record);
    return record;
  }

  async updatePermissionSet(setId: string, dto: UpdatePermissionSetDto, actorEmail?: string): Promise<PermissionSetRecord> {
    if (this.ctx.runtimeMode === 'db' && this.ctx.dataSource && !this.ctx.permissionSets.has(setId)) {
      const rows = await this.ctx.dataSource.query(
        `SELECT ps.id, ps.name, ps.description, ps.active, ps.created_by, ps.updated_by, ps.created_at, ps.updated_at,
          COALESCE(json_agg(psi.permission_id) FILTER (WHERE psi.permission_id IS NOT NULL), '[]') AS permission_ids
         FROM adwest.permission_sets ps
         LEFT JOIN adwest.permission_set_items psi ON ps.id = psi.permission_set_id
         WHERE ps.id=$1 GROUP BY ps.id`,
        [setId],
      ) as Array<{ id: string; name: string; description: string | null; active: boolean; created_by: string | null; updated_by: string | null; created_at: string | Date; updated_at: string | Date; permission_ids: string[] }>;
      if (!rows.length) throw new NotFoundException('Permission set not found');
      const r = rows[0];
      this.ctx.permissionSets.set(r.id, { id: r.id, name: r.name, description: r.description ?? undefined, active: r.active, permissionIds: r.permission_ids, createdBy: r.created_by ?? undefined, updatedBy: r.updated_by ?? undefined, createdAt: this.ctx.toIsoTimestamp(r.created_at), updatedAt: this.ctx.toIsoTimestamp(r.updated_at) });
    }
    const current = this.ctx.permissionSets.get(setId);
    if (!current) throw new NotFoundException('Permission set not found');

    if (dto.name && dto.name !== current.name) {
      const clash = Array.from(this.ctx.permissionSets.values()).find((s) => s.name === dto.name && s.id !== setId);
      if (clash) throw new BadRequestException(`Permission set "${dto.name}" already exists`);
    }

    if (this.ctx.runtimeMode !== 'db' || !this.ctx.dataSource) {
      const updated: PermissionSetRecord = {
        ...current,
        name: dto.name ?? current.name,
        description: dto.description !== undefined ? dto.description : current.description,
        active: dto.active !== undefined ? dto.active : current.active,
        updatedBy: actorEmail, updatedAt: new Date().toISOString(),
      };
      this.ctx.permissionSets.set(setId, updated);
      return updated;
    }

    const rows = (await this.ctx.dataSource.query(
      `UPDATE adwest.permission_sets
       SET name=$2, description=$3, active=$4, updated_by=$5, updated_at=now()
       WHERE id=$1
       RETURNING id, name, description, active, created_at, updated_at, created_by, updated_by`,
      [setId, dto.name ?? current.name,
       dto.description !== undefined ? dto.description : current.description ?? null,
       dto.active !== undefined ? dto.active : current.active, actorEmail ?? null],
    )) as unknown as [Array<{ id: string; name: string; description: string | null; active: boolean; created_at: string | Date; updated_at: string | Date; created_by: string | null; updated_by: string | null }>, number];
    const r = rows[0][0];
    const updated: PermissionSetRecord = {
      id: r.id, name: r.name, description: r.description ?? undefined,
      active: r.active, permissionIds: current.permissionIds,
      createdAt: this.ctx.toIsoTimestamp(r.created_at), updatedAt: this.ctx.toIsoTimestamp(r.updated_at),
      createdBy: r.created_by ?? undefined, updatedBy: r.updated_by ?? undefined,
    };
    this.ctx.permissionSets.set(setId, updated);
    return updated;
  }

  async setPermissionSetItems(setId: string, dto: SetPermissionSetItemsDto, actorEmail?: string): Promise<PermissionSetRecord> {
    if (this.ctx.runtimeMode === 'db' && this.ctx.dataSource && !this.ctx.permissionSets.has(setId)) {
      const rows = await this.ctx.dataSource.query('SELECT id, name FROM adwest.permission_sets WHERE id=$1', [setId]) as Array<{ id: string }>;
      if (!rows.length) throw new NotFoundException('Permission set not found');
    }
    const current = this.ctx.permissionSets.get(setId);
    if (!current) throw new NotFoundException('Permission set not found');
    for (const pid of dto.permissionIds) {
      if (!this.ctx.permissions.has(pid)) throw new BadRequestException(`Permission ${pid} not found`);
    }

    if (this.ctx.runtimeMode === 'db' && this.ctx.dataSource) {
      await this.ctx.dataSource.query('DELETE FROM adwest.permission_set_items WHERE permission_set_id=$1', [setId]);
      if (dto.permissionIds.length > 0) {
        const values = dto.permissionIds.map((_, i) => `($1, $${i + 2})`).join(', ');
        await this.ctx.dataSource.query(
          `INSERT INTO adwest.permission_set_items (permission_set_id, permission_id) VALUES ${values}`,
          [setId, ...dto.permissionIds],
        );
      }
      await this.ctx.dataSource.query(
        'UPDATE adwest.permission_sets SET updated_by=$2, updated_at=now() WHERE id=$1',
        [setId, actorEmail ?? null],
      );
    }

    const updated: PermissionSetRecord = { ...current, permissionIds: dto.permissionIds, updatedBy: actorEmail, updatedAt: new Date().toISOString() };
    this.ctx.permissionSets.set(setId, updated);
    return updated;
  }

  async deletePermissionSet(setId: string): Promise<void> {
    if (this.ctx.runtimeMode === 'db' && this.ctx.dataSource && !this.ctx.permissionSets.has(setId)) {
      const deleted = await this.ctx.dataSource.query('DELETE FROM adwest.permission_sets WHERE id=$1 RETURNING id', [setId]) as Array<{ id: string }>;
      if (!deleted.length) throw new NotFoundException('Permission set not found');
      this.ctx.permissionSets.delete(setId);
      return;
    }
    if (!this.ctx.permissionSets.has(setId)) throw new NotFoundException('Permission set not found');
    this.ctx.permissionSets.delete(setId);
  }
}
