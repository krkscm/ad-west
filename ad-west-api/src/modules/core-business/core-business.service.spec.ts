import { BadRequestException } from '@nestjs/common';
import { AuthPrincipal } from '@modules/user-management/interfaces/auth-principal.interface';
import { CoreBusinessService } from './core-business.service';
import { CoreBusinessStore } from './store/core-business-store.interface';
import { DataSource } from 'typeorm';

describe('CoreBusinessService validations', () => {
  let service: CoreBusinessService;

  const memberPrincipal: AuthPrincipal = {
    userId: 'member_user_1',
    type: 'member',
    email: 'member@adwest.local',
    roles: [],
    sessionId: 'sess_member_1',
  };

  beforeEach(() => {
    service = new CoreBusinessService();
  });

  it('rejects creating program with invalid date window', () => {
    expect(() =>
      service.createProgram({
        title: 'Invalid Program',
        description: 'Invalid dates',
        startDate: '2026-07-10',
        endDate: '2026-07-01',
        capacity: 10,
      }),
    ).toThrow(BadRequestException);
  });

  it('requires at least one session before publishing program', () => {
    const program = service.createProgram({
      title: 'Community Program',
      description: 'Ready for publish check',
      startDate: '2026-07-01',
      endDate: '2026-07-10',
      capacity: 20,
    });

    expect(() => service.publishProgram(program.id)).toThrow(BadRequestException);
  });

  it('rejects session outside program date window', () => {
    const program = service.createProgram({
      title: 'Windowed Program',
      description: 'Session validation',
      startDate: '2026-07-01T00:00:00.000Z',
      endDate: '2026-07-10T23:59:59.000Z',
      capacity: 20,
    });

    expect(() =>
      service.createSession(program.id, {
        name: 'Out of Window Session',
        startAt: '2026-07-11T10:00:00.000Z',
        endAt: '2026-07-11T12:00:00.000Z',
      }),
    ).toThrow(BadRequestException);
  });

  it('prevents duplicate registration and capacity overflow', () => {
    const contactId = service.listContacts()[0].id;

    const program = service.createProgram({
      title: 'Small Program',
      description: 'Capacity checks',
      startDate: '2026-08-01',
      endDate: '2026-08-05',
      capacity: 1,
    });

    service.createSession(program.id, {
      name: 'Session 1',
      startAt: '2026-08-02T09:00:00.000Z',
      endAt: '2026-08-02T11:00:00.000Z',
    });

    service.createRegistration(program.id, { contactId });

    expect(() => service.createRegistration(program.id, { contactId })).toThrow(BadRequestException);

    const newContact = service.createContact({
      firstName: 'Capacity',
      lastName: 'Tester',
      zoneId: service.listZones()[0].id,
      srenyIds: [service.listSrenies()[0].id],
      phone: '971500000500',
      email: 'capacity.tester@adwest.local',
      address: 'Test Address',
    });

    expect(() => service.createRegistration(program.id, { contactId: newContact.id })).toThrow(
      BadRequestException,
    );
  });

  it('rejects empty attendance bulk upload payload', () => {
    const program = service.createProgram({
      title: 'Attendance Program',
      description: 'Bulk upload checks',
      startDate: '2026-09-01',
      endDate: '2026-09-10',
      capacity: 10,
    });

    const session = service.createSession(program.id, {
      name: 'Attendance Session',
      startAt: '2026-09-03T08:00:00.000Z',
      endAt: '2026-09-03T10:00:00.000Z',
    });

    expect(() =>
      service.bulkUploadAttendance(session.id, {
        presentCount: 0,
        absentCount: 0,
      }),
    ).toThrow(BadRequestException);
  });

  it('enforces helpdesk status transition order and assignee requirement', () => {
    const ticket = service.createTicket(
      {
        subject: 'Access Issue',
        description: 'Need operator support',
        category: 'Access',
        priority: 'medium',
      },
      memberPrincipal,
    );

    expect(() =>
      service.updateTicketStatus(ticket.id, {
        status: 'resolved',
      }),
    ).toThrow(BadRequestException);

    service.updateTicketAssignee(ticket.id, { assigneeId: 'admin_operator_1' });

    service.updateTicketStatus(ticket.id, { status: 'in_progress' });
    service.updateTicketStatus(ticket.id, { status: 'resolved' });
    const closed = service.updateTicketStatus(ticket.id, { status: 'closed' });

    expect(closed.status).toBe('closed');

    expect(() =>
      service.updateTicketStatus(ticket.id, {
        status: 'in_progress',
      }),
    ).toThrow(BadRequestException);
  });

  it('blocks finalize until duplicate reconciliation is complete', async () => {
    service.createContact({
      firstName: 'Import',
      lastName: 'Duplicate',
      zoneId: service.listZones()[0].id,
      srenyIds: [service.listSrenies()[0].id],
      phone: '971500000700',
      email: 'import.duplicate@adwest.local',
      address: 'Import Test Address',
    });

    const importRecord = service.startImport({
      fileName: 'contacts-import.csv',
      fileType: 'csv',
      hasHeader: true,
    });

    const reconciliationBefore = service.getImportReconciliation(importRecord.id);
    expect(reconciliationBefore.canFinalize).toBe(false);
    expect(reconciliationBefore.pendingDuplicates).toBeGreaterThanOrEqual(1);

    await expect(service.finalizeImport(importRecord.id)).rejects.toThrow(BadRequestException);

    const duplicates = service.listImportDuplicates(importRecord.id);
    for (const duplicate of duplicates) {
      service.skipDuplicate(importRecord.id, duplicate.id);
    }

    const reconciliationAfter = service.getImportReconciliation(importRecord.id);
    expect(reconciliationAfter.canFinalize).toBe(true);

    const finalized = await service.finalizeImport(importRecord.id);
    expect(finalized.status).toBe('finalized');
  });

  it('marks import as failed and surfaces in filtered import list', async () => {
    const importRecord = service.startImport({
      fileName: 'invalid-import.csv',
      fileType: 'csv',
      hasHeader: true,
    });

    const failed = service.markImportFailed(importRecord.id, 'Column mapping mismatch');
    expect(failed.status).toBe('failed');
    expect(failed.failedReason).toContain('Column mapping mismatch');

    const failedImports = service.listImports('failed');
    expect(failedImports.some((item) => item.id === importRecord.id)).toBe(true);

    await expect(service.finalizeImport(importRecord.id)).rejects.toThrow(BadRequestException);
  });

  it('records helpdesk ticket activity entries for auditability', () => {
    const ticket = service.createTicket(
      {
        subject: 'Need assignment',
        description: 'Track activity trail',
        category: 'General',
        priority: 'low',
      },
      memberPrincipal,
    );

    service.updateTicketAssignee(ticket.id, { assigneeId: 'admin_operator_2' });
    service.updateTicketStatus(ticket.id, { status: 'in_progress' });
    service.addTicketComment(ticket.id, { body: 'Working on it' }, memberPrincipal);

    const activity = service.listTicketActivity(ticket.id);
    const actions = activity.map((entry) => entry.action);

    expect(actions).toContain('created');
    expect(actions).toContain('assigned');
    expect(actions).toContain('status_updated');
    expect(actions).toContain('comment_added');
  });

  it('validates member edit requests against profile field and current value', () => {
    expect(() =>
      service.createEditRequest(
        {
          field: 'unsupportedField',
          currentValue: 'x',
          requestedValue: 'y',
        },
        memberPrincipal,
      ),
    ).toThrow(BadRequestException);

    expect(() =>
      service.createEditRequest(
        {
          field: 'firstName',
          currentValue: 'WrongCurrentValue',
          requestedValue: 'Updated',
        },
        memberPrincipal,
      ),
    ).toThrow(BadRequestException);

    const request = service.createEditRequest(
      {
        field: 'phonePrimary',
        currentValue: '971500000001',
        requestedValue: '971500000009',
      },
      memberPrincipal,
    );

    expect(request.field).toBe('phone');
    expect(request.currentValue).toBe('971500000001');
    expect(request.requestedValue).toBe('971500000009');
  });

  it('returns persistence readiness with blockers for current core business mode', () => {
    const readiness = service.getPersistenceReadiness();
    expect(readiness.coreBusinessStore).toBe('in-memory');
    expect(readiness.readyForUat).toBe(false);
    expect(readiness.blockers.length).toBeGreaterThan(0);
    expect(readiness.nextSteps.length).toBeGreaterThan(0);
  });

  it('includes import processing and validation counters in import listing', () => {
    const importRecord = service.startImport({
      fileName: 'batch-counters.csv',
      fileType: 'csv',
      hasHeader: true,
    });

    const list = service.listImports();
    const found = list.find((item) => item.id === importRecord.id);

    expect(found).toBeDefined();
    expect(found?.processedRows).toBeGreaterThan(0);
    expect(found?.validationErrorRows).toBeGreaterThanOrEqual(0);
  });

  it('prevents marking finalized imports as failed', async () => {
    service.createContact({
      firstName: 'Finalized',
      lastName: 'ImportGuard',
      zoneId: service.listZones()[0].id,
      srenyIds: [service.listSrenies()[0].id],
      phone: '971500000711',
      email: 'finalized.guard@adwest.local',
      address: 'Guard Address',
    });

    const importRecord = service.startImport({
      fileName: 'finalized-import.csv',
      fileType: 'csv',
      hasHeader: true,
    });

    for (const duplicate of service.listImportDuplicates(importRecord.id)) {
      service.skipDuplicate(importRecord.id, duplicate.id);
    }

    await service.finalizeImport(importRecord.id);

    expect(() => service.markImportFailed(importRecord.id, 'late failure')).toThrow(BadRequestException);
  });

  it('returns DB-ready persistence readiness when auth and core stores run in DB mode', () => {
    const previousEnableDb = process.env.ENABLE_DB_PERSISTENCE;
    process.env.ENABLE_DB_PERSISTENCE = 'true';

    try {
      const dbStoreStub: CoreBusinessStore = {
        getMode: () => 'db',
        loadState: async () => null,
        saveState: async () => undefined,
      };

      const dbService = new CoreBusinessService(dbStoreStub);
      const readiness = dbService.getPersistenceReadiness();

      expect(readiness.coreBusinessStore).toBe('db');
      expect(readiness.authStoreMode).toBe('db');
      expect(readiness.blockers).toHaveLength(0);
      expect(readiness.readyForUat).toBe(true);
    } finally {
      if (previousEnableDb === undefined) {
        delete process.env.ENABLE_DB_PERSISTENCE;
      } else {
        process.env.ENABLE_DB_PERSISTENCE = previousEnableDb;
      }
    }
  });

  it('does not seed demo runtime data when constructed in DB mode without a snapshot', () => {
    const dbStoreStub: CoreBusinessStore = {
      getMode: () => 'db',
      loadState: async () => null,
      saveState: async () => undefined,
    };

    const dbService = new CoreBusinessService(dbStoreStub);

    expect(dbService.listZones()).toHaveLength(0);
    expect(dbService.listContacts()).toHaveLength(0);
    expect(dbService.listPrograms()).toHaveLength(0);
  });

  it('persists zone and sreny writes through the DB path', async () => {
    const previousEnableDb = process.env.ENABLE_DB_PERSISTENCE;
    process.env.ENABLE_DB_PERSISTENCE = 'true';

    const createdAt = '2026-05-25T00:00:00.000Z';
    const hydratedZones: Array<{
      id: string;
      code: string | null;
      name: string;
      created_at: string;
      updated_at: string;
    }> = [
      {
        id: 'zone-live-1',
        code: 'WZ',
        name: 'West Zone',
        created_at: createdAt,
        updated_at: createdAt,
      },
    ];
    const hydratedSrenies = [
      {
        id: 'sreny-live-1',
        zone_id: 'zone-live-1',
        name: 'Service Sreny',
        is_service_sreny: true,
        created_at: createdAt,
        updated_at: createdAt,
      },
    ];

    const dataSourceStub = {
      query: async (sql: string, params: unknown[] = []) => {
        if (sql.includes('FROM adwest.zones ORDER BY created_at ASC')) {
          return hydratedZones;
        }

        if (sql.includes('FROM adwest.srenies ORDER BY created_at ASC')) {
          return hydratedSrenies;
        }

        if (sql.includes('FROM adwest.contacts ORDER BY created_at ASC')) {
          return [];
        }

        if (sql.includes('FROM adwest.sreny_memberships ORDER BY created_at ASC')) {
          return [];
        }

        if (sql.includes('FROM adwest.contact_sreny_metadata ORDER BY created_at ASC')) {
          return [];
        }

        if (sql.includes('FROM adwest.import_batches ORDER BY created_at ASC')) {
          return [];
        }

        if (sql.includes('FROM adwest.dedup_candidates ORDER BY created_at ASC')) {
          return [];
        }

        if (sql.includes('FROM adwest.programs ORDER BY created_at ASC')) {
          return [];
        }

        if (sql.includes('FROM adwest.program_sessions ORDER BY created_at ASC')) {
          return [];
        }

        if (sql.includes('FROM adwest.registrations ORDER BY created_at ASC')) {
          return [];
        }

        if (sql.includes('FROM adwest.attendance ORDER BY created_at ASC')) {
          return [];
        }

        if (sql.includes('FROM adwest.helpdesk_tickets ORDER BY created_at ASC')) {
          return [];
        }

        if (sql.includes('FROM adwest.ticket_comments ORDER BY created_at ASC')) {
          return [];
        }

        if (sql.includes('FROM adwest.document_folders ORDER BY created_at ASC')) {
          return [];
        }

        if (sql.includes('FROM adwest.documents ORDER BY created_at ASC')) {
          return [];
        }

        if (sql.includes('FROM adwest.report_templates ORDER BY created_at ASC')) {
          return [];
        }

        if (sql.includes('FROM adwest.report_template_fields ORDER BY template_id ASC, display_order ASC')) {
          return [];
        }

        if (sql.includes('FROM adwest.report_submissions ORDER BY created_at ASC')) {
          return [];
        }

        if (sql.includes('FROM adwest.approval_workflows ORDER BY created_at ASC')) {
          return [];
        }

        if (sql.includes('FROM adwest.approval_workflow_steps ORDER BY workflow_id ASC, step_order ASC')) {
          return [];
        }

        if (sql.includes('FROM adwest.approval_items ORDER BY created_at ASC')) {
          return [];
        }

        if (sql.includes('INSERT INTO adwest.zones')) {
          const [name, code] = params as [string, string | null];
          const row = {
            id: 'zone-live-2',
            name,
            code,
            created_at: createdAt,
            updated_at: createdAt,
          };
          hydratedZones.push(row);
          return [row];
        }

        if (sql.includes('UPDATE adwest.zones')) {
          const [zoneId, name, code] = params as [string, string, string | null];
          const row = hydratedZones.find((item) => item.id === zoneId);
          if (!row) {
            return [];
          }
          row.name = name;
          row.code = code;
          row.updated_at = '2026-05-25T00:30:00.000Z';
          return [row];
        }

        if (sql.includes('INSERT INTO adwest.srenies')) {
          const [zoneId, name, isServiceSreny] = params as [string, string, boolean];
          const row = {
            id: 'sreny-live-2',
            zone_id: zoneId,
            name,
            is_service_sreny: isServiceSreny,
            created_at: createdAt,
            updated_at: createdAt,
          };
          hydratedSrenies.push(row);
          return [row];
        }

        if (sql.includes('UPDATE adwest.srenies') && sql.includes('is_service_sreny = false')) {
          const [zoneId, srenyId] = params as [string, string];
          for (const row of hydratedSrenies) {
            if (row.zone_id === zoneId && row.id !== srenyId && row.is_service_sreny) {
              row.is_service_sreny = false;
              row.updated_at = '2026-05-25T00:45:00.000Z';
            }
          }
          return [];
        }

        if (sql.includes('UPDATE adwest.srenies')) {
          const [srenyId, name, zoneId, isServiceSreny] = params as [string, string, string, boolean];
          const row = hydratedSrenies.find((item) => item.id === srenyId);
          if (!row) {
            return [];
          }
          row.name = name;
          row.zone_id = zoneId;
          row.is_service_sreny = isServiceSreny;
          row.updated_at = '2026-05-25T00:40:00.000Z';
          return [row];
        }

        throw new Error(`Unexpected query: ${sql}`);
      },
    } as unknown as DataSource;

    const dbStoreStub: CoreBusinessStore = {
      getMode: () => 'db',
      loadState: async () => null,
      saveState: async () => undefined,
    };

    const dbService = new CoreBusinessService(dbStoreStub, dataSourceStub);

    try {
      await dbService.onModuleInit();

      const createdZone = await dbService.createZone({
        name: 'New Zone',
        code: 'NZ',
      });

      expect(createdZone.id).toBe('zone-live-2');
      expect(dbService.listZones()).toHaveLength(2);

      const updatedZone = await dbService.updateZone(createdZone.id, {
        name: 'New Zone Updated',
      });

      expect(updatedZone.name).toBe('New Zone Updated');
      expect(dbService.listZones().find((item) => item.id === createdZone.id)?.name).toBe(
        'New Zone Updated',
      );

      const createdSreny = await dbService.createSreny({
        name: 'New Service Sreny',
        zoneId: createdZone.id,
        isServiceSreny: true,
      });

      expect(createdSreny.zoneId).toBe(createdZone.id);
      expect(createdSreny.isServiceSreny).toBe(true);

      const updatedSreny = await dbService.updateSreny(createdSreny.id, {
        name: 'New Service Sreny Updated',
        isServiceSreny: true,
      });

      expect(updatedSreny.name).toBe('New Service Sreny Updated');
      expect(updatedSreny.isServiceSreny).toBe(true);
      expect(
        dbService.listSrenies(createdZone.id).find((item) => item.id === createdSreny.id)?.name,
      ).toBe('New Service Sreny Updated');
    } finally {
      await dbService.onModuleDestroy();

      if (previousEnableDb === undefined) {
        delete process.env.ENABLE_DB_PERSISTENCE;
      } else {
        process.env.ENABLE_DB_PERSISTENCE = previousEnableDb;
      }
    }
  });

  it('persists contact and membership writes through the DB path', async () => {
    const previousEnableDb = process.env.ENABLE_DB_PERSISTENCE;
    process.env.ENABLE_DB_PERSISTENCE = 'true';

    const createdAt = '2026-05-25T01:00:00.000Z';
    const hydratedZones: Array<{
      id: string;
      code: string | null;
      name: string;
      created_at: string;
      updated_at: string;
    }> = [
      {
        id: 'zone-live-1',
        code: 'WZ',
        name: 'West Zone',
        created_at: createdAt,
        updated_at: createdAt,
      },
    ];
    const hydratedSrenies = [
      {
        id: 'sreny-live-1',
        zone_id: 'zone-live-1',
        name: 'Service Sreny',
        is_service_sreny: true,
        created_at: createdAt,
        updated_at: createdAt,
      },
      {
        id: 'sreny-live-2',
        zone_id: 'zone-live-1',
        name: 'Community Sreny',
        is_service_sreny: false,
        created_at: createdAt,
        updated_at: createdAt,
      },
    ];
    const hydratedContacts: Array<{
      id: string;
      zone_id: string;
      first_name: string;
      last_name: string;
      phone_primary: string | null;
      email_primary: string | null;
      address: string | null;
      status: string;
      created_at: string;
      updated_at: string;
    }> = [];
    const hydratedMemberships: Array<{
      contact_id: string;
      sreny_id: string;
      joined_date: string;
      status: string;
    }> = [];
    const hydratedMetadata: Array<{
      contact_id: string;
      sreny_id: string;
      metadata: Record<string, string>;
    }> = [];

    const dataSourceStub = {
      query: async (sql: string, params: unknown[] = []) => {
        if (sql.includes('FROM adwest.zones ORDER BY created_at ASC')) {
          return hydratedZones;
        }

        if (sql.includes('FROM adwest.srenies ORDER BY created_at ASC')) {
          return hydratedSrenies;
        }

        if (sql.includes('FROM adwest.contacts ORDER BY created_at ASC')) {
          return hydratedContacts;
        }

        if (sql.includes('FROM adwest.sreny_memberships ORDER BY created_at ASC')) {
          return hydratedMemberships;
        }

        if (sql.includes('FROM adwest.contact_sreny_metadata ORDER BY created_at ASC')) {
          return hydratedMetadata;
        }

        if (sql.includes('FROM adwest.import_batches ORDER BY created_at ASC')) {
          return [];
        }

        if (sql.includes('FROM adwest.dedup_candidates ORDER BY created_at ASC')) {
          return [];
        }

        if (sql.includes('FROM adwest.programs ORDER BY created_at ASC')) {
          return [];
        }

        if (sql.includes('FROM adwest.program_sessions ORDER BY created_at ASC')) {
          return [];
        }

        if (sql.includes('FROM adwest.registrations ORDER BY created_at ASC')) {
          return [];
        }

        if (sql.includes('FROM adwest.attendance ORDER BY created_at ASC')) {
          return [];
        }

        if (sql.includes('FROM adwest.helpdesk_tickets ORDER BY created_at ASC')) {
          return [];
        }

        if (sql.includes('FROM adwest.ticket_comments ORDER BY created_at ASC')) {
          return [];
        }

        if (sql.includes('FROM adwest.document_folders ORDER BY created_at ASC')) {
          return [];
        }

        if (sql.includes('FROM adwest.documents ORDER BY created_at ASC')) {
          return [];
        }

        if (sql.includes('FROM adwest.report_templates ORDER BY created_at ASC')) {
          return [];
        }

        if (sql.includes('FROM adwest.report_template_fields ORDER BY template_id ASC, display_order ASC')) {
          return [];
        }

        if (sql.includes('FROM adwest.report_submissions ORDER BY created_at ASC')) {
          return [];
        }

        if (sql.includes('FROM adwest.approval_workflows ORDER BY created_at ASC')) {
          return [];
        }

        if (sql.includes('FROM adwest.approval_workflow_steps ORDER BY workflow_id ASC, step_order ASC')) {
          return [];
        }

        if (sql.includes('FROM adwest.approval_items ORDER BY created_at ASC')) {
          return [];
        }

        if (sql.includes('INSERT INTO adwest.contacts')) {
          const [id, zoneId, firstName, lastName, phone, email, address, status] = params as [
            string,
            string,
            string,
            string,
            string | null,
            string | null,
            string | null,
            string,
          ];
          const existing = hydratedContacts.find((item) => item.id === id);
          const row = {
            id,
            zone_id: zoneId,
            first_name: firstName,
            last_name: lastName,
            phone_primary: phone,
            email_primary: email,
            address,
            status,
            created_at: existing?.created_at ?? createdAt,
            updated_at: '2026-05-25T01:05:00.000Z',
          };
          if (existing) {
            Object.assign(existing, row);
          } else {
            hydratedContacts.push(row);
          }
          return [row];
        }

        if (sql.includes('DELETE FROM adwest.sreny_memberships WHERE contact_id = $1')) {
          const [contactId] = params as [string];
          for (let index = hydratedMemberships.length - 1; index >= 0; index -= 1) {
            if (hydratedMemberships[index].contact_id === contactId) {
              hydratedMemberships.splice(index, 1);
            }
          }
          return [];
        }

        if (sql.includes('INSERT INTO adwest.sreny_memberships')) {
          const [contactId, srenyId, joinedDate] = params as [string, string, string];
          const row = {
            contact_id: contactId,
            sreny_id: srenyId,
            joined_date: joinedDate,
            status: 'active',
          };
          hydratedMemberships.push(row);
          return [row];
        }

        if (sql.includes('DELETE FROM adwest.contact_sreny_metadata WHERE contact_id = $1')) {
          const [contactId] = params as [string];
          for (let index = hydratedMetadata.length - 1; index >= 0; index -= 1) {
            if (hydratedMetadata[index].contact_id === contactId) {
              hydratedMetadata.splice(index, 1);
            }
          }
          return [];
        }

        if (sql.includes('INSERT INTO adwest.contact_sreny_metadata')) {
          const [contactId, srenyId, metadataJson] = params as [string, string, string];
          const row = {
            contact_id: contactId,
            sreny_id: srenyId,
            metadata: JSON.parse(metadataJson) as Record<string, string>,
          };
          hydratedMetadata.push(row);
          return [row];
        }

        throw new Error(`Unexpected query: ${sql}`);
      },
    } as unknown as DataSource;

    const dbStoreStub: CoreBusinessStore = {
      getMode: () => 'db',
      loadState: async () => null,
      saveState: async () => undefined,
    };

    const dbService = new CoreBusinessService(dbStoreStub, dataSourceStub);

    try {
      await dbService.onModuleInit();

      const contact = dbService.createContact({
        firstName: 'DB',
        lastName: 'Contact',
        zoneId: 'zone-live-1',
        srenyIds: ['sreny-live-1'],
        phone: '971500002000',
        email: 'db.contact@adwest.local',
        address: 'DB Address',
        customMetadataBySreny: {
          'sreny-live-1': {
            role: 'lead',
          },
        },
      });

      await new Promise((resolve) => setImmediate(resolve));

      expect(hydratedContacts).toHaveLength(1);
      expect(hydratedMemberships).toHaveLength(1);
      expect(hydratedMetadata).toHaveLength(1);
      expect(hydratedMetadata[0].metadata.role).toBe('lead');

      const updated = dbService.updateContact(contact.id, {
        firstName: 'DB Updated',
        srenyIds: ['sreny-live-1', 'sreny-live-2'],
        customMetadataBySreny: {
          'sreny-live-2': {
            note: 'new',
          },
        },
      });

      expect(updated.firstName).toBe('DB Updated');

      await new Promise((resolve) => setImmediate(resolve));

      expect(hydratedContacts[0].first_name).toBe('DB Updated');
      expect(hydratedMemberships).toHaveLength(2);
      expect(hydratedMetadata).toHaveLength(1);
      expect(hydratedMetadata.some((item) => item.sreny_id === 'sreny-live-2')).toBe(true);

      const membershipToRemove = dbService.getContact(contact.id).memberships.find(
        (item) => item.srenyId === 'sreny-live-1',
      );
      expect(membershipToRemove).toBeDefined();

      dbService.removeMembership(contact.id, membershipToRemove!.id);
      await new Promise((resolve) => setImmediate(resolve));

      expect(hydratedMemberships).toHaveLength(1);
      expect(hydratedMetadata).toHaveLength(1);
      expect(hydratedMetadata[0].sreny_id).toBe('sreny-live-2');
    } finally {
      await dbService.onModuleDestroy();

      if (previousEnableDb === undefined) {
        delete process.env.ENABLE_DB_PERSISTENCE;
      } else {
        process.env.ENABLE_DB_PERSISTENCE = previousEnableDb;
      }
    }
  });

  it('persists import batches and dedup candidates through the DB path', async () => {
    const previousEnableDb = process.env.ENABLE_DB_PERSISTENCE;
    process.env.ENABLE_DB_PERSISTENCE = 'true';

    const createdAt = '2026-05-25T02:00:00.000Z';
    const hydratedZones: Array<{
      id: string;
      code: string | null;
      name: string;
      created_at: string;
      updated_at: string;
    }> = [
      {
        id: 'zone-live-1',
        code: 'WZ',
        name: 'West Zone',
        created_at: createdAt,
        updated_at: createdAt,
      },
    ];
    const hydratedSrenies = [
      {
        id: 'sreny-live-1',
        zone_id: 'zone-live-1',
        name: 'Service Sreny',
        is_service_sreny: true,
        created_at: createdAt,
        updated_at: createdAt,
      },
    ];
    const hydratedContacts: Array<{
      id: string;
      zone_id: string;
      first_name: string;
      last_name: string;
      phone_primary: string | null;
      email_primary: string | null;
      address: string | null;
      status: string;
      created_at: string;
      updated_at: string;
    }> = [
      {
        id: 'ct_import_1',
        zone_id: 'zone-live-1',
        first_name: 'Import',
        last_name: 'One',
        phone_primary: '971500003001',
        email_primary: 'import.one@adwest.local',
        address: 'Import Address 1',
        status: 'active',
        created_at: createdAt,
        updated_at: createdAt,
      },
      {
        id: 'ct_import_2',
        zone_id: 'zone-live-1',
        first_name: 'Import',
        last_name: 'Two',
        phone_primary: '971500003002',
        email_primary: 'import.two@adwest.local',
        address: 'Import Address 2',
        status: 'active',
        created_at: createdAt,
        updated_at: createdAt,
      },
    ];
    const hydratedMemberships = [
      {
        contact_id: 'ct_import_1',
        sreny_id: 'sreny-live-1',
        joined_date: '2026-05-25',
        status: 'active',
        created_at: createdAt,
      },
      {
        contact_id: 'ct_import_2',
        sreny_id: 'sreny-live-1',
        joined_date: '2026-05-25',
        status: 'active',
        created_at: createdAt,
      },
    ];
    const hydratedMetadata: Array<{
      contact_id: string;
      sreny_id: string;
      metadata: Record<string, string>;
    }> = [];
    const importBatches: Array<{
      id: string;
      zone_id: string;
      filename: string;
      status: string;
      summary: Record<string, unknown>;
      created_at: string;
    }> = [];
    const dedupCandidates: Array<{
      id: string;
      batch_id: string;
      incoming: Record<string, unknown>;
      matched_contact_id: string | null;
      resolution: string;
      created_at: string;
    }> = [];

    const dataSourceStub = {
      query: async (sql: string, params: unknown[] = []) => {
        if (sql.includes('FROM adwest.zones ORDER BY created_at ASC')) {
          return hydratedZones;
        }

        if (sql.includes('FROM adwest.srenies ORDER BY created_at ASC')) {
          return hydratedSrenies;
        }

        if (sql.includes('FROM adwest.contacts ORDER BY created_at ASC')) {
          return hydratedContacts;
        }

        if (sql.includes('FROM adwest.sreny_memberships ORDER BY created_at ASC')) {
          return hydratedMemberships;
        }

        if (sql.includes('FROM adwest.contact_sreny_metadata ORDER BY created_at ASC')) {
          return hydratedMetadata;
        }

        if (sql.includes('FROM adwest.import_batches ORDER BY created_at ASC')) {
          return importBatches;
        }

        if (sql.includes('FROM adwest.dedup_candidates ORDER BY created_at ASC')) {
          return dedupCandidates;
        }

        if (sql.includes('FROM adwest.programs ORDER BY created_at ASC')) {
          return [];
        }

        if (sql.includes('FROM adwest.program_sessions ORDER BY created_at ASC')) {
          return [];
        }

        if (sql.includes('FROM adwest.registrations ORDER BY created_at ASC')) {
          return [];
        }

        if (sql.includes('FROM adwest.attendance ORDER BY created_at ASC')) {
          return [];
        }

        if (sql.includes('FROM adwest.helpdesk_tickets ORDER BY created_at ASC')) {
          return [];
        }

        if (sql.includes('FROM adwest.ticket_comments ORDER BY created_at ASC')) {
          return [];
        }

        if (sql.includes('FROM adwest.document_folders ORDER BY created_at ASC')) {
          return [];
        }

        if (sql.includes('FROM adwest.documents ORDER BY created_at ASC')) {
          return [];
        }

        if (sql.includes('FROM adwest.report_templates ORDER BY created_at ASC')) {
          return [];
        }

        if (sql.includes('FROM adwest.report_template_fields ORDER BY template_id ASC, display_order ASC')) {
          return [];
        }

        if (sql.includes('FROM adwest.report_submissions ORDER BY created_at ASC')) {
          return [];
        }

        if (sql.includes('FROM adwest.approval_workflows ORDER BY created_at ASC')) {
          return [];
        }

        if (sql.includes('FROM adwest.approval_workflow_steps ORDER BY workflow_id ASC, step_order ASC')) {
          return [];
        }

        if (sql.includes('FROM adwest.approval_items ORDER BY created_at ASC')) {
          return [];
        }

        if (sql.includes('INSERT INTO adwest.import_batches')) {
          const [id, zoneId, filename, status, summaryJson, createdAtValue] = params as [
            string,
            string,
            string,
            string,
            string,
            string,
          ];
          const row = {
            id,
            zone_id: zoneId,
            filename,
            status,
            summary: JSON.parse(summaryJson) as Record<string, unknown>,
            created_at: createdAtValue,
          };
          const existing = importBatches.find((item) => item.id === id);
          if (existing) {
            Object.assign(existing, row);
          } else {
            importBatches.push(row);
          }
          return [row];
        }

        if (sql.includes('DELETE FROM adwest.dedup_candidates WHERE batch_id = $1')) {
          const [batchId] = params as [string];
          for (let index = dedupCandidates.length - 1; index >= 0; index -= 1) {
            if (dedupCandidates[index].batch_id === batchId) {
              dedupCandidates.splice(index, 1);
            }
          }
          return [];
        }

        if (sql.includes('INSERT INTO adwest.dedup_candidates')) {
          const [id, batchId, incomingJson, matchedContactId, resolution] = params as [
            string,
            string,
            string,
            string | null,
            string,
          ];
          const row = {
            id,
            batch_id: batchId,
            incoming: JSON.parse(incomingJson) as Record<string, unknown>,
            matched_contact_id: matchedContactId,
            resolution,
            created_at: createdAt,
          };
          dedupCandidates.push(row);
          return [row];
        }

        throw new Error(`Unexpected query: ${sql}`);
      },
    } as unknown as DataSource;

    const dbStoreStub: CoreBusinessStore = {
      getMode: () => 'db',
      loadState: async () => null,
      saveState: async () => undefined,
    };

    const dbService = new CoreBusinessService(dbStoreStub, dataSourceStub);

    try {
      await dbService.onModuleInit();

      const importRecord = dbService.startImport({
        fileName: 'imports-db.csv',
        fileType: 'csv',
        hasHeader: true,
      });

      await new Promise((resolve) => setImmediate(resolve));

      expect(importBatches).toHaveLength(1);
      expect(dedupCandidates).toHaveLength(1);
      expect(importBatches[0].filename).toBe('imports-db.csv');
      expect(dedupCandidates[0].batch_id).toBe(importRecord.id);
      expect(dedupCandidates[0].resolution).toBe('pending');

      const duplicate = dbService.listImportDuplicates(importRecord.id)[0];
      dbService.skipDuplicate(importRecord.id, duplicate.id);

      await new Promise((resolve) => setImmediate(resolve));

      expect(dedupCandidates[0].resolution).toBe('skipped');

      const finalized = await dbService.finalizeImport(importRecord.id);
      expect(finalized.status).toBe('finalized');
      expect(importBatches[0].status).toBe('finalized');
      expect(importBatches[0].summary).toHaveProperty('finalizedAt');
    } finally {
      await dbService.onModuleDestroy();

      if (previousEnableDb === undefined) {
        delete process.env.ENABLE_DB_PERSISTENCE;
      } else {
        process.env.ENABLE_DB_PERSISTENCE = previousEnableDb;
      }
    }
  });

  it('persists program and attendance writes through the DB path', async () => {
    const previousEnableDb = process.env.ENABLE_DB_PERSISTENCE;
    process.env.ENABLE_DB_PERSISTENCE = 'true';

    const createdAt = '2026-05-25T03:00:00.000Z';
    const hydratedZones = [
      {
        id: 'zone-live-1',
        code: 'WZ',
        name: 'West Zone',
        created_at: createdAt,
        updated_at: createdAt,
      },
    ];
    const hydratedSrenies = [
      {
        id: 'sreny-live-1',
        zone_id: 'zone-live-1',
        name: 'Service Sreny',
        is_service_sreny: true,
        created_at: createdAt,
        updated_at: createdAt,
      },
    ];
    const hydratedContacts = [
      {
        id: 'ct_prog_1',
        zone_id: 'zone-live-1',
        first_name: 'Program',
        last_name: 'Contact',
        phone_primary: '971500004001',
        email_primary: 'program.contact@adwest.local',
        address: 'Program Address',
        status: 'active',
        created_at: createdAt,
        updated_at: createdAt,
      },
    ];
    const hydratedMemberships = [
      {
        contact_id: 'ct_prog_1',
        sreny_id: 'sreny-live-1',
        joined_date: '2026-05-25',
        created_at: createdAt,
      },
    ];
    const hydratedMetadata: Array<{
      contact_id: string;
      sreny_id: string;
      metadata: Record<string, string>;
    }> = [];
    const programs: Array<any> = [];
    const sessions: Array<any> = [];
    const registrations: Array<any> = [];
    const attendanceRows: Array<any> = [];

    const dataSourceStub = {
      query: async (sql: string, params: unknown[] = []) => {
        if (sql.includes('FROM adwest.zones ORDER BY created_at ASC')) return hydratedZones;
        if (sql.includes('FROM adwest.srenies ORDER BY created_at ASC')) return hydratedSrenies;
        if (sql.includes('FROM adwest.contacts ORDER BY created_at ASC')) return hydratedContacts;
        if (sql.includes('FROM adwest.sreny_memberships ORDER BY created_at ASC')) return hydratedMemberships;
        if (sql.includes('FROM adwest.contact_sreny_metadata ORDER BY created_at ASC')) return hydratedMetadata;
        if (sql.includes('FROM adwest.import_batches ORDER BY created_at ASC')) return [];
        if (sql.includes('FROM adwest.dedup_candidates ORDER BY created_at ASC')) return [];
        if (sql.includes('FROM adwest.programs ORDER BY created_at ASC')) return programs;
        if (sql.includes('FROM adwest.program_sessions ORDER BY created_at ASC')) return sessions;
        if (sql.includes('FROM adwest.registrations ORDER BY created_at ASC')) return registrations;
        if (sql.includes('FROM adwest.attendance ORDER BY created_at ASC')) return attendanceRows;
        if (sql.includes('FROM adwest.helpdesk_tickets ORDER BY created_at ASC')) return [];
        if (sql.includes('FROM adwest.ticket_comments ORDER BY created_at ASC')) return [];
        if (sql.includes('FROM adwest.document_folders ORDER BY created_at ASC')) return [];
        if (sql.includes('FROM adwest.documents ORDER BY created_at ASC')) return [];
        if (sql.includes('FROM adwest.report_templates ORDER BY created_at ASC')) return [];
        if (sql.includes('FROM adwest.report_template_fields ORDER BY template_id ASC, display_order ASC')) return [];
        if (sql.includes('FROM adwest.report_submissions ORDER BY created_at ASC')) return [];
        if (sql.includes('FROM adwest.approval_workflows ORDER BY created_at ASC')) return [];
        if (sql.includes('FROM adwest.approval_workflow_steps ORDER BY workflow_id ASC, step_order ASC')) return [];
        if (sql.includes('FROM adwest.approval_items ORDER BY created_at ASC')) return [];

        if (sql.includes('INSERT INTO adwest.programs')) {
          const [id, srenyId, name, startDate, endDate, capacity, status, description, createdOn, updatedOn] = params as [
            string,
            string,
            string,
            string,
            string,
            number,
            string,
            string | null,
            string,
            string,
          ];
          const row = {
            id,
            sreny_id: srenyId,
            name,
            category: null,
            start_date: startDate,
            end_date: endDate,
            venue: null,
            max_participants: capacity,
            status,
            description,
            created_at: createdOn,
            updated_at: updatedOn,
          };
          const existing = programs.find((item) => item.id === id);
          if (existing) Object.assign(existing, row);
          else programs.push(row);
          return [row];
        }

        if (sql.includes('DELETE FROM adwest.program_sessions WHERE program_id = $1')) {
          const [programId] = params as [string];
          for (let index = sessions.length - 1; index >= 0; index -= 1) {
            if (sessions[index].program_id === programId) sessions.splice(index, 1);
          }
          return [];
        }

        if (sql.includes('INSERT INTO adwest.program_sessions')) {
          const [id, programId, date, startTime, endTime, venue] = params as [string, string, string, string, string, string];
          const row = { id, program_id: programId, date, start_time: startTime, end_time: endTime, venue, created_at: createdAt, updated_at: createdAt };
          sessions.push(row);
          return [row];
        }

        if (sql.includes('DELETE FROM adwest.registrations WHERE program_id = $1')) {
          const [programId] = params as [string];
          for (let index = registrations.length - 1; index >= 0; index -= 1) {
            if (registrations[index].program_id === programId) registrations.splice(index, 1);
          }
          return [];
        }

        if (sql.includes('INSERT INTO adwest.registrations')) {
          const [id, programId, contactId, registeredAt] = params as [string, string, string, string];
          const row = { id, program_id: programId, contact_id: contactId, status: 'registered', registered_at: registeredAt, created_at: registeredAt, updated_at: registeredAt };
          registrations.push(row);
          return [row];
        }

        if (sql.includes('INSERT INTO adwest.attendance')) {
          const [id, sessionId, contactId, status, method, markedBy, markedAt] = params as [string, string, string, string, string | null, string, string];
          const row = { id, session_id: sessionId, contact_id: contactId, status, method, marked_by: markedBy, marked_at: markedAt, created_at: markedAt, updated_at: markedAt };
          const existing = attendanceRows.find((item) => item.session_id === sessionId && item.contact_id === contactId);
          if (existing) Object.assign(existing, row);
          else attendanceRows.push(row);
          return [row];
        }

        throw new Error(`Unexpected query: ${sql}`);
      },
    } as unknown as DataSource;

    const dbStoreStub: CoreBusinessStore = {
      getMode: () => 'db',
      loadState: async () => null,
      saveState: async () => undefined,
    };

    const dbService = new CoreBusinessService(dbStoreStub, dataSourceStub);

    try {
      await dbService.onModuleInit();

      const program = dbService.createProgram({
        title: 'DB Program',
        description: 'Persistence test',
        startDate: '2026-07-01',
        endDate: '2026-07-10',
        capacity: 25,
      });
      const session = dbService.createSession(program.id, {
        name: 'DB Session',
        startAt: '2026-07-02T09:00:00.000Z',
        endAt: '2026-07-02T11:00:00.000Z',
      });
      dbService.createRegistration(program.id, {
        contactId: 'ct_prog_1',
      });

      await flushAsyncWrites();

      expect(programs).toHaveLength(1);
      expect(sessions).toHaveLength(1);
      expect(registrations).toHaveLength(1);
      expect(programs[0].name).toBe('DB Program');
      expect(sessions[0].program_id).toBe(program.id);
      expect(registrations[0].contact_id).toBe('ct_prog_1');

      dbService.recordAttendance(
        session.id,
        {
          contactId: 'ct_prog_1',
          state: 'present',
        },
        {
          userId: 'admin_operator_10',
          type: 'admin',
          email: 'operator10@adwest.local',
          roles: [],
          sessionId: 'sess_operator_10',
        },
      );

      await flushAsyncWrites();

      expect(attendanceRows).toHaveLength(1);
      expect(attendanceRows[0].session_id).toBe(session.id);
      expect(attendanceRows[0].contact_id).toBe('ct_prog_1');
      expect(attendanceRows[0].status).toBe('present');

      const updatedProgram = dbService.updateProgram(program.id, {
        title: 'DB Program Updated',
      });
      expect(updatedProgram.title).toBe('DB Program Updated');

      await flushAsyncWrites();

      expect(programs[0].name).toBe('DB Program Updated');
      expect(registrations[0].program_id).toBe(program.id);
    } finally {
      await dbService.onModuleDestroy();

      if (previousEnableDb === undefined) {
        delete process.env.ENABLE_DB_PERSISTENCE;
      } else {
        process.env.ENABLE_DB_PERSISTENCE = previousEnableDb;
      }
    }
  });

  it('persists helpdesk ticket writes through the DB path', async () => {
    const previousEnableDb = process.env.ENABLE_DB_PERSISTENCE;
    process.env.ENABLE_DB_PERSISTENCE = 'true';

    const createdAt = '2026-05-25T04:00:00.000Z';
    const hydratedZones = [
      {
        id: 'zone-live-1',
        code: 'WZ',
        name: 'West Zone',
        created_at: createdAt,
        updated_at: createdAt,
      },
    ];
    const hydratedSrenies = [
      {
        id: 'sreny-live-1',
        zone_id: 'zone-live-1',
        name: 'Service Sreny',
        is_service_sreny: true,
        created_at: createdAt,
        updated_at: createdAt,
      },
    ];
    const hydratedContacts = [
      {
        id: 'ct_help_1',
        zone_id: 'zone-live-1',
        first_name: 'Helpdesk',
        last_name: 'Member',
        phone_primary: '971500005001',
        email_primary: 'helpdesk.member@adwest.local',
        address: 'Helpdesk Address',
        status: 'active',
        created_at: createdAt,
        updated_at: createdAt,
      },
    ];
    const hydratedMemberships = [
      {
        contact_id: 'ct_help_1',
        sreny_id: 'sreny-live-1',
        joined_date: '2026-05-25',
        created_at: createdAt,
      },
    ];
    const hydratedMetadata: Array<{
      contact_id: string;
      sreny_id: string;
      metadata: Record<string, string>;
    }> = [];
    const helpdeskTickets: Array<any> = [];
    const ticketComments: Array<any> = [];

    const dataSourceStub = {
      query: async (sql: string, params: unknown[] = []) => {
        if (sql.includes('FROM adwest.zones ORDER BY created_at ASC')) return hydratedZones;
        if (sql.includes('FROM adwest.srenies ORDER BY created_at ASC')) return hydratedSrenies;
        if (sql.includes('FROM adwest.contacts ORDER BY created_at ASC')) return hydratedContacts;
        if (sql.includes('FROM adwest.sreny_memberships ORDER BY created_at ASC')) return hydratedMemberships;
        if (sql.includes('FROM adwest.contact_sreny_metadata ORDER BY created_at ASC')) return hydratedMetadata;
        if (sql.includes('FROM adwest.import_batches ORDER BY created_at ASC')) return [];
        if (sql.includes('FROM adwest.dedup_candidates ORDER BY created_at ASC')) return [];
        if (sql.includes('FROM adwest.programs ORDER BY created_at ASC')) return [];
        if (sql.includes('FROM adwest.program_sessions ORDER BY created_at ASC')) return [];
        if (sql.includes('FROM adwest.registrations ORDER BY created_at ASC')) return [];
        if (sql.includes('FROM adwest.attendance ORDER BY created_at ASC')) return [];
        if (sql.includes('FROM adwest.helpdesk_tickets ORDER BY created_at ASC')) return helpdeskTickets;
        if (sql.includes('FROM adwest.ticket_comments ORDER BY created_at ASC')) return ticketComments;
        if (sql.includes('FROM adwest.document_folders ORDER BY created_at ASC')) return [];
        if (sql.includes('FROM adwest.documents ORDER BY created_at ASC')) return [];
        if (sql.includes('FROM adwest.report_templates ORDER BY created_at ASC')) return [];
        if (sql.includes('FROM adwest.report_template_fields ORDER BY template_id ASC, display_order ASC')) return [];
        if (sql.includes('FROM adwest.report_submissions ORDER BY created_at ASC')) return [];
        if (sql.includes('FROM adwest.approval_workflows ORDER BY created_at ASC')) return [];
        if (sql.includes('FROM adwest.approval_workflow_steps ORDER BY workflow_id ASC, step_order ASC')) return [];
        if (sql.includes('FROM adwest.approval_items ORDER BY created_at ASC')) return [];

        if (sql.includes('INSERT INTO adwest.helpdesk_tickets')) {
          const [id, contactId, zoneId, category, subject, description, priority, status, assignedTo, createdOn, updatedOn] = params as [
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string | null,
            string,
            string,
          ];
          const row = {
            id,
            contact_id: contactId,
            zone_id: zoneId,
            category,
            subject,
            description,
            priority,
            status,
            assigned_to: assignedTo,
            created_at: createdOn,
            updated_at: updatedOn,
          };
          const existing = helpdeskTickets.find((item) => item.id === id);
          if (existing) Object.assign(existing, row);
          else helpdeskTickets.push(row);
          return [row];
        }

        if (sql.includes('DELETE FROM adwest.ticket_comments WHERE ticket_id = $1')) {
          const [ticketId] = params as [string];
          for (let index = ticketComments.length - 1; index >= 0; index -= 1) {
            if (ticketComments[index].ticket_id === ticketId) ticketComments.splice(index, 1);
          }
          return [];
        }

        if (sql.includes('INSERT INTO adwest.ticket_comments')) {
          const [id, ticketId, authorId, authorType, body, createdOn] = params as [string, string, string, string, string, string];
          const row = {
            id,
            ticket_id: ticketId,
            author_id: authorId,
            author_type: authorType,
            body,
            created_at: createdOn,
          };
          ticketComments.push(row);
          return [row];
        }

        throw new Error(`Unexpected query: ${sql}`);
      },
    } as unknown as DataSource;

    const dbStoreStub: CoreBusinessStore = {
      getMode: () => 'db',
      loadState: async () => null,
      saveState: async () => undefined,
    };

    const dbService = new CoreBusinessService(dbStoreStub, dataSourceStub);

    try {
      await dbService.onModuleInit();

      const ticket = dbService.createTicket(
        {
          subject: 'DB helpdesk issue',
          description: 'Helpdesk persistence test',
          category: 'General',
          priority: 'medium',
        },
        {
          userId: 'ct_help_1',
          type: 'member',
          email: 'helpdesk.member@adwest.local',
          roles: [],
          sessionId: 'sess_help_1',
        },
      );

      await flushAsyncWrites();

      expect(helpdeskTickets).toHaveLength(1);
      expect(ticketComments).toHaveLength(0);
      expect(helpdeskTickets[0].subject).toBe('DB helpdesk issue');

      dbService.updateTicketAssignee(ticket.id, { assigneeId: 'admin_operator_11' });
      dbService.updateTicketStatus(ticket.id, { status: 'in_progress' });
      dbService.addTicketComment(
        ticket.id,
        { body: 'We are looking into it' },
        {
          userId: 'admin_operator_11',
          type: 'admin',
          email: 'operator11@adwest.local',
          roles: [],
          sessionId: 'sess_operator_11',
        },
      );

      await flushAsyncWrites();

      expect(helpdeskTickets[0].assigned_to).toBe('admin_operator_11');
      expect(helpdeskTickets[0].status).toBe('in_progress');
      expect(ticketComments).toHaveLength(1);
      expect(ticketComments[0].body).toBe('We are looking into it');
      expect(ticketComments[0].ticket_id).toBe(ticket.id);
    } finally {
      await dbService.onModuleDestroy();

      if (previousEnableDb === undefined) {
        delete process.env.ENABLE_DB_PERSISTENCE;
      } else {
        process.env.ENABLE_DB_PERSISTENCE = previousEnableDb;
      }
    }
  });

  it('persists document folder and document writes through the DB path', async () => {
    const previousEnableDb = process.env.ENABLE_DB_PERSISTENCE;
    process.env.ENABLE_DB_PERSISTENCE = 'true';

    const createdAt = '2026-05-25T05:00:00.000Z';
    const hydratedZones = [
      {
        id: 'zone-live-1',
        code: 'WZ',
        name: 'West Zone',
        created_at: createdAt,
        updated_at: createdAt,
      },
    ];
    const hydratedSrenies = [
      {
        id: 'sreny-live-1',
        zone_id: 'zone-live-1',
        name: 'Service Sreny',
        is_service_sreny: true,
        created_at: createdAt,
        updated_at: createdAt,
      },
    ];
    const hydratedContacts: Array<any> = [];
    const hydratedMemberships: Array<any> = [];
    const hydratedMetadata: Array<any> = [];
    const hydratedFolders: Array<any> = [];
    const hydratedDocuments: Array<any> = [];

    const dataSourceStub = {
      query: async (sql: string, params: unknown[] = []) => {
        if (sql.includes('FROM adwest.zones ORDER BY created_at ASC')) return hydratedZones;
        if (sql.includes('FROM adwest.srenies ORDER BY created_at ASC')) return hydratedSrenies;
        if (sql.includes('FROM adwest.contacts ORDER BY created_at ASC')) return hydratedContacts;
        if (sql.includes('FROM adwest.sreny_memberships ORDER BY created_at ASC')) return hydratedMemberships;
        if (sql.includes('FROM adwest.contact_sreny_metadata ORDER BY created_at ASC')) return hydratedMetadata;
        if (sql.includes('FROM adwest.import_batches ORDER BY created_at ASC')) return [];
        if (sql.includes('FROM adwest.dedup_candidates ORDER BY created_at ASC')) return [];
        if (sql.includes('FROM adwest.programs ORDER BY created_at ASC')) return [];
        if (sql.includes('FROM adwest.program_sessions ORDER BY created_at ASC')) return [];
        if (sql.includes('FROM adwest.registrations ORDER BY created_at ASC')) return [];
        if (sql.includes('FROM adwest.attendance ORDER BY created_at ASC')) return [];
        if (sql.includes('FROM adwest.helpdesk_tickets ORDER BY created_at ASC')) return [];
        if (sql.includes('FROM adwest.ticket_comments ORDER BY created_at ASC')) return [];
        if (sql.includes('FROM adwest.document_folders ORDER BY created_at ASC')) return hydratedFolders;
        if (sql.includes('FROM adwest.documents ORDER BY created_at ASC')) return hydratedDocuments;
        if (sql.includes('FROM adwest.report_templates ORDER BY created_at ASC')) return [];
        if (sql.includes('FROM adwest.report_template_fields ORDER BY template_id ASC, display_order ASC')) return [];
        if (sql.includes('FROM adwest.report_submissions ORDER BY created_at ASC')) return [];
        if (sql.includes('FROM adwest.approval_workflows ORDER BY created_at ASC')) return [];
        if (sql.includes('FROM adwest.approval_workflow_steps ORDER BY workflow_id ASC, step_order ASC')) return [];
        if (sql.includes('FROM adwest.approval_items ORDER BY created_at ASC')) return [];

        if (sql.includes('INSERT INTO adwest.document_folders')) {
          const [id, srenyId, parentFolderId, name, createdOn, updatedOn] = params as [
            string,
            string,
            string | null,
            string,
            string,
            string,
          ];
          const row = {
            id,
            sreny_id: srenyId,
            parent_folder_id: parentFolderId,
            name,
            created_at: createdOn,
            updated_at: updatedOn,
          };
          const existing = hydratedFolders.find((item) => item.id === id);
          if (existing) Object.assign(existing, row);
          else hydratedFolders.push(row);
          return [row];
        }

        if (sql.includes('INSERT INTO adwest.documents')) {
          const [id, srenyId, folderId, sourceDocumentId, fileName, fileType, category, description, version, accessLevel, linkedEntityType, linkedEntityId, uploadedBy, createdOn, updatedOn] = params as [
            string,
            string,
            string | null,
            string | null,
            string,
            string,
            string | null,
            string | null,
            number,
            string,
            string | null,
            string | null,
            string,
            string,
            string,
          ];
          const row = {
            id,
            sreny_id: srenyId,
            folder_id: folderId,
            source_document_id: sourceDocumentId,
            file_name: fileName,
            file_type: fileType,
            category,
            description,
            version,
            access_level: accessLevel,
            linked_entity_type: linkedEntityType,
            linked_entity_id: linkedEntityId,
            uploaded_by: uploadedBy,
            created_at: createdOn,
            updated_at: updatedOn,
          };
          const existing = hydratedDocuments.find((item) => item.id === id);
          if (existing) Object.assign(existing, row);
          else hydratedDocuments.push(row);
          return [row];
        }

        throw new Error(`Unexpected query: ${sql}`);
      },
    } as unknown as DataSource;

    const dbStoreStub: CoreBusinessStore = {
      getMode: () => 'db',
      loadState: async () => null,
      saveState: async () => undefined,
    };

    const dbService = new CoreBusinessService(dbStoreStub, dataSourceStub);

    try {
      await dbService.onModuleInit();

      const folder = dbService.createDocumentFolder({
        srenyId: 'sreny-live-1',
        name: 'Policies',
      });
      const document = dbService.createDocument(
        {
          srenyId: 'sreny-live-1',
          folderId: folder.id,
          fileName: 'policy.pdf',
          fileType: 'PDF',
          category: 'Governance',
          description: 'Policy document',
          accessLevel: 'sreny',
        },
        {
          userId: 'admin_operator_12',
          type: 'admin',
          email: 'operator12@adwest.local',
          roles: [],
          sessionId: 'sess_operator_12',
        },
      );
      const versioned = dbService.createDocumentVersion(
        document.id,
        {
          srenyId: 'sreny-live-1',
          fileName: 'policy-v2.pdf',
          fileType: 'PDF',
          category: 'Governance',
          description: 'Policy document revision',
          accessLevel: 'sreny',
        },
        {
          userId: 'admin_operator_12',
          type: 'admin',
          email: 'operator12@adwest.local',
          roles: [],
          sessionId: 'sess_operator_12',
        },
      );

      await flushAsyncWrites();

      expect(hydratedFolders).toHaveLength(1);
      expect(hydratedDocuments).toHaveLength(2);
      expect(hydratedFolders[0].name).toBe('Policies');
      expect(hydratedDocuments[0].file_name).toBe('policy.pdf');
      expect(hydratedDocuments[0].folder_id).toBe(folder.id);
      expect(hydratedDocuments[1].version).toBe(2);
      expect(versioned.sourceDocumentId).toBe(document.id);
      expect(versioned.version).toBe(2);
    } finally {
      await dbService.onModuleDestroy();

      if (previousEnableDb === undefined) {
        delete process.env.ENABLE_DB_PERSISTENCE;
      } else {
        process.env.ENABLE_DB_PERSISTENCE = previousEnableDb;
      }
    }
  });

  it('persists report and approval writes through the DB path', async () => {
    const previousEnableDb = process.env.ENABLE_DB_PERSISTENCE;
    process.env.ENABLE_DB_PERSISTENCE = 'true';

    const createdAt = '2026-05-25T06:00:00.000Z';
    const hydratedZones = [
      {
        id: 'zone-live-1',
        code: 'WZ',
        name: 'West Zone',
        created_at: createdAt,
        updated_at: createdAt,
      },
    ];
    const hydratedSrenies = [
      {
        id: 'sreny-live-1',
        zone_id: 'zone-live-1',
        name: 'Service Sreny',
        is_service_sreny: true,
        created_at: createdAt,
        updated_at: createdAt,
      },
    ];
    const hydratedContacts = [
      {
        id: 'ct_job_1',
        zone_id: 'zone-live-1',
        first_name: 'Job',
        last_name: 'Applicant',
        phone_primary: '971500006001',
        email_primary: 'job.applicant@adwest.local',
        address: 'Job Address',
        status: 'active',
        created_at: createdAt,
        updated_at: createdAt,
      },
    ];
    const hydratedMemberships = [
      {
        contact_id: 'ct_job_1',
        sreny_id: 'sreny-live-1',
        joined_date: '2026-05-25',
        created_at: createdAt,
      },
    ];
    const hydratedMetadata: Array<any> = [];

    const reportTemplates: Array<any> = [];
    const reportTemplateFields: Array<any> = [];
    const reportSubmissions: Array<any> = [];
    const approvalWorkflows: Array<any> = [];
    const approvalWorkflowSteps: Array<any> = [];
    const approvalItems: Array<any> = [];

    const dataSourceStub = {
      query: async (sql: string, params: unknown[] = []) => {
        if (sql.includes('FROM adwest.zones ORDER BY created_at ASC')) return hydratedZones;
        if (sql.includes('FROM adwest.srenies ORDER BY created_at ASC')) return hydratedSrenies;
        if (sql.includes('FROM adwest.contacts ORDER BY created_at ASC')) return hydratedContacts;
        if (sql.includes('FROM adwest.sreny_memberships ORDER BY created_at ASC')) return hydratedMemberships;
        if (sql.includes('FROM adwest.contact_sreny_metadata ORDER BY created_at ASC')) return hydratedMetadata;
        if (sql.includes('FROM adwest.import_batches ORDER BY created_at ASC')) return [];
        if (sql.includes('FROM adwest.dedup_candidates ORDER BY created_at ASC')) return [];
        if (sql.includes('FROM adwest.programs ORDER BY created_at ASC')) return [];
        if (sql.includes('FROM adwest.program_sessions ORDER BY created_at ASC')) return [];
        if (sql.includes('FROM adwest.registrations ORDER BY created_at ASC')) return [];
        if (sql.includes('FROM adwest.attendance ORDER BY created_at ASC')) return [];
        if (sql.includes('FROM adwest.helpdesk_tickets ORDER BY created_at ASC')) return [];
        if (sql.includes('FROM adwest.ticket_comments ORDER BY created_at ASC')) return [];
        if (sql.includes('FROM adwest.document_folders ORDER BY created_at ASC')) return [];
        if (sql.includes('FROM adwest.documents ORDER BY created_at ASC')) return [];
        if (sql.includes('FROM adwest.report_templates ORDER BY created_at ASC')) return reportTemplates;
        if (sql.includes('FROM adwest.report_template_fields ORDER BY template_id ASC, display_order ASC')) return reportTemplateFields;
        if (sql.includes('FROM adwest.report_submissions ORDER BY created_at ASC')) return reportSubmissions;
        if (sql.includes('FROM adwest.approval_workflows ORDER BY created_at ASC')) return approvalWorkflows;
        if (sql.includes('FROM adwest.approval_workflow_steps ORDER BY workflow_id ASC, step_order ASC')) return approvalWorkflowSteps;
        if (sql.includes('FROM adwest.approval_items ORDER BY created_at ASC')) return approvalItems;

        if (sql.includes('INSERT INTO adwest.report_templates')) {
          const [id, srenyId, name, createdOn, updatedOn] = params as [string, string, string, string, string];
          const row = { id, sreny_id: srenyId, name, created_at: createdOn, updated_at: updatedOn };
          const existing = reportTemplates.find((item) => item.id === id);
          if (existing) Object.assign(existing, row);
          else reportTemplates.push(row);
          return [row];
        }

        if (sql.includes('DELETE FROM adwest.report_template_fields WHERE template_id = $1')) {
          const [templateId] = params as [string];
          for (let index = reportTemplateFields.length - 1; index >= 0; index -= 1) {
            if (reportTemplateFields[index].template_id === templateId) {
              reportTemplateFields.splice(index, 1);
            }
          }
          return [];
        }

        if (sql.includes('INSERT INTO adwest.report_template_fields')) {
          const [id, templateId, key, label, type, required, optionsJson, order, createdOn, updatedOn] = params as [
            string,
            string,
            string,
            string,
            string,
            boolean,
            string,
            number,
            string,
            string,
          ];
          const row = {
            id,
            template_id: templateId,
            field_key: key,
            label,
            field_type: type,
            required,
            options: JSON.parse(optionsJson) as string[],
            display_order: order,
            created_at: createdOn,
            updated_at: updatedOn,
          };
          reportTemplateFields.push(row);
          return [row];
        }

        if (sql.includes('INSERT INTO adwest.report_submissions')) {
          const [id, templateId, submittedBy, answersJson, status, reviewedBy, reviewedAt, reviewNote, createdOn, updatedOn] = params as [
            string,
            string,
            string,
            string,
            string,
            string | null,
            string | null,
            string | null,
            string,
            string,
          ];
          const row = {
            id,
            template_id: templateId,
            submitted_by: submittedBy,
            answers: JSON.parse(answersJson) as Record<string, string>,
            status,
            reviewed_by: reviewedBy,
            reviewed_at: reviewedAt,
            review_note: reviewNote,
            created_at: createdOn,
            updated_at: updatedOn,
          };
          const existing = reportSubmissions.find((item) => item.id === id);
          if (existing) Object.assign(existing, row);
          else reportSubmissions.push(row);
          return [row];
        }

        if (sql.includes('INSERT INTO adwest.approval_workflows')) {
          const [id, name, targetType, mode, escalationHours, active, createdOn, updatedOn] = params as [
            string,
            string,
            string,
            string,
            number | null,
            boolean,
            string,
            string,
          ];
          const row = {
            id,
            name,
            target_type: targetType,
            mode,
            escalation_hours: escalationHours,
            active,
            created_at: createdOn,
            updated_at: updatedOn,
          };
          const existing = approvalWorkflows.find((item) => item.id === id);
          if (existing) Object.assign(existing, row);
          else approvalWorkflows.push(row);
          return [row];
        }

        if (sql.includes('DELETE FROM adwest.approval_workflow_steps WHERE workflow_id = $1')) {
          const [workflowId] = params as [string];
          for (let index = approvalWorkflowSteps.length - 1; index >= 0; index -= 1) {
            if (approvalWorkflowSteps[index].workflow_id === workflowId) {
              approvalWorkflowSteps.splice(index, 1);
            }
          }
          return [];
        }

        if (sql.includes('INSERT INTO adwest.approval_workflow_steps')) {
          const [id, workflowId, stepName, stepOrder, createdOn, updatedOn] = params as [
            string,
            string,
            string,
            number,
            string,
            string,
          ];
          const row = {
            id,
            workflow_id: workflowId,
            step_name: stepName,
            step_order: stepOrder,
            created_at: createdOn,
            updated_at: updatedOn,
          };
          approvalWorkflowSteps.push(row);
          return [row];
        }

        if (sql.includes('INSERT INTO adwest.approval_items')) {
          const [id, workflowId, targetId, summary, status, currentStepIndex, submittedBy, dueAt, escalationCount, lastEscalatedAt, auditTrailJson, reviewedBy, reviewedAt, reviewNote, createdOn, updatedOn] = params as [
            string,
            string,
            string,
            string | null,
            string,
            number,
            string,
            string | null,
            number,
            string | null,
            string,
            string | null,
            string | null,
            string | null,
            string,
            string,
          ];
          const row = {
            id,
            workflow_id: workflowId,
            target_id: targetId,
            summary,
            status,
            current_step_index: currentStepIndex,
            submitted_by: submittedBy,
            due_at: dueAt,
            escalation_count: escalationCount,
            last_escalated_at: lastEscalatedAt,
            audit_trail: JSON.parse(auditTrailJson) as Array<Record<string, unknown>>,
            reviewed_by: reviewedBy,
            reviewed_at: reviewedAt,
            review_note: reviewNote,
            created_at: createdOn,
            updated_at: updatedOn,
          };
          const existing = approvalItems.find((item) => item.id === id);
          if (existing) Object.assign(existing, row);
          else approvalItems.push(row);
          return [row];
        }

        throw new Error(`Unexpected query: ${sql}`);
      },
    } as unknown as DataSource;

    const dbStoreStub: CoreBusinessStore = {
      getMode: () => 'db',
      loadState: async () => null,
      saveState: async () => undefined,
    };

    const dbService = new CoreBusinessService(dbStoreStub, dataSourceStub);

    try {
      await dbService.onModuleInit();

      const template = dbService.createReportTemplate({
        srenyId: 'sreny-live-1',
        name: 'Weekly Report',
        fields: [
          {
            key: 'summary',
            label: 'Summary',
            type: 'text',
            required: true,
          },
        ],
      });

      const submission = dbService.createReportSubmission(
        {
          templateId: template.id,
          answers: { summary: 'Done' },
        },
        {
          userId: 'ct_job_1',
          type: 'member',
          email: 'job.applicant@adwest.local',
          roles: [],
          sessionId: 'sess_job_member_1',
        },
      );

      dbService.reviewReportSubmission(
        submission.id,
        {
          decision: 'approved',
          note: 'Looks good',
        },
        {
          userId: 'admin_operator_13',
          type: 'admin',
          email: 'operator13@adwest.local',
          roles: [],
          sessionId: 'sess_operator_13',
        },
      );

      const workflow = dbService.createApprovalWorkflow({
        name: 'Report Approval',
        targetType: 'report_submission',
        mode: 'single',
        steps: ['Zone Admin'],
        escalationHours: 12,
      });

      const approvalItem = dbService.submitApprovalItem(
        {
          workflowId: workflow.id,
          targetId: submission.id,
          summary: 'Approve submitted report',
        },
        {
          userId: 'admin_operator_13',
          type: 'admin',
          email: 'operator13@adwest.local',
          roles: [],
          sessionId: 'sess_operator_13',
        },
      );

      dbService.reviewApprovalItem(
        approvalItem.id,
        {
          decision: 'approved',
          note: 'Approved',
        },
        {
          userId: 'admin_operator_13',
          type: 'admin',
          email: 'operator13@adwest.local',
          roles: [],
          sessionId: 'sess_operator_13',
        },
      );

      await flushAsyncWrites();

      expect(reportTemplates).toHaveLength(1);
      expect(reportTemplateFields).toHaveLength(1);
      expect(reportSubmissions).toHaveLength(1);
      expect(reportSubmissions[0].status).toBe('approved');
      expect(approvalWorkflows).toHaveLength(1);
      expect(approvalWorkflowSteps).toHaveLength(1);
      expect(approvalItems).toHaveLength(1);
      expect(approvalItems[0].status).toBe('approved');
    } finally {
      await dbService.onModuleDestroy();

      if (previousEnableDb === undefined) {
        delete process.env.ENABLE_DB_PERSISTENCE;
      } else {
        process.env.ENABLE_DB_PERSISTENCE = previousEnableDb;
      }
    }
  });

  it('propagates merged contact references across registrations, attendance, tickets, edit requests, and governance assignments', async () => {
    const zoneId = service.listZones()[0].id;
    const srenyId = service.listSrenies()[0].id;

    const survivor = service.createContact({
      firstName: 'Survivor',
      lastName: 'Contact',
      zoneId,
      srenyIds: [srenyId],
      phone: '971500001000',
      email: 'survivor.contact@adwest.local',
      address: 'Survivor Address',
    });

    const merged = service.createContact({
      firstName: 'Merged',
      lastName: 'Contact',
      zoneId,
      srenyIds: [srenyId],
      phone: '971500001001',
      email: 'merged.contact@adwest.local',
      address: 'Merged Address',
    });

    const program = service.createProgram({
      title: 'Merge Propagation Program',
      description: 'Verifies merge propagation',
      startDate: '2026-10-01',
      endDate: '2026-10-10',
      capacity: 10,
    });
    const session = service.createSession(program.id, {
      name: 'Propagation Session',
      startAt: '2026-10-02T09:00:00.000Z',
      endAt: '2026-10-02T10:00:00.000Z',
    });
    service.createRegistration(program.id, { contactId: merged.id });

    service.recordAttendance(
      session.id,
      {
        contactId: merged.id,
        state: 'present',
      },
      {
        userId: 'admin_operator_9',
        type: 'admin',
        email: 'operator@adwest.local',
        roles: [],
        sessionId: 'sess_operator_9',
      },
    );

    const ticket = service.createTicket(
      {
        subject: 'Propagation check',
        description: 'Track merged contact linkage',
        category: 'General',
        priority: 'low',
      },
      {
        userId: merged.id,
        type: 'member',
        email: merged.email,
        roles: [],
        sessionId: 'sess_merged_contact',
      },
    );

    const editRequest = service.createEditRequest(
      {
        field: 'address',
        currentValue: 'Merged Address',
        requestedValue: 'Updated Merged Address',
      },
      {
        userId: merged.id,
        type: 'member',
        email: merged.email,
        roles: [],
        sessionId: 'sess_merged_contact',
      },
    );

    const structure = service.createGovernanceStructure(srenyId, {
      year: 2027,
      positions: ['President'],
    });
    const assignment = service.createGovernanceAssignment(structure.id, {
      contactId: merged.id,
      positionName: 'President',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
    });

    await (service as unknown as {
      propagateMergeAcrossRelations: (survivorId: string, mergedId: string) => void;
    }).propagateMergeAcrossRelations(survivor.id, merged.id);

    const survivorAfter = service.getContact(survivor.id);
    const programAfter = service.getProgram(program.id);
    const attendanceAfter = service.getSessionAttendance(session.id).find((row) => row.contactId === survivor.id);
    const ticketAfter = service.getTicket(ticket.id);
    const requestAfter = service.listEditRequests().find((row) => row.id === editRequest.id);
    const assignmentsAfter = service.listGovernanceAssignments(structure.id);

    expect(survivorAfter.srenyIds).toContain(srenyId);
    expect(programAfter.registrations.some((row) => row.contactId === survivor.id)).toBe(true);
    expect(attendanceAfter?.contactId).toBe(survivor.id);
    expect(ticketAfter.contactId).toBe(survivor.id);
    expect(requestAfter?.contactId).toBe(survivor.id);
    expect(assignmentsAfter.some((row) => row.id === assignment.id && row.contactId === survivor.id)).toBe(true);
    expect(service.getContact(merged.id).status).toBe('deleted');
  });

  async function flushAsyncWrites(): Promise<void> {
    await new Promise((resolve) => setImmediate(resolve));
    await new Promise((resolve) => setImmediate(resolve));
  }
});


