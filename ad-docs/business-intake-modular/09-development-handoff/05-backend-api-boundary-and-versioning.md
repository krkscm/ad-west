# Backend API Boundary and Versioning Baseline

## Purpose
Define the backend HTTP boundary, versioning model, and naming conventions required before implementation.

## API Base Path
- Canonical base path: `/api/v1`
- Local development URL: `http://localhost:3001/api/v1`
- All feature endpoints must be mounted under this base path.

## Versioning Rule
- Use URI versioning (`/api/v1`) for all public endpoints.
- Breaking changes require a new major API version (`/api/v2`).
- Non-breaking additions are allowed in the same version.

## Resource Naming Rule
- Use plural nouns for resource collections.
- Use kebab-case path segments.
- Use path IDs for target resource selection.
- Use action suffix only when CRUD is not sufficient.

## Security Boundary
- Admin-only resources require bearer token and role checks.
- Member self-service resources require member token checks.
- PII fields in responses must be minimal and purpose-bound.
- Audit events are required for sensitive writes.

## Error Contract Baseline
- 400: Validation error
- 401: Authentication required or invalid token
- 403: Role or scope mismatch
- 404: Resource not found
- 409: Conflict (duplicate, stale state)
- 422: Business rule violation
- 500: Internal error

## Delivery Guardrail
No backend implementation starts for a module unless endpoint path, request payload, response payload, and authorization rule are documented.

## Change Log
| Version | Date | Updated By | Summary |
|---|---|---|---|
| 1.0.0 | 2026-05-24 | Tech Lead | Initial API boundary and versioning baseline |
