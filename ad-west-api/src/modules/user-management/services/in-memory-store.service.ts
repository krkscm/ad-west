import { Injectable } from '@nestjs/common';
import { AdminRole } from '../enums/admin-role.enum';
import { AdminUser, RoleAssignment } from '../interfaces/admin-user.interface';
import { AuditLogEntry } from '../interfaces/audit-log.interface';
import { MemberUser, OtpRequest } from '../interfaces/member.interface';
import { SessionRecord } from '../interfaces/session.interface';
import { UserStore } from '../interfaces/user-store.interface';
import { CryptoService } from './crypto.service';

@Injectable()
export class InMemoryStoreService implements UserStore {
  private readonly admins = new Map<string, AdminUser>();
  private readonly members = new Map<string, MemberUser>();
  private readonly sessions = new Map<string, SessionRecord>();
  private readonly otps = new Map<string, OtpRequest>();
  private readonly auditLogs: AuditLogEntry[] = [];

  constructor(private readonly cryptoService: CryptoService) {
    const seedRole: RoleAssignment = {
      role: AdminRole.SUPER_ADMIN,
      scopeType: 'global',
    };

    const adminId = 'admin_001';
    const now = new Date().toISOString();

    this.admins.set(adminId, {
      id: adminId,
      name: 'System Super Admin',
      email: 'admin@adwest.local',
      passwordHash: this.cryptoService.hashPassword('Admin@123'),
      active: true,
      mfaEnabled: false,
      roles: [seedRole],
      createdAt: now,
      updatedAt: now,
    });

    this.members.set('member_001', {
      id: 'member_001',
      fullName: 'Demo Member',
      email: 'member@adwest.local',
      phone: '971500000001',
      active: true,
    });
  }

  async getAdmins(): Promise<AdminUser[]> {
    return Array.from(this.admins.values());
  }

  async getAdminById(id: string): Promise<AdminUser | undefined> {
    return this.admins.get(id);
  }

  async getAdminByEmail(email: string): Promise<AdminUser | undefined> {
    const normalized = email.toLowerCase();
    return Array.from(this.admins.values()).find(
      (admin) => admin.email.toLowerCase() === normalized,
    );
  }

  async saveAdmin(admin: AdminUser): Promise<void> {
    this.admins.set(admin.id, admin);
  }

  async createAdmin(admin: AdminUser): Promise<void> {
    this.admins.set(admin.id, admin);
  }

  async getMembers(): Promise<MemberUser[]> {
    return Array.from(this.members.values());
  }

  async findMemberByIdentity(
    name: string,
    phone?: string,
    email?: string,
  ): Promise<MemberUser | undefined> {
    const normalizedName = name.trim().toLowerCase();
    const normalizedPhone = phone?.trim();
    const normalizedEmail = email?.trim().toLowerCase();

    return Array.from(this.members.values()).find((member) => {
      const sameName = member.fullName.trim().toLowerCase() === normalizedName;
      const phoneMatch = normalizedPhone ? member.phone === normalizedPhone : false;
      const emailMatch = normalizedEmail
        ? member.email?.toLowerCase() === normalizedEmail
        : false;

      return sameName && (phoneMatch || emailMatch);
    });
  }

  async saveSession(session: SessionRecord): Promise<void> {
    this.sessions.set(session.tokenId, session);
  }

  async getSession(tokenId: string): Promise<SessionRecord | undefined> {
    return this.sessions.get(tokenId);
  }

  async revokeSession(tokenId: string): Promise<void> {
    this.sessions.delete(tokenId);
  }

  async saveOtp(request: OtpRequest): Promise<void> {
    this.otps.set(request.id, request);
  }

  async getOtp(requestId: string): Promise<OtpRequest | undefined> {
    return this.otps.get(requestId);
  }

  async removeOtp(requestId: string): Promise<void> {
    this.otps.delete(requestId);
  }

  async saveAudit(entry: AuditLogEntry): Promise<void> {
    this.auditLogs.unshift(entry);
  }

  async listAudit(): Promise<AuditLogEntry[]> {
    return this.auditLogs;
  }
}
