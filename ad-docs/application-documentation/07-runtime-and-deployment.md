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

## Environment variables (common)

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string |
| `ENABLE_DB_PERSISTENCE` | Must be `true` in production |
| `CORS_ORIGIN` | Allowed browser origins |
| `UPLOAD_DIR` | File upload root (documents, seva attachments, resumes) |
| `VITE_API_PROXY_TARGET` | Web dev proxy target (default `http://127.0.0.1:3001`) |
| `CONTACT_UPLOAD_TIMEOUT_MS` | Extended timeout for large Excel uploads (API + proxy) |

## Operational checklist

1. Apply migration scripts in order from `ad-docs/database-script` (through `078` for current codebase).
2. If upgrading past `074`, **back up contact data** before running `074_member_data_upload.sql`.
3. Run both `077_*` scripts in documented order (join-us review, then seva registry).
4. Start API (`npm run start:dev` in `ad-west-api`, port **3001**).
5. Start web (`npm run dev` in `ad-west-web`, port **3000**, strict).
6. Verify health/login, menu grants, and permission-set scoped contact lists.
7. Verify member upload: template download → preview → commit on Global or Sreni contacts.
8. Verify Seva Samithi: registry list, seva activity modal, document upload/download.
9. Verify Join Us: public `/join-us` submit and admin join-us-review queue.
10. Verify gateway (helpdesk, jobs) and member-services endpoints.
11. Verify Google and SMTP/IMAP settings if used.
