import { BadRequestException, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  CHILD_FIELD_GROUPS,
  childDedupKey,
  MEMBER_CONTACT_DATA_START_ROW_INDEX,
  MEMBER_CONTACT_HEADER_ROW_INDEX,
  MEMBER_DATA_SHEET_NAME,
  buildMemberContactColumnLayout,
  householdDedupKey,
  normalizeMemberCell,
  normalizeMemberHeader,
  normalizeMobileForMatch,
  sreniMembershipKey,
  type MemberContactColumnDef,
  type SreniExcelColumn,
} from './member-contact-template.constants';
import { assertContactUploadRowLimit } from './contact-upload.constants';
import { HouseholdMemberService } from './household-member.service';
import { SevaSamithiContactService } from './seva-samithi-contact.service';
import type { SreniAdminRuntimeContext } from './sreni-admin-runtime.service';

export type MemberContactUploadAction = 'insert' | 'update' | 'skip';

export type MemberContactParsedRow = {
  rowIndex: number;
  data: Record<string, string | number | boolean | null>;
  errors: string[];
};

export type MemberContactDuplicateMatch = {
  kind: 'household' | 'child';
  rowIndex: number;
  matchKey: string;
  existingContactId: string;
  existingData: Record<string, string | number | boolean | null>;
  incomingData: Record<string, string | number | boolean | null>;
  childSlot?: number;
  parentContactId?: string;
  sreniId?: string;
  sreniName?: string;
  childName?: string;
  childDob?: string;
};

export type MemberContactPreviewResult = {
  rows: MemberContactParsedRow[];
  duplicates: MemberContactDuplicateMatch[];
  withinFileDuplicates: Array<{ rowIndexA: number; rowIndexB: number; matchKey: string }>;
  sreniColumns: SreniExcelColumn[];
  validRowCount: number;
  errorRowCount: number;
};

export type MemberContactCommitDecision = {
  rowIndex: number;
  action: MemberContactUploadAction;
  data?: Record<string, string | number | boolean | null>;
};

export type MemberContactCommitResult = {
  inserted: number;
  updated: number;
  skipped: number;
  childRowsCreated: number;
  childRowsUpdated: number;
};

@Injectable()
export class MemberContactUploadService {
  async previewUpload(
    dataSource: DataSource,
    fileBuffer: Buffer,
  ): Promise<MemberContactPreviewResult> {
    const [sreniColumns, layout] = await this.loadLayout(dataSource);
    const parsed = this.parseWorkbook(fileBuffer, layout, sreniColumns);
    assertContactUploadRowLimit(parsed.length);

    const sthanNames = await this.loadSthanNameSet(dataSource);
    const validated = parsed.map((row) => this.validateRow(row, sreniColumns, sthanNames));
    const duplicates = await this.findDbDuplicates(dataSource, validated, sreniColumns);
    const withinFileDuplicates = this.findWithinFileDuplicates(validated);

    return {
      rows: validated,
      duplicates,
      withinFileDuplicates,
      sreniColumns,
      validRowCount: validated.filter((r) => !r.errors.length).length,
      errorRowCount: validated.filter((r) => r.errors.length).length,
    };
  }

  async commitUpload(
    ctx: SreniAdminRuntimeContext,
    decisions: MemberContactCommitDecision[],
    sourceFile: string,
    uploadedBy?: string,
  ): Promise<MemberContactCommitResult> {
    if (!ctx.dataSource) {
      throw new BadRequestException('Contact upload commit requires database persistence.');
    }
    const dataSource = ctx.dataSource;
    const [sreniColumns] = await this.loadLayout(dataSource);
    const balaSreniIds = new Set(
      sreniColumns
        .filter((s) => s.primaryContactStrategy === 'ENROLLED_CHILDREN')
        .map((s) => s.sreniId),
    );

    let inserted = 0;
    let updated = 0;
    let skipped = 0;
    let childRowsCreated = 0;
    let childRowsUpdated = 0;

    const householdMemberService = new HouseholdMemberService(ctx);

    for (const decision of decisions) {
      if (decision.action === 'skip') {
        skipped += 1;
        continue;
      }

      const data = decision.data ?? {};
      const sthanNames = await this.loadSthanNameSet(dataSource);
      const rowErrors = this.validateRow(
        { rowIndex: decision.rowIndex, data, errors: [] },
        sreniColumns,
        sthanNames,
      ).errors;
      if (rowErrors.length) {
        throw new BadRequestException(`Row ${decision.rowIndex}: ${rowErrors.join('; ')}`);
      }

      const dedupKey = householdDedupKey(data.name, data.mobileNo);
      const existing = await this.findHouseholdByDedupKey(dataSource, dedupKey);

      let householdId: string;
      if (decision.action === 'update') {
        if (!existing) {
          throw new BadRequestException(`Row ${decision.rowIndex}: no existing contact to update.`);
        }
        householdId = existing.id;
        await this.updateHouseholdRow(dataSource, householdId, data, sourceFile, uploadedBy);
        updated += 1;
      } else if (decision.action === 'insert') {
        householdId = await this.insertHouseholdRow(dataSource, data, sourceFile, uploadedBy, decision.rowIndex);
        inserted += 1;
      } else {
        continue;
      }

      await this.syncSreniMemberships(dataSource, householdId, data, sreniColumns);
      await householdMemberService.syncMembersFromContactData(householdId, this.toLegacyHouseholdData(data));

      const childStats = await this.syncBalabarathiChildren(
        dataSource,
        householdId,
        data,
        sreniColumns,
        balaSreniIds,
        decision.action === 'update' || !!existing,
      );
      childRowsCreated += childStats.created;
      childRowsUpdated += childStats.updated;

      const sevaSamithiService = new SevaSamithiContactService(dataSource);
      await sevaSamithiService.upsertRegistryEntry(householdId);
    }

    return { inserted, updated, skipped, childRowsCreated, childRowsUpdated };
  }

  private async loadLayout(dataSource: DataSource): Promise<[SreniExcelColumn[], MemberContactColumnDef[]]> {
    const sreniColumns = await dataSource.query(
      `SELECT id::text AS id, name, primary_contact_strategy
       FROM adwest.srenies
       WHERE active = true AND show_in_upload_excel = true
       ORDER BY name ASC`,
    ) as SreniExcelColumn[];
    return [sreniColumns, buildMemberContactColumnLayout(sreniColumns)];
  }

  private parseWorkbook(
    fileBuffer: Buffer,
    layout: MemberContactColumnDef[],
    sreniColumns: SreniExcelColumn[],
  ): MemberContactParsedRow[] {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const XLSX = require('xlsx') as typeof import('xlsx');
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const sheet = workbook.Sheets[MEMBER_DATA_SHEET_NAME] ?? workbook.Sheets[workbook.SheetNames[0]];
    if (!sheet) throw new BadRequestException('Excel file has no Member Data sheet.');

    const grid = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      defval: null,
      blankrows: false,
      raw: false,
    }) as unknown[][];

    if (grid.length <= MEMBER_CONTACT_DATA_START_ROW_INDEX) return [];

    const headerRow = grid[MEMBER_CONTACT_HEADER_ROW_INDEX] ?? [];
    const headerMap = new Map<number, MemberContactColumnDef>();
    const normalizedHeaders = headerRow.map((cell) => normalizeMemberHeader(cell));

    for (const col of layout) {
      const targetHeader = normalizeMemberHeader(col.kind === 'sreni' ? col.header : col.header);
      const idx = normalizedHeaders.findIndex((h) => h === targetHeader);
      if (idx >= 0) headerMap.set(idx, col);
    }

    for (const sreni of sreniColumns) {
      const targetHeader = normalizeMemberHeader(sreni.sreniName);
      if (!normalizedHeaders.includes(targetHeader)) {
        throw new BadRequestException(
          `Uploaded file is missing Sreni column "${sreni.sreniName}". Download a fresh template.`,
        );
      }
    }

    const rows: MemberContactParsedRow[] = [];
    for (let i = MEMBER_CONTACT_DATA_START_ROW_INDEX; i < grid.length; i += 1) {
      const raw = grid[i] ?? [];
      const data: Record<string, string | number | boolean | null> = {};
      let hasValue = false;
      headerMap.forEach((col, colIdx) => {
        const val = normalizeMemberCell(raw[colIdx]);
        const key = col.kind === 'sreni' ? col.key : col.key;
        data[key] = val;
        if (val !== null && key !== 'srNo') hasValue = true;
      });
      if (!hasValue) continue;
      rows.push({ rowIndex: i + 1, data, errors: [] });
    }
    return rows;
  }

  private async loadSthanNameSet(dataSource: DataSource): Promise<Set<string>> {
    const rows = await dataSource.query(
      `SELECT lower(trim(name)) AS name FROM adwest.locations WHERE active = true AND level = 'sthan'`,
    ) as Array<{ name: string }>;
    return new Set(rows.map((r) => r.name));
  }

  private validateRow(
    row: MemberContactParsedRow,
    sreniColumns: SreniExcelColumn[],
    sthanNames: Set<string>,
  ): MemberContactParsedRow {
    const errors: string[] = [];
    const d = row.data;
    if (!String(d.name ?? '').trim()) errors.push('Name (Primary Member) is required.');
    if (!String(d.dateOfBirth ?? '').trim()) errors.push('Date of Birth is required.');
    if (!String(d.mobileNo ?? '').trim()) errors.push('Mobile No is required.');
    if (!String(d.familyOrBachelor ?? '').trim()) errors.push('Family / Bachelor is required.');

    const sthan = String(d.sthan ?? '').trim();
    if (sthan && !sthanNames.has(sthan.toLowerCase())) {
      errors.push(`Unknown Sthan: "${sthan}".`);
    }

    for (const sreni of sreniColumns) {
      const val = String(d[sreniMembershipKey(sreni.sreniId)] ?? '').trim();
      if (sreni.primaryContactStrategy === 'ENROLLED_CHILDREN' && this.isYes(val)) {
        const hasChild = CHILD_FIELD_GROUPS.some((g) => String(d[g.nameKey] ?? '').trim());
        if (!hasChild) {
          errors.push(`${sreni.sreniName} is Yes but no child name provided.`);
        }
      }
    }

    return { ...row, errors };
  }

  private isYes(value: string): boolean {
    return value.toLowerCase() === 'yes' || value.toLowerCase() === 'y';
  }

  private findWithinFileDuplicates(rows: MemberContactParsedRow[]) {
    const seen = new Map<string, number>();
    const dups: Array<{ rowIndexA: number; rowIndexB: number; matchKey: string }> = [];
    for (const row of rows) {
      const key = householdDedupKey(row.data.name, row.data.mobileNo);
      if (!normalizeMobileForMatch(row.data.mobileNo) || !String(row.data.name ?? '').trim()) continue;
      const prev = seen.get(key);
      if (prev !== undefined) {
        dups.push({ rowIndexA: prev, rowIndexB: row.rowIndex, matchKey: key });
      } else {
        seen.set(key, row.rowIndex);
      }
    }
    return dups;
  }

  private async findDbDuplicates(
    dataSource: DataSource,
    rows: MemberContactParsedRow[],
    sreniColumns: SreniExcelColumn[],
  ): Promise<MemberContactDuplicateMatch[]> {
    const matches: MemberContactDuplicateMatch[] = [];
    const childSreniColumns = sreniColumns.filter(
      (s) => s.primaryContactStrategy === 'ENROLLED_CHILDREN',
    );

    for (const row of rows) {
      const key = householdDedupKey(row.data.name, row.data.mobileNo);
      const existing = await this.findHouseholdByDedupKey(dataSource, key);
      if (existing) {
        matches.push({
          kind: 'household',
          rowIndex: row.rowIndex,
          matchKey: key,
          existingContactId: existing.id,
          existingData: existing.data,
          incomingData: row.data,
        });
      }

      if (!existing || childSreniColumns.length === 0) continue;

      for (const sreni of childSreniColumns) {
        const membershipVal = String(row.data[sreniMembershipKey(sreni.sreniId)] ?? '').trim();
        if (!this.isYes(membershipVal)) continue;

        for (const group of CHILD_FIELD_GROUPS) {
          const childName = String(row.data[group.nameKey] ?? '').trim();
          if (!childName) continue;
          const childDob = String(row.data[group.dobKey] ?? '').trim();
          const existingChild = await this.findChildByParentAndIdentity(
            dataSource,
            existing.id,
            sreni.sreniId,
            childName,
            childDob,
          );
          if (!existingChild) continue;

          matches.push({
            kind: 'child',
            rowIndex: row.rowIndex,
            matchKey: childDedupKey(existing.id, childName, childDob),
            existingContactId: existingChild.id,
            existingData: existingChild.data,
            incomingData: {
              name: childName,
              dateOfBirth: childDob || null,
              grade: row.data[group.gradeKey] ?? null,
              childSlot: group.slot,
            },
            childSlot: group.slot,
            parentContactId: existing.id,
            sreniId: sreni.sreniId,
            sreniName: sreni.sreniName,
            childName,
            childDob: childDob || undefined,
          });
        }
      }
    }

    return matches;
  }

  private async findChildByParentAndIdentity(
    dataSource: DataSource,
    parentContactId: string,
    sreniId: string,
    childName: string,
    childDob: string,
  ): Promise<{ id: string; data: Record<string, string | number | boolean | null> } | null> {
    const rows = await dataSource.query(
      `SELECT id::text AS id, data
       FROM adwest.sreni_contacts
       WHERE contact_kind = 'child'
         AND parent_contact_id = $1::uuid
         AND sreni_id = $2
         AND lower(trim(COALESCE(data->>'name', ''))) = lower(trim($3))
         AND lower(trim(COALESCE(data->>'dateOfBirth', ''))) = lower(trim($4))
       LIMIT 1`,
      [parentContactId, sreniId, childName, childDob],
    ) as Array<{ id: string; data: Record<string, string | number | boolean | null> }>;
    return rows[0] ?? null;
  }

  private async findHouseholdByDedupKey(
    dataSource: DataSource,
    dedupKey: string,
  ): Promise<{ id: string; data: Record<string, string | number | boolean | null> } | null> {
    const [mobile, name] = dedupKey.split('::');
    if (!mobile || !name) return null;
    const rows = await dataSource.query(
      `SELECT id::text AS id, data
       FROM adwest.sreni_contacts
       WHERE contact_kind = 'household'
         AND lower(trim(COALESCE(data->>'name', ''))) = $2
         AND regexp_replace(COALESCE(data->>'mobileNo', ''), '[^0-9]', '', 'g') = $1
       LIMIT 1`,
      [mobile, name],
    ) as Array<{ id: string; data: Record<string, string | number | boolean | null> }>;
    return rows[0] ?? null;
  }

  private async resolveSthanLocationId(dataSource: DataSource, sthanName: string): Promise<string> {
    const rows = await dataSource.query(
      `SELECT id::text AS id FROM adwest.locations
       WHERE active = true AND level = 'sthan' AND lower(trim(name)) = lower(trim($1))
       LIMIT 1`,
      [sthanName],
    ) as Array<{ id: string }>;
    if (!rows[0]) {
      throw new BadRequestException(`Unknown Sthan: "${sthanName}".`);
    }
    return rows[0].id;
  }

  private async nextSrNo(dataSource: DataSource): Promise<number> {
    const rows = await dataSource.query(
      `SELECT COALESCE(MAX(sr_no), 0) + 1 AS next FROM adwest.sreni_contacts WHERE contact_kind = 'household'`,
    ) as Array<{ next: number }>;
    return rows[0]?.next ?? 1;
  }

  private async insertHouseholdRow(
    dataSource: DataSource,
    data: Record<string, string | number | boolean | null>,
    sourceFile: string,
    uploadedBy: string | undefined,
    rowIndex: number,
  ): Promise<string> {
    const srNo = await this.nextSrNo(dataSource);
    const sthanLocationId = data.sthan
      ? await this.resolveSthanLocationId(dataSource, String(data.sthan))
      : null;

    const rows = await dataSource.query(
      `INSERT INTO adwest.sreni_contacts (
         sreni_id, row_index, data, source_file, uploaded_by, active,
         contact_kind, sr_no, sthan_location_id, location_id
       )
       VALUES (NULL, $1, $2::jsonb, $3, $4, true, 'household', $5, $6::uuid, $6::uuid)
       RETURNING id::text AS id`,
      [rowIndex, JSON.stringify({ ...data, srNo }), sourceFile, uploadedBy ?? null, srNo, sthanLocationId],
    ) as Array<{ id: string }>;
    return rows[0].id;
  }

  private async updateHouseholdRow(
    dataSource: DataSource,
    contactId: string,
    data: Record<string, string | number | boolean | null>,
    sourceFile: string,
    uploadedBy: string | undefined,
  ): Promise<void> {
    const sthanLocationId = data.sthan
      ? await this.resolveSthanLocationId(dataSource, String(data.sthan))
      : null;
    await dataSource.query(
      `UPDATE adwest.sreni_contacts
       SET data = $2::jsonb,
           source_file = $3,
           uploaded_by = $4,
           sthan_location_id = $5::uuid,
           location_id = $5::uuid,
           updated_at = now()
       WHERE id = $1::uuid AND contact_kind = 'household'`,
      [contactId, JSON.stringify(data), sourceFile, uploadedBy ?? null, sthanLocationId],
    );
  }

  private async syncSreniMemberships(
    dataSource: DataSource,
    householdId: string,
    data: Record<string, string | number | boolean | null>,
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
    data: Record<string, string | number | boolean | null>,
    sreniColumns: SreniExcelColumn[],
    balaSreniIds: Set<string>,
    isUpdate: boolean,
  ): Promise<{ created: number; updated: number }> {
    let created = 0;
    let updated = 0;

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
          updated += 1;
        } else if (!existing[0]) {
          await dataSource.query(
            `INSERT INTO adwest.sreni_contacts (
               sreni_id, row_index, data, active, contact_kind, parent_contact_id, source_file
             )
             VALUES ($1, $2, $3::jsonb, true, 'child', $4::uuid, 'member-upload')`,
            [sreni.sreniId, group.slot, JSON.stringify(childData), householdId],
          );
          created += 1;
        }
      }

    }
    return { created, updated };
  }

  private toLegacyHouseholdData(data: Record<string, string | number | boolean | null>) {
    return {
      name: data.name,
      personalNumber: data.mobileNo,
      wifeName: data.spouseName,
      mobileNo4: data.spouseMobileNo,
    };
  }
}
