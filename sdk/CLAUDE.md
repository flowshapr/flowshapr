# SDK CLAUDE.md

This file provides guidance to Claude Code when working with the **Flowshapr Client SDK** (`@flowshapr/client`).

## SDK Overview

The Flowshapr Client SDK is a TypeScript/JavaScript library that provides a **Genkit-compatible API** for executing Flowshapr AI flows. It offers both streaming and non-streaming execution with built-in error handling and authentication support.

## Commands

```bash
# Development
npm run build        # Compile TypeScript to JavaScript
npm run dev          # Run example with hot reload
npm run prepublishOnly # Build before publishing

# Testing the SDK
tsx examples/run-sample.ts

# From workspace root
npm run build --workspace=sdk
```

## Architecture

The SDK provides multiple ways to interact with Flowshapr flows:

### Core Functions
- **`runFlow()`**: Execute flows by alias (non-streaming)
- **`streamFlow()`**: Execute flows by alias (streaming)
- **`runFlowByUrl()`**: Execute flows by direct URL (non-streaming)
- **`streamFlowByUrl()`**: Execute flows by direct URL (streaming)

### Client Classes
- **`FlowshaprClient`**: Class-based client with persistent configuration
- **`flowshapr`**: Namespace with convenience functions and environment presets

## Key Files and Structure

```
sdk/
├── src/
│   └── index.ts              # Main SDK implementation
├── dist/                     # Compiled JavaScript output
├── examples/
│   ├── run-sample.ts         # Example implementation
│   ├── run-sample.js         # Compiled example
│   └── run-sample.d.ts       # Type definitions
├── package.json              # Package configuration
├── tsconfig.json            # TypeScript configuration
├── README.md                # SDK documentation
└── LICENSE                  # MIT license
```

## API Reference

### Function-Based API

#### Basic Flow Execution
```typescript
import { runFlow } from '@flowshapr/client';

// Execute a flow by alias
const result = await runFlow('my-flow-alias', {
  text: 'Hello, world!'
});

console.log(result); // Flow output
```

#### Streaming Flow Execution
```typescript
import { streamFlow } from '@flowshapr/client';

// Stream a flow by alias
for await (const chunk of streamFlow('my-flow-alias', {
  text: 'Hello, world!'
})) {
  console.log('Chunk:', chunk);
}
```

#### Advanced Options
```typescript
import { runFlow } from '@flowshapr/client';

const result = await runFlow('my-flow-alias', input, {
  baseUrl: 'https://app.flowshapr.ai',  // Custom base URL
  timeout: 30000,                       // Request timeout (30s)
  headers: {                           // Custom headers
    'Authorization': 'Bearer your-api-key',
    'X-Custom-Header': 'value'
  }
});
```

### Class-Based API

#### FlowshaprClient Class
```typescript
import { FlowshaprClient } from '@flowshapr/client';

// Create client with default configuration
const client = new FlowshaprClient({
  baseUrl: 'https://app.flowshapr.ai',
  timeout: 30000,
  headers: {
    'Authorization': 'Bearer your-api-key'
  }
});

// Execute flows with persistent config
const result = await client.runFlow('my-flow-alias', input);

// Stream flows with persistent config
for await (const chunk of client.streamFlow('streaming-flow', input)) {
  console.log('Chunk:', chunk);
}

// Update authentication
client.setAuth('new-api-key');

// Update timeout
client.setTimeout(60000);
```

### Convenience Functions

#### Environment Presets
```typescript
import { flowshapr } from '@flowshapr/client';

// Production environment
const result = await flowshapr.production.runFlow('flow-alias', input);

// Local development
const result = await flowshapr.local.runFlow('flow-alias', input);

// Create custom client
const client = flowshapr.createClient({
  baseUrl: 'https://my-custom-domain.com'
});
```

## Configuration Options

### FlowShaprClientOptions Interface
```typescript
export interface FlowShaprClientOptions {
  headers?: Record<string, string>;     // Custom HTTP headers
  timeout?: number;                     // Request timeout in milliseconds
  baseUrl?: string;                     // Base URL for the Flowshapr instance
  apiKey?: string;                      // Legacy API key support
}
```

### Default Values
- **baseUrl**: `https://app.flowshapr.ai`
- **timeout**: No default (uses fetch default)
- **headers**: `{ 'Content-Type': 'application/json' }`

## Authentication

### API Key Authentication
```typescript
// Method 1: Using apiKey option (legacy)
const client = new FlowshaprClient({
  apiKey: 'your-api-key'
});

// Method 2: Using Authorization header (recommended)
const client = new FlowshaprClient({
  headers: {
    'Authorization': 'Bearer your-api-key'
  }
});

// Method 3: Set auth after creation
const client = new FlowshaprClient();
client.setAuth('your-api-key');
```

### Session-Based Authentication
```typescript
// When running from browser with session cookies
const result = await runFlow('flow-alias', input, {
  // Session cookies will be included automatically
  baseUrl: 'https://app.flowshapr.ai'
});
```

## Error Handling

### Basic Error Handling
```typescript
import { runFlow } from '@flowshapr/client';

try {
  const result = await runFlow('my-flow', input);
  console.log('Success:', result);
} catch (error) {
  console.error('Flow execution failed:', error.message);
  // Error message includes HTTP status and server error details
}
```

### Advanced Error Handling
```typescript
import { runFlow } from '@flowshapr/client';

try {
  const result = await runFlow('my-flow', input);
  console.log('Success:', result);
} catch (error) {
  if (error.message.includes('404')) {
    console.error('Flow not found or not published');
  } else if (error.message.includes('401')) {
    console.error('Authentication required');
  } else if (error.message.includes('403')) {
    console.error('Permission denied');
  } else {
    console.error('Unexpected error:', error.message);
  }
}
```

### Timeout Handling
```typescript
try {
  const result = await runFlow('long-running-flow', input, {
    timeout: 60000 // 60 second timeout
  });
} catch (error) {
  if (error.name === 'AbortError') {
    console.error('Request timed out');
  } else {
    console.error('Other error:', error.message);
  }
}
```

## Streaming Support

### Server-Sent Events (SSE)
The SDK automatically detects and handles Server-Sent Events for streaming responses:

```typescript
import { streamFlow } from '@flowshapr/client';

try {
  for await (const chunk of streamFlow('streaming-flow', input)) {
    // Process each chunk as it arrives
    console.log('Received chunk:', chunk);

    // Update UI with partial results
    updateUI(chunk);
  }
  console.log('Streaming complete');
} catch (error) {
  console.error('Streaming failed:', error.message);
}
```

### Non-Streaming Fallback
If the server doesn't support streaming, the SDK automatically falls back to returning the complete result:

```typescript
// This works whether the server supports streaming or not
for await (const chunk of streamFlow('any-flow', input)) {
  // Will yield either:
  // - Multiple chunks (if server supports streaming)
  // - Single complete result (if server doesn't support streaming)
  console.log('Chunk or complete result:', chunk);
}
```

## Genkit Compatibility

The SDK provides a **Genkit-compatible API** that matches `genkit/beta/client`:

### Genkit-Style Usage
```typescript
// This works with both Genkit and Flowshapr
import { runFlow, streamFlow } from '@flowshapr/client';

// Non-streaming execution
const result = await runFlow('flowAlias', input);

// Streaming execution
for await (const chunk of streamFlow('flowAlias', input)) {
  console.log(chunk);
}
```

### Migration from Genkit
```typescript
// Before (Genkit)
import { runFlow, streamFlow } from 'genkit/beta/client';

// After (Flowshapr) - same API!
import { runFlow, streamFlow } from '@flowshapr/client';
```

## Environment Configuration

### Development Environment
```typescript
import { flowshapr } from '@flowshapr/client';

// Local development (http://localhost:3000)
const result = await flowshapr.local.runFlow('flow-alias', input);
```

### Production Environment
```typescript
import { flowshapr } from '@flowshapr/client';

// Production (https://app.flowshapr.ai)
const result = await flowshapr.production.runFlow('flow-alias', input);
```

### Custom Environment
```typescript
const client = new FlowshaprClient({
  baseUrl: 'https://my-custom-instance.com',
  headers: {
    'Authorization': 'Bearer custom-api-key'
  }
});
```

## TypeScript Support

### Generic Type Support
```typescript
// Define expected output type
interface FlowOutput {
  message: string;
  confidence: number;
}

const result = await runFlow<FlowOutput>('my-flow', input);
// result is typed as FlowOutput

// Streaming with types
for await (const chunk of streamFlow<FlowOutput>('my-flow', input)) {
  // chunk is typed as FlowOutput
  console.log(chunk.message, chunk.confidence);
}
```

### Input Validation
```typescript
interface FlowInput {
  text: string;
  options?: {
    temperature?: number;
    maxTokens?: number;
  };
}

// Type-safe input
const input: FlowInput = {
  text: 'Hello, world!',
  options: {
    temperature: 0.7,
    maxTokens: 100
  }
};

const result = await runFlow('my-flow', input);
```

## Testing and Development

### Running Examples
```bash
# Run the included example
npm run dev

# Or run directly
tsx examples/run-sample.ts
```

### Example Implementation
```typescript
// examples/run-sample.ts
import { runFlow, streamFlow } from '../src/index.js';

async function testFlow() {
  try {
    console.log('Testing non-streaming execution...');
    const result = await runFlow('test-flow', { text: 'Hello!' }, {
      baseUrl: 'http://localhost:3000',
      timeout: 30000
    });
    console.log('Result:', result);

    console.log('Testing streaming execution...');
    for await (const chunk of streamFlow('test-flow', { text: 'Hello!' }, {
      baseUrl: 'http://localhost:3000'
    })) {
      console.log('Chunk:', chunk);
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testFlow();
```

## Build and Distribution

### Building the SDK
```bash
# Compile TypeScript
npm run build

# Output structure
dist/
├── index.js         # Compiled JavaScript
└── index.d.ts       # Type definitions
```

### Publishing
```bash
# Build and publish to npm
npm run prepublishOnly  # Builds automatically
npm publish
```

### Package Configuration
The SDK is configured as an **ES module** with:
- **main**: `dist/index.js`
- **types**: `dist/index.d.ts`
- **exports**: Modern Node.js resolution
- **files**: Only includes `dist/`, `README.md`, `LICENSE`

## Best Practices

### Client Configuration
1. **Create once, reuse**: Use `FlowshaprClient` class for multiple flow executions
2. **Environment-specific clients**: Use different clients for dev/staging/production
3. **Authentication management**: Store API keys securely, use environment variables
4. **Timeout configuration**: Set appropriate timeouts for your use case

### Error Handling
1. **Wrap in try-catch**: Always handle potential errors
2. **Check error messages**: Parse HTTP status codes for specific error handling
3. **Implement retries**: For transient network errors
4. **Log appropriately**: Log errors for debugging but not sensitive data

### Performance
1. **Reuse client instances**: Don't create new clients for each request
2. **Use streaming**: For long-running or real-time flows
3. **Set timeouts**: Prevent hanging requests
4. **Handle large payloads**: Consider chunking large inputs

### Security
1. **Secure API keys**: Never expose API keys in client-side code
2. **Use HTTPS**: Always use secure connections in production
3. **Validate inputs**: Sanitize data before sending to flows
4. **Handle sensitive data**: Be careful with logging and error messages

## Development Guidelines

### Adding New Features
1. **Maintain Genkit compatibility**: Ensure new features don't break the Genkit-compatible API
2. **Add TypeScript types**: All new functions should have proper type definitions
3. **Update examples**: Add usage examples for new features
4. **Test thoroughly**: Test with both streaming and non-streaming flows

### API Design Principles
1. **Backward compatibility**: Don't break existing APIs
2. **Type safety**: Use TypeScript generics for input/output typing
3. **Error clarity**: Provide clear, actionable error messages
4. **Flexibility**: Support multiple authentication and configuration methods

## Development Notes

**IMPORTANT SDK Principles:**
- Maintain Genkit API compatibility at all times
- Use TypeScript strictly - provide complete type definitions
- Handle both streaming and non-streaming responses gracefully
- Provide clear error messages with actionable information
- Support multiple authentication methods (API keys, sessions)
- Keep the API simple but flexible
- Include comprehensive examples and documentation
- Test with real Flowshapr instances during development
- Follow semantic versioning for releases
- Ensure browser and Node.js compatibility