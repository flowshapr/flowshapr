# Frontend CLAUDE.md

This file provides guidance to Claude Code when working with the **Flowshapr Frontend** (Next.js application).

## Frontend Overview

The frontend is a Next.js 15 application with TypeScript that provides a visual drag-and-drop interface for building Firebase Genkit AI flows. It generates production-ready TypeScript code in real-time and executes flows through the backend API.

## Commands

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript checks

# From workspace root
npm run dev --workspace=frontend
npm run build --workspace=frontend
```

## Architecture

### Core Frontend Components

1. **Visual Editor Layer**: React Flow canvas for drag-and-drop flow building
2. **Code Generation Layer**: Template-based TypeScript code generation
3. **Execution Interface**: UI for testing and debugging flows

### Key Files and Structure

```
frontend/src/
├── app/                    # Next.js App Router
│   ├── (protected)/        # Protected routes (authenticated)
│   │   ├── app/            # Main application interface
│   │   └── settings/       # User settings
│   ├── (public)/           # Public routes
│   ├── api/                # Frontend API routes (proxies)
│   └── globals.css         # Global styles
├── components/
│   ├── flow-builder/       # Visual flow builder components
│   │   ├── blocks/         # Node type components
│   │   ├── components/     # Canvas, Sidebar, Toolbar
│   │   └── views/          # FlowBuilderView
│   ├── code-preview/       # Monaco editor integration
│   ├── auth/               # Authentication components
│   ├── navigation/         # App navigation
│   ├── testing/            # Flow testing interface
│   └── ui/                 # Shared UI components
├── stores/                 # Zustand state management
├── lib/                    # Utilities and services
│   ├── code-generator.ts   # Visual flow → TypeScript code
│   ├── api/                # API client functions
│   └── blocks/             # Block definitions and services
├── hooks/                  # Custom React hooks
└── types/                  # TypeScript type definitions
```

### Node Types System

The system supports six core node types with corresponding React components:

- **InputBlock** (`components/flow-builder/blocks/InputBlock.tsx`): Flow input definition (text, JSON, file)
- **AgentBlock** (`components/flow-builder/blocks/AgentBlock.tsx`): AI model selection (Gemini, OpenAI, Claude)
- **PromptBlock**: Template definition with variables
- **TransformBlock** (`components/flow-builder/blocks/TransformBlock.tsx`): Data transformation logic
- **OutputBlock** (`components/flow-builder/blocks/OutputBlock.tsx`): Flow output configuration
- **ConditionBlock** (`components/flow-builder/blocks/ConditionBlock.tsx`): Conditional branching logic
- **InterruptBlock** (`components/flow-builder/blocks/InterruptBlock.tsx`): Human-in-the-loop interactions
- **McpToolBlock** (`components/flow-builder/blocks/tools/McpToolBlock.tsx`): MCP tool integration

### Data Flow Architecture

1. **User Interaction**: Drag-and-drop nodes and connections in React Flow canvas
2. **State Management**: Zustand stores manage nodes/edges state and sync changes
3. **Real-time Code Generation**: `code-generator.ts` converts visual flow to TypeScript
4. **Code Preview**: Monaco editor displays generated code with syntax highlighting
5. **Flow Execution**: Frontend API routes proxy requests to backend for execution
6. **Results Display**: Test panel shows execution results and traces

### Technology Stack

**Core Framework:**
- Next.js 15 with TypeScript and App Router
- React 18 with concurrent features

**UI Libraries:**
- React Flow (`@xyflow/react`) for visual flow editor
- Monaco Editor (`@monaco-editor/react`) for code preview
- Tailwind CSS + DaisyUI for styling
- Lucide React for icons

**State Management:**
- Zustand for global state management
- Immer for immutable state updates

**Authentication:**
- Better Auth integration for session management
- Social providers (Google, GitHub, Microsoft)

**Development Tools:**
- TypeScript with strict mode
- ESLint for code quality
- Tailwind for styling consistency

## Code Generation Strategy

The frontend uses template-based code generation with the following approach:

### Flow Graph Processing
```typescript
// src/lib/code-generator.ts
export function generateGenkitCode(nodes: Node[], edges: Edge[]): string {
  // 1. Topological sort for execution order
  const sortedNodes = topologicalSort(nodes, edges);

  // 2. Generate imports and setup
  const imports = generateImports(nodes);
  const genkitSetup = generateGenkitSetup(nodes);

  // 3. Generate flow definition
  const flowDefinition = generateFlowDefinition(sortedNodes, edges);

  // 4. Combine into executable TypeScript
  return `${imports}\n${genkitSetup}\n${flowDefinition}`;
}
```

### Node Type Mapping
- Each node type has a corresponding code generation template
- Templates use the node's configuration to generate TypeScript
- Real-time validation ensures generated code is syntactically correct
- Proper Genkit API usage patterns are enforced

## Frontend API Routes (Proxy Layer)

Frontend API routes in `src/app/api/**` act as thin proxies to the backend:

### Route Structure
```
src/app/api/
├── auth/[...auth]/              # Authentication (Better Auth)
├── organizations/[...path]/     # Organization management proxy
├── teams/[...path]/             # Team management proxy
├── projects/[id]/               # Project-scoped routes
│   ├── api-keys/                # Project API keys
│   └── prompts/                 # Project prompts
├── flows/[id]/                  # Flow-scoped routes
│   ├── traces/                  # Execution traces
│   ├── connections/             # AI provider connections
│   ├── prompts/                 # Flow-specific prompts
│   ├── execute/                 # Flow execution
│   └── publish/                 # Flow publishing
├── blocks/                      # Block definitions and stats
└── genkit/                      # Genkit-specific operations
    ├── execute/                 # Direct flow execution
    └── validate/                # Flow validation
```

### Proxy Principles
- **Thin Proxies**: Routes forward requests to backend with minimal logic
- **Session Forwarding**: Consistently forward authentication cookies
- **Error Handling**: Standardized error responses
- **Type Safety**: Proper TypeScript types for request/response

## Component Architecture

### Flow Builder Components

**FlowCanvas** (`components/flow-builder/components/FlowCanvas.tsx`)
- Main React Flow canvas component
- Handles node/edge interactions
- Manages drag-and-drop functionality
- Real-time code generation triggers

**Sidebar** (`components/flow-builder/components/Sidebar.tsx`)
- Node palette for adding new nodes
- Organized by node categories
- Drag-to-canvas functionality

**Node Components** (`components/flow-builder/blocks/`)
- Each node type has a dedicated React component
- Uses `BaseNode` for consistent styling and behavior
- Configuration panels for node-specific settings
- Real-time validation and error display

### State Management Patterns

**Flow State** (`stores/blocksStore.ts`)
```typescript
interface FlowState {
  nodes: Node[];
  edges: Edge[];
  selectedNodeId: string | null;
  addNode: (node: Node) => void;
  updateNode: (id: string, updates: Partial<Node>) => void;
  deleteNode: (id: string) => void;
  // ... other actions
}
```

**Connection State** (`stores/connectionStore.ts`)
- Manages AI provider connections
- Handles API key storage and validation
- Provider-specific configuration

## Styling and UI Guidelines

### Tailwind CSS + DaisyUI
- Use DaisyUI semantic classes for consistency
- Avoid hardcoded colors - use theme variables
- Component classes for reusable patterns
- Responsive design with mobile-first approach

### Component Styling Patterns
```typescript
// Good - Semantic DaisyUI classes
<button className="btn btn-primary btn-sm">Execute Flow</button>

// Bad - Hardcoded styles
<button className="bg-blue-500 text-white px-4 py-2 rounded">Execute Flow</button>
```

### Dark Mode Support
- DaisyUI provides automatic dark mode
- Test components in both light and dark themes
- Use semantic color classes that adapt automatically

## Development Guidelines

### Component Creation
1. **Follow existing patterns** - Look at similar components first
2. **Use TypeScript strictly** - Proper types for all props and state
3. **Implement error boundaries** - Graceful error handling
4. **Follow naming conventions** - PascalCase for components, camelCase for functions
5. **Add proper accessibility** - ARIA labels and keyboard navigation

### State Management
1. **Use Zustand stores** for global state that needs persistence
2. **Use local state** (useState) for component-specific state
3. **Keep stores focused** - One store per domain (flows, connections, etc.)
4. **Use Immer** for complex state updates

### Code Generation
1. **Validate inputs** before generating code
2. **Handle edge cases** gracefully
3. **Generate clean, readable** TypeScript code
4. **Follow Genkit patterns** exactly
5. **Test generated code** thoroughly

### API Integration
1. **Use the API client** (`src/lib/api/`) for backend communication
2. **Handle loading states** and errors consistently
3. **Type API responses** properly
4. **Cache when appropriate** to improve performance

## Testing Strategy

### Component Testing
- Test user interactions (clicks, drags, form inputs)
- Test state changes and side effects
- Test error states and edge cases
- Mock external dependencies (API calls)

### Flow Generation Testing
- Test that visual flows generate correct TypeScript
- Test edge cases (disconnected nodes, invalid configurations)
- Test that generated code is syntactically valid
- Test execution of generated flows

### Integration Testing
- Test complete user workflows (create → edit → execute)
- Test authentication flows
- Test API integration points
- Test error handling across components

## Security Considerations

### Client-Side Security
- Never store sensitive data (API keys) in localStorage
- Validate all user inputs before processing
- Sanitize generated code before execution
- Use Content Security Policy (CSP) headers
- Implement proper CORS handling

### Authentication
- Use secure session management via Better Auth
- Implement proper token refresh patterns
- Handle authentication state across page reloads
- Redirect unauthenticated users appropriately

## Performance Optimization

### Code Splitting
- Use dynamic imports for large components
- Implement lazy loading for non-critical features
- Split by route and feature boundaries

### React Flow Optimization
- Use `memo` for expensive node components
- Optimize re-renders with proper dependency arrays
- Implement virtualization for large flows
- Cache generated code when possible

### Asset Optimization
- Optimize images and icons
- Use efficient bundle splitting
- Implement proper caching strategies
- Minimize JavaScript bundle size

## Development Notes

**IMPORTANT Frontend Principles:**
- Keep components focused and single-responsibility
- Use TypeScript strictly - no `any` types
- Follow React best practices (hooks rules, key props, etc.)
- Maintain consistent styling with DaisyUI patterns
- Test user interactions thoroughly
- Handle loading and error states gracefully
- Generate clean, readable TypeScript code
- Follow the established component architecture patterns