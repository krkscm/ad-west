import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ENUM_TYPES } from '@modules/enum-values/enum-types.constants';
import { AssignContactDivisionDto, AssignContactSthanDto, CreateHouseholdMemberDto, CreateLocationReportMetricDto, CreateReportMetricDefinitionDto, CreateSreniDivisionDto, CreateSreniReportParameterDto, SetContactSreniTagsDto, SubmitSreniMonthlyReportDto, UpdateHouseholdMemberDto, UpdateLocationReportMetricDto, UpdateReportMetricDefinitionDto, UpdateSreniDivisionDto, UpdateSreniReportParameterDto } from '../dto/core-business.dto';
import type {
  HouseholdMemberEnrollmentRecord,
  HouseholdMemberRecord,
  SreniParticipantRecord,
} from '../core-business.types';
import type { ContactSreniTagRecord, ReportMetricDefinitionRecord, SreniContactRecord, SreniDivisionRecord, SreniMonthlyReportRecord, SreniReportParameterRecord, SrenyRecord } from '../core-business.service';
import { HouseholdMemberService } from './household-member.service';
import { MemberContactPersistenceService } from './member-contact-persistence.service';
import { HouseholdParticipantResolverService } from './household-participant-resolver.service';
import { HouseholdEnumConfigService, type HouseholdResolverKey } from './household-enum-config.service';
import { ContactAccessScope, ContactAccessScopeService } from './contact-access-scope.service';
import { GadaAssignmentService, type GadaListQueryOptions } from './gada-assignment.service';
import { MemberSreniRef, SevaSamithiContactService } from './seva-samithi-contact.service';

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

  private readonly contactScopeHelper = new ContactAccessScopeService();

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

  private householdSreniScopeSql(contactIdParam: string, sreniIdParam: string, isSevaSamithi: boolean): string {
    if (isSevaSamithi) {
      return `EXISTS (SELECT 1 FROM adwest.seva_samithi_contacts ssc WHERE ssc.contact_id = ${contactIdParam}::uuid)`;
    }
    return `(
      sreni_id = ${sreniIdParam}
      OR (
        sreni_id IS NULL
        AND EXISTS (
          SELECT 1 FROM adwest.contact_sreni_tags cst
          WHERE cst.contact_id = ${contactIdParam}::uuid AND cst.sreni_id = ${sreniIdParam}
        )
      )
    )`;
  }

  async assignContactDivision(sreniId: string, contactId: string, dto: AssignContactDivisionDto): Promise<SreniContactRecord> {
    const divisionId = dto.divisionId ?? undefined;
    if (this.ctx.runtimeMode === 'db' && this.ctx.dataSource) {
      const isSevaSamithi = await SevaSamithiContactService.isSevaSamithiSreni(this.ctx.dataSource, sreniId);
      const scopeSql = this.householdSreniScopeSql('$2', '$3', isSevaSamithi);

      await this.ctx.dataSource.query(
        `UPDATE adwest.contact_sreni_tags
         SET division_id = $1, updated_at = now()
         WHERE contact_id = $2::uuid AND sreni_id = $3`,
        [divisionId ?? null, contactId, sreniId],
      );

      const rows = await this.ctx.dataSource.query(
        `UPDATE adwest.sreni_contacts
         SET division_id = $1, updated_at = now()
         WHERE id = $2::uuid
           AND contact_kind = 'household'
           AND sreni_id = $3
         RETURNING id, sreni_id, row_index, data, zone_location_id, sthan_location_id, division_location_id, division_id, COALESCE(active, true) AS active, source_file, uploaded_by, created_at, updated_at`,
        [divisionId ?? null, contactId, sreniId],
      ) as Array<{
        id: string; sreni_id: string; row_index: number;
        data: Record<string, string | number | boolean | null>;
        zone_location_id: string | null; sthan_location_id: string | null; division_location_id: string | null;
        division_id: string | null; active: boolean; source_file: string | null;
        uploaded_by: string | null; created_at: string | Date; updated_at: string | Date;
      }>;
      if (rows[0]) {
        const r = rows[0];
        const updated: SreniContactRecord = {
          id: r.id,
          sreniId: isSevaSamithi ? sreniId : r.sreni_id,
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

      const tagOnlyRows = await this.ctx.dataSource.query(
        `SELECT c.id, c.sreni_id, c.row_index, c.data, c.zone_location_id, c.sthan_location_id,
                c.division_location_id, c.division_id, c.sthan_id, COALESCE(c.active, true) AS active,
                c.source_file, c.uploaded_by, c.created_at, c.updated_at
         FROM adwest.sreni_contacts c
         WHERE c.id = $1::uuid
           AND c.contact_kind = 'household'
           AND ${scopeSql}
         LIMIT 1`,
        isSevaSamithi ? [contactId] : [contactId, sreniId],
      ) as Array<{
        id: string; sreni_id: string | null; row_index: number;
        data: Record<string, string | number | boolean | null>;
        zone_location_id: string | null; sthan_location_id: string | null; division_location_id: string | null;
        division_id: string | null; sthan_id: string | null; active: boolean;
        source_file: string | null; uploaded_by: string | null;
        created_at: string | Date; updated_at: string | Date;
      }>;
      if (!tagOnlyRows[0]) throw new NotFoundException('Contact not found');
      const tagRow = tagOnlyRows[0];
      const tagUpdated: SreniContactRecord = {
        id: tagRow.id,
        sreniId: tagRow.sreni_id,
        rowIndex: tagRow.row_index,
        data: tagRow.data ?? {},
        zoneLocationId: tagRow.zone_location_id ?? undefined,
        sthanLocationId: tagRow.sthan_location_id ?? undefined,
        divisionLocationId: tagRow.division_location_id ?? undefined,
        divisionId: divisionId,
        sthanId: tagRow.sthan_id ?? undefined,
        active: tagRow.active ?? true,
        sourceFile: tagRow.source_file ?? undefined,
        uploadedBy: tagRow.uploaded_by ?? undefined,
        createdAt: this.ctx.toIsoTimestamp(tagRow.created_at),
        updatedAt: new Date().toISOString(),
      };
      this.ctx.sreniContacts.set(`${sreniId}:${contactId}`, tagUpdated);
      return tagUpdated;
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
      const isSevaSamithi = await SevaSamithiContactService.isSevaSamithiSreni(this.ctx.dataSource, sreniId);
      const scopeSql = this.householdSreniScopeSql('$2', '$3', isSevaSamithi);
      let sthanName: string | null = null;
      let zoneLocationId: string | null = null;
      if (sthanId) {
        const locRows = await this.ctx.dataSource.query(
          `SELECT name, parent_id::text AS parent_id
           FROM adwest.locations WHERE id::text = $1 AND level = 'sthan' LIMIT 1`,
          [sthanId],
        ) as Array<{ name: string; parent_id: string | null }>;
        sthanName = locRows[0]?.name ?? null;
        zoneLocationId = locRows[0]?.parent_id ?? null;
      }

      const rows = await this.ctx.dataSource.query(
        `UPDATE adwest.sreni_contacts
         SET sthan_id = $1,
             sthan_location_id = CASE WHEN $1 IS NULL THEN NULL ELSE $1::uuid END,
             location_id = CASE WHEN $1 IS NULL THEN NULL ELSE $1::uuid END,
             zone_location_id = CASE WHEN $4::uuid IS NULL THEN zone_location_id ELSE $4::uuid END,
             data = CASE
               WHEN $5::text IS NULL THEN data
               ELSE jsonb_set(COALESCE(data, '{}'::jsonb), '{sthan}', to_jsonb($5::text), true)
             END,
             updated_at = now()
         WHERE id = $2::uuid
           AND contact_kind = 'household'
           AND ${scopeSql}
         RETURNING id, sreni_id, row_index, data, zone_location_id, sthan_location_id, division_location_id, division_id, sthan_id, COALESCE(active, true) AS active, source_file, uploaded_by, created_at, updated_at`,
        isSevaSamithi
          ? [sthanId ?? null, contactId, sreniId, zoneLocationId, sthanName]
          : [sthanId ?? null, contactId, sreniId, zoneLocationId, sthanName],
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
        id: r.id, sreniId: isSevaSamithi ? sreniId : r.sreni_id, rowIndex: r.row_index,
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
    scope?: ContactAccessScope,
    gadaOptions?: GadaListQueryOptions,
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
    gadaAssignmentEnabled: boolean;
    canManageGadaAssignments: boolean;
  }> {
    const gadaService = new GadaAssignmentService(this.ctx.dataSource);
    const gadaEnabled = this.ctx.dataSource && scope
      ? await gadaService.isGadaEnabled(sreniId)
      : false;
    const canManageGadaAssignments = Boolean(scope && gadaEnabled && gadaService.isAssignmentCoordinator(scope));
    const gadaJoins: string[] = [];

    const enrollmentScope = await this.getHouseholdMembers().getSreniEnrollmentScope(sreniId);
    const participantStats = await this.getParticipantResolver().getSreniParticipantStats(sreniId);
    const primaryContactStrategy = participantStats.strategy;
    const resolverKey = participantStats.resolverKey;
    const participantTotal = participantStats.participantCount;

    if (this.ctx.runtimeMode === 'db' && this.ctx.dataSource) {
      if (await SevaSamithiContactService.isSevaSamithiSreni(this.ctx.dataSource, sreniId)) {
        return this.listSevaSamithiContacts(
          sreniId,
          page,
          pageSize,
          scope,
          enrollmentScope,
          primaryContactStrategy,
          resolverKey,
          participantTotal,
        );
      }

      const offset = (page - 1) * pageSize;

      if (primaryContactStrategy === 'ENROLLED_CHILDREN') {
        const childConditions = [
          `c.sreni_id = $1`,
          `c.contact_kind = 'child'`,
          `COALESCE(c.active, true) = true`,
        ];
        const childParams: unknown[] = [sreniId];
        let childParamIdx = 2;
        if (scope) {
          childParamIdx = this.contactScopeHelper.appendStahanSql('c', scope, childConditions, childParams, childParamIdx);
        }
        if (gadaEnabled && scope) {
          gadaService.appendGadaJoin(sreniId, 'c', gadaJoins);
          childParamIdx = gadaService.appendGadaListFilter(
            sreniId, scope, gadaEnabled, gadaOptions, childConditions, childParams, childParamIdx,
          );
        }
        const childJoinSql = gadaJoins.length ? ` ${gadaJoins.join(' ')}` : '';
        const childWhere = `WHERE ${childConditions.join(' AND ')}`;
        const childLimitIdx = childParamIdx;
        const childOffsetIdx = childParamIdx + 1;

        const [countRows, rows] = await Promise.all([
          this.ctx.dataSource.query(
            `SELECT COUNT(*)::int AS total FROM adwest.sreni_contacts c${childJoinSql} ${childWhere}`,
            childParams,
          ) as Promise<Array<{ total: number }>>,
          this.ctx.dataSource.query(
            `SELECT c.id, c.sreni_id, c.row_index, c.data,
                    c.zone_location_id, c.sthan_location_id, c.division_location_id,
                    c.division_id, c.sthan_id, c.parent_contact_id,
                    COALESCE(c.active, true) AS active,
                    c.source_file, c.uploaded_by, c.created_at, c.updated_at,
                    COALESCE(s.name, c.sreni_id) AS sreni_name,
                    false AS is_tagged,
                    0 AS child_count,
                    NULL::text AS children_division_summary,
                    0 AS participant_count,
                    cga.gadanayak_user_id::text AS gadanayak_user_id,
                    gadanayak_u.name AS gadanayak_user_name
             FROM adwest.sreni_contacts c
             LEFT JOIN adwest.srenies s ON s.id::text = c.sreni_id
             ${childJoinSql}
             ${childWhere}
             ORDER BY c.row_index ASC
             LIMIT $${childLimitIdx} OFFSET $${childOffsetIdx}`,
            [...childParams, pageSize, offset],
          ) as Promise<Array<{
            id: string; sreni_id: string; row_index: number;
            data: Record<string, string | number | boolean | null>;
            zone_location_id: string | null; sthan_location_id: string | null; division_location_id: string | null;
            division_id: string | null; sthan_id: string | null; parent_contact_id: string | null; active: boolean;
            source_file: string | null; uploaded_by: string | null;
            created_at: string | Date; updated_at: string | Date;
            sreni_name: string; is_tagged: boolean;
            child_count: number; children_division_summary: string | null;
            participant_count: number;
            gadanayak_user_id: string | null;
            gadanayak_user_name: string | null;
          }>>,
        ]);
        const total = countRows[0]?.total ?? 0;
        const totalPages = Math.max(1, Math.ceil(total / pageSize));
        const items = rows.map((r) => ({
          id: r.id,
          sreniId: r.sreni_id,
          sreniName: r.sreni_name,
          rowIndex: r.row_index,
          data: r.data ?? {},
          contactKind: 'child' as const,
          parentContactId: r.parent_contact_id ?? undefined,
          zoneLocationId: r.zone_location_id ?? undefined,
          sthanLocationId: r.sthan_location_id ?? undefined,
          divisionLocationId: r.division_location_id ?? undefined,
          divisionId: r.division_id ?? undefined,
          sthanId: r.sthan_id ?? undefined,
          gadanayakUserId: r.gadanayak_user_id ?? undefined,
          gadanayakUserName: r.gadanayak_user_name ?? undefined,
          active: r.active ?? true,
          sourceFile: r.source_file ?? undefined,
          uploadedBy: r.uploaded_by ?? undefined,
          childCount: 0,
          childrenDivisionSummary: undefined,
          participantCount: 0,
          isTagged: false,
          createdAt: this.ctx.toIsoTimestamp(r.created_at),
          updatedAt: this.ctx.toIsoTimestamp(r.updated_at),
        }));
        return {
          items,
          total,
          page,
          pageSize,
          totalPages,
          enrollmentScope,
          primaryContactStrategy,
          resolverKey,
          participantTotal,
          gadaAssignmentEnabled: gadaEnabled,
          canManageGadaAssignments,
        };
      }

      const femaleGenders = resolverKey === 'female_participants'
        ? await this.ctx.enumConfig.getFemaleGenderMatches()
        : null;
      const householdConditions = [
        `c.contact_kind = 'household'`,
        `COALESCE(c.active, true) = true`,
        `(c.sreni_id = $1 OR cst.id IS NOT NULL)`,
      ];
      const householdParams: unknown[] = [sreniId];
      let householdParamIdx = 2;
      if (scope) {
        householdParamIdx = this.contactScopeHelper.appendStahanSql('c', scope, householdConditions, householdParams, householdParamIdx);
      }
      if (gadaEnabled && scope) {
        gadaService.appendGadaJoin(sreniId, 'c', gadaJoins);
        householdParamIdx = gadaService.appendGadaListFilter(
          sreniId, scope, gadaEnabled, gadaOptions, householdConditions, householdParams, householdParamIdx,
        );
      }
      const householdJoinSql = gadaJoins.length ? ` ${gadaJoins.join(' ')}` : '';
      const femaleGendersParamIdx = householdParamIdx;
      const participantCountSelect = femaleGenders
        ? `(SELECT COUNT(*)::int
            FROM adwest.household_members hm
            WHERE hm.contact_id = c.id AND hm.active = true
              AND (
                LOWER(COALESCE(hm.gender, '')) = ANY($${femaleGendersParamIdx}::text[])
                OR (hm.role = 'spouse' AND hm.source = 'import')
              )) AS participant_count`
        : '0 AS participant_count';
      const householdWhere = `WHERE ${householdConditions.join(' AND ')}`;
      const householdLimitIdx = femaleGenders ? femaleGendersParamIdx + 1 : householdParamIdx;
      const householdOffsetIdx = femaleGenders ? femaleGendersParamIdx + 2 : householdParamIdx + 1;
      const householdListParams: Array<string | number | string[]> = femaleGenders
        ? [...householdParams, femaleGenders, pageSize, offset] as Array<string | number | string[]>
        : [...householdParams, pageSize, offset] as Array<string | number | string[]>;

      const [countRows, rows] = await Promise.all([
        this.ctx.dataSource.query(
          `SELECT COUNT(DISTINCT c.id)::int AS total
           FROM adwest.sreni_contacts c
           LEFT JOIN adwest.contact_sreni_tags cst ON cst.contact_id = c.id AND cst.sreni_id = $1
           ${householdJoinSql}
           ${householdWhere}`,
          householdParams,
        ) as Promise<Array<{ total: number }>>,
        this.ctx.dataSource.query(
          `SELECT c.id, c.sreni_id, c.row_index, c.data,
                  c.zone_location_id, c.sthan_location_id, c.division_location_id,
                  CASE WHEN c.sreni_id = $1 THEN c.division_id ELSE cst.division_id END AS division_id,
                  c.sthan_id, COALESCE(c.active, true) AS active,
                  c.source_file, c.uploaded_by, c.created_at, c.updated_at,
                  COALESCE(s.name, c.sreni_id) AS sreni_name,
                  (c.sreni_id != $1) AS is_tagged,
                  cga.gadanayak_user_id::text AS gadanayak_user_id,
                  gadanayak_u.name AS gadanayak_user_name,
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
           ${householdJoinSql}
           ${householdWhere}
           ORDER BY (c.sreni_id = $1) DESC, c.row_index ASC
           LIMIT $${householdLimitIdx} OFFSET $${householdOffsetIdx}`,
          householdListParams,
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
          gadanayak_user_id: string | null;
          gadanayak_user_name: string | null;
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
        gadanayakUserId: r.gadanayak_user_id ?? undefined,
        gadanayakUserName: r.gadanayak_user_name ?? undefined,
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
      return {
        items, total, page, pageSize, totalPages, enrollmentScope, primaryContactStrategy, resolverKey, participantTotal,
        gadaAssignmentEnabled: gadaEnabled,
        canManageGadaAssignments,
      };
    }
    // In-memory: direct contacts + tagged contacts
    const taggedIds = new Set(
      Array.from(this.ctx.sreniContacts.values())
        .filter((c) => c.sreniId !== sreniId)
        .map((c) => c.id),
    );
    const all = Array.from(this.ctx.sreniContacts.values())
      .filter((c) => c.sreniId === sreniId || taggedIds.has(c.id))
      .filter((c) => !scope || this.contactScopeHelper.matchesScopeInMemory(scope, {
        sreniId: c.sreniId,
        sthanLocationId: c.sthanLocationId,
        sthanId: c.sthanId,
      }, sreniId))
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
      gadaAssignmentEnabled: false,
      canManageGadaAssignments: false,
    };
  }

  private async listSevaSamithiContacts(
    sreniId: string,
    page: number,
    pageSize: number,
    scope: ContactAccessScope | undefined,
    enrollmentScope: string,
    primaryContactStrategy: string,
    resolverKey: HouseholdResolverKey,
    participantTotal: number,
  ): Promise<{
    items: (SreniContactRecord & { sreniName: string; isTagged: boolean; memberSrenis?: MemberSreniRef[] })[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
    enrollmentScope: string;
    primaryContactStrategy: string;
    resolverKey: HouseholdResolverKey;
    participantTotal: number;
    gadaAssignmentEnabled: boolean;
    canManageGadaAssignments: boolean;
  }> {
    if (!this.ctx.dataSource) {
      return {
        items: [],
        total: 0,
        page,
        pageSize,
        totalPages: 1,
        enrollmentScope,
        primaryContactStrategy,
        resolverKey,
        participantTotal,
        gadaAssignmentEnabled: false,
        canManageGadaAssignments: false,
      };
    }

    const offset = (page - 1) * pageSize;
    const conditions = [
      `c.contact_kind = 'household'`,
      `COALESCE(c.active, true) = true`,
    ];
    const params: unknown[] = [];
    let paramIdx = 1;
    if (scope) {
      paramIdx = this.contactScopeHelper.appendStahanSql('c', scope, conditions, params, paramIdx);
    }
    const whereClause = `WHERE ${conditions.join(' AND ')}`;
    const limitIdx = paramIdx;
    const offsetIdx = paramIdx + 1;
    const sreniName = this.ctx.srenies.get(sreniId)?.name ?? sreniId;

    const [countRows, rows] = await Promise.all([
      this.ctx.dataSource.query(
        `SELECT COUNT(*)::int AS total
         FROM adwest.seva_samithi_contacts ssc
         INNER JOIN adwest.sreni_contacts c ON c.id = ssc.contact_id
         ${whereClause}`,
        params,
      ) as Promise<Array<{ total: number }>>,
      this.ctx.dataSource.query(
        `SELECT c.id, c.sreni_id, c.row_index, c.data, c.sr_no,
                c.zone_location_id, c.sthan_location_id, c.division_location_id,
                c.division_id, c.sthan_id, COALESCE(c.active, true) AS active,
                c.source_file, c.uploaded_by, c.created_at, c.updated_at,
                COALESCE((
                  SELECT json_agg(json_build_object('sreniId', tag_s.id::text, 'sreniName', tag_s.name) ORDER BY tag_s.name)
                  FROM adwest.contact_sreni_tags cst_inner
                  INNER JOIN adwest.srenies tag_s ON tag_s.id::text = cst_inner.sreni_id
                  WHERE cst_inner.contact_id = c.id
                ), '[]'::json) AS member_srenis
         FROM adwest.seva_samithi_contacts ssc
         INNER JOIN adwest.sreni_contacts c ON c.id = ssc.contact_id
         ${whereClause}
         ORDER BY c.sr_no ASC NULLS LAST, c.row_index ASC
         LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
        [...params, pageSize, offset],
      ) as Promise<Array<{
        id: string; sreni_id: string | null; row_index: number;
        data: Record<string, string | number | boolean | null>;
        sr_no: number | null;
        zone_location_id: string | null; sthan_location_id: string | null; division_location_id: string | null;
        division_id: string | null; sthan_id: string | null; active: boolean;
        source_file: string | null; uploaded_by: string | null;
        created_at: string | Date; updated_at: string | Date;
        member_srenis: unknown;
      }>>,
    ]);

    const sevaService = new SevaSamithiContactService(this.ctx.dataSource);
    const total = countRows[0]?.total ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const items = rows.map((r) => ({
      id: r.id,
      sreniId: sreniId,
      rowIndex: r.row_index,
      data: r.data ?? {},
      contactKind: 'household' as const,
      srNo: r.sr_no ?? undefined,
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
      sreniName,
      isTagged: false,
      memberSrenis: sevaService.parseMemberSrenis(r.member_srenis),
    }));

    return {
      items,
      total,
      page,
      pageSize,
      totalPages,
      enrollmentScope,
      primaryContactStrategy,
      resolverKey,
      participantTotal: total,
      gadaAssignmentEnabled: false,
      canManageGadaAssignments: false,
    };
  }

  async clearSreniContacts(sreniId: string): Promise<{ deleted: number; sreniId: string }> {
    if (this.ctx.runtimeMode === 'db' && this.ctx.dataSource) {
      if (await SevaSamithiContactService.isSevaSamithiSreni(this.ctx.dataSource, sreniId)) {
        const sevaService = new SevaSamithiContactService(this.ctx.dataSource);
        const deleted = await sevaService.clearRegistry();
        return { deleted, sreniId };
      }

      const strategyRows = await this.ctx.dataSource.query(
        `SELECT primary_contact_strategy FROM adwest.srenies WHERE id = $1`,
        [sreniId],
      ) as Array<{ primary_contact_strategy: string | null }>;
      const strategy = strategyRows[0]?.primary_contact_strategy ?? 'HOUSEHOLD_HEAD';

      if (strategy === 'ENROLLED_CHILDREN') {
        const result = await this.ctx.dataSource.query(
          `DELETE FROM adwest.sreni_contacts
           WHERE sreni_id = $1 AND contact_kind = 'child'`,
          [sreniId],
        );
        return { deleted: result[1] ?? 0, sreniId };
      }

      await this.ctx.dataSource.query(
        `DELETE FROM adwest.contact_sreni_tags WHERE sreni_id = $1`,
        [sreniId],
      );
      const tagClear = await this.ctx.dataSource.query(
        `UPDATE adwest.sreni_contacts SET sreni_id = NULL, updated_at = now()
         WHERE sreni_id = $1 AND contact_kind = 'household'`,
        [sreniId],
      );
      return { deleted: tagClear[1] ?? 0, sreniId };
    }

    let deleted = 0;
    for (const [key, c] of this.ctx.sreniContacts) {
      if (c.sreniId === sreniId) {
        this.ctx.sreniContacts.delete(key);
        deleted++;
      }
    }
    return { deleted, sreniId };
  }

  async listAllContacts(
    page = 1,
    pageSize = 50,
    filters?: { sreniId?: string; sthanId?: string; search?: string },
    scope?: ContactAccessScope,
  ): Promise<{ items: (SreniContactRecord & { sreniName: string })[]; total: number; page: number; pageSize: number; totalPages: number }> {
    if (this.ctx.runtimeMode === 'db' && this.ctx.dataSource) {
      const conditions: string[] = [`c.contact_kind = 'household'`];
      const params: unknown[] = [];
      let paramIdx = 1;

      if (scope) {
        paramIdx = this.contactScopeHelper.appendAllowedSreniSql('c', scope, conditions, params, paramIdx);
        paramIdx = this.contactScopeHelper.appendStahanSql('c', scope, conditions, params, paramIdx);
      }

      if (filters?.sreniId) {
        conditions.push(
          `(c.sreni_id = $${paramIdx} OR EXISTS (
             SELECT 1 FROM adwest.contact_sreni_tags cst
             WHERE cst.contact_id = c.id AND cst.sreni_id = $${paramIdx}
           ))`,
        );
        params.push(filters.sreniId);
        paramIdx += 1;
      }
      if (filters?.sthanId) {
        conditions.push(`(c.sthan_location_id::text = $${paramIdx} OR c.location_id::text = $${paramIdx})`);
        params.push(filters.sthanId);
        paramIdx += 1;
      }
      if (filters?.search?.trim()) {
        conditions.push(
          `(COALESCE(c.data->>'name', '') ILIKE $${paramIdx}
            OR COALESCE(c.data->>'mobileNo', '') ILIKE $${paramIdx})`,
        );
        params.push(`%${filters.search.trim()}%`);
        paramIdx += 1;
      }

      const whereClause = `WHERE ${conditions.join(' AND ')}`;

      const countRows = await this.ctx.dataSource.query(
        `SELECT COUNT(*)::int AS total FROM adwest.sreni_contacts c ${whereClause}`,
        params,
      ) as Array<{ total: number }>;
      const total = countRows[0]?.total ?? 0;
      const totalPages = Math.max(1, Math.ceil(total / pageSize));
      const offset = (page - 1) * pageSize;
      const limitIdx = paramIdx;
      const offsetIdx = paramIdx + 1;
      const rows = await this.ctx.dataSource.query(
        `SELECT c.id, c.sreni_id, c.row_index, c.data, c.sr_no, c.contact_kind,
          c.zone_location_id, c.sthan_location_id, c.division_location_id,
          c.division_id, c.sthan_id,
                COALESCE(c.active, true) AS active,
                c.source_file, c.uploaded_by, c.created_at, c.updated_at,
                COALESCE(s.name, c.sreni_id) AS sreni_name
         FROM adwest.sreni_contacts c
         LEFT JOIN adwest.srenies s ON s.id::text = c.sreni_id
         ${whereClause}
         ORDER BY c.sr_no ASC NULLS LAST, c.row_index ASC
         LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
        [...params, pageSize, offset],
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
        contactKind: (r as { contact_kind?: string }).contact_kind as 'household' | 'child' | undefined,
        srNo: (r as { sr_no?: number | null }).sr_no ?? undefined,
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

    let all = Array.from(this.ctx.sreniContacts.values())
      .filter((c) => !c.contactKind || c.contactKind === 'household')
      .filter((c) => !scope || this.contactScopeHelper.matchesScopeInMemory(scope, {
        sreniId: c.sreniId,
        sthanLocationId: c.sthanLocationId,
        sthanId: c.sthanId,
      }))
      .map((c) => ({
        ...c,
        sreniName: (c.sreniId ? (this.ctx.srenies.get(c.sreniId)?.name ?? c.sreniId) : '') as string,
      }));

    if (filters?.sreniId) {
      all = all.filter((c) => c.sreniId === filters.sreniId);
    }
    if (filters?.sthanId) {
      all = all.filter((c) => c.sthanId === filters.sthanId);
    }
    if (filters?.search?.trim()) {
      const q = filters.search.trim().toLowerCase();
      all = all.filter((c) => String(c.data?.name ?? '').toLowerCase().includes(q));
    }

    all = all.sort((a, b) => a.sreniName.localeCompare(b.sreniName) || a.rowIndex - b.rowIndex);
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

  async updateHouseholdContact(
    contactId: string,
    data: Record<string, string | number | boolean | null>,
  ): Promise<SreniContactRecord> {
    const persistence = new MemberContactPersistenceService();
    await persistence.updateHouseholdContact(this.ctx, contactId, data);

    if (this.ctx.runtimeMode === 'db' && this.ctx.dataSource) {
      const rows = await this.ctx.dataSource.query(
        `SELECT c.id, c.sreni_id, c.row_index, c.data,
                c.zone_location_id, c.sthan_location_id, c.division_location_id,
                c.division_id, c.sthan_id, COALESCE(c.active, true) AS active,
                c.contact_kind, c.sr_no, c.source_file, c.uploaded_by, c.created_at, c.updated_at,
                COALESCE(s.name, '') AS sreni_name
         FROM adwest.sreni_contacts c
         LEFT JOIN adwest.srenies s ON s.id::text = c.sreni_id
         WHERE c.id = $1::uuid AND c.contact_kind = 'household'
         LIMIT 1`,
        [contactId],
      ) as Array<{
        id: string; sreni_id: string | null; row_index: number;
        data: Record<string, string | number | boolean | null>;
        zone_location_id: string | null; sthan_location_id: string | null; division_location_id: string | null;
        division_id: string | null; sthan_id: string | null; active: boolean;
        contact_kind: string; sr_no: number | null;
        source_file: string | null; uploaded_by: string | null;
        created_at: string | Date; updated_at: string | Date; sreni_name: string;
      }>;
      if (!rows[0]) throw new NotFoundException('Contact not found');
      const r = rows[0];
      return {
        id: r.id,
        sreniId: r.sreni_id,
        rowIndex: r.row_index,
        data: r.data ?? {},
        contactKind: 'household',
        srNo: r.sr_no ?? undefined,
        zoneLocationId: r.zone_location_id ?? undefined,
        sthanLocationId: r.sthan_location_id ?? undefined,
        divisionLocationId: r.division_location_id ?? undefined,
        divisionId: r.division_id ?? undefined,
        sthanId: r.sthan_id ?? undefined,
        active: r.active,
        sourceFile: r.source_file ?? undefined,
        uploadedBy: r.uploaded_by ?? undefined,
        createdAt: this.ctx.toIsoTimestamp(r.created_at),
        updatedAt: this.ctx.toIsoTimestamp(r.updated_at),
      };
    }

    const existing = Array.from(this.ctx.sreniContacts.values()).find((c) => c.id === contactId);
    if (!existing) throw new NotFoundException('Contact not found');
    const updated: SreniContactRecord = {
      ...existing,
      data: { ...existing.data, ...data },
      updatedAt: new Date().toISOString(),
    };
    const key = existing.sreniId ? `${existing.sreniId}:${contactId}` : `global:${contactId}`;
    this.ctx.sreniContacts.set(key, updated);
    return updated;
  }

  async updateContactData(
    sreniId: string,
    contactId: string,
    data: Record<string, string | number | boolean | null>,
  ): Promise<SreniContactRecord> {
    if (this.ctx.runtimeMode === 'db' && this.ctx.dataSource) {
      const kindRows = await this.ctx.dataSource.query(
        `SELECT contact_kind, sreni_id FROM adwest.sreni_contacts WHERE id = $1::uuid LIMIT 1`,
        [contactId],
      ) as Array<{ contact_kind: string; sreni_id: string | null }>;
      if (!kindRows[0]) throw new NotFoundException('Contact not found');
      if (kindRows[0].contact_kind === 'household') {
        return this.updateHouseholdContact(contactId, data);
      }

      const existingRows = await this.ctx.dataSource.query(
        `SELECT data FROM adwest.sreni_contacts WHERE id = $1 AND sreni_id = $2`,
        [contactId, sreniId],
      ) as Array<{ data: Record<string, string | number | boolean | null> }>;
      if (!existingRows[0]) throw new NotFoundException('Contact not found');

      const merged = { ...(existingRows[0].data ?? {}), ...data };
      const rows = await this.ctx.dataSource.query(
        `UPDATE adwest.sreni_contacts
         SET data = $1::jsonb, updated_at = now()
         WHERE id = $2 AND sreni_id = $3
         RETURNING id, sreni_id, row_index, data, zone_location_id, sthan_location_id, division_location_id, division_id, sthan_id, COALESCE(active, true) AS active, source_file, uploaded_by, created_at, updated_at`,
        [JSON.stringify(merged), contactId, sreniId],
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
    const updated: SreniContactRecord = {
      ...existing,
      data: { ...existing.data, ...data },
      updatedAt: new Date().toISOString(),
    };
    this.ctx.sreniContacts.set(`${sreniId}:${contactId}`, updated);
    return updated;
  }

  async toggleContactActive(sreniId: string, contactId: string, active: boolean): Promise<SreniContactRecord> {
    if (this.ctx.runtimeMode === 'db' && this.ctx.dataSource) {
      const isSevaSamithi = await SevaSamithiContactService.isSevaSamithiSreni(this.ctx.dataSource, sreniId);
      const rows = await this.ctx.dataSource.query(
        `UPDATE adwest.sreni_contacts
         SET active = $1, updated_at = now()
         WHERE id = $2::uuid
           AND contact_kind = 'household'
           AND ${isSevaSamithi
    ? `EXISTS (SELECT 1 FROM adwest.seva_samithi_contacts ssc WHERE ssc.contact_id = $2::uuid)`
    : 'sreni_id = $3'}
         RETURNING id, sreni_id, row_index, data, zone_location_id, sthan_location_id, division_location_id, division_id, sthan_id, active, source_file, uploaded_by, created_at, updated_at`,
        isSevaSamithi ? [active, contactId] : [active, contactId, sreniId],
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
        id: r.id, sreniId: isSevaSamithi ? sreniId : r.sreni_id, rowIndex: r.row_index,
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
      if (await SevaSamithiContactService.isSevaSamithiSreni(this.ctx.dataSource, sreniId)) {
        const sevaService = new SevaSamithiContactService(this.ctx.dataSource);
        const deleted = await sevaService.removeRegistryEntry(contactId);
        return { deleted };
      }

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
    const byContactId = await this.listContactSreniTagsBatch([contactId]);
    return byContactId[contactId] ?? [];
  }

  async listContactSreniTagsBatch(contactIds: string[]): Promise<Record<string, ContactSreniTagRecord[]>> {
    const uniqueIds = [...new Set(contactIds.map((id) => id.trim()).filter(Boolean))];
    const result: Record<string, ContactSreniTagRecord[]> = Object.fromEntries(
      uniqueIds.map((id) => [id, []]),
    );
    if (!uniqueIds.length) return result;

    if (this.ctx.runtimeMode === 'db' && this.ctx.dataSource) {
      const rows = await this.ctx.dataSource.query(
        `SELECT id, contact_id, sreni_id, division_id, created_at, updated_at
         FROM adwest.contact_sreni_tags
         WHERE contact_id = ANY($1::uuid[])
         ORDER BY contact_id ASC, created_at ASC`,
        [uniqueIds],
      ) as Array<{
        id: string; contact_id: string; sreni_id: string;
        division_id: string | null; created_at: string | Date; updated_at: string | Date;
      }>;
      for (const r of rows) {
        const list = result[r.contact_id] ?? [];
        list.push({
          id: r.id,
          contactId: r.contact_id,
          sreniId: r.sreni_id,
          divisionId: r.division_id ?? undefined,
          createdAt: this.ctx.toIsoTimestamp(r.created_at),
          updatedAt: this.ctx.toIsoTimestamp(r.updated_at),
        });
        result[r.contact_id] = list;
      }
    }
    return result;
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
