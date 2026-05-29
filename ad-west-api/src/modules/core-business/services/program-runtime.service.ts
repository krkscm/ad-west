import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AuthPrincipal } from '@modules/user-management/interfaces/auth-principal.interface';
import { BulkAttendanceUploadDto, CreateProgramDto, CreateRegistrationDto, CreateSessionDto, RecordAttendanceDto, UpdateProgramDto, UpdateSessionDto } from '../dto/core-business.dto';
import type { AttendanceRecord, ProgramRecord, ProgramSessionRecord, RegistrationRecord, UserRecord } from '../core-business.service';

export interface ProgramRuntimeContext {
  programs: Map<string, ProgramRecord>;
  sessions: Map<string, { programId: string; session: ProgramSessionRecord }>;
  attendance: Map<string, AttendanceRecord>;
  users: Map<string, UserRecord>;
  runtimeMode: 'in-memory' | 'db';
  newId: (prefix: string) => string;
  validateDateWindow: (startDate: string, endDate: string) => void;
  ensureSessionWithinProgramWindow: (program: ProgramRecord, startAt: string, endAt: string) => void;
  scheduleProgramStatePersistence: (programId: string) => void;
  scheduleAttendanceStatePersistence: (attendanceId: string) => void;
  findProgram: (programId: string) => ProgramRecord;
  findSession: (sessionId: string) => ProgramSessionRecord;
  findUser: (userId: string) => UserRecord;
  getMyProfile: (principal: AuthPrincipal) => UserRecord | null;
}

export class ProgramRuntimeService {
  constructor(private readonly ctx: ProgramRuntimeContext) {}

  listPrograms(): ProgramRecord[] {
    return Array.from(this.ctx.programs.values());
  }

  createProgram(dto: CreateProgramDto): ProgramRecord {
    this.ctx.validateDateWindow(dto.startDate, dto.endDate);
    const now = new Date().toISOString();
    const program: ProgramRecord = {
      id: this.ctx.newId('prg'),
      title: dto.title,
      description: dto.description,
      startDate: dto.startDate,
      endDate: dto.endDate,
      capacity: dto.capacity,
      status: 'draft',
      sessions: [],
      registrations: [],
      createdAt: now,
      updatedAt: now,
    };
    this.ctx.programs.set(program.id, program);
    this.ctx.scheduleProgramStatePersistence(program.id);
    return program;
  }

  getProgram(programId: string): ProgramRecord {
    return this.ctx.findProgram(programId);
  }

  updateProgram(programId: string, dto: UpdateProgramDto): ProgramRecord {
    const program = this.ctx.findProgram(programId);
    const nextStartDate = dto.startDate ?? program.startDate;
    const nextEndDate = dto.endDate ?? program.endDate;
    this.ctx.validateDateWindow(nextStartDate, nextEndDate);

    const updated: ProgramRecord = {
      ...program,
      ...dto,
      updatedAt: new Date().toISOString(),
    };
    this.ctx.programs.set(programId, updated);
    this.ctx.scheduleProgramStatePersistence(programId);
    return updated;
  }

  publishProgram(programId: string): ProgramRecord {
    const program = this.ctx.findProgram(programId);
    if (program.status === 'archived') {
      throw new BadRequestException('Archived programs cannot be published');
    }

    if (program.sessions.length === 0) {
      throw new BadRequestException('Program must include at least one session before publish');
    }

    program.status = 'published';
    program.updatedAt = new Date().toISOString();
    this.ctx.scheduleProgramStatePersistence(programId);
    return program;
  }

  archiveProgram(programId: string): ProgramRecord {
    const program = this.ctx.findProgram(programId);
    program.status = 'archived';
    program.updatedAt = new Date().toISOString();
    this.ctx.scheduleProgramStatePersistence(programId);
    return program;
  }

  createSession(programId: string, dto: CreateSessionDto): ProgramSessionRecord {
    const program = this.ctx.findProgram(programId);
    this.ctx.validateDateWindow(dto.startAt, dto.endAt);
    this.ctx.ensureSessionWithinProgramWindow(program, dto.startAt, dto.endAt);

    const session: ProgramSessionRecord = {
      id: this.ctx.newId('ses'),
      name: dto.name,
      startAt: dto.startAt,
      endAt: dto.endAt,
    };

    program.sessions.push(session);
    this.ctx.sessions.set(session.id, { programId, session });
    program.updatedAt = new Date().toISOString();
    this.ctx.scheduleProgramStatePersistence(programId);
    return session;
  }

  updateSession(programId: string, sessionId: string, dto: UpdateSessionDto): ProgramSessionRecord {
    const program = this.ctx.findProgram(programId);
    const indexedSession = this.ctx.sessions.get(sessionId);
    if (!indexedSession || indexedSession.programId !== programId) {
      throw new NotFoundException('Session not found');
    }
    const session = indexedSession.session;

    if (dto.name) {
      session.name = dto.name;
    }

    const nextStartAt = dto.startAt ?? session.startAt;
    const nextEndAt = dto.endAt ?? session.endAt;
    this.ctx.validateDateWindow(nextStartAt, nextEndAt);
    this.ctx.ensureSessionWithinProgramWindow(program, nextStartAt, nextEndAt);

    session.startAt = nextStartAt;
    session.endAt = nextEndAt;
    this.ctx.sessions.set(sessionId, { programId, session });

    program.updatedAt = new Date().toISOString();
    this.ctx.scheduleProgramStatePersistence(programId);
    return session;
  }

  createRegistration(programId: string, dto: CreateRegistrationDto): RegistrationRecord {
    this.ctx.findUser(dto.contactId);
    const program = this.ctx.findProgram(programId);

    const alreadyRegistered = program.registrations.some((registration) => registration.contactId === dto.contactId);
    if (alreadyRegistered) {
      throw new BadRequestException('Contact is already registered for this program');
    }

    if (program.registrations.length >= program.capacity) {
      throw new BadRequestException('Program capacity reached');
    }

    const registration: RegistrationRecord = {
      id: this.ctx.newId('reg'),
      programId,
      contactId: dto.contactId,
      createdAt: new Date().toISOString(),
    };
    program.registrations.push(registration);
    program.updatedAt = new Date().toISOString();
    this.ctx.scheduleProgramStatePersistence(programId);
    return registration;
  }

  cancelRegistration(programId: string, registrationId: string): { success: boolean } {
    const program = this.ctx.findProgram(programId);
    program.registrations = program.registrations.filter((item) => item.id !== registrationId);
    program.updatedAt = new Date().toISOString();
    this.ctx.scheduleProgramStatePersistence(programId);
    return { success: true };
  }

  recordAttendance(sessionId: string, dto: RecordAttendanceDto, principal: AuthPrincipal): AttendanceRecord {
    this.ctx.findSession(sessionId);
    this.ctx.findUser(dto.contactId);

    const record: AttendanceRecord = {
      id: this.ctx.newId('att'),
      sessionId,
      contactId: dto.contactId,
      state: dto.state,
      notes: dto.notes,
      recordedAt: new Date().toISOString(),
      recordedBy: principal.userId,
    };

    this.ctx.attendance.set(record.id, record);
    this.ctx.scheduleAttendanceStatePersistence(record.id);
    return record;
  }

  bulkUploadAttendance(sessionId: string, dto: BulkAttendanceUploadDto): { success: boolean; processed: number; sourceFileName?: string } {
    this.ctx.findSession(sessionId);

    const lateCount = dto.lateCount ?? 0;
    const excusedCount = dto.excusedCount ?? 0;
    const processed = dto.presentCount + dto.absentCount + lateCount + excusedCount;

    if (processed <= 0) {
      throw new BadRequestException('Attendance upload must include at least one record');
    }

    return {
      success: true,
      processed,
      sourceFileName: dto.sourceFileName,
    };
  }

  getSessionAttendance(sessionId: string): AttendanceRecord[] {
    this.ctx.findSession(sessionId);
    return Array.from(this.ctx.attendance.values()).filter((item) => item.sessionId === sessionId);
  }

  getAttendanceReport(sessionId?: string): { total: number; present: number; absent: number; late: number; excused: number } {
    const items = Array.from(this.ctx.attendance.values()).filter((item) =>
      sessionId ? item.sessionId === sessionId : true,
    );
    let present = 0;
    let absent = 0;
    let late = 0;
    let excused = 0;

    for (const item of items) {
      if (item.state === 'present') {
        present += 1;
      } else if (item.state === 'absent') {
        absent += 1;
      } else if (item.state === 'late') {
        late += 1;
      } else if (item.state === 'excused') {
        excused += 1;
      }
    }

    return {
      total: items.length,
      present,
      absent,
      late,
      excused,
    };
  }

  exportAttendanceReport(sessionId?: string): { format: string; rows: number } {
    const report = this.getAttendanceReport(sessionId);
    return {
      format: 'csv',
      rows: report.total,
    };
  }

  getMyProfile(principal: AuthPrincipal): UserRecord | null {
    return this.ctx.getMyProfile(principal);
  }

  listMyPrograms(principal: AuthPrincipal): ProgramRecord[] {
    const user = this.getMyProfile(principal);
    if (!user) {
      return [];
    }

    return Array.from(this.ctx.programs.values()).filter((program) =>
      program.registrations.some((registration) => registration.contactId === user.id),
    );
  }
}
