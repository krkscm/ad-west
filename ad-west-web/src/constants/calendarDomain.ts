export const CALENDAR_APPROVAL_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const

export const CALENDAR_PRIORITY_TIER = {
  SPECIAL_EVENT: 'special_event',
  ZONE: 'zone',
  STHAN: 'sthan',
  PENDING: 'pending',
  LOCAL: 'local',
} as const

export const CALENDAR_FEED_KIND = {
  SPECIAL_EVENT: 'special_event',
  SRENI_EVENT: 'sreni_event',
  STHAN_LOCAL: 'sthan_local',
} as const

export type CalendarApprovalStatus = (typeof CALENDAR_APPROVAL_STATUS)[keyof typeof CALENDAR_APPROVAL_STATUS]
export type CalendarPriorityTier = (typeof CALENDAR_PRIORITY_TIER)[keyof typeof CALENDAR_PRIORITY_TIER]
export type CalendarFeedKind = (typeof CALENDAR_FEED_KIND)[keyof typeof CALENDAR_FEED_KIND]

export const CALENDAR_ENUM_TYPES = {
  APPROVAL_STATUS: 'calendar_approval_status',
  PRIORITY_TIER: 'calendar_priority_tier',
  FEED_KIND: 'calendar_feed_kind',
  EVENT_SCOPE: 'calendar_event_scope',
} as const
