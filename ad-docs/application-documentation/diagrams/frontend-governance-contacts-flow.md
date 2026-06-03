# Frontend Governance Contacts Flow

```mermaid
flowchart TD
  A[AdminDashboardPage] --> B{General Services menu}
  B --> C[governance-contacts tab]
  B --> D[sreni-contacts-{id} tab]
  B --> E[settings-location-definition]
  B --> F[settings-enum-values]

  C --> C1[GlobalContactsPage]
  D --> D1[SreniContactListPage]
  E --> E1[LocationDefinitionPage]
  F --> F1[EnumValuesPage]

  C1 -->|upload excel| API1[/org/contacts/upload/]
  C1 -->|set tags| API2[/org/contacts/:id/sreni-tags/]
  C1 -->|toggle active/delete| API3[/org/sreni-definitions/:sreniId/contacts/:contactId/active + delete/]

  D1 -->|assign division| API4[/org/sreni-definitions/:sreniId/contacts/:contactId/division/]
  D1 -->|assign sthan| API5[/org/sreni-definitions/:sreniId/contacts/:contactId/sthan/]

  E1 -->|load role levels| API6[/settings/enum-values?enumType=role_level/]
  E1 -->|create/update location parentId| API7[/org/locations/]

  F1 -->|configure parentValue| API8[/settings/enum-values/]
```
