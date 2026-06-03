import { AdminUser, AuditLog, Contact, EditRequest, HelpdeskTicket } from '../types';

// Helper to load/save data from LocalStorage
const loadFromStorage = <T>(key: string, defaultValue: T): T => {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : defaultValue;
  } catch (e) {
    console.error(`Failed to load key "${key}" from localStorage`, e);
    return defaultValue;
  }
};

const saveToStorage = <T>(key: string, data: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error(`Failed to save key "${key}" to localStorage`, e);
  }
};

// Initial Data Generators
const getInitialAdmins = (): AdminUser[] => [
  {
    id: 'admin_super',
    name: 'Hari Krishnan (Super Admin)',
    email: 'superadmin@adwest.org',
    passwordHash: '8e811c75c5e8c171:5e7d5830b53d8a7c645bc2fa5bbd323b63297a7cc262db80eb9d0e2e9c20a95f5669b32943343a6d96924dcf58925576a8b75e7a909bb6b5c3cb84074211a7c7', // password123
    roles: [
      { id: 'role_1', adminUserId: 'admin_super', role: 'Super Admin', scopeType: 'global', scopeId: 'global' }
    ],
    createdAt: new Date(2026, 1, 1).toISOString()
  },
  {
    id: 'admin_zone',
    name: 'Mohan Krishnan (Zone Admin)',
    email: 'zoneadmin@adwest.org',
    passwordHash: '8e811c75c5e8c171:5e7d5830b53d8a7c645bc2fa5bbd323b63297a7cc262db80eb9d0e2e9c20a95f5669b32943343a6d96924dcf58925576a8b75e7a909bb6b5c3cb84074211a7c7', // password123
    roles: [
      { id: 'role_2', adminUserId: 'admin_zone', role: 'Zone Admin', scopeType: 'zone', scopeId: 'zone_west_coast' }
    ],
    createdAt: new Date(2026, 2, 10).toISOString()
  },
  {
    id: 'admin_sreny',
    name: 'Athul Krishnan (Sreny Admin)',
    email: 'srenyadmin@adwest.org',
    passwordHash: '8e811c75c5e8c171:5e7d5830b53d8a7c645bc2fa5bbd323b63297a7cc262db80eb9d0e2e9c20a95f5669b32943343a6d96924dcf58925576a8b75e7a909bb6b5c3cb84074211a7c7', // password123
    roles: [
      { id: 'role_3', adminUserId: 'admin_sreny', role: 'Sreny Admin', scopeType: 'sreny', scopeId: 'sreny_demo_one' }
    ],
    createdAt: new Date(2026, 3, 5).toISOString()
  }
];

const getInitialContacts = (): Contact[] => [
  {
    id: 'contact_1',
    zoneId: 'zone_west_coast',
    firstName: 'Rahul',
    lastName: 'Madhav',
    phonePrimary: '+971501234567',
    phoneSecondary: '+971507654321',
    emailPrimary: 'rahul.Madhav@email.com',
    dob: '1990-05-15',
    gender: 'male',
    address: 'Marina Heights, Dubai, UAE',
    status: 'active',
    memberships: [
      { srenyId: 'sreny_demo_one', srenyName: 'Demo Sreny One', joinedDate: '2025-01-10', status: 'active' }
    ]
  },
  {
    id: 'contact_2',
    zoneId: 'zone_west_coast',
    firstName: 'Deepa',
    lastName: 'Nair',
    phonePrimary: '+14159876543',
    emailPrimary: 'deepa.nair@email.com',
    dob: '1993-11-22',
    gender: 'female',
    address: '123 Market St, San Francisco, CA',
    status: 'active',
    memberships: [
      { srenyId: 'sreny_demo_one', srenyName: 'Demo Sreny One', joinedDate: '2025-02-14', status: 'active' },
      { srenyId: 'sreny_demo_two', srenyName: 'Demo Sreny Two', joinedDate: '2025-06-01', status: 'active' }
    ]
  },
  {
    id: 'contact_3',
    zoneId: 'zone_east_coast',
    firstName: 'Ahmed',
    lastName: 'Al Mansoori',
    phonePrimary: '+971529998877',
    emailPrimary: 'ahmed.m@email.ae',
    dob: '1985-08-01',
    gender: 'male',
    address: 'Corniche Rd, Abu Dhabi, UAE',
    status: 'active',
    memberships: [
      { srenyId: 'sreny_demo_three', srenyName: 'Demo Sreny Three', joinedDate: '2024-09-01', status: 'active' }
    ]
  }
];

const getInitialEditRequests = (): EditRequest[] => [
  {
    id: 'req_1',
    contactId: 'contact_1',
    contactName: 'Rahul Madhav',
    requestedFields: {
      phonePrimary: '+971509998888',
      address: 'Jumeirah Living, Dubai, UAE'
    },
    status: 'pending',
    createdAt: new Date().toISOString()
  }
];

const getInitialAuditLogs = (): AuditLog[] => [
  {
    id: 'log_1',
    actorId: 'system',
    actorName: 'System Initialize',
    action: 'SYSTEM_STARTUP',
    entityType: 'system',
    entityId: 'system',
    oldVal: null,
    newVal: { message: 'AD West system database initialized' },
    timestamp: new Date(2026, 5, 23, 10, 0, 0).toISOString()
  },
  {
    id: 'log_2',
    actorId: 'admin_super',
    actorName: 'Hari Krishnan',
    action: 'ROLE_ASSIGNMENT',
    entityType: 'AdminUser',
    entityId: 'admin_zone',
    oldVal: null,
    newVal: { role: 'Zone Admin', scopeId: 'zone_west_coast' },
    timestamp: new Date(2026, 5, 23, 11, 30, 0).toISOString()
  }
];

const getInitialTickets = (): HelpdeskTicket[] => [
  {
    id: 'ticket_1',
    contactId: 'contact_1',
    contactName: 'Rahul Madhav',
    zoneId: 'zone_west_coast',
    category: 'Membership',
    subject: 'Request to Link secondary Sreny',
    description: 'Hello, I also attend events at the Oakland Sreny. Can you link me to Oakland as well? Thank you.',
    priority: 'medium',
    status: 'new',
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    commentsCount: 0
  },
  {
    id: 'ticket_2',
    contactId: 'contact_2',
    contactName: 'Deepa Nair',
    zoneId: 'zone_west_coast',
    category: 'Profile Edit',
    subject: 'Incorrect date of birth shown',
    description: 'My profile shows 1993-11-22 but it should be 1993-11-24. Please fix.',
    priority: 'low',
    status: 'in_progress',
    assignedTo: 'admin_sreny',
    assignedToName: 'Athul Krishnan',
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    commentsCount: 1
  }
];

export const mockDatabase = {
  // ADM_USERS
  getAdmins(): AdminUser[] {
    return loadFromStorage<AdminUser[]>('adwest_admins', getInitialAdmins());
  },
  
  saveAdmins(admins: AdminUser[]): void {
    saveToStorage('adwest_admins', admins);
  },
  
  saveAdmin(admin: AdminUser): void {
    const admins = this.getAdmins();
    const index = admins.findIndex(a => a.id === admin.id);
    if (index >= 0) {
      admins[index] = admin;
    } else {
      admins.push(admin);
    }
    this.saveAdmins(admins);
  },

  deleteAdmin(id: string): void {
    const admins = this.getAdmins();
    const updated = admins.filter(a => a.id !== id);
    this.saveAdmins(updated);
  },

  // CONTACTS
  getContacts(): Contact[] {
    return loadFromStorage<Contact[]>('adwest_contacts', getInitialContacts());
  },
  
  saveContacts(contacts: Contact[]): void {
    saveToStorage('adwest_contacts', contacts);
  },

  saveContact(contact: Contact): void {
    const contacts = this.getContacts();
    const index = contacts.findIndex(c => c.id === contact.id);
    if (index >= 0) {
      contacts[index] = contact;
    } else {
      contacts.push(contact);
    }
    this.saveContacts(contacts);
  },

  // EDIT REQUESTS
  getEditRequests(): EditRequest[] {
    return loadFromStorage<EditRequest[]>('adwest_edit_requests', getInitialEditRequests());
  },

  saveEditRequests(requests: EditRequest[]): void {
    saveToStorage('adwest_edit_requests', requests);
  },

  createEditRequest(req: Omit<EditRequest, 'id' | 'status' | 'createdAt'>): EditRequest {
    const requests = this.getEditRequests();
    const newReq: EditRequest = {
      ...req,
      id: `req_${Math.random().toString(36).substr(2, 9)}`,
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    requests.push(newReq);
    this.saveEditRequests(requests);
    return newReq;
  },

  approveEditRequest(reqId: string, reviewerId: string, reviewerName: string): boolean {
    const requests = this.getEditRequests();
    const reqIndex = requests.findIndex(r => r.id === reqId);
    if (reqIndex === -1) return false;

    const request = requests[reqIndex];
    if (request.status !== 'pending') return false;

    // Fetch contact
    const contacts = this.getContacts();
    const contactIndex = contacts.findIndex(c => c.id === request.contactId);
    if (contactIndex === -1) return false;

    const contact = contacts[contactIndex];
    const oldVal = { ...contact };

    // Apply edits
    const updatedContact = {
      ...contact,
      ...request.requestedFields
    };
    contacts[contactIndex] = updatedContact;
    this.saveContacts(contacts);

    // Update edit request
    request.status = 'approved';
    request.reviewedBy = reviewerId;
    request.reviewedByName = reviewerName;
    request.reviewedAt = new Date().toISOString();
    this.saveEditRequests(requests);

    // Add Audit Log
    this.addAuditLog({
      actorId: reviewerId,
      actorName: reviewerName,
      action: 'APPROVE_EDIT_REQUEST',
      entityType: 'Contact',
      entityId: contact.id,
      oldVal,
      newVal: updatedContact
    });

    return true;
  },

  rejectEditRequest(reqId: string, reviewerId: string, reviewerName: string): boolean {
    const requests = this.getEditRequests();
    const reqIndex = requests.findIndex(r => r.id === reqId);
    if (reqIndex === -1) return false;

    const request = requests[reqIndex];
    if (request.status !== 'pending') return false;

    // Update edit request
    request.status = 'rejected';
    request.reviewedBy = reviewerId;
    request.reviewedByName = reviewerName;
    request.reviewedAt = new Date().toISOString();
    this.saveEditRequests(requests);

    // Add Audit Log
    this.addAuditLog({
      actorId: reviewerId,
      actorName: reviewerName,
      action: 'REJECT_EDIT_REQUEST',
      entityType: 'EditRequest',
      entityId: request.id,
      oldVal: { status: 'pending' },
      newVal: { status: 'rejected' }
    });

    return true;
  },

  // AUDIT LOGS
  getAuditLogs(): AuditLog[] {
    return loadFromStorage<AuditLog[]>('adwest_audit_logs', getInitialAuditLogs());
  },

  addAuditLog(log: Omit<AuditLog, 'id' | 'timestamp'>): void {
    const logs = this.getAuditLogs();
    const newLog: AuditLog = {
      ...log,
      id: `log_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString()
    };
    logs.unshift(newLog); // Prepend new logs to show latest first
    saveToStorage('adwest_audit_logs', logs);
  },

  // HELPDESK TICKETS
  getTickets(): HelpdeskTicket[] {
    return loadFromStorage<HelpdeskTicket[]>('adwest_tickets', getInitialTickets());
  },

  saveTickets(tickets: HelpdeskTicket[]): void {
    saveToStorage('adwest_tickets', tickets);
  },

  createTicket(ticket: Omit<HelpdeskTicket, 'id' | 'status' | 'createdAt' | 'commentsCount'>): HelpdeskTicket {
    const tickets = this.getTickets();
    const newTicket: HelpdeskTicket = {
      ...ticket,
      id: `ticket_${Math.random().toString(36).substr(2, 9)}`,
      status: 'new',
      createdAt: new Date().toISOString(),
      commentsCount: 0
    };
    tickets.push(newTicket);
    this.saveTickets(tickets);
    return newTicket;
  },

  // PROGRAMS (METRICS ONLY)
  getPrograms() {
    return [
      { id: 'prog_1', name: 'Annual Youth Summit 2026', date: '2026-06-15', sreny: 'Demo Sreny One' },
      { id: 'prog_2', name: 'Charity Food Drive', date: '2026-06-22', sreny: 'Demo Sreny Two' },
      { id: 'prog_3', name: 'Community Health Awareness Seminars', date: '2026-07-02', sreny: 'Demo Sreny Three' }
    ];
  }
};
