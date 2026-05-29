# Use Case Diagram

## Scope
Actor-to-capability mapping for the Core Business functional scope.

```mermaid
flowchart LR
  Member[Member User]
  Admin[Admin User]
  Super[Super Admin]
  Zone[Zone Admin]
  Sreny[Sreny Admin]

  UC1[Credential + Captcha Login]
  UC2[View Profile and Membership]
  UC3[Raise and Track Helpdesk Ticket]
  UC4[View Program and Attendance History]
  UC5[Request Contact Edit]

  UC6[Manage Zone and Sreny]
  UC7[Manage Contacts and Memberships]
  UC8[Import and Deduplicate Contacts]
  UC9[Manage Programs and Sessions]
  UC10[Manage Attendance and Reports]
  UC11[Manage Helpdesk Lifecycle]
  UC12[Review Audit Logs]
  UC13[Manage RBAC and Admin Users]

  Member --> UC1
  Member --> UC2
  Member --> UC3
  Member --> UC4
  Member --> UC5

  Admin --> UC6
  Admin --> UC7
  Admin --> UC8
  Admin --> UC9
  Admin --> UC10
  Admin --> UC11

  Super --> UC12
  Zone --> UC12
  Super --> UC13
  Zone --> UC13
  Sreny --> UC9
  Sreny --> UC10

  classDef actor fill:#fff3cd,stroke:#b8860b,color:#111;
  classDef uc fill:#e8f4fd,stroke:#1f77b4,color:#111;
  class Member,Admin,Super,Zone,Sreny actor;
  class UC1,UC2,UC3,UC4,UC5,UC6,UC7,UC8,UC9,UC10,UC11,UC12,UC13 uc;
```

## Verification Checklist
- [ ] All Core Business modules are represented by at least one use case.
- [ ] Member and admin actor boundaries are clear.
- [ ] RBAC-sensitive admin capabilities are separated.
