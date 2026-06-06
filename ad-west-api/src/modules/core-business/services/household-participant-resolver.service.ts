import { NotFoundException } from '@nestjs/common';
import type {
  HouseholdMemberRecord,
  SreniContactCellValue,
  SreniParticipantRecord,
} from '../core-business.types';
import type { SreniAdminRuntimeContext } from './sreni-admin-runtime.service';
import { HouseholdMemberService } from './household-member.service';
import { HOUSEHOLD_ENUM_TYPES, type HouseholdResolverKey } from './household-enum-config.service';

const cellToString = (value: SreniContactCellValue | undefined): string | null => {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text.length ? text : null;
};

type DbParticipantRow = {
  member_id: string | null;
  contact_id: string;
  role: string;
  name: string;
  phone: string | null;
  email: string | null;
  gender: string | null;
  date_of_birth: string | Date | null;
  division_id: string | null;
  division_name: string | null;
  household_phone: string | null;
  household_name: string | null;
  contact_data: Record<string, SreniContactCellValue> | null;
};

export class HouseholdParticipantResolverService {
  private householdMembers: HouseholdMemberService;

  constructor(private readonly ctx: SreniAdminRuntimeContext) {
    this.householdMembers = new HouseholdMemberService(ctx);
  }

  async getSreniParticipantStrategy(sreniId: string): Promise<string> {
    if (this.ctx.runtimeMode === 'db' && this.ctx.dataSource) {
      const rows = await this.ctx.dataSource.query(
        `SELECT primary_contact_strategy FROM adwest.srenies WHERE id = $1`,
        [sreniId],
      ) as Array<{ primary_contact_strategy: string | null }>;
      if (!rows[0]) throw new NotFoundException('Sreni not found');
      return rows[0].primary_contact_strategy
        ?? await this.ctx.enumConfig.getDefaultValue(HOUSEHOLD_ENUM_TYPES.PRIMARY_CONTACT_STRATEGY);
    }
    return this.ctx.enumConfig.getDefaultValue(HOUSEHOLD_ENUM_TYPES.PRIMARY_CONTACT_STRATEGY);
  }

  async getSreniResolverKey(sreniId: string): Promise<HouseholdResolverKey> {
    const strategy = await this.getSreniParticipantStrategy(sreniId);
    return this.ctx.enumConfig.resolveStrategyKey(strategy);
  }

  async getSreniParticipantStats(sreniId: string): Promise<{
    strategy: string;
    resolverKey: HouseholdResolverKey;
    householdCount: number;
    participantCount: number;
  }> {
    const strategy = await this.getSreniParticipantStrategy(sreniId);
    const resolverKey = await this.ctx.enumConfig.resolveStrategyKey(strategy);

    if (this.ctx.runtimeMode === 'db' && this.ctx.dataSource) {
      const householdRows = await this.ctx.dataSource.query(
        `SELECT COUNT(DISTINCT c.id)::int AS total
         FROM adwest.sreni_contacts c
         LEFT JOIN adwest.contact_sreni_tags cst ON cst.contact_id = c.id AND cst.sreni_id = $1
         WHERE (c.sreni_id = $1 OR cst.id IS NOT NULL) AND COALESCE(c.active, true) = true`,
        [sreniId],
      ) as Array<{ total: number }>;
      const householdCount = householdRows[0]?.total ?? 0;

      let participantCount = householdCount;
      if (resolverKey === 'enrolled_children') {
        const childRole = 'child';
        const rows = await this.ctx.dataSource.query(
          `SELECT COUNT(*)::int AS total
           FROM adwest.household_members hm
           INNER JOIN adwest.household_member_sreni_enrollments e
             ON e.member_id = hm.id AND e.sreni_id = $1 AND e.active = true
           INNER JOIN adwest.sreni_contacts c ON c.id = hm.contact_id
           LEFT JOIN adwest.contact_sreni_tags cst ON cst.contact_id = c.id AND cst.sreni_id = $1
           WHERE hm.role = $2 AND hm.active = true
             AND COALESCE(c.active, true) = true
             AND (c.sreni_id = $1 OR cst.id IS NOT NULL)`,
          [sreniId, childRole],
        ) as Array<{ total: number }>;
        participantCount = rows[0]?.total ?? 0;
      } else if (resolverKey === 'female_participants') {
        const genders = await this.ctx.enumConfig.getFemaleGenderMatches();
        const rows = await this.ctx.dataSource.query(
          `SELECT COUNT(*)::int AS total
           FROM adwest.household_members hm
           INNER JOIN adwest.sreni_contacts c ON c.id = hm.contact_id
           LEFT JOIN adwest.contact_sreni_tags cst ON cst.contact_id = c.id AND cst.sreni_id = $1
           WHERE hm.active = true
             AND COALESCE(c.active, true) = true
             AND (c.sreni_id = $1 OR cst.id IS NOT NULL)
             AND (
               LOWER(COALESCE(hm.gender, '')) = ANY($2::text[])
               OR (hm.role = 'spouse' AND hm.source = 'import')
             )`,
          [sreniId, genders],
        ) as Array<{ total: number }>;
        participantCount = rows[0]?.total ?? 0;
      }

      return { strategy, resolverKey, householdCount, participantCount };
    }

    return { strategy, resolverKey, householdCount: 0, participantCount: 0 };
  }

  private mapRow(row: DbParticipantRow, sreniId: string): SreniParticipantRecord {
    const householdPhone = row.household_phone
      ?? cellToString(row.contact_data?.personalNumber)
      ?? undefined;
    const householdName = row.household_name
      ?? cellToString(row.contact_data?.name)
      ?? undefined;
    const memberPhone = row.phone ?? undefined;

    return {
      memberId: row.member_id ?? undefined,
      contactId: row.contact_id,
      sreniId,
      name: row.name,
      role: row.role as SreniParticipantRecord['role'],
      phone: memberPhone ?? householdPhone,
      email: row.email ?? undefined,
      gender: row.gender ?? undefined,
      dateOfBirth: row.date_of_birth
        ? (typeof row.date_of_birth === 'string'
          ? row.date_of_birth.slice(0, 10)
          : row.date_of_birth.toISOString().slice(0, 10))
        : undefined,
      divisionId: row.division_id ?? undefined,
      divisionName: row.division_name ?? undefined,
      householdPhone,
      householdName,
      usesHouseholdPhone: !memberPhone && Boolean(householdPhone),
    };
  }

  async listContactParticipants(
    sreniId: string,
    contactId: string,
  ): Promise<SreniParticipantRecord[]> {
    const resolverKey = await this.getSreniResolverKey(sreniId);

    if (this.ctx.runtimeMode === 'db' && this.ctx.dataSource) {
      const rows = await this.queryParticipantRows(sreniId, resolverKey, contactId);
      return rows.map((row) => this.mapRow(row, sreniId));
    }

    const members = await this.householdMembers.listMembers(sreniId, contactId);
    let contactData: Record<string, SreniContactCellValue> = {};
    for (const contact of this.ctx.sreniContacts.values()) {
      if (contact.id === contactId) {
        contactData = contact.data;
        break;
      }
    }

    const head = members.find((m) => m.role === 'head' && m.active);
    const householdPhone = head?.phone ?? cellToString(contactData.personalNumber) ?? undefined;
    const femaleGenders = new Set(await this.ctx.enumConfig.getFemaleGenderMatches());

    const toParticipant = (member: HouseholdMemberRecord): SreniParticipantRecord => ({
      memberId: member.id,
      contactId,
      sreniId,
      name: member.name,
      role: member.role,
      phone: member.phone ?? householdPhone,
      email: member.email,
      gender: member.gender,
      dateOfBirth: member.dateOfBirth,
      divisionId: member.enrollments?.[0]?.divisionId,
      divisionName: member.enrollments?.[0]?.divisionName,
      householdPhone,
      householdName: head?.name,
      usesHouseholdPhone: !member.phone && Boolean(householdPhone),
    });

    const isFemale = (m: HouseholdMemberRecord) => {
      if (!m.active) return false;
      const gender = (m.gender ?? '').trim().toLowerCase();
      if (femaleGenders.has(gender)) return true;
      return m.role === 'spouse' && m.source === 'import';
    };

    if (resolverKey === 'enrolled_children') {
      return members
        .filter((m) => m.role === 'child' && m.active && m.enrollments?.some((e) => e.sreniId === sreniId && e.active))
        .map(toParticipant);
    }
    if (resolverKey === 'female_participants') {
      return members.filter(isFemale).map(toParticipant);
    }
    if (head) return [toParticipant(head)];
    return [{
      contactId,
      sreniId,
      name: cellToString(contactData.name) ?? 'Unknown',
      role: 'head',
      phone: cellToString(contactData.personalNumber) ?? undefined,
    }];
  }

  private async queryParticipantRows(
    sreniId: string,
    resolverKey: HouseholdResolverKey,
    contactId?: string,
    limit?: number,
    offset?: number,
  ): Promise<DbParticipantRow[]> {
    if (!this.ctx.dataSource) return [];

    const contactFilter = contactId ? 'AND c.id = $2' : '';
    const params: Array<string | number | string[]> = contactId ? [sreniId, contactId] : [sreniId];
    let paramIndex = params.length;

    const paging = limit !== undefined
      ? ` LIMIT $${++paramIndex} OFFSET $${++paramIndex}`
      : '';
    if (limit !== undefined) {
      params.push(limit, offset ?? 0);
    }

    const headJoin = `
      LEFT JOIN LATERAL (
        SELECT hh.name AS household_name, hh.phone AS household_phone
        FROM adwest.household_members hh
        WHERE hh.contact_id = c.id AND hh.role = 'head' AND hh.active = true
        ORDER BY hh.sort_order ASC
        LIMIT 1
      ) head ON true`;

    if (resolverKey === 'enrolled_children') {
      return this.ctx.dataSource.query(
        `SELECT hm.id AS member_id, hm.contact_id, hm.role, hm.name, hm.phone, hm.email, hm.gender, hm.date_of_birth,
                e.division_id, d.name AS division_name,
                head.household_phone, head.household_name, c.data AS contact_data
         FROM adwest.household_members hm
         INNER JOIN adwest.household_member_sreni_enrollments e
           ON e.member_id = hm.id AND e.sreni_id = $1 AND e.active = true
         LEFT JOIN adwest.sreni_divisions d ON d.id = e.division_id
         INNER JOIN adwest.sreni_contacts c ON c.id = hm.contact_id
         LEFT JOIN adwest.contact_sreni_tags cst ON cst.contact_id = c.id AND cst.sreni_id = $1
         ${headJoin}
         WHERE hm.role = 'child' AND hm.active = true
           AND COALESCE(c.active, true) = true
           AND (c.sreni_id = $1 OR cst.id IS NOT NULL)
           ${contactFilter}
         ORDER BY c.row_index ASC, hm.sort_order ASC
         ${paging}`,
        params,
      ) as Promise<DbParticipantRow[]>;
    }

    if (resolverKey === 'female_participants') {
      const genders = await this.ctx.enumConfig.getFemaleGenderMatches();
      const genderParamIndex = params.length + 1;
      return this.ctx.dataSource.query(
        `SELECT hm.id AS member_id, hm.contact_id, hm.role, hm.name, hm.phone, hm.email, hm.gender, hm.date_of_birth,
                NULL::uuid AS division_id, NULL::text AS division_name,
                head.household_phone, head.household_name, c.data AS contact_data
         FROM adwest.household_members hm
         INNER JOIN adwest.sreni_contacts c ON c.id = hm.contact_id
         LEFT JOIN adwest.contact_sreni_tags cst ON cst.contact_id = c.id AND cst.sreni_id = $1
         ${headJoin}
         WHERE hm.active = true
           AND COALESCE(c.active, true) = true
           AND (c.sreni_id = $1 OR cst.id IS NOT NULL)
           AND (
             LOWER(COALESCE(hm.gender, '')) = ANY($${genderParamIndex}::text[])
             OR (hm.role = 'spouse' AND hm.source = 'import')
           )
           ${contactFilter}
         ORDER BY c.row_index ASC, hm.sort_order ASC
         ${paging}`,
        [...params, genders],
      ) as Promise<DbParticipantRow[]>;
    }

    return this.ctx.dataSource.query(
      `SELECT hm.id AS member_id, hm.contact_id,
              COALESCE(hm.role, 'head') AS role,
              COALESCE(hm.name, NULLIF(TRIM(c.data->>'name'), ''), 'Unknown') AS name,
              COALESCE(hm.phone, NULLIF(TRIM(c.data->>'personalNumber'), '')) AS phone,
              hm.email, hm.gender, hm.date_of_birth,
              NULL::uuid AS division_id, NULL::text AS division_name,
              COALESCE(head.household_phone, NULLIF(TRIM(c.data->>'personalNumber'), '')) AS household_phone,
              COALESCE(head.household_name, NULLIF(TRIM(c.data->>'name'), '')) AS household_name,
              c.data AS contact_data
       FROM adwest.sreni_contacts c
       LEFT JOIN adwest.contact_sreni_tags cst ON cst.contact_id = c.id AND cst.sreni_id = $1
       LEFT JOIN LATERAL (
         SELECT h.*
         FROM adwest.household_members h
         WHERE h.contact_id = c.id AND h.role = 'head' AND h.active = true
         ORDER BY h.sort_order ASC
         LIMIT 1
       ) hm ON true
       ${headJoin}
       WHERE COALESCE(c.active, true) = true
         AND (c.sreni_id = $1 OR cst.id IS NOT NULL)
         ${contactFilter}
       ORDER BY c.row_index ASC
       ${paging}`,
      params,
    ) as Promise<DbParticipantRow[]>;
  }

  async listSreniParticipants(
    sreniId: string,
    page = 1,
    pageSize = 100,
  ): Promise<{ items: SreniParticipantRecord[]; total: number; page: number; pageSize: number; totalPages: number }> {
    const resolverKey = await this.getSreniResolverKey(sreniId);
    const stats = await this.getSreniParticipantStats(sreniId);
    const offset = (page - 1) * pageSize;

    if (this.ctx.runtimeMode === 'db' && this.ctx.dataSource) {
      const rows = await this.queryParticipantRows(sreniId, resolverKey, undefined, pageSize, offset);
      const total = stats.participantCount;
      const totalPages = Math.max(1, Math.ceil(total / pageSize));
      return {
        items: rows.map((row) => this.mapRow(row, sreniId)),
        total,
        page,
        pageSize,
        totalPages,
      };
    }

    return { items: [], total: 0, page, pageSize, totalPages: 1 };
  }
}
