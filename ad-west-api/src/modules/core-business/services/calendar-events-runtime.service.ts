import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AuthPrincipal } from '@modules/user-management/interfaces/auth-principal.interface';
import { CreateCalendarEventDto, UpdateCalendarEventDto } from '../dto/core-business.dto';
import type {
  CalendarApprovalStatus,
  CalendarConflictWarning,
  CalendarEventRecord,
  CalendarFeedItemRecord,
  CalendarPriorityTier,
} from '../core-business.types';
import {
  CALENDAR_APPROVAL_STATUS,
  CALENDAR_FEED_KIND,
  CALENDAR_PRIORITY_TIER,
} from '../constants/calendar-domain.constants';
import type { CalendarViewerContext } from './calendar-access.service';

const SPECIAL_EVENT_COLOR = '#b45309';

export interface CalendarEventsRuntimeContext {
  runtimeMode: 'in-memory' | 'db';
  dataSource?: DataSource;
  calendarEvents: Map<string, CalendarEventRecord>;
  sreniExists(sreniId: string): boolean;
  sreniName(sreniId: string): string;
  newId(prefix: string): string;
  createReportingApprovalRequest(
    payload: { targetId: string; targetType: 'report_submission' | 'calendar_event'; summary: string },
    principal: AuthPrincipal,
  ): void;
  logWarning(message: string): void;
}

export class CalendarEventsRuntimeService {
  constructor(private readonly ctx: CalendarEventsRuntimeContext) {}

  listSreniCalendarFeed(
    sreniId: string,
    viewer: CalendarViewerContext,
    principal: AuthPrincipal,
  ): CalendarFeedItemRecord[] {
    if (!this.ctx.sreniExists(sreniId)) {
      throw new NotFoundException('Sreni not found');
    }

    const sreniEvents = Array.from(this.ctx.calendarEvents.values())
      .filter((event) => event.sreniId === sreniId)
      .filter((event) => this.eventVisible(event, viewer, principal))
      .map((event) => this.toSreniFeedItem(event));

    return this.sortFeedItems(sreniEvents);
  }

  checkCreateConflicts(
    sreniId: string,
    dto: Pick<CreateCalendarEventDto, 'date' | 'scope' | 'sthanIds'>,
    viewer: CalendarViewerContext,
  ): CalendarConflictWarning[] {
    const date = dto.date.slice(0, 10);
    const warnings: CalendarConflictWarning[] = [];
    const allowedSreniIds = viewer.scope.unrestricted
      ? [...new Set(Array.from(this.ctx.calendarEvents.values()).map((e) => e.sreniId))]
      : viewer.scope.allowedSreniIds;

    const sameSreniEvents = Array.from(this.ctx.calendarEvents.values())
      .filter((event) => event.date === date && event.approvalStatus !== CALENDAR_APPROVAL_STATUS.REJECTED);

    if (viewer.isZoneViewer && dto.scope === 'zone') {
      for (const existing of sameSreniEvents.filter((event) => event.sreniId === sreniId && event.scope === 'zone')) {
        warnings.push({
          code: 'ZONE_EVENT_EXISTS',
          message: `A zone-level event "${existing.title}" already exists on this date in ${this.ctx.sreniName(sreniId)}.`,
          relatedSreniId: sreniId,
          relatedSreniName: this.ctx.sreniName(sreniId),
          relatedEventId: existing.id,
          relatedEventTitle: existing.title,
        });
      }

      for (const otherSreniId of allowedSreniIds) {
        if (otherSreniId === sreniId) continue;
        for (const existing of sameSreniEvents.filter((event) => event.sreniId === otherSreniId && event.scope === 'sthan')) {
          warnings.push({
            code: 'OTHER_SRENI_STHAN_EVENT',
            message: `Sthan-level event "${existing.title}" already exists on this date in ${this.ctx.sreniName(otherSreniId)}.`,
            relatedSreniId: otherSreniId,
            relatedSreniName: this.ctx.sreniName(otherSreniId),
            relatedEventId: existing.id,
            relatedEventTitle: existing.title,
          });
        }
      }
    }

    if (!viewer.isZoneViewer && dto.scope === 'sthan') {
      const sthanId = viewer.scope.sthanLocationId;
      for (const existing of sameSreniEvents.filter((event) => (
        event.sreniId === sreniId
        && event.scope === 'sthan'
        && (event.sthanIds.length === 0 || (sthanId && event.sthanIds.includes(sthanId)))
      ))) {
        warnings.push({
          code: 'STHAN_EVENT_EXISTS',
          message: `A sthan-level event "${existing.title}" already exists on this date for your sthan in ${this.ctx.sreniName(sreniId)}.`,
          relatedSreniId: sreniId,
          relatedSreniName: this.ctx.sreniName(sreniId),
          relatedEventId: existing.id,
          relatedEventTitle: existing.title,
        });
      }

      for (const otherSreniId of allowedSreniIds) {
        if (otherSreniId === sreniId) continue;
        for (const existing of sameSreniEvents.filter((event) => event.sreniId === otherSreniId && event.scope === 'zone')) {
          warnings.push({
            code: 'OTHER_SRENI_ZONE_EVENT',
            message: `Zone-level event "${existing.title}" exists on this date in ${this.ctx.sreniName(otherSreniId)}.`,
            relatedSreniId: otherSreniId,
            relatedSreniName: this.ctx.sreniName(otherSreniId),
            relatedEventId: existing.id,
            relatedEventTitle: existing.title,
          });
        }
      }
    }

    return warnings;
  }

  createSreniCalendarEvent(
    sreniId: string,
    dto: CreateCalendarEventDto,
    viewer: CalendarViewerContext,
    principal: AuthPrincipal,
  ): CalendarFeedItemRecord {
    if (!this.ctx.sreniExists(sreniId)) {
      throw new NotFoundException('Sreni not found');
    }

    if (dto.scope === 'zone' && !viewer.isZoneViewer) {
      throw new ForbiddenException('Zone scoped events require zone-level access');
    }

    if (dto.scope === 'sthan' && viewer.scope.roleLevel === 'STHAN' && viewer.scope.sthanLocationId) {
      const requested = [...new Set(dto.sthanIds ?? [])];
      if (requested.length && !requested.every((id) => id === viewer.scope.sthanLocationId)) {
        throw new ForbiddenException('You can only create sthan events for your assigned sthan');
      }
      if (!requested.length) {
        dto.sthanIds = [viewer.scope.sthanLocationId];
      }
    }

    const now = new Date().toISOString();
    const actor = principal.email ?? principal.userId;
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
      approvalStatus: CALENDAR_APPROVAL_STATUS.PENDING,
      createdBy: actor,
      createdAt: now,
      updatedBy: actor,
      updatedAt: now,
    };

    this.ctx.calendarEvents.set(event.id, event);
    this.persistSreniEvent(event);
    this.ctx.createReportingApprovalRequest(
      {
        targetId: event.id,
        targetType: 'calendar_event',
        summary: `Calendar event "${event.title}" on ${event.date}`,
      },
      principal,
    );

    return this.toSreniFeedItem(event);
  }

  updateSreniCalendarEvent(
    sreniId: string,
    eventId: string,
    dto: UpdateCalendarEventDto,
    viewer: CalendarViewerContext,
    principal: AuthPrincipal,
  ): CalendarFeedItemRecord {
    const current = this.ctx.calendarEvents.get(eventId);
    if (!current || current.sreniId !== sreniId) {
      throw new NotFoundException('Calendar event not found');
    }

    if (!this.eventVisible(current, viewer, principal)) {
      throw new ForbiddenException('You do not have access to this calendar event');
    }

    const nextScope = dto.scope ?? current.scope;
    if (nextScope === 'zone' && !viewer.isZoneViewer) {
      throw new ForbiddenException('Zone scoped events require zone-level access');
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
      approvalStatus: CALENDAR_APPROVAL_STATUS.PENDING,
      updatedBy: principal.email ?? principal.userId,
      updatedAt: new Date().toISOString(),
    };

    this.ctx.calendarEvents.set(eventId, updated);
    this.persistSreniEvent(updated);
    this.ctx.createReportingApprovalRequest(
      {
        targetId: updated.id,
        targetType: 'calendar_event',
        summary: `Calendar event update "${updated.title}" on ${updated.date}`,
      },
      principal,
    );

    return this.toSreniFeedItem(updated);
  }

  deleteSreniCalendarEvent(
    sreniId: string,
    eventId: string,
    viewer: CalendarViewerContext,
    principal: AuthPrincipal,
  ): { success: boolean; deletedBy: string } {
    const current = this.ctx.calendarEvents.get(eventId);
    if (!current || current.sreniId !== sreniId) {
      throw new NotFoundException('Calendar event not found');
    }
    if (!this.eventVisible(current, viewer, principal)) {
      throw new ForbiddenException('You do not have access to this calendar event');
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

  setSreniEventApprovalStatus(eventId: string, status: CalendarApprovalStatus): void {
    const current = this.ctx.calendarEvents.get(eventId);
    if (!current) return;
    const updated = { ...current, approvalStatus: status, updatedAt: new Date().toISOString() };
    this.ctx.calendarEvents.set(eventId, updated);
    if (this.ctx.runtimeMode === 'db' && this.ctx.dataSource) {
      void this.ctx.dataSource.query(
        `UPDATE adwest.sreni_calendar_events SET approval_status=$2, updated_at=now() WHERE id=$1`,
        [eventId, status],
      ).catch((error) => {
        this.ctx.logWarning(`Failed to update calendar approval status ${eventId}: ${(error as Error).message}`);
      });
    }
  }

  listSreniCalendarEvents(
    sreniId: string,
    viewer: CalendarViewerContext,
    principal: AuthPrincipal,
  ): CalendarEventRecord[] {
    return Array.from(this.ctx.calendarEvents.values())
      .filter((event) => event.sreniId === sreniId)
      .filter((event) => this.eventVisible(event, viewer, principal));
  }

  private eventVisible(
    event: CalendarEventRecord,
    viewer: CalendarViewerContext,
    principal: AuthPrincipal,
  ): boolean {
    if (event.approvalStatus === CALENDAR_APPROVAL_STATUS.REJECTED) {
      const actor = (principal.email ?? principal.userId).trim().toLowerCase();
      const creator = event.createdBy.trim().toLowerCase();
      return viewer.isZoneViewer || creator === actor;
    }

    if (event.approvalStatus === CALENDAR_APPROVAL_STATUS.PENDING) {
      if (viewer.isZoneViewer) return this.matchesSthanScope(event, viewer);
      const actor = (principal.email ?? principal.userId).trim().toLowerCase();
      const creator = event.createdBy.trim().toLowerCase();
      return creator === actor && this.matchesSthanScope(event, viewer);
    }

    return this.matchesSthanScope(event, viewer);
  }

  private matchesSthanScope(event: CalendarEventRecord, viewer: CalendarViewerContext): boolean {
    if (viewer.scope.roleLevel !== 'STHAN' || !viewer.scope.sthanLocationId) {
      return true;
    }
    if (event.scope === 'zone') {
      return false;
    }
    if (!event.sthanIds.length) {
      return true;
    }
    return event.sthanIds.includes(viewer.scope.sthanLocationId);
  }

  private toSreniFeedItem(event: CalendarEventRecord): CalendarFeedItemRecord {
    const priorityTier: CalendarPriorityTier = event.approvalStatus === CALENDAR_APPROVAL_STATUS.PENDING
      ? CALENDAR_PRIORITY_TIER.PENDING
      : event.scope === 'zone'
        ? CALENDAR_PRIORITY_TIER.ZONE
        : CALENDAR_PRIORITY_TIER.STHAN;

    return {
      id: event.id,
      kind: CALENDAR_FEED_KIND.SRENI_EVENT,
      priorityTier,
      approvalStatus: event.approvalStatus,
      title: event.title,
      date: event.date,
      startTime: event.startTime,
      endTime: event.endTime,
      color: event.color,
      notes: event.notes,
      sreniId: event.sreniId,
      scope: event.scope,
      sthanIds: event.sthanIds,
      readOnly: false,
      createdBy: event.createdBy,
      createdAt: event.createdAt,
      updatedBy: event.updatedBy,
      updatedAt: event.updatedAt,
    };
  }

  listSpecialEventsForSreni(sreniId: string): Promise<CalendarFeedItemRecord[]> {
    if (!this.ctx.dataSource) return Promise.resolve([]);

    return this.ctx.dataSource.query(
      `
        SELECT e.id::text, e.title, e.date_time, e.end_date_time, e.venue, e.description,
               e.created_by, e.created_at, e.updated_at
        FROM adwest.special_events e
        INNER JOIN adwest.event_sreni_links l ON l.event_id = e.id
        WHERE l.sreni_id = $1
        ORDER BY e.date_time ASC
      `,
      [sreniId],
    ).then((rows: Array<{
      id: string;
      title: string;
      date_time: string | Date;
      end_date_time: string | Date | null;
      venue: string | null;
      description: string | null;
      created_by: string | null;
      created_at: string | Date;
      updated_at: string | Date;
    }>) => rows.map((row) => {
      const start = new Date(row.date_time);
      const end = row.end_date_time ? new Date(row.end_date_time) : new Date(start.getTime() + 60 * 60 * 1000);
      return {
        id: `special-${row.id}`,
        kind: CALENDAR_FEED_KIND.SPECIAL_EVENT,
        priorityTier: CALENDAR_PRIORITY_TIER.SPECIAL_EVENT,
        title: row.title,
        date: start.toISOString().slice(0, 10),
        startTime: start.toISOString().slice(11, 16),
        endTime: end.toISOString().slice(11, 16),
        color: SPECIAL_EVENT_COLOR,
        notes: [row.venue, row.description].filter(Boolean).join(' — ') || undefined,
        sreniId,
        readOnly: true,
        createdBy: row.created_by ?? 'system',
        createdAt: new Date(row.created_at).toISOString(),
        updatedBy: row.created_by ?? 'system',
        updatedAt: new Date(row.updated_at).toISOString(),
      };
    })).catch(() => []);
  }

  async listSreniCalendarFeedAsync(
    sreniId: string,
    viewer: CalendarViewerContext,
    principal: AuthPrincipal,
  ): Promise<CalendarFeedItemRecord[]> {
    const specialEvents = await this.listSpecialEventsForSreni(sreniId);
    const sreniEvents = this.listSreniCalendarFeed(sreniId, viewer, principal)
      .filter((item) => item.kind === CALENDAR_FEED_KIND.SRENI_EVENT);
    return this.sortFeedItems([...specialEvents, ...sreniEvents]);
  }

  private sortFeedItems(items: CalendarFeedItemRecord[]): CalendarFeedItemRecord[] {
    const rank: Record<CalendarPriorityTier, number> = {
      [CALENDAR_PRIORITY_TIER.SPECIAL_EVENT]: 0,
      [CALENDAR_PRIORITY_TIER.ZONE]: 1,
      [CALENDAR_PRIORITY_TIER.STHAN]: 2,
      [CALENDAR_PRIORITY_TIER.PENDING]: 3,
      [CALENDAR_PRIORITY_TIER.LOCAL]: 4,
    };

    return [...items].sort((a, b) => {
      const tierDiff = rank[a.priorityTier] - rank[b.priorityTier];
      if (tierDiff !== 0) return tierDiff;
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      if (a.startTime !== b.startTime) return a.startTime.localeCompare(b.startTime);
      return a.title.localeCompare(b.title);
    });
  }

  private persistSreniEvent(event: CalendarEventRecord): void {
    if (this.ctx.runtimeMode !== 'db' || !this.ctx.dataSource) return;
    void this.ctx.dataSource.query(
      `
        INSERT INTO adwest.sreni_calendar_events (
          id, sreni_id, title, event_date, start_time, end_time, color, notes,
          scope, sthan_ids, approval_status, created_by, updated_by
        )
        VALUES ($1, $2, $3, $4::date, $5::time, $6::time, $7, $8, $9, $10::jsonb, $11, $12, $13)
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          event_date = EXCLUDED.event_date,
          start_time = EXCLUDED.start_time,
          end_time = EXCLUDED.end_time,
          color = EXCLUDED.color,
          notes = EXCLUDED.notes,
          scope = EXCLUDED.scope,
          sthan_ids = EXCLUDED.sthan_ids,
          approval_status = EXCLUDED.approval_status,
          updated_by = EXCLUDED.updated_by,
          updated_at = now()
      `,
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
        event.approvalStatus,
        event.createdBy,
        event.updatedBy,
      ],
    ).catch((error) => {
      this.ctx.logWarning(`Failed to persist calendar event ${event.id}: ${(error as Error).message}`);
    });
  }
}
