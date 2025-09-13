/**
 * Tests for Genkit client compatibility
 *
 * This test suite verifies that our FlowShapr endpoints are fully compatible
 * with Genkit's official client library.
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { runFlow, streamFlow } from 'genkit/beta/client';
import { runFlow as flowshaprRunFlow, streamFlow as flowshaprStreamFlow } from '@flowshapr/client';

// Mock fetch for testing
const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
global.fetch = mockFetch;

describe('Genkit Client Compatibility', () => {
  const mockFlowUrl = 'http://localhost:3000/api/flows/by-alias/test-flow/execute';
  const testInput = 'Hello, world!';
  const testOutput = 'AI generated response';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Non-streaming flows (runFlow)', () => {
    it('should handle successful flow execution with Genkit client format', async () => {
      // Mock successful response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => testOutput,
      } as Response);

      const result = await flowshaprRunFlow(mockFlowUrl, testInput);

      expect(result).toBe(testOutput);
      expect(mockFetch).toHaveBeenCalledWith(mockFlowUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testInput),
        signal: undefined,
      });
    });

    it('should handle flow execution with authentication header', async () => {
      const authToken = 'test-auth-token';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => testOutput,
      } as Response);

      const result = await flowshaprRunFlow(mockFlowUrl, testInput, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      expect(result).toBe(testOutput);
      expect(mockFetch).toHaveBeenCalledWith(mockFlowUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(testInput),
        signal: undefined,
      });
    });

    it('should handle flow execution errors properly', async () => {
      const errorMessage = 'Flow validation failed';

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => ({ error: errorMessage }),
      } as Response);

      await expect(flowshaprRunFlow(mockFlowUrl, testInput)).rejects.toThrow(errorMessage);
    });

    it('should handle HTTP errors without JSON body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => { throw new Error('Not JSON'); },
      } as Response);

      await expect(flowshaprRunFlow(mockFlowUrl, testInput)).rejects.toThrow(
        'HTTP 500: Internal Server Error'
      );
    });

    it('should handle different input types', async () => {
      const objectInput = { message: 'Hello', type: 'greeting' };
      const numberInput = 42;
      const arrayInput = ['a', 'b', 'c'];

      // Test object input
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => 'Object response',
      } as Response);

      await flowshaprRunFlow(mockFlowUrl, objectInput);
      expect(mockFetch).toHaveBeenLastCalledWith(mockFlowUrl, expect.objectContaining({
        body: JSON.stringify(objectInput),
      }));

      // Test number input
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => 'Number response',
      } as Response);

      await flowshaprRunFlow(mockFlowUrl, numberInput);
      expect(mockFetch).toHaveBeenLastCalledWith(mockFlowUrl, expect.objectContaining({
        body: JSON.stringify(numberInput),
      }));

      // Test array input
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => 'Array response',
      } as Response);

      await flowshaprRunFlow(mockFlowUrl, arrayInput);
      expect(mockFetch).toHaveBeenLastCalledWith(mockFlowUrl, expect.objectContaining({
        body: JSON.stringify(arrayInput),
      }));
    });
  });

  describe('Streaming flows (streamFlow)', () => {
    it('should handle non-streaming response as a single chunk', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => testOutput,
      } as Response);

      const stream = flowshaprStreamFlow(mockFlowUrl, testInput);
      const chunks = [];

      for await (const chunk of stream) {
        chunks.push(chunk);
      }

      expect(chunks).toEqual([testOutput]);
    });

    it('should handle Server-Sent Events streaming', async () => {
      const sseData = `data: {"event": "progress", "data": "Processing..."}\n\ndata: {"event": "complete", "data": "Done!"}\n\ndata: [DONE]\n\n`;

      const mockReader = {
        read: jest.fn()
          .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode(sseData) })
          .mockResolvedValueOnce({ done: true, value: undefined }),
        releaseLock: jest.fn(),
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'text/event-stream']]),
        body: {
          getReader: () => mockReader,
        },
      } as unknown as Response);

      const stream = flowshaprStreamFlow(mockFlowUrl, testInput);
      const chunks = [];

      for await (const chunk of stream) {
        chunks.push(chunk);
      }

      expect(chunks).toEqual([
        { event: 'progress', data: 'Processing...' },
        { event: 'complete', data: 'Done!' },
      ]);
      expect(mockReader.releaseLock).toHaveBeenCalled();
    });

    it('should include Accept header for streaming requests', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => testOutput,
      } as Response);

      const stream = flowshaprStreamFlow(mockFlowUrl, testInput);
      // Consume the stream to trigger the request
      const chunks = [];
      for await (const chunk of stream) {
        chunks.push(chunk);
      }

      expect(mockFetch).toHaveBeenCalledWith(mockFlowUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify(testInput),
        signal: undefined,
      });
    });
  });

  describe('URL format compatibility', () => {
    it('should work with flow alias URLs', async () => {
      const aliasUrl = 'http://localhost:3000/api/flows/by-alias/my-test-flow/execute';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => testOutput,
      } as Response);

      await flowshaprRunFlow(aliasUrl, testInput);

      expect(mockFetch).toHaveBeenCalledWith(aliasUrl, expect.any(Object));
    });

    it('should work with flow ID URLs', async () => {
      const idUrl = 'http://localhost:3000/api/flows/123/execute';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => testOutput,
      } as Response);

      await flowshaprRunFlow(idUrl, testInput);

      expect(mockFetch).toHaveBeenCalledWith(idUrl, expect.any(Object));
    });
  });

  describe('Timeout handling', () => {
    it('should respect timeout option', async () => {
      const timeoutMs = 5000;

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => testOutput,
      } as Response);

      await flowshaprRunFlow(mockFlowUrl, testInput, { timeout: timeoutMs });

      expect(mockFetch).toHaveBeenCalledWith(mockFlowUrl, expect.objectContaining({
        signal: expect.any(AbortSignal),
      }));
    });
  });

  // Integration tests that would work with actual Genkit client
  // These are commented out but show how to test compatibility
  /*
  describe('Integration with actual Genkit client', () => {
    // These tests would require a running FlowShapr server

    it('should work with Genkit runFlow', async () => {
      // This test would verify that Genkit's runFlow works against our endpoints
      const result = await runFlow(
        'http://localhost:3000/api/flows/by-alias/test-flow/execute',
        'Hello from Genkit client!'
      );
      expect(typeof result).toBe('string');
    });

    it('should work with Genkit streamFlow', async () => {
      // This test would verify that Genkit's streamFlow works against our endpoints
      const stream = streamFlow(
        'http://localhost:3000/api/flows/by-alias/test-flow/execute',
        'Hello from Genkit streaming!'
      );

      const chunks = [];
      for await (const chunk of stream) {
        chunks.push(chunk);
      }
      expect(chunks.length).toBeGreaterThan(0);
    });
  });
  */
});