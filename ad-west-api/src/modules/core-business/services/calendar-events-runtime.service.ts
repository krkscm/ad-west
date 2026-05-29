import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AuthPrincipal } from '@modules/user-management/interfaces/auth-principal.interface';
import { CreateCalendarEventDto, UpdateCalendarEventDto } from '../dto/core-business.dto';
import type { CalendarEventRecord } from '../core-business.service';

export interface CalendarEventsRuntimeContext {
  runtimeMode: 'in-memory' | 'db';
  dataSource?: DataSource;
  calendarEvents: Map<string, CalendarEventRecord>;
  sreniExists(sreniId: string): boolean;
  hasZoneRights(principal: AuthPrincipal): boolean;
  newId(prefix: string): string;
  createReportingApprovalRequest(
    payload: { targetId: string; targetType: 'report_submission' | 'calendar_event'; summary: string },
    principal: AuthPrincipal,
  ): void;
  logWarning(message: string): void;
}

export class CalendarEventsRuntimeService {
  constructor(private readonly ctx: CalendarEventsRuntimeContext) {}

  listSreniCalendarEvents(
    sreniId: string,
    principal: AuthPrincipal,
    accessibleSthanIds: string[] = [],
  ): CalendarEventRecord[] {
    if (!this.ctx.sreniExists(sreniId)) {
      throw new NotFoundException('Sreni not found');
    }

    const hasZoneRights = this.ctx.hasZoneRights(principal);
    const allowedSthanIds = new Set(accessibleSthanIds);

    const visible = Array.from(this.ctx.calendarEvents.values())
      .filter((event) => event.sreniId === sreniId)
      .filter((event) => {
        if (event.scope === 'zone') {
          return hasZoneRights;
        }
        if (hasZoneRights) {
          return true;
        }
        if (event.sthanIds.length === 0) {
          return true;
        }
        return event.sthanIds.some((id) => allowedSthanIds.has(id));
      });

    const byDate = new Map<string, CalendarEventRecord[]>();
    for (const event of visible) {
      const bucket = byDate.get(event.date) ?? [];
      bucket.push(event);
      byDate.set(event.date, bucket);
    }

    const result: CalendarEventRecord[] = [];
    for (const bucket of byDate.values()) {
      if (hasZoneRights && bucket.some((event) => event.scope === 'zone')) {
        result.push(...bucket.filter((event) => event.scope === 'zone'));
      } else {
        result.push(...bucket);
      }
    }

    return result.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      if (a.startTime !== b.startTime) return a.startTime.localeCompare(b.startTime);
      return a.title.localeCompare(b.title);
    });
  }

  createSreniCalendarEvent(
    sreniId: string,
    dto: CreateCalendarEventDto,
    principal: AuthPrincipal,
  ): CalendarEventRecord {
    if (!this.ctx.sreniExists(sreniId)) {
      throw new NotFoundException('Sreni not found');
    }
    if (dto.scope === 'zone' && !this.ctx.hasZoneRights(principal)) {
      throw new BadRequestException('Zone scoped events require zone rights');
    }

    const now = new Date().toISOString();
    const event: CalendarEventRecord = {
      id: this.ctx.newId('cal'),
      sreniId,
      title: dto.title.trim(),
      date: dto.date.slice(0, 10),
      startTime: dto.startTime,
      endTime: dto.endTime,
      color: dto.color ?? '#6366f1',
      notes: dto.notes?.trim() || undefined,
      scope: dto.scope,
      sthanIds: dto.scope === 'sthan' ? [...new Set(dto.sthanIds ?? [])] : [],
      createdBy: principal.email ?? principal.userId,
      createdAt: now,
      updatedBy: principal.email ?? principal.userId,
      updatedAt: now,
    };

    this.ctx.calendarEvents.set(event.id, event);
    if (this.ctx.runtimeMode === 'db' && this.ctx.dataSource) {
      void this.ctx.dataSource.query(
        `INSERT INTO adwest.sreni_calendar_events
          (id, sreni_id, title, event_date, start_time, end_time, color, notes, scope, sthan_ids, created_by, updated_by)
         VALUES ($1, $2, $3, $4::date, $5::time, $6::time, $7, $8, $9, $10::jsonb, $11, $12)`,
        [
          event.id,
          event.sreniId,
          event.title,
          event.date,
          event.startTime,
          event.endTime,
          event.color,
          event.notes ?? null,
          event.scope,
          JSON.stringify(event.sthanIds),
          event.createdBy,
          event.updatedBy,
        ],
      ).catch((error) => {
        this.ctx.logWarning(`Failed to persist calendar event ${event.id}: ${(error as Error).message}`);
      });
    }

    this.ctx.createReportingApprovalRequest(
      {
        targetId: event.id,
        targetType: 'calendar_event',
        summary: `Calendar event "${event.title}" on ${event.date}`,
      },
      principal,
    );

    return event;
  }

  updateSreniCalendarEvent(
    sreniId: string,
    eventId: string,
    dto: UpdateCalendarEventDto,
    principal: AuthPrincipal,
  ): CalendarEventRecord {
    const current = this.ctx.calendarEvents.get(eventId);
    if (!current || current.sreniId !== sreniId) {
      throw new NotFoundException('Calendar event not found');
    }

    const nextScope = dto.scope ?? current.scope;
    if (nextScope === 'zone' && !this.ctx.hasZoneRights(principal)) {
      throw new BadRequestException('Zone scoped events require zone rights');
    }

    const updated: CalendarEventRecord = {
      ...current,
      title: dto.title !== undefined ? dto.title.trim() : current.title,
      date: dto.date !== undefined ? dto.date.slice(0, 10) : current.date,
      startTime: dto.startTime ?? current.startTime,
      endTime: dto.endTime ?? current.endTime,
      color: dto.color ?? current.color,
      notes: dto.notes !== undefined ? (dto.notes.trim() || undefined) : current.notes,
      scope: nextScope,
      sthanIds: nextScope === 'sthan' ? [...new Set(dto.sthanIds ?? current.sthanIds)] : [],
      updatedBy: principal.email ?? principal.userId,
      updatedAt: new Date().toISOString(),
    };

    this.ctx.calendarEvents.set(eventId, updated);
    if (this.ctx.runtimeMode === 'db' && this.ctx.dataSource) {
      void this.ctx.dataSource.query(
        `UPDATE adwest.sreni_calendar_events
         SET title=$2, event_date=$3::date, start_time=$4::time, end_time=$5::time,
             color=$6, notes=$7, scope=$8, sthan_ids=$9::jsonb, updated_by=$10, updated_at=now()
         WHERE id=$1 AND sreni_id=$11`,
        [
          updated.id,
          updated.title,
          updated.date,
          updated.startTime,
          updated.endTime,
          updated.color,
          updated.notes ?? null,
          updated.scope,
          JSON.stringify(updated.sthanIds),
          updated.updatedBy,
          updated.sreniId,
        ],
      ).catch((error) => {
        this.ctx.logWarning(`Failed to persist calendar event update ${updated.id}: ${(error as Error).message}`);
      });
    }

    this.ctx.createReportingApprovalRequest(
      {
        targetId: updated.id,
        targetType: 'calendar_event',
        summary: `Calendar event update "${updated.title}" on ${updated.date}`,
      },
      principal,
    );

    return updated;
  }

  deleteSreniCalendarEvent(
    sreniId: string,
    eventId: string,
    principal: AuthPrincipal,
  ): { success: boolean; deletedBy: string } {
    const current = this.ctx.calendarEvents.get(eventId);
    if (!current || current.sreniId !== sreniId) {
      throw new NotFoundException('Calendar event not found');
    }

    this.ctx.calendarEvents.delete(eventId);
    if (this.ctx.runtimeMode === 'db' && this.ctx.dataSource) {
      void this.ctx.dataSource.query(
        'DELETE FROM adwest.sreni_calendar_events WHERE id=$1 AND sreni_id=$2',
        [eventId, sreniId],
      ).catch((error) => {
        this.ctx.logWarning(`Failed to delete calendar event ${eventId}: ${(error as Error).message}`);
      });
    }
    return { success: true, deletedBy: principal.email ?? principal.userId };
  }
}
