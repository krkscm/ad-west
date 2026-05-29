# AD West API

REST API for AD West application built with **NestJS** and **TypeScript**.

## Project Structure

```
src/
├── common/              # Shared code
│   ├── decorators/      # Custom decorators
│   ├── exceptions/      # Custom exceptions
│   ├── filters/         # Exception filters
│   ├── middleware/      # Custom middleware
│   └── pipes/          # Validation pipes
├── modules/            # Feature modules
│   └── health/         # Health check module
│       ├── controllers/
│       ├── services/
│       └── health.module.ts
├── config/             # Configuration
├── app.module.ts       # Root module
├── app.controller.ts   # Root controller
└── main.ts            # Application entry point
```

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- PostgreSQL (recommended)

### Installation

```bash
npm install
```

### Environment Setup

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Update the configuration as needed.

### Development

```bash
npm run start:dev
```

Server will run on `http://localhost:3001`
Swagger UI will run on `http://localhost:3001/api/docs`

### Build

```bash
npm run build
```

### Production

```bash
npm start
```

## Scripts

- `npm run start:dev` - Start development server with hot reload
- `npm run start:debug` - Start with debug mode
- `npm start` - Start production server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm test` - Run unit tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:cov` - Generate coverage report
- `npm run test:e2e` - Run end-to-end tests

## API Endpoints

### Health Check
- `GET /api/v1/health` - Dependency-aware health endpoint (includes DB probe details when DB mode is enabled)
  - Returns `200` with `status: "ok"` when all required checks pass
  - Returns `503` with `status: "degraded"` when any required dependency check fails
- `GET /api/v1/api` - API information endpoint

### API Documentation
- `GET /api/docs` - Swagger UI
- `GET /api/docs-json` - OpenAPI JSON

### Authentication
- `GET /api/v1/auth/captcha` - Get a captcha challenge token and expression
- `POST /api/v1/auth/login` - Neutral login with identifier, password, captcha; returns the correct workspace token
- `GET /api/v1/auth/google/start` - Start Google OAuth login flow for the current web origin
- `GET /api/v1/auth/google/callback` - Google OAuth callback that returns session token to the web popup opener

### Gmail Integration (Admin Session)
- `GET /api/v1/gmail/inbox?maxResults=10` - Fetch latest inbox messages for the authenticated admin Google session
- `POST /api/v1/gmail/send` - Send an email via Gmail API for the authenticated admin Google session
- Request body for send:
  - `to` (string, email)
  - `subject` (string)
  - `body` (string, HTML allowed)

### Settings: Google Integration Configuration
- `GET /api/v1/settings/google-integration-config` - Read DB-backed Google OAuth/Gmail integration configuration (Super Admin only)
- `PATCH /api/v1/settings/google-integration-config` - Update DB-backed Google OAuth/Gmail integration configuration (Super Admin only)
- Configuration keys managed via this endpoint:
  - Google Client ID
  - Google Client Secret
  - Redirect URI
  - OAuth scopes
  - Web app origin
  - Enabled toggle
- Update behavior note:
  - When the authenticated principal is not an `auth_admin_users` record (for example, super-admin login from `adwest.users`), `updated_by` is stored as `NULL` to keep FK-safe updates.

### Google Cloud Setup (OAuth + Gmail)
1. Create a project in Google Cloud Console.
2. Enable the Gmail API for the project.
3. Configure OAuth consent screen.
4. Create OAuth client credentials (Web application).
5. Add authorized redirect URI: `http://localhost:3001/api/v1/auth/google/callback`
6. Log in as Super Admin and open Settings > Google Integration.
7. Save the Client ID, Client Secret, Redirect URI, OAuth scopes, Web App Origin, and enable the integration toggle.

### Public Gateway
- Public URLs served by the frontend:
  - `/helpdesk` - Public helpdesk request form
  - `/jobs` - Public job-posting list
  - `/jobs/apply?job=<jobId>` - Public job application form for a selected posting
- API routes:
  - `POST /api/v1/public/helpdesk/tickets` - Submit a helpdesk ticket without authentication
  - `GET /api/v1/public/jobs` - List active public job postings without authentication
  - `POST /api/v1/public/jobs/:jobId/apply` - Submit a job application without authentication using `multipart/form-data`, including an optional `resume` file upload
  - `GET /api/v1/gateway/helpdesk/tickets` - Internal ticket list for authenticated admins
  - `GET /api/v1/gateway/helpdesk/tickets/:id` - Internal ticket detail for authenticated admins
  - `PATCH /api/v1/gateway/helpdesk/tickets/:id` - Update helpdesk ticket status/notes for authenticated admins
  - `GET /api/v1/gateway/jobs` - Internal job-posting list for authenticated admins
  - `POST /api/v1/gateway/jobs` - Create a job posting for authenticated admins
  - `PATCH /api/v1/gateway/jobs/:id` - Update a job posting for authenticated admins
  - `DELETE /api/v1/gateway/jobs/:id` - Delete a job posting for authenticated admins
  - `GET /api/v1/gateway/jobs/applications` - List all job applications for authenticated admins
  - `GET /api/v1/gateway/jobs/applications/:id/resume` - Stream a stored resume file for authenticated admins
  - `GET /api/v1/gateway/jobs/:jobId/applications` - List applications for one posting for authenticated admins
  - `PATCH /api/v1/gateway/jobs/applications/:id` - Update job-application status/notes for authenticated admins
- Current implementation note:
  - The new `public-gateway` Nest module follows the same conditional persistence model as other API modules: it uses PostgreSQL when `ENABLE_DB_PERSISTENCE=true`, otherwise it falls back to in-memory runtime storage.
  - Run `039_public_gateway.sql` before using the module in DB persistence mode.
  - Resume uploads are limited to 1 MB and validated on the backend by extension plus file-signature/content checks for PDF, DOC, and DOCX before storage.

### Settings Approval Workflow Definitions
- `approvalMode` is validated from `adwest.enum_values` where `enum_type='approval_mode'` and `active=true`.
- Workflow stages support role-definition approvers (`approverRoleDefinitionIds`) for role-driven approvals; legacy `approverPermissionSetId` is still accepted for backward compatibility.
- Each stage keeps `requiredCount` and `parentStageId` for hierarchy + quorum modeling.
- Attendance metric creation validates `sreniId` against `adwest.srenies` in DB mode before insert.
- Coverage check endpoint: `GET /api/v1/settings/approval-workflows/:workflowId/coverage` reports whether configured role approvers are sufficient for each stage.
- Runtime execution endpoints:
  - `POST /api/v1/settings/approval-workflows/:workflowId/runtime/items` submit a request into workflow runtime.
  - `POST /api/v1/settings/approval-workflows/runtime/items/:itemId/review` review a specific stage with `approved` or `rejected`.
  - `GET /api/v1/settings/approval-workflows/runtime/items` list runtime items.
  - `GET /api/v1/settings/approval-workflows/runtime/items/:itemId` inspect one runtime item.
- Runtime rules currently enforced:
  - Stage approval needs unique approvers and must reach `requiredCount`.
  - Stage rejection finalizes the item as rejected.
  - Child stages are unblocked when parent stages are approved.
  - Item is approved when all stages are approved.

## Authentication Seeds (Non-Production)

When DB persistence is enabled, run `ad-docs/database-script/011_auth_store.sql` to create persistent auth tables and seed users.
If you are upgrading an existing database, also run `ad-docs/database-script/028_admin_code_role_definition.sql` so admin code and role-definition columns are backfilled.
Run `ad-docs/database-script/029_user_login_credentials.sql` to add password-backed application users, mark the super-admin user, and seed `kiranraj.vgk@gmail.com` with the provided password.
Run `ad-docs/database-script/038_auth_login_performance_indexes.sql` to add login-path indexes for user code/phone/lower(email) lookups.
Run `ad-docs/database-script/039_public_gateway.sql` when enabling DB persistence for public helpdesk tickets, job postings, and job applications.
Run `ad-docs/database-script/040_member_services.sql` for member services persistence.
Run `ad-docs/database-script/041_google_integration_config.sql` to enable DB-backed Google OAuth/Gmail settings and menu seed.
Run `ad-docs/database-script/044_sreni_analytics_menu.sql` to backfill the `Analytics Studio` child menu for all existing Srenis.

### Admin Users (Password Login)
- Admin login now uses admin code as the visible identifier; existing records are backfilled from the stored admin accounts.
- Admin records also carry a linked role definition from Settings > Roles Definition.

### Member Users (Password Login)
- `john.doe@email.com` or `971500000001` / `Member@123`
- `priya.shah@email.com` or `971500000002` / `Member@123`
- `arjun.patel@email.com` or `971500000003` / `Member@123`

### Application Users
- Application users now own their own sign-in credentials.
- New users created through Settings > Users require a password at creation time.
- Super admin access is assigned from the user form and is backed by the application user record.

- Notes:
- Captcha is required for sign-in.
- Captcha endpoint diagnostics are enabled: slow generation logs warnings from `AuthController` and `CryptoService`, and failures now include stack traces in API logs.
- Brute-force protection is enabled: 5 failed attempts triggers a 15-minute account lockout.
- To use DB-backed auth store, set `ENABLE_DB_PERSISTENCE=true` and point `DATABASE_URL` to your PostgreSQL instance.
- For existing environments, run both `011_auth_store.sql` and `012_auth_security_hardening.sql`.
- To reduce DB and CPU pressure in DB runtime mode, periodic runtime snapshot flush is disabled by default and can be enabled by setting `CORE_RUNTIME_SNAPSHOT_FLUSH_MS` to a positive interval (ms); flushes remain dirty-aware.
- For production-like latency checks, prefer `npm run start:prod` (non-watch mode) to avoid watch-rebuild interruptions.

## Best Practices

- **Modular structure:** Each feature is organized in its own module
- **Single responsibility:** Services handle business logic, controllers handle HTTP requests
- **Type safety:** Full TypeScript support with strict mode enabled
- **Input validation:** Automatic validation using decorators
- **Error handling:** Centralized exception handling with custom filters
- **Configuration:** Environment-based configuration management
- **Runtime extraction:** Large `core-business` clusters are split into lazy runtime services under `src/modules/core-business/services/` to keep the main service maintainable without changing controller contracts
- **Program runtime split:** Program, session, registration, attendance, and personal-program lookups are handled by `program-runtime.service.ts`; keep new related logic there instead of growing the root service
- **Org runtime split:** Zone, location, sreni, sthan, and governance lifecycle flows are handled by `org-runtime.service.ts`; route new governance logic there instead of the root service
- **Sreni admin runtime split:** Sreni contacts, report metric definitions, monthly reports, and Sreni report parameters are handled by `sreni-admin-runtime.service.ts`; keep future Sreni admin/report-config logic there
- **Attendance runtime split:** Sreni calendar attendance listing, attendance metric CRUD/list, and event attendance capture flows are handled by `attendance-runtime.service.ts`; keep new attendance-related logic there
- **Approval runtime split:** Approval workflow list/create and approval item submit/review/resubmit/notification flows are handled by `approval-runtime.service.ts`; keep approval domain orchestration there
- **DB bootstrap split:** Core Business schema/bootstrap SQL for runtime startup is handled by `core-business-db-bootstrap.service.ts`; keep startup DDL/menu bootstrap logic there
- **DB hydration split:** Runtime hydration from PostgreSQL rows into in-memory maps is handled by `core-business-db-hydration.service.ts`; keep row-to-domain mapping logic outside the root service
- **Runtime snapshot split:** Runtime snapshot build/hydrate responsibilities are handled by `core-business-runtime-snapshot.service.ts`; keep snapshot serialization concerns outside the main orchestrator
- **Persistence runtime split:** Program, attendance, document/report/approval scheduling and DB upsert writers are handled by `core-business-persistence-runtime.service.ts`; keep these persistence flows outside the root service
- **Domain utils split:** Cross-cutting finder, validation, and date/time normalization helpers are handled by `core-business-domain-utils.service.ts`; keep shared domain utility logic out of the root service
- **Type model split:** Core Business record/type declarations are centralized in `core-business.types.ts` and re-exported by `core-business.service.ts`; add new domain record types in the types module instead of the root service
- **Readiness split:** Persistence readiness evaluation is handled by `core-business-readiness.service.ts`; keep environment/readiness decision logic outside the root orchestrator
- **Access utils split:** Shared auth/access helper logic (for example zone-scope rights checks) is handled by `core-business-access-utils.service.ts`; reuse this utility instead of duplicating authorization helper code
- **Reporting-chain visibility:** Submitted report records and attendance captures are visible to the creator and users whose role is in the creator's `reportingToRoleIds`; this visibility is enforced through `core-business-access-utils.service.ts` callbacks in runtime services
- **Responsibility chart split:** Year-based organization chart generation from user `roleId` and `reportingToRoleIds` is handled by `responsibility-chart-runtime.service.ts` and exposed through `GET /org/responsibility-chart?year=YYYY`; when `year` is omitted/blank it defaults to the current year, and provided values must be valid 4-digit years
- **Runtime context factories:** Lazy runtime getters in `core-business.service.ts` now use grouped context factory methods (`build*RuntimeContext`) to reduce wiring noise and keep constructor payloads cohesive

## Adding New Features

### 1. Create a new module
```bash
mkdir -p src/modules/my-feature/{controllers,services}
```

### 2. Create service
```typescript
@Injectable()
export class MyFeatureService {
  // Business logic
}
```

### 3. Create controller
```typescript
@Controller('my-feature')
export class MyFeatureController {
  constructor(private readonly service: MyFeatureService) {}
  
  @Get()
  findAll() {
    return this.service.findAll();
  }
}
```

### 4. Create module
```typescript
@Module({
  controllers: [MyFeatureController],
  providers: [MyFeatureService],
})
export class MyFeatureModule {}
```

### 5. Import in AppModule
```typescript
import { MyFeatureModule } from '@modules/my-feature/my-feature.module';

@Module({
  imports: [MyFeatureModule],
})
export class AppModule {}
```

## Testing

Unit tests use Jest. Create a `.spec.ts` file next to your source file:

```typescript
describe('MyFeatureService', () => {
  let service: MyFeatureService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MyFeatureService],
    }).compile();

    service = module.get<MyFeatureService>(MyFeatureService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
```

## License

MIT
