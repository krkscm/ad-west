import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export class CreateZoneDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  code?: string;
}

export class UpdateZoneDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  code?: string;
}

export class CreateSrenyDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  zoneId!: string;

  @IsOptional()
  @IsBoolean()
  isServiceSreny?: boolean;
}

export class UpdateSrenyDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  zoneId?: string;

  @IsOptional()
  @IsBoolean()
  isServiceSreny?: boolean;
}

export class CreateSreniDefinitionDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  joinUsVisible?: boolean;

  @IsOptional()
  @IsString()
  enrollmentScope?: string;

  @IsOptional()
  @IsString()
  primaryContactStrategy?: string;
}

export class UpdateSreniDefinitionDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsBoolean()
  joinUsVisible?: boolean;

  @IsOptional()
  @IsString()
  enrollmentScope?: string;

  @IsOptional()
  @IsString()
  primaryContactStrategy?: string;
}

export class CreateAnalyticsStudioLayoutDto {
  @IsIn(['details', 'pivot'])
  layoutType!: 'details' | 'pivot';

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  name!: string;

  @IsObject()
  config!: Record<string, unknown>;
}

export class CreateSthanDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  srenyId!: string;
}

export class UpdateSthanDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  srenyId?: string;
}

export class CreateLocationDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsIn(['zone', 'sthan', 'division'])
  level!: 'zone' | 'sthan' | 'division';

  @IsOptional()
  @IsString()
  parentId?: string | null;
}

export class UpdateLocationDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsIn(['zone', 'sthan', 'division'])
  level?: 'zone' | 'sthan' | 'division';

  @IsOptional()
  @IsString()
  parentId?: string | null;
}

export class CreateGovernanceStructureDto {
  @IsInt()
  @Min(2000)
  @Max(2100)
  year!: number;

  @IsArray()
  @IsString({ each: true })
  positions!: string[];
}

export class UpdateGovernanceStructureDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  positions?: string[];

  @IsOptional()
  @IsBoolean()
  archived?: boolean;
}

export class CreateGovernanceAssignmentDto {
  @IsString()
  @IsNotEmpty()
  contactId!: string;

  @IsString()
  @IsNotEmpty()
  positionName!: string;

  @IsDateString()
  startDate!: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class UpdateGovernanceAssignmentDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  contactId?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  positionName?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsBoolean()
  archived?: boolean;
}

export class ClearSreniContactsDto {
  // Empty body — confirmation is done client-side
}

export class CreateCalendarEventDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsDateString()
  date!: string;

  @IsString()
  @IsNotEmpty()
  startTime!: string;

  @IsString()
  @IsNotEmpty()
  endTime!: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsIn(['zone', 'sthan'])
  scope!: 'zone' | 'sthan';

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  sthanIds?: string[];
}

export class UpdateCalendarEventDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  title?: string;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  startTime?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  endTime?: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsIn(['zone', 'sthan'])
  scope?: 'zone' | 'sthan';

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  sthanIds?: string[];
}

export class CreateAttendanceMetricDto {
  @IsString()
  @IsNotEmpty()
  sreniId!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsArray()
  @IsString({ each: true })
  keys!: string[];

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class UpdateAttendanceMetricDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keys?: string[];

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class UpsertEventAttendanceCaptureDto {
  @IsString()
  @IsNotEmpty()
  metricId!: string;

  @IsObject()
  values!: Record<string, string | number | boolean | null>;
}

export class CreateProgramDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;

  @IsInt()
  @Min(1)
  @Max(50000)
  capacity!: number;
}

export class UpdateProgramDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50000)
  capacity?: number;
}

export class CreateSessionDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsDateString()
  startAt!: string;

  @IsDateString()
  endAt!: string;
}

export class UpdateSessionDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsDateString()
  startAt?: string;

  @IsOptional()
  @IsDateString()
  endAt?: string;
}

export class CreateRegistrationDto {
  @IsString()
  @IsNotEmpty()
  contactId!: string;
}

export class RecordAttendanceDto {
  @IsString()
  @IsNotEmpty()
  contactId!: string;

  @IsString()
  @IsIn(['present', 'absent', 'late', 'excused'])
  state!: 'present' | 'absent' | 'late' | 'excused';

  @IsOptional()
  @IsString()
  notes?: string;
}

export class BulkAttendanceUploadDto {
  @IsInt()
  @Min(0)
  presentCount!: number;

  @IsInt()
  @Min(0)
  absentCount!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  lateCount?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  excusedCount?: number;

  @IsOptional()
  @IsString()
  sourceFileName?: string;
}

export class CreateDocumentFolderDto {
  @IsString()
  @IsNotEmpty()
  srenyId!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  parentFolderId?: string;
}

export class CreateDocumentDto {
  @IsString()
  @IsNotEmpty()
  srenyId!: string;

  @IsOptional()
  @IsString()
  folderId?: string;

  @IsString()
  @IsNotEmpty()
  fileName!: string;

  @IsString()
  @IsNotEmpty()
  fileType!: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  @IsIn(['sreny', 'zone', 'private'])
  accessLevel!: 'sreny' | 'zone' | 'private';

  @IsOptional()
  @IsString()
  linkedEntityType?: string;

  @IsOptional()
  @IsString()
  linkedEntityId?: string;

  @IsOptional()
  @IsString()
  sourceDocumentId?: string;
}

export class CreateReportTemplateDto {
  @IsString()
  @IsNotEmpty()
  srenyId!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsArray()
  @IsObject({ each: true })
  fields!: Array<{
    key: string;
    label: string;
    type: 'text' | 'number' | 'date' | 'file' | 'dropdown';
    required?: boolean;
    options?: string[];
  }>;
}

export class CreateReportSubmissionDto {
  @IsString()
  @IsNotEmpty()
  templateId!: string;

  @IsObject()
  answers!: Record<string, string>;
}

export class ReviewReportSubmissionDto {
  @IsString()
  @IsIn(['approved', 'rejected'])
  decision!: 'approved' | 'rejected';

  @IsOptional()
  @IsString()
  note?: string;
}

export class CreateApprovalWorkflowDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsIn(['document_submission', 'report_submission'])
  targetType!: 'document_submission' | 'report_submission';

  @IsArray()
  @IsString({ each: true })
  steps!: string[];

  @IsOptional()
  @IsString()
  @IsIn(['single', 'sequential', 'parallel_any'])
  mode?: 'single' | 'sequential' | 'parallel_any';

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(240)
  escalationHours?: number;
}

export class SubmitApprovalItemDto {
  @IsString()
  @IsNotEmpty()
  workflowId!: string;

  @IsString()
  @IsNotEmpty()
  targetId!: string;

  @IsOptional()
  @IsString()
  summary?: string;
}

export class ReviewApprovalItemDto {
  @IsString()
  @IsIn(['approved', 'rejected', 'need_more_information'])
  decision!: 'approved' | 'rejected' | 'need_more_information';

  @IsOptional()
  @IsString()
  note?: string;
}

export class ResubmitApprovalItemDto {
  @IsOptional()
  @IsString()
  note?: string;
}

// ── Permission definitions ────────────────────────────────────────────────────

export class CreatePermissionDto {
  @IsString()
  @IsNotEmpty()
  locationId!: string;

  @IsString()
  @IsNotEmpty()
  sreniId!: string;

  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdatePermissionDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  code?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

// ── Permission sets ───────────────────────────────────────────────────────────

export class CreatePermissionSetDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissionIds?: string[];
}

export class UpdatePermissionSetDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class SetPermissionSetItemsDto {
  @IsArray()
  @IsString({ each: true })
  permissionIds!: string[];
}

// ── Users ─────────────────────────────────────────────────────────────────────

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  roleId?: string;

  @IsOptional()
  @IsString()
  sthanId?: string;

  @IsOptional()
  @IsString()
  permissionSetId?: string;

  @IsOptional()
  @IsString()
  adminManagement?: string;

  @IsOptional()
  @IsBoolean()
  isSuperAdmin?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  reportingToRoleIds?: string[];
}

export class ChangeOwnPasswordDto {
  @IsString()
  @IsNotEmpty()
  currentPassword!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  newPassword!: string;
}

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  roleId?: string;

  @IsOptional()
  @IsString()
  sthanId?: string;

  @IsOptional()
  @IsString()
  permissionSetId?: string;

  @IsOptional()
  @IsString()
  adminManagement?: string;

  @IsOptional()
  @IsString()
  password?: string;

  @IsOptional()
  @IsBoolean()
  isSuperAdmin?: boolean;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  reportingToRoleIds?: string[];
}

// ── Report Metric Definitions ─────────────────────────────────────────────────

export class CreateReportMetricDefinitionDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsIn(['number', 'text'])
  inputType!: 'number' | 'text';

  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsNumber()
  target?: number;
}

export class UpdateReportMetricDefinitionDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsIn(['number', 'text'])
  inputType?: 'number' | 'text';

  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsNumber()
  target?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

// ── Location Report Metric Definitions (shared across all sthans) ────────────

export class CreateLocationReportMetricDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsIn(['number', 'text'])
  inputType!: 'number' | 'text';

  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

export class UpdateLocationReportMetricDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsIn(['number', 'text'])
  inputType?: 'number' | 'text';

  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
  // NOTE: no active field — location metrics cannot be deactivated
}

// ── Sreni Monthly Reports ─────────────────────────────────────────────────────

export class SubmitSreniMonthlyReportDto {
  @IsInt()
  @Min(2020)
  year!: number;

  @IsInt()
  @Min(1)
  @Max(12)
  month!: number;

  @IsObject()
  entries!: Record<string, string>;

  @IsOptional()
  @IsString()
  notes?: string;
}

// ── Sreni Report Configuration ────────────────────────────────────────────────

export class UpsertSreniReportConfigDto {
  @IsBoolean()
  active!: boolean;
}

export class CreateSreniReportParameterDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsIn(['number', 'text'])
  inputType!: 'number' | 'text';

  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

export class UpdateSreniReportParameterDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsIn(['number', 'text'])
  inputType?: 'number' | 'text';

  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class SubmitSreniReportDto {
  @IsIn(['monthly', 'half_yearly', 'yearly'])
  submissionType!: 'monthly' | 'half_yearly' | 'yearly';

  @IsInt()
  @Min(2020)
  periodYear!: number;

  @IsInt()
  @Min(1)
  @Max(12)
  periodValue!: number;

  @IsObject()
  entries!: Record<string, string>;

  @IsOptional()
  @IsString()
  notes?: string;
}

// ── Sthan DTOs ────────────────────────────────────────────────────────────────

export class CreateSthanReportMetricDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsIn(['number', 'text'])
  inputType!: 'number' | 'text';

  @IsBoolean()
  isRequired!: boolean;

  @IsInt()
  @Min(0)
  sortOrder!: number;
}

export class UpdateSthanReportMetricDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsIn(['number', 'text'])
  inputType?: 'number' | 'text';

  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class SubmitSthanReportDto {
  @IsInt()
  @Min(2020)
  periodYear!: number;

  @IsInt()
  @Min(1)
  @Max(12)
  periodMonth!: number;

  @IsObject()
  entries!: Record<string, string>;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateSthanExpenseDto {
  @IsIn(['travel', 'food', 'accommodation', 'event_supplies', 'printing', 'other'])
  category!: string;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsNumber()
  @Min(0)
  amount!: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsBoolean()
  asDraft?: boolean;
}

export class ReviewSthanExpenseDto {
  @IsIn(['approved', 'rejected', 'pending_review'])
  status!: 'approved' | 'rejected' | 'pending_review';

  @IsOptional()
  @IsString()
  reviewerNotes?: string;
}

export class CreateSthanCalendarEventDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsDateString()
  date!: string;

  @IsString()
  @IsNotEmpty()
  startTime!: string;

  @IsString()
  @IsNotEmpty()
  endTime!: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateSthanCalendarEventDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  title?: string;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  startTime?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  endTime?: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

// ── Sreni Divisions ───────────────────────────────────────────────────────────

export class CreateSreniDivisionDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsInt()
  displayOrder?: number;
}

export class UpdateSreniDivisionDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsInt()
  displayOrder?: number;
}

export class AssignContactDivisionDto {
  @IsOptional()
  @IsString()
  divisionId?: string | null;
}

export class AssignContactSthanDto {
  @IsOptional()
  @IsString()
  sthanId?: string | null;
}

export class SetContactActiveDto {
  @IsBoolean()
  active!: boolean;
}

export class ContactSreniTagItemDto {
  @IsString()
  sreniId!: string;

  @IsOptional()
  @IsString()
  divisionId?: string | null;
}

export class SetContactSreniTagsDto {
  @IsArray()
  tags!: ContactSreniTagItemDto[];
}

export class CreateHouseholdMemberDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsIn(['child', 'other'])
  role?: 'child' | 'other';

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @IsOptional()
  @IsString()
  divisionId?: string;
}

export class UpdateHouseholdMemberDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @IsOptional()
  @IsString()
  divisionId?: string | null;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
