#!/usr/bin/env tsx

/**
 * Genkit Client Compatibility Tests
 *
 * This testapp validates that FlowShapr endpoints are compatible with
 * the official Genkit client library by comparing:
 * - Request/response format compatibility
 * - Error handling parity
 * - Streaming behavior
 * - Authentication methods
 */

import { runFlow as genkitRunFlow, streamFlow as genkitStreamFlow } from 'genkit/client';
import { FlowshaprClient, runFlow as flowshaprRunFlow, streamFlow as flowshaprStreamFlow } from '@flowshapr/client';

interface TestResult {
  name: string;
  success: boolean;
  error?: string;
  details?: string;
}

class CompatibilityTester {
  private results: TestResult[] = [];

  async runTest(name: string, testFn: () => Promise<void>): Promise<void> {
    console.log(`🧪 Running compatibility test: ${name}`);

    try {
      await testFn();
      this.results.push({ name, success: true });
      console.log(`✅ Compatible: ${name}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.results.push({ name, success: false, error: errorMessage });
      console.log(`❌ Incompatible: ${name} - ${errorMessage}`);
    }
  }

  printSummary(): void {
    const total = this.results.length;
    const compatible = this.results.filter(r => r.success).length;
    const incompatible = total - compatible;

    console.log('\n' + '='.repeat(60));
    console.log(`📊 Compatibility Summary: ${compatible}/${total} tests passed`);

    if (incompatible > 0) {
      console.log('\n⚠️  Compatibility Issues:');
      this.results
        .filter(r => !r.success)
        .forEach(r => console.log(`  • ${r.name}: ${r.error}`));
    }

    console.log('='.repeat(60));
    process.exit(incompatible > 0 ? 1 : 0);
  }
}

const tester = new CompatibilityTester();

// Test configuration
const TEST_FLOW_ID = process.env.TEST_FLOW_ID || 'test-flow-123';
const TEST_FLOW_ALIAS = process.env.TEST_FLOW_ALIAS || 'test-flow';
const TEST_API_KEY = process.env.TEST_API_KEY || 'test-key-123';
const FLOWSHAPR_BASE_URL = 'http://localhost:3000';

// Mock server for testing - simulates FlowShapr responses
function createMockServer(responses: Map<string, any>) {
  const originalFetch = global.fetch;

  global.fetch = async (url: any, options: any) => {
    const urlString = typeof url === 'string' ? url : url.toString();

    // Route to appropriate mock response
    for (const [pattern, response] of responses) {
      if (urlString.includes(pattern)) {
        if (typeof response === 'function') {
          return response(urlString, options);
        } else {
          return new Response(JSON.stringify(response), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      }
    }

    // Default response
    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  };

  return () => {
    global.fetch = originalFetch;
  };
}

async function main() {
  console.log('🚀 Starting Genkit Client Compatibility Tests\n');

  // Test 1: Request format compatibility
  await tester.runTest('Request format compatibility', async () => {
    let genkitRequest: any = null;
    let flowshaprRequest: any = null;

    const cleanup = createMockServer(new Map([
      ['/flows/', (url: string, options: any) => {
        if (url.includes('genkit') || url.includes(TEST_FLOW_ID)) {
          genkitRequest = { url, options };
        } else {
          flowshaprRequest = { url, options };
        }
        return new Response(JSON.stringify('test response'), { status: 200 });
      }]
    ]));

    try {
      const testInput = { message: 'Hello compatibility test!' };

      // Test FlowShapr SDK request format
      await flowshaprRunFlow(TEST_FLOW_ALIAS, testInput, {
        baseUrl: FLOWSHAPR_BASE_URL,
        headers: { Authorization: `Bearer ${TEST_API_KEY}` }
      });

      // Test Genkit client request format (mock URL)
      await genkitRunFlow({
        url: `${FLOWSHAPR_BASE_URL}/api/genkit/${TEST_FLOW_ID}`,
        input: testInput,
        auth: { token: TEST_API_KEY }
      });

      // Compare request structures
      if (!genkitRequest || !flowshaprRequest) {
        throw new Error('Failed to capture both request formats');
      }

      // Verify both use POST method
      if (genkitRequest.options?.method !== 'POST' || flowshaprRequest.options?.method !== 'POST') {
        throw new Error('Request methods do not match - both should use POST');
      }

      // Verify both send JSON content type
      const genkitContentType = genkitRequest.options?.headers?.['Content-Type'];
      const flowshaprContentType = flowshaprRequest.options?.headers?.['Content-Type'];

      if (genkitContentType !== 'application/json' || flowshaprContentType !== 'application/json') {
        throw new Error('Content-Type headers do not match - both should use application/json');
      }

      // Verify both send JSON body
      const genkitBody = JSON.parse(genkitRequest.options?.body || '{}');
      const flowshaprBody = JSON.parse(flowshaprRequest.options?.body || '{}');

      if (JSON.stringify(genkitBody) !== JSON.stringify(flowshaprBody)) {
        console.log('Genkit body:', genkitBody);
        console.log('FlowShapr body:', flowshaprBody);
        throw new Error('Request body formats differ');
      }

    } finally {
      cleanup();
    }
  });

  // Test 2: Response format compatibility
  await tester.runTest('Response format compatibility', async () => {
    const testResponse = { result: 'Hello from flow!', metadata: { timestamp: Date.now() } };

    const cleanup = createMockServer(new Map([
      ['flows', testResponse]
    ]));

    try {
      const flowshaprResult = await flowshaprRunFlow(TEST_FLOW_ALIAS, 'test', {
        baseUrl: FLOWSHAPR_BASE_URL
      });

      const genkitResult = await genkitRunFlow({
        url: `${FLOWSHAPR_BASE_URL}/api/genkit/flows/test`,
        input: 'test'
      });

      if (JSON.stringify(flowshaprResult) !== JSON.stringify(genkitResult)) {
        throw new Error('Response formats differ between Genkit and FlowShapr clients');
      }

    } finally {
      cleanup();
    }
  });

  // Test 3: Error handling compatibility
  await tester.runTest('Error handling compatibility', async () => {
    const cleanup = createMockServer(new Map([
      ['flows', () => new Response(
        JSON.stringify({ error: 'Test error message' }),
        { status: 400, statusText: 'Bad Request' }
      )]
    ]));

    try {
      let flowshaprError: Error | null = null;
      let genkitError: Error | null = null;

      // Test FlowShapr error handling
      try {
        await flowshaprRunFlow(TEST_FLOW_ALIAS, 'test', { baseUrl: FLOWSHAPR_BASE_URL });
      } catch (error) {
        flowshaprError = error as Error;
      }

      // Test Genkit error handling
      try {
        await genkitRunFlow({
          url: `${FLOWSHAPR_BASE_URL}/api/genkit/flows/test`,
          input: 'test'
        });
      } catch (error) {
        genkitError = error as Error;
      }

      if (!flowshaprError || !genkitError) {
        throw new Error('Both clients should throw errors for 400 responses');
      }

      // Both should extract the error message from the response
      if (!flowshaprError.message.includes('Test error message') ||
          !genkitError.message.includes('Test error message')) {
        throw new Error('Error message extraction differs between clients');
      }

    } finally {
      cleanup();
    }
  });

  // Test 4: Authentication compatibility
  await tester.runTest('Authentication compatibility', async () => {
    let genkitAuth: string | undefined;
    let flowshaprAuth: string | undefined;

    const cleanup = createMockServer(new Map([
      ['flows', (url: string, options: any) => {
        const authHeader = options.headers?.Authorization;
        if (url.includes('genkit')) {
          genkitAuth = authHeader;
        } else {
          flowshaprAuth = authHeader;
        }
        return new Response(JSON.stringify('authenticated'), { status: 200 });
      }]
    ]));

    try {
      // Test FlowShapr authentication
      await flowshaprRunFlow(TEST_FLOW_ALIAS, 'test', {
        baseUrl: FLOWSHAPR_BASE_URL,
        headers: { Authorization: `Bearer ${TEST_API_KEY}` }
      });

      // Test Genkit authentication
      await genkitRunFlow({
        url: `${FLOWSHAPR_BASE_URL}/api/genkit/flows/test`,
        input: 'test',
        auth: { token: TEST_API_KEY }
      });

      // Both should use Bearer token format
      const expectedAuth = `Bearer ${TEST_API_KEY}`;

      if (flowshaprAuth !== expectedAuth || genkitAuth !== expectedAuth) {
        throw new Error(`Authentication headers differ: FlowShapr="${flowshaprAuth}", Genkit="${genkitAuth}"`);
      }

    } finally {
      cleanup();
    }
  });

  // Test 5: Streaming compatibility structure
  await tester.runTest('Streaming compatibility structure', async () => {
    const cleanup = createMockServer(new Map([
      ['flows', () => new Response(
        JSON.stringify({ chunk: 'test streaming data' }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      )]
    ]));

    try {
      // Test FlowShapr streaming
      const flowshaprStream = flowshaprStreamFlow(TEST_FLOW_ALIAS, 'test', {
        baseUrl: FLOWSHAPR_BASE_URL
      });

      // Test Genkit streaming
      const genkitStream = genkitStreamFlow({
        url: `${FLOWSHAPR_BASE_URL}/api/genkit/flows/test`,
        input: 'test'
      });

      // Both should be async iterators
      if (typeof flowshaprStream[Symbol.asyncIterator] !== 'function') {
        throw new Error('FlowShapr streamFlow does not return async iterator');
      }

      if (typeof genkitStream[Symbol.asyncIterator] !== 'function') {
        throw new Error('Genkit streamFlow does not return async iterator');
      }

      // Test that both can be consumed
      const flowshaprChunks = [];
      for await (const chunk of flowshaprStream) {
        flowshaprChunks.push(chunk);
        break; // Just test first chunk
      }

      const genkitChunks = [];
      for await (const chunk of genkitStream) {
        genkitChunks.push(chunk);
        break; // Just test first chunk
      }

      if (flowshaprChunks.length === 0 || genkitChunks.length === 0) {
        throw new Error('One or both streams did not yield data');
      }

    } finally {
      cleanup();
    }
  });

  tester.printSummary();
}

// Only run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('💥 Compatibility test runner crashed:', error);
    process.exit(1);
  });
}