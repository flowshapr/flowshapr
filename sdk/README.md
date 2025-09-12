# @flowshapr/client

JavaScript/TypeScript client SDK for executing [Flowshapr](https://flowshapr.com) AI flows via API.

## Installation

```bash
npm install @flowshapr/client
```

## Quick Start

```typescript
import { FlowshaprClient } from '@flowshapr/client';

const client = new FlowshaprClient({
  baseUrl: 'https://api.flowshapr.com',
  apiKey: 'your-api-key-here'
});

// Execute a flow by alias
const result = await client.runByAlias('my-flow-alias', {
  message: 'Hello, AI!'
});

console.log(result.result);
```

## API Reference

### FlowshaprClient

#### Constructor

```typescript
new FlowshaprClient(config: ClientConfig)
```

- `config.baseUrl` - The base URL of your Flowshapr instance
- `config.apiKey` - Your flow-scoped API key

#### Methods

##### runByAlias(alias, input, options?)

Execute a flow by its alias.

```typescript
await client.runByAlias('my-flow', { input: 'data' });
```

##### runById(flowId, input, options?)

Execute a flow by its ID.

```typescript
await client.runById('flow-123', { input: 'data' });
```

#### Response Format

All methods return an `ExecuteResponse<T>`:

```typescript
{
  success: boolean;
  result?: T;           // The flow's output
  error?: any;          // Error details if failed
  runtime?: string;     // Execution runtime info
  meta?: any;          // Additional metadata
}
```

## Authentication

This SDK uses Bearer token authentication with flow-scoped API keys. Generate an API key from your Flowshapr dashboard with `execute_flow` scope.

## Requirements

- Node.js 16+ (uses native `fetch`)
- Modern browsers with `fetch` support

## License

MIT

