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
- `GET /health` - Health check endpoint
- `GET /api` - API information endpoint

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
