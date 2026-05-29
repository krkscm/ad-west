import { AdminUser } from './admin-user.interface';
import { AuditLogEntry } from './audit-log.interface';
import { MemberUser } from './member.interface';
import { SessionRecord } from './session.interface';

export interface UserStore {
  getAdmins(): Promise<AdminUser[]>;
  getAdminById(id: string): Promise<AdminUser | undefined>;
  getAdminByCode(code: string): Promise<AdminUser | undefined>;
  getAdminByEmail(email: string): Promise<AdminUser | undefined>;
  saveAdmin(admin: AdminUser): Promise<void>;
  createAdmin(admin: AdminUser): Promise<void>;
  deleteAdmin(id: string): Promise<void>;

  getMembers(): Promise<MemberUser[]>;
  getMemberById(id: string): Promise<MemberUser | undefined>;
  findMemberByIdentity(
    phone?: string,
    email?: string,
  ): Promise<MemberUser | undefined>;
  saveMember(member: MemberUser): Promise<void>;

  saveSession(session: SessionRecord): Promise<void>;
  getSession(tokenId: string): Promise<SessionRecord | undefined>;
  revokeSession(tokenId: string): Promise<void>;

  saveAudit(entry: AuditLogEntry): Promise<void>;
  listAudit(): Promise<AuditLogEntry[]>;
}
