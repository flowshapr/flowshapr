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
├── domains/           # Business domains (auth, organizations, teams, users)
│   └── {domain}/
│       ├── controllers/   # HTTP request/response handling
│       ├── services/      # Business logic and validation
│       ├── routes.ts      # Route definitions
│       └── types.ts       # Domain-specific types
├── infrastructure/    # External concerns (database, auth, email)
├── shared/           # Shared utilities and middleware
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
   - Handle route-level authentication/authorization

4. **Separation of Concerns**:
   - Controllers should NOT contain business logic
   - Services should NOT handle HTTP concerns
   - Each domain should be self-contained
   - Cross-domain communication through well-defined interfaces

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

### Example Pattern
```typescript
// Controller (minimal logic, no validation)
export const authController = {
  signUp: async (req: Request, res: Response) => {
    try {
      // Data is already validated by middleware
      const result = await authService.signUp(req.body);
      res.json({ data: result });
    } catch (error) {
      if (error instanceof ConflictError) {
        res.status(error.statusCode).json({ 
          error: { message: error.message, code: 'USER_EXISTS' }
        });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  }
};

// Service (business logic only, no validation)
export const authService = {
  signUp: async (data: SignUpData) => {
    // Business logic only - validation handled by middleware
    const existingUser = await userRepository.findByEmail(data.email);
    if (existingUser) {
      throw new ConflictError('User already exists');
    }
    
    // Create user
    return userRepository.create(data);
  }
};
```

## Development Notes

This codebase follows enterprise-grade architecture patterns. The system is built to be extensible with plugin architecture for new node types and AI providers.

**IMPORTANT**: Always follow domain-driven design principles when adding new features:
- Keep controllers thin - they should only handle HTTP concerns
- Put business logic in services with proper validation
- Maintain clear separation between domains
- Use dependency injection for testability