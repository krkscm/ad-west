/** Canonical enum_type keys — values live in adwest.enum_values (Settings → Reference Data). */
export const ENUM_TYPES = {
  // Already wired (admin / org)
  ADMIN_ROLE: 'admin_role',
  SCOPE_TYPE: 'scope_type',
  ROLE_LEVEL: 'role_level',
  APPROVAL_MODE: 'approval_mode',
  // Household / participants
  PRIMARY_CONTACT_STRATEGY: 'primary_contact_strategy',
  ENROLLMENT_SCOPE: 'enrollment_scope',
  HOUSEHOLD_MEMBER_ROLE: 'household_member_role',
  HOUSEHOLD_MEMBER_SOURCE: 'household_member_source',
  FEMALE_GENDER_MATCH: 'female_gender_match',
  // Locations & org
  LOCATION_LEVEL: 'location_level',
  // Expenses (Sthan + reimbursements)
  EXPENSE_CATEGORY: 'expense_category',
  EXPENSE_STATUS: 'expense_status',
  // Reports
  REPORT_SUBMISSION_TYPE: 'report_submission_type',
  REPORT_METRIC_INPUT_TYPE: 'report_metric_input_type',
  REPORT_METRIC_SCOPE: 'report_metric_scope',
  SRENI_REPORT_STATUS: 'sreni_report_status',
  REPORT_SUBMISSION_STATUS: 'report_submission_status',
  REPORT_TEMPLATE_FIELD_TYPE: 'report_template_field_type',
  // Documents
  DOCUMENT_ACCESS_LEVEL: 'document_access_level',
  // Calendar
  CALENDAR_EVENT_SCOPE: 'calendar_event_scope',
  CALENDAR_APPROVAL_STATUS: 'calendar_approval_status',
  CALENDAR_PRIORITY_TIER: 'calendar_priority_tier',
  CALENDAR_FEED_KIND: 'calendar_feed_kind',
  // Programs & attendance
  PROGRAM_STATUS: 'program_status',
  REGISTRATION_STATUS: 'registration_status',
  ATTENDANCE_STATE: 'attendance_state',
  // Approvals
  APPROVAL_TARGET_TYPE: 'approval_target_type',
  APPROVAL_ITEM_STATUS: 'approval_item_status',
  APPROVAL_DECISION: 'approval_decision',
  // Helpdesk & jobs (values must match PG enum until column migration)
  HELPDESK_TICKET_CATEGORY: 'helpdesk_ticket_category',
  HELPDESK_TICKET_STATUS: 'helpdesk_ticket_status',
  JOB_POSTING_TYPE: 'job_posting_type',
  JOB_APPLICATION_STATUS: 'job_application_status',
  JOB_APPLICATION_ACTIVITY: 'job_application_activity',
  // Member services
  FORM_FIELD_TYPE: 'form_field_type',
  NOTIFICATION_TARGET: 'notification_target',
  // Public contact registration
  CONTACT_LIVING_TYPE: 'contact_living_type',
  CONTACT_COUNTRY: 'contact_country',
  CONTACT_BLOOD_GROUP: 'contact_blood_group',
  CONTACT_CURRENT_STATUS: 'contact_current_status',
  CONTACT_CHILD_GRADE: 'contact_child_grade',
  CONTACT_YES_NO: 'contact_yes_no',
  // Imports & workflow
  IMPORT_STATUS: 'import_status',
  DEDUP_DECISION: 'dedup_decision',
  MEMBER_EDIT_STATUS: 'member_edit_status',
  // Analytics (low-change internal)
  ANALYTICS_LAYOUT_TYPE: 'analytics_layout_type',
} as const;

export type EnumTypeKey = (typeof ENUM_TYPES)[keyof typeof ENUM_TYPES];

export type EnumSeedRow = {
  enumType: string;
  value: string;
  label: string;
  sortOrder: number;
  active: boolean;
  parentValue: string | null;
};

/** Single source of truth for enum seeds (API in-memory + SQL migrations). */
export const PLATFORM_ENUM_SEEDS: EnumSeedRow[] = [
  // Admin roles
  { enumType: ENUM_TYPES.ADMIN_ROLE, value: 'SUPER_ADMIN', label: 'Super Admin', sortOrder: 10, active: true, parentValue: null },
  { enumType: ENUM_TYPES.ADMIN_ROLE, value: 'ZONE_ADMIN', label: 'Zone Admin', sortOrder: 20, active: true, parentValue: null },
  { enumType: ENUM_TYPES.ADMIN_ROLE, value: 'SRENY_ADMIN', label: 'Sreny Admin', sortOrder: 30, active: true, parentValue: null },
  // Scope types
  { enumType: ENUM_TYPES.SCOPE_TYPE, value: 'global', label: 'Global', sortOrder: 10, active: true, parentValue: null },
  { enumType: ENUM_TYPES.SCOPE_TYPE, value: 'zone', label: 'Zone', sortOrder: 20, active: true, parentValue: null },
  { enumType: ENUM_TYPES.SCOPE_TYPE, value: 'sreny', label: 'Sreny', sortOrder: 30, active: true, parentValue: null },
  // Role levels
  { enumType: ENUM_TYPES.ROLE_LEVEL, value: 'ZONE', label: 'Zone', sortOrder: 10, active: true, parentValue: null },
  { enumType: ENUM_TYPES.ROLE_LEVEL, value: 'STHAN', label: 'Sthan', sortOrder: 20, active: true, parentValue: 'ZONE' },
  // Approval modes
  { enumType: ENUM_TYPES.APPROVAL_MODE, value: 'sequential', label: 'Sequential', sortOrder: 10, active: true, parentValue: null },
  { enumType: ENUM_TYPES.APPROVAL_MODE, value: 'parallel', label: 'Parallel', sortOrder: 20, active: true, parentValue: null },
  // Family contact / Sreni participation
  { enumType: ENUM_TYPES.PRIMARY_CONTACT_STRATEGY, value: 'HOUSEHOLD_HEAD', label: 'Primary family contact', sortOrder: 10, active: true, parentValue: 'household_head' },
  { enumType: ENUM_TYPES.PRIMARY_CONTACT_STRATEGY, value: 'FEMALE_PARTICIPANTS', label: 'Women in the family (Mahila)', sortOrder: 20, active: true, parentValue: 'female_participants' },
  { enumType: ENUM_TYPES.PRIMARY_CONTACT_STRATEGY, value: 'ENROLLED_CHILDREN', label: 'Enrolled children (Bala Bharathi)', sortOrder: 30, active: true, parentValue: 'enrolled_children' },
  { enumType: ENUM_TYPES.ENROLLMENT_SCOPE, value: 'HOUSEHOLD', label: 'Family contact — one division for the row', sortOrder: 10, active: true, parentValue: null },
  { enumType: ENUM_TYPES.ENROLLMENT_SCOPE, value: 'MEMBER', label: 'Individual member — division per enrolled person', sortOrder: 20, active: true, parentValue: null },
  { enumType: ENUM_TYPES.HOUSEHOLD_MEMBER_ROLE, value: 'head', label: 'Primary contact', sortOrder: 10, active: true, parentValue: null },
  { enumType: ENUM_TYPES.HOUSEHOLD_MEMBER_ROLE, value: 'spouse', label: 'Spouse', sortOrder: 20, active: true, parentValue: null },
  { enumType: ENUM_TYPES.HOUSEHOLD_MEMBER_ROLE, value: 'child', label: 'Child', sortOrder: 30, active: true, parentValue: null },
  { enumType: ENUM_TYPES.HOUSEHOLD_MEMBER_ROLE, value: 'other', label: 'Other member', sortOrder: 40, active: true, parentValue: null },
  { enumType: ENUM_TYPES.HOUSEHOLD_MEMBER_SOURCE, value: 'import', label: 'From Excel import', sortOrder: 10, active: true, parentValue: null },
  { enumType: ENUM_TYPES.HOUSEHOLD_MEMBER_SOURCE, value: 'manual', label: 'Added in app', sortOrder: 20, active: true, parentValue: null },
  { enumType: ENUM_TYPES.FEMALE_GENDER_MATCH, value: 'f', label: 'f', sortOrder: 10, active: true, parentValue: null },
  { enumType: ENUM_TYPES.FEMALE_GENDER_MATCH, value: 'female', label: 'Female', sortOrder: 20, active: true, parentValue: null },
  { enumType: ENUM_TYPES.FEMALE_GENDER_MATCH, value: 'woman', label: 'Woman', sortOrder: 30, active: true, parentValue: null },
  { enumType: ENUM_TYPES.FEMALE_GENDER_MATCH, value: 'women', label: 'Women', sortOrder: 40, active: true, parentValue: null },
  // Locations
  { enumType: ENUM_TYPES.LOCATION_LEVEL, value: 'zone', label: 'Zone', sortOrder: 10, active: true, parentValue: null },
  { enumType: ENUM_TYPES.LOCATION_LEVEL, value: 'sthan', label: 'Sthan', sortOrder: 20, active: true, parentValue: 'zone' },
  { enumType: ENUM_TYPES.LOCATION_LEVEL, value: 'division', label: 'Division', sortOrder: 30, active: true, parentValue: 'sthan' },
  // Expenses
  { enumType: ENUM_TYPES.EXPENSE_CATEGORY, value: 'travel', label: 'Travel', sortOrder: 10, active: true, parentValue: null },
  { enumType: ENUM_TYPES.EXPENSE_CATEGORY, value: 'food', label: 'Food & Meals', sortOrder: 20, active: true, parentValue: null },
  { enumType: ENUM_TYPES.EXPENSE_CATEGORY, value: 'accommodation', label: 'Accommodation', sortOrder: 30, active: true, parentValue: null },
  { enumType: ENUM_TYPES.EXPENSE_CATEGORY, value: 'event_supplies', label: 'Event Supplies', sortOrder: 40, active: true, parentValue: null },
  { enumType: ENUM_TYPES.EXPENSE_CATEGORY, value: 'printing', label: 'Printing', sortOrder: 50, active: true, parentValue: null },
  { enumType: ENUM_TYPES.EXPENSE_CATEGORY, value: 'other', label: 'Other', sortOrder: 60, active: true, parentValue: null },
  { enumType: ENUM_TYPES.EXPENSE_STATUS, value: 'draft', label: 'Draft', sortOrder: 10, active: true, parentValue: null },
  { enumType: ENUM_TYPES.EXPENSE_STATUS, value: 'submitted', label: 'Submitted', sortOrder: 20, active: true, parentValue: null },
  { enumType: ENUM_TYPES.EXPENSE_STATUS, value: 'pending_review', label: 'Pending Review', sortOrder: 30, active: true, parentValue: null },
  { enumType: ENUM_TYPES.EXPENSE_STATUS, value: 'approved', label: 'Approved', sortOrder: 40, active: true, parentValue: null },
  { enumType: ENUM_TYPES.EXPENSE_STATUS, value: 'rejected', label: 'Rejected', sortOrder: 50, active: true, parentValue: null },
  // Reports
  { enumType: ENUM_TYPES.REPORT_SUBMISSION_TYPE, value: 'monthly', label: 'Monthly', sortOrder: 10, active: true, parentValue: null },
  { enumType: ENUM_TYPES.REPORT_SUBMISSION_TYPE, value: 'half_yearly', label: 'Half-yearly', sortOrder: 20, active: true, parentValue: null },
  { enumType: ENUM_TYPES.REPORT_SUBMISSION_TYPE, value: 'yearly', label: 'Yearly', sortOrder: 30, active: true, parentValue: null },
  { enumType: ENUM_TYPES.REPORT_METRIC_INPUT_TYPE, value: 'number', label: 'Number', sortOrder: 10, active: true, parentValue: null },
  { enumType: ENUM_TYPES.REPORT_METRIC_INPUT_TYPE, value: 'text', label: 'Text', sortOrder: 20, active: true, parentValue: null },
  { enumType: ENUM_TYPES.REPORT_METRIC_SCOPE, value: 'sreni', label: 'Sreni', sortOrder: 10, active: true, parentValue: null },
  { enumType: ENUM_TYPES.REPORT_METRIC_SCOPE, value: 'location', label: 'Location', sortOrder: 20, active: true, parentValue: null },
  { enumType: ENUM_TYPES.SRENI_REPORT_STATUS, value: 'draft', label: 'Draft', sortOrder: 10, active: true, parentValue: null },
  { enumType: ENUM_TYPES.SRENI_REPORT_STATUS, value: 'submitted', label: 'Submitted', sortOrder: 20, active: true, parentValue: null },
  { enumType: ENUM_TYPES.REPORT_SUBMISSION_STATUS, value: 'pending', label: 'Pending', sortOrder: 10, active: true, parentValue: null },
  { enumType: ENUM_TYPES.REPORT_SUBMISSION_STATUS, value: 'approved', label: 'Approved', sortOrder: 20, active: true, parentValue: null },
  { enumType: ENUM_TYPES.REPORT_SUBMISSION_STATUS, value: 'rejected', label: 'Rejected', sortOrder: 30, active: true, parentValue: null },
  { enumType: ENUM_TYPES.REPORT_TEMPLATE_FIELD_TYPE, value: 'text', label: 'Text', sortOrder: 10, active: true, parentValue: null },
  { enumType: ENUM_TYPES.REPORT_TEMPLATE_FIELD_TYPE, value: 'number', label: 'Number', sortOrder: 20, active: true, parentValue: null },
  { enumType: ENUM_TYPES.REPORT_TEMPLATE_FIELD_TYPE, value: 'date', label: 'Date', sortOrder: 30, active: true, parentValue: null },
  { enumType: ENUM_TYPES.REPORT_TEMPLATE_FIELD_TYPE, value: 'file', label: 'File', sortOrder: 40, active: true, parentValue: null },
  { enumType: ENUM_TYPES.REPORT_TEMPLATE_FIELD_TYPE, value: 'dropdown', label: 'Dropdown', sortOrder: 50, active: true, parentValue: null },
  // Documents
  { enumType: ENUM_TYPES.DOCUMENT_ACCESS_LEVEL, value: 'sreny', label: 'Sreny', sortOrder: 10, active: true, parentValue: null },
  { enumType: ENUM_TYPES.DOCUMENT_ACCESS_LEVEL, value: 'zone', label: 'Zone', sortOrder: 20, active: true, parentValue: null },
  { enumType: ENUM_TYPES.DOCUMENT_ACCESS_LEVEL, value: 'private', label: 'Private', sortOrder: 30, active: true, parentValue: null },
  // Calendar
  { enumType: ENUM_TYPES.CALENDAR_EVENT_SCOPE, value: 'zone', label: 'Zone', sortOrder: 10, active: true, parentValue: null },
  { enumType: ENUM_TYPES.CALENDAR_EVENT_SCOPE, value: 'sthan', label: 'Sthan', sortOrder: 20, active: true, parentValue: null },
  { enumType: ENUM_TYPES.CALENDAR_APPROVAL_STATUS, value: 'pending', label: 'Pending', sortOrder: 10, active: true, parentValue: null },
  { enumType: ENUM_TYPES.CALENDAR_APPROVAL_STATUS, value: 'approved', label: 'Approved', sortOrder: 20, active: true, parentValue: null },
  { enumType: ENUM_TYPES.CALENDAR_APPROVAL_STATUS, value: 'rejected', label: 'Rejected', sortOrder: 30, active: true, parentValue: null },
  { enumType: ENUM_TYPES.CALENDAR_PRIORITY_TIER, value: 'special_event', label: 'Special Event', sortOrder: 10, active: true, parentValue: null },
  { enumType: ENUM_TYPES.CALENDAR_PRIORITY_TIER, value: 'zone', label: 'Zone', sortOrder: 20, active: true, parentValue: null },
  { enumType: ENUM_TYPES.CALENDAR_PRIORITY_TIER, value: 'sthan', label: 'Sthan', sortOrder: 30, active: true, parentValue: null },
  { enumType: ENUM_TYPES.CALENDAR_PRIORITY_TIER, value: 'pending', label: 'Pending Approval', sortOrder: 40, active: true, parentValue: null },
  { enumType: ENUM_TYPES.CALENDAR_PRIORITY_TIER, value: 'local', label: 'Local (Sthan)', sortOrder: 50, active: true, parentValue: null },
  { enumType: ENUM_TYPES.CALENDAR_FEED_KIND, value: 'special_event', label: 'Special Event', sortOrder: 10, active: true, parentValue: null },
  { enumType: ENUM_TYPES.CALENDAR_FEED_KIND, value: 'sreni_event', label: 'Sreni Event', sortOrder: 20, active: true, parentValue: null },
  { enumType: ENUM_TYPES.CALENDAR_FEED_KIND, value: 'sthan_local', label: 'Sthan Local Event', sortOrder: 30, active: true, parentValue: null },
  // Programs
  { enumType: ENUM_TYPES.PROGRAM_STATUS, value: 'draft', label: 'Draft', sortOrder: 10, active: true, parentValue: null },
  { enumType: ENUM_TYPES.PROGRAM_STATUS, value: 'published', label: 'Published', sortOrder: 20, active: true, parentValue: null },
  { enumType: ENUM_TYPES.PROGRAM_STATUS, value: 'archived', label: 'Archived', sortOrder: 30, active: true, parentValue: null },
  { enumType: ENUM_TYPES.REGISTRATION_STATUS, value: 'registered', label: 'Registered', sortOrder: 10, active: true, parentValue: null },
  { enumType: ENUM_TYPES.REGISTRATION_STATUS, value: 'waitlisted', label: 'Waitlisted', sortOrder: 20, active: true, parentValue: null },
  { enumType: ENUM_TYPES.REGISTRATION_STATUS, value: 'cancelled', label: 'Cancelled', sortOrder: 30, active: true, parentValue: null },
  { enumType: ENUM_TYPES.ATTENDANCE_STATE, value: 'present', label: 'Present', sortOrder: 10, active: true, parentValue: null },
  { enumType: ENUM_TYPES.ATTENDANCE_STATE, value: 'absent', label: 'Absent', sortOrder: 20, active: true, parentValue: null },
  { enumType: ENUM_TYPES.ATTENDANCE_STATE, value: 'late', label: 'Late', sortOrder: 30, active: true, parentValue: null },
  { enumType: ENUM_TYPES.ATTENDANCE_STATE, value: 'excused', label: 'Excused', sortOrder: 40, active: true, parentValue: null },
  // Approvals
  { enumType: ENUM_TYPES.APPROVAL_TARGET_TYPE, value: 'document_submission', label: 'Document submission', sortOrder: 10, active: true, parentValue: null },
  { enumType: ENUM_TYPES.APPROVAL_TARGET_TYPE, value: 'report_submission', label: 'Report submission', sortOrder: 20, active: true, parentValue: null },
  { enumType: ENUM_TYPES.APPROVAL_TARGET_TYPE, value: 'calendar_event', label: 'Calendar event', sortOrder: 30, active: true, parentValue: null },
  { enumType: ENUM_TYPES.APPROVAL_TARGET_TYPE, value: 'reimbursement_request', label: 'Reimbursement request', sortOrder: 40, active: true, parentValue: null },
  { enumType: ENUM_TYPES.APPROVAL_ITEM_STATUS, value: 'pending', label: 'Pending', sortOrder: 10, active: true, parentValue: null },
  { enumType: ENUM_TYPES.APPROVAL_ITEM_STATUS, value: 'approved', label: 'Approved', sortOrder: 20, active: true, parentValue: null },
  { enumType: ENUM_TYPES.APPROVAL_ITEM_STATUS, value: 'rejected', label: 'Rejected', sortOrder: 30, active: true, parentValue: null },
  { enumType: ENUM_TYPES.APPROVAL_ITEM_STATUS, value: 'need_more_information', label: 'Need more information', sortOrder: 40, active: true, parentValue: null },
  { enumType: ENUM_TYPES.APPROVAL_DECISION, value: 'approved', label: 'Approved', sortOrder: 10, active: true, parentValue: null },
  { enumType: ENUM_TYPES.APPROVAL_DECISION, value: 'rejected', label: 'Rejected', sortOrder: 20, active: true, parentValue: null },
  { enumType: ENUM_TYPES.APPROVAL_DECISION, value: 'need_more_information', label: 'Need more information', sortOrder: 30, active: true, parentValue: null },
  // Helpdesk
  { enumType: ENUM_TYPES.HELPDESK_TICKET_CATEGORY, value: 'general', label: 'General', sortOrder: 10, active: true, parentValue: null },
  { enumType: ENUM_TYPES.HELPDESK_TICKET_CATEGORY, value: 'technical', label: 'Technical', sortOrder: 20, active: true, parentValue: null },
  { enumType: ENUM_TYPES.HELPDESK_TICKET_CATEGORY, value: 'financial', label: 'Financial', sortOrder: 30, active: true, parentValue: null },
  { enumType: ENUM_TYPES.HELPDESK_TICKET_CATEGORY, value: 'membership', label: 'Membership', sortOrder: 40, active: true, parentValue: null },
  { enumType: ENUM_TYPES.HELPDESK_TICKET_CATEGORY, value: 'other', label: 'Other', sortOrder: 50, active: true, parentValue: null },
  { enumType: ENUM_TYPES.HELPDESK_TICKET_STATUS, value: 'open', label: 'Open', sortOrder: 10, active: true, parentValue: null },
  { enumType: ENUM_TYPES.HELPDESK_TICKET_STATUS, value: 'in_progress', label: 'In Progress', sortOrder: 20, active: true, parentValue: null },
  { enumType: ENUM_TYPES.HELPDESK_TICKET_STATUS, value: 'resolved', label: 'Resolved', sortOrder: 30, active: true, parentValue: null },
  { enumType: ENUM_TYPES.HELPDESK_TICKET_STATUS, value: 'closed', label: 'Closed', sortOrder: 40, active: true, parentValue: null },
  // Jobs
  { enumType: ENUM_TYPES.JOB_POSTING_TYPE, value: 'full_time', label: 'Full-time', sortOrder: 10, active: true, parentValue: null },
  { enumType: ENUM_TYPES.JOB_POSTING_TYPE, value: 'part_time', label: 'Part-time', sortOrder: 20, active: true, parentValue: null },
  { enumType: ENUM_TYPES.JOB_POSTING_TYPE, value: 'contract', label: 'Contract', sortOrder: 30, active: true, parentValue: null },
  { enumType: ENUM_TYPES.JOB_POSTING_TYPE, value: 'volunteer', label: 'Volunteer', sortOrder: 40, active: true, parentValue: null },
  { enumType: ENUM_TYPES.JOB_APPLICATION_STATUS, value: 'new', label: 'New', sortOrder: 10, active: true, parentValue: null },
  { enumType: ENUM_TYPES.JOB_APPLICATION_STATUS, value: 'under_review', label: 'Under Review', sortOrder: 20, active: true, parentValue: null },
  { enumType: ENUM_TYPES.JOB_APPLICATION_STATUS, value: 'shortlisted', label: 'Shortlisted', sortOrder: 30, active: true, parentValue: null },
  { enumType: ENUM_TYPES.JOB_APPLICATION_STATUS, value: 'rejected', label: 'Rejected', sortOrder: 40, active: true, parentValue: null },
  { enumType: ENUM_TYPES.JOB_APPLICATION_STATUS, value: 'accepted', label: 'Accepted', sortOrder: 50, active: true, parentValue: null },
  { enumType: ENUM_TYPES.JOB_APPLICATION_ACTIVITY, value: 'submitted', label: 'Application submitted', sortOrder: 10, active: true, parentValue: null },
  { enumType: ENUM_TYPES.JOB_APPLICATION_ACTIVITY, value: 'status_changed', label: 'Status updated', sortOrder: 20, active: true, parentValue: null },
  { enumType: ENUM_TYPES.JOB_APPLICATION_ACTIVITY, value: 'note_updated', label: 'Internal notes updated', sortOrder: 30, active: true, parentValue: null },
  { enumType: ENUM_TYPES.JOB_APPLICATION_ACTIVITY, value: 'follow_up', label: 'Follow-up recorded', sortOrder: 40, active: true, parentValue: null },
  // Member services
  { enumType: ENUM_TYPES.FORM_FIELD_TYPE, value: 'text', label: 'Text', sortOrder: 10, active: true, parentValue: null },
  { enumType: ENUM_TYPES.FORM_FIELD_TYPE, value: 'number', label: 'Number', sortOrder: 20, active: true, parentValue: null },
  { enumType: ENUM_TYPES.FORM_FIELD_TYPE, value: 'email', label: 'Email', sortOrder: 30, active: true, parentValue: null },
  { enumType: ENUM_TYPES.FORM_FIELD_TYPE, value: 'phone', label: 'Phone', sortOrder: 40, active: true, parentValue: null },
  { enumType: ENUM_TYPES.FORM_FIELD_TYPE, value: 'date', label: 'Date', sortOrder: 50, active: true, parentValue: null },
  { enumType: ENUM_TYPES.FORM_FIELD_TYPE, value: 'select', label: 'Select', sortOrder: 60, active: true, parentValue: null },
  { enumType: ENUM_TYPES.FORM_FIELD_TYPE, value: 'checkbox', label: 'Checkbox', sortOrder: 70, active: true, parentValue: null },
  { enumType: ENUM_TYPES.FORM_FIELD_TYPE, value: 'textarea', label: 'Textarea', sortOrder: 80, active: true, parentValue: null },
  { enumType: ENUM_TYPES.NOTIFICATION_TARGET, value: 'all', label: 'All members', sortOrder: 10, active: true, parentValue: null },
  { enumType: ENUM_TYPES.NOTIFICATION_TARGET, value: 'admin', label: 'Admins only', sortOrder: 20, active: true, parentValue: null },
  { enumType: ENUM_TYPES.NOTIFICATION_TARGET, value: 'member', label: 'Members only', sortOrder: 30, active: true, parentValue: null },
  // Public registration
  { enumType: ENUM_TYPES.CONTACT_LIVING_TYPE, value: 'Family', label: 'Family', sortOrder: 10, active: true, parentValue: null },
  { enumType: ENUM_TYPES.CONTACT_LIVING_TYPE, value: 'Bachelor', label: 'Bachelor', sortOrder: 20, active: true, parentValue: null },
  { enumType: ENUM_TYPES.CONTACT_COUNTRY, value: 'UAE', label: 'United Arab Emirates', sortOrder: 10, active: true, parentValue: null },
  { enumType: ENUM_TYPES.CONTACT_COUNTRY, value: 'India', label: 'India', sortOrder: 20, active: true, parentValue: null },
  { enumType: ENUM_TYPES.CONTACT_BLOOD_GROUP, value: 'A+', label: 'A+', sortOrder: 10, active: true, parentValue: null },
  { enumType: ENUM_TYPES.CONTACT_BLOOD_GROUP, value: 'A-', label: 'A-', sortOrder: 20, active: true, parentValue: null },
  { enumType: ENUM_TYPES.CONTACT_BLOOD_GROUP, value: 'B+', label: 'B+', sortOrder: 30, active: true, parentValue: null },
  { enumType: ENUM_TYPES.CONTACT_BLOOD_GROUP, value: 'B-', label: 'B-', sortOrder: 40, active: true, parentValue: null },
  { enumType: ENUM_TYPES.CONTACT_BLOOD_GROUP, value: 'AB+', label: 'AB+', sortOrder: 50, active: true, parentValue: null },
  { enumType: ENUM_TYPES.CONTACT_BLOOD_GROUP, value: 'AB-', label: 'AB-', sortOrder: 60, active: true, parentValue: null },
  { enumType: ENUM_TYPES.CONTACT_BLOOD_GROUP, value: 'O+', label: 'O+', sortOrder: 70, active: true, parentValue: null },
  { enumType: ENUM_TYPES.CONTACT_BLOOD_GROUP, value: 'O-', label: 'O-', sortOrder: 80, active: true, parentValue: null },
  { enumType: ENUM_TYPES.CONTACT_CURRENT_STATUS, value: 'Active', label: 'Active', sortOrder: 10, active: true, parentValue: null },
  { enumType: ENUM_TYPES.CONTACT_CURRENT_STATUS, value: 'Inactive', label: 'Inactive', sortOrder: 20, active: true, parentValue: null },
  { enumType: ENUM_TYPES.CONTACT_CURRENT_STATUS, value: 'Left', label: 'Left', sortOrder: 30, active: true, parentValue: null },
  { enumType: ENUM_TYPES.CONTACT_CURRENT_STATUS, value: 'Transferred', label: 'Transferred', sortOrder: 40, active: true, parentValue: null },
  { enumType: ENUM_TYPES.CONTACT_CHILD_GRADE, value: 'LKG', label: 'LKG', sortOrder: 10, active: true, parentValue: null },
  { enumType: ENUM_TYPES.CONTACT_CHILD_GRADE, value: 'UKG', label: 'UKG', sortOrder: 20, active: true, parentValue: null },
  { enumType: ENUM_TYPES.CONTACT_YES_NO, value: 'Yes', label: 'Yes', sortOrder: 10, active: true, parentValue: null },
  { enumType: ENUM_TYPES.CONTACT_YES_NO, value: 'No', label: 'No', sortOrder: 20, active: true, parentValue: null },
  // Imports
  { enumType: ENUM_TYPES.IMPORT_STATUS, value: 'processing', label: 'Processing', sortOrder: 10, active: true, parentValue: null },
  { enumType: ENUM_TYPES.IMPORT_STATUS, value: 'ready_for_review', label: 'Ready for review', sortOrder: 20, active: true, parentValue: null },
  { enumType: ENUM_TYPES.IMPORT_STATUS, value: 'finalized', label: 'Finalized', sortOrder: 30, active: true, parentValue: null },
  { enumType: ENUM_TYPES.IMPORT_STATUS, value: 'failed', label: 'Failed', sortOrder: 40, active: true, parentValue: null },
  { enumType: ENUM_TYPES.DEDUP_DECISION, value: 'pending', label: 'Pending', sortOrder: 10, active: true, parentValue: null },
  { enumType: ENUM_TYPES.DEDUP_DECISION, value: 'merged', label: 'Merged', sortOrder: 20, active: true, parentValue: null },
  { enumType: ENUM_TYPES.DEDUP_DECISION, value: 'skipped', label: 'Skipped', sortOrder: 30, active: true, parentValue: null },
  { enumType: ENUM_TYPES.MEMBER_EDIT_STATUS, value: 'pending', label: 'Pending', sortOrder: 10, active: true, parentValue: null },
  { enumType: ENUM_TYPES.MEMBER_EDIT_STATUS, value: 'approved', label: 'Approved', sortOrder: 20, active: true, parentValue: null },
  { enumType: ENUM_TYPES.MEMBER_EDIT_STATUS, value: 'rejected', label: 'Rejected', sortOrder: 30, active: true, parentValue: null },
  // Analytics
  { enumType: ENUM_TYPES.ANALYTICS_LAYOUT_TYPE, value: 'details', label: 'Details', sortOrder: 10, active: true, parentValue: null },
  { enumType: ENUM_TYPES.ANALYTICS_LAYOUT_TYPE, value: 'pivot', label: 'Pivot', sortOrder: 20, active: true, parentValue: null },
];

export const SUPPORTED_ENUM_TYPES = new Set<string>(
  [...new Set(PLATFORM_ENUM_SEEDS.map((s) => s.enumType))],
);
