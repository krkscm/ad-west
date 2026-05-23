# RBAC and Access Boundary Diagram

## Scope
Role-to-capability boundary for Super Admin, Zone Admin, and Sreny Admin.

```mermaid
flowchart TB
  SA[Super Admin]
  ZA[Zone Admin]
  SRA[Sreny Admin]

  subgraph CAP[Capabilities]
    C1[Manage Zone and Sreny]
    C2[Manage Contacts and Dedup]
    C3[Manage Programs and Attendance]
    C4[Manage Helpdesk]
    C5[View Audit Logs]
    C6[Manage RBAC Assignments]
  end

  SA --> C1
  SA --> C2
  SA --> C3
  SA --> C4
  SA --> C5
  SA --> C6

  ZA --> C1
  ZA --> C2
  ZA --> C3
  ZA --> C4
  ZA --> C5

  SRA --> C3
  SRA --> C4

  classDef role fill:#fff3cd,stroke:#b8860b,color:#111;
  classDef cap fill:#e8f4fd,stroke:#1f77b4,color:#111;
  class SA,ZA,SRA role;
  class C1,C2,C3,C4,C5,C6 cap;
```

## Verification Checklist
- [ ] Only three MVP roles are represented.
- [ ] Audit log access limited to Zone Admin and Super Admin.
- [ ] Assignment boundaries match admin scope constraints.
