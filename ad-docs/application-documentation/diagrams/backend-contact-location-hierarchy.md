# Backend Contact, Scope, and Location Hierarchy

```mermaid
flowchart LR
  subgraph Web[Admin Web]
    UI1[Location Definition]
    UI2[Users + Permission Sets]
    UI3[Global Contacts]
    UI4[Sreni Contact List]
    UI5[Join Us Review]
  end

  subgraph API[Core Business API]
    C1[CoreBusinessController]
    CAS[ContactAccessScopeService]
    S1[SreniAdminRuntimeService]
    UP[MemberContactUploadService]
    SS[SevaSamithiContactService]
    SC[SevaSamithiContributionService]
    GA[GadaAssignmentService]
    JU[JoinUsReviewService]
    O1[OrgRuntimeService]
  end

  subgraph DB[PostgreSQL]
    T1[(locations)]
    T2[(users / permission_sets)]
    T3[(sreni_contacts)]
    T4[(contact_sreni_tags)]
    T5[(seva_samithi_contacts)]
    T6[(seva_samithi_contributions)]
    T7[(contact_gada_assignments)]
  end

  UI1 --> C1
  UI2 --> C1
  UI3 --> C1
  UI4 --> C1
  UI5 --> C1

  C1 --> CAS
  CAS --> T2
  C1 --> S1
  C1 --> UP
  C1 --> SS
  C1 --> SC
  C1 --> GA
  C1 --> JU
  C1 --> O1

  UP --> T3
  UP --> T4
  UP --> T5
  S1 --> T3
  S1 --> T4
  S1 --> T5
  SS --> T5
  SC --> T6
  GA --> T7
  JU --> T3
  O1 --> T1

  T1 -. parent_id hierarchy .-> T3
  T2 -. allowed sreni_ids .-> CAS
  T4 -. membership tags .-> S1
```

## Scope resolution

1. `CoreAdminAuthGuard` validates JWT.
2. `ContactAccessScopeService.resolveScope(actor)` loads `users` + permission set + role level.
3. List queries append SQL filters (`appendAllowedSreniSql`, `appendStahanSql`).
4. Per-contact mutations call `assertContactAccess(contactId, contextSreniId)`.
5. Seva Samithi context additionally requires `seva_samithi_contacts` registry row.

## Upload commit path

```
Excel file
  → MemberContactUploadService.preview
  → row decisions (insert | update | skip)
  → MemberContactUploadService.commit
  → sreni_contacts + contact_sreni_tags + household_members
  → SevaSamithiContactService.upsertRegistryEntry (household)
```

## File storage (not in DB)

- Seva documents: `{UPLOAD_DIR}/seva-contributions/{contactId}/{contributionId}/`
- Sreni documents: `{UPLOAD_DIR}/documents/{sreniId}/`
- Job resumes: gateway upload path per public-gateway module
