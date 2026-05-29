# Module 01 Acceptance Baseline: Organizational Structure

## In-Scope Capabilities
- Zone metadata management.
- Sreny management under Zone.
- Governing body structure and yearly assignment cycle.
- Sthan creation and Zone association without sub-Sreny independence.

## Acceptance Criteria
- Zone create and edit includes name, logo, and address fields.
- Sreny records can be created and linked to Zone.
- Exactly one Service Sreny can be designated per Zone at a time.
- Governing positions are configurable and assignable to contacts by year.
- Prior-year governing structure can be archived and referenced.
- Sthan can be created and linked to Zone only.
- Sthan responses expose a clear pending-state indicator for deferred independence capability.

## Exclusions to Enforce
- Full independent Sthan governance model.

## Test Evidence Checklist
- [ ] Functional walkthrough evidence.
- [ ] Data integrity checks for relationships.
- [ ] Role permission checks for admin actions.
- [ ] Signoff from Product Owner and Tech Lead.

## Sprint 1-2 Evidence Capture
- Governance lifecycle APIs implemented:
	- GET/POST/PATCH `/api/v1/org/srenies/:srenyId/governance-structures`
	- GET/POST/PATCH `/api/v1/org/governance-structures/:structureId/assignments`
- Governance assignment validation implemented:
	- Assignee must belong to target Sreny.
	- Assignment date window validation (`startDate` and optional `endDate`).
- Service Sreny control implemented:
	- Only one Service Sreny can be designated per Zone at a time.
- Sthan pending-state indicator implemented in API response:
	- `phaseStatus`, `fullIndependenceAvailable`, `pendingFeatureMessage`.

## Endpoint-Level Test Evidence (2026-05-24)

### Authentication for Admin-Secured Organizational Endpoints

Request: `GET /api/v1/auth/captcha`

Response sample:
```json
{
	"captchaToken": "<token-redacted>",
	"challenge": "7 + 5",
	"expiresInSeconds": 180
}
```

Request: `POST /api/v1/auth/login`
```json
{
	"identifier": "super.admin@adwest.local",
	"password": "SuperAdmin@123",
	"captchaToken": "<captcha-token>",
	"captchaAnswer": "12"
}
```

Response sample:
```json
{
	"accessToken": "<jwt-redacted>"
}
```

### Governance Structure Lifecycle Evidence

Request: `POST /api/v1/org/srenies/sreny_sozhhjm7/governance-structures`
```json
{
	"year": 2027,
	"positions": ["President", "Secretary", "Treasurer"]
}
```

Response sample:
```json
{
	"id": "govs_o0kd6pz4",
	"srenyId": "sreny_sozhhjm7",
	"year": 2027,
	"positions": ["President", "Secretary", "Treasurer"],
	"archived": false,
	"createdAt": "2026-05-24T11:18:33.509Z",
	"updatedAt": "2026-05-24T11:18:33.509Z"
}
```

Request: `PATCH /api/v1/org/srenies/sreny_sozhhjm7/governance-structures/govs_o0kd6pz4`
```json
{
	"archived": true
}
```

Response sample:
```json
{
	"id": "govs_o0kd6pz4",
	"srenyId": "sreny_sozhhjm7",
	"year": 2027,
	"positions": ["President", "Secretary", "Treasurer"],
	"archived": true,
	"createdAt": "2026-05-24T11:18:33.509Z",
	"updatedAt": "2026-05-24T11:18:33.516Z"
}
```

### Governance Assignment Lifecycle Evidence

Request: `POST /api/v1/org/governance-structures/govs_o0kd6pz4/assignments`
```json
{
	"contactId": "ct_74ovusua",
	"positionName": "Secretary",
	"startDate": "2027-01-01",
	"endDate": "2027-12-31"
}
```

Response sample:
```json
{
	"id": "gova_ru6t1lk8",
	"structureId": "govs_o0kd6pz4",
	"contactId": "ct_74ovusua",
	"positionName": "Secretary",
	"startDate": "2027-01-01",
	"endDate": "2027-12-31",
	"archived": false,
	"createdAt": "2026-05-24T11:18:33.512Z",
	"updatedAt": "2026-05-24T11:18:33.512Z"
}
```
