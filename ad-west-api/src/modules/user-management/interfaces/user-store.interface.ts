import { AdminUser } from './admin-user.interface';
import { AuditLogEntry } from './audit-log.interface';
import { MemberUser, OtpRequest } from './member.interface';
import { SessionRecord } from './session.interface';

export interface UserStore {
  getAdmins(): Promise<AdminUser[]>;
  getAdminById(id: string): Promise<AdminUser | undefined>;
  getAdminByEmail(email: string): Promise<AdminUser | undefined>;
  saveAdmin(admin: AdminUser): Promise<void>;
  createAdmin(admin: AdminUser): Promise<void>;

  getMembers(): Promise<MemberUser[]>;
  findMemberByIdentity(
    name: string,
    phone?: string,
    email?: string,
  ): Promise<MemberUser | undefined>;

  saveSession(session: SessionRecord): Promise<void>;
  getSession(tokenId: string): Promise<SessionRecord | undefined>;
  revokeSession(tokenId: string): Promise<void>;

  saveOtp(request: OtpRequest): Promise<void>;
  getOtp(requestId: string): Promise<OtpRequest | undefined>;
  removeOtp(requestId: string): Promise<void>;

  saveAudit(entry: AuditLogEntry): Promise<void>;
  listAudit(): Promise<AuditLogEntry[]>;
}
