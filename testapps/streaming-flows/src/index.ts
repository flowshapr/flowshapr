#!/usr/bin/env tsx

/**
 * FlowShapr Streaming Integration Tests
 *
 * This testapp validates streaming capabilities including:
 * - Server-Sent Events (SSE) streaming
 * - Non-streaming fallback behavior
 * - Timeout handling in streams
 * - Error handling during streaming
 * - Stream consumption patterns
 * - Backpressure and buffering
 */

import { FlowshaprClient, streamFlow } from '@flowshapr/client';

interface TestResult {
  name: string;
  success: boolean;
  error?: string;
  duration?: number;
  details?: any;
}

class StreamingTester {
  private results: TestResult[] = [];

  async runTest(name: string, testFn: () => Promise<void>): Promise<void> {
    const startTime = Date.now();
    console.log(`🌊 Running streaming test: ${name}`);

    try {
      await testFn();
      const duration = Date.now() - startTime;
      this.results.push({ name, success: true, duration });
      console.log(`✅ Stream test passed: ${name} (${duration}ms)`);
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.results.push({ name, success: false, error: errorMessage, duration });
      console.log(`❌ Stream test failed: ${name} (${duration}ms) - ${errorMessage}`);
    }
  }

  printSummary(): void {
    const total = this.results.length;
    const passed = this.results.filter(r => r.success).length;
    const failed = total - passed;

    console.log('\n' + '🌊'.repeat(20));
    console.log(`📊 Streaming Test Summary: ${passed}/${total} passed`);

    if (failed > 0) {
      console.log('\n❌ Failed streaming tests:');
      this.results
        .filter(r => !r.success)
        .forEach(r => console.log(`  • ${r.name}: ${r.error}`));
    }

    const totalDuration = this.results.reduce((sum, r) => sum + (r.duration || 0), 0);
    console.log(`⏱️  Total streaming test duration: ${totalDuration}ms`);
    console.log('🌊'.repeat(20));

    process.exit(failed > 0 ? 1 : 0);
  }
}

const tester = new StreamingTester();

// Test configuration
const TEST_FLOW_ALIAS = process.env.TEST_FLOW_ALIAS || 'streaming-test-flow';
const TEST_API_KEY = process.env.TEST_API_KEY || 'stream-test-key';
const LOCAL_BASE_URL = 'http://localhost:3000';

// Create mock streaming server
function createStreamingMockServer(responses: Map<string, (url: string, options: any) => Response>) {
  const originalFetch = global.fetch;

  global.fetch = async (url: any, options: any) => {
    const urlString = typeof url === 'string' ? url : url.toString();

    for (const [pattern, responseFn] of responses) {
      if (urlString.includes(pattern)) {
        return responseFn(urlString, options);
      }
    }

    return new Response('Not Found', { status: 404 });
  };

  return () => {
    global.fetch = originalFetch;
  };
}

// Helper to create Server-Sent Events response
function createSSEResponse(data: any[]): Response {
  const chunks = data.map(chunk => `data: ${JSON.stringify(chunk)}\n\n`);
  chunks.push('data: [DONE]\n\n');

  const stream = new ReadableStream({
    start(controller) {
      chunks.forEach((chunk, index) => {
        setTimeout(() => {
          controller.enqueue(new TextEncoder().encode(chunk));
          if (index === chunks.length - 1) {
            controller.close();
          }
        }, index * 10); // Small delay between chunks
      });
    }
  });

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  });
}

async function main() {
  console.log('🌊 Starting FlowShapr Streaming Integration Tests\n');

  // Test 1: Server-Sent Events streaming
  await tester.runTest('Server-Sent Events streaming', async () => {
    const streamData = [
      { chunk: 1, text: 'First chunk' },
      { chunk: 2, text: 'Second chunk' },
      { chunk: 3, text: 'Final chunk' }
    ];

    const cleanup = createStreamingMockServer(new Map([
      ['flows', () => createSSEResponse(streamData)]
    ]));

    try {
      const receivedChunks = [];
      const stream = streamFlow(TEST_FLOW_ALIAS, 'streaming test', {
        baseUrl: LOCAL_BASE_URL
      });

      for await (const chunk of stream) {
        receivedChunks.push(chunk);
      }

      if (receivedChunks.length !== streamData.length) {
        throw new Error(`Expected ${streamData.length} chunks, got ${receivedChunks.length}`);
      }

      // Verify chunk content
      for (let i = 0; i < streamData.length; i++) {
        if (JSON.stringify(receivedChunks[i]) !== JSON.stringify(streamData[i])) {
          throw new Error(`Chunk ${i} content mismatch`);
        }
      }
    } finally {
      cleanup();
    }
  });

  // Test 2: Non-streaming response fallback
  await tester.runTest('Non-streaming response fallback', async () => {
    const responseData = { result: 'Complete response', streaming: false };

    const cleanup = createStreamingMockServer(new Map([
      ['flows', () => new Response(JSON.stringify(responseData), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })]
    ]));

    try {
      const chunks = [];
      const stream = streamFlow(TEST_FLOW_ALIAS, 'non-streaming test', {
        baseUrl: LOCAL_BASE_URL
      });

      for await (const chunk of stream) {
        chunks.push(chunk);
      }

      // Should yield exactly one chunk for non-streaming response
      if (chunks.length !== 1) {
        throw new Error(`Expected 1 chunk for non-streaming, got ${chunks.length}`);
      }

      if (JSON.stringify(chunks[0]) !== JSON.stringify(responseData)) {
        throw new Error('Non-streaming chunk content mismatch');
      }
    } finally {
      cleanup();
    }
  });

  // Test 3: Stream error handling
  await tester.runTest('Stream error handling', async () => {
    const cleanup = createStreamingMockServer(new Map([
      ['flows', () => new Response(
        JSON.stringify({ error: 'Stream error occurred' }),
        { status: 500, statusText: 'Internal Server Error' }
      )]
    ]));

    try {
      let errorThrown = false;
      let errorMessage = '';

      try {
        const stream = streamFlow(TEST_FLOW_ALIAS, 'error test', {
          baseUrl: LOCAL_BASE_URL
        });

        for await (const chunk of stream) {
          // Should not reach here
          throw new Error('Stream should have thrown an error');
        }
      } catch (error) {
        errorThrown = true;
        errorMessage = error instanceof Error ? error.message : String(error);
      }

      if (!errorThrown) {
        throw new Error('Expected stream to throw error for 500 response');
      }

      if (!errorMessage.includes('Stream error occurred')) {
        throw new Error(`Expected error message to include 'Stream error occurred', got: ${errorMessage}`);
      }
    } finally {
      cleanup();
    }
  });

  // Test 4: Stream timeout handling
  await tester.runTest('Stream timeout handling', async () => {
    const cleanup = createStreamingMockServer(new Map([
      ['flows', () => {
        // Create a stream that never ends (for timeout testing)
        const stream = new ReadableStream({
          start(controller) {
            // Never close or send data
          }
        });

        return new Response(stream, {
          status: 200,
          headers: { 'Content-Type': 'text/event-stream' }
        });
      }]
    ]));

    try {
      let timeoutError = false;

      try {
        const stream = streamFlow(TEST_FLOW_ALIAS, 'timeout test', {
          baseUrl: LOCAL_BASE_URL,
          timeout: 100 // Very short timeout
        });

        for await (const chunk of stream) {
          // Should timeout before reaching here
        }
      } catch (error) {
        if (error instanceof Error && (
          error.name === 'AbortError' ||
          error.name === 'TimeoutError' ||
          error.message.includes('timeout') ||
          error.message.includes('aborted')
        )) {
          timeoutError = true;
        }
      }

      if (!timeoutError) {
        throw new Error('Expected timeout error for long-running stream');
      }
    } finally {
      cleanup();
    }
  });

  // Test 5: Stream authentication headers
  await tester.runTest('Stream authentication headers', async () => {
    let receivedHeaders: any = {};

    const cleanup = createStreamingMockServer(new Map([
      ['flows', (url: string, options: any) => {
        receivedHeaders = options.headers || {};
        return createSSEResponse([{ authenticated: true }]);
      }]
    ]));

    try {
      const stream = streamFlow(TEST_FLOW_ALIAS, 'auth test', {
        baseUrl: LOCAL_BASE_URL,
        headers: { Authorization: `Bearer ${TEST_API_KEY}` }
      });

      // Consume stream to trigger request
      for await (const chunk of stream) {
        break; // Just need first chunk
      }

      if (receivedHeaders.Authorization !== `Bearer ${TEST_API_KEY}`) {
        throw new Error(`Expected auth header 'Bearer ${TEST_API_KEY}', got '${receivedHeaders.Authorization}'`);
      }

      if (receivedHeaders.Accept !== 'text/event-stream') {
        throw new Error(`Expected Accept header 'text/event-stream', got '${receivedHeaders.Accept}'`);
      }
    } finally {
      cleanup();
    }
  });

  // Test 6: Large stream handling
  await tester.runTest('Large stream handling', async () => {
    // Create a large number of chunks to test buffering
    const largeStreamData = Array.from({ length: 100 }, (_, i) => ({
      chunk: i + 1,
      data: `Chunk ${i + 1} with some data`.repeat(10)
    }));

    const cleanup = createStreamingMockServer(new Map([
      ['flows', () => createSSEResponse(largeStreamData)]
    ]));

    try {
      const receivedChunks = [];
      const stream = streamFlow(TEST_FLOW_ALIAS, 'large stream test', {
        baseUrl: LOCAL_BASE_URL
      });

      for await (const chunk of stream) {
        receivedChunks.push(chunk);
      }

      if (receivedChunks.length !== largeStreamData.length) {
        throw new Error(`Expected ${largeStreamData.length} chunks, got ${receivedChunks.length}`);
      }

      // Verify first and last chunks
      if (receivedChunks[0].chunk !== 1) {
        throw new Error('First chunk is incorrect');
      }

      if (receivedChunks[receivedChunks.length - 1].chunk !== largeStreamData.length) {
        throw new Error('Last chunk is incorrect');
      }
    } finally {
      cleanup();
    }
  });

  // Test 7: Malformed SSE data handling
  await tester.runTest('Malformed SSE data handling', async () => {
    const cleanup = createStreamingMockServer(new Map([
      ['flows', () => {
        const malformedStream = new ReadableStream({
          start(controller) {
            const encoder = new TextEncoder();
            // Send valid data
            controller.enqueue(encoder.encode('data: {"valid": true}\n\n'));
            // Send malformed data
            controller.enqueue(encoder.encode('data: invalid json here\n\n'));
            // Send more valid data
            controller.enqueue(encoder.encode('data: {"valid": "after_malformed"}\n\n'));
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
          }
        });

        return new Response(malformedStream, {
          status: 200,
          headers: { 'Content-Type': 'text/event-stream' }
        });
      }]
    ]));

    try {
      const receivedChunks = [];
      const stream = streamFlow(TEST_FLOW_ALIAS, 'malformed test', {
        baseUrl: LOCAL_BASE_URL
      });

      for await (const chunk of stream) {
        receivedChunks.push(chunk);
      }

      // Should have 2 valid chunks (malformed one should be skipped)
      if (receivedChunks.length !== 2) {
        throw new Error(`Expected 2 valid chunks, got ${receivedChunks.length}`);
      }

      if (receivedChunks[0].valid !== true) {
        throw new Error('First valid chunk incorrect');
      }

      if (receivedChunks[1].valid !== 'after_malformed') {
        throw new Error('Second valid chunk incorrect');
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
    console.error('💥 Streaming test runner crashed:', error);
    process.exit(1);
  });
}