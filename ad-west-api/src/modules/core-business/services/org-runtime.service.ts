import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CreateGovernanceAssignmentDto, CreateGovernanceStructureDto, CreateLocationDto, CreateSreniDefinitionDto, CreateSrenyDto, CreateSthanDto, CreateZoneDto, UpdateGovernanceAssignmentDto, UpdateGovernanceStructureDto, UpdateLocationDto, UpdateSreniDefinitionDto, UpdateSrenyDto, UpdateSthanDto, UpdateZoneDto } from '../dto/core-business.dto';
import type { GovernanceAssignmentRecord, GovernanceStructureRecord, LocationRecord, SrenyRecord, SthanRecord, ZoneRecord } from '../core-business.service';
import { HOUSEHOLD_ENUM_TYPES, HouseholdEnumConfigService } from './household-enum-config.service';

export interface OrgRuntimeContext {
  zones: Map<string, ZoneRecord>;
  locations: Map<string, LocationRecord>;
  srenies: Map<string, SrenyRecord>;
  sthans: Map<string, SthanRecord>;
  governanceStructures: Map<string, GovernanceStructureRecord>;
  governanceAssignments: Map<string, GovernanceAssignmentRecord>;
  enumConfig: HouseholdEnumConfigService;
  runtimeMode: 'in-memory' | 'db';
  dataSource?: DataSource;
  newId: (prefix: string) => string;
  toIsoTimestamp: (value: string | Date) => string;
  findZone: (zoneId: string) => ZoneRecord;
  findSreny: (srenyId: string) => SrenyRecord;
  findSthan: (sthanId: string) => SthanRecord;
  findGovernanceStructure: (structureId: string) => GovernanceStructureRecord;
  findGovernanceAssignment: (assignmentId: string) => GovernanceAssignmentRecord;
  validateDateWindow: (startDate: string, endDate?: string) => void;
  clearServiceSrenyForZone: (zoneId: string, excludeSrenyId?: string) => void;
  normalizePositions: (positions: string[]) => string[];
  ensurePositionExists: (structure: GovernanceStructureRecord, positionName: string) => void;
  ensureUserExists: (userId: string) => void;
}

export class OrgRuntimeService {
  constructor(private readonly ctx: OrgRuntimeContext) {}

  private async resolveSreniHouseholdConfig(dto: {
    enrollmentScope?: string;
    primaryContactStrategy?: string;
  }): Promise<{ enrollmentScope: string; primaryContactStrategy: string }> {
    const enrollmentScope = dto.enrollmentScope
      ?? await this.ctx.enumConfig.getDefaultValue(HOUSEHOLD_ENUM_TYPES.ENROLLMENT_SCOPE);
    const primaryContactStrategy = dto.primaryContactStrategy
      ?? await this.ctx.enumConfig.getDefaultValue(HOUSEHOLD_ENUM_TYPES.PRIMARY_CONTACT_STRATEGY);
    if (dto.enrollmentScope) {
      await this.ctx.enumConfig.validate(HOUSEHOLD_ENUM_TYPES.ENROLLMENT_SCOPE, dto.enrollmentScope, 'Enrollment scope');
    }
    if (dto.primaryContactStrategy) {
      await this.ctx.enumConfig.validate(
        HOUSEHOLD_ENUM_TYPES.PRIMARY_CONTACT_STRATEGY,
        dto.primaryContactStrategy,
        'Primary contact strategy',
      );
    }
    return { enrollmentScope, primaryContactStrategy };
  }

  private mapSreniDefinitionRow(r: {
    id: string; name: string; description: string | null; code: string | null; active: boolean;
    is_service_sreny: boolean; join_us_visible: boolean; show_in_upload_excel?: boolean;
    gada_assignment_enabled?: boolean;
    enrollment_scope?: string | null; primary_contact_strategy?: string | null;
    created_by: string | null; updated_by: string | null;
    created_at: string | Date; updated_at: string | Date;
  }): SrenyRecord {
    return {
      id: r.id,
      name: r.name,
      description: r.description ?? undefined,
      code: r.code ?? undefined,
      active: r.active,
      isServiceSreny: r.is_service_sreny,
      joinUsVisible: r.join_us_visible,
      showInUploadExcel: r.show_in_upload_excel ?? false,
      gadaAssignmentEnabled: r.gada_assignment_enabled ?? true,
      enrollmentScope: r.enrollment_scope ?? undefined,
      primaryContactStrategy: r.primary_contact_strategy ?? undefined,
      createdBy: r.created_by ?? undefined,
      updatedBy: r.updated_by ?? undefined,
      createdAt: this.ctx.toIsoTimestamp(r.created_at),
      updatedAt: this.ctx.toIsoTimestamp(r.updated_at),
    };
  }

  listZones(): ZoneRecord[] {
    return Array.from(this.ctx.zones.values());
  }

  async createZone(dto: CreateZoneDto): Promise<ZoneRecord> {
    if (this.ctx.runtimeMode !== 'db' || !this.ctx.dataSource) {
      const now = new Date().toISOString();
      const zone: ZoneRecord = {
        id: this.ctx.newId('zone'),
        name: dto.name,
        code: dto.code,
        createdAt: now,
        updatedAt: now,
      };
      this.ctx.zones.set(zone.id, zone);
      return zone;
    }

    const rows = (await this.ctx.dataSource.query(
      `INSERT INTO adwest.zones (name, code)
       VALUES ($1, $2)
       RETURNING id, code, name, created_at, updated_at`,
      [dto.name, dto.code ?? null],
    )) as Array<{ id: string; code?: string; name: string; created_at: string | Date; updated_at: string | Date }>;
    const row = rows[0];
    const zone: ZoneRecord = {
      id: row.id,
      name: row.name,
      code: row.code ?? undefined,
      createdAt: this.ctx.toIsoTimestamp(row.created_at),
      updatedAt: this.ctx.toIsoTimestamp(row.updated_at),
    };
    this.ctx.zones.set(zone.id, zone);
    return zone;
  }

  async updateZone(zoneId: string, dto: UpdateZoneDto): Promise<ZoneRecord> {
    const zone = this.ctx.findZone(zoneId);

    if (this.ctx.runtimeMode !== 'db' || !this.ctx.dataSource) {
      const updated: ZoneRecord = {
        ...zone,
        name: dto.name ?? zone.name,
        code: dto.code !== undefined ? dto.code : zone.code,
        updatedAt: new Date().toISOString(),
      };
      this.ctx.zones.set(zoneId, updated);
      return updated;
    }

    const nextName = dto.name ?? zone.name;
    const nextCode = dto.code !== undefined ? dto.code : zone.code ?? null;
    const rows = (await this.ctx.dataSource.query(
      `UPDATE adwest.zones
       SET name = $2, code = $3, updated_at = now()
       WHERE id = $1
       RETURNING id, name, code, created_at, updated_at`,
      [zoneId, nextName, nextCode],
    )) as unknown as [Array<{ id: string; name: string; code: string | null; created_at: string | Date; updated_at: string | Date }>, number];
    const row = rows[0][0];
    const updated: ZoneRecord = {
      id: row.id,
      name: row.name,
      code: row.code ?? undefined,
      createdAt: this.ctx.toIsoTimestamp(row.created_at),
      updatedAt: this.ctx.toIsoTimestamp(row.updated_at),
    };
    this.ctx.zones.set(zoneId, updated);
    return updated;
  }

  async listLocationsFromDb(params: { page?: number; pageSize?: number; search?: string; level?: string }): Promise<{
    items: LocationRecord[]; total: number; page: number; pageSize: number; totalPages: number;
  }> {
    const page = Math.max(1, params.page ?? 1);
    const pageSize = Math.min(1000, Math.max(1, params.pageSize ?? 10));
    if (this.ctx.runtimeMode !== 'db' || !this.ctx.dataSource) {
      const q = (params.search ?? '').trim().toLowerCase();
      let all = Array.from(this.ctx.locations.values());
      if (params.level) all = all.filter((l) => l.level === params.level);
      if (q) all = all.filter((l) => l.name.toLowerCase().includes(q) || l.code?.toLowerCase().includes(q));
      all.sort((a, b) => a.name.localeCompare(b.name));
      const total = all.length;
      return { items: all.slice((page - 1) * pageSize, page * pageSize), total, page, pageSize, totalPages: Math.ceil(total / pageSize) || 1 };
    }
    const searchParam = params.search?.trim() ? `%${params.search.trim()}%` : null;
    const levelParam = params.level ?? null;
    const [countRows, dataRows] = await Promise.all([
      this.ctx.dataSource.query(
        `SELECT COUNT(*)::int AS total FROM adwest.locations WHERE ($1::text IS NULL OR name ILIKE $1 OR code ILIKE $1) AND ($2::text IS NULL OR level = $2)`,
        [searchParam, levelParam],
      ),
      this.ctx.dataSource.query(
        `SELECT id, code, name, level, parent_id, active, created_at, updated_at FROM adwest.locations WHERE ($1::text IS NULL OR name ILIKE $1 OR code ILIKE $1) AND ($2::text IS NULL OR level = $2) ORDER BY name LIMIT $3 OFFSET $4`,
        [searchParam, levelParam, pageSize, (page - 1) * pageSize],
      ),
    ]);
    const total = (countRows as Array<{ total: number }>)[0].total;
    const items = (dataRows as Array<{ id: string; code: string | null; name: string; level: string; parent_id: string | null; active: boolean; created_at: string | Date; updated_at: string | Date }>).map((r) => ({
      id: r.id, code: r.code ?? undefined, name: r.name, level: r.level as 'zone' | 'sthan' | 'division',
      parentId: r.parent_id ?? undefined, active: r.active,
      createdAt: this.ctx.toIsoTimestamp(r.created_at), updatedAt: this.ctx.toIsoTimestamp(r.updated_at),
    }));
    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) || 1 };
  }

  async createLocation(dto: CreateLocationDto): Promise<LocationRecord> {
    if (this.ctx.runtimeMode !== 'db' || !this.ctx.dataSource) {
      const now = new Date().toISOString();
      const record: LocationRecord = {
        id: this.ctx.newId('location'),
        code: dto.code,
        name: dto.name,
        level: dto.level,
        parentId: dto.parentId ?? undefined,
        active: true,
        createdAt: now,
        updatedAt: now,
      };
      this.ctx.locations.set(record.id, record);
      return record;
    }

    const rows = (await this.ctx.dataSource.query(
      `INSERT INTO adwest.locations (code, name, level, parent_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id, code, name, level, parent_id, active, created_at, updated_at`,
      [dto.code ?? null, dto.name, dto.level, dto.parentId ?? null],
    )) as Array<{ id: string; code: string | null; name: string; level: string; parent_id: string | null; active: boolean; created_at: string | Date; updated_at: string | Date }>;
    const row = rows[0];
    const record: LocationRecord = {
      id: row.id,
      code: row.code ?? undefined,
      name: row.name,
      level: row.level as 'zone' | 'sthan' | 'division',
      parentId: row.parent_id ?? undefined,
      active: row.active,
      createdAt: this.ctx.toIsoTimestamp(row.created_at),
      updatedAt: this.ctx.toIsoTimestamp(row.updated_at),
    };
    this.ctx.locations.set(record.id, record);

    // Auto-create sidebar menu for new STHAN locations under the shared "Sthans" parent.
    if (record.level === 'sthan') {
      const menuNow = new Date().toISOString();
      // Ensure "Sthans" root parent exists
      await this.ctx.dataSource.query(
        `INSERT INTO adwest.menu_items (id, key, label, parent_key, icon, sort_order, active, created_at, updated_at)
         VALUES (gen_random_uuid()::text, 'sthans', 'Sthans', null, '📍', 1500, true, $1, $1)
         ON CONFLICT (key) DO UPDATE SET label = 'Sthans', parent_key = NULL, icon = '📍', sort_order = 1500, active = true`,
        [menuNow],
      );
      // Add this sthan as a child of "sthans" — tabs (Reports/Expenses/Contacts) are rendered in the UI
      await this.ctx.dataSource.query(
        `INSERT INTO adwest.menu_items (id, key, label, parent_key, icon, sort_order, active, created_at, updated_at)
         VALUES (gen_random_uuid()::text, $1, $2, 'sthans', null, 0, true, $3, $3)
         ON CONFLICT (key) DO UPDATE SET label = $2, parent_key = 'sthans', active = true`,
        [`sthan-${record.id}`, record.name, menuNow],
      );
    }

    return record;
  }

  async updateLocation(locationId: string, dto: UpdateLocationDto): Promise<LocationRecord> {
    if (this.ctx.runtimeMode === 'db' && this.ctx.dataSource && !this.ctx.locations.has(locationId)) {
      const rows = await this.ctx.dataSource.query(
        'SELECT id, code, name, level, parent_id, active, created_at, updated_at FROM adwest.locations WHERE id=$1',
        [locationId],
      ) as Array<{ id: string; code: string | null; name: string; level: string; parent_id: string | null; active: boolean; created_at: string | Date; updated_at: string | Date }>;
      if (!rows.length) throw new NotFoundException('Location not found');
      const r = rows[0];
      this.ctx.locations.set(r.id, { id: r.id, code: r.code ?? undefined, name: r.name, level: r.level as 'zone' | 'sthan' | 'division', parentId: r.parent_id ?? undefined, active: r.active, createdAt: this.ctx.toIsoTimestamp(r.created_at), updatedAt: this.ctx.toIsoTimestamp(r.updated_at) });
    }
    const current = this.ctx.locations.get(locationId);
    if (!current) {
      throw new NotFoundException('Location not found');
    }

    if (this.ctx.runtimeMode !== 'db' || !this.ctx.dataSource) {
      const updated: LocationRecord = {
        ...current,
        name: dto.name ?? current.name,
        code: dto.code !== undefined ? dto.code : current.code,
        active: dto.active !== undefined ? dto.active : current.active,
        level: dto.level ?? current.level,
        parentId: dto.parentId !== undefined ? (dto.parentId ?? undefined) : current.parentId,
        updatedAt: new Date().toISOString(),
      };
      this.ctx.locations.set(locationId, updated);
      return updated;
    }

    const nextName = dto.name ?? current.name;
    const nextCode = dto.code !== undefined ? dto.code : current.code ?? null;
    const nextActive = dto.active !== undefined ? dto.active : current.active;
    const nextLevel = dto.level ?? current.level;
    const nextParentId = dto.parentId !== undefined ? (dto.parentId ?? null) : (current.parentId ?? null);
    const rows = (await this.ctx.dataSource.query(
      `UPDATE adwest.locations
       SET name = $2, code = $3, active = $4, level = $5, parent_id = $6, updated_at = now()
       WHERE id = $1
       RETURNING id, code, name, level, parent_id, active, created_at, updated_at`,
      [locationId, nextName, nextCode, nextActive, nextLevel, nextParentId],
    )) as unknown as [Array<{ id: string; code: string | null; name: string; level: string; parent_id: string | null; active: boolean; created_at: string | Date; updated_at: string | Date }>, number];
    const row = rows[0][0];
    const updated: LocationRecord = {
      id: row.id,
      code: row.code ?? undefined,
      name: row.name,
      level: row.level as 'zone' | 'sthan' | 'division',
      parentId: row.parent_id ?? undefined,
      active: row.active,
      createdAt: this.ctx.toIsoTimestamp(row.created_at),
      updatedAt: this.ctx.toIsoTimestamp(row.updated_at),
    };
    this.ctx.locations.set(locationId, updated);
    return updated;
  }

  async deleteLocation(locationId: string): Promise<void> {
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (this.ctx.runtimeMode === 'db' && this.ctx.dataSource && UUID_RE.test(locationId)) {
      const deleted = await this.ctx.dataSource.query('DELETE FROM adwest.locations WHERE id=$1 RETURNING id', [locationId]) as Array<{ id: string }>;
      if (!deleted.length) throw new NotFoundException('Location not found');
      this.ctx.locations.delete(locationId);
      return;
    }
    if (!this.ctx.locations.has(locationId)) throw new NotFoundException('Location not found');
    this.ctx.locations.delete(locationId);
  }

  listSrenies(zoneId?: string): SrenyRecord[] {
    const all = Array.from(this.ctx.srenies.values());
    return zoneId ? all.filter((item) => item.zoneId === zoneId) : all;
  }

  async createSreny(dto: CreateSrenyDto): Promise<SrenyRecord> {
    this.ctx.findZone(dto.zoneId);

    if (this.ctx.runtimeMode !== 'db' || !this.ctx.dataSource) {
      const now = new Date().toISOString();
      if (dto.isServiceSreny) {
        this.ctx.clearServiceSrenyForZone(dto.zoneId);
      }
      const record: SrenyRecord = {
        id: this.ctx.newId('sreny'),
        name: dto.name,
        zoneId: dto.zoneId,
        isServiceSreny: dto.isServiceSreny ?? false,
        joinUsVisible: false,
        active: true,
        createdAt: now,
        updatedAt: now,
      };
      this.ctx.srenies.set(record.id, record);
      return record;
    }

    const rows = (await this.ctx.dataSource.query(
      `INSERT INTO adwest.srenies (zone_id, name, is_service_sreny)
       VALUES ($1, $2, $3)
       RETURNING id, zone_id, name, is_service_sreny, join_us_visible, active, created_at, updated_at`,
      [dto.zoneId, dto.name, dto.isServiceSreny ?? false],
    )) as Array<{ id: string; zone_id: string; name: string; is_service_sreny: boolean; join_us_visible: boolean; active: boolean; created_at: string | Date; updated_at: string | Date }>;
    const row = rows[0];
    const record: SrenyRecord = {
      id: row.id,
      name: row.name,
      zoneId: row.zone_id,
      isServiceSreny: row.is_service_sreny,
      joinUsVisible: row.join_us_visible,
      active: row.active,
      createdAt: this.ctx.toIsoTimestamp(row.created_at),
      updatedAt: this.ctx.toIsoTimestamp(row.updated_at),
    };
    this.ctx.srenies.set(record.id, record);

    if (record.isServiceSreny) {
      await this.ctx.dataSource.query(
        `UPDATE adwest.srenies
         SET is_service_sreny = false,
             updated_at = now()
         WHERE zone_id = $1
           AND id <> $2
           AND is_service_sreny = true`,
        [dto.zoneId, record.id],
      );
    }

    return record;
  }

  async updateSreny(srenyId: string, dto: UpdateSrenyDto): Promise<SrenyRecord> {
    const current = this.ctx.findSreny(srenyId);
    const nextZoneId = dto.zoneId ?? current.zoneId;

    if (dto.zoneId) {
      this.ctx.findZone(dto.zoneId);
    }

    const nextServiceDesignation = dto.isServiceSreny ?? current.isServiceSreny;

    if (this.ctx.runtimeMode !== 'db' || !this.ctx.dataSource) {
      if (nextServiceDesignation && nextZoneId) {
        this.ctx.clearServiceSrenyForZone(nextZoneId, srenyId);
      }
      const updated: SrenyRecord = {
        ...current,
        ...dto,
        zoneId: nextZoneId,
        isServiceSreny: nextServiceDesignation,
        updatedAt: new Date().toISOString(),
      };
      this.ctx.srenies.set(srenyId, updated);
      return updated;
    }

    const nextName = dto.name ?? current.name;
    const rows = (await this.ctx.dataSource.query(
      `UPDATE adwest.srenies
       SET name = $2,
           zone_id = $3,
           is_service_sreny = $4,
           updated_at = now()
       WHERE id = $1
       RETURNING id, zone_id, name, description, code, active, is_service_sreny, created_by, updated_by, created_at, updated_at`,
      [srenyId, nextName, nextZoneId ?? null, nextServiceDesignation],
    )) as unknown as [Array<{
      id: string;
      zone_id: string | null;
      name: string;
      description: string | null;
      code: string | null;
      active: boolean;
      is_service_sreny: boolean;
      created_by: string | null;
      updated_by: string | null;
      created_at: string | Date;
      updated_at: string | Date;
    }>, number];
    const row = rows[0][0];
    const updated: SrenyRecord = {
      id: row.id,
      name: row.name,
      zoneId: row.zone_id ?? undefined,
      description: row.description ?? undefined,
      code: row.code ?? undefined,
      active: row.active,
      isServiceSreny: row.is_service_sreny,
      joinUsVisible: current.joinUsVisible,
      createdBy: row.created_by ?? undefined,
      updatedBy: row.updated_by ?? undefined,
      createdAt: this.ctx.toIsoTimestamp(row.created_at),
      updatedAt: this.ctx.toIsoTimestamp(row.updated_at),
    };
    this.ctx.srenies.set(srenyId, updated);

    if (nextServiceDesignation) {
      await this.ctx.dataSource.query(
        `UPDATE adwest.srenies
         SET is_service_sreny = false,
             updated_at = now()
         WHERE zone_id = $1
           AND id <> $2
           AND is_service_sreny = true`,
        [nextZoneId, srenyId],
      );
    }

    return updated;
  }

  listSreniDefinitions(): SrenyRecord[] {
    return Array.from(this.ctx.srenies.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  async listSreniDefinitionsFromDb(params: { page?: number; pageSize?: number; search?: string }): Promise<{
    items: SrenyRecord[]; total: number; page: number; pageSize: number; totalPages: number;
  }> {
    const page = Math.max(1, params.page ?? 1);
    const pageSize = Math.min(1000, Math.max(1, params.pageSize ?? 10));
    if (this.ctx.runtimeMode !== 'db' || !this.ctx.dataSource) {
      const q = (params.search ?? '').trim().toLowerCase();
      let all = Array.from(this.ctx.srenies.values()).filter((s) => !s.zoneId);
      if (q) all = all.filter((s) => s.name.toLowerCase().includes(q) || s.code?.toLowerCase().includes(q) || s.description?.toLowerCase().includes(q));
      all.sort((a, b) => a.name.localeCompare(b.name));
      const total = all.length;
      return { items: all.slice((page - 1) * pageSize, page * pageSize), total, page, pageSize, totalPages: Math.ceil(total / pageSize) || 1 };
    }
    const searchParam = params.search?.trim() ? `%${params.search.trim()}%` : null;
    const [countRows, dataRows] = await Promise.all([
      this.ctx.dataSource.query(
        `SELECT COUNT(*)::int AS total FROM adwest.srenies WHERE zone_id IS NULL AND ($1::text IS NULL OR name ILIKE $1 OR code ILIKE $1 OR description ILIKE $1)`,
        [searchParam],
      ),
      this.ctx.dataSource.query(
        `SELECT id, name, description, code, active, is_service_sreny, join_us_visible, show_in_upload_excel,
                gada_assignment_enabled, enrollment_scope, primary_contact_strategy,
                created_by, updated_by, created_at, updated_at
         FROM adwest.srenies
         WHERE zone_id IS NULL AND ($1::text IS NULL OR name ILIKE $1 OR code ILIKE $1 OR description ILIKE $1)
         ORDER BY name LIMIT $2 OFFSET $3`,
        [searchParam, pageSize, (page - 1) * pageSize],
      ),
    ]);
    const total = (countRows as Array<{ total: number }>)[0].total;
    const items = (dataRows as Array<{
      id: string; name: string; description: string | null; code: string | null; active: boolean;
      is_service_sreny: boolean; join_us_visible: boolean;
      enrollment_scope: string | null; primary_contact_strategy: string | null;
      created_by: string | null; updated_by: string | null;
      created_at: string | Date; updated_at: string | Date;
    }>).map((r) => this.mapSreniDefinitionRow(r));
    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) || 1 };
  }

  async createSreniDefinition(dto: CreateSreniDefinitionDto, actorEmail?: string): Promise<SrenyRecord> {
    const householdConfig = await this.resolveSreniHouseholdConfig(dto);

    if (this.ctx.runtimeMode !== 'db' || !this.ctx.dataSource) {
      const now = new Date().toISOString();
      const record: SrenyRecord = {
        id: this.ctx.newId('sreny'),
        name: dto.name,
        code: dto.code,
        description: dto.description,
        isServiceSreny: false,
        joinUsVisible: dto.joinUsVisible ?? false,
        showInUploadExcel: dto.showInUploadExcel ?? false,
        gadaAssignmentEnabled: dto.gadaAssignmentEnabled ?? true,
        enrollmentScope: householdConfig.enrollmentScope,
        primaryContactStrategy: householdConfig.primaryContactStrategy,
        active: true,
        createdBy: actorEmail,
        updatedBy: actorEmail,
        createdAt: now,
        updatedAt: now,
      };
      this.ctx.srenies.set(record.id, record);
      return record;
    }

    const rows = (await this.ctx.dataSource.query(
      `INSERT INTO adwest.srenies (
         name, code, description, is_service_sreny, join_us_visible, show_in_upload_excel,
         gada_assignment_enabled, active,
         enrollment_scope, primary_contact_strategy, created_by, updated_by
       )
       VALUES ($1, $2, $3, false, $4, $5, $6, true, $7, $8, $9, $9)
       RETURNING id, name, description, code, active, is_service_sreny, join_us_visible, show_in_upload_excel,
                 gada_assignment_enabled, enrollment_scope, primary_contact_strategy, created_by, updated_by, created_at, updated_at`,
      [
        dto.name,
        dto.code ?? null,
        dto.description ?? null,
        dto.joinUsVisible ?? false,
        dto.showInUploadExcel ?? false,
        dto.gadaAssignmentEnabled ?? true,
        householdConfig.enrollmentScope,
        householdConfig.primaryContactStrategy,
        actorEmail ?? null,
      ],
    )) as Array<{
      id: string;
      name: string;
      description: string | null;
      code: string | null;
      active: boolean;
      is_service_sreny: boolean;
      join_us_visible: boolean;
      show_in_upload_excel: boolean;
      enrollment_scope: string | null;
      primary_contact_strategy: string | null;
      created_by: string | null;
      updated_by: string | null;
      created_at: string | Date;
      updated_at: string | Date;
    }>;
    const record = this.mapSreniDefinitionRow(rows[0]);
    this.ctx.srenies.set(record.id, record);

    const menuNow = new Date().toISOString();
    await this.ctx.dataSource.query(
      `INSERT INTO adwest.menu_items (id, key, label, parent_key, icon, sort_order, active, created_at, updated_at)
       VALUES (gen_random_uuid()::text, $1, $2, null, '🏘️', 1000, true, $3, $3)
       ON CONFLICT (key) DO NOTHING`,
      [`sreni-${record.id}`, record.name, menuNow],
    );
    await this.ctx.dataSource.query(
      `INSERT INTO adwest.menu_items (id, key, label, parent_key, icon, sort_order, active, created_at, updated_at)
       VALUES (gen_random_uuid()::text, $1, 'Calendar', $2, '📅', 10, true, $3, $3)
       ON CONFLICT (key) DO NOTHING`,
      [`sreni-${record.id}-calendar`, `sreni-${record.id}`, menuNow],
    );
    await this.ctx.dataSource.query(
      `INSERT INTO adwest.menu_items (id, key, label, parent_key, icon, sort_order, active, created_at, updated_at)
       VALUES (gen_random_uuid()::text, $1, 'Contacts', $2, '📋', 20, true, $3, $3)
       ON CONFLICT (key) DO NOTHING`,
      [`sreni-${record.id}-contacts`, `sreni-${record.id}`, menuNow],
    );
    await this.ctx.dataSource.query(
      `INSERT INTO adwest.menu_items (id, key, label, parent_key, icon, sort_order, active, created_at, updated_at)
       VALUES (gen_random_uuid()::text, $1, 'Attendance', $2, '✅', 30, true, $3, $3)
       ON CONFLICT (key) DO NOTHING`,
      [`sreni-${record.id}-attendance`, `sreni-${record.id}`, menuNow],
    );
    await this.ctx.dataSource.query(
      `INSERT INTO adwest.menu_items (id, key, label, parent_key, icon, sort_order, active, created_at, updated_at)
       VALUES (gen_random_uuid()::text, $1, 'Documents', $2, '📁', 40, true, $3, $3)
       ON CONFLICT (key) DO NOTHING`,
      [`sreni-${record.id}-documents`, `sreni-${record.id}`, menuNow],
    );
    await this.ctx.dataSource.query(
      `INSERT INTO adwest.menu_items (id, key, label, parent_key, icon, sort_order, active, created_at, updated_at)
       VALUES (gen_random_uuid()::text, $1, 'Reports', $2, '📊', 50, true, $3, $3)
       ON CONFLICT (key) DO NOTHING`,
      [`sreni-${record.id}-reports`, `sreni-${record.id}`, menuNow],
    );
    await this.ctx.dataSource.query(
      `INSERT INTO adwest.menu_items (id, key, label, parent_key, icon, sort_order, active, created_at, updated_at)
       VALUES (gen_random_uuid()::text, $1, 'Analytics Studio', $2, '📈', 60, true, $3, $3)
       ON CONFLICT (key) DO NOTHING`,
      [`sreni-${record.id}-analytics`, `sreni-${record.id}`, menuNow],
    );
    return record;
  }

  async updateSreniDefinition(sreniId: string, dto: UpdateSreniDefinitionDto, actorEmail?: string): Promise<SrenyRecord> {
    if (this.ctx.runtimeMode === 'db' && this.ctx.dataSource && !this.ctx.srenies.has(sreniId)) {
      const rows = await this.ctx.dataSource.query(
        `SELECT id, name, code, description, active, is_service_sreny, join_us_visible, show_in_upload_excel,
                enrollment_scope, primary_contact_strategy, created_by, updated_by, created_at, updated_at
         FROM adwest.srenies WHERE id=$1`,
        [sreniId],
      ) as Array<{
        id: string; name: string; code: string | null; description: string | null; active: boolean;
        is_service_sreny: boolean; join_us_visible: boolean; show_in_upload_excel: boolean;
        enrollment_scope: string | null; primary_contact_strategy: string | null;
        created_by: string | null; updated_by: string | null;
        created_at: string | Date; updated_at: string | Date;
      }>;
      if (!rows.length) throw new NotFoundException('Sreni not found');
      this.ctx.srenies.set(rows[0].id, this.mapSreniDefinitionRow(rows[0]));
    }
    const current = this.ctx.srenies.get(sreniId);
    if (!current) throw new NotFoundException('Sreni not found');

    if (dto.enrollmentScope) {
      await this.ctx.enumConfig.validate(HOUSEHOLD_ENUM_TYPES.ENROLLMENT_SCOPE, dto.enrollmentScope, 'Enrollment scope');
    }
    if (dto.primaryContactStrategy) {
      await this.ctx.enumConfig.validate(
        HOUSEHOLD_ENUM_TYPES.PRIMARY_CONTACT_STRATEGY,
        dto.primaryContactStrategy,
        'Primary contact strategy',
      );
    }

    if (this.ctx.runtimeMode !== 'db' || !this.ctx.dataSource) {
      const updated: SrenyRecord = {
        ...current,
        name: dto.name ?? current.name,
        code: dto.code !== undefined ? dto.code : current.code,
        description: dto.description !== undefined ? dto.description : current.description,
        active: dto.active !== undefined ? dto.active : current.active,
        joinUsVisible: dto.joinUsVisible !== undefined ? dto.joinUsVisible : current.joinUsVisible,
        showInUploadExcel: dto.showInUploadExcel !== undefined ? dto.showInUploadExcel : current.showInUploadExcel,
        gadaAssignmentEnabled: dto.gadaAssignmentEnabled !== undefined ? dto.gadaAssignmentEnabled : current.gadaAssignmentEnabled,
        enrollmentScope: dto.enrollmentScope ?? current.enrollmentScope,
        primaryContactStrategy: dto.primaryContactStrategy ?? current.primaryContactStrategy,
        updatedBy: actorEmail ?? current.updatedBy,
        updatedAt: new Date().toISOString(),
      };
      this.ctx.srenies.set(sreniId, updated);
      return updated;
    }

    const nextName = dto.name ?? current.name;
    const nextCode = dto.code !== undefined ? dto.code : current.code ?? null;
    const nextDescription = dto.description !== undefined ? dto.description : current.description ?? null;
    const nextActive = dto.active !== undefined ? dto.active : current.active;
    const nextJoinUsVisible = dto.joinUsVisible !== undefined ? dto.joinUsVisible : current.joinUsVisible;
    const nextShowInUploadExcel = dto.showInUploadExcel !== undefined ? dto.showInUploadExcel : current.showInUploadExcel ?? false;
    const nextGadaAssignmentEnabled = dto.gadaAssignmentEnabled !== undefined
      ? dto.gadaAssignmentEnabled
      : current.gadaAssignmentEnabled ?? true;
    const nextEnrollmentScope = dto.enrollmentScope ?? current.enrollmentScope ?? null;
    const nextPrimaryContactStrategy = dto.primaryContactStrategy ?? current.primaryContactStrategy ?? null;

    const rows = (await this.ctx.dataSource.query(
      `UPDATE adwest.srenies
       SET name        = $2,
           code        = $3,
           description = $4,
           active      = $5,
           join_us_visible = $6,
           show_in_upload_excel = $7,
           gada_assignment_enabled = $8,
           enrollment_scope = $9,
           primary_contact_strategy = $10,
           updated_by  = $11,
           updated_at  = now()
       WHERE id = $1
       RETURNING id, name, description, code, active, is_service_sreny, join_us_visible, show_in_upload_excel,
                 gada_assignment_enabled, enrollment_scope, primary_contact_strategy, created_by, updated_by, created_at, updated_at`,
      [
        sreniId,
        nextName,
        nextCode,
        nextDescription,
        nextActive,
        nextJoinUsVisible,
        nextShowInUploadExcel,
        nextGadaAssignmentEnabled,
        nextEnrollmentScope,
        nextPrimaryContactStrategy,
        actorEmail ?? null,
      ],
    )) as unknown as [Array<{
      id: string; name: string; description: string | null; code: string | null; active: boolean;
      is_service_sreny: boolean; join_us_visible: boolean; show_in_upload_excel: boolean;
      enrollment_scope: string | null; primary_contact_strategy: string | null;
      created_by: string | null; updated_by: string | null;
      created_at: string | Date; updated_at: string | Date;
    }>, number];
    const updated: SrenyRecord = {
      ...this.mapSreniDefinitionRow(rows[0][0]),
      zoneId: current.zoneId,
    };
    this.ctx.srenies.set(sreniId, updated);

    const menuNow = new Date().toISOString();
    await this.ctx.dataSource.query(
      `UPDATE adwest.menu_items SET label = $2, active = $3, updated_at = $4 WHERE key = $1`,
      [`sreni-${sreniId}`, updated.name, updated.active, menuNow],
    );
    await this.ctx.dataSource.query(
      `UPDATE adwest.menu_items SET active = $2, updated_at = $3 WHERE parent_key = $1`,
      [`sreni-${sreniId}`, updated.active, menuNow],
    );

    return updated;
  }

  async deleteSreniDefinition(sreniId: string): Promise<void> {
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (this.ctx.runtimeMode === 'db' && this.ctx.dataSource && UUID_RE.test(sreniId)) {
      await this.ctx.dataSource.query(`DELETE FROM adwest.menu_items WHERE key=$1 OR parent_key=$1`, [`sreni-${sreniId}`]);
      const deleted = await this.ctx.dataSource.query('DELETE FROM adwest.srenies WHERE id=$1 RETURNING id', [sreniId]) as Array<{ id: string }>;
      if (!deleted.length) throw new NotFoundException('Sreni not found');
      this.ctx.srenies.delete(sreniId);
      return;
    }
    if (!this.ctx.srenies.has(sreniId)) throw new NotFoundException('Sreni not found');
    this.ctx.srenies.delete(sreniId);
  }

  async listSthans(srenyId?: string): Promise<Array<{ id: string; name: string }>> {
    if (this.ctx.runtimeMode === 'db' && this.ctx.dataSource) {
      const rows = await this.ctx.dataSource.query(
        `SELECT id, name FROM adwest.locations WHERE level = 'sthan' AND active = true ORDER BY name ASC`,
      ) as Array<{ id: string; name: string }>;
      return rows;
    }
    const all = Array.from(this.ctx.sthans.values());
    const filtered = srenyId ? all.filter((item) => item.srenyId === srenyId) : all;
    return filtered.map((s) => ({ id: s.id, name: s.name }));
  }

  createSthan(dto: CreateSthanDto): SthanRecord {
    this.ctx.findSreny(dto.srenyId);
    const now = new Date().toISOString();
    const record: SthanRecord = {
      id: this.ctx.newId('sthan'),
      name: dto.name,
      srenyId: dto.srenyId,
      phaseStatus: 'phase1_partial',
      fullIndependenceAvailable: false,
      pendingFeatureMessage:
        'Sthan independent governance is planned for a future phase and is not available in the current release.',
      createdAt: now,
      updatedAt: now,
    };
    this.ctx.sthans.set(record.id, record);
    return record;
  }

  updateSthan(sthanId: string, dto: UpdateSthanDto): SthanRecord {
    if (dto.srenyId) {
      this.ctx.findSreny(dto.srenyId);
    }

    const current = this.ctx.findSthan(sthanId);
    const updated: SthanRecord = {
      ...current,
      ...dto,
      updatedAt: new Date().toISOString(),
    };
    this.ctx.sthans.set(sthanId, updated);
    return updated;
  }

  listGovernanceStructures(srenyId: string): GovernanceStructureRecord[] {
    this.ctx.findSreny(srenyId);
    return Array.from(this.ctx.governanceStructures.values())
      .filter((item) => item.srenyId === srenyId)
      .sort((a, b) => b.year - a.year);
  }

  createGovernanceStructure(srenyId: string, dto: CreateGovernanceStructureDto): GovernanceStructureRecord {
    this.ctx.findSreny(srenyId);
    const positions = this.ctx.normalizePositions(dto.positions);
    const existing = this.listGovernanceStructures(srenyId).find((item) => item.year === dto.year);
    if (existing) {
      throw new BadRequestException('Governance structure for this year already exists for the sreny');
    }
    const now = new Date().toISOString();
    const record: GovernanceStructureRecord = {
      id: this.ctx.newId('govs'),
      srenyId,
      year: dto.year,
      positions,
      archived: false,
      createdAt: now,
      updatedAt: now,
    };
    this.ctx.governanceStructures.set(record.id, record);
    return record;
  }

  updateGovernanceStructure(srenyId: string, structureId: string, dto: UpdateGovernanceStructureDto): GovernanceStructureRecord {
    this.ctx.findSreny(srenyId);
    const structure = this.ctx.findGovernanceStructure(structureId);
    if (structure.srenyId !== srenyId) {
      throw new BadRequestException('Governance structure does not belong to specified sreny');
    }
    if (dto.positions) {
      structure.positions = this.ctx.normalizePositions(dto.positions);
    }
    if (dto.archived !== undefined) {
      structure.archived = dto.archived;
    }
    structure.updatedAt = new Date().toISOString();
    this.ctx.governanceStructures.set(structureId, structure);
    return structure;
  }

  listGovernanceAssignments(structureId: string): GovernanceAssignmentRecord[] {
    this.ctx.findGovernanceStructure(structureId);
    return Array.from(this.ctx.governanceAssignments.values()).filter((item) => item.structureId === structureId);
  }

  createGovernanceAssignment(structureId: string, dto: CreateGovernanceAssignmentDto): GovernanceAssignmentRecord {
    const structure = this.ctx.findGovernanceStructure(structureId);
    this.ctx.ensurePositionExists(structure, dto.positionName);
    this.ctx.ensureUserExists(dto.contactId);
    this.ctx.validateDateWindow(dto.startDate, dto.endDate);
    const now = new Date().toISOString();
    const assignment: GovernanceAssignmentRecord = {
      id: this.ctx.newId('gova'),
      structureId,
      contactId: dto.contactId,
      positionName: dto.positionName.trim(),
      startDate: dto.startDate,
      endDate: dto.endDate,
      archived: false,
      createdAt: now,
      updatedAt: now,
    };
    this.ctx.governanceAssignments.set(assignment.id, assignment);
    return assignment;
  }

  updateGovernanceAssignment(structureId: string, assignmentId: string, dto: UpdateGovernanceAssignmentDto): GovernanceAssignmentRecord {
    const structure = this.ctx.findGovernanceStructure(structureId);
    const assignment = this.ctx.findGovernanceAssignment(assignmentId);
    if (assignment.structureId !== structureId) {
      throw new BadRequestException('Governance assignment does not belong to specified structure');
    }
    const nextPositionName = dto.positionName?.trim() ?? assignment.positionName;
    this.ctx.ensurePositionExists(structure, nextPositionName);
    const nextContactId = dto.contactId ?? assignment.contactId;
    this.ctx.ensureUserExists(nextContactId);
    const nextStartDate = dto.startDate ?? assignment.startDate;
    const nextEndDate = dto.endDate === undefined ? assignment.endDate : dto.endDate;
    this.ctx.validateDateWindow(nextStartDate, nextEndDate);
    const updated: GovernanceAssignmentRecord = {
      ...assignment,
      contactId: nextContactId,
      positionName: nextPositionName,
      startDate: nextStartDate,
      endDate: nextEndDate,
      archived: dto.archived ?? assignment.archived,
      updatedAt: new Date().toISOString(),
    };
    this.ctx.governanceAssignments.set(assignmentId, updated);
    return updated;
  }
}
