# AD West Web

React frontend application for AD West.

## Project Structure

```
src/
├── components/
│   ├── common/      # Shared UI components (Button, Card, Modal, etc.)
│   └── features/    # Feature-specific components
├── pages/           # Page components
├── hooks/           # Custom React hooks
├── context/         # React Context for state management
├── utils/           # Utility functions
├── types/           # TypeScript type definitions
└── styles/          # Global styles
```

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Starts the development server at `http://localhost:3000`

### Build

```bash
npm run build
```

Builds the project for production.

### Preview

```bash
npm run preview
```

Preview the production build locally.

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking

## Best Practices

- Keep components small and focused on a single responsibility
- Use hooks for component logic
- Organize styles with CSS modules or CSS-in-JS
- Use TypeScript for type safety
- Keep API calls in a separate utility layer
- Use context for global state management when needed
