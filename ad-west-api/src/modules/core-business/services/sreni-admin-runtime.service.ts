import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ENUM_TYPES } from '@modules/enum-values/enum-types.constants';
import { AssignContactDivisionDto, AssignContactSthanDto, CreateHouseholdMemberDto, CreateLocationReportMetricDto, CreateReportMetricDefinitionDto, CreateSreniDivisionDto, CreateSreniReportParameterDto, SetContactSreniTagsDto, SubmitSreniMonthlyReportDto, UpdateHouseholdMemberDto, UpdateLocationReportMetricDto, UpdateReportMetricDefinitionDto, UpdateSreniDivisionDto, UpdateSreniReportParameterDto } from '../dto/core-business.dto';
import type {
  HouseholdMemberEnrollmentRecord,
  HouseholdMemberRecord,
  SreniParticipantRecord,
} from '../core-business.types';
import type { ContactSreniTagRecord, GlobalContactUploadDuplicate, ReportMetricDefinitionRecord, SreniContactRecord, SreniDivisionRecord, SreniMonthlyReportRecord, SreniReportParameterRecord, SrenyRecord } from '../core-business.service';
import { HouseholdMemberService } from './household-member.service';
import { HouseholdParticipantResolverService } from './household-participant-resolver.service';
import { HouseholdEnumConfigService, type HouseholdResolverKey } from './household-enum-config.service';

type SreniContactCellValue = string | number | boolean | null;

const MASTER_SRENI_CONTACT_FIELDS: Array<{
  key: string;
  header: string;
  occurrence?: number;
}> = [
  { key: 'name', header: 'name' },
  { key: 'personalNumber', header: 'personal number' },
  { key: 'updatesAsPerAug2024', header: 'updates as per aug2024' },
  { key: 'ss', header: 'ss' },
  { key: 'companyMobileNo2', header: 'company mobile no 2' },
  { key: 'bhag', header: 'bhag' },
  { key: 'samithi', header: 'samithi' },
  { key: 'samithiStatus', header: 'samithi status' },
  { key: 'balabarathi', header: 'balabarathi' },
  { key: 'bbStatus', header: 'bb status' },
  { key: 'yoga', header: 'yoga', occurrence: 1 },
  { key: 'familyOrBachelor', header: 'family / bachelor' },
  { key: 'family', header: 'family' },
  { key: 'bachelor', header: 'bachelor' },
  { key: 'addressInUae', header: 'address in uae' },
  { key: 'company', header: 'company' },
  { key: 'profession', header: 'profession' },
  { key: 'wifeName', header: 'wifename' },
  { key: 'mobileNo4', header: 'mobileno4' },
  { key: 'landLine', header: 'land line' },
  { key: 'zoneOrLandmark', header: 'zone / land mark' },
  { key: 'district', header: 'district' },
  { key: 'company8', header: 'company8' },
  { key: 'profession7', header: 'profession7' },
  { key: 'yogaSecondary', header: 'yoga', occurrence: 2 },
];

const normalizeContactTemplateHeader = (value: unknown): string =>
  String(value ?? '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^a-z0-9 /]/g, '')
    .trim();

const normalizeSreniContactCell = (value: unknown): SreniContactCellValue => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  const text = String(value).trim();
  if (!text.length) return null;
  if (/^-?\d+(\.\d+)?$/.test(text)) {
    const parsed = Number(text);
    if (Number.isFinite(parsed)) return parsed;
  }
  return text;
};

export interface SreniAdminRuntimeContext {
  srenies: Map<string, SrenyRecord>;
  sreniDivisions: Map<string, SreniDivisionRecord>;
  sreniContacts: Map<string, SreniContactRecord>;
  householdMembers: Map<string, HouseholdMemberRecord>;
  householdEnrollments: Map<string, HouseholdMemberEnrollmentRecord>;
  enumConfig: HouseholdEnumConfigService;
  reportMetricDefinitions: Map<string, ReportMetricDefinitionRecord>;
  sreniMonthlyReports: Map<string, SreniMonthlyReportRecord>;
  sreniReportParameters: Map<string, SreniReportParameterRecord>;
  runtimeMode: 'in-memory' | 'db';
  dataSource?: DataSource;
  newId: (prefix: string) => string;
  toIsoTimestamp: (value: string | Date) => string;
}

export class SreniAdminRuntimeService {
  constructor(private readonly ctx: SreniAdminRuntimeContext) {}

  private householdMemberService: HouseholdMemberService | null = null;
  private participantResolverService: HouseholdParticipantResolverService | null = null;

  private getHouseholdMembers(): HouseholdMemberService {
    if (!this.householdMemberService) {
      this.householdMemberService = new HouseholdMemberService(this.ctx);
    }
    return this.householdMemberService;
  }

  private getParticipantResolver(): HouseholdParticipantResolverService {
    if (!this.participantResolverService) {
      this.participantResolverService = new HouseholdParticipantResolverService(this.ctx);
    }
    return this.participantResolverService;
  }

  private toMonthKey(dateInput: string, label: string): number {
    const parsed = new Date(dateInput);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException(`${label} must be a valid date string`);
    }

    return parsed.getUTCFullYear() * 100 + (parsed.getUTCMonth() + 1);
  }

  // ── Sreni Divisions ──────────────────────────────────────────────────────────

  async listSreniDivisions(sreniId: string): Promise<SreniDivisionRecord[]> {
    if (this.ctx.runtimeMode === 'db' && this.ctx.dataSource) {
      const rows = await this.ctx.dataSource.query(
        `SELECT id, sreni_id, name, display_order, created_at, updated_at
         FROM adwest.sreni_divisions WHERE sreni_id = $1
         ORDER BY display_order ASC, created_at ASC`,
        [sreniId],
      ) as Array<{ id: string; sreni_id: string; name: string; display_order: number; created_at: string | Date; updated_at: string | Date }>;
      return rows.map((r) => ({
        id: r.id,
        sreniId: r.sreni_id,
        name: r.name,
        displayOrder: r.display_order,
        createdAt: this.ctx.toIsoTimestamp(r.created_at),
        updatedAt: this.ctx.toIsoTimestamp(r.updated_at),
      }));
    }
    return Array.from(this.ctx.sreniDivisions.values())
      .filter((d) => d.sreniId === sreniId)
      .sort((a, b) => a.displayOrder - b.displayOrder || a.createdAt.localeCompare(b.createdAt));
  }

  async createSreniDivision(sreniId: string, dto: CreateSreniDivisionDto): Promise<SreniDivisionRecord> {
    const now = new Date().toISOString();
    const id = this.ctx.newId('sdiv');
    const record: SreniDivisionRecord = {
      id,
      sreniId,
      name: dto.name.trim(),
      displayOrder: dto.displayOrder ?? 0,
      createdAt: now,
      updatedAt: now,
    };
    if (this.ctx.runtimeMode === 'db' && this.ctx.dataSource) {
      const rows = await this.ctx.dataSource.query(
        `INSERT INTO adwest.sreni_divisions (sreni_id, name, display_order)
         VALUES ($1, $2, $3)
         RETURNING id, sreni_id, name, display_order, created_at, updated_at`,
        [sreniId, record.name, record.displayOrder],
      ) as Array<{ id: string; sreni_id: string; name: string; display_order: number; created_at: string | Date; updated_at: string | Date }>;
      const r = rows[0];
      return {
        id: r.id,
        sreniId: r.sreni_id,
        name: r.name,
        displayOrder: r.display_order,
        createdAt: this.ctx.toIsoTimestamp(r.created_at),
        updatedAt: this.ctx.toIsoTimestamp(r.updated_at),
      };
    }
    this.ctx.sreniDivisions.set(`${sreniId}:${id}`, record);
    return record;
  }

  async updateSreniDivision(sreniId: string, divisionId: string, dto: UpdateSreniDivisionDto): Promise<SreniDivisionRecord> {
    if (this.ctx.runtimeMode === 'db' && this.ctx.dataSource) {
      const rows = await this.ctx.dataSource.query(
        `UPDATE adwest.sreni_divisions
         SET name = COALESCE($1, name),
             display_order = COALESCE($2, display_order),
             updated_at = now()
         WHERE id = $3 AND sreni_id = $4
         RETURNING id, sreni_id, name, display_order, created_at, updated_at`,
        [dto.name?.trim() ?? null, dto.displayOrder ?? null, divisionId, sreniId],
      ) as Array<{ id: string; sreni_id: string; name: string; display_order: number; created_at: string | Date; updated_at: string | Date }>;
      if (!rows[0]) throw new NotFoundException('Division not found');
      const r = rows[0];
      return {
        id: r.id,
        sreniId: r.sreni_id,
        name: r.name,
        displayOrder: r.display_order,
        createdAt: this.ctx.toIsoTimestamp(r.created_at),
        updatedAt: this.ctx.toIsoTimestamp(r.updated_at),
      };
    }
    const existing = this.ctx.sreniDivisions.get(`${sreniId}:${divisionId}`);
    if (!existing) throw new NotFoundException('Division not found');
    const updated: SreniDivisionRecord = {
      ...existing,
      name: dto.name?.trim() ?? existing.name,
      displayOrder: dto.displayOrder ?? existing.displayOrder,
      updatedAt: new Date().toISOString(),
    };
    this.ctx.sreniDivisions.set(`${sreniId}:${divisionId}`, updated);
    return updated;
  }

  async deleteSreniDivision(sreniId: string, divisionId: string): Promise<void> {
    if (this.ctx.runtimeMode === 'db' && this.ctx.dataSource) {
      await this.ctx.dataSource.query(
        `DELETE FROM adwest.sreni_divisions WHERE id = $1 AND sreni_id = $2`,
        [divisionId, sreniId],
      );
      return;
    }
    this.ctx.sreniDivisions.delete(`${sreniId}:${divisionId}`);
    for (const [key, c] of this.ctx.sreniContacts) {
      if (c.sreniId === sreniId && c.divisionId === divisionId) {
        this.ctx.sreniContacts.set(key, { ...c, divisionId: undefined, updatedAt: new Date().toISOString() });
      }
    }
  }

  async assignContactDivision(sreniId: string, contactId: string, dto: AssignContactDivisionDto): Promise<SreniContactRecord> {
    const divisionId = dto.divisionId ?? undefined;
    if (this.ctx.runtimeMode === 'db' && this.ctx.dataSource) {
      const rows = await this.ctx.dataSource.query(
        `UPDATE adwest.sreni_contacts
         SET division_id = $1, updated_at = now()
         WHERE id = $2 AND sreni_id = $3
         RETURNING id, sreni_id, row_index, data, zone_location_id, sthan_location_id, division_location_id, division_id, COALESCE(active, true) AS active, source_file, uploaded_by, created_at, updated_at`,
        [divisionId ?? null, contactId, sreniId],
      ) as Array<{
        id: string; sreni_id: string; row_index: number;
        data: Record<string, string | number | boolean | null>;
        zone_location_id: string | null; sthan_location_id: string | null; division_location_id: string | null;
        division_id: string | null; active: boolean; source_file: string | null;
        uploaded_by: string | null; created_at: string | Date; updated_at: string | Date;
      }>;
      if (!rows[0]) throw new NotFoundException('Contact not found');
      const r = rows[0];
      const updated: SreniContactRecord = {
        id: r.id,
        sreniId: r.sreni_id,
        rowIndex: r.row_index,
        data: r.data ?? {},
        zoneLocationId: r.zone_location_id ?? undefined,
        sthanLocationId: r.sthan_location_id ?? undefined,
        divisionLocationId: r.division_location_id ?? undefined,
        divisionId: r.division_id ?? undefined,
        active: r.active ?? true,
        sourceFile: r.source_file ?? undefined,
        uploadedBy: r.uploaded_by ?? undefined,
        createdAt: this.ctx.toIsoTimestamp(r.created_at),
        updatedAt: this.ctx.toIsoTimestamp(r.updated_at),
      };
      this.ctx.sreniContacts.set(`${sreniId}:${contactId}`, updated);
      return updated;
    }
    const existing = this.ctx.sreniContacts.get(`${sreniId}:${contactId}`);
    if (!existing) throw new NotFoundException('Contact not found');
    const updated: SreniContactRecord = { ...existing, divisionId, updatedAt: new Date().toISOString() };
    this.ctx.sreniContacts.set(`${sreniId}:${contactId}`, updated);
    return updated;
  }

  async assignContactSthan(sreniId: string, contactId: string, dto: AssignContactSthanDto): Promise<SreniContactRecord> {
    const sthanId = dto.sthanId ?? undefined;
    if (this.ctx.runtimeMode === 'db' && this.ctx.dataSource) {
      const rows = await this.ctx.dataSource.query(
        `UPDATE adwest.sreni_contacts
         SET sthan_id = $1, updated_at = now()
         WHERE id = $2 AND sreni_id = $3
         RETURNING id, sreni_id, row_index, data, zone_location_id, sthan_location_id, division_location_id, division_id, sthan_id, COALESCE(active, true) AS active, source_file, uploaded_by, created_at, updated_at`,
        [sthanId ?? null, contactId, sreniId],
      ) as Array<{
        id: string; sreni_id: string; row_index: number;
        data: Record<string, string | number | boolean | null>;
        zone_location_id: string | null; sthan_location_id: string | null; division_location_id: string | null;
        division_id: string | null; sthan_id: string | null; active: boolean;
        source_file: string | null; uploaded_by: string | null;
        created_at: string | Date; updated_at: string | Date;
      }>;
      if (!rows[0]) throw new NotFoundException('Contact not found');
      const r = rows[0];
      const updated: SreniContactRecord = {
        id: r.id, sreniId: r.sreni_id, rowIndex: r.row_index,
        data: r.data ?? {},
        zoneLocationId: r.zone_location_id ?? undefined,
        sthanLocationId: r.sthan_location_id ?? undefined,
        divisionLocationId: r.division_location_id ?? undefined,
        divisionId: r.division_id ?? undefined,
        sthanId: r.sthan_id ?? undefined, active: r.active ?? true,
        sourceFile: r.source_file ?? undefined, uploadedBy: r.uploaded_by ?? undefined,
        createdAt: this.ctx.toIsoTimestamp(r.created_at), updatedAt: this.ctx.toIsoTimestamp(r.updated_at),
      };
      this.ctx.sreniContacts.set(`${sreniId}:${contactId}`, updated);
      return updated;
    }
    const existing = this.ctx.sreniContacts.get(`${sreniId}:${contactId}`);
    if (!existing) throw new NotFoundException('Contact not found');
    const updated: SreniContactRecord = { ...existing, sthanId, updatedAt: new Date().toISOString() };
    this.ctx.sreniContacts.set(`${sreniId}:${contactId}`, updated);
    return updated;
  }

  async listSreniContacts(
    sreniId: string,
    page = 1,
    pageSize = 50,
  ): Promise<{
    items: (SreniContactRecord & { sreniName: string; isTagged: boolean })[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
    enrollmentScope: string;
    primaryContactStrategy: string;
    resolverKey: HouseholdResolverKey;
    participantTotal: number;
  }> {
    const enrollmentScope = await this.getHouseholdMembers().getSreniEnrollmentScope(sreniId);
    const participantStats = await this.getParticipantResolver().getSreniParticipantStats(sreniId);
    const primaryContactStrategy = participantStats.strategy;
    const resolverKey = participantStats.resolverKey;
    const participantTotal = participantStats.participantCount;

    if (this.ctx.runtimeMode === 'db' && this.ctx.dataSource) {
      const offset = (page - 1) * pageSize;
      const femaleGenders = resolverKey === 'female_participants'
        ? await this.ctx.enumConfig.getFemaleGenderMatches()
        : null;
      const participantCountSelect = femaleGenders
        ? `(SELECT COUNT(*)::int
            FROM adwest.household_members hm
            WHERE hm.contact_id = c.id AND hm.active = true
              AND (
                LOWER(COALESCE(hm.gender, '')) = ANY($4::text[])
                OR (hm.role = 'spouse' AND hm.source = 'import')
              )) AS participant_count`
        : '0 AS participant_count';
      const listParams: Array<string | number | string[]> = femaleGenders
        ? [sreniId, pageSize, offset, femaleGenders]
        : [sreniId, pageSize, offset];

      const [countRows, rows] = await Promise.all([
        this.ctx.dataSource.query(
          `SELECT COUNT(DISTINCT c.id)::int AS total
           FROM adwest.sreni_contacts c
           LEFT JOIN adwest.contact_sreni_tags cst ON cst.contact_id = c.id AND cst.sreni_id = $1
           WHERE c.sreni_id = $1 OR cst.id IS NOT NULL`,
          [sreniId],
        ) as Promise<Array<{ total: number }>>,
        this.ctx.dataSource.query(
          `SELECT c.id, c.sreni_id, c.row_index, c.data,
                  c.zone_location_id, c.sthan_location_id, c.division_location_id,
                  CASE WHEN c.sreni_id = $1 THEN c.division_id ELSE cst.division_id END AS division_id,
                  c.sthan_id, COALESCE(c.active, true) AS active,
                  c.source_file, c.uploaded_by, c.created_at, c.updated_at,
                  COALESCE(s.name, c.sreni_id) AS sreni_name,
                  (c.sreni_id != $1) AS is_tagged,
                  (SELECT COUNT(*)::int
                   FROM adwest.household_members hm
                   INNER JOIN adwest.household_member_sreni_enrollments e
                     ON e.member_id = hm.id AND e.sreni_id = $1 AND e.active = true
                   WHERE hm.contact_id = c.id AND hm.role = 'child' AND hm.active = true) AS child_count,
                  (SELECT STRING_AGG(d.name || ' (' || sub.cnt::text || ')', ', ' ORDER BY d.display_order, d.name)
                   FROM (
                     SELECT e.division_id, COUNT(*)::int AS cnt
                     FROM adwest.household_members hm
                     INNER JOIN adwest.household_member_sreni_enrollments e
                       ON e.member_id = hm.id AND e.sreni_id = $1 AND e.active = true
                     WHERE hm.contact_id = c.id AND hm.role = 'child' AND hm.active = true
                       AND e.division_id IS NOT NULL
                     GROUP BY e.division_id
                   ) sub
                   INNER JOIN adwest.sreni_divisions d ON d.id = sub.division_id) AS children_division_summary,
                  ${participantCountSelect}
           FROM adwest.sreni_contacts c
           LEFT JOIN adwest.contact_sreni_tags cst ON cst.contact_id = c.id AND cst.sreni_id = $1
           LEFT JOIN adwest.srenies s ON s.id::text = c.sreni_id
           WHERE c.sreni_id = $1 OR cst.id IS NOT NULL
           ORDER BY (c.sreni_id = $1) DESC, c.row_index ASC
           LIMIT $2 OFFSET $3`,
          listParams,
        ) as Promise<Array<{
          id: string; sreni_id: string; row_index: number;
          data: Record<string, string | number | boolean | null>;
          zone_location_id: string | null; sthan_location_id: string | null; division_location_id: string | null;
          division_id: string | null; sthan_id: string | null; active: boolean;
          source_file: string | null; uploaded_by: string | null;
          created_at: string | Date; updated_at: string | Date;
          sreni_name: string; is_tagged: boolean;
          child_count: number; children_division_summary: string | null;
          participant_count: number;
        }>>,
      ]);
      const total = countRows[0]?.total ?? 0;
      const totalPages = Math.max(1, Math.ceil(total / pageSize));
      const items = rows.map((r) => ({
        id: r.id,
        sreniId: r.sreni_id,
        rowIndex: r.row_index,
        data: r.data ?? {},
        zoneLocationId: r.zone_location_id ?? undefined,
        sthanLocationId: r.sthan_location_id ?? undefined,
        divisionLocationId: r.division_location_id ?? undefined,
        divisionId: r.division_id ?? undefined,
        sthanId: r.sthan_id ?? undefined,
        active: r.active ?? true,
        sourceFile: r.source_file ?? undefined,
        uploadedBy: r.uploaded_by ?? undefined,
        childCount: r.child_count ?? 0,
        childrenDivisionSummary: r.children_division_summary ?? undefined,
        participantCount: r.participant_count ?? 0,
        createdAt: this.ctx.toIsoTimestamp(r.created_at),
        updatedAt: this.ctx.toIsoTimestamp(r.updated_at),
        sreniName: r.sreni_name,
        isTagged: r.is_tagged ?? false,
      }));
      return { items, total, page, pageSize, totalPages, enrollmentScope, primaryContactStrategy, resolverKey, participantTotal };
    }
    // In-memory: direct contacts + tagged contacts
    const taggedIds = new Set(
      Array.from(this.ctx.sreniContacts.values())
        .filter((c) => c.sreniId !== sreniId)
        .map((c) => c.id),
    );
    const all = Array.from(this.ctx.sreniContacts.values())
      .filter((c) => c.sreniId === sreniId || taggedIds.has(c.id))
      .sort((a, b) => {
        if (a.sreniId === sreniId && b.sreniId !== sreniId) return -1;
        if (a.sreniId !== sreniId && b.sreniId === sreniId) return 1;
        return a.rowIndex - b.rowIndex;
      })
      .map((c) => ({
        ...c,
        sreniName: this.ctx.srenies.get(c.sreniId ?? '')?.name ?? (c.sreniId ?? ''),
        isTagged: c.sreniId !== sreniId,
      }));
    const total = all.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const start = (page - 1) * pageSize;
    return {
      items: all.slice(start, start + pageSize),
      total,
      page,
      pageSize,
      totalPages,
      enrollmentScope,
      primaryContactStrategy,
      resolverKey,
      participantTotal,
    };
  }

  async uploadSreniContacts(
    sreniId: string,
    fileBuffer: Buffer,
    originalName: string,
    uploadedBy?: string,
  ): Promise<{ inserted: number; sreniId: string }> {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const XLSX = require('xlsx') as typeof import('xlsx');

    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) throw new BadRequestException('Excel file has no sheets');
    const sheet = workbook.Sheets[sheetName];

    const grid = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      defval: null,
      blankrows: false,
      raw: false,
    }) as unknown[][];

    if (grid.length <= 1) {
      return { inserted: 0, sreniId };
    }

    const headerRow = grid[0] ?? [];
    const normalizedHeaders = headerRow.map((cell) => normalizeContactTemplateHeader(cell));
    const normalizedHeaderSet = new Set(normalizedHeaders.filter((h) => h.length > 0));

    const missingHeaders = Array.from(new Set(MASTER_SRENI_CONTACT_FIELDS.map((f) => f.header)))
      .filter((header) => !normalizedHeaderSet.has(header));

    if (missingHeaders.length > 0) {
      throw new BadRequestException(
        'Uploaded file does not match the master contact template headers. '
        + `Missing header(s): ${missingHeaders.join(', ')}`,
      );
    }

    const headerBuckets = new Map<string, number[]>();
    normalizedHeaders.forEach((header, index) => {
      if (!header) return;
      const bucket = headerBuckets.get(header) ?? [];
      bucket.push(index);
      headerBuckets.set(header, bucket);
    });

    const parsedRows = grid.slice(1).map((rawRow) => {
      const data: Record<string, SreniContactCellValue> = {};
      for (const field of MASTER_SRENI_CONTACT_FIELDS) {
        const occurrence = (field.occurrence ?? 1) - 1;
        const sourceIndexes = headerBuckets.get(field.header) ?? [];
        const sourceIndex = sourceIndexes[occurrence];
        data[field.key] = sourceIndex === undefined
          ? null
          : normalizeSreniContactCell(rawRow[sourceIndex]);
      }
      return data;
    }).filter((row) => Object.values(row).some((value) => value !== null));

    if (parsedRows.length === 0) {
      return { inserted: 0, sreniId };
    }

    const now = new Date().toISOString();

    for (const [key, c] of this.ctx.sreniContacts) {
      if (c.sreniId === sreniId) this.ctx.sreniContacts.delete(key);
    }

    const records: SreniContactRecord[] = parsedRows.map((row, idx) => {
      const id = this.ctx.newId('sc');
      return {
        id,
        sreniId,
        rowIndex: idx + 1,
        data: row,
        active: true,
        sourceFile: originalName,
        uploadedBy,
        createdAt: now,
        updatedAt: now,
      };
    });

    for (const r of records) {
      this.ctx.sreniContacts.set(`${sreniId}:${r.id}`, r);
    }

    if (this.ctx.runtimeMode === 'db' && this.ctx.dataSource) {
      await this.ctx.dataSource.query(
        `DELETE FROM adwest.sreni_contacts WHERE sreni_id = $1`,
        [sreniId],
      );
      const memberSync = this.getHouseholdMembers();
      for (const r of records) {
        const inserted = await this.ctx.dataSource.query(
          `INSERT INTO adwest.sreni_contacts (id, sreni_id, row_index, data, source_file, uploaded_by)
           VALUES (gen_random_uuid(), $1, $2, $3::jsonb, $4, $5)
           RETURNING id`,
          [sreniId, r.rowIndex, JSON.stringify(r.data), r.sourceFile ?? null, r.uploadedBy ?? null],
        ) as Array<{ id: string }>;
        if (inserted[0]?.id) {
          await memberSync.syncMembersFromContactData(inserted[0].id, r.data);
        }
      }
    } else {
      const memberSync = this.getHouseholdMembers();
      for (const r of records) {
        await memberSync.syncMembersFromContactData(r.id, r.data);
      }
    }

    return { inserted: records.length, sreniId };
  }

  async clearSreniContacts(sreniId: string): Promise<{ deleted: number; sreniId: string }> {
    let deleted = 0;
    for (const [key, c] of this.ctx.sreniContacts) {
      if (c.sreniId === sreniId) {
        this.ctx.sreniContacts.delete(key);
        deleted++;
      }
    }
    if (this.ctx.runtimeMode === 'db' && this.ctx.dataSource) {
      await this.ctx.dataSource.query(
        `DELETE FROM adwest.sreni_contacts WHERE sreni_id = $1`,
        [sreniId],
      );
    }
    return { deleted, sreniId };
  }

  async uploadGlobalContacts(
    fileBuffer: Buffer,
    originalName: string,
    uploadedBy?: string,
  ): Promise<{ inserted: number; duplicates: GlobalContactUploadDuplicate[] }> {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const XLSX = require('xlsx') as typeof import('xlsx');
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) throw new Error('Excel file has no sheets');
    const sheet = workbook.Sheets[sheetName];
    const grid = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: null, blankrows: false, raw: false }) as unknown[][];
    if (grid.length <= 1) return { inserted: 0, duplicates: [] };

    const headerRow = grid[0] ?? [];
    const normalizedHeaders = headerRow.map((cell) => normalizeContactTemplateHeader(cell));
    const parsedRows: Array<{ data: Record<string, SreniContactCellValue>; rowIndex: number }> = [];

    for (let i = 1; i < grid.length; i++) {
      const row = grid[i] ?? [];
      const data: Record<string, SreniContactCellValue> = {};
      let hasValue = false;
      for (let j = 0; j < normalizedHeaders.length; j++) {
        const header = normalizedHeaders[j];
        if (!header) continue;
        const field = MASTER_SRENI_CONTACT_FIELDS.find((f) => f.header === header);
        const key = field?.key ?? header.replace(/\s+/g, '_');
        const val = normalizeSreniContactCell(row[j]);
        if (val !== null) { data[key] = val; hasValue = true; }
      }
      if (hasValue) parsedRows.push({ data, rowIndex: i });
    }

    if (parsedRows.length === 0) return { inserted: 0, duplicates: [] };

    const duplicates: GlobalContactUploadDuplicate[] = [];
    const toInsert: Array<{ data: Record<string, SreniContactCellValue>; rowIndex: number }> = [];

    if (this.ctx.runtimeMode === 'db' && this.ctx.dataSource) {
      // Collect personal numbers from incoming rows for bulk duplicate check
      const incomingPNs = parsedRows
        .map((r) => r.data['personalNumber'])
        .filter((v): v is string => typeof v === 'string' && v.length > 0);

      const existingRows: Array<{ personal_number: string; sreni_id: string | null }> =
        incomingPNs.length > 0
          ? (await this.ctx.dataSource.query(
              `SELECT data->>'personalNumber' AS personal_number, sreni_id
               FROM adwest.sreni_contacts
               WHERE data->>'personalNumber' = ANY($1)`,
              [incomingPNs],
            ) as Array<{ personal_number: string; sreni_id: string | null }>)
          : [];

      const existingPNSet = new Map(existingRows.map((r) => [r.personal_number, r.sreni_id]));

      for (const row of parsedRows) {
        const pn = typeof row.data['personalNumber'] === 'string' ? row.data['personalNumber'] : null;
        if (pn && existingPNSet.has(pn)) {
          duplicates.push({
            rowIndex: row.rowIndex,
            name: typeof row.data['name'] === 'string' ? row.data['name'] : null,
            personalNumber: pn,
            existingSreniId: existingPNSet.get(pn) ?? null,
          });
        } else {
          toInsert.push(row);
        }
      }

      const now = new Date().toISOString();
      const memberSync = this.getHouseholdMembers();
      for (const row of toInsert) {
        const contactId = this.ctx.newId('sc');
        await this.ctx.dataSource.query(
          `INSERT INTO adwest.sreni_contacts (id, sreni_id, row_index, data, active, source_file, uploaded_by, created_at, updated_at)
           VALUES ($1, NULL, $2, $3, true, $4, $5, $6, $6)`,
          [contactId, row.rowIndex, row.data, originalName, uploadedBy ?? null, now],
        );
        await memberSync.syncMembersFromContactData(contactId, row.data);
      }
      return { inserted: toInsert.length, duplicates };
    }

    // In-memory fallback — no duplicate detection
    const now = new Date().toISOString();
    const memberSync = this.getHouseholdMembers();
    for (const row of parsedRows) {
      const id = this.ctx.newId('sc');
      const record: SreniContactRecord = {
        id, sreniId: null, rowIndex: row.rowIndex,
        data: row.data, active: true,
        sourceFile: originalName, uploadedBy,
        createdAt: now, updatedAt: now,
      };
      this.ctx.sreniContacts.set(`global:${id}`, record);
      await memberSync.syncMembersFromContactData(id, row.data);
    }
    return { inserted: parsedRows.length, duplicates: [] };
  }

  async listAllContacts(
    page = 1,
    pageSize = 50,
  ): Promise<{ items: (SreniContactRecord & { sreniName: string })[]; total: number; page: number; pageSize: number; totalPages: number }> {
    if (this.ctx.runtimeMode === 'db' && this.ctx.dataSource) {
      const countRows = await this.ctx.dataSource.query(
        `SELECT COUNT(*)::int AS total FROM adwest.sreni_contacts`,
      ) as Array<{ total: number }>;
      const total = countRows[0]?.total ?? 0;
      const totalPages = Math.max(1, Math.ceil(total / pageSize));
      const offset = (page - 1) * pageSize;
      const rows = await this.ctx.dataSource.query(
        `SELECT c.id, c.sreni_id, c.row_index, c.data,
          c.zone_location_id, c.sthan_location_id, c.division_location_id,
          c.division_id, c.sthan_id,
                COALESCE(c.active, true) AS active,
                c.source_file, c.uploaded_by, c.created_at, c.updated_at,
                COALESCE(s.name, c.sreni_id) AS sreni_name
         FROM adwest.sreni_contacts c
         LEFT JOIN adwest.srenies s ON s.id::text = c.sreni_id
         ORDER BY s.name ASC NULLS LAST, c.row_index ASC
         LIMIT $1 OFFSET $2`,
        [pageSize, offset],
      ) as Array<{
        id: string; sreni_id: string; row_index: number;
        data: Record<string, string | number | boolean | null>;
        zone_location_id: string | null; sthan_location_id: string | null; division_location_id: string | null;
        division_id: string | null; sthan_id: string | null; active: boolean; source_file: string | null;
        uploaded_by: string | null; created_at: string | Date; updated_at: string | Date;
        sreni_name: string;
      }>;
      const items = rows.map((r) => ({
        id: r.id,
        sreniId: r.sreni_id,
        sreniName: r.sreni_name,
        rowIndex: r.row_index,
        data: r.data ?? {},
        zoneLocationId: r.zone_location_id ?? undefined,
        sthanLocationId: r.sthan_location_id ?? undefined,
        divisionLocationId: r.division_location_id ?? undefined,
        divisionId: r.division_id ?? undefined,
        sthanId: r.sthan_id ?? undefined,
        active: r.active ?? true,
        sourceFile: r.source_file ?? undefined,
        uploadedBy: r.uploaded_by ?? undefined,
        createdAt: this.ctx.toIsoTimestamp(r.created_at),
        updatedAt: this.ctx.toIsoTimestamp(r.updated_at),
      }));
      return { items, total, page, pageSize, totalPages };
    }

    const all = Array.from(this.ctx.sreniContacts.values())
      .map((c) => ({
        ...c,
        sreniName: (c.sreniId ? (this.ctx.srenies.get(c.sreniId)?.name ?? c.sreniId) : '') as string,
      }))
      .sort((a, b) => a.sreniName.localeCompare(b.sreniName) || a.rowIndex - b.rowIndex);
    const total = all.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const start = (page - 1) * pageSize;
    return { items: all.slice(start, start + pageSize), total, page, pageSize, totalPages };
  }

  private mapMetricRow(r: { id: string; name: string; description: string | null; unit: string | null; input_type: string; is_required: boolean; sort_order: number; target?: string | null; active: boolean; scope?: string; created_at: string | Date; updated_at: string | Date }): ReportMetricDefinitionRecord {
    return {
      id: r.id, name: r.name, description: r.description ?? undefined, unit: r.unit ?? undefined,
      inputType: r.input_type as 'number' | 'text', isRequired: r.is_required, sortOrder: r.sort_order,
      target: r.target != null ? Number(r.target) : undefined,
      active: r.active, scope: (r.scope ?? 'sreni') as 'sreni' | 'location',
      createdAt: this.ctx.toIsoTimestamp(r.created_at), updatedAt: this.ctx.toIsoTimestamp(r.updated_at),
    };
  }

  // Cached check: does the scope column exist yet (migration 047 may not have run)?
  private scopeColumnReady: boolean | null = null;

  private async hasScopeColumn(): Promise<boolean> {
    if (this.scopeColumnReady !== null) return this.scopeColumnReady;
    if (!this.ctx.dataSource) return false;
    try {
      const rows = await this.ctx.dataSource.query(
        `SELECT 1 FROM information_schema.columns
         WHERE table_schema='adwest' AND table_name='report_metric_definitions' AND column_name='scope'`,
      ) as unknown[];
      this.scopeColumnReady = rows.length > 0;
    } catch {
      this.scopeColumnReady = false;
    }
    return this.scopeColumnReady;
  }

  async listReportMetricDefinitions(): Promise<ReportMetricDefinitionRecord[]> {
    if (this.ctx.runtimeMode === 'db' && this.ctx.dataSource) {
      const hasScope = await this.hasScopeColumn();
      const whereClause = hasScope ? `WHERE COALESCE(scope, 'sreni') = 'sreni'` : '';
      const scopeSelect = hasScope ? `COALESCE(scope, 'sreni') AS scope,` : `'sreni' AS scope,`;
      const rows = await this.ctx.dataSource.query(
        `SELECT id, name, description, unit, input_type, is_required, sort_order, target, active,
                ${scopeSelect} created_at, updated_at
         FROM adwest.report_metric_definitions ${whereClause}
         ORDER BY sort_order ASC, created_at ASC`,
      ) as Array<{ id: string; name: string; description: string | null; unit: string | null; input_type: string; is_required: boolean; sort_order: number; target: string | null; active: boolean; scope: string; created_at: string | Date; updated_at: string | Date }>;
      return rows.map((r) => this.mapMetricRow(r));
    }
    return Array.from(this.ctx.reportMetricDefinitions.values())
      .filter((m) => !('scope' in m) || (m as ReportMetricDefinitionRecord).scope === 'sreni')
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  async listLocationReportMetrics(): Promise<ReportMetricDefinitionRecord[]> {
    if (this.ctx.runtimeMode === 'db' && this.ctx.dataSource) {
      const hasScope = await this.hasScopeColumn();
      if (!hasScope) return []; // migration 047 not yet applied — no location metrics exist
      const rows = await this.ctx.dataSource.query(
        `SELECT id, name, description, unit, input_type, is_required, sort_order, target, active,
                scope, created_at, updated_at
         FROM adwest.report_metric_definitions WHERE scope = 'location'
         ORDER BY sort_order ASC, created_at ASC`,
      ) as Array<{ id: string; name: string; description: string | null; unit: string | null; input_type: string; is_required: boolean; sort_order: number; target: string | null; active: boolean; scope: string; created_at: string | Date; updated_at: string | Date }>;
      return rows.map((r) => this.mapMetricRow(r));
    }
    return [];
  }

  async createReportMetricDefinition(dto: CreateReportMetricDefinitionDto): Promise<ReportMetricDefinitionRecord> {
    if (this.ctx.runtimeMode === 'db' && this.ctx.dataSource) {
      const hasScope = await this.hasScopeColumn();
      const sql = hasScope
        ? `INSERT INTO adwest.report_metric_definitions (name, description, unit, input_type, is_required, sort_order, target, scope)
           VALUES ($1, $2, $3, $4, $5, $6, $7, 'sreni')
           RETURNING id, name, description, unit, input_type, is_required, sort_order, target, active, 'sreni' AS scope, created_at, updated_at`
        : `INSERT INTO adwest.report_metric_definitions (name, description, unit, input_type, is_required, sort_order, target)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING id, name, description, unit, input_type, is_required, sort_order, target, active, 'sreni' AS scope, created_at, updated_at`;
      const rows = await this.ctx.dataSource.query(
        sql,
        [dto.name, dto.description ?? null, dto.unit ?? null, dto.inputType, dto.isRequired ?? false, dto.sortOrder ?? 0, dto.target ?? null],
      ) as Array<{ id: string; name: string; description: string | null; unit: string | null; input_type: string; is_required: boolean; sort_order: number; target: string | null; active: boolean; scope: string; created_at: string | Date; updated_at: string | Date }>;
      return this.mapMetricRow(rows[0]);
    }
    const record: ReportMetricDefinitionRecord = {
      id: this.ctx.newId('rmd'), name: dto.name, description: dto.description, unit: dto.unit,
      inputType: dto.inputType, isRequired: dto.isRequired ?? false, sortOrder: dto.sortOrder ?? 0,
      active: true, scope: 'sreni', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    this.ctx.reportMetricDefinitions.set(record.id, record);
    return record;
  }

  async updateReportMetricDefinition(metricId: string, dto: UpdateReportMetricDefinitionDto): Promise<ReportMetricDefinitionRecord> {
    if (this.ctx.runtimeMode === 'db' && this.ctx.dataSource) {
      const hasScope = await this.hasScopeColumn();
      const existing = await this.ctx.dataSource.query(
        `SELECT id FROM adwest.report_metric_definitions WHERE id=$1`, [metricId],
      ) as Array<{ id: string }>;
      if (!existing.length) throw new NotFoundException('Report metric not found');
      const scopeReturn = hasScope ? `COALESCE(scope, 'sreni') AS scope,` : `'sreni' AS scope,`;
      const rows = await this.ctx.dataSource.query(
        `UPDATE adwest.report_metric_definitions
         SET name=COALESCE($2, name), description=COALESCE($3, description), unit=COALESCE($4, unit),
             input_type=COALESCE($5, input_type), is_required=COALESCE($6, is_required),
             sort_order=COALESCE($7, sort_order), target=COALESCE($8, target),
             active=COALESCE($9, active), updated_at=now()
         WHERE id=$1
         RETURNING id, name, description, unit, input_type, is_required, sort_order, target, active,
                   ${scopeReturn} created_at, updated_at`,
        [metricId, dto.name ?? null, dto.description ?? null, dto.unit ?? null,
         dto.inputType ?? null, dto.isRequired ?? null, dto.sortOrder ?? null, dto.target ?? null, dto.active ?? null],
      ) as Array<{ id: string; name: string; description: string | null; unit: string | null; input_type: string; is_required: boolean; sort_order: number; target: string | null; active: boolean; scope: string; created_at: string | Date; updated_at: string | Date }>;
      return this.mapMetricRow(rows[0]);
    }
    const current = this.ctx.reportMetricDefinitions.get(metricId);
    if (!current) throw new NotFoundException('Report metric not found');
    const updated = { ...current, ...dto, updatedAt: new Date().toISOString() };
    this.ctx.reportMetricDefinitions.set(metricId, updated);
    return updated;
  }

  async createLocationReportMetric(dto: CreateLocationReportMetricDto): Promise<ReportMetricDefinitionRecord> {
    if (this.ctx.runtimeMode === 'db' && this.ctx.dataSource) {
      const hasScope = await this.hasScopeColumn();
      if (!hasScope) {
        // Migration 047 not yet applied — apply it now on-demand
        await this.ctx.dataSource.query(
          `ALTER TABLE adwest.report_metric_definitions
           ADD COLUMN IF NOT EXISTS scope TEXT NOT NULL DEFAULT 'sreni'
             CHECK (scope IN ('sreni', 'location'))`,
        );
        this.scopeColumnReady = true;
      }
      const rows = await this.ctx.dataSource.query(
        `INSERT INTO adwest.report_metric_definitions (name, description, unit, input_type, is_required, sort_order, scope)
         VALUES ($1, $2, $3, $4, $5, $6, 'location')
         RETURNING id, name, description, unit, input_type, is_required, sort_order, target, active, scope, created_at, updated_at`,
        [dto.name, dto.description ?? null, dto.unit ?? null, dto.inputType, dto.isRequired ?? false, dto.sortOrder ?? 0],
      ) as Array<{ id: string; name: string; description: string | null; unit: string | null; input_type: string; is_required: boolean; sort_order: number; target: string | null; active: boolean; scope: string; created_at: string | Date; updated_at: string | Date }>;
      return this.mapMetricRow(rows[0]);
    }
    const now = new Date().toISOString();
    return { id: this.ctx.newId('lrm'), name: dto.name, description: dto.description, unit: dto.unit, inputType: dto.inputType, isRequired: dto.isRequired ?? false, sortOrder: dto.sortOrder ?? 0, active: true, scope: 'location', createdAt: now, updatedAt: now };
  }

  async updateLocationReportMetric(metricId: string, dto: UpdateLocationReportMetricDto): Promise<ReportMetricDefinitionRecord> {
    if (this.ctx.runtimeMode === 'db' && this.ctx.dataSource) {
      const hasScope = await this.hasScopeColumn();
      if (!hasScope) throw new NotFoundException('Location report metric not found — run migration 047 first');
      const existing = await this.ctx.dataSource.query(
        `SELECT id FROM adwest.report_metric_definitions WHERE id=$1 AND scope='location'`, [metricId],
      ) as Array<{ id: string }>;
      if (!existing.length) throw new NotFoundException('Location report metric not found');
      const rows = await this.ctx.dataSource.query(
        `UPDATE adwest.report_metric_definitions
         SET name=COALESCE($2, name), description=COALESCE($3, description), unit=COALESCE($4, unit),
             input_type=COALESCE($5, input_type), is_required=COALESCE($6, is_required),
             sort_order=COALESCE($7, sort_order), updated_at=now()
         WHERE id=$1 AND scope='location'
         RETURNING id, name, description, unit, input_type, is_required, sort_order, target, active, scope, created_at, updated_at`,
        [metricId, dto.name ?? null, dto.description ?? null, dto.unit ?? null,
         dto.inputType ?? null, dto.isRequired ?? null, dto.sortOrder ?? null],
      ) as Array<{ id: string; name: string; description: string | null; unit: string | null; input_type: string; is_required: boolean; sort_order: number; target: string | null; active: boolean; scope: string; created_at: string | Date; updated_at: string | Date }>;
      return this.mapMetricRow(rows[0]);
    }
    throw new NotFoundException('Location report metric not found');
  }

  async deleteReportMetricDefinition(metricId: string): Promise<void> {
    if (this.ctx.runtimeMode === 'db' && this.ctx.dataSource) {
      await this.ctx.dataSource.query(`DELETE FROM adwest.report_metric_definitions WHERE id=$1`, [metricId]);
      return;
    }
    this.ctx.reportMetricDefinitions.delete(metricId);
  }

  async listSreniMonthlyReports(sreniId: string): Promise<SreniMonthlyReportRecord[]> {
    if (this.ctx.runtimeMode === 'db' && this.ctx.dataSource) {
      const rows = await this.ctx.dataSource.query(
        `SELECT id, sreni_id, report_year, report_month, status, submitted_by, submitted_at, notes, entries, created_at, updated_at
         FROM adwest.sreni_monthly_reports WHERE sreni_id=$1 ORDER BY report_year DESC, report_month DESC`,
        [sreniId],
      ) as Array<{ id: string; sreni_id: string; report_year: number; report_month: number; status: string; submitted_by: string | null; submitted_at: string | Date | null; notes: string | null; entries: Record<string, string>; created_at: string | Date; updated_at: string | Date }>;
      return rows.map((r) => ({
        id: r.id, sreniId: r.sreni_id, year: r.report_year, month: r.report_month,
        status: r.status as 'draft' | 'submitted', submittedBy: r.submitted_by ?? undefined,
        submittedAt: r.submitted_at ? this.ctx.toIsoTimestamp(r.submitted_at) : undefined,
        notes: r.notes ?? undefined, entries: r.entries ?? {},
        createdAt: this.ctx.toIsoTimestamp(r.created_at), updatedAt: this.ctx.toIsoTimestamp(r.updated_at),
      }));
    }
    return Array.from(this.ctx.sreniMonthlyReports.values()).filter((r) => r.sreniId === sreniId).sort((a, b) => b.year - a.year || b.month - a.month);
  }

  async listAllMonthlyReports(fromDate?: string, toDate?: string): Promise<SreniMonthlyReportRecord[]> {
    const fromMonthKey = fromDate ? this.toMonthKey(fromDate, 'fromDate') : undefined;
    const toMonthKey = toDate ? this.toMonthKey(toDate, 'toDate') : undefined;

    if (fromMonthKey !== undefined && toMonthKey !== undefined && fromMonthKey > toMonthKey) {
      throw new BadRequestException('fromDate must be before or equal to toDate');
    }

    if (this.ctx.runtimeMode === 'db' && this.ctx.dataSource) {
      const clauses: string[] = [];
      const params: Array<number> = [];

      if (fromMonthKey !== undefined) {
        params.push(fromMonthKey);
        clauses.push(`(report_year * 100 + report_month) >= $${params.length}`);
      }

      if (toMonthKey !== undefined) {
        params.push(toMonthKey);
        clauses.push(`(report_year * 100 + report_month) <= $${params.length}`);
      }

      const whereClause = clauses.length > 0 ? ` WHERE ${clauses.join(' AND ')}` : '';
      const rows = await this.ctx.dataSource.query(
        `SELECT id, sreni_id, report_year, report_month, status, submitted_by, submitted_at, notes, entries, created_at, updated_at
         FROM adwest.sreni_monthly_reports${whereClause} ORDER BY report_year DESC, report_month DESC, sreni_id`,
        params,
      ) as Array<{ id: string; sreni_id: string; report_year: number; report_month: number; status: string; submitted_by: string | null; submitted_at: string | Date | null; notes: string | null; entries: Record<string, string>; created_at: string | Date; updated_at: string | Date }>;
      return rows.map((r) => ({
        id: r.id, sreniId: r.sreni_id, year: r.report_year, month: r.report_month,
        status: r.status as 'draft' | 'submitted', submittedBy: r.submitted_by ?? undefined,
        submittedAt: r.submitted_at ? this.ctx.toIsoTimestamp(r.submitted_at) : undefined,
        notes: r.notes ?? undefined, entries: r.entries ?? {},
        createdAt: this.ctx.toIsoTimestamp(r.created_at), updatedAt: this.ctx.toIsoTimestamp(r.updated_at),
      }));
    }

    return Array.from(this.ctx.sreniMonthlyReports.values())
      .filter((report) => {
        const monthKey = report.year * 100 + report.month;
        if (fromMonthKey !== undefined && monthKey < fromMonthKey) return false;
        if (toMonthKey !== undefined && monthKey > toMonthKey) return false;
        return true;
      })
      .sort((a, b) => b.year - a.year || b.month - a.month);
  }

  async upsertSreniMonthlyReport(sreniId: string, dto: SubmitSreniMonthlyReportDto, submittedBy?: string): Promise<SreniMonthlyReportRecord> {
    const now = new Date().toISOString();
    if (this.ctx.runtimeMode === 'db' && this.ctx.dataSource) {
      const rows = await this.ctx.dataSource.query(
        `INSERT INTO adwest.sreni_monthly_reports (sreni_id, report_year, report_month, status, submitted_by, submitted_at, notes, entries)
         VALUES ($1, $2, $3, 'submitted', $4, now(), $5, $6)
         ON CONFLICT (sreni_id, report_year, report_month) DO UPDATE
           SET status='submitted', submitted_by=$4, submitted_at=now(), notes=$5, entries=$6, updated_at=now()
         RETURNING id, sreni_id, report_year, report_month, status, submitted_by, submitted_at, notes, entries, created_at, updated_at`,
        [sreniId, dto.year, dto.month, submittedBy ?? null, dto.notes ?? null, JSON.stringify(dto.entries)],
      ) as Array<{ id: string; sreni_id: string; report_year: number; report_month: number; status: string; submitted_by: string | null; submitted_at: string | Date | null; notes: string | null; entries: Record<string, string>; created_at: string | Date; updated_at: string | Date }>;
      const r = rows[0];
      const record: SreniMonthlyReportRecord = {
        id: r.id, sreniId: r.sreni_id, year: r.report_year, month: r.report_month,
        status: r.status as 'draft' | 'submitted', submittedBy: r.submitted_by ?? undefined,
        submittedAt: r.submitted_at ? this.ctx.toIsoTimestamp(r.submitted_at) : undefined,
        notes: r.notes ?? undefined, entries: r.entries ?? {},
        createdAt: this.ctx.toIsoTimestamp(r.created_at), updatedAt: this.ctx.toIsoTimestamp(r.updated_at),
      };
      this.ctx.sreniMonthlyReports.set(record.id, record);
      return record;
    }
    const existing = Array.from(this.ctx.sreniMonthlyReports.values()).find((r) => r.sreniId === sreniId && r.year === dto.year && r.month === dto.month);
    if (existing) {
      const updated: SreniMonthlyReportRecord = { ...existing, status: 'submitted', submittedBy, submittedAt: now, notes: dto.notes, entries: dto.entries, updatedAt: now };
      this.ctx.sreniMonthlyReports.set(existing.id, updated);
      return updated;
    }
    const record: SreniMonthlyReportRecord = {
      id: this.ctx.newId('smr'), sreniId, year: dto.year, month: dto.month, status: 'submitted',
      submittedBy, submittedAt: now, notes: dto.notes, entries: dto.entries, createdAt: now, updatedAt: now,
    };
    this.ctx.sreniMonthlyReports.set(record.id, record);
    return record;
  }

  async listSreniReportParameters(sreniId: string, submissionType?: string): Promise<SreniReportParameterRecord[]> {
    if (this.ctx.runtimeMode === 'db' && this.ctx.dataSource) {
      const params: unknown[] = [sreniId];
      const typeClause = submissionType ? ` AND submission_type=$2` : '';
      if (submissionType) params.push(submissionType);
      const rows = await this.ctx.dataSource.query(
        `SELECT id, sreni_id, submission_type, name, description, unit, input_type, is_required, sort_order, active, created_at, updated_at
         FROM adwest.sreni_report_parameters WHERE sreni_id=$1${typeClause} ORDER BY sort_order ASC, created_at ASC`,
        params,
      ) as Array<{ id: string; sreni_id: string; submission_type: string; name: string; description: string | null; unit: string | null; input_type: string; is_required: boolean; sort_order: number; active: boolean; created_at: string | Date; updated_at: string | Date }>;
      return rows.map((r) => ({
        id: r.id, sreniId: r.sreni_id, submissionType: r.submission_type as 'monthly' | 'half_yearly' | 'yearly',
        name: r.name, description: r.description ?? undefined, unit: r.unit ?? undefined,
        inputType: r.input_type as 'number' | 'text', isRequired: r.is_required, sortOrder: r.sort_order,
        active: r.active, createdAt: this.ctx.toIsoTimestamp(r.created_at), updatedAt: this.ctx.toIsoTimestamp(r.updated_at),
      }));
    }
    let items = Array.from(this.ctx.sreniReportParameters.values()).filter((p) => p.sreniId === sreniId);
    if (submissionType) items = items.filter((p) => p.submissionType === submissionType);
    return items.sort((a, b) => a.sortOrder - b.sortOrder);
  }

  async createSreniReportParameter(sreniId: string, submissionType: string, dto: CreateSreniReportParameterDto): Promise<SreniReportParameterRecord> {
    await this.ctx.enumConfig.validate(ENUM_TYPES.REPORT_SUBMISSION_TYPE, submissionType, 'Submission type');
    await this.ctx.enumConfig.validate(ENUM_TYPES.REPORT_METRIC_INPUT_TYPE, dto.inputType, 'Input type');
    if (this.ctx.runtimeMode === 'db' && this.ctx.dataSource) {
      const rows = await this.ctx.dataSource.query(
        `INSERT INTO adwest.sreni_report_parameters (sreni_id, submission_type, name, description, unit, input_type, is_required, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id, sreni_id, submission_type, name, description, unit, input_type, is_required, sort_order, active, created_at, updated_at`,
        [sreniId, submissionType, dto.name, dto.description ?? null, dto.unit ?? null, dto.inputType, dto.isRequired ?? false, dto.sortOrder ?? 0],
      ) as Array<{ id: string; sreni_id: string; submission_type: string; name: string; description: string | null; unit: string | null; input_type: string; is_required: boolean; sort_order: number; active: boolean; created_at: string | Date; updated_at: string | Date }>;
      const r = rows[0];
      return { id: r.id, sreniId: r.sreni_id, submissionType: r.submission_type as 'monthly' | 'half_yearly' | 'yearly', name: r.name, description: r.description ?? undefined, unit: r.unit ?? undefined, inputType: r.input_type as 'number' | 'text', isRequired: r.is_required, sortOrder: r.sort_order, active: r.active, createdAt: this.ctx.toIsoTimestamp(r.created_at), updatedAt: this.ctx.toIsoTimestamp(r.updated_at) };
    }
    const record: SreniReportParameterRecord = {
      id: this.ctx.newId('srp'), sreniId, submissionType: submissionType as 'monthly' | 'half_yearly' | 'yearly',
      name: dto.name, description: dto.description, unit: dto.unit, inputType: dto.inputType,
      isRequired: dto.isRequired ?? false, sortOrder: dto.sortOrder ?? 0, active: true,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    this.ctx.sreniReportParameters.set(record.id, record);
    return record;
  }

  async updateSreniReportParameter(parameterId: string, dto: UpdateSreniReportParameterDto): Promise<SreniReportParameterRecord> {
    if (dto.inputType !== undefined) {
      await this.ctx.enumConfig.validate(ENUM_TYPES.REPORT_METRIC_INPUT_TYPE, dto.inputType, 'Input type');
    }
    if (this.ctx.runtimeMode === 'db' && this.ctx.dataSource) {
      await this.ctx.dataSource.query(
        `UPDATE adwest.sreni_report_parameters
         SET name=COALESCE($2, name), description=COALESCE($3, description), unit=COALESCE($4, unit),
             input_type=COALESCE($5, input_type), is_required=COALESCE($6, is_required),
             sort_order=COALESCE($7, sort_order), active=COALESCE($8, active), updated_at=now()
         WHERE id=$1`,
        [parameterId, dto.name ?? null, dto.description ?? null, dto.unit ?? null, dto.inputType ?? null, dto.isRequired ?? null, dto.sortOrder ?? null, dto.active ?? null],
      );
      const rows = await this.ctx.dataSource.query(
        `SELECT id, sreni_id, submission_type, name, description, unit, input_type, is_required, sort_order, active, created_at, updated_at
         FROM adwest.sreni_report_parameters WHERE id=$1`,
        [parameterId],
      ) as Array<{ id: string; sreni_id: string; submission_type: string; name: string; description: string | null; unit: string | null; input_type: string; is_required: boolean; sort_order: number; active: boolean; created_at: string | Date; updated_at: string | Date }>;
      if (!rows.length) throw new NotFoundException('Report parameter not found');
      const r = rows[0];
      return { id: r.id, sreniId: r.sreni_id, submissionType: r.submission_type as 'monthly' | 'half_yearly' | 'yearly', name: r.name, description: r.description ?? undefined, unit: r.unit ?? undefined, inputType: r.input_type as 'number' | 'text', isRequired: r.is_required, sortOrder: r.sort_order, active: r.active, createdAt: this.ctx.toIsoTimestamp(r.created_at), updatedAt: this.ctx.toIsoTimestamp(r.updated_at) };
    }
    const current = this.ctx.sreniReportParameters.get(parameterId);
    if (!current) throw new NotFoundException('Report parameter not found');
    const updated = { ...current, ...dto, updatedAt: new Date().toISOString() };
    this.ctx.sreniReportParameters.set(parameterId, updated);
    return updated;
  }

  async deleteSreniReportParameter(parameterId: string): Promise<{ success: boolean }> {
    if (this.ctx.runtimeMode === 'db' && this.ctx.dataSource) {
      await this.ctx.dataSource.query(`DELETE FROM adwest.sreni_report_parameters WHERE id=$1`, [parameterId]);
      return { success: true };
    }
    this.ctx.sreniReportParameters.delete(parameterId);
    return { success: true };
  }

  async toggleContactActive(sreniId: string, contactId: string, active: boolean): Promise<SreniContactRecord> {
    if (this.ctx.runtimeMode === 'db' && this.ctx.dataSource) {
      const rows = await this.ctx.dataSource.query(
        `UPDATE adwest.sreni_contacts
         SET active = $1, updated_at = now()
         WHERE id = $2 AND sreni_id = $3
         RETURNING id, sreni_id, row_index, data, zone_location_id, sthan_location_id, division_location_id, division_id, sthan_id, active, source_file, uploaded_by, created_at, updated_at`,
        [active, contactId, sreniId],
      ) as Array<{
        id: string; sreni_id: string; row_index: number;
        data: Record<string, string | number | boolean | null>;
        zone_location_id: string | null; sthan_location_id: string | null; division_location_id: string | null;
        division_id: string | null; sthan_id: string | null; active: boolean;
        source_file: string | null; uploaded_by: string | null;
        created_at: string | Date; updated_at: string | Date;
      }>;
      if (!rows[0]) throw new NotFoundException('Contact not found');
      const r = rows[0];
      return {
        id: r.id, sreniId: r.sreni_id, rowIndex: r.row_index,
        data: r.data ?? {},
        zoneLocationId: r.zone_location_id ?? undefined,
        sthanLocationId: r.sthan_location_id ?? undefined,
        divisionLocationId: r.division_location_id ?? undefined,
        divisionId: r.division_id ?? undefined,
        sthanId: r.sthan_id ?? undefined, active: r.active,
        sourceFile: r.source_file ?? undefined, uploadedBy: r.uploaded_by ?? undefined,
        createdAt: this.ctx.toIsoTimestamp(r.created_at), updatedAt: this.ctx.toIsoTimestamp(r.updated_at),
      };
    }
    const existing = this.ctx.sreniContacts.get(`${sreniId}:${contactId}`);
    if (!existing) throw new NotFoundException('Contact not found');
    const updated: SreniContactRecord = { ...existing, active, updatedAt: new Date().toISOString() };
    this.ctx.sreniContacts.set(`${sreniId}:${contactId}`, updated);
    return updated;
  }

  async deleteContact(sreniId: string, contactId: string): Promise<{ deleted: boolean }> {
    if (this.ctx.runtimeMode === 'db' && this.ctx.dataSource) {
      await this.ctx.dataSource.query(
        `DELETE FROM adwest.contact_sreni_tags WHERE contact_id = $1`,
        [contactId],
      );
      const result = await this.ctx.dataSource.query(
        `DELETE FROM adwest.sreni_contacts WHERE id = $1 AND sreni_id = $2`,
        [contactId, sreniId],
      ) as { affected?: number };
      return { deleted: (result?.affected ?? 0) > 0 };
    }
    const existed = this.ctx.sreniContacts.has(`${sreniId}:${contactId}`);
    this.ctx.sreniContacts.delete(`${sreniId}:${contactId}`);
    return { deleted: existed };
  }

  async listContactSreniTags(contactId: string): Promise<ContactSreniTagRecord[]> {
    if (this.ctx.runtimeMode === 'db' && this.ctx.dataSource) {
      const rows = await this.ctx.dataSource.query(
        `SELECT id, contact_id, sreni_id, division_id, created_at, updated_at
         FROM adwest.contact_sreni_tags
         WHERE contact_id = $1
         ORDER BY created_at ASC`,
        [contactId],
      ) as Array<{
        id: string; contact_id: string; sreni_id: string;
        division_id: string | null; created_at: string | Date; updated_at: string | Date;
      }>;
      return rows.map((r) => ({
        id: r.id,
        contactId: r.contact_id,
        sreniId: r.sreni_id,
        divisionId: r.division_id ?? undefined,
        createdAt: this.ctx.toIsoTimestamp(r.created_at),
        updatedAt: this.ctx.toIsoTimestamp(r.updated_at),
      }));
    }
    return [];
  }

  async setContactSreniTags(contactId: string, dto: SetContactSreniTagsDto): Promise<ContactSreniTagRecord[]> {
    if (this.ctx.runtimeMode === 'db' && this.ctx.dataSource) {
      await this.ctx.dataSource.query(
        `DELETE FROM adwest.contact_sreni_tags WHERE contact_id = $1`,
        [contactId],
      );
      if (dto.tags.length === 0) return [];
      const now = new Date().toISOString();
      for (const tag of dto.tags) {
        await this.ctx.dataSource.query(
          `INSERT INTO adwest.contact_sreni_tags (id, contact_id, sreni_id, division_id, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $5)
           ON CONFLICT (contact_id, sreni_id) DO UPDATE SET division_id = EXCLUDED.division_id, updated_at = EXCLUDED.updated_at`,
          [this.ctx.newId('cst'), contactId, tag.sreniId, tag.divisionId ?? null, now],
        );
      }
      return this.listContactSreniTags(contactId);
    }
    return [];
  }

  async listHouseholdMembers(sreniId: string, contactId: string): Promise<HouseholdMemberRecord[]> {
    return this.getHouseholdMembers().listMembers(sreniId, contactId);
  }

  async createHouseholdMember(
    sreniId: string,
    contactId: string,
    dto: CreateHouseholdMemberDto,
  ): Promise<HouseholdMemberRecord> {
    return this.getHouseholdMembers().createMember(sreniId, contactId, dto);
  }

  async updateHouseholdMember(
    sreniId: string,
    contactId: string,
    memberId: string,
    dto: UpdateHouseholdMemberDto,
  ): Promise<HouseholdMemberRecord> {
    return this.getHouseholdMembers().updateMember(sreniId, contactId, memberId, dto);
  }

  async deleteHouseholdMember(sreniId: string, contactId: string, memberId: string): Promise<void> {
    return this.getHouseholdMembers().deleteMember(sreniId, contactId, memberId);
  }

  async getSreniParticipantStats(sreniId: string) {
    return this.getParticipantResolver().getSreniParticipantStats(sreniId);
  }

  async listContactParticipants(sreniId: string, contactId: string): Promise<SreniParticipantRecord[]> {
    return this.getParticipantResolver().listContactParticipants(sreniId, contactId);
  }

  async listSreniParticipants(
    sreniId: string,
    page = 1,
    pageSize = 100,
  ): Promise<{ items: SreniParticipantRecord[]; total: number; page: number; pageSize: number; totalPages: number }> {
    return this.getParticipantResolver().listSreniParticipants(sreniId, page, pageSize);
  }
}
