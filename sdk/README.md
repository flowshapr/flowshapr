Flowshapr SDK (Minimal)
-----------------------

- Install deps: `npm i` at repo root, or in `sdk/` run `npm i`.
- Build: `npm run -w sdk build` or from `sdk/` run `npm run build`.
- Example: `BASE_URL=http://localhost:8787 API_KEY=... tsx sdk/examples/run-sample.ts`.

API
---

- `new FlowshaprClient({ baseUrl, apiKey })`
- `runByAlias(alias, input)` → calls `GET /api/flows?search=alias` to resolve id, then `POST /api/flows/:id/execute`.
- `runById(flowId, input)` → directly `POST /api/flows/:id/execute`.

Notes
-----

- Uses Bearer token auth with flow-scoped API keys.
- Requires `execute_flow` scope if your server enforces scopes (otherwise no scopes or matching scopes are accepted).
- Node 18+ has global `fetch`; if using older Node, polyfill `fetch`.

