import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdminUser } from '../interfaces/admin-user.interface';
import { AuditLogEntry } from '../interfaces/audit-log.interface';
import { MemberUser } from '../interfaces/member.interface';
import { SessionRecord } from '../interfaces/session.interface';
import { UserStore } from '../interfaces/user-store.interface';
import { AdminUserEntity } from '../entities/admin-user.entity';
import { AuditLogEntity } from '../entities/audit-log.entity';
import { MemberUserEntity } from '../entities/member-user.entity';
import { SessionEntity } from '../entities/session.entity';

@Injectable()
export class PostgresStoreService implements UserStore {
  constructor(
    @InjectRepository(AdminUserEntity)
    private readonly adminRepo: Repository<AdminUserEntity>,
    @InjectRepository(MemberUserEntity)
    private readonly memberRepo: Repository<MemberUserEntity>,
    @InjectRepository(SessionEntity)
    private readonly sessionRepo: Repository<SessionEntity>,
    @InjectRepository(AuditLogEntity)
    private readonly auditRepo: Repository<AuditLogEntity>,
  ) {}

  async getAdmins(): Promise<AdminUser[]> {
    return this.adminRepo.find();
  }

  async getAdminById(id: string): Promise<AdminUser | undefined> {
    const found = await this.adminRepo.findOne({ where: { id } });
    return found ?? undefined;
  }

  async getAdminByCode(code: string): Promise<AdminUser | undefined> {
    const found = await this.adminRepo.findOne({
      where: { code: code.toUpperCase() },
    });
    return found ?? undefined;
  }

  async getAdminByEmail(email: string): Promise<AdminUser | undefined> {
    const found = await this.adminRepo.findOne({
      where: { email: email.toLowerCase() },
    });
    return found ?? undefined;
  }

  async saveAdmin(admin: AdminUser): Promise<void> {
    await this.adminRepo.save(admin);
  }

  async createAdmin(admin: AdminUser): Promise<void> {
    await this.adminRepo.insert(admin);
  }

  async deleteAdmin(id: string): Promise<void> {
    await this.adminRepo.delete(id);
  }

  async getMembers(): Promise<MemberUser[]> {
    return this.memberRepo.find();
  }

  async findMemberByIdentity(
    phone?: string,
    email?: string,
  ): Promise<MemberUser | undefined> {
    const normalizedPhone = phone?.trim();
    const normalizedEmail = email?.trim().toLowerCase();

    const members = await this.memberRepo.find();

    return members.find((member) => {
      const phoneMatch = normalizedPhone ? member.phone === normalizedPhone : false;
      const emailMatch = normalizedEmail
        ? member.email?.toLowerCase() === normalizedEmail
        : false;
      return phoneMatch || emailMatch;
    });
  }

  async saveMember(member: MemberUser): Promise<void> {
    await this.memberRepo.save(member);
  }

  async saveSession(session: SessionRecord): Promise<void> {
    await this.sessionRepo.save(session);
  }

  async getSession(tokenId: string): Promise<SessionRecord | undefined> {
    const found = await this.sessionRepo.findOne({
      where: { tokenId },
    });
    return found ?? undefined;
  }

  async revokeSession(tokenId: string): Promise<void> {
    await this.sessionRepo.delete({ tokenId });
  }

  async saveAudit(entry: AuditLogEntry): Promise<void> {
    await this.auditRepo.save(entry as AuditLogEntity);
  }

  async listAudit(): Promise<AuditLogEntry[]> {
    return this.auditRepo.find({ order: { timestamp: 'DESC' } });
  }
}
