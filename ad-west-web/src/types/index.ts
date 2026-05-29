// Global type definitions
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export type AdminRole = 'Super Admin' | 'Zone Admin' | 'Sreny Admin';
export type ScopeType = 'zone' | 'sreny' | 'global';

export interface RoleAssignment {
  id: string;
  adminUserId: string;
  role: AdminRole;
  scopeType: ScopeType;
  scopeId: string; // e.g. "zone_1" or "sreny_5" or "global"
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  roles: RoleAssignment[];
  createdAt: string;
}

export interface AuditLog {
  id: string;
  actorId: string;
  actorName: string;
  action: string;
  entityType: string;
  entityId: string;
  oldVal: Record<string, any> | null;
  newVal: Record<string, any> | null;
  timestamp: string;
}

export interface SrenyMembership {
  srenyId: string;
  srenyName: string;
  joinedDate: string;
  status: 'active' | 'inactive';
}

export interface Contact {
  id: string;
  zoneId: string;
  firstName: string;
  lastName: string;
  phonePrimary: string;
  phoneSecondary?: string;
  emailPrimary: string;
  emailSecondary?: string;
  whatsapp?: string;
  dob: string;
  gender: string;
  address: string;
  photoUrl?: string;
  status: 'active' | 'inactive';
  memberships: SrenyMembership[];
}

export interface EditRequest {
  id: string;
  contactId: string;
  contactName: string;
  requestedFields: Record<string, any>;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  reviewedBy?: string;
  reviewedByName?: string;
  reviewedAt?: string;
}

export interface HelpdeskTicket {
  id: string;
  contactId: string;
  contactName: string;
  zoneId: string;
  category: string;
  subject: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'new' | 'assigned' | 'in_progress' | 'resolved' | 'closed';
  assignedTo?: string;
  assignedToName?: string;
  createdAt: string;
  commentsCount: number;
}
