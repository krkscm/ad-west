# 07 - Runtime and Deployment Notes

## Default Local Ports

- Web app: `3000`
- API: `3001`

## Frontend API Wiring

- Frontend API base defaults to `/api/v1`
- Vite dev proxy forwards to configured backend target (`VITE_API_PROXY_TARGET`, default `http://localhost:3001`)

## Backend Runtime Notes

- API prefix configured to `/api/v1`
- Swagger docs available at `/api/docs`
- CORS origin configurable by environment

## Persistence Modes

- DB-enabled mode uses PostgreSQL-backed stores/entities
- Fallback mode uses in-memory runtime stores where supported
- Public Gateway and Member Services follow the same DB/in-memory conditional mode behavior

## Google Integration Runtime Notes

- OAuth/Gmail config values are DB-managed through settings API
- Env values remain fallback/emergency source
- Google OAuth start is blocked when integration is disabled via settings
- Gmail inbox/send is available only for Google-authenticated admin sessions

## Recommended Operational Checklist

1. Apply DB scripts in order
2. Start API and verify health/docs endpoints
3. Start web app and verify route rendering
4. Verify admin, member, and public flows
5. Verify Google settings endpoint and auth flow if enabled
6. Verify Helpdesk/Member-Services/Gmail workspace flows in the admin dashboard
