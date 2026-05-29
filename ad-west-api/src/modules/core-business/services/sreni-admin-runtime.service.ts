import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CreateReportMetricDefinitionDto, CreateSreniReportParameterDto, SubmitSreniMonthlyReportDto, UpdateReportMetricDefinitionDto, UpdateSreniReportParameterDto } from '../dto/core-business.dto';
import type { ReportMetricDefinitionRecord, SreniContactRecord, SreniMonthlyReportRecord, SreniReportParameterRecord } from '../core-business.service';

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
  sreniContacts: Map<string, SreniContactRecord>;
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

  listSreniContacts(
    sreniId: string,
    page = 1,
    pageSize = 50,
  ): { items: SreniContactRecord[]; total: number; page: number; pageSize: number; totalPages: number } {
    const all = Array.from(this.ctx.sreniContacts.values())
      .filter((c) => c.sreniId === sreniId)
      .sort((a, b) => a.rowIndex - b.rowIndex);
    const total = all.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const start = (page - 1) * pageSize;
    const items = all.slice(start, start + pageSize);
    return { items, total, page, pageSize, totalPages };
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
      for (const r of records) {
        await this.ctx.dataSource.query(
          `INSERT INTO adwest.sreni_contacts (id, sreni_id, row_index, data, source_file, uploaded_by)
           VALUES (gen_random_uuid(), $1, $2, $3::jsonb, $4, $5)`,
          [sreniId, r.rowIndex, JSON.stringify(r.data), r.sourceFile ?? null, r.uploadedBy ?? null],
        );
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

  async listReportMetricDefinitions(): Promise<ReportMetricDefinitionRecord[]> {
    if (this.ctx.runtimeMode === 'db' && this.ctx.dataSource) {
      const rows = await this.ctx.dataSource.query(
        `SELECT id, name, description, unit, input_type, is_required, sort_order, target, active, created_at, updated_at
         FROM adwest.report_metric_definitions ORDER BY sort_order ASC, created_at ASC`,
      ) as Array<{ id: string; name: string; description: string | null; unit: string | null; input_type: string; is_required: boolean; sort_order: number; target: string | null; active: boolean; created_at: string | Date; updated_at: string | Date }>;
      return rows.map((r) => ({
        id: r.id, name: r.name, description: r.description ?? undefined, unit: r.unit ?? undefined,
        inputType: r.input_type as 'number' | 'text', isRequired: r.is_required, sortOrder: r.sort_order,
        target: r.target != null ? Number(r.target) : undefined,
        active: r.active, createdAt: this.ctx.toIsoTimestamp(r.created_at), updatedAt: this.ctx.toIsoTimestamp(r.updated_at),
      }));
    }
    return Array.from(this.ctx.reportMetricDefinitions.values()).sort((a, b) => a.sortOrder - b.sortOrder);
  }

  async createReportMetricDefinition(dto: CreateReportMetricDefinitionDto): Promise<ReportMetricDefinitionRecord> {
    if (this.ctx.runtimeMode === 'db' && this.ctx.dataSource) {
      const rows = await this.ctx.dataSource.query(
        `INSERT INTO adwest.report_metric_definitions (name, description, unit, input_type, is_required, sort_order, target)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, name, description, unit, input_type, is_required, sort_order, target, active, created_at, updated_at`,
        [dto.name, dto.description ?? null, dto.unit ?? null, dto.inputType, dto.isRequired ?? false, dto.sortOrder ?? 0, dto.target ?? null],
      ) as Array<{ id: string; name: string; description: string | null; unit: string | null; input_type: string; is_required: boolean; sort_order: number; target: string | null; active: boolean; created_at: string | Date; updated_at: string | Date }>;
      const r = rows[0];
      return { id: r.id, name: r.name, description: r.description ?? undefined, unit: r.unit ?? undefined, inputType: r.input_type as 'number' | 'text', isRequired: r.is_required, sortOrder: r.sort_order, target: r.target != null ? Number(r.target) : undefined, active: r.active, createdAt: this.ctx.toIsoTimestamp(r.created_at), updatedAt: this.ctx.toIsoTimestamp(r.updated_at) };
    }
    const record: ReportMetricDefinitionRecord = {
      id: this.ctx.newId('rmd'), name: dto.name, description: dto.description, unit: dto.unit,
      inputType: dto.inputType, isRequired: dto.isRequired ?? false, sortOrder: dto.sortOrder ?? 0,
      active: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    this.ctx.reportMetricDefinitions.set(record.id, record);
    return record;
  }

  async updateReportMetricDefinition(metricId: string, dto: UpdateReportMetricDefinitionDto): Promise<ReportMetricDefinitionRecord> {
    if (this.ctx.runtimeMode === 'db' && this.ctx.dataSource) {
      const existing = await this.ctx.dataSource.query(
        `SELECT id FROM adwest.report_metric_definitions WHERE id=$1`, [metricId],
      ) as Array<{ id: string }>;
      if (!existing.length) throw new NotFoundException('Report metric not found');
      const rows = await this.ctx.dataSource.query(
        `UPDATE adwest.report_metric_definitions
         SET name=COALESCE($2, name), description=COALESCE($3, description), unit=COALESCE($4, unit),
             input_type=COALESCE($5, input_type), is_required=COALESCE($6, is_required),
             sort_order=COALESCE($7, sort_order), target=COALESCE($8, target),
             active=COALESCE($9, active), updated_at=now()
         WHERE id=$1
         RETURNING id, name, description, unit, input_type, is_required, sort_order, target, active, created_at, updated_at`,
        [metricId, dto.name ?? null, dto.description ?? null, dto.unit ?? null,
         dto.inputType ?? null, dto.isRequired ?? null, dto.sortOrder ?? null, dto.target ?? null, dto.active ?? null],
      ) as Array<{ id: string; name: string; description: string | null; unit: string | null; input_type: string; is_required: boolean; sort_order: number; target: string | null; active: boolean; created_at: string | Date; updated_at: string | Date }>;
      const r = rows[0];
      return { id: r.id, name: r.name, description: r.description ?? undefined, unit: r.unit ?? undefined, inputType: r.input_type as 'number' | 'text', isRequired: r.is_required, sortOrder: r.sort_order, target: r.target != null ? Number(r.target) : undefined, active: r.active, createdAt: this.ctx.toIsoTimestamp(r.created_at), updatedAt: this.ctx.toIsoTimestamp(r.updated_at) };
    }
    const current = this.ctx.reportMetricDefinitions.get(metricId);
    if (!current) throw new NotFoundException('Report metric not found');
    const updated = { ...current, ...dto, updatedAt: new Date().toISOString() };
    this.ctx.reportMetricDefinitions.set(metricId, updated);
    return updated;
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

  async listAllMonthlyReports(): Promise<SreniMonthlyReportRecord[]> {
    if (this.ctx.runtimeMode === 'db' && this.ctx.dataSource) {
      const rows = await this.ctx.dataSource.query(
        `SELECT id, sreni_id, report_year, report_month, status, submitted_by, submitted_at, notes, entries, created_at, updated_at
         FROM adwest.sreni_monthly_reports ORDER BY report_year DESC, report_month DESC, sreni_id`,
      ) as Array<{ id: string; sreni_id: string; report_year: number; report_month: number; status: string; submitted_by: string | null; submitted_at: string | Date | null; notes: string | null; entries: Record<string, string>; created_at: string | Date; updated_at: string | Date }>;
      return rows.map((r) => ({
        id: r.id, sreniId: r.sreni_id, year: r.report_year, month: r.report_month,
        status: r.status as 'draft' | 'submitted', submittedBy: r.submitted_by ?? undefined,
        submittedAt: r.submitted_at ? this.ctx.toIsoTimestamp(r.submitted_at) : undefined,
        notes: r.notes ?? undefined, entries: r.entries ?? {},
        createdAt: this.ctx.toIsoTimestamp(r.created_at), updatedAt: this.ctx.toIsoTimestamp(r.updated_at),
      }));
    }
    return Array.from(this.ctx.sreniMonthlyReports.values()).sort((a, b) => b.year - a.year || b.month - a.month);
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
}
