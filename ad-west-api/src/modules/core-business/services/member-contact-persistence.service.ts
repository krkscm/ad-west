import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  CHILD_FIELD_GROUPS,
  householdDedupKey,
  normalizeMobileForMatch,
  sreniMembershipKey,
  type SreniExcelColumn,
} from './member-contact-template.constants';
import { HouseholdMemberService } from './household-member.service';
import { SevaSamithiContactService } from './seva-samithi-contact.service';
import type { SreniAdminRuntimeContext } from './sreni-admin-runtime.service';

export type HouseholdContactData = Record<string, string | number | boolean | null>;

export class MemberContactPersistenceService {
  async loadUploadSreniColumns(dataSource: DataSource): Promise<SreniExcelColumn[]> {
    return dataSource.query(
      `SELECT id::text AS "sreniId", name AS "sreniName", primary_contact_strategy AS "primaryContactStrategy"
       FROM adwest.srenies
       WHERE active = true AND show_in_upload_excel = true
       ORDER BY name ASC`,
    ) as Promise<SreniExcelColumn[]>;
  }

  async findHouseholdByDedupKey(
    dataSource: DataSource,
    name: unknown,
    mobile: unknown,
  ): Promise<{ id: string; data: HouseholdContactData } | null> {
    const key = householdDedupKey(name, mobile);
    const [mobileNorm, nameNorm] = key.split('::');
    if (!mobileNorm || !nameNorm) return null;
    const rows = await dataSource.query(
      `SELECT id::text AS id, data
       FROM adwest.sreni_contacts
       WHERE contact_kind = 'household'
         AND lower(trim(COALESCE(data->>'name', ''))) = $2
         AND regexp_replace(COALESCE(data->>'mobileNo', ''), '[^0-9]', '', 'g') = $1
       LIMIT 1`,
      [mobileNorm, nameNorm],
    ) as Array<{ id: string; data: HouseholdContactData }>;
    return rows[0] ?? null;
  }

  async insertJoinUsHousehold(
    dataSource: DataSource,
    data: HouseholdContactData,
    interestedSreniId: string,
    sourceFile: string,
    uploadedBy: string,
  ): Promise<{ id: string; rowIndex: number }> {
    const sreniColumns = await this.loadUploadSreniColumns(dataSource);
    const membershipKey = sreniMembershipKey(interestedSreniId);
    const payload: HouseholdContactData = {
      ...data,
      [membershipKey]: 'Yes',
    };

    const srNo = await this.nextSrNo(dataSource);
    const sthanLocationId = payload.sthan
      ? await this.resolveSthanLocationId(dataSource, String(payload.sthan))
      : null;

    const rowIndexRows = await dataSource.query(
      `SELECT COALESCE(MAX(row_index), 0) + 1 AS next FROM adwest.sreni_contacts WHERE contact_kind = 'household'`,
    ) as Array<{ next: number }>;
    const rowIndex = rowIndexRows[0]?.next ?? 1;

    const rows = await dataSource.query(
      `INSERT INTO adwest.sreni_contacts (
         sreni_id, row_index, data, source_file, uploaded_by, active,
         contact_kind, sr_no, sthan_location_id, location_id, review_status
       )
       VALUES (NULL, $1, $2::jsonb, $3, $4, true, 'household', $5, $6::uuid, $6::uuid, 'pending')
       RETURNING id::text AS id`,
      [rowIndex, JSON.stringify({ ...payload, srNo }), sourceFile, uploadedBy, srNo, sthanLocationId],
    ) as Array<{ id: string }>;
    const householdId = rows[0].id;

    await this.syncSreniMemberships(dataSource, householdId, payload, sreniColumns);
    const balaSreniIds = new Set(
      sreniColumns.filter((s) => s.primaryContactStrategy === 'ENROLLED_CHILDREN').map((s) => s.sreniId),
    );
    await this.syncBalabarathiChildren(dataSource, householdId, payload, sreniColumns, balaSreniIds, false);

    const ctx = { dataSource } as SreniAdminRuntimeContext;
    await new HouseholdMemberService(ctx).syncMembersFromContactData(householdId, this.toLegacyHouseholdData(payload));

    const sevaSamithiService = new SevaSamithiContactService(dataSource);
    await sevaSamithiService.upsertRegistryEntry(householdId);

    return { id: householdId, rowIndex };
  }

  async updateHouseholdContact(
    ctx: SreniAdminRuntimeContext,
    contactId: string,
    data: HouseholdContactData,
    sourceFile?: string,
    uploadedBy?: string,
  ): Promise<HouseholdContactData> {
    if (!ctx.dataSource) throw new BadRequestException('Database persistence required.');

    const existingRows = await ctx.dataSource.query(
      `SELECT data, source_file, uploaded_by
       FROM adwest.sreni_contacts
       WHERE id = $1::uuid AND contact_kind = 'household'
       LIMIT 1`,
      [contactId],
    ) as Array<{ data: HouseholdContactData; source_file: string | null; uploaded_by: string | null }>;
    if (!existingRows[0]) throw new NotFoundException('Contact not found');

    const merged = { ...(existingRows[0].data ?? {}), ...data };
    const sthanLocationId = merged.sthan
      ? await this.resolveSthanLocationId(ctx.dataSource, String(merged.sthan))
      : null;

    await ctx.dataSource.query(
      `UPDATE adwest.sreni_contacts
       SET data = $2::jsonb,
           source_file = COALESCE($3, source_file),
           uploaded_by = COALESCE($4, uploaded_by),
           sthan_location_id = $5::uuid,
           location_id = $5::uuid,
           updated_at = now()
       WHERE id = $1::uuid AND contact_kind = 'household'`,
      [
        contactId,
        JSON.stringify(merged),
        sourceFile ?? null,
        uploadedBy ?? null,
        sthanLocationId,
      ],
    );

    const sreniColumns = await this.loadUploadSreniColumns(ctx.dataSource);
    await this.syncSreniMemberships(ctx.dataSource, contactId, merged, sreniColumns);
    const balaSreniIds = new Set(
      sreniColumns.filter((s) => s.primaryContactStrategy === 'ENROLLED_CHILDREN').map((s) => s.sreniId),
    );
    await this.syncBalabarathiChildren(ctx.dataSource, contactId, merged, sreniColumns, balaSreniIds, true);
    await new HouseholdMemberService(ctx).syncMembersFromContactData(contactId, this.toLegacyHouseholdData(merged));

    const sevaSamithiService = new SevaSamithiContactService(ctx.dataSource);
    await sevaSamithiService.upsertRegistryEntry(contactId);

    return merged;
  }

  validateJoinUsRequired(data: HouseholdContactData): string[] {
    const errors: string[] = [];
    if (!String(data.name ?? '').trim()) errors.push('Name (Primary Member) is required.');
    if (!String(data.dateOfBirth ?? '').trim()) errors.push('Date of Birth is required.');
    if (!String(data.mobileNo ?? '').trim()) errors.push('Mobile No is required.');
    if (!String(data.familyOrBachelor ?? '').trim()) errors.push('Family / Bachelor is required.');
    return errors;
  }

  private isYes(value: string): boolean {
    return value.toLowerCase() === 'yes' || value.toLowerCase() === 'y';
  }

  private async resolveSthanLocationId(dataSource: DataSource, sthanName: string): Promise<string | null> {
    const trimmed = sthanName.trim();
    if (!trimmed) return null;
    const rows = await dataSource.query(
      `SELECT id::text AS id FROM adwest.locations
       WHERE active = true AND level = 'sthan' AND lower(trim(name)) = lower(trim($1))
       LIMIT 1`,
      [trimmed],
    ) as Array<{ id: string }>;
    if (!rows[0]) {
      throw new BadRequestException(`Unknown Sthan: "${trimmed}".`);
    }
    return rows[0].id;
  }

  private async nextSrNo(dataSource: DataSource): Promise<number> {
    const rows = await dataSource.query(
      `SELECT COALESCE(MAX(sr_no), 0) + 1 AS next FROM adwest.sreni_contacts WHERE contact_kind = 'household'`,
    ) as Array<{ next: number }>;
    return rows[0]?.next ?? 1;
  }

  private async syncSreniMemberships(
    dataSource: DataSource,
    householdId: string,
    data: HouseholdContactData,
    sreniColumns: SreniExcelColumn[],
  ): Promise<void> {
    await dataSource.query(`DELETE FROM adwest.contact_sreni_tags WHERE contact_id = $1::uuid`, [householdId]);
    for (const sreni of sreniColumns) {
      if (sreni.primaryContactStrategy === 'ENROLLED_CHILDREN') continue;
      const val = String(data[sreniMembershipKey(sreni.sreniId)] ?? '').trim();
      if (!this.isYes(val)) continue;
      await dataSource.query(
        `INSERT INTO adwest.contact_sreni_tags (contact_id, sreni_id)
         VALUES ($1::uuid, $2)
         ON CONFLICT (contact_id, sreni_id) DO NOTHING`,
        [householdId, sreni.sreniId],
      );
    }
  }

  private async syncBalabarathiChildren(
    dataSource: DataSource,
    householdId: string,
    data: HouseholdContactData,
    sreniColumns: SreniExcelColumn[],
    balaSreniIds: Set<string>,
    isUpdate: boolean,
  ): Promise<void> {
    for (const sreni of sreniColumns) {
      if (!balaSreniIds.has(sreni.sreniId)) continue;
      const val = String(data[sreniMembershipKey(sreni.sreniId)] ?? '').trim();
      if (!this.isYes(val)) {
        await dataSource.query(
          `DELETE FROM adwest.sreni_contacts
           WHERE parent_contact_id = $1::uuid AND sreni_id = $2 AND contact_kind = 'child'`,
          [householdId, sreni.sreniId],
        );
        continue;
      }

      for (const group of CHILD_FIELD_GROUPS) {
        const childName = String(data[group.nameKey] ?? '').trim();
        if (!childName) continue;
        const childData = {
          name: childName,
          dateOfBirth: data[group.dobKey] ?? null,
          grade: data[group.gradeKey] ?? null,
          parentName: data.name ?? null,
          parentMobileNo: data.mobileNo ?? null,
          childSlot: group.slot,
        };
        const existing = await dataSource.query(
          `SELECT id::text AS id FROM adwest.sreni_contacts
           WHERE contact_kind = 'child' AND parent_contact_id = $1::uuid AND sreni_id = $2
             AND lower(trim(COALESCE(data->>'name', ''))) = lower(trim($3))
             AND lower(trim(COALESCE(data->>'dateOfBirth', ''))) = lower(trim($4))
           LIMIT 1`,
          [householdId, sreni.sreniId, childName, String(data[group.dobKey] ?? '')],
        ) as Array<{ id: string }>;

        if (existing[0] && isUpdate) {
          await dataSource.query(
            `UPDATE adwest.sreni_contacts SET data = $2::jsonb, updated_at = now() WHERE id = $1::uuid`,
            [existing[0].id, JSON.stringify(childData)],
          );
        } else if (!existing[0]) {
          await dataSource.query(
            `INSERT INTO adwest.sreni_contacts (
               sreni_id, row_index, data, active, contact_kind, parent_contact_id, source_file
             )
             VALUES ($1, $2, $3::jsonb, true, 'child', $4::uuid, 'member-edit')`,
            [sreni.sreniId, group.slot, JSON.stringify(childData), householdId],
          );
        }
      }
    }
  }

  private toLegacyHouseholdData(data: HouseholdContactData) {
    return {
      name: data.name,
      personalNumber: data.mobileNo,
      wifeName: data.spouseName,
      mobileNo4: data.spouseMobileNo,
    };
  }

  normalizeMobileForMatch(value: unknown): string {
    return normalizeMobileForMatch(value);
  }
}
