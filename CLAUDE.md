# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Flowshapr is a visual drag-and-drop interface for building Firebase Genkit AI flows that allows users to create, manage, and deploy genkit flows to various platforms (Firebase, Google Cloud, AWS, or keep with us). Developers use a thin SDK to call flows remotely. The system generates production-ready TypeScript code from visual flows and executes them in real-time.

## Commands

This project appears to be in early development and lacks package.json configuration. Common commands would typically include:

```bash
# Development setup (when implemented)
npm install
npm run dev

# Build and test (when implemented)
npm run build
npm run test
npm run lint
```

## Architecture

### Core Components

The system follows a three-layer architecture:

1. **Visual Editor Layer**: React Flow canvas for drag-and-drop flow building
2. **Code Generation Layer**: Template-based TypeScript code generation 
3. **Execution Layer**: Firebase Genkit integration for AI workflow execution

### Key Files and Structure

- `src/types/flow.ts` - Core TypeScript interfaces for flows, nodes, and connections
- `src/lib/code-generator.ts` - Converts visual flows to executable Genkit TypeScript code
- `src/lib/genkit-integration.ts` - Handles Genkit flow execution and model provider switching
- `src/components/flow-builder/` - Visual flow builder components (FlowCanvas, NodeTypes, Sidebar)
- `src/components/code-preview/` - Monaco editor integration for live code preview
- `src/app/api/genkit/` - Next.js API routes for flow execution and validation

### Node Types

The system supports six core node types:
- **InputNode**: Flow input definition (text, JSON, file)
- **ModelNode**: AI model selection (Gemini, OpenAI, Claude)
- **PromptNode**: Template definition with variables
- **TransformNode**: Data transformation logic
- **OutputNode**: Flow output configuration
- **ConditionNode**: Conditional branching logic

### Data Flow

1. User creates visual flow by dragging nodes and connecting them
2. React Flow updates nodes/edges state
3. CodeGenerator converts visual flow to TypeScript in real-time
4. Monaco editor displays generated code with syntax highlighting
5. API routes execute generated Genkit flows
6. Results displayed in test panel with execution traces

### Technology Stack

- Next.js 15 with TypeScript and App Router
- Express.js backend with domain-driven design
- PostgreSQL database with Drizzle ORM
- Better Auth for authentication with social providers
- React Flow (@xyflow/react) for visual editor
- Monaco Editor for code preview
- Firebase Genkit for AI workflow execution
- Tailwind CSS for styling
- Lucide React for icons

### Code Generation Strategy

The system uses template-based generation with:
- Flow graph traversal for execution order
- TypeScript AST manipulation for clean code output
- Real-time validation and error reporting
- Proper Genkit API usage patterns

### Security Considerations

- Generated code validation before execution
- Input sanitization for all user inputs
- Secure API key management for AI providers
- Rate limiting for AI model API calls

## Backend Architecture (Domain-Driven Design)

The server follows domain-driven design principles with clear separation of concerns:

### Directory Structure
```
server/src/
├── domains/           # Business domains
│   ├── auth/              # Authentication domain
│   ├── organizations/     # Organization management
│   ├── teams/             # Team management  
│   ├── users/             # User management
│   ├── flows/             # Flow CRUD and execution
│   ├── prompts/           # Flow and project-scoped prompts
│   ├── connections/       # External provider credentials per flow
│   ├── api-keys/          # Project-scoped SDK access tokens
│   ├── datasets/          # Project-scoped dataset management
│   ├── traces/            # Flow execution trace storage and retrieval
│   └── telemetry/         # System telemetry and metrics
│   └── {domain}/
│       ├── controllers/   # HTTP request/response handling
│       ├── services/      # Business logic and validation
│       ├── routes.ts      # Route definitions
│       ├── types.ts       # Domain-specific types
│       └── validation/    # Zod validation schemas
├── infrastructure/    # External concerns (database, auth, email)
├── shared/           # Shared utilities and middleware
│   └── authorization/ # Central authorization system
└── config/           # Configuration management
```

### Architecture Principles

1. **Controllers**: Handle HTTP requests/responses only
   - Minimal logic - delegate to services
   - Handle validation errors and return appropriate HTTP responses
   - Manage request/response formatting
   - Should not contain business logic

2. **Services**: Contain business logic and validation
   - Implement domain-specific business rules
   - Handle data validation and transformation
   - Manage interactions with infrastructure (database, external APIs)
   - Return structured results that controllers can handle

3. **Routes**: Define HTTP endpoints and middleware
   - Map URLs to controller methods
   - Apply domain-specific middleware
   - Routes must be minimal - NO database logic in routes
   - Only reference controller methods

4. **Separation of Concerns**:
   - Controllers should NOT contain business logic
   - Services should NOT handle HTTP concerns
   - Each domain should be self-contained
   - Cross-domain communication through well-defined interfaces
   - Services may call other domain services when needed

### Authentication System

The project uses a unified authentication system similar to **Laravel Sanctum**, supporting both session-based (web) and token-based (API) authentication:

```typescript
// 1. Unified auth - supports both sessions and API tokens
import { requireAuth } from "../../shared/middleware/auth";
router.get("/api/user/profile", requireAuth, getUserProfile);

// 2. Session-only auth (web app only)
import { requireSessionAuth } from "../../shared/middleware/auth";
router.get("/api/web/dashboard", requireSessionAuth, getDashboard);

// 3. Token-only auth (API only)
import { requireTokenAuth } from "../../shared/middleware/auth";
router.get("/api/external/data", requireTokenAuth, getExternalData);

// 4. Optional auth (enhanced features for authenticated users)
import { optionalAuth } from "../../shared/middleware/auth";
router.get("/api/public/flows", optionalAuth, getPublicFlows);
```

**Authentication Flow:**
1. **Token Auth**: Checks `Authorization: Bearer <token>` header first
2. **Session Auth**: Falls back to session cookies if no token
3. **Request Context**: Sets `req.user`, `req.authMethod` ('session'|'token')

### Authorization System

Authorization follows a two-layer approach:

1. **Authentication Middleware**: `requireAuth` authenticates users only
2. **Service-Level Authorization**: Authorization is enforced in services using central abilities

```typescript
// Central abilities definition in server/src/shared/authorization/abilities.ts
// Service-level protection using service-guard
import { requireUserAbility } from "../../shared/authorization/service-guard";

// At the start of service methods
await requireUserAbility(userId, 'read', 'flow', flowId);
```

**Key Authorization Principles:**
- Auth middleware only handles authentication
- Authorization decisions happen in services, not middleware
- Use `requireUserAbility(userId, action, subject, resource?)` in services
- This ensures service-to-service calls are also properly authorized

### Validation System

The project uses **Zod** for validation, similar to Laravel's validation system:

```typescript
// 1. Define validation schemas (domains/{domain}/validation/schemas.ts)
import { z } from 'zod';

export const signUpSchema = z.object({
  body: z.object({
    name: z.string().min(2, "Name must be at least 2 characters long").trim(),
    email: z.string().email("Please provide a valid email address").toLowerCase().trim(),
    password: z.string().min(8, "Password must be at least 8 characters long"),
  }),
});

// 2. Apply validation middleware to routes
import { validate } from "../../shared/middleware/validation";
router.post("/sign-up/email", validate(signUpSchema), controller.signUp);

// 3. Validation errors return Laravel-like format
{
  "error": {
    "message": "The given data was invalid.",
    "code": "VALIDATION_ERROR",
    "errors": {
      "body.name": ["Name must be at least 2 characters long"],
      "body.email": ["Please provide a valid email address"]
    }
  }
}
```

### Domain Examples

**Specific Domain Implementations:**

- **Prompts Domain**: Encapsulates prompt CRUD for project- and flow-scoped endpoints via controller and service
- **Traces Domain**: Handles execution trace listing, retrieval, and persistence; flow routes call traces controller, flow execution persists via traces service  
- **Flows Execution**: `FlowRunService` orchestrates execution via `FlowExecutor` and persists traces via `TracesService`. `FlowController.executeFlow` remains a thin pass-through to the service
- **Connections Domain**: Stores external provider credentials per flow (with projectId for filtering), with flow-scoped routes under `flows/:id/connections`
- **API Keys Domain**: Manages project-scoped SDK access tokens; projects routes call its controller
- **Datasets Domain**: Handles project-scoped datasets CRUD; projects routes reference its controller

### Example Pattern
```typescript
// Controller (minimal logic, no validation)
export const flowController = {
  executeFlow: async (req: Request, res: Response) => {
    try {
      // Thin pass-through to service - no business logic
      const result = await flowRunService.executeFlow(req.params.id, req.body);
      res.json({ data: result });
    } catch (error) {
      // Handle known error types
      res.status(500).json({ error: 'Internal server error' });
    }
  }
};

// Service (business logic with authorization)
export const flowRunService = {
  executeFlow: async (flowId: string, data: ExecutionData) => {
    // Authorization at service level
    await requireUserAbility(data.userId, 'execute', 'flow', flowId);
    
    // Orchestrate execution
    const result = await flowExecutor.execute(flowId, data);
    
    // Persist traces via another domain service
    await tracesService.createTrace(flowId, result);
    
    return result;
  }
};
```

### Frontend API Routes

Frontend API routes in `src/app/api/**` should stay thin, acting as proxies to backend domain routes and forwarding session cookies consistently.

**Route Structure:**
```
src/app/api/
├── organizations/[...path]/     # Proxy to organizations domain
├── teams/[...path]/             # Proxy to teams domain  
├── auth/[...auth]/              # Authentication routes
├── projects/[id]/               # Project-scoped routes
│   ├── api-keys/                # Project API key management
│   └── prompts/                 # Project prompt management
└── flows/[id]/                  # Flow-scoped routes
    ├── traces/                  # Flow execution traces
    ├── connections/             # Flow provider connections
    ├── prompts/                 # Flow-specific prompts
    ├── execute/                 # Flow execution endpoint
    └── publish/                 # Flow publishing
```

**Frontend API Principles:**
- Thin proxy routes that forward to backend domains
- Consistent session cookie forwarding
- No business logic in frontend API routes
- Follow RESTful patterns with proper HTTP methods

## Development Notes

This codebase follows enterprise-grade architecture patterns. The system is built to be extensible with plugin architecture for new node types and AI providers.

**IMPORTANT**: Always follow domain-driven design principles when adding new features:
- Keep controllers thin - they should only handle HTTP concerns
- Put business logic in services with proper validation
- Maintain clear separation between domains
- Use dependency injection for testability
- Routes must be minimal with NO database logic
- Authorization happens in services, not middleware
- Frontend API routes should be thin proxies to backend domains