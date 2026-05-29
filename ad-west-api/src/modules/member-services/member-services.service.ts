import { BadRequestException, Injectable, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import { extname, join } from 'path';
import { ReimbursementRequestEntity } from './entities/reimbursement-request.entity';
import { SpecialEventEntity } from './entities/special-event.entity';
import { EventSreniLinkEntity } from './entities/event-sreni-link.entity';
import { EventFormFieldEntity } from './entities/event-form-field.entity';
import { EventRegistrationEntity } from './entities/event-registration.entity';
import { NotificationEntity } from './entities/notification.entity';

export type ReimbursementCategory = 'travel' | 'food' | 'accommodation' | 'event_supplies' | 'printing' | 'other';
export type ReimbursementStatus = 'draft' | 'submitted' | 'pending_review' | 'approved' | 'rejected';
export type FormFieldType = 'text' | 'number' | 'email' | 'phone' | 'date' | 'select' | 'checkbox' | 'textarea';
export type NotificationTarget = 'all' | 'admin' | 'member';

export interface ReimbursementRequest {
  id: string;
  submittedBy: string;
  category: ReimbursementCategory;
  description: string;
  amount: number;
  currency: string;
  receiptUrl?: string;
  receiptOriginalName?: string;
  receiptMimeType?: string;
  status: ReimbursementStatus;
  reviewerNotes?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EventFormField {
  id: string;
  eventId: string;
  fieldType: FormFieldType;
  label: string;
  placeholder?: string;
  options?: string[];
  isRequired: boolean;
  sortOrder: number;
}

export interface SpecialEvent {
  id: string;
  title: string;
  description?: string;
  dateTime: string;
  endDateTime?: string;
  venue?: string;
  isPublic: boolean;
  registrationEnabled: boolean;
  sreniIds: string[];
  formFields: EventFormField[];
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EventRegistration {
  id: string;
  eventId: string;
  formData: Record<string, unknown>;
  submittedAt: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  validFrom: string;
  validTo: string;
  target: NotificationTarget;
  isActive: boolean;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class MemberServicesService {
  // In-memory stores
  private readonly memReimbursements = new Map<string, ReimbursementRequest>();
  private readonly memEvents = new Map<string, SpecialEvent>();
  private readonly memRegistrations = new Map<string, EventRegistration>();
  private readonly memNotifications = new Map<string, AppNotification>();

  constructor(
    @Optional() @InjectRepository(ReimbursementRequestEntity)
    private readonly reimbursementRepo?: Repository<ReimbursementRequestEntity>,
    @Optional() @InjectRepository(SpecialEventEntity)
    private readonly eventRepo?: Repository<SpecialEventEntity>,
    @Optional() @InjectRepository(EventSreniLinkEntity)
    private readonly sreniLinkRepo?: Repository<EventSreniLinkEntity>,
    @Optional() @InjectRepository(EventFormFieldEntity)
    private readonly formFieldRepo?: Repository<EventFormFieldEntity>,
    @Optional() @InjectRepository(EventRegistrationEntity)
    private readonly registrationRepo?: Repository<EventRegistrationEntity>,
    @Optional() @InjectRepository(NotificationEntity)
    private readonly notificationRepo?: Repository<NotificationEntity>,
  ) {}

  private useDb(): boolean {
    return !!this.reimbursementRepo && !!this.eventRepo && !!this.notificationRepo;
  }

  // ── Receipt file storage ───────────────────────────────────────────────────

  private readonly ALLOWED_RECEIPT_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.pdf']);
  private readonly MAX_RECEIPT_BYTES = 512 * 1024;

  private async persistReceiptFile(reimbursementId: string, file: Express.Multer.File): Promise<{ url: string; storagePath: string; originalName: string; mimeType: string }> {
    if (!file?.buffer?.length) throw new BadRequestException('Receipt file is empty');
    if (file.size > this.MAX_RECEIPT_BYTES) throw new BadRequestException('Receipt must not exceed 500 KB');

    const ext = extname(file.originalname ?? '').toLowerCase();
    if (!this.ALLOWED_RECEIPT_EXTENSIONS.has(ext)) {
      throw new BadRequestException('Receipt must be a JPG, PNG, or PDF file');
    }

    const baseDir = process.env.UPLOAD_DIR ?? join(process.cwd(), 'uploads');
    const dir = join(baseDir, 'member-services', 'receipts');
    await mkdir(dir, { recursive: true });

    const storedName = `${reimbursementId}${ext}`;
    const storagePath = join(dir, storedName);
    await writeFile(storagePath, file.buffer);

    return {
      url: `/api/v1/member-services/reimbursements/${reimbursementId}/receipt`,
      storagePath,
      originalName: file.originalname,
      mimeType: file.mimetype,
    };
  }

  // ── Reimbursements ─────────────────────────────────────────────────────────

  private toReimbursement(e: ReimbursementRequestEntity): ReimbursementRequest {
    return {
      id: e.id,
      submittedBy: e.submittedBy,
      category: e.category as ReimbursementCategory,
      description: e.description,
      amount: Number(e.amount),
      currency: e.currency,
      receiptUrl: e.receiptUrl ?? undefined,
      receiptOriginalName: e.receiptOriginalName ?? undefined,
      receiptMimeType: e.receiptMimeType ?? undefined,
      status: e.status as ReimbursementStatus,
      reviewerNotes: e.reviewerNotes ?? undefined,
      reviewedBy: e.reviewedBy ?? undefined,
      reviewedAt: e.reviewedAt?.toISOString(),
      createdAt: e.createdAt.toISOString(),
      updatedAt: e.updatedAt.toISOString(),
    };
  }

  async listReimbursements(submittedBy?: string, status?: string): Promise<ReimbursementRequest[]> {
    if (this.useDb()) {
      const where: Record<string, unknown> = {};
      if (submittedBy) where.submittedBy = submittedBy;
      if (status) where.status = status;
      const rows = await this.reimbursementRepo!.find({ where, order: { createdAt: 'DESC' } });
      return rows.map((r) => this.toReimbursement(r));
    }
    let items = [...this.memReimbursements.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    if (submittedBy) items = items.filter((r) => r.submittedBy === submittedBy);
    if (status) items = items.filter((r) => r.status === status);
    return items;
  }

  async getReimbursement(id: string): Promise<ReimbursementRequest | undefined> {
    if (this.useDb()) {
      const row = await this.reimbursementRepo!.findOne({ where: { id } });
      return row ? this.toReimbursement(row) : undefined;
    }
    return this.memReimbursements.get(id);
  }

  async createReimbursement(data: {
    submittedBy: string;
    category: ReimbursementCategory;
    description: string;
    amount: number;
    currency?: string;
    asDraft?: boolean;
    receiptFile?: Express.Multer.File;
  }): Promise<ReimbursementRequest> {
    const now = new Date();
    const status: ReimbursementStatus = data.asDraft ? 'draft' : 'submitted';
    const id = randomUUID();
    const receipt = data.receiptFile ? await this.persistReceiptFile(id, data.receiptFile) : undefined;

    if (this.useDb()) {
      const entity = this.reimbursementRepo!.create({
        id,
        submittedBy: data.submittedBy,
        category: data.category,
        description: data.description.trim(),
        amount: data.amount,
        currency: data.currency ?? 'AED',
        receiptUrl: receipt?.url ?? null,
        receiptStoragePath: receipt?.storagePath ?? null,
        receiptOriginalName: receipt?.originalName ?? null,
        receiptMimeType: receipt?.mimeType ?? null,
        status,
        createdAt: now,
        updatedAt: now,
      });
      return this.toReimbursement(await this.reimbursementRepo!.save(entity));
    }

    const ts = now.toISOString();
    const r: ReimbursementRequest = {
      id,
      submittedBy: data.submittedBy,
      category: data.category,
      description: data.description.trim(),
      amount: data.amount,
      currency: data.currency ?? 'AED',
      receiptUrl: receipt?.url,
      receiptOriginalName: receipt?.originalName,
      receiptMimeType: receipt?.mimeType,
      status,
      createdAt: ts,
      updatedAt: ts,
    };
    this.memReimbursements.set(r.id, r);
    return r;
  }

  async updateReimbursementStatus(
    id: string,
    data: { status: ReimbursementStatus; reviewerNotes?: string; reviewedBy?: string },
  ): Promise<ReimbursementRequest | undefined> {
    if (this.useDb()) {
      const entity = await this.reimbursementRepo!.findOne({ where: { id } });
      if (!entity) return undefined;
      entity.status = data.status;
      entity.reviewerNotes = data.reviewerNotes ?? entity.reviewerNotes ?? null;
      entity.reviewedBy = data.reviewedBy ?? entity.reviewedBy ?? null;
      entity.reviewedAt = data.reviewedBy ? new Date() : entity.reviewedAt;
      entity.updatedAt = new Date();
      return this.toReimbursement(await this.reimbursementRepo!.save(entity));
    }
    const r = this.memReimbursements.get(id);
    if (!r) return undefined;
    const updated: ReimbursementRequest = {
      ...r,
      ...data,
      reviewedAt: data.reviewedBy ? new Date().toISOString() : r.reviewedAt,
      updatedAt: new Date().toISOString(),
    };
    this.memReimbursements.set(id, updated);
    return updated;
  }

  async submitReimbursement(id: string, submittedBy: string): Promise<ReimbursementRequest | undefined> {
    const r = await this.getReimbursement(id);
    if (!r || r.submittedBy !== submittedBy || r.status !== 'draft') return undefined;
    return this.updateReimbursementStatus(id, { status: 'submitted' });
  }

  async deleteReimbursement(id: string): Promise<boolean> {
    if (this.useDb()) {
      const result = await this.reimbursementRepo!.delete(id);
      return !!result.affected;
    }
    return this.memReimbursements.delete(id);
  }

  // ── Special Events ──────────────────────────────────────────────────────────

  private async loadEventWithDetails(entity: SpecialEventEntity): Promise<SpecialEvent> {
    const sreniIds = this.useDb()
      ? (await this.sreniLinkRepo!.find({ where: { eventId: entity.id } })).map((l) => l.sreniId)
      : [];
    const formFields = this.useDb()
      ? (await this.formFieldRepo!.find({ where: { eventId: entity.id }, order: { sortOrder: 'ASC' } })).map((f) => this.toFormField(f))
      : [];
    return this.toEvent(entity, sreniIds, formFields);
  }

  private toEvent(e: SpecialEventEntity, sreniIds: string[], formFields: EventFormField[]): SpecialEvent {
    return {
      id: e.id,
      title: e.title,
      description: e.description ?? undefined,
      dateTime: e.dateTime.toISOString(),
      endDateTime: e.endDateTime?.toISOString(),
      venue: e.venue ?? undefined,
      isPublic: e.isPublic,
      registrationEnabled: e.registrationEnabled,
      sreniIds,
      formFields,
      createdBy: e.createdBy ?? undefined,
      createdAt: e.createdAt.toISOString(),
      updatedAt: e.updatedAt.toISOString(),
    };
  }

  private toFormField(e: EventFormFieldEntity): EventFormField {
    return {
      id: e.id,
      eventId: e.eventId,
      fieldType: e.fieldType as FormFieldType,
      label: e.label,
      placeholder: e.placeholder ?? undefined,
      options: e.options ?? undefined,
      isRequired: e.isRequired,
      sortOrder: e.sortOrder,
    };
  }

  async listEvents(): Promise<SpecialEvent[]> {
    if (this.useDb()) {
      const rows = await this.eventRepo!.find({ order: { dateTime: 'DESC' } });
      return Promise.all(rows.map((r) => this.loadEventWithDetails(r)));
    }
    return [...this.memEvents.values()].sort((a, b) => b.dateTime.localeCompare(a.dateTime));
  }

  async listEventsForSreni(sreniId: string): Promise<SpecialEvent[]> {
    if (this.useDb()) {
      const links = await this.sreniLinkRepo!.find({ where: { sreniId } });
      if (links.length === 0) return [];
      const eventIds = links.map((l) => l.eventId);
      const events: SpecialEvent[] = [];
      for (const eventId of eventIds) {
        const entity = await this.eventRepo!.findOne({ where: { id: eventId } });
        if (entity) events.push(await this.loadEventWithDetails(entity));
      }
      return events.sort((a, b) => a.dateTime.localeCompare(b.dateTime));
    }
    return [...this.memEvents.values()].filter((e) => e.sreniIds.includes(sreniId)).sort((a, b) => a.dateTime.localeCompare(b.dateTime));
  }

  async getEvent(id: string): Promise<SpecialEvent | undefined> {
    if (this.useDb()) {
      const entity = await this.eventRepo!.findOne({ where: { id } });
      if (!entity) return undefined;
      return this.loadEventWithDetails(entity);
    }
    return this.memEvents.get(id);
  }

  async createEvent(data: {
    title: string;
    description?: string;
    dateTime: string;
    endDateTime?: string;
    venue?: string;
    isPublic?: boolean;
    registrationEnabled?: boolean;
    sreniIds?: string[];
    formFields?: Array<{ fieldType: FormFieldType; label: string; placeholder?: string; options?: string[]; isRequired?: boolean; sortOrder?: number }>;
    createdBy?: string;
  }): Promise<SpecialEvent> {
    const now = new Date();

    if (this.useDb()) {
      const entity = this.eventRepo!.create({
        title: data.title.trim(),
        description: data.description?.trim() || null,
        dateTime: new Date(data.dateTime),
        endDateTime: data.endDateTime ? new Date(data.endDateTime) : null,
        venue: data.venue?.trim() || null,
        isPublic: data.isPublic ?? false,
        registrationEnabled: data.registrationEnabled ?? false,
        createdBy: data.createdBy ?? null,
        createdAt: now,
        updatedAt: now,
      });
      const saved = await this.eventRepo!.save(entity);

      const sreniIds = data.sreniIds ?? [];
      if (sreniIds.length > 0) {
        const links = sreniIds.map((sreniId) => this.sreniLinkRepo!.create({ eventId: saved.id, sreniId }));
        await this.sreniLinkRepo!.save(links);
      }

      const fields: EventFormFieldEntity[] = (data.formFields ?? []).map((f, i) => {
        const fe = this.formFieldRepo!.create({
          eventId: saved.id,
          fieldType: f.fieldType,
          label: f.label,
          placeholder: f.placeholder ?? null,
          options: f.options ?? null,
          isRequired: f.isRequired ?? false,
          sortOrder: f.sortOrder ?? i,
        });
        return fe;
      });
      if (fields.length > 0) await this.formFieldRepo!.save(fields);

      return this.loadEventWithDetails(saved);
    }

    const ts = now.toISOString();
    const formFields: EventFormField[] = (data.formFields ?? []).map((f, i) => ({
      id: randomUUID(),
      eventId: '',
      fieldType: f.fieldType,
      label: f.label,
      placeholder: f.placeholder,
      options: f.options,
      isRequired: f.isRequired ?? false,
      sortOrder: f.sortOrder ?? i,
    }));
    const event: SpecialEvent = {
      id: randomUUID(),
      title: data.title.trim(),
      description: data.description?.trim(),
      dateTime: data.dateTime,
      endDateTime: data.endDateTime,
      venue: data.venue?.trim(),
      isPublic: data.isPublic ?? false,
      registrationEnabled: data.registrationEnabled ?? false,
      sreniIds: data.sreniIds ?? [],
      formFields: formFields.map((f) => ({ ...f, eventId: '' })),
      createdBy: data.createdBy,
      createdAt: ts,
      updatedAt: ts,
    };
    this.memEvents.set(event.id, event);
    return event;
  }

  async updateEvent(id: string, data: {
    title?: string;
    description?: string;
    dateTime?: string;
    endDateTime?: string;
    venue?: string;
    isPublic?: boolean;
    registrationEnabled?: boolean;
    sreniIds?: string[];
    formFields?: Array<{ fieldType: FormFieldType; label: string; placeholder?: string; options?: string[]; isRequired?: boolean; sortOrder?: number }>;
  }): Promise<SpecialEvent | undefined> {
    if (this.useDb()) {
      const entity = await this.eventRepo!.findOne({ where: { id } });
      if (!entity) return undefined;

      if (data.title !== undefined) entity.title = data.title.trim();
      if (data.description !== undefined) entity.description = data.description?.trim() || null;
      if (data.dateTime !== undefined) entity.dateTime = new Date(data.dateTime);
      if (data.endDateTime !== undefined) entity.endDateTime = data.endDateTime ? new Date(data.endDateTime) : null;
      if (data.venue !== undefined) entity.venue = data.venue?.trim() || null;
      if (data.isPublic !== undefined) entity.isPublic = data.isPublic;
      if (data.registrationEnabled !== undefined) entity.registrationEnabled = data.registrationEnabled;
      entity.updatedAt = new Date();
      await this.eventRepo!.save(entity);

      if (data.sreniIds !== undefined) {
        await this.sreniLinkRepo!.delete({ eventId: id });
        if (data.sreniIds.length > 0) {
          const links = data.sreniIds.map((sreniId) => this.sreniLinkRepo!.create({ eventId: id, sreniId }));
          await this.sreniLinkRepo!.save(links);
        }
      }

      if (data.formFields !== undefined) {
        await this.formFieldRepo!.delete({ eventId: id });
        if (data.formFields.length > 0) {
          const fields = data.formFields.map((f, i) => this.formFieldRepo!.create({
            eventId: id,
            fieldType: f.fieldType,
            label: f.label,
            placeholder: f.placeholder ?? null,
            options: f.options ?? null,
            isRequired: f.isRequired ?? false,
            sortOrder: f.sortOrder ?? i,
          }));
          await this.formFieldRepo!.save(fields);
        }
      }

      return this.loadEventWithDetails(entity);
    }

    const event = this.memEvents.get(id);
    if (!event) return undefined;
    const updated: SpecialEvent = {
      ...event,
      title: data.title?.trim() ?? event.title,
      description: data.description !== undefined ? data.description?.trim() : event.description,
      dateTime: data.dateTime ?? event.dateTime,
      endDateTime: data.endDateTime !== undefined ? data.endDateTime : event.endDateTime,
      venue: data.venue !== undefined ? data.venue?.trim() : event.venue,
      isPublic: data.isPublic ?? event.isPublic,
      registrationEnabled: data.registrationEnabled ?? event.registrationEnabled,
      sreniIds: data.sreniIds ?? event.sreniIds,
      formFields: data.formFields
        ? data.formFields.map((f, i) => ({ id: randomUUID(), eventId: id, fieldType: f.fieldType, label: f.label, placeholder: f.placeholder, options: f.options, isRequired: f.isRequired ?? false, sortOrder: f.sortOrder ?? i }))
        : event.formFields,
      updatedAt: new Date().toISOString(),
    };
    this.memEvents.set(id, updated);
    return updated;
  }

  async deleteEvent(id: string): Promise<boolean> {
    if (this.useDb()) {
      const result = await this.eventRepo!.delete(id);
      return !!result.affected;
    }
    return this.memEvents.delete(id);
  }

  // ── Event Registrations ─────────────────────────────────────────────────────

  async submitEventRegistration(eventId: string, formData: Record<string, unknown>): Promise<EventRegistration | null> {
    const event = await this.getEvent(eventId);
    if (!event || !event.registrationEnabled) return null;

    const now = new Date();

    if (this.useDb()) {
      const entity = this.registrationRepo!.create({
        id: randomUUID(),
        eventId,
        formData,
        submittedAt: now,
      });
      const saved = await this.registrationRepo!.save(entity);
      return { id: saved.id, eventId: saved.eventId, formData: saved.formData, submittedAt: saved.submittedAt.toISOString() };
    }

    const reg: EventRegistration = { id: randomUUID(), eventId, formData, submittedAt: now.toISOString() };
    this.memRegistrations.set(reg.id, reg);
    return reg;
  }

  async listEventRegistrations(eventId: string): Promise<EventRegistration[]> {
    if (this.useDb()) {
      const rows = await this.registrationRepo!.find({ where: { eventId }, order: { submittedAt: 'DESC' } });
      return rows.map((r) => ({ id: r.id, eventId: r.eventId, formData: r.formData, submittedAt: r.submittedAt.toISOString() }));
    }
    return [...this.memRegistrations.values()].filter((r) => r.eventId === eventId).sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  }

  // ── Notifications ───────────────────────────────────────────────────────────

  private toNotification(e: NotificationEntity): AppNotification {
    return {
      id: e.id,
      title: e.title,
      message: e.message,
      validFrom: e.validFrom.toISOString(),
      validTo: e.validTo.toISOString(),
      target: e.target as NotificationTarget,
      isActive: e.isActive,
      createdBy: e.createdBy ?? undefined,
      createdAt: e.createdAt.toISOString(),
      updatedAt: e.updatedAt.toISOString(),
    };
  }

  async listNotifications(activeOnly = false): Promise<AppNotification[]> {
    if (this.useDb()) {
      const where: Record<string, unknown> = {};
      if (activeOnly) {
        const now = new Date();
        where.isActive = true;
        return (
          await this.notificationRepo!.createQueryBuilder('n')
            .where('n.is_active = true')
            .andWhere('n.valid_from <= :now', { now })
            .andWhere('n.valid_to >= :now', { now })
            .orderBy('n.created_at', 'DESC')
            .getMany()
        ).map((r) => this.toNotification(r));
      }
      const rows = await this.notificationRepo!.find({ order: { createdAt: 'DESC' } });
      return rows.map((r) => this.toNotification(r));
    }
    const now = new Date().toISOString();
    let items = [...this.memNotifications.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    if (activeOnly) items = items.filter((n) => n.isActive && n.validFrom <= now && n.validTo >= now);
    return items;
  }

  async getNotification(id: string): Promise<AppNotification | undefined> {
    if (this.useDb()) {
      const row = await this.notificationRepo!.findOne({ where: { id } });
      return row ? this.toNotification(row) : undefined;
    }
    return this.memNotifications.get(id);
  }

  async createNotification(data: {
    title: string;
    message: string;
    validFrom?: string;
    validTo: string;
    target?: NotificationTarget;
    createdBy?: string;
  }): Promise<AppNotification> {
    const now = new Date();
    if (this.useDb()) {
      const entity = this.notificationRepo!.create({
        title: data.title.trim(),
        message: data.message.trim(),
        validFrom: data.validFrom ? new Date(data.validFrom) : now,
        validTo: new Date(data.validTo),
        target: data.target ?? 'all',
        isActive: true,
        createdBy: data.createdBy ?? null,
        createdAt: now,
        updatedAt: now,
      });
      return this.toNotification(await this.notificationRepo!.save(entity));
    }
    const ts = now.toISOString();
    const n: AppNotification = {
      id: randomUUID(),
      title: data.title.trim(),
      message: data.message.trim(),
      validFrom: data.validFrom ?? ts,
      validTo: data.validTo,
      target: data.target ?? 'all',
      isActive: true,
      createdBy: data.createdBy,
      createdAt: ts,
      updatedAt: ts,
    };
    this.memNotifications.set(n.id, n);
    return n;
  }

  async updateNotification(id: string, data: {
    title?: string;
    message?: string;
    validFrom?: string;
    validTo?: string;
    target?: NotificationTarget;
    isActive?: boolean;
  }): Promise<AppNotification | undefined> {
    if (this.useDb()) {
      const entity = await this.notificationRepo!.findOne({ where: { id } });
      if (!entity) return undefined;
      if (data.title !== undefined) entity.title = data.title.trim();
      if (data.message !== undefined) entity.message = data.message.trim();
      if (data.validFrom !== undefined) entity.validFrom = new Date(data.validFrom);
      if (data.validTo !== undefined) entity.validTo = new Date(data.validTo);
      if (data.target !== undefined) entity.target = data.target;
      if (data.isActive !== undefined) entity.isActive = data.isActive;
      entity.updatedAt = new Date();
      return this.toNotification(await this.notificationRepo!.save(entity));
    }
    const n = this.memNotifications.get(id);
    if (!n) return undefined;
    const updated: AppNotification = { ...n, ...data, updatedAt: new Date().toISOString() };
    this.memNotifications.set(id, updated);
    return updated;
  }

  async deleteNotification(id: string): Promise<boolean> {
    if (this.useDb()) {
      const result = await this.notificationRepo!.delete(id);
      return !!result.affected;
    }
    return this.memNotifications.delete(id);
  }

  // ── Public: validate event for registration page ───────────────────────────

  async getPublicEventForRegistration(eventId: string): Promise<SpecialEvent | null> {
    const event = await this.getEvent(eventId);
    if (!event || !event.registrationEnabled) return null;
    return event;
  }
}
