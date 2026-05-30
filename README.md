# AD West - Multi-Project Repository

This repository contains two independent projects for the AD West application.

## Projects

### 1. **ad-west-web** - React Frontend
A modern React application built with Vite, TypeScript, and best practices for maintainability and scalability.

**Location:** `ad-west-web/`

**Key Features:**
- Vite for fast development and optimized builds
- TypeScript for type safety
- Modular component structure (common & feature components)
- Custom hooks for reusable logic
- Context API for state management
- Utility functions for API calls
- Public utility entry points at `/helpdesk`, `/jobs`, and `/jobs/apply?job=<jobId>`, plus internal admin management pages for helpdesk tickets, job postings, and job applications
- Public portal entry point at `/` and `/portal`, plus a sectioned Join Us intake at `/join-us` for Sreni-based contact registration
- Public job applications now support optional resume uploads with client/server validation for PDF, DOC, and DOCX files up to 1 MB, and authenticated admin resume viewing

**Quick Start:**
```bash
cd ad-west-web
npm install
npm run dev  # Runs on http://localhost:3000
```

**Structure:**
```
ad-west-web/
├── src/
│   ├── components/     # UI components (common & features)
│   ├── pages/         # Page components
│   ├── hooks/         # Custom React hooks
│   ├── context/       # React context
│   ├── utils/         # Utility functions
│   ├── types/         # TypeScript definitions
│   ├── styles/        # Global styles
│   ├── App.tsx        # Root component
│   └── main.tsx       # Entry point
├── public/            # Static assets
├── index.html         # HTML template
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

---

### 2. **ad-west-api** - NestJS REST API Server
A robust REST API built with NestJS, TypeScript, and best practices for API development.

**Location:** `ad-west-api/`

**Key Features:**
- NestJS framework with modular architecture
- TypeScript for type safety
- Dependency injection and IoT container
- Built-in validation and exception handling
- Environment configuration management
- Custom middleware and filters
- Comprehensive logging
- Public gateway endpoints for helpdesk submission and public job application flows, with authenticated admin management routes

**Quick Start:**
```bash
cd ad-west-api
npm install
npm run start:dev  # Runs on http://localhost:3001
```

**Structure:**
```
ad-west-api/
├── src/
│   ├── common/         # Shared utilities (filters, exceptions, middleware)
│   ├── modules/        # Feature modules
│   │   └── health/     # Health check module
│   ├── config/         # Configuration files
│   ├── app.module.ts   # Root module
│   └── main.ts         # Application entry point
├── dist/               # Compiled output
├── package.json
├── tsconfig.json
└── README.md
```

---

## Development Setup

### Prerequisites
- Node.js 18+
- npm or yarn
- PostgreSQL (recommended for database)

### Installation

Install dependencies for both projects:

```bash
# Frontend
cd ad-west-web
npm install

# Backend (in a new terminal)
cd ad-west-api
npm install
```

### Running Both Projects

**Terminal 1 - Frontend:**
```bash
cd ad-west-web
npm run dev
```

**Terminal 2 - API:**
```bash
cd ad-west-api
npm run dev
```

The frontend will be available at `http://localhost:3000`
The API will be available at `http://localhost:3001`

---

## Project Guidelines

### General Best Practices
- ✅ Keep projects **completely independent**
- ✅ Each project has its own `package.json` and dependencies
- ✅ TypeScript enabled for type safety across both projects
- ✅ ESLint configured for code quality
- ✅ Modular structure for easy maintenance and scalability
- ✅ Clear separation of concerns

### Frontend (ad-west-web)
- **Components:** Organize in `common/` (reusable) and `features/` (feature-specific)
- **State Management:** Use React Context for global state
- **API Calls:** Use the centralized `api` utility in `src/utils/api.ts`
- **Styling:** Keep styles modular and co-located with components when possible
- **Location Definitions:** Existing locations can now be edited and moved between `Zone` and `Sthan` levels from the settings page.
- **Admin Navigation:** `Permission Sets` and `Users` now live as standalone full-page admin sections instead of nested settings entries.
- **Access Grants:** The access-grants settings surface and related API routes have been removed.

### Backend (ad-west-api)
- **Routes:** Organize API endpoints by feature in `app/api/`
- **Database:** Use `lib/db/` for database utilities and queries
- **Utilities:** Keep error handling, logging, and validation in `lib/utils/`
- **Configuration:** Environment variables in `.env.local` (copy from `.env.example`)

---

## Environment Variables

### Frontend (.env.local)
```
VITE_API_URL=http://localhost:3001/api
```

### Backend (.env.local)
```
DATABASE_URL=postgresql://user:password@localhost:5432/ifca-auhwest
NODE_ENV=development
API_PORT=3001
LOG_LEVEL=debug
```

---

## Scripts

### Frontend
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run type-check` - TypeScript type checking

### Backend
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - TypeScript type checking

---

## Project Growth

Both projects are designed to scale:
- **ad-west-web:** Add more feature components, hooks, and context as needed
- **ad-west-api:** Add more API routes, database models, and middleware as needed

Each project maintains a clean, understandable structure that won't become monolithic.

---

## License
[Add your license information here]