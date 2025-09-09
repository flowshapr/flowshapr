# Agent Guidelines

This repository follows a Domain-Driven Design (DDD) approach with a clear MVC structure on the server.

- Domains live under `server/src/domains/<domain>` with `controllers`, `services`, and `routes`.
- Routes files must be minimal and only reference controller methods (no DB logic in routes).
- Controllers: request/response handling and orchestration; delegate business logic and data access to services.
- Services: encapsulate domain/business logic and persistence (via Drizzle) and may call other domain services when needed.

Examples:
- `prompts` domain encapsulates prompt CRUD for project- and flow-scoped endpoints via a controller and service.
- `traces` domain encapsulates execution trace listing, retrieval, and persistence; flow routes call the traces controller, and flow execution persists via the traces service.
 - `flows` execution: `FlowRunService` orchestrates execution via `FlowExecutor` and persists traces via `TracesService`. `FlowController.executeFlow` should remain a thin pass-through to the service.
 - `connections` domain stores external provider credentials per flow (with projectId for filtering), with flow-scoped routes.
 - `api-keys` domain manages project-scoped SDK access tokens; projects routes call its controller.
 - `datasets` domain handles project-scoped datasets CRUD; projects routes reference its controller.

Authorization
- Auth middleware (`requireAuth`) authenticates users only. Authorization is enforced in services.
- Central abilities in `server/src/shared/authorization/abilities.ts` define actions across subjects.
- Use `requireUserAbility(userId, action, subject, resource?)` from `shared/authorization/service-guard` at the start of service methods to protect them. This ensures service-to-service calls are also authorized.

Frontend API routes in `src/app/api/**` should stay thin, proxying to backend domain routes and forwarding session cookies consistently.

Connections domain
- Store external model/provider credentials under `connections` domain, scoped to a flow (with `projectId` for filtering).
- Routes under `flows/:id/connections` call `ConnectionsController`; service encapsulates CRUD using the `connection` table.
- `FlowRunService` loads saved connections when none are provided in the execute request.
