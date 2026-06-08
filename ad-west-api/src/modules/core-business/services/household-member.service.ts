import { BadRequestException, NotFoundException } from '@nestjs/common';
import type {
  CreateHouseholdMemberDto,
  UpdateHouseholdMemberDto,
} from '../dto/core-business.dto';
import type {
  HouseholdMemberEnrollmentRecord,
  HouseholdMemberRecord,
  HouseholdMemberRole,
  SreniContactCellValue,
} from '../core-business.types';
import type { SreniAdminRuntimeContext } from './sreni-admin-runtime.service';
import { CONTACT_UPLOAD_BATCH_SIZE } from './contact-upload.constants';
import { HOUSEHOLD_ENUM_TYPES } from './household-enum-config.service';

type DbMemberRow = {
  id: string;
  contact_id: string;
  role: string;
  source: string;
  name: string;
  phone: string | null;
  email: string | null;
  gender: string | null;
  date_of_birth: string | Date | null;
  sort_order: number;
  active: boolean;
  created_at: string | Date;
  updated_at: string | Date;
};

type DbEnrollmentRow = {
  id: string;
  member_id: string;
  sreni_id: string;
  division_id: string | null;
  division_name: string | null;
  active: boolean;
  created_at: string | Date;
  updated_at: string | Date;
};

const MEMBER_SELECT = `
  hm.id, hm.contact_id, hm.role, hm.source, hm.name, hm.phone, hm.email,
  hm.gender, hm.date_of_birth, hm.sort_order, hm.active, hm.created_at, hm.updated_at
`;

const cellToString = (value: SreniContactCellValue | undefined): string | null => {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text.length ? text : null;
};

export class HouseholdMemberService {
  constructor(private readonly ctx: SreniAdminRuntimeContext) {}

  private mapMember(row: DbMemberRow, enrollments: HouseholdMemberEnrollmentRecord[] = []): HouseholdMemberRecord {
    return {
      id: row.id,
      contactId: row.contact_id,
      role: row.role as HouseholdMemberRole,
      source: row.source as HouseholdMemberRecord['source'],
      name: row.name,
      phone: row.phone ?? undefined,
      email: row.email ?? undefined,
      gender: row.gender ?? undefined,
      dateOfBirth: row.date_of_birth
        ? (typeof row.date_of_birth === 'string'
          ? row.date_of_birth.slice(0, 10)
          : row.date_of_birth.toISOString().slice(0, 10))
        : undefined,
      sortOrder: row.sort_order,
      active: row.active,
      enrollments,
      createdAt: this.ctx.toIsoTimestamp(row.created_at),
      updatedAt: this.ctx.toIsoTimestamp(row.updated_at),
    };
  }

  private mapEnrollment(row: DbEnrollmentRow): HouseholdMemberEnrollmentRecord {
    return {
      id: row.id,
      memberId: row.member_id,
      sreniId: row.sreni_id,
      divisionId: row.division_id ?? undefined,
      divisionName: row.division_name ?? undefined,
      active: row.active,
      createdAt: this.ctx.toIsoTimestamp(row.created_at),
      updatedAt: this.ctx.toIsoTimestamp(row.updated_at),
    };
  }

  async getSreniEnrollmentScope(sreniId: string): Promise<string> {
    if (this.ctx.runtimeMode === 'db' && this.ctx.dataSource) {
      const rows = await this.ctx.dataSource.query(
        `SELECT enrollment_scope FROM adwest.srenies WHERE id = $1`,
        [sreniId],
      ) as Array<{ enrollment_scope: string | null }>;
      if (!rows[0]) throw new NotFoundException('Sreni not found');
      return rows[0].enrollment_scope
        ?? await this.ctx.enumConfig.getDefaultValue(HOUSEHOLD_ENUM_TYPES.ENROLLMENT_SCOPE);
    }
    return this.ctx.enumConfig.getDefaultValue(HOUSEHOLD_ENUM_TYPES.ENROLLMENT_SCOPE);
  }

  private async isMemberEnrollmentScope(sreniId: string): Promise<boolean> {
    const scope = await this.getSreniEnrollmentScope(sreniId);
    return scope === 'MEMBER';
  }

  async syncMembersFromContactData(
    contactId: string,
    data: Record<string, SreniContactCellValue>,
  ): Promise<void> {
    const headName = cellToString(data.name) ?? 'Unknown';
    const headPhone = cellToString(data.personalNumber);
    const spouseName = cellToString(data.wifeName);
    const spousePhone = cellToString(data.mobileNo4);

    if (this.ctx.runtimeMode === 'db' && this.ctx.dataSource) {
      await this.upsertImportMemberDb(contactId, 'head', headName, headPhone, 0);
      if (spouseName) {
        await this.upsertImportMemberDb(contactId, 'spouse', spouseName, spousePhone, 1);
      } else {
        await this.ctx.dataSource.query(
          `UPDATE adwest.household_members
           SET active = false, updated_at = now()
           WHERE contact_id = $1 AND role = 'spouse' AND source = 'import'`,
          [contactId],
        );
      }
      return;
    }

    this.upsertImportMemberMemory(contactId, 'head', headName, headPhone, 0);
    if (spouseName) {
      this.upsertImportMemberMemory(contactId, 'spouse', spouseName, spousePhone, 1);
    } else {
      for (const member of this.ctx.householdMembers.values()) {
        if (member.contactId === contactId && member.role === 'spouse' && member.source === 'import') {
          member.active = false;
          member.updatedAt = new Date().toISOString();
        }
      }
    }
  }

  async syncMembersFromContactDataBulk(
    rows: Array<{ contactId: string; data: Record<string, SreniContactCellValue> }>,
  ): Promise<void> {
    if (!rows.length) return;
    if (this.ctx.runtimeMode !== 'db' || !this.ctx.dataSource) {
      for (const row of rows) {
        await this.syncMembersFromContactData(row.contactId, row.data);
      }
      return;
    }

    for (let offset = 0; offset < rows.length; offset += CONTACT_UPLOAD_BATCH_SIZE) {
      await this.syncImportMembersBatchDb(rows.slice(offset, offset + CONTACT_UPLOAD_BATCH_SIZE));
    }
  }

  /** Use after a full contact-list replace — prior household members were cascade-deleted. */
  async syncMembersFromContactDataBulkInsertOnly(
    rows: Array<{ contactId: string; data: Record<string, SreniContactCellValue> }>,
  ): Promise<void> {
    if (!rows.length) return;
    if (this.ctx.runtimeMode !== 'db' || !this.ctx.dataSource) {
      for (const row of rows) {
        await this.syncMembersFromContactData(row.contactId, row.data);
      }
      return;
    }

    for (let offset = 0; offset < rows.length; offset += CONTACT_UPLOAD_BATCH_SIZE) {
      await this.insertImportMembersBatchDb(rows.slice(offset, offset + CONTACT_UPLOAD_BATCH_SIZE));
    }
  }

  private async insertImportMembersBatchDb(
    rows: Array<{ contactId: string; data: Record<string, SreniContactCellValue> }>,
  ): Promise<void> {
    if (!this.ctx.dataSource || rows.length === 0) return;

    await this.bulkInsertImportMembersDb(
      'head',
      rows.map((row) => ({
        contactId: row.contactId,
        name: cellToString(row.data.name) ?? 'Unknown',
        phone: cellToString(row.data.personalNumber),
      })),
      0,
      null,
    );

    const spouseRows = rows
      .filter((row) => cellToString(row.data.wifeName))
      .map((row) => ({
        contactId: row.contactId,
        name: cellToString(row.data.wifeName)!,
        phone: cellToString(row.data.mobileNo4),
      }));
    if (spouseRows.length > 0) {
      await this.bulkInsertImportMembersDb('spouse', spouseRows, 1, 'female');
    }
  }

  private async bulkInsertImportMembersDb(
    role: HouseholdMemberRole,
    rows: Array<{ contactId: string; name: string; phone: string | null }>,
    sortOrder: number,
    gender: string | null,
  ): Promise<void> {
    if (!this.ctx.dataSource || rows.length === 0) return;

    const contactIds = rows.map((row) => row.contactId);
    const names = rows.map((row) => row.name);
    const phones = rows.map((row) => row.phone);
    const sortOrders = rows.map(() => sortOrder);

    await this.ctx.dataSource.query(
      `INSERT INTO adwest.household_members (contact_id, role, source, name, phone, gender, sort_order)
       SELECT contact_id, $4, 'import', name, phone, $5, sort_order
       FROM UNNEST($1::uuid[], $2::text[], $3::text[], $6::int[])
         AS t(contact_id, name, phone, sort_order)`,
      [contactIds, names, phones, role, gender, sortOrders],
    );
  }

  private async syncImportMembersBatchDb(
    rows: Array<{ contactId: string; data: Record<string, SreniContactCellValue> }>,
  ): Promise<void> {
    if (!this.ctx.dataSource || rows.length === 0) return;

    const noSpouseIds = rows
      .filter((row) => !cellToString(row.data.wifeName))
      .map((row) => row.contactId);
    if (noSpouseIds.length > 0) {
      await this.ctx.dataSource.query(
        `UPDATE adwest.household_members
         SET active = false, updated_at = now()
         WHERE contact_id = ANY($1::uuid[]) AND role = 'spouse' AND source = 'import'`,
        [noSpouseIds],
      );
    }

    await this.bulkUpsertImportMembersDb(
      'head',
      rows.map((row) => ({
        contactId: row.contactId,
        name: cellToString(row.data.name) ?? 'Unknown',
        phone: cellToString(row.data.personalNumber),
      })),
      0,
      null,
    );

    const spouseRows = rows
      .filter((row) => cellToString(row.data.wifeName))
      .map((row) => ({
        contactId: row.contactId,
        name: cellToString(row.data.wifeName)!,
        phone: cellToString(row.data.mobileNo4),
      }));
    if (spouseRows.length > 0) {
      await this.bulkUpsertImportMembersDb('spouse', spouseRows, 1, 'female');
    }
  }

  private async bulkUpsertImportMembersDb(
    role: HouseholdMemberRole,
    rows: Array<{ contactId: string; name: string; phone: string | null }>,
    sortOrder: number,
    gender: string | null,
  ): Promise<void> {
    if (!this.ctx.dataSource || rows.length === 0) return;

    const contactIds = rows.map((row) => row.contactId);
    const names = rows.map((row) => row.name);
    const phones = rows.map((row) => row.phone);
    const sortOrders = rows.map(() => sortOrder);

    await this.ctx.dataSource.query(
      `WITH incoming AS (
         SELECT * FROM UNNEST($1::uuid[], $2::text[], $3::text[], $4::int[])
           AS t(contact_id, name, phone, sort_order)
       )
       UPDATE adwest.household_members hm
       SET name = i.name,
           phone = i.phone,
           sort_order = i.sort_order,
           active = true,
           gender = CASE
             WHEN hm.role = 'spouse' AND hm.source = 'import'
             THEN COALESCE(NULLIF(TRIM(hm.gender), ''), 'female')
             ELSE hm.gender
           END,
           updated_at = now()
       FROM incoming i
       WHERE hm.contact_id = i.contact_id AND hm.role = $5 AND hm.source = 'import'`,
      [contactIds, names, phones, sortOrders, role],
    );

    await this.ctx.dataSource.query(
      `WITH incoming AS (
         SELECT * FROM UNNEST($1::uuid[], $2::text[], $3::text[], $4::int[])
           AS t(contact_id, name, phone, sort_order)
       )
       INSERT INTO adwest.household_members (contact_id, role, source, name, phone, gender, sort_order)
       SELECT i.contact_id, $5, 'import', i.name, i.phone, $6, i.sort_order
       FROM incoming i
       WHERE NOT EXISTS (
         SELECT 1 FROM adwest.household_members hm
         WHERE hm.contact_id = i.contact_id AND hm.role = $5 AND hm.source = 'import'
       )`,
      [contactIds, names, phones, sortOrders, role, gender],
    );
  }

  private async upsertImportMemberDb(
    contactId: string,
    role: HouseholdMemberRole,
    name: string,
    phone: string | null,
    sortOrder: number,
  ): Promise<void> {
    if (!this.ctx.dataSource) return;
    const existing = await this.ctx.dataSource.query(
      `SELECT id FROM adwest.household_members
       WHERE contact_id = $1 AND role = $2 AND source = 'import'
       LIMIT 1`,
      [contactId, role],
    ) as Array<{ id: string }>;

    if (existing[0]) {
      await this.ctx.dataSource.query(
        `UPDATE adwest.household_members
         SET name = $1, phone = $2, sort_order = $3, active = true,
             gender = CASE WHEN role = 'spouse' AND source = 'import' THEN COALESCE(NULLIF(TRIM(gender), ''), 'female') ELSE gender END,
             updated_at = now()
         WHERE id = $4`,
        [name, phone, sortOrder, existing[0].id],
      );
      return;
    }

    await this.ctx.dataSource.query(
      `INSERT INTO adwest.household_members (contact_id, role, source, name, phone, gender, sort_order)
       VALUES ($1, $2, 'import', $3, $4, $5, $6)`,
      [contactId, role, name, phone, role === 'spouse' ? 'female' : null, sortOrder],
    );
  }

  private upsertImportMemberMemory(
    contactId: string,
    role: HouseholdMemberRole,
    name: string,
    phone: string | null,
    sortOrder: number,
  ): void {
    const now = new Date().toISOString();
    let existing: HouseholdMemberRecord | undefined;
    for (const member of this.ctx.householdMembers.values()) {
      if (member.contactId === contactId && member.role === role && member.source === 'import') {
        existing = member;
        break;
      }
    }
    if (existing) {
      existing.name = name;
      existing.phone = phone ?? undefined;
      existing.sortOrder = sortOrder;
      existing.active = true;
      if (role === 'spouse') existing.gender = existing.gender ?? 'female';
      existing.updatedAt = now;
      return;
    }
    const id = this.ctx.newId('hm');
    this.ctx.householdMembers.set(id, {
      id,
      contactId,
      role,
      source: 'import',
      name,
      phone: phone ?? undefined,
      gender: role === 'spouse' ? 'female' : undefined,
      sortOrder,
      active: true,
      createdAt: now,
      updatedAt: now,
    });
  }

  private async assertContactInSreni(sreniId: string, contactId: string): Promise<void> {
    if (this.ctx.runtimeMode === 'db' && this.ctx.dataSource) {
      const rows = await this.ctx.dataSource.query(
        `SELECT c.id
         FROM adwest.sreni_contacts c
         LEFT JOIN adwest.contact_sreni_tags cst
           ON cst.contact_id = c.id AND cst.sreni_id = $1
         WHERE c.id = $2 AND (c.sreni_id = $1 OR cst.id IS NOT NULL)
         LIMIT 1`,
        [sreniId, contactId],
      ) as Array<{ id: string }>;
      if (!rows[0]) throw new NotFoundException('Contact not found in this Sreni');
      return;
    }
    const direct = this.ctx.sreniContacts.get(`${sreniId}:${contactId}`);
    if (direct) return;
    throw new NotFoundException('Contact not found in this Sreni');
  }

  async listMembers(sreniId: string, contactId: string): Promise<HouseholdMemberRecord[]> {
    await this.assertContactInSreni(sreniId, contactId);

    if (this.ctx.runtimeMode === 'db' && this.ctx.dataSource) {
      const members = await this.ctx.dataSource.query(
        `SELECT ${MEMBER_SELECT}
         FROM adwest.household_members hm
         WHERE hm.contact_id = $1
         ORDER BY hm.sort_order ASC, hm.created_at ASC`,
        [contactId],
      ) as DbMemberRow[];

      if (members.length === 0) return [];

      const memberIds = members.map((m) => m.id);
      const enrollments = await this.ctx.dataSource.query(
        `SELECT e.id, e.member_id, e.sreni_id, e.division_id, d.name AS division_name,
                e.active, e.created_at, e.updated_at
         FROM adwest.household_member_sreni_enrollments e
         LEFT JOIN adwest.sreni_divisions d ON d.id = e.division_id
         WHERE e.member_id = ANY($1::uuid[]) AND e.sreni_id = $2
         ORDER BY e.created_at ASC`,
        [memberIds, sreniId],
      ) as DbEnrollmentRow[];

      const byMember = new Map<string, HouseholdMemberEnrollmentRecord[]>();
      for (const row of enrollments) {
        const list = byMember.get(row.member_id) ?? [];
        list.push(this.mapEnrollment(row));
        byMember.set(row.member_id, list);
      }

      return members.map((m) => this.mapMember(m, byMember.get(m.id) ?? []));
    }

    return Array.from(this.ctx.householdMembers.values())
      .filter((m) => m.contactId === contactId)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt))
      .map((m) => ({
        ...m,
        enrollments: Array.from(this.ctx.householdEnrollments.values())
          .filter((e) => e.memberId === m.id && e.sreniId === sreniId),
      }));
  }

  async createMember(
    sreniId: string,
    contactId: string,
    dto: CreateHouseholdMemberDto,
  ): Promise<HouseholdMemberRecord> {
    await this.assertContactInSreni(sreniId, contactId);

    const role = dto.role ?? 'child';
    await this.ctx.enumConfig.validate(HOUSEHOLD_ENUM_TYPES.HOUSEHOLD_MEMBER_ROLE, role, 'Member role');
    if (role !== 'child' && role !== 'other') {
      throw new BadRequestException('Only child or other members can be added manually');
    }

    const name = dto.name.trim();
    if (!name) throw new BadRequestException('Name is required');

    const memberEnrollment = await this.isMemberEnrollmentScope(sreniId);
    if (role === 'child' && memberEnrollment && !dto.divisionId) {
      throw new BadRequestException('Division is required when enrolling a child');
    }

    if (this.ctx.runtimeMode === 'db' && this.ctx.dataSource) {
      if (dto.divisionId) {
        const divRows = await this.ctx.dataSource.query(
          `SELECT id FROM adwest.sreni_divisions WHERE id = $1 AND sreni_id = $2`,
          [dto.divisionId, sreniId],
        ) as Array<{ id: string }>;
        if (!divRows[0]) throw new BadRequestException('Division not found for this Sreni');
      }

      const sortRows = await this.ctx.dataSource.query(
        `SELECT COALESCE(MAX(sort_order), 0) + 1 AS next_order
         FROM adwest.household_members WHERE contact_id = $1`,
        [contactId],
      ) as Array<{ next_order: number }>;
      const sortOrder = sortRows[0]?.next_order ?? 1;

      const memberRows = await this.ctx.dataSource.query(
        `INSERT INTO adwest.household_members
           (contact_id, role, source, name, gender, date_of_birth, sort_order)
         VALUES ($1, $2, 'manual', $3, $4, $5, $6)
         RETURNING id, contact_id, role, source, name, phone, email, gender, date_of_birth, sort_order, active, created_at, updated_at`,
        [contactId, role, name, dto.gender?.trim() || null, dto.dateOfBirth || null, sortOrder],
      ) as DbMemberRow[];

      const member = memberRows[0];
      let enrollments: HouseholdMemberEnrollmentRecord[] = [];

      if (dto.divisionId || memberEnrollment) {
        const enrollmentRows = await this.ctx.dataSource.query(
          `INSERT INTO adwest.household_member_sreni_enrollments (member_id, sreni_id, division_id)
           VALUES ($1, $2, $3)
           RETURNING id, member_id, sreni_id, division_id, active, created_at, updated_at`,
          [member.id, sreniId, dto.divisionId ?? null],
        ) as Array<Omit<DbEnrollmentRow, 'division_name'>>;
        const divisionName = dto.divisionId
          ? (await this.ctx.dataSource.query(
            `SELECT name FROM adwest.sreni_divisions WHERE id = $1`,
            [dto.divisionId],
          ) as Array<{ name: string }>)[0]?.name
          : null;
        enrollments = enrollmentRows.map((row) => this.mapEnrollment({ ...row, division_name: divisionName }));
      }

      return this.mapMember(member, enrollments);
    }

    const now = new Date().toISOString();
    const id = this.ctx.newId('hm');
    const member: HouseholdMemberRecord = {
      id,
      contactId,
      role,
      source: 'manual',
      name,
      gender: dto.gender?.trim() || undefined,
      dateOfBirth: dto.dateOfBirth,
      sortOrder: Array.from(this.ctx.householdMembers.values()).filter((m) => m.contactId === contactId).length,
      active: true,
      createdAt: now,
      updatedAt: now,
    };
    this.ctx.householdMembers.set(id, member);

    const enrollments: HouseholdMemberEnrollmentRecord[] = [];
    if (dto.divisionId || memberEnrollment) {
      const enrollmentId = this.ctx.newId('hme');
      const enrollment: HouseholdMemberEnrollmentRecord = {
        id: enrollmentId,
        memberId: id,
        sreniId,
        divisionId: dto.divisionId,
        active: true,
        createdAt: now,
        updatedAt: now,
      };
      this.ctx.householdEnrollments.set(`${id}:${sreniId}`, enrollment);
      enrollments.push(enrollment);
    }

    return { ...member, enrollments };
  }

  async updateMember(
    sreniId: string,
    contactId: string,
    memberId: string,
    dto: UpdateHouseholdMemberDto,
  ): Promise<HouseholdMemberRecord> {
    await this.assertContactInSreni(sreniId, contactId);

    if (this.ctx.runtimeMode === 'db' && this.ctx.dataSource) {
      const existing = await this.ctx.dataSource.query(
        `SELECT ${MEMBER_SELECT}
         FROM adwest.household_members hm
         WHERE hm.id = $1 AND hm.contact_id = $2`,
        [memberId, contactId],
      ) as DbMemberRow[];
      if (!existing[0]) throw new NotFoundException('Member not found');

      if (existing[0].role === 'head' || existing[0].role === 'spouse') {
        if (dto.name !== undefined || dto.active === false) {
          throw new BadRequestException('Head and spouse members are managed via contact upload');
        }
      }

      if (dto.divisionId) {
        const divRows = await this.ctx.dataSource.query(
          `SELECT id FROM adwest.sreni_divisions WHERE id = $1 AND sreni_id = $2`,
          [dto.divisionId, sreniId],
        ) as Array<{ id: string }>;
        if (!divRows[0]) throw new BadRequestException('Division not found for this Sreni');
      }

      const updatedRows = await this.ctx.dataSource.query(
        `UPDATE adwest.household_members
         SET name = COALESCE($1, name),
             gender = COALESCE($2, gender),
             date_of_birth = COALESCE($3, date_of_birth),
             active = COALESCE($4, active),
             updated_at = now()
         WHERE id = $5 AND contact_id = $6
         RETURNING id, contact_id, role, source, name, phone, email, gender, date_of_birth, sort_order, active, created_at, updated_at`,
        [
          dto.name?.trim() || null,
          dto.gender !== undefined ? (dto.gender.trim() || null) : null,
          dto.dateOfBirth !== undefined ? (dto.dateOfBirth || null) : null,
          dto.active ?? null,
          memberId,
          contactId,
        ],
      ) as DbMemberRow[];

      if (dto.divisionId !== undefined) {
        await this.ctx.dataSource.query(
          `INSERT INTO adwest.household_member_sreni_enrollments (member_id, sreni_id, division_id)
           VALUES ($1, $2, $3)
           ON CONFLICT (member_id, sreni_id)
           DO UPDATE SET division_id = EXCLUDED.division_id, active = true, updated_at = now()`,
          [memberId, sreniId, dto.divisionId],
        );
      }

      const enrollments = await this.ctx.dataSource.query(
        `SELECT e.id, e.member_id, e.sreni_id, e.division_id, d.name AS division_name,
                e.active, e.created_at, e.updated_at
         FROM adwest.household_member_sreni_enrollments e
         LEFT JOIN adwest.sreni_divisions d ON d.id = e.division_id
         WHERE e.member_id = $1 AND e.sreni_id = $2`,
        [memberId, sreniId],
      ) as DbEnrollmentRow[];

      return this.mapMember(updatedRows[0], enrollments.map((row) => this.mapEnrollment(row)));
    }

    const member = this.ctx.householdMembers.get(memberId);
    if (!member || member.contactId !== contactId) throw new NotFoundException('Member not found');

    if (dto.name !== undefined) member.name = dto.name.trim();
    if (dto.gender !== undefined) member.gender = dto.gender.trim() || undefined;
    if (dto.dateOfBirth !== undefined) member.dateOfBirth = dto.dateOfBirth;
    if (dto.active !== undefined) member.active = dto.active;
    member.updatedAt = new Date().toISOString();

    if (dto.divisionId !== undefined) {
      const key = `${memberId}:${sreniId}`;
      const enrollment = this.ctx.householdEnrollments.get(key) ?? {
        id: this.ctx.newId('hme'),
        memberId,
        sreniId,
        active: true,
        createdAt: member.updatedAt,
        updatedAt: member.updatedAt,
      };
      enrollment.divisionId = dto.divisionId ?? undefined;
      enrollment.updatedAt = member.updatedAt;
      this.ctx.householdEnrollments.set(key, enrollment);
    }

    return {
      ...member,
      enrollments: Array.from(this.ctx.householdEnrollments.values())
        .filter((e) => e.memberId === memberId && e.sreniId === sreniId),
    };
  }

  async deleteMember(sreniId: string, contactId: string, memberId: string): Promise<void> {
    await this.assertContactInSreni(sreniId, contactId);

    if (this.ctx.runtimeMode === 'db' && this.ctx.dataSource) {
      const rows = await this.ctx.dataSource.query(
        `SELECT role, source FROM adwest.household_members WHERE id = $1 AND contact_id = $2`,
        [memberId, contactId],
      ) as Array<{ role: string; source: string }>;
      if (!rows[0]) throw new NotFoundException('Member not found');
      if (rows[0].source === 'import') {
        throw new BadRequestException('Head and spouse members cannot be deleted; re-upload contacts to update them');
      }

      await this.ctx.dataSource.query(
        `DELETE FROM adwest.household_members WHERE id = $1 AND contact_id = $2`,
        [memberId, contactId],
      );
      return;
    }

    const member = this.ctx.householdMembers.get(memberId);
    if (!member || member.contactId !== contactId) throw new NotFoundException('Member not found');
    if (member.source === 'import') {
      throw new BadRequestException('Head and spouse members cannot be deleted; re-upload contacts to update them');
    }
    this.ctx.householdMembers.delete(memberId);
    for (const [key, enrollment] of this.ctx.householdEnrollments) {
      if (enrollment.memberId === memberId) this.ctx.householdEnrollments.delete(key);
    }
  }
}
