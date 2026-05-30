import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  CreateSthanExpenseDto,
  ReviewSthanExpenseDto,
  SubmitSthanReportDto,
} from '../dto/core-business.dto';
import type {
  SthanContactRecord,
  SthanExpenseCategory,
  SthanExpenseRecord,
  SthanExpenseStatus,
  SthanReportRecord,
} from '../core-business.types';

export interface SthanRuntimeContext {
  runtimeMode: 'in-memory' | 'db';
  dataSource?: DataSource;
  toIsoTimestamp(value: string | Date): string;
  newId(prefix: string): string;
}

export class SthanRuntimeService {
  constructor(private readonly ctx: SthanRuntimeContext) {}

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
    const status = dto.asDraft ? 'draft' : 'submitted';
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
          `SELECT id::text, location_id::text, row_index, data, source_file, uploaded_by, created_at, updated_at
           FROM adwest.sreni_contacts WHERE location_id=$1::uuid ORDER BY row_index LIMIT $2 OFFSET $3`,
          [locationId, pageSize, offset],
        ),
      ]);
      const total = (countRows as Array<{ total: number }>)[0].total;
      const items = (dataRows as Array<{ id: string; location_id: string; row_index: number; data: Record<string, unknown>; source_file: string | null; uploaded_by: string | null; created_at: string | Date; updated_at: string | Date }>)
        .map((r) => ({
          id: r.id, locationId: r.location_id, rowIndex: r.row_index,
          data: r.data as Record<string, string | number | boolean | null>,
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

    if (this.ctx.runtimeMode === 'db' && this.ctx.dataSource) {
      // Replace existing contacts for this location in the shared sreni_contacts table
      await this.ctx.dataSource.query(
        `DELETE FROM adwest.sreni_contacts WHERE location_id=$1::uuid`,
        [locationId],
      );
      for (const r of parsedRows) {
        await this.ctx.dataSource.query(
          `INSERT INTO adwest.sreni_contacts (location_id, row_index, data, source_file, uploaded_by)
           VALUES ($1::uuid, $2, $3::jsonb, $4, $5)`,
          [locationId, r.rowIndex, JSON.stringify(r.data), originalName, uploadedBy ?? null],
        );
      }
    }
    return { inserted: parsedRows.length, locationId };
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
