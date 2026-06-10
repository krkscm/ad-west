import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AuthPrincipal } from '@modules/user-management/interfaces/auth-principal.interface';
import {
  CreateAttendanceMetricDto,
  UpdateAttendanceMetricDto,
  UpsertEventAttendanceCaptureDto,
} from '../dto/core-business.dto';
import type {
  CalendarEventRecord,
  AttendanceMetricRecord,
  EventAttendanceCaptureRecord,
} from '../core-business.service';

export interface AttendanceRuntimeContext {
  calendarEvents: Map<string, CalendarEventRecord>;
  attendanceMetrics: Map<string, AttendanceMetricRecord>;
  eventAttendanceCaptures: Map<string, EventAttendanceCaptureRecord>;
  runtimeMode: 'in-memory' | 'db';
  dataSource?: DataSource;
  newId(prefix: string): string;
  hasZoneRights(principal: AuthPrincipal): boolean;
  canViewCreatorData(principal: AuthPrincipal, creatorUserId: string): boolean;
  toIsoTimestamp(value: string | Date): string;
  listSreniCalendarEvents(sreniId: string, principal: AuthPrincipal, accessibleSthanIds: string[]): CalendarEventRecord[];
  isTargetApproved(targetType: 'report_submission' | 'calendar_event', targetId: string): boolean;
}

export class AttendanceRuntimeService {
  constructor(private readonly ctx: AttendanceRuntimeContext) {}

  async listAttendanceMetricsFromDb(params: { page?: number; pageSize?: number; search?: string; sreniId?: string }): Promise<{
    items: AttendanceMetricRecord[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    const page = Math.max(1, params.page ?? 1);
    const pageSize = Math.min(1000, Math.max(1, params.pageSize ?? 10));

    if (this.ctx.runtimeMode !== 'db' || !this.ctx.dataSource) {
      const search = (params.search ?? '').trim().toLowerCase();
      let all = Array.from(this.ctx.attendanceMetrics.values());
      if (params.sreniId) all = all.filter((item) => item.sreniId === params.sreniId);
      if (search) all = all.filter((item) => item.name.toLowerCase().includes(search) || (item.description ?? '').toLowerCase().includes(search));
      all.sort((a, b) => a.name.localeCompare(b.name));
      const total = all.length;
      return { items: all.slice((page - 1) * pageSize, page * pageSize), total, page, pageSize, totalPages: Math.ceil(total / pageSize) || 1 };
    }

    const searchParam = params.search?.trim() ? `%${params.search.trim()}%` : null;
    const sreniFilter = params.sreniId?.trim() ? params.sreniId.trim() : null;
    const [countRows, dataRows] = await Promise.all([
      this.ctx.dataSource.query(
        `SELECT COUNT(*)::int AS total
         FROM adwest.sreni_attendance_metrics
         WHERE ($1::text IS NULL OR sreni_id = $1)
           AND ($2::text IS NULL OR name ILIKE $2 OR description ILIKE $2)`,
        [sreniFilter, searchParam],
      ),
      this.ctx.dataSource.query(
        `SELECT id, sreni_id, name, description, metric_keys, active, created_by, updated_by, created_at, updated_at
         FROM adwest.sreni_attendance_metrics
         WHERE ($1::text IS NULL OR sreni_id = $1)
           AND ($2::text IS NULL OR name ILIKE $2 OR description ILIKE $2)
         ORDER BY name ASC
         LIMIT $3 OFFSET $4`,
        [sreniFilter, searchParam, pageSize, (page - 1) * pageSize],
      ),
    ]);

    const total = (countRows as Array<{ total: number }>)[0].total;
    const items = (dataRows as Array<{
      id: string;
      sreni_id: string;
      name: string;
      description: string | null;
      metric_keys: string[] | null;
      active: boolean;
      created_by: string;
      updated_by: string;
      created_at: string | Date;
      updated_at: string | Date;
    }>).map((row) => ({
      id: row.id,
      sreniId: row.sreni_id,
      name: row.name,
      description: row.description ?? undefined,
      keys: Array.isArray(row.metric_keys) ? row.metric_keys : [],
      active: row.active,
      createdBy: row.created_by,
      updatedBy: row.updated_by,
      createdAt: this.ctx.toIsoTimestamp(row.created_at),
      updatedAt: this.ctx.toIsoTimestamp(row.updated_at),
    }));

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) || 1 };
  }

  async createAttendanceMetric(dto: CreateAttendanceMetricDto, principal?: AuthPrincipal): Promise<AttendanceMetricRecord> {
    if (this.ctx.runtimeMode === 'db' && this.ctx.dataSource) {
      const exists = await this.ctx.dataSource.query(
        'SELECT id FROM adwest.srenies WHERE id=$1 LIMIT 1',
        [dto.sreniId],
      ) as Array<{ id: string }>;
      if (!exists.length) throw new NotFoundException('Sreni not found');
    }
    const actor = principal?.email ?? principal?.userId ?? 'system';
    const now = new Date().toISOString();
    const keys = Array.from(new Set((dto.keys ?? []).map((k) => k.trim()).filter((k) => k.length > 0)));
    if (!keys.length) throw new BadRequestException('At least one attendance metric key is required');

    if (this.ctx.runtimeMode === 'db' && this.ctx.dataSource) {
      const rows = await this.ctx.dataSource.query(
        `INSERT INTO adwest.sreni_attendance_metrics
          (sreni_id, name, description, metric_keys, active, created_by, updated_by)
         VALUES ($1, $2, $3, $4::jsonb, $5, $6, $6)
         RETURNING id, sreni_id, name, description, metric_keys, active, created_by, updated_by, created_at, updated_at`,
        [dto.sreniId, dto.name.trim(), dto.description?.trim() || null, JSON.stringify(keys), dto.active ?? true, actor],
      ) as Array<{ id: string; sreni_id: string; name: string; description: string | null; metric_keys: string[] | null; active: boolean; created_by: string; updated_by: string; created_at: string | Date; updated_at: string | Date }>;
      const row = rows[0];
      const metric: AttendanceMetricRecord = {
        id: row.id,
        sreniId: row.sreni_id,
        name: row.name,
        description: row.description ?? undefined,
        keys: Array.isArray(row.metric_keys) ? row.metric_keys : keys,
        active: row.active,
        createdBy: row.created_by,
        updatedBy: row.updated_by,
        createdAt: this.ctx.toIsoTimestamp(row.created_at),
        updatedAt: this.ctx.toIsoTimestamp(row.updated_at),
      };
      this.ctx.attendanceMetrics.set(metric.id, metric);
      return metric;
    }

    const metric: AttendanceMetricRecord = {
      id: this.ctx.newId('atm'),
      sreniId: dto.sreniId,
      name: dto.name.trim(),
      description: dto.description?.trim() || undefined,
      keys,
      active: dto.active ?? true,
      createdBy: actor,
      updatedBy: actor,
      createdAt: now,
      updatedAt: now,
    };
    this.ctx.attendanceMetrics.set(metric.id, metric);
    return metric;
  }

  async updateAttendanceMetric(metricId: string, dto: UpdateAttendanceMetricDto, principal?: AuthPrincipal): Promise<AttendanceMetricRecord> {
    let current = this.ctx.attendanceMetrics.get(metricId);

    if (this.ctx.runtimeMode === 'db' && this.ctx.dataSource) {
      const rows = await this.ctx.dataSource.query(
        `SELECT id, sreni_id, name, description, metric_keys, active, created_by, updated_by, created_at, updated_at
         FROM adwest.sreni_attendance_metrics
         WHERE id=$1
         LIMIT 1`,
        [metricId],
      ) as Array<{ id: string; sreni_id: string; name: string; description: string | null; metric_keys: string[] | null; active: boolean; created_by: string; updated_by: string; created_at: string | Date; updated_at: string | Date }>;

      if (!rows.length) {
        throw new NotFoundException('Attendance metric not found');
      }

      const row = rows[0];
      current = {
        id: row.id,
        sreniId: row.sreni_id,
        name: row.name,
        description: row.description ?? undefined,
        keys: Array.isArray(row.metric_keys) ? row.metric_keys : [],
        active: row.active,
        createdBy: row.created_by,
        updatedBy: row.updated_by,
        createdAt: this.ctx.toIsoTimestamp(row.created_at),
        updatedAt: this.ctx.toIsoTimestamp(row.updated_at),
      };
      this.ctx.attendanceMetrics.set(current.id, current);
    }

    if (!current) throw new NotFoundException('Attendance metric not found');

    const actor = principal?.email ?? principal?.userId ?? 'system';
    const nextKeys = dto.keys !== undefined
      ? Array.from(new Set((dto.keys ?? []).map((k) => k.trim()).filter((k) => k.length > 0)))
      : current.keys;
    if (!nextKeys.length) throw new BadRequestException('At least one attendance metric key is required');

    if (this.ctx.runtimeMode === 'db' && this.ctx.dataSource) {
      const rows = await this.ctx.dataSource.query(
        `UPDATE adwest.sreni_attendance_metrics
         SET name=$2,
             description=$3,
             metric_keys=$4::jsonb,
             active=$5,
             updated_by=$6,
             updated_at=now()
         WHERE id=$1
         RETURNING id, sreni_id, name, description, metric_keys, active, created_by, updated_by, created_at, updated_at`,
        [metricId, dto.name?.trim() ?? current.name, dto.description !== undefined ? (dto.description.trim() || null) : (current.description ?? null), JSON.stringify(nextKeys), dto.active !== undefined ? dto.active : current.active, actor],
      ) as Array<{ id: string; sreni_id: string; name: string; description: string | null; metric_keys: string[] | null; active: boolean; created_by: string; updated_by: string; created_at: string | Date; updated_at: string | Date }>;
      if (!rows.length) {
        throw new NotFoundException('Attendance metric not found');
      }
      const row = rows[0];
      const updated: AttendanceMetricRecord = {
        id: row.id,
        sreniId: row.sreni_id,
        name: row.name,
        description: row.description ?? undefined,
        keys: Array.isArray(row.metric_keys) ? row.metric_keys : nextKeys,
        active: row.active,
        createdBy: row.created_by,
        updatedBy: row.updated_by,
        createdAt: this.ctx.toIsoTimestamp(row.created_at),
        updatedAt: this.ctx.toIsoTimestamp(row.updated_at),
      };
      this.ctx.attendanceMetrics.set(updated.id, updated);
      return updated;
    }

    const updated: AttendanceMetricRecord = {
      ...current,
      name: dto.name !== undefined ? dto.name.trim() : current.name,
      description: dto.description !== undefined ? (dto.description.trim() || undefined) : current.description,
      keys: nextKeys,
      active: dto.active !== undefined ? dto.active : current.active,
      updatedBy: actor,
      updatedAt: new Date().toISOString(),
    };
    this.ctx.attendanceMetrics.set(metricId, updated);
    return updated;
  }

  async deleteAttendanceMetric(metricId: string): Promise<{ success: boolean; deletedId: string }> {
    if (!this.ctx.attendanceMetrics.has(metricId)) throw new NotFoundException('Attendance metric not found');
    if (this.ctx.runtimeMode === 'db' && this.ctx.dataSource) {
      await this.ctx.dataSource.query('DELETE FROM adwest.sreni_attendance_metrics WHERE id=$1', [metricId]);
    }
    this.ctx.attendanceMetrics.delete(metricId);
    for (const [captureId, capture] of this.ctx.eventAttendanceCaptures.entries()) {
      if (capture.metricId === metricId) this.ctx.eventAttendanceCaptures.delete(captureId);
    }
    return { success: true, deletedId: metricId };
  }

  listSreniAttendanceListing(
    sreniId: string,
    principal: AuthPrincipal,
    accessibleSthanIds: string[] = [],
  ): Array<{ event: CalendarEventRecord; metrics: Array<{ metric: AttendanceMetricRecord; capture?: EventAttendanceCaptureRecord }> }> {
    const visibleEvents = this.ctx.listSreniCalendarEvents(sreniId, principal, accessibleSthanIds)
      .filter((event) => this.ctx.isTargetApproved('calendar_event', event.id));
    const eventsById = new Map(visibleEvents.map((event) => [event.id, event] as const));

    for (const capture of this.ctx.eventAttendanceCaptures.values()) {
      if (capture.sreniId !== sreniId) {
        continue;
      }
      if (!this.ctx.canViewCreatorData(principal, capture.capturedBy)) {
        continue;
      }

      const captureEvent = this.ctx.calendarEvents.get(capture.eventId);
      if (!captureEvent || captureEvent.sreniId !== sreniId) {
        continue;
      }
      if (!this.ctx.isTargetApproved('calendar_event', captureEvent.id)) {
        continue;
      }

      if (!eventsById.has(captureEvent.id)) {
        eventsById.set(captureEvent.id, captureEvent);
      }
    }

    const events = Array.from(eventsById.values()).sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      if (a.startTime !== b.startTime) return a.startTime.localeCompare(b.startTime);
      return a.title.localeCompare(b.title);
    });

    const metrics = Array.from(this.ctx.attendanceMetrics.values())
      .filter((item) => item.sreniId === sreniId && item.active)
      .sort((a, b) => a.name.localeCompare(b.name));

    return events.map((event) => ({
      event,
      metrics: metrics.map((metric) => {
        const capture = Array.from(this.ctx.eventAttendanceCaptures.values())
          .find((item) => item.eventId === event.id && item.metricId === metric.id);
        return { metric, capture };
      }),
    }));
  }

  async upsertEventAttendanceCapture(
    sreniId: string,
    eventId: string,
    dto: UpsertEventAttendanceCaptureDto,
    principal: AuthPrincipal,
  ): Promise<EventAttendanceCaptureRecord> {
    const event = this.ctx.calendarEvents.get(eventId);
    if (!event || event.sreniId !== sreniId) throw new NotFoundException('Calendar event not found');
    if (!this.ctx.isTargetApproved('calendar_event', event.id)) {
      throw new BadRequestException('Attendance capture is allowed only after the event approval is completed');
    }
    if (event.scope === 'zone' && !this.ctx.hasZoneRights(principal)) {
      throw new BadRequestException('Zone scoped events require zone rights');
    }

    const metric = this.ctx.attendanceMetrics.get(dto.metricId);
    if (!metric || metric.sreniId !== sreniId) throw new NotFoundException('Attendance metric not found');

    const allowedKeys = new Set(metric.keys);
    const normalizedValues: Record<string, string | number | boolean | null> = {};
    for (const key of metric.keys) normalizedValues[key] = dto.values[key] ?? null;
    for (const key of Object.keys(dto.values ?? {})) {
      if (!allowedKeys.has(key)) throw new BadRequestException(`Unsupported attendance value key: ${key}`);
    }

    const actor = principal.email ?? principal.userId;
    const existing = Array.from(this.ctx.eventAttendanceCaptures.values())
      .find((item) => item.eventId === eventId && item.metricId === metric.id);
    const captureId = existing?.id ?? this.ctx.newId('atc');
    const now = new Date().toISOString();

    if (this.ctx.runtimeMode === 'db' && this.ctx.dataSource) {
      const rows = await this.ctx.dataSource.query(
        `INSERT INTO adwest.sreni_event_attendance_captures
          (id, sreni_id, event_id, metric_id, values_json, captured_by, captured_at)
         VALUES ($1, $2, $3, $4, $5::jsonb, $6, now())
         ON CONFLICT (event_id, metric_id)
         DO UPDATE
         SET values_json = EXCLUDED.values_json,
             captured_by = EXCLUDED.captured_by,
             captured_at = now(),
             updated_at = now()
         RETURNING id, sreni_id, event_id, metric_id, values_json, captured_by, captured_at, updated_at`,
        [captureId, sreniId, eventId, metric.id, JSON.stringify(normalizedValues), actor],
      ) as Array<{ id: string; sreni_id: string; event_id: string; metric_id: string; values_json: Record<string, string | number | boolean | null>; captured_by: string; captured_at: string | Date; updated_at: string | Date }>;
      const row = rows[0];
      const saved: EventAttendanceCaptureRecord = {
        id: row.id,
        sreniId: row.sreni_id,
        eventId: row.event_id,
        metricId: row.metric_id,
        values: row.values_json ?? {},
        capturedBy: row.captured_by,
        capturedAt: this.ctx.toIsoTimestamp(row.captured_at),
        updatedAt: this.ctx.toIsoTimestamp(row.updated_at),
      };
      this.ctx.eventAttendanceCaptures.set(saved.id, saved);
      return saved;
    }

    const record: EventAttendanceCaptureRecord = {
      id: captureId,
      sreniId,
      eventId,
      metricId: metric.id,
      values: normalizedValues,
      capturedBy: actor,
      capturedAt: existing?.capturedAt ?? now,
      updatedAt: now,
    };
    this.ctx.eventAttendanceCaptures.set(record.id, record);
    return record;
  }
}
