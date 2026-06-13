import { ForbiddenException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AuthPrincipal } from '@modules/user-management/interfaces/auth-principal.interface';
import {
  ContactAccessScope,
  ContactAccessScopeService,
} from './contact-access-scope.service';
import type { CalendarEventRecord } from '../core-business.types';

export interface CalendarViewerContext {
  scope: ContactAccessScope;
  settingsUserId?: string;
  isZoneViewer: boolean;
  accessibleSthanIds: string[];
}

export class CalendarAccessService {
  constructor(
    private readonly contactAccessScope: ContactAccessScopeService,
    private readonly dataSource?: DataSource,
  ) {}

  async resolveViewer(principal: AuthPrincipal): Promise<CalendarViewerContext> {
    const scope = await this.contactAccessScope.resolveScope(principal);
    const settingsUserId = await this.contactAccessScope.resolveSettingsUserId(principal);
    const isZoneViewer = scope.unrestricted || scope.roleLevel !== 'STHAN';
    const accessibleSthanIds = await this.resolveAccessibleSthanIds(scope);

    return {
      scope,
      settingsUserId,
      isZoneViewer,
      accessibleSthanIds,
    };
  }

  assertCanAccessSreni(viewer: CalendarViewerContext, sreniId: string): void {
    this.contactAccessScope.assertCanAccessSreni(viewer.scope, sreniId);
  }

  async assertCanAccessSthan(viewer: CalendarViewerContext, locationId: string): Promise<void> {
    if (viewer.scope.unrestricted) {
      return;
    }

    if (viewer.scope.roleLevel === 'STHAN') {
      const sthanId = viewer.scope.sthanLocationId?.trim();
      if (!sthanId || sthanId !== locationId.trim()) {
        throw new ForbiddenException('You do not have access to this sthan calendar');
      }
      return;
    }

    if (!viewer.accessibleSthanIds.includes(locationId.trim())) {
      throw new ForbiddenException('You do not have access to this sthan calendar');
    }
  }

  canViewPendingSreniEvent(
    event: Pick<CalendarEventRecord, 'createdBy' | 'approvalStatus'>,
    viewer: CalendarViewerContext,
    principal: AuthPrincipal,
  ): boolean {
    if (event.approvalStatus !== 'pending') {
      return true;
    }

    if (viewer.isZoneViewer) {
      return true;
    }

    const actorKeys = this.actorIdentityKeys(principal, viewer.settingsUserId);
    const creator = event.createdBy?.trim().toLowerCase();
    return !!creator && actorKeys.has(creator);
  }

  sreniEventVisibleToViewer(
    event: CalendarEventRecord,
    viewer: CalendarViewerContext,
    principal: AuthPrincipal,
  ): boolean {
    if (!this.contactAccessScope.matchesScopeInMemory(viewer.scope, { sreniId: event.sreniId, taggedSreniIds: [event.sreniId] }, event.sreniId)) {
      return false;
    }

    if (event.approvalStatus === 'rejected') {
      return this.canViewPendingSreniEvent(event, viewer, principal);
    }

    if (event.approvalStatus === 'pending') {
      return this.canViewPendingSreniEvent(event, viewer, principal);
    }

    if (viewer.scope.roleLevel === 'STHAN' && viewer.scope.sthanLocationId) {
      if (event.scope === 'zone') {
        return false;
      }
      if (event.sthanIds.length > 0 && !event.sthanIds.includes(viewer.scope.sthanLocationId)) {
        return false;
      }
    }

    return true;
  }

  private actorIdentityKeys(principal: AuthPrincipal, settingsUserId?: string): Set<string> {
    const keys = new Set<string>();
    if (principal.userId) keys.add(principal.userId.trim().toLowerCase());
    if (settingsUserId) keys.add(settingsUserId.trim().toLowerCase());
    if (principal.email) keys.add(principal.email.trim().toLowerCase());
    return keys;
  }

  private async resolveAccessibleSthanIds(scope: ContactAccessScope): Promise<string[]> {
    if (scope.unrestricted || scope.roleLevel !== 'STHAN') {
      if (!this.dataSource) {
        return [];
      }
      const rows = await this.dataSource.query(
        `SELECT id::text AS id FROM adwest.locations WHERE level = 'sthan' AND active = true ORDER BY name ASC`,
      ) as Array<{ id: string }>;
      return rows.map((row) => row.id);
    }

    return scope.sthanLocationId ? [scope.sthanLocationId] : [];
  }
}
