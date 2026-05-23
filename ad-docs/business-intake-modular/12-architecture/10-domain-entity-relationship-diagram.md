# Domain Entity Relationship Diagram

## Scope
MVP core domain entities and their primary relationships.

```mermaid
erDiagram
  ZONE ||--o{ SRENY : contains
  ZONE ||--o{ CONTACT : owns
  SRENY ||--o{ SRENYMEMBERSHIP : maps
  CONTACT ||--o{ SRENYMEMBERSHIP : belongs_to

  SRENY ||--o{ PROGRAM : hosts
  PROGRAM ||--o{ PROGRAMSESSION : has
  CONTACT ||--o{ REGISTRATION : registers
  PROGRAM ||--o{ REGISTRATION : receives
  PROGRAMSESSION ||--o{ ATTENDANCE : records
  CONTACT ||--o{ ATTENDANCE : has

  CONTACT ||--o{ HELPDESKTICKET : raises
  HELPDESKTICKET ||--o{ TICKETCOMMENT : includes

  CONTACT ||--o{ EDITREQUEST : requests

  ADMINUSER ||--o{ ROLEASSIGNMENT : has
  ADMINUSER ||--o{ AUDITLOG : performs

  IMPORTBATCH ||--o{ DEDUPCANDIDATE : contains
  CONTACT ||--o{ DEDUPCANDIDATE : matched_with
```

## Verification Checklist
- [ ] Entity list aligns with MVP data model baseline.
- [ ] Relationship cardinality matches expected behavior.
- [ ] Sensitive entities are included in audit and access reviews.
