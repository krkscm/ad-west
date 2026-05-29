import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AuthPrincipal } from '@modules/user-management/interfaces/auth-principal.interface';
import { UpsertEventAttendanceCaptureDto } from '../dto/core-business.dto';
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
  toIsoTimestamp(value: string | Date): string;
  listSreniCalendarEvents(sreniId: string, principal: AuthPrincipal, accessibleSthanIds: string[]): CalendarEventRecord[];
  isTargetApproved(targetType: 'report_submission' | 'calendar_event', targetId: string): boolean;
}

export class AttendanceRuntimeService {
  constructor(private readonly ctx: AttendanceRuntimeContext) {}

  listSreniAttendanceListing(
    sreniId: string,
    principal: AuthPrincipal,
    accessibleSthanIds: string[] = [],
  ): Array<{ event: CalendarEventRecord; metrics: Array<{ metric: AttendanceMetricRecord; capture?: EventAttendanceCaptureRecord }> }> {
    const events = this.ctx.listSreniCalendarEvents(sreniId, principal, accessibleSthanIds)
      .filter((event) => this.ctx.isTargetApproved('calendar_event', event.id));
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
