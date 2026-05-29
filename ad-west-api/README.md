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
- Brute-force protection is enabled: 5 failed attempts triggers a 15-minute account lockout.
- To use DB-backed auth store, set `ENABLE_DB_PERSISTENCE=true` and point `DATABASE_URL` to your PostgreSQL instance.
- For existing environments, run both `011_auth_store.sql` and `012_auth_security_hardening.sql`.

## Best Practices

- **Modular structure:** Each feature is organized in its own module
- **Single responsibility:** Services handle business logic, controllers handle HTTP requests
- **Type safety:** Full TypeScript support with strict mode enabled
- **Input validation:** Automatic validation using decorators
- **Error handling:** Centralized exception handling with custom filters
- **Configuration:** Environment-based configuration management

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
