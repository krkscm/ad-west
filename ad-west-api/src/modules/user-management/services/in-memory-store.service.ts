import { Injectable } from '@nestjs/common';
import { AdminRole } from '../enums/admin-role.enum';
import { AdminUser, RoleAssignment } from '../interfaces/admin-user.interface';
import { AuditLogEntry } from '../interfaces/audit-log.interface';
import { MemberUser } from '../interfaces/member.interface';
import { SessionRecord } from '../interfaces/session.interface';
import { UserStore } from '../interfaces/user-store.interface';
import { CryptoService } from './crypto.service';

@Injectable()
export class InMemoryStoreService implements UserStore {
  private readonly admins = new Map<string, AdminUser>();
  private readonly members = new Map<string, MemberUser>();
  private readonly sessions = new Map<string, SessionRecord>();
  private readonly auditLogs: AuditLogEntry[] = [];

  constructor(private readonly cryptoService: CryptoService) {
    const now = new Date().toISOString();
    const adminSeeds: Array<{
      id: string;
      code: string;
      name: string;
      email: string;
      password: string;
      roles: RoleAssignment[];
      roleDefinitionId?: string;
    }> = [
      {
        id: 'admin_super_001',
        code: 'ADMIN_SUPER_001',
        name: 'System Super Admin',
        email: 'super.admin@adwest.local',
        password: 'SuperAdmin@123',
        roles: [{ role: AdminRole.SUPER_ADMIN, scopeType: 'global' }],
      },
      {
        id: 'admin_zone_001',
        code: 'ADMIN_ZONE_001',
        name: 'West Zone Admin',
        email: 'zone.admin@adwest.local',
        password: 'ZoneAdmin@123',
        roles: [{ role: AdminRole.ZONE_ADMIN, scopeType: 'zone', scopeId: 'zone_wz' }],
      },
      {
        id: 'admin_sreny_001',
        code: 'ADMIN_SRENY_001',
        name: 'SV Sreny Admin',
        email: 'sreny.admin@adwest.local',
        password: 'SrenyAdmin@123',
        roles: [{ role: AdminRole.SRENY_ADMIN, scopeType: 'sreny', scopeId: 'sreny_sv' }],
      },
    ];

    adminSeeds.forEach((seed) => {
      this.admins.set(seed.id, {
        id: seed.id,
        code: seed.code,
        name: seed.name,
        email: seed.email,
        roleDefinitionId: seed.roleDefinitionId,
        passwordHash: this.cryptoService.hashPassword(seed.password),
        active: true,
        failedAttempts: 0,
        roles: seed.roles,
        createdAt: now,
        updatedAt: now,
      });
    });

    const memberSeeds: MemberUser[] = [
      {
        id: 'member_001',
        fullName: 'John Doe',
        email: 'john.doe@email.com',
        phone: '971500000001',
        passwordHash: this.cryptoService.hashPassword('Member@123'),
        failedAttempts: 0,
        active: true,
      },
      {
        id: 'member_002',
        fullName: 'Priya Shah',
        email: 'priya.shah@email.com',
        phone: '971500000002',
        passwordHash: this.cryptoService.hashPassword('Member@123'),
        failedAttempts: 0,
        active: true,
      },
      {
        id: 'member_003',
        fullName: 'Arjun Patel',
        email: 'arjun.patel@email.com',
        phone: '971500000003',
        passwordHash: this.cryptoService.hashPassword('Member@123'),
        failedAttempts: 0,
        active: true,
      },
    ];

    memberSeeds.forEach((member) => {
      this.members.set(member.id, member);
    });
  }

  async getAdmins(): Promise<AdminUser[]> {
    return Array.from(this.admins.values());
  }

  async getAdminById(id: string): Promise<AdminUser | undefined> {
    return this.admins.get(id);
  }

  async getAdminByCode(code: string): Promise<AdminUser | undefined> {
    const normalized = code.trim().toUpperCase();
    return Array.from(this.admins.values()).find(
      (admin) => admin.code.toUpperCase() === normalized,
    );
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

  async deleteAdmin(id: string): Promise<void> {
    this.admins.delete(id);
  }

  async getMembers(): Promise<MemberUser[]> {
    return Array.from(this.members.values());
  }

  async findMemberByIdentity(
    phone?: string,
    email?: string,
  ): Promise<MemberUser | undefined> {
    const normalizedPhone = phone?.trim();
    const normalizedEmail = email?.trim().toLowerCase();

    return Array.from(this.members.values()).find((member) => {
      const phoneMatch = normalizedPhone ? member.phone === normalizedPhone : false;
      const emailMatch = normalizedEmail
        ? member.email?.toLowerCase() === normalizedEmail
        : false;

      return phoneMatch || emailMatch;
    });
  }

  async saveMember(member: MemberUser): Promise<void> {
    this.members.set(member.id, member);
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

  async saveAudit(entry: AuditLogEntry): Promise<void> {
    this.auditLogs.unshift(entry);
  }

  async listAudit(): Promise<AuditLogEntry[]> {
    return this.auditLogs;
  }
}
