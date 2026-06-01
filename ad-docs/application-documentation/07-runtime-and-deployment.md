# 07 - Runtime and Deployment Notes

## Default Local Runtime

- Web app: `http://localhost:3000`
- API: `http://localhost:3001`

## Frontend Runtime Wiring

- API base defaults to `/api/v1`
- Vite dev proxy target is controlled by `VITE_API_PROXY_TARGET` (default `http://localhost:3001`)

## Backend Runtime Wiring

- Global API prefix: `/api/v1`
- Swagger endpoint: `/api/docs` (env-driven enablement)
- CORS policy: allow-list resolved from `CORS_ORIGIN`
- Optional proxy trust via `TRUST_PROXY=true`

## Persistence and Environment Modes

- `ENABLE_DB_PERSISTENCE=true`: PostgreSQL-backed runtime stores and TypeORM registration
- `ENABLE_DB_PERSISTENCE=false`: in-memory store behavior for supported modules
- Production guard: app startup fails if DB persistence is disabled

## Security Runtime Defaults

- Strict validation pipeline enabled globally
- Global throttling enabled
- Request payload limits set to 1 MB
- Common security headers applied by middleware

## Operational Checklist

1. Apply migration scripts in order from `ad-docs/database-script`.
2. Start API and verify `/api/v1` routes plus `/api/docs` when enabled.
3. Start web app and verify public/admin/member route behavior.
4. Verify login, session restoration, and role-based navigation.
5. Verify gateway and member-services operational endpoints.
6. Verify integration settings (Google and SMTP/IMAP) as applicable.
