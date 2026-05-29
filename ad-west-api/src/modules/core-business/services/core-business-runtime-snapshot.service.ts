import { BadRequestException } from '@nestjs/common';
import type {
  ApprovalItemRecord,
  ApprovalNotificationRecord,
  ApprovalWorkflowRecord,
  AttendanceMetricRecord,
  AttendanceRecord,
  CalendarEventRecord,
  DocumentFolderRecord,
  DocumentRecord,
  EditRequestRecord,
  EventAttendanceCaptureRecord,
  GovernanceAssignmentRecord,
  GovernanceStructureRecord,
  ImportRecord,
  LocationRecord,
  PermissionRecord,
  PermissionSetRecord,
  ProgramRecord,
  ReportSubmissionRecord,
  ReportTemplateRecord,
  SrenyRecord,
  SthanRecord,
  TicketActivityRecord,
  TicketRecord,
  UserRecord,
  ZoneRecord,
} from '../core-business.service';

export interface CoreBusinessRuntimeSnapshot {
  version: 1;
  locations: LocationRecord[];
  zones: ZoneRecord[];
  srenies: SrenyRecord[];
  sthans: SthanRecord[];
  governanceStructures: GovernanceStructureRecord[];
  governanceAssignments: GovernanceAssignmentRecord[];
  imports: ImportRecord[];
  programs: ProgramRecord[];
  attendance: AttendanceRecord[];
  tickets: TicketRecord[];
  ticketActivity: TicketActivityRecord[];
  editRequests: EditRequestRecord[];
  documentFolders: DocumentFolderRecord[];
  documents: DocumentRecord[];
  reportTemplates: ReportTemplateRecord[];
  reportSubmissions: ReportSubmissionRecord[];
  approvalWorkflows: ApprovalWorkflowRecord[];
  approvalItems: ApprovalItemRecord[];
  approvalNotifications: ApprovalNotificationRecord[];
  permissions: PermissionRecord[];
  permissionSets: PermissionSetRecord[];
  users: UserRecord[];
  calendarEvents: CalendarEventRecord[];
  attendanceMetrics: AttendanceMetricRecord[];
  eventAttendanceCaptures: EventAttendanceCaptureRecord[];
}

export interface CoreBusinessRuntimeSnapshotContext {
  locations: Map<string, LocationRecord>;
  zones: Map<string, ZoneRecord>;
  srenies: Map<string, SrenyRecord>;
  sthans: Map<string, SthanRecord>;
  governanceStructures: Map<string, GovernanceStructureRecord>;
  governanceAssignments: Map<string, GovernanceAssignmentRecord>;
  imports: Map<string, ImportRecord>;
  programs: Map<string, ProgramRecord>;
  attendance: Map<string, AttendanceRecord>;
  tickets: Map<string, TicketRecord>;
  ticketActivity: Map<string, TicketActivityRecord>;
  editRequests: Map<string, EditRequestRecord>;
  documentFolders: Map<string, DocumentFolderRecord>;
  documents: Map<string, DocumentRecord>;
  reportTemplates: Map<string, ReportTemplateRecord>;
  reportSubmissions: Map<string, ReportSubmissionRecord>;
  approvalWorkflows: Map<string, ApprovalWorkflowRecord>;
  approvalItems: Map<string, ApprovalItemRecord>;
  approvalNotifications: Map<string, ApprovalNotificationRecord>;
  permissions: Map<string, PermissionRecord>;
  permissionSets: Map<string, PermissionSetRecord>;
  users: Map<string, UserRecord>;
  calendarEvents: Map<string, CalendarEventRecord>;
  attendanceMetrics: Map<string, AttendanceMetricRecord>;
  eventAttendanceCaptures: Map<string, EventAttendanceCaptureRecord>;
}

export class CoreBusinessRuntimeSnapshotService {
  constructor(private readonly ctx: CoreBusinessRuntimeSnapshotContext) {}

  buildRuntimeSnapshot(): CoreBusinessRuntimeSnapshot {
    return {
      version: 1,
      locations: Array.from(this.ctx.locations.values()),
      zones: Array.from(this.ctx.zones.values()),
      srenies: Array.from(this.ctx.srenies.values()),
      sthans: Array.from(this.ctx.sthans.values()),
      governanceStructures: Array.from(this.ctx.governanceStructures.values()),
      governanceAssignments: Array.from(this.ctx.governanceAssignments.values()),
      imports: Array.from(this.ctx.imports.values()),
      programs: Array.from(this.ctx.programs.values()),
      attendance: Array.from(this.ctx.attendance.values()),
      tickets: Array.from(this.ctx.tickets.values()),
      ticketActivity: Array.from(this.ctx.ticketActivity.values()),
      editRequests: Array.from(this.ctx.editRequests.values()),
      documentFolders: Array.from(this.ctx.documentFolders.values()),
      documents: Array.from(this.ctx.documents.values()),
      reportTemplates: Array.from(this.ctx.reportTemplates.values()),
      reportSubmissions: Array.from(this.ctx.reportSubmissions.values()),
      approvalWorkflows: Array.from(this.ctx.approvalWorkflows.values()),
      approvalItems: Array.from(this.ctx.approvalItems.values()),
      approvalNotifications: Array.from(this.ctx.approvalNotifications.values()),
      permissions: Array.from(this.ctx.permissions.values()),
      permissionSets: Array.from(this.ctx.permissionSets.values()),
      users: Array.from(this.ctx.users.values()),
      calendarEvents: Array.from(this.ctx.calendarEvents.values()),
      attendanceMetrics: Array.from(this.ctx.attendanceMetrics.values()),
      eventAttendanceCaptures: Array.from(this.ctx.eventAttendanceCaptures.values()),
    };
  }

  hydrateRuntimeSnapshot(snapshotJson: string): void {
    const parsed = JSON.parse(snapshotJson) as CoreBusinessRuntimeSnapshot;
    if (parsed.version !== 1) {
      throw new BadRequestException('Unsupported Core Business runtime snapshot version');
    }

    this.loadMap(this.ctx.locations, parsed.locations ?? []);
    this.loadMap(this.ctx.zones, parsed.zones);
    this.loadMap(this.ctx.srenies, parsed.srenies);
    this.loadMap(this.ctx.sthans, parsed.sthans);
    this.loadMap(this.ctx.governanceStructures, parsed.governanceStructures);
    this.loadMap(this.ctx.governanceAssignments, parsed.governanceAssignments);
    this.loadMap(this.ctx.imports, parsed.imports);
    this.loadMap(this.ctx.programs, parsed.programs);
    this.loadMap(this.ctx.attendance, parsed.attendance);
    this.loadMap(this.ctx.tickets, parsed.tickets);
    this.loadMap(this.ctx.ticketActivity, parsed.ticketActivity);
    this.loadMap(this.ctx.editRequests, parsed.editRequests);
    this.loadMap(this.ctx.documentFolders, parsed.documentFolders);
    this.loadMap(this.ctx.documents, parsed.documents);
    this.loadMap(this.ctx.reportTemplates, parsed.reportTemplates);
    this.loadMap(this.ctx.reportSubmissions, parsed.reportSubmissions);
    this.loadMap(this.ctx.approvalWorkflows, parsed.approvalWorkflows);
    this.loadMap(this.ctx.approvalItems, parsed.approvalItems);
    this.loadMap(this.ctx.approvalNotifications, parsed.approvalNotifications);
    this.loadMap(this.ctx.permissions, parsed.permissions ?? []);
    this.loadMap(this.ctx.permissionSets, parsed.permissionSets ?? []);
    this.loadMap(this.ctx.users, parsed.users ?? []);
    this.loadMap(this.ctx.calendarEvents, parsed.calendarEvents ?? []);
    this.loadMap(this.ctx.attendanceMetrics, parsed.attendanceMetrics ?? []);
    this.loadMap(this.ctx.eventAttendanceCaptures, parsed.eventAttendanceCaptures ?? []);
  }

  private loadMap<T extends { id: string }>(target: Map<string, T>, rows: T[]): void {
    target.clear();
    for (const row of rows) {
      target.set(row.id, row);
    }
  }
}
