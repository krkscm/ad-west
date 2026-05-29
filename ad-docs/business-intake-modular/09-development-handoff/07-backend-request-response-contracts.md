# Backend Request and Response Contracts (Core Business)

## Purpose
Define minimum payload contracts needed for backend implementation and frontend integration.

## Envelope Conventions
- Success response: resource JSON or `{ "success": true }`
- Validation failure: `{ "statusCode": 400, "message": ["..."], "error": "Bad Request" }`
- Auth failure: `{ "statusCode": 401, "message": "Unauthorized" }`

## M-02 Contact Contract
### Create Contact Request
```json
{
  "firstName": "Anita",
  "lastName": "Patel",
  "email": "anita@example.org",
  "phone": "+14155550123",
  "zoneId": "zone_west",
  "srenyIds": ["sreny_silicon_valley"],
  "address": "123 Main St"
}
```

### Contact Response
```json
{
  "id": "ct_01J...",
  "firstName": "Anita",
  "lastName": "Patel",
  "email": "anita@example.org",
  "phone": "+14155550123",
  "zoneId": "zone_west",
  "srenyIds": ["sreny_silicon_valley"],
  "status": "active",
  "createdAt": "2026-05-24T18:00:00.000Z",
  "updatedAt": "2026-05-24T18:00:00.000Z"
}
```

## M-03 Import Contract
### Start Import Request
```json
{
  "fileName": "contacts-may.csv",
  "fileType": "csv",
  "mappingProfileId": "map_default_contact",
  "hasHeader": true
}
```

### Start Import Response
```json
{
  "id": "imp_01J...",
  "status": "ready_for_review",
  "acceptedRows": 12,
  "duplicateRows": 1,
  "processedRows": 13,
  "validationErrorRows": 1,
  "createdAt": "2026-05-24T18:05:00.000Z"
}
```

### Import Reconciliation Response
```json
{
  "importId": "imp_01J...",
  "status": "ready_for_review",
  "totalDuplicates": 1,
  "pendingDuplicates": 1,
  "mergedDuplicates": 0,
  "skippedDuplicates": 0,
  "canFinalize": false,
  "issues": ["Duplicate review is incomplete"]
}
```

### Mark Import Failed Request
```json
{
  "reason": "Column mapping mismatch"
}
```

### Mark Import Failed Response
```json
{
  "id": "imp_01J...",
  "status": "failed",
  "failedReason": "Column mapping mismatch"
}
```

## M-04 Program Contract
### Create Program Request
```json
{
  "title": "Youth Leadership Camp",
  "description": "Summer cohort",
  "startDate": "2026-06-01",
  "endDate": "2026-06-03",
  "capacity": 200
}
```

### Program Response
```json
{
  "id": "prg_01J...",
  "title": "Youth Leadership Camp",
  "status": "draft",
  "startDate": "2026-06-01",
  "endDate": "2026-06-03",
  "capacity": 200,
  "createdAt": "2026-05-24T18:10:00.000Z",
  "updatedAt": "2026-05-24T18:10:00.000Z"
}
```

## M-05 Attendance Contract
### Record Attendance Request
```json
{
  "contactId": "ct_01J...",
  "state": "present",
  "notes": "On time"
}
```

### Attendance Response
```json
{
  "sessionId": "ses_01J...",
  "contactId": "ct_01J...",
  "state": "present",
  "recordedAt": "2026-05-24T18:20:00.000Z",
  "recordedBy": "admin_01J..."
}
```

## M-06 Helpdesk Contract
### Create Ticket Request
```json
{
  "subject": "Need profile update",
  "description": "My phone number changed.",
  "category": "Profile Edit",
  "priority": "medium"
}
```

### Ticket Response
```json
{
  "id": "tkt_01J...",
  "contactId": "ct_01J...",
  "status": "new",
  "priority": "medium",
  "subject": "Need profile update",
  "createdAt": "2026-05-24T18:25:00.000Z"
}
```

### Ticket Activity Response
```json
[
  {
    "id": "tka_01J...",
    "ticketId": "tkt_01J...",
    "action": "status_updated",
    "actorId": "admin_01J...",
    "details": {
      "status": "in_progress"
    },
    "createdAt": "2026-05-24T18:31:00.000Z"
  }
]
```

## Core Persistence Readiness Contract
### Persistence Readiness Response
```json
{
  "coreBusinessStore": "db",
  "authStoreMode": "db",
  "isProductionRuntime": false,
  "readyForUat": true,
  "blockers": [],
  "nextSteps": [
    "Persistence blockers are cleared for current runtime configuration"
  ],
}
```

## Authentication Contract
### Captcha Challenge Response
```json
{
  "captchaToken": "<signed-token>",
  "challenge": "8 + 6",
  "expiresInSeconds": 180
}
```

### Login Request
```json
{
  "identifier": "member@example.org",
  "password": "<secret>",
  "captchaToken": "<signed-token>",
  "captchaAnswer": "14"
}
```

### Login Response
```json
{
  "accessToken": "<jwt>"
}
```

## Contract Governance
- DTO classes in backend must mirror this baseline.
- Any field deletion is a breaking change and requires version bump.
- New optional fields are allowed with change-log entry.

