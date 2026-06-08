import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AuthPrincipal } from '@modules/user-management/interfaces/auth-principal.interface';
import { EnumConfigService } from '@modules/enum-values/services/enum-config.service';
import { ENUM_TYPES } from '@modules/enum-values/enum-types.constants';
import {
  CreateSthanCalendarEventDto,
  CreateSthanExpenseDto,
  ReviewSthanExpenseDto,
  SubmitSthanReportDto,
  UpdateSthanCalendarEventDto,
} from '../dto/core-business.dto';
import type {
  SthanCalendarEventRecord,
  SthanContactRecord,
  SthanExpenseCategory,
  SthanExpenseRecord,
  SthanExpenseStatus,
  SthanReportRecord,
} from '../core-business.types';
import { assertContactUploadRowLimit, CONTACT_UPLOAD_BATCH_SIZE } from './contact-upload.constants';

export interface SthanRuntimeContext {
  runtimeMode: 'in-memory' | 'db';
  dataSource?: DataSource;
  enumConfig: EnumConfigService;
  toIsoTimestamp(value: string | Date): string;
  newId(prefix: string): string;
  createReportingApprovalRequest?(
    payload: { targetId: string; targetType: 'report_submission' | 'calendar_event'; summary: string },
    principal: AuthPrincipal,
  ): void;
  logWarning?(message: string): void;
}

export class SthanRuntimeService {
  constructor(private readonly ctx: SthanRuntimeContext) {}

  private async resolveLocationHierarchy(locationId: string): Promise<{
    zoneLocationId: string | null;
    sthanLocationId: string | null;
    divisionLocationId: string | null;
  }> {
    if (!(this.ctx.runtimeMode === 'db' && this.ctx.dataSource)) {
      return { zoneLocationId: null, sthanLocationId: null, divisionLocationId: null };
    }

    const rows = await this.ctx.dataSource.query(
      `SELECT
          CASE
            WHEN l.level = 'zone' THEN l.id::text
            WHEN p1.level = 'zone' THEN p1.id::text
            WHEN p2.level = 'zone' THEN p2.id::text
            ELSE NULL
          END AS zone_location_id,
          CASE
            WHEN l.level = 'sthan' THEN l.id::text
            WHEN p1.level = 'sthan' THEN p1.id::text
            WHEN p2.level = 'sthan' THEN p2.id::text
            ELSE NULL
          END AS sthan_location_id,
          CASE
            WHEN l.level = 'division' THEN l.id::text
            WHEN p1.level = 'division' THEN p1.id::text
            WHEN p2.level = 'division' THEN p2.id::text
            ELSE NULL
          END AS division_location_id
       FROM adwest.locations l
       LEFT JOIN adwest.locations p1 ON p1.id::text = l.parent_id
       LEFT JOIN adwest.locations p2 ON p2.id::text = p1.parent_id
       WHERE l.id = $1::uuid
       LIMIT 1`,
      [locationId],
    ) as Array<{ zone_location_id: string | null; sthan_location_id: string | null; division_location_id: string | null }>;

    return {
      zoneLocationId: rows[0]?.zone_location_id ?? null,
      sthanLocationId: rows[0]?.sthan_location_id ?? null,
      divisionLocationId: rows[0]?.division_location_id ?? null,
    };
  }

  // ── Reports ─────────────────────────────────────────────────────────────────

  async listSthanReports(locationId: string): Promise<SthanReportRecord[]> {
    if (this.ctx.runtimeMode === 'db' && this.ctx.dataSource) {
      try {
        const rows = await this.ctx.dataSource.query(
          `SELECT id::text, location_id::text, period_year, period_month, entries, notes,
                  submitted_by, submitted_at, created_at, updated_at
           FROM adwest.sthan_reports WHERE location_id=$1::uuid ORDER BY period_year DESC, period_month DESC`,
          [locationId],
        ) as Array<{ id: string; location_id: string; period_year: number; period_month: number; entries: Record<string, string>; notes: string | null; submitted_by: string | null; submitted_at: string | Date | null; created_at: string | Date; updated_at: string | Date }>;
        return rows.map((r) => this.mapReportRow(r));
      } catch {
        return []; // table doesn't exist yet — run migration 048
      }
    }
    return [];
  }

  async upsertSthanReport(locationId: string, dto: SubmitSthanReportDto, submittedBy?: string): Promise<SthanReportRecord> {
    if (this.ctx.runtimeMode === 'db' && this.ctx.dataSource) {
      const rows = await this.ctx.dataSource.query(
        `INSERT INTO adwest.sthan_reports (location_id, period_year, period_month, entries, notes, submitted_by, submitted_at)
         VALUES ($1::uuid, $2, $3, $4, $5, $6, now())
         ON CONFLICT (location_id, period_year, period_month) DO UPDATE
           SET entries=$4, notes=$5, submitted_by=$6, submitted_at=now(), updated_at=now()
         RETURNING id::text, location_id::text, period_year, period_month, entries, notes,
                   submitted_by, submitted_at, created_at, updated_at`,
        [locationId, dto.periodYear, dto.periodMonth, JSON.stringify(dto.entries), dto.notes ?? null, submittedBy ?? null],
      ) as Array<{ id: string; location_id: string; period_year: number; period_month: number; entries: Record<string, string>; notes: string | null; submitted_by: string | null; submitted_at: string | Date | null; created_at: string | Date; updated_at: string | Date }>;
      return this.mapReportRow(rows[0]);
    }
    const now = new Date().toISOString();
    return { id: this.ctx.newId('str'), locationId, periodYear: dto.periodYear, periodMonth: dto.periodMonth, entries: dto.entries, notes: dto.notes, submittedBy, submittedAt: now, createdAt: now, updatedAt: now };
  }

  private mapReportRow(r: { id: string; location_id: string; period_year: number; period_month: number; entries: Record<string, string>; notes: string | null; submitted_by: string | null; submitted_at: string | Date | null; created_at: string | Date; updated_at: string | Date }): SthanReportRecord {
    return {
      id: r.id, locationId: r.location_id,
      periodYear: r.period_year, periodMonth: r.period_month,
      entries: r.entries ?? {}, notes: r.notes ?? undefined,
      submittedBy: r.submitted_by ?? undefined,
      submittedAt: r.submitted_at ? this.ctx.toIsoTimestamp(r.submitted_at) : undefined,
      createdAt: this.ctx.toIsoTimestamp(r.created_at), updatedAt: this.ctx.toIsoTimestamp(r.updated_at),
    };
  }

  // ── Expenses ─────────────────────────────────────────────────────────────────

  async listSthanExpenses(locationId: string, status?: string): Promise<SthanExpenseRecord[]> {
    if (this.ctx.runtimeMode === 'db' && this.ctx.dataSource) {
      try {
        const params: unknown[] = [locationId];
        const statusClause = status ? ` AND status=$2` : '';
        if (status) params.push(status);
        const rows = await this.ctx.dataSource.query(
          `SELECT id::text, location_id::text, submitted_by, category, description, amount, currency,
                  receipt_url, receipt_original_name, status, reviewer_notes, reviewed_by, reviewed_at,
                  created_at, updated_at
           FROM adwest.sthan_expenses WHERE location_id=$1::uuid${statusClause} ORDER BY created_at DESC`,
          params,
        ) as Array<SthanExpenseDbRow>;
        return rows.map((r) => this.mapExpenseRow(r));
      } catch {
        return []; // table doesn't exist yet — run migration 048
      }
    }
    return [];
  }

  async createSthanExpense(locationId: string, dto: CreateSthanExpenseDto, submittedBy?: string): Promise<SthanExpenseRecord> {
    await this.ctx.enumConfig.validate(ENUM_TYPES.EXPENSE_CATEGORY, dto.category, 'Category');
    const status = dto.asDraft ? 'draft' : 'submitted';
    await this.ctx.enumConfig.validate(ENUM_TYPES.EXPENSE_STATUS, status, 'Status');
    if (this.ctx.runtimeMode === 'db' && this.ctx.dataSource) {
      const rows = await this.ctx.dataSource.query(
        `INSERT INTO adwest.sthan_expenses (location_id, submitted_by, category, description, amount, currency, status)
         VALUES ($1::uuid, $2, $3, $4, $5, $6, $7)
         RETURNING id::text, location_id::text, submitted_by, category, description, amount, currency,
                   receipt_url, receipt_original_name, status, reviewer_notes, reviewed_by, reviewed_at,
                   created_at, updated_at`,
        [locationId, submittedBy ?? null, dto.category, dto.description, dto.amount, dto.currency ?? 'AED', status],
      ) as Array<SthanExpenseDbRow>;
      return this.mapExpenseRow(rows[0]);
    }
    const now = new Date().toISOString();
    return { id: this.ctx.newId('ste'), locationId, submittedBy, category: dto.category as SthanExpenseCategory, description: dto.description, amount: dto.amount, currency: dto.currency ?? 'AED', status: status as SthanExpenseStatus, createdAt: now, updatedAt: now };
  }

  async reviewSthanExpense(locationId: string, expenseId: string, dto: ReviewSthanExpenseDto, reviewedBy?: string): Promise<SthanExpenseRecord> {
    await this.ctx.enumConfig.validate(ENUM_TYPES.EXPENSE_STATUS, dto.status, 'Status');
    if (this.ctx.runtimeMode === 'db' && this.ctx.dataSource) {
      const rows = await this.ctx.dataSource.query(
        `UPDATE adwest.sthan_expenses
         SET status=$3, reviewer_notes=$4, reviewed_by=$5, reviewed_at=now(), updated_at=now()
         WHERE id=$1::uuid AND location_id=$2::uuid
         RETURNING id::text, location_id::text, submitted_by, category, description, amount, currency,
                   receipt_url, receipt_original_name, status, reviewer_notes, reviewed_by, reviewed_at,
                   created_at, updated_at`,
        [expenseId, locationId, dto.status, dto.reviewerNotes ?? null, reviewedBy ?? null],
      ) as Array<SthanExpenseDbRow>;
      if (!rows.length) throw new NotFoundException('Expense not found');
      return this.mapExpenseRow(rows[0]);
    }
    throw new NotFoundException('Expense not found');
  }

  async deleteSthanExpense(locationId: string, expenseId: string): Promise<void> {
    if (this.ctx.runtimeMode === 'db' && this.ctx.dataSource) {
      const result = await this.ctx.dataSource.query(
        `DELETE FROM adwest.sthan_expenses WHERE id=$1::uuid AND location_id=$2::uuid AND status IN ('draft','rejected')
         RETURNING id`,
        [expenseId, locationId],
      ) as Array<{ id: string }>;
      if (!result.length) throw new BadRequestException('Cannot delete expense — not found or status does not allow deletion');
    }
  }

  private mapExpenseRow(r: SthanExpenseDbRow): SthanExpenseRecord {
    return {
      id: r.id, locationId: r.location_id,
      submittedBy: r.submitted_by ?? undefined,
      category: r.category as SthanExpenseCategory,
      description: r.description, amount: Number(r.amount), currency: r.currency,
      receiptUrl: r.receipt_url ?? undefined, receiptOriginalName: r.receipt_original_name ?? undefined,
      status: r.status as SthanExpenseStatus,
      reviewerNotes: r.reviewer_notes ?? undefined, reviewedBy: r.reviewed_by ?? undefined,
      reviewedAt: r.reviewed_at ? this.ctx.toIsoTimestamp(r.reviewed_at) : undefined,
      createdAt: this.ctx.toIsoTimestamp(r.created_at), updatedAt: this.ctx.toIsoTimestamp(r.updated_at),
    };
  }

  // ── Contacts ─────────────────────────────────────────────────────────────────

  // ── Contacts (sthan rows in sreni_contacts filtered by location_id) ──────────

  async listSthanContacts(locationId: string, page = 1, pageSize = 50): Promise<{ items: SthanContactRecord[]; total: number; totalPages: number }> {
    if (this.ctx.runtimeMode === 'db' && this.ctx.dataSource) {
      const offset = (page - 1) * pageSize;
      const [countRows, dataRows] = await Promise.all([
        this.ctx.dataSource.query(
          `SELECT COUNT(*)::int AS total FROM adwest.sreni_contacts WHERE location_id=$1::uuid`,
          [locationId],
        ),
        this.ctx.dataSource.query(
          `SELECT id::text, location_id::text, row_index, data,
                  zone_location_id::text, sthan_location_id::text, division_location_id::text,
                  source_file, uploaded_by, created_at, updated_at
           FROM adwest.sreni_contacts WHERE location_id=$1::uuid ORDER BY row_index LIMIT $2 OFFSET $3`,
          [locationId, pageSize, offset],
        ),
      ]);
      const total = (countRows as Array<{ total: number }>)[0].total;
      const items = (dataRows as Array<{ id: string; location_id: string; row_index: number; data: Record<string, unknown>; zone_location_id: string | null; sthan_location_id: string | null; division_location_id: string | null; source_file: string | null; uploaded_by: string | null; created_at: string | Date; updated_at: string | Date }>)
        .map((r) => ({
          id: r.id, locationId: r.location_id, rowIndex: r.row_index,
          data: r.data as Record<string, string | number | boolean | null>,
          zoneLocationId: r.zone_location_id ?? undefined,
          sthanLocationId: r.sthan_location_id ?? undefined,
          divisionLocationId: r.division_location_id ?? undefined,
          sourceFile: r.source_file ?? undefined, uploadedBy: r.uploaded_by ?? undefined,
          createdAt: this.ctx.toIsoTimestamp(r.created_at), updatedAt: this.ctx.toIsoTimestamp(r.updated_at),
        }));
      return { items, total, totalPages: Math.ceil(total / pageSize) || 1 };
    }
    return { items: [], total: 0, totalPages: 1 };
  }

  async uploadSthanContacts(locationId: string, fileBuffer: Buffer, originalName: string, uploadedBy?: string): Promise<{ inserted: number; locationId: string }> {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const XLSX = require('xlsx') as typeof import('xlsx');
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) throw new BadRequestException('Excel file has no sheets');
    const sheet = workbook.Sheets[sheetName];
    const grid = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: null, blankrows: false, raw: false }) as unknown[][];
    if (grid.length <= 1) return { inserted: 0, locationId };

    const headerRow = grid[0] ?? [];
    const headers = (headerRow as Array<unknown>).map((cell) => {
      const raw = cell != null ? String(cell).replace(/\s+/g, ' ').trim() : '';
      return raw.toLowerCase().replace(/\s+/g, '_');
    });

    const parsedRows = grid.slice(1).map((rawRow, idx) => {
      const data: Record<string, string | number | boolean | null> = {};
      headers.forEach((header, colIdx) => {
        if (!header) return;
        const val = (rawRow as Array<unknown>)[colIdx];
        data[header] = val !== undefined && val !== '' ? (val as string | number | boolean | null) : null;
      });
      return { rowIndex: idx + 1, data };
    }).filter((row) => Object.values(row.data).some((v) => v !== null));

    if (parsedRows.length === 0) return { inserted: 0, locationId };
    assertContactUploadRowLimit(parsedRows.length);

    if (this.ctx.runtimeMode === 'db' && this.ctx.dataSource) {
      const hierarchy = await this.resolveLocationHierarchy(locationId);
      // Replace existing contacts for this location in the shared sreni_contacts table
      await this.ctx.dataSource.query(
        `DELETE FROM adwest.sreni_contacts WHERE location_id=$1::uuid`,
        [locationId],
      );
      for (let offset = 0; offset < parsedRows.length; offset += CONTACT_UPLOAD_BATCH_SIZE) {
        const batch = parsedRows.slice(offset, offset + CONTACT_UPLOAD_BATCH_SIZE);
        await this.ctx.dataSource.query(
          `INSERT INTO adwest.sreni_contacts (
             location_id,
             zone_location_id,
             sthan_location_id,
             division_location_id,
             row_index,
             data,
             source_file,
             uploaded_by
           )
           SELECT location_id, zone_location_id, sthan_location_id, division_location_id,
                  row_index, data::jsonb, source_file, uploaded_by
           FROM UNNEST(
             $1::uuid[],
             $2::uuid[],
             $3::uuid[],
             $4::uuid[],
             $5::int[],
             $6::text[],
             $7::text[],
             $8::text[]
           ) AS t(
             location_id,
             zone_location_id,
             sthan_location_id,
             division_location_id,
             row_index,
             data,
             source_file,
             uploaded_by
           )`,
          [
            batch.map(() => locationId),
            batch.map(() => hierarchy.zoneLocationId),
            batch.map(() => hierarchy.sthanLocationId),
            batch.map(() => hierarchy.divisionLocationId),
            batch.map((row) => row.rowIndex),
            batch.map((row) => JSON.stringify(row.data)),
            batch.map(() => originalName),
            batch.map(() => uploadedBy ?? null),
          ],
        );
      }
    }
    return { inserted: parsedRows.length, locationId };
  }

  async updateSthanContact(
    locationId: string,
    contactId: string,
    data: Record<string, string | number | boolean | null>,
  ): Promise<SthanContactRecord> {
    if (this.ctx.runtimeMode !== 'db' || !this.ctx.dataSource) {
      throw new NotFoundException('Contact not found');
    }

    const existingRows = await this.ctx.dataSource.query(
      `SELECT data FROM adwest.sreni_contacts WHERE id = $1::uuid AND location_id = $2::uuid`,
      [contactId, locationId],
    ) as Array<{ data: Record<string, string | number | boolean | null> }>;
    if (!existingRows[0]) throw new NotFoundException('Contact not found');

    const merged = { ...(existingRows[0].data ?? {}), ...data };
    const rows = await this.ctx.dataSource.query(
      `UPDATE adwest.sreni_contacts
       SET data = $1::jsonb, updated_at = now()
       WHERE id = $2::uuid AND location_id = $3::uuid
       RETURNING id::text, location_id::text, row_index, data,
                 zone_location_id::text, sthan_location_id::text, division_location_id::text,
                 source_file, uploaded_by, created_at, updated_at`,
      [JSON.stringify(merged), contactId, locationId],
    ) as Array<{
      id: string; location_id: string; row_index: number;
      data: Record<string, unknown>;
      zone_location_id: string | null; sthan_location_id: string | null; division_location_id: string | null;
      source_file: string | null; uploaded_by: string | null;
      created_at: string | Date; updated_at: string | Date;
    }>;
    if (!rows[0]) throw new NotFoundException('Contact not found');
    const r = rows[0];
    return {
      id: r.id,
      locationId: r.location_id,
      rowIndex: r.row_index,
      data: r.data as Record<string, string | number | boolean | null>,
      zoneLocationId: r.zone_location_id ?? undefined,
      sthanLocationId: r.sthan_location_id ?? undefined,
      divisionLocationId: r.division_location_id ?? undefined,
      sourceFile: r.source_file ?? undefined,
      uploadedBy: r.uploaded_by ?? undefined,
      createdAt: this.ctx.toIsoTimestamp(r.created_at),
      updatedAt: this.ctx.toIsoTimestamp(r.updated_at),
    };
  }

  async clearSthanContacts(locationId: string): Promise<{ deleted: number }> {
    if (this.ctx.runtimeMode === 'db' && this.ctx.dataSource) {
      const result = await this.ctx.dataSource.query(
        `WITH deleted AS (DELETE FROM adwest.sreni_contacts WHERE location_id=$1::uuid RETURNING id)
         SELECT COUNT(*)::int AS cnt FROM deleted`,
        [locationId],
      ) as Array<{ cnt: number }>;
      return { deleted: result[0]?.cnt ?? 0 };
    }
    return { deleted: 0 };
  }

  // ── Calendar ────────────────────────────────────────────────────────────────

  private async assertSthanLocation(locationId: string): Promise<void> {
    if (!(this.ctx.runtimeMode === 'db' && this.ctx.dataSource)) {
      throw new BadRequestException('Sthan calendar requires database mode');
    }
    const rows = await this.ctx.dataSource.query(
      `SELECT id::text, level FROM adwest.locations WHERE id = $1::uuid AND active = true LIMIT 1`,
      [locationId],
    ) as Array<{ id: string; level: string }>;
    if (!rows[0]) {
      throw new NotFoundException('Location not found');
    }
    if (rows[0].level !== 'sthan') {
      throw new BadRequestException('Calendar events can only be created for Sthan locations');
    }
  }

  private mapCalendarRow(r: SthanCalendarDbRow): SthanCalendarEventRecord {
    return {
      id: r.id,
      locationId: r.location_id,
      title: r.title,
      date: typeof r.event_date === 'string' ? r.event_date.slice(0, 10) : new Date(r.event_date).toISOString().slice(0, 10),
      startTime: typeof r.start_time === 'string' ? r.start_time.slice(0, 5) : String(r.start_time).slice(0, 5),
      endTime: typeof r.end_time === 'string' ? r.end_time.slice(0, 5) : String(r.end_time).slice(0, 5),
      color: r.color,
      notes: r.notes ?? undefined,
      createdBy: r.created_by,
      createdAt: this.ctx.toIsoTimestamp(r.created_at),
      updatedBy: r.updated_by,
      updatedAt: this.ctx.toIsoTimestamp(r.updated_at),
      source: 'local',
    };
  }

  private mapSreniCalendarRow(r: SreniCalendarDbRow, locationId: string): SthanCalendarEventRecord {
    return {
      id: r.id,
      locationId,
      title: r.title,
      date: typeof r.event_date === 'string' ? r.event_date.slice(0, 10) : new Date(r.event_date).toISOString().slice(0, 10),
      startTime: typeof r.start_time === 'string' ? r.start_time.slice(0, 5) : String(r.start_time).slice(0, 5),
      endTime: typeof r.end_time === 'string' ? r.end_time.slice(0, 5) : String(r.end_time).slice(0, 5),
      color: r.color,
      notes: r.notes ?? undefined,
      createdBy: r.created_by,
      createdAt: this.ctx.toIsoTimestamp(r.created_at),
      updatedBy: r.updated_by,
      updatedAt: this.ctx.toIsoTimestamp(r.updated_at),
      source: 'sreni',
      sreniId: r.sreni_id,
      scope: r.scope as 'zone' | 'sthan',
      readOnly: true,
    };
  }

  private async listLinkedSreniCalendarEvents(locationId: string): Promise<SthanCalendarEventRecord[]> {
    if (!(this.ctx.runtimeMode === 'db' && this.ctx.dataSource)) return [];
    try {
      const rows = await this.ctx.dataSource.query(
        `SELECT id::text, sreni_id, title, event_date, start_time, end_time, color, notes, scope,
                created_by, updated_by, created_at, updated_at
         FROM adwest.sreni_calendar_events e
         WHERE scope = 'zone'
            OR (
              scope = 'sthan'
              AND (
                jsonb_array_length(sthan_ids) = 0
                OR sthan_ids @> jsonb_build_array($1::text)
              )
            )
         ORDER BY event_date ASC, start_time ASC, title ASC`,
        [locationId],
      ) as SreniCalendarDbRow[];
      return rows.map((r) => this.mapSreniCalendarRow(r, locationId));
    } catch {
      return [];
    }
  }

  private sortCalendarEvents(events: SthanCalendarEventRecord[]): SthanCalendarEventRecord[] {
    return events.slice().sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      if (a.startTime !== b.startTime) return a.startTime.localeCompare(b.startTime);
      return a.title.localeCompare(b.title);
    });
  }

  async listSthanCalendarEvents(locationId: string): Promise<SthanCalendarEventRecord[]> {
    if (this.ctx.runtimeMode === 'db' && this.ctx.dataSource) {
      try {
        await this.assertSthanLocation(locationId);
        const [localRows, linkedRows] = await Promise.all([
          this.ctx.dataSource.query(
            `SELECT id::text, location_id::text, title, event_date, start_time, end_time, color, notes,
                    created_by, updated_by, created_at, updated_at
             FROM adwest.sthan_calendar_events
             WHERE location_id = $1::uuid
             ORDER BY event_date ASC, start_time ASC, title ASC`,
            [locationId],
          ) as Promise<SthanCalendarDbRow[]>,
          this.listLinkedSreniCalendarEvents(locationId),
        ]);
        const local = localRows.map((r) => this.mapCalendarRow(r));
        return this.sortCalendarEvents([...local, ...linkedRows]);
      } catch (error) {
        if (error instanceof NotFoundException || error instanceof BadRequestException) throw error;
        return [];
      }
    }
    return [];
  }

  async createSthanCalendarEvent(
    locationId: string,
    dto: CreateSthanCalendarEventDto,
    principal: AuthPrincipal,
  ): Promise<SthanCalendarEventRecord> {
    await this.assertSthanLocation(locationId);
    const actor = principal.email ?? principal.userId;
    const rows = await this.ctx.dataSource!.query(
      `INSERT INTO adwest.sthan_calendar_events
         (location_id, title, event_date, start_time, end_time, color, notes, created_by, updated_by)
       VALUES ($1::uuid, $2, $3::date, $4::time, $5::time, $6, $7, $8, $8)
       RETURNING id::text, location_id::text, title, event_date, start_time, end_time, color, notes,
                 created_by, updated_by, created_at, updated_at`,
      [
        locationId,
        dto.title.trim(),
        dto.date.slice(0, 10),
        dto.startTime,
        dto.endTime,
        dto.color ?? '#6366f1',
        dto.notes?.trim() || null,
        actor,
      ],
    ) as SthanCalendarDbRow[];
    const event = this.mapCalendarRow(rows[0]);
    this.ctx.createReportingApprovalRequest?.(
      {
        targetId: event.id,
        targetType: 'calendar_event',
        summary: `Sthan calendar event "${event.title}" on ${event.date}`,
      },
      principal,
    );
    return event;
  }

  async updateSthanCalendarEvent(
    locationId: string,
    eventId: string,
    dto: UpdateSthanCalendarEventDto,
    principal: AuthPrincipal,
  ): Promise<SthanCalendarEventRecord> {
    await this.assertSthanLocation(locationId);
    const actor = principal.email ?? principal.userId;
    const rows = await this.ctx.dataSource!.query(
      `UPDATE adwest.sthan_calendar_events
       SET title = COALESCE($3, title),
           event_date = COALESCE($4::date, event_date),
           start_time = COALESCE($5::time, start_time),
           end_time = COALESCE($6::time, end_time),
           color = COALESCE($7, color),
           notes = CASE WHEN $8::boolean THEN $9 ELSE notes END,
           updated_by = $10,
           updated_at = now()
       WHERE id = $1::uuid AND location_id = $2::uuid
       RETURNING id::text, location_id::text, title, event_date, start_time, end_time, color, notes,
                 created_by, updated_by, created_at, updated_at`,
      [
        eventId,
        locationId,
        dto.title?.trim() ?? null,
        dto.date?.slice(0, 10) ?? null,
        dto.startTime ?? null,
        dto.endTime ?? null,
        dto.color ?? null,
        dto.notes !== undefined,
        dto.notes?.trim() || null,
        actor,
      ],
    ) as SthanCalendarDbRow[];
    if (!rows[0]) {
      throw new NotFoundException('Calendar event not found');
    }
    const event = this.mapCalendarRow(rows[0]);
    this.ctx.createReportingApprovalRequest?.(
      {
        targetId: event.id,
        targetType: 'calendar_event',
        summary: `Sthan calendar event update "${event.title}" on ${event.date}`,
      },
      principal,
    );
    return event;
  }

  async deleteSthanCalendarEvent(
    locationId: string,
    eventId: string,
    principal: AuthPrincipal,
  ): Promise<{ success: boolean; deletedBy: string }> {
    await this.assertSthanLocation(locationId);
    const result = await this.ctx.dataSource!.query(
      `DELETE FROM adwest.sthan_calendar_events WHERE id = $1::uuid AND location_id = $2::uuid RETURNING id`,
      [eventId, locationId],
    ) as Array<{ id: string }>;
    if (!result[0]) {
      throw new NotFoundException('Calendar event not found');
    }
    return { success: true, deletedBy: principal.email ?? principal.userId };
  }
}

interface SthanExpenseDbRow {
  id: string;
  location_id: string;
  submitted_by: string | null;
  category: string;
  description: string;
  amount: number | string;
  currency: string;
  receipt_url: string | null;
  receipt_original_name: string | null;
  status: string;
  reviewer_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | Date | null;
  created_at: string | Date;
  updated_at: string | Date;
}

interface SthanCalendarDbRow {
  id: string;
  location_id: string;
  title: string;
  event_date: string | Date;
  start_time: string;
  end_time: string;
  color: string;
  notes: string | null;
  created_by: string;
  updated_by: string;
  created_at: string | Date;
  updated_at: string | Date;
}

interface SreniCalendarDbRow {
  id: string;
  sreni_id: string;
  title: string;
  event_date: string | Date;
  start_time: string;
  end_time: string;
  color: string;
  notes: string | null;
  scope: string;
  created_by: string;
  updated_by: string;
  created_at: string | Date;
  updated_at: string | Date;
}
