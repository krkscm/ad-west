import { AuthPrincipal } from '@modules/user-management/interfaces/auth-principal.interface';
import { DataSource } from 'typeorm';
import { SubmitSreniReportDto } from '../dto/core-business.dto';
import type { SreniReportRecord } from '../core-business.service';

export interface SreniReportsRuntimeContext {
  runtimeMode: 'in-memory' | 'db';
  dataSource?: DataSource;
  sreniReports: Map<string, SreniReportRecord>;
  toIsoTimestamp(value: string | Date): string;
  newId(prefix: string): string;
  createReportingApprovalRequest(
    payload: { targetId: string; targetType: 'report_submission' | 'calendar_event'; summary: string },
    principal: AuthPrincipal,
  ): void;
}

export class SreniReportsRuntimeService {
  constructor(private readonly ctx: SreniReportsRuntimeContext) {}

  async listSreniReports(sreniId: string, submissionType?: string): Promise<SreniReportRecord[]> {
    if (this.ctx.runtimeMode === 'db' && this.ctx.dataSource) {
      const params: unknown[] = [sreniId];
      const typeClause = submissionType ? ` AND submission_type=$2` : '';
      if (submissionType) params.push(submissionType);
      const rows = await this.ctx.dataSource.query(
        `SELECT id, sreni_id, submission_type, period_year, period_value, entries, notes, submitted_by, submitted_at, created_at, updated_at
         FROM adwest.sreni_reports WHERE sreni_id=$1${typeClause} ORDER BY period_year DESC, period_value DESC`,
        params,
      ) as Array<{ id: string; sreni_id: string; submission_type: string; period_year: number; period_value: number; entries: Record<string, string>; notes: string | null; submitted_by: string | null; submitted_at: string | Date | null; created_at: string | Date; updated_at: string | Date }>;
      return rows.map((r) => ({
        id: r.id,
        sreniId: r.sreni_id,
        submissionType: r.submission_type as 'monthly' | 'half_yearly' | 'yearly',
        periodYear: r.period_year,
        periodValue: r.period_value,
        entries: r.entries ?? {},
        notes: r.notes ?? undefined,
        submittedBy: r.submitted_by ?? undefined,
        submittedAt: r.submitted_at ? this.ctx.toIsoTimestamp(r.submitted_at) : undefined,
        createdAt: this.ctx.toIsoTimestamp(r.created_at),
        updatedAt: this.ctx.toIsoTimestamp(r.updated_at),
      }));
    }

    let items = Array.from(this.ctx.sreniReports.values()).filter((r) => r.sreniId === sreniId);
    if (submissionType) items = items.filter((r) => r.submissionType === submissionType);
    return items.sort((a, b) => b.periodYear - a.periodYear || b.periodValue - a.periodValue);
  }

  async upsertSreniReport(
    sreniId: string,
    dto: SubmitSreniReportDto,
    submittedBy?: string,
    principal?: AuthPrincipal,
  ): Promise<SreniReportRecord> {
    const now = new Date().toISOString();

    if (this.ctx.runtimeMode === 'db' && this.ctx.dataSource) {
      const rows = await this.ctx.dataSource.query(
        `INSERT INTO adwest.sreni_reports (sreni_id, submission_type, period_year, period_value, entries, notes, submitted_by, submitted_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, now())
         ON CONFLICT (sreni_id, submission_type, period_year, period_value) DO UPDATE
           SET entries=$5, notes=$6, submitted_by=$7, submitted_at=now(), updated_at=now()
         RETURNING id, sreni_id, submission_type, period_year, period_value, entries, notes, submitted_by, submitted_at, created_at, updated_at`,
        [sreniId, dto.submissionType, dto.periodYear, dto.periodValue, JSON.stringify(dto.entries), dto.notes ?? null, submittedBy ?? null],
      ) as Array<{ id: string; sreni_id: string; submission_type: string; period_year: number; period_value: number; entries: Record<string, string>; notes: string | null; submitted_by: string | null; submitted_at: string | Date | null; created_at: string | Date; updated_at: string | Date }>;
      const r = rows[0];
      const record = {
        id: r.id,
        sreniId: r.sreni_id,
        submissionType: r.submission_type as 'monthly' | 'half_yearly' | 'yearly',
        periodYear: r.period_year,
        periodValue: r.period_value,
        entries: r.entries ?? {},
        notes: r.notes ?? undefined,
        submittedBy: r.submitted_by ?? undefined,
        submittedAt: r.submitted_at ? this.ctx.toIsoTimestamp(r.submitted_at) : undefined,
        createdAt: this.ctx.toIsoTimestamp(r.created_at),
        updatedAt: this.ctx.toIsoTimestamp(r.updated_at),
      } as SreniReportRecord;

      if (principal) {
        this.ctx.createReportingApprovalRequest(
          {
            targetId: record.id,
            targetType: 'report_submission',
            summary: `Report ${record.submissionType} ${record.periodYear}/${record.periodValue} submitted`,
          },
          principal,
        );
      }

      return record;
    }

    const existing = Array.from(this.ctx.sreniReports.values()).find(
      (r) => r.sreniId === sreniId && r.submissionType === dto.submissionType && r.periodYear === dto.periodYear && r.periodValue === dto.periodValue,
    );

    if (existing) {
      const updated: SreniReportRecord = {
        ...existing,
        entries: dto.entries,
        notes: dto.notes,
        submittedBy,
        submittedAt: now,
        updatedAt: now,
      };
      this.ctx.sreniReports.set(existing.id, updated);
      if (principal) {
        this.ctx.createReportingApprovalRequest(
          {
            targetId: updated.id,
            targetType: 'report_submission',
            summary: `Report ${updated.submissionType} ${updated.periodYear}/${updated.periodValue} resubmitted`,
          },
          principal,
        );
      }
      return updated;
    }

    const record: SreniReportRecord = {
      id: this.ctx.newId('srr'),
      sreniId,
      submissionType: dto.submissionType,
      periodYear: dto.periodYear,
      periodValue: dto.periodValue,
      entries: dto.entries,
      notes: dto.notes,
      submittedBy,
      submittedAt: now,
      createdAt: now,
      updatedAt: now,
    };
    this.ctx.sreniReports.set(record.id, record);

    if (principal) {
      this.ctx.createReportingApprovalRequest(
        {
          targetId: record.id,
          targetType: 'report_submission',
          summary: `Report ${record.submissionType} ${record.periodYear}/${record.periodValue} submitted`,
        },
        principal,
      );
    }

    return record;
  }
}
