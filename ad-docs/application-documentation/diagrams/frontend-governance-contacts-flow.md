# Frontend Governance and Contacts Flow

```mermaid
flowchart TD
  A[AdminDashboardPage] --> B{General Services}
  B --> C[governance-contacts]
  B --> J[join-us-review]
  B --> D[sreni-contacts slug]
  B --> E[settings locations]
  B --> F[settings enum values]

  C --> C1[GlobalContactsPage]
  J --> J1[JoinUsReviewPage]
  D --> D1[SreniContactListPage]
  E --> E1[LocationDefinitionPage]
  F --> F1[EnumValuesPage]

  C1 -->|preview + commit upload| API1["/org/contacts/upload/*"]
  C1 -->|sreni tags| API2["/org/contacts/:id/sreni-tags"]
  C1 -->|edit / active| API3["/org/contacts/:id"]

  J1 -->|list pending| API4["/org/join-us-submissions"]
  J1 -->|complete review| API5["/org/join-us-submissions/:id/complete-review"]

  D1 -->|sreni upload preview| API6["/org/sreni-definitions/:sreniId/contacts/upload/preview"]
  D1 -->|division / sthan| API7["/org/.../contacts/:id/division|sthan"]
  D1 -->|family members| API8["/org/.../contacts/:id/members"]
  D1 -->|gada assign| API9["/org/.../contacts/:id/gada"]
  D1 -->|seva activity SS only| API10["/org/.../seva-contributions"]

  E1 -->|role levels| API11["/settings/enum-values?enumType=role_level"]
  E1 -->|locations CRUD| API12["/org/locations"]

  subgraph UploadUI [Upload components]
    U1[ContactUploadModal]
    U2[ContactUploadReviewModal]
  end

  C1 --> U1
  D1 --> U1
  U1 --> U2
  U2 --> API1
```

## Page notes

- **GlobalContactsPage** — scope-filtered global list; primary upload entry for governance operators.
- **SreniContactListPage** — always scoped to URL Sreni; Seva Samithi shows Member Srenis column and Seva activity action.
- **JoinUsReviewPage** — menu grant `governance-join-us-review`; not part of per-Sreni contact list.
- **Contact access** — API enforces permission set + role level; UI assumes actor has matching `users` row.
