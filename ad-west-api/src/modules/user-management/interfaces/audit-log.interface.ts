export interface AuditLogEntry {
  id: string;
  actorId: string;
  actorType: 'admin' | 'member' | 'system';
  action: string;
  targetType: string;
  targetId: string;
  details?: Record<string, unknown>;
  timestamp: string;
}
