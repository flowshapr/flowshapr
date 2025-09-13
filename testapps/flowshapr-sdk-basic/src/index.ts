#!/usr/bin/env tsx

/**
 * FlowShapr SDK Basic Integration Tests
 *
 * This testapp validates basic FlowShapr SDK functionality including:
 * - Flow alias execution
 * - Authentication handling
 * - Error scenarios
 * - Local vs production endpoints
 */

import { FlowshaprClient, runFlow } from '@flowshapr/client';

interface TestResult {
  name: string;
  success: boolean;
  error?: string;
  duration?: number;
}

class TestRunner {
  private results: TestResult[] = [];

  async runTest(name: string, testFn: () => Promise<void>): Promise<void> {
    const startTime = Date.now();
    console.log(`🧪 Running test: ${name}`);

    try {
      await testFn();
      const duration = Date.now() - startTime;
      this.results.push({ name, success: true, duration });
      console.log(`✅ Test passed: ${name} (${duration}ms)`);
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.results.push({ name, success: false, error: errorMessage, duration });
      console.log(`❌ Test failed: ${name} (${duration}ms) - ${errorMessage}`);
    }
  }

  printSummary(): void {
    const total = this.results.length;
    const passed = this.results.filter(r => r.success).length;
    const failed = total - passed;

    console.log('\n' + '='.repeat(60));
    console.log(`📊 Test Summary: ${passed}/${total} passed`);

    if (failed > 0) {
      console.log('\n❌ Failed tests:');
      this.results
        .filter(r => !r.success)
        .forEach(r => console.log(`  • ${r.name}: ${r.error}`));
    }

    const totalDuration = this.results.reduce((sum, r) => sum + (r.duration || 0), 0);
    console.log(`⏱️  Total duration: ${totalDuration}ms`);
    console.log('='.repeat(60));

    process.exit(failed > 0 ? 1 : 0);
  }
}

const runner = new TestRunner();

// Test configuration
const TEST_FLOW_ALIAS = process.env.TEST_FLOW_ALIAS || 'test';
const TEST_API_KEY = process.env.TEST_API_KEY || 'test-key-123';
const LOCAL_BASE_URL = 'http://localhost:3000';
const PRODUCTION_BASE_URL = 'https://app.flowshapr.ai';

async function main() {
  console.log('🚀 Starting FlowShapr SDK Basic Integration Tests\n');

  // Test 1: Basic runFlow function (Genkit-compatible API)
  await runner.runTest('Basic runFlow function (Genkit-compatible API)', async () => {
    console.log('🔍 Testing with:', {
      alias: TEST_FLOW_ALIAS,
      baseUrl: LOCAL_BASE_URL,
      hasApiKey: !!TEST_API_KEY,
      apiKeyPrefix: TEST_API_KEY?.substring(0, 10) + '...'
    });

    try {
      const result = await runFlow(
        TEST_FLOW_ALIAS,
        { message: 'Hello FlowShapr!' },
        {
          baseUrl: LOCAL_BASE_URL,
          headers: { Authorization: `Bearer ${TEST_API_KEY}` }
        }
      );
      // Modern SDK returns direct result (Genkit-compatible)
      console.log('✅ SUCCESS! Received result type:', typeof result);
      console.log('✅ Result content:', result);
    } catch (error) {
      console.log('❌ Error details:');
      console.log('  Error type:', typeof error);
      console.log('  Error message:', (error as Error).message);

      // Only fail the test for SDK-level errors, not server errors
      if (error instanceof TypeError || (error as any).code === 'ECONNREFUSED') {
        throw error;
      }

      // This should NOT happen with valid credentials - let's investigate
      console.log('❌ UNEXPECTED: Server error with valid credentials:', (error as Error).message);
      throw new Error(`Unexpected server error with valid credentials: ${(error as Error).message}`);
    }
  });

  // Test 2: Modern SDK URL building and request structure
  await runner.runTest('Modern SDK URL building and request structure', async () => {
    const expectedUrl = `${LOCAL_BASE_URL}/api/flows/by-alias/${TEST_FLOW_ALIAS}/execute`;

    // Mock fetch to capture the URL and request
    const originalFetch = global.fetch;
    let capturedUrl = '';
    let capturedOptions: any = {};

    global.fetch = async (url: any, options: any) => {
      capturedUrl = url;
      capturedOptions = options;
      return new Response(JSON.stringify('test response'), { status: 200 });
    };

    try {
      await runFlow(TEST_FLOW_ALIAS, 'test', {
        baseUrl: LOCAL_BASE_URL,
        headers: { Authorization: `Bearer ${TEST_API_KEY}` }
      });

      if (capturedUrl !== expectedUrl) {
        throw new Error(`Expected URL ${expectedUrl}, got ${capturedUrl}`);
      }

      if (!capturedOptions.headers?.Authorization?.includes(TEST_API_KEY)) {
        throw new Error('Client did not set authorization header correctly');
      }

      // Modern SDK sends direct input format (Genkit-compatible)
      const requestBody = JSON.parse(capturedOptions.body);
      if (requestBody !== 'test') {
        throw new Error(`Expected direct input 'test', got ${JSON.stringify(requestBody)}`);
      }
    } finally {
      global.fetch = originalFetch;
    }
  });

  // Test 3: Response format validation (Direct response)
  await runner.runTest('Response format validation (Direct response)', async () => {
    const originalFetch = global.fetch;

    global.fetch = async () => {
      return new Response(JSON.stringify({ message: 'test result' }), { status: 200 });
    };

    try {
      const response = await runFlow(TEST_FLOW_ALIAS, 'test', {
        baseUrl: LOCAL_BASE_URL,
        headers: { Authorization: `Bearer ${TEST_API_KEY}` }
      });

      // Modern SDK returns direct result
      if (!response || (response as any).message !== 'test result') {
        throw new Error(`Expected direct result with message 'test result', got ${JSON.stringify(response)}`);
      }
    } finally {
      global.fetch = originalFetch;
    }
  });

  // Test 4: Error handling with modern SDK
  await runner.runTest('Error handling with modern SDK', async () => {
    const originalFetch = global.fetch;

    global.fetch = async () => {
      return new Response(JSON.stringify({ error: 'Test error message' }), {
        status: 400,
        statusText: 'Bad Request'
      });
    };

    try {
      await runFlow(TEST_FLOW_ALIAS, 'test', {
        baseUrl: LOCAL_BASE_URL,
        headers: { Authorization: `Bearer ${TEST_API_KEY}` }
      });

      throw new Error('Expected function to throw an error for 400 status');
    } catch (error) {
      // Modern SDK throws errors instead of returning wrapped error format
      if (!(error instanceof Error) || !error.message.includes('Test error message')) {
        throw new Error(`Expected error to contain 'Test error message', got: ${(error as Error).message}`);
      }
    } finally {
      global.fetch = originalFetch;
    }
  });

  // Test 5: Timeout/AbortSignal handling
  await runner.runTest('AbortSignal handling with modern SDK', async () => {
    const originalFetch = global.fetch;
    let signalReceived = false;

    global.fetch = async (url: any, options: any) => {
      if (options.signal instanceof AbortSignal) {
        signalReceived = true;
      }
      return new Response(JSON.stringify('timeout test'), { status: 200 });
    };

    try {
      // Test with timeout (AbortSignal)
      await runFlow(TEST_FLOW_ALIAS, 'test', {
        baseUrl: LOCAL_BASE_URL,
        headers: { Authorization: `Bearer ${TEST_API_KEY}` },
        timeout: 5000
      });

      if (!signalReceived) {
        throw new Error('AbortSignal was not properly passed to fetch');
      }
    } finally {
      global.fetch = originalFetch;
    }
  });

  runner.printSummary();
}

// Only run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('💥 Test runner crashed:', error);
    process.exit(1);
  });
}