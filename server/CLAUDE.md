# Server CLAUDE.md

This file provides guidance to Claude Code when working with the **Flowshapr Backend** (Express.js API server).

## Backend Overview

The backend is an Express.js API server that follows domain-driven design (DDD) principles. It provides REST APIs for flow management, execution, authentication, and multi-tenant organization support with PostgreSQL database integration.

## Commands

```bash
# Development
npm run dev          # Start development server with hot reload
npm run build        # Build TypeScript to JavaScript
npm run start        # Start production server
npm run test         # Run tests
npm run test:ci      # Run tests in CI mode
npm run lint         # Run ESLint

# Database
npm run db:generate  # Generate Drizzle migrations
npm run db:migrate   # Run database migrations
npm run db:studio    # Open Drizzle Studio (database GUI)
npm run db:seed      # Seed database with test data

# From workspace root
npm run build --workspace=server
npm run lint --workspace=server
```

## Architecture

The server follows **Domain-Driven Design (DDD)** principles with clear separation of concerns.

### Directory Structure
```
server/src/
├── domains/                 # Business domains
│   ├── auth/                # Authentication domain
│   │   ├── controllers/     # HTTP request/response handling
│   │   ├── services/        # Business logic and validation
│   │   ├── routes.ts        # Route definitions
│   │   ├── types.ts         # Domain-specific types
│   │   └── validation/      # Zod validation schemas
│   ├── organizations/       # Organization management
│   ├── teams/               # Team management
│   ├── users/               # User management
│   ├── flows/               # Flow CRUD and execution
│   ├── prompts/             # Flow and project-scoped prompts
│   ├── connections/         # External provider credentials per flow
│   ├── api-keys/            # Project-scoped SDK access tokens
│   ├── datasets/            # Project-scoped dataset management
│   ├── traces/              # Flow execution trace storage and retrieval
│   └── telemetry/           # System telemetry and metrics
├── infrastructure/          # External concerns
│   ├── database/            # Database connection and setup
│   ├── auth/                # Authentication providers
│   ├── email/               # Email service integration
│   └── storage/             # File storage integration
├── shared/                  # Shared utilities and middleware
│   ├── middleware/          # Express middleware
│   ├── authorization/       # Central authorization system
│   ├── validation/          # Validation utilities
│   └── utils/               # Common utilities
└── config/                  # Configuration management
```

## Domain-Driven Design Principles

### 1. Controllers
Handle HTTP requests/responses only - **NO business logic**

```typescript
// Good - Controller example
export const flowController = {
  executeFlow: async (req: Request, res: Response) => {
    try {
      // Thin pass-through to service - no business logic
      const result = await flowRunService.executeFlow(req.params.id, req.body);
      res.json({ data: result });
    } catch (error) {
      // Handle known error types
      handleErrorResponse(res, error);
    }
  }
};

// Bad - Business logic in controller
export const flowController = {
  executeFlow: async (req: Request, res: Response) => {
    // ❌ Database queries in controller
    const flow = await db.select().from(flows).where(eq(flows.id, req.params.id));

    // ❌ Business logic in controller
    if (!flow) {
      return res.status(404).json({ error: 'Flow not found' });
    }

    // ❌ Authorization logic in controller
    if (flow.userId !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
  }
};
```

### 2. Services
Contain business logic and validation - **NO HTTP concerns**

```typescript
// Good - Service example
export const flowRunService = {
  executeFlow: async (flowId: string, data: ExecutionData) => {
    // Authorization at service level
    await requireUserAbility(data.userId, 'execute', 'flow', flowId);

    // Business validation
    const flow = await flowsService.getFlowById(flowId);
    if (!flow.isPublished) {
      throw new BusinessError('Cannot execute unpublished flow');
    }

    // Orchestrate execution
    const result = await flowExecutor.execute(flowId, data);

    // Persist traces via another domain service
    await tracesService.createTrace(flowId, result);

    return result;
  }
};
```

### 3. Routes
Define HTTP endpoints and middleware - **Minimal logic**

```typescript
// Good - Route example
import { requireAuth } from "../../shared/middleware/auth";
import { validate } from "../../shared/middleware/validation";
import { executeFlowSchema } from "./validation/schemas";

router.post(
  "/flows/:id/execute",
  requireAuth,                    // Authentication middleware
  validate(executeFlowSchema),    // Validation middleware
  flowController.executeFlow      // Delegate to controller
);

// Bad - Business logic in routes
router.post("/flows/:id/execute", async (req, res) => {
  // ❌ Database logic in routes
  const flow = await db.select().from(flows).where(eq(flows.id, req.params.id));

  // ❌ Business logic in routes
  if (!flow) {
    return res.status(404).json({ error: 'Flow not found' });
  }
});
```

### 4. Separation of Concerns
- **Controllers** should NOT contain business logic
- **Services** should NOT handle HTTP concerns
- **Each domain** should be self-contained
- **Cross-domain communication** through well-defined interfaces
- **Services may call other domain services** when needed

## Authentication System

The project uses a **unified authentication system** similar to Laravel Sanctum, supporting both session-based (web) and token-based (API) authentication.

### Authentication Middleware

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

### Authentication Flow
1. **Token Auth**: Checks `Authorization: Bearer <token>` header first
2. **Session Auth**: Falls back to session cookies if no token
3. **Request Context**: Sets `req.user`, `req.authMethod` ('session'|'token')

### Better Auth Integration
The system uses **Better Auth** for:
- Social authentication (Google, GitHub, Microsoft)
- Session management
- Password-based authentication
- Multi-factor authentication support

## Authorization System

Authorization follows a **two-layer approach**:

1. **Authentication Middleware**: `requireAuth` authenticates users only
2. **Service-Level Authorization**: Authorization is enforced in services using central abilities

### Central Authorization
```typescript
// Central abilities definition in server/src/shared/authorization/abilities.ts
// Service-level protection using service-guard
import { requireUserAbility } from "../../shared/authorization/service-guard";

// At the start of service methods
await requireUserAbility(userId, 'read', 'flow', flowId);
await requireUserAbility(userId, 'execute', 'flow', flowId);
await requireUserAbility(userId, 'manage', 'organization', orgId);
```

### Authorization Principles
- **Auth middleware only handles authentication**
- **Authorization decisions happen in services, not middleware**
- Use `requireUserAbility(userId, action, subject, resource?)` in services
- This ensures **service-to-service calls are also properly authorized**

## Validation System

The project uses **Zod** for validation, similar to Laravel's validation system.

### Schema Definition
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

export const executeFlowSchema = z.object({
  body: z.object({
    input: z.any().optional(),
    config: z.object({
      timeout: z.number().min(1000).max(300000).default(60000),
      stream: z.boolean().default(false),
    }).optional(),
  }),
  params: z.object({
    id: z.string().uuid("Invalid flow ID"),
  }),
});
```

### Applying Validation
```typescript
// 2. Apply validation middleware to routes
import { validate } from "../../shared/middleware/validation";
router.post("/sign-up/email", validate(signUpSchema), controller.signUp);
```

### Error Format
```typescript
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

## Database Integration

The backend uses **PostgreSQL** with **Drizzle ORM** for type-safe database operations.

### Schema Definition
```typescript
// Example schema definition
import { pgTable, uuid, text, timestamp, boolean, jsonb } from 'drizzle-orm/pg-core';

export const flows = pgTable('flows', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description'),
  definition: jsonb('definition').notNull(),
  isPublished: boolean('is_published').default(false),
  userId: uuid('user_id').notNull().references(() => users.id),
  organizationId: uuid('organization_id').references(() => organizations.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
```

### Database Operations
```typescript
// Use Drizzle for type-safe queries
import { db } from '../../infrastructure/database';
import { eq, and } from 'drizzle-orm';

// Service method example
export const flowsService = {
  getFlowById: async (id: string): Promise<Flow | null> => {
    const result = await db.select()
      .from(flows)
      .where(eq(flows.id, id))
      .limit(1);

    return result[0] || null;
  },

  createFlow: async (data: CreateFlowData): Promise<Flow> => {
    const result = await db.insert(flows)
      .values({
        name: data.name,
        description: data.description,
        definition: data.definition,
        userId: data.userId,
        organizationId: data.organizationId,
      })
      .returning();

    return result[0];
  }
};
```

## Domain Examples

### Flows Domain
**Purpose**: Handle flow CRUD operations and execution orchestration

**Key Services:**
- `FlowsService`: Basic CRUD operations for flows
- `FlowRunService`: Orchestrates flow execution and trace persistence
- `FlowPublishingService`: Handles flow publishing and deployment

### Traces Domain
**Purpose**: Handle execution trace storage and retrieval

**Integration**: Flow execution persists traces via `TracesService.createTrace()`

### Connections Domain
**Purpose**: Store external AI provider credentials per flow

**Structure**: Flow-scoped routes under `flows/:id/connections` with project-level filtering

### API Keys Domain
**Purpose**: Manage project-scoped SDK access tokens

**Integration**: Projects routes reference its controller for token management

## Environment Configuration

### Environment Files
```bash
server/
├── .env.example          # Template for development
├── .env.prod             # Production configuration template
├── .env                  # Local development (git-ignored)
└── .env.test             # Testing environment
```

### Configuration Management
```typescript
// server/src/config/index.ts
import { z } from 'zod';

const configSchema = z.object({
  PORT: z.string().default('3001'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string(),
  BETTER_AUTH_SECRET: z.string(),
  BETTER_AUTH_URL: z.string(),
  // AI Provider Keys
  GOOGLE_AI_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
});

export const config = configSchema.parse(process.env);
```

## Error Handling

### Error Types
```typescript
// server/src/shared/errors/index.ts
export class BusinessError extends Error {
  constructor(message: string, public code: string = 'BUSINESS_ERROR') {
    super(message);
    this.name = 'BusinessError';
  }
}

export class ValidationError extends Error {
  constructor(public errors: Record<string, string[]>) {
    super('Validation failed');
    this.name = 'ValidationError';
  }
}

export class AuthorizationError extends Error {
  constructor(message: string = 'Unauthorized') {
    super(message);
    this.name = 'AuthorizationError';
  }
}
```

### Global Error Handler
```typescript
// server/src/shared/middleware/errorHandler.ts
export const errorHandler = (error: Error, req: Request, res: Response, next: NextFunction) => {
  if (error instanceof ValidationError) {
    return res.status(400).json({
      error: {
        message: 'The given data was invalid.',
        code: 'VALIDATION_ERROR',
        errors: error.errors,
      }
    });
  }

  if (error instanceof AuthorizationError) {
    return res.status(403).json({
      error: {
        message: error.message,
        code: 'AUTHORIZATION_ERROR',
      }
    });
  }

  // Log unexpected errors
  console.error('Unexpected error:', error);

  res.status(500).json({
    error: {
      message: 'Internal server error',
      code: 'INTERNAL_ERROR',
    }
  });
};
```

## Flow Execution Architecture

### Execution Pipeline
```typescript
// Simplified flow execution pipeline
export const flowExecutor = {
  execute: async (flowId: string, input: any, config?: ExecutionConfig) => {
    // 1. Load and validate flow definition
    const flow = await flowsService.getFlowById(flowId);
    const genkitCode = generateGenkitCode(flow.definition);

    // 2. Create execution context
    const executionId = generateExecutionId();
    const context = createExecutionContext(executionId, config);

    // 3. Execute in isolated environment
    const result = await executeInContainer(genkitCode, input, context);

    // 4. Return structured result
    return {
      executionId,
      result: result.output,
      traces: result.traces,
      duration: result.duration,
      status: result.status,
    };
  }
};
```

### Container Execution
- Flows execute in isolated Docker containers for security
- Each execution gets a unique container with timeout limits
- Results and traces are collected and returned to the caller

## Testing Strategy

### Unit Tests
```typescript
// Example service test
describe('FlowsService', () => {
  beforeEach(async () => {
    await setupTestDatabase();
  });

  afterEach(async () => {
    await cleanupTestDatabase();
  });

  it('should create a new flow', async () => {
    const flowData = {
      name: 'Test Flow',
      description: 'A test flow',
      definition: { nodes: [], edges: [] },
      userId: 'user-123',
    };

    const flow = await flowsService.createFlow(flowData);

    expect(flow.id).toBeDefined();
    expect(flow.name).toBe('Test Flow');
    expect(flow.userId).toBe('user-123');
  });
});
```

### Integration Tests
```typescript
// Example API integration test
describe('POST /api/flows/:id/execute', () => {
  it('should execute a published flow', async () => {
    const flow = await createTestFlow({ isPublished: true });
    const token = await generateAuthToken(flow.userId);

    const response = await request(app)
      .post(`/api/flows/${flow.id}/execute`)
      .set('Authorization', `Bearer ${token}`)
      .send({ input: { text: 'Hello, world!' } })
      .expect(200);

    expect(response.body.data.executionId).toBeDefined();
    expect(response.body.data.status).toBe('completed');
  });
});
```

## Security Considerations

### Input Validation
- Validate all inputs using Zod schemas
- Sanitize data before database operations
- Validate generated code before execution

### Authentication & Authorization
- Never store passwords in plain text
- Use secure session management
- Implement proper CORS configuration
- Rate limit API endpoints

### Execution Security
- Execute flows in isolated containers
- Implement resource limits (CPU, memory, timeout)
- Sanitize execution environments
- Log all execution attempts

## Development Guidelines

### Domain Creation
When creating a new domain:

1. **Create domain directory** with standard structure
2. **Define types** in `types.ts`
3. **Create validation schemas** in `validation/schemas.ts`
4. **Implement services** with business logic
5. **Create controllers** as thin wrappers
6. **Define routes** with proper middleware
7. **Add tests** for services and integration

### Service Design
1. **Single Responsibility**: Each service handles one business domain
2. **Authorization First**: Check permissions before business logic
3. **Error Handling**: Use typed errors for different scenarios
4. **Transaction Support**: Use database transactions for multi-step operations
5. **Testing**: Write unit tests for all service methods

### Database Guidelines
1. **Use Drizzle ORM** for all database operations
2. **Define schemas** with proper types and constraints
3. **Use migrations** for schema changes
4. **Index frequently queried columns**
5. **Handle foreign key relationships** properly

## Performance Optimization

### Database Optimization
- Use appropriate indexes for query patterns
- Implement connection pooling
- Use read replicas for heavy read workloads
- Cache frequently accessed data

### API Optimization
- Implement response caching where appropriate
- Use compression middleware
- Paginate large data sets
- Implement request rate limiting

### Container Management
- Reuse containers when possible
- Implement container pooling
- Monitor resource usage
- Set appropriate timeout limits

## Development Notes

**IMPORTANT Backend Principles:**
- Always follow domain-driven design principles
- Keep controllers thin - they should only handle HTTP concerns
- Put business logic in services with proper validation
- Authorization happens in services, not middleware
- Routes must be minimal with NO database logic
- Use dependency injection for testability
- Maintain clear separation between domains
- Services may call other domain services when needed
- Frontend API routes should be thin proxies to backend domains
- Always validate inputs using Zod schemas
- Handle errors gracefully with proper error types
- Use TypeScript strictly - no `any` types unless absolutely necessary