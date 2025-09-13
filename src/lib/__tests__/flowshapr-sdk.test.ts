/**
 * Tests for FlowShapr SDK
 *
 * This test suite verifies that our FlowShapr SDK works correctly and
 * maintains compatibility with Genkit's client API.
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import {
  runFlow,
  streamFlow,
  buildFlowUrl,
  FlowshaprClient,
  flowshapr
} from '@flowshapr/client';

// Mock fetch for testing
const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
global.fetch = mockFetch;

describe('FlowShapr SDK', () => {
  const baseUrl = 'http://localhost:3000';
  const flowAlias = 'test-flow';
  const testInput = 'Hello, SDK!';
  const testOutput = 'SDK response';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('runFlow function', () => {
    it('should execute flow successfully with alias', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => testOutput,
      } as Response);

      const result = await runFlow(flowAlias, testInput, { baseUrl });

      expect(result).toBe(testOutput);
      const expectedUrl = `${baseUrl}/api/flows/by-alias/${flowAlias}/execute`;
      expect(mockFetch).toHaveBeenCalledWith(expectedUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testInput),
        signal: undefined,
      });
    });

    it('should handle authentication headers', async () => {
      const authToken = 'test-token';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => testOutput,
      } as Response);

      await runFlow(flowAlias, testInput, {
        baseUrl,
        headers: { Authorization: `Bearer ${authToken}` },
      });

      const expectedUrl = `${baseUrl}/api/flows/by-alias/${flowAlias}/execute`;
      expect(mockFetch).toHaveBeenCalledWith(expectedUrl, expect.objectContaining({
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
      }));
    });

    it('should handle timeout option', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => testOutput,
      } as Response);

      await runFlow(flowAlias, testInput, { baseUrl, timeout: 10000 });

      const expectedUrl = `${baseUrl}/api/flows/by-alias/${flowAlias}/execute`;
      expect(mockFetch).toHaveBeenCalledWith(expectedUrl, expect.objectContaining({
        signal: expect.any(AbortSignal),
      }));
    });

    it('should handle errors correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => ({ error: 'Validation failed' }),
      } as Response);

      await expect(runFlow(flowAlias, testInput, { baseUrl })).rejects.toThrow('Validation failed');
    });

    it('should use default production base URL', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => testOutput,
      } as Response);

      await runFlow(flowAlias, testInput);

      const expectedUrl = `https://app.flowshapr.ai/api/flows/by-alias/${flowAlias}/execute`;
      expect(mockFetch).toHaveBeenCalledWith(expectedUrl, expect.any(Object));
    });
  });

  describe('streamFlow function', () => {
    it('should handle non-streaming response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => testOutput,
      } as Response);

      const stream = streamFlow(flowAlias, testInput, { baseUrl });
      const chunks = [];

      for await (const chunk of stream) {
        chunks.push(chunk);
      }

      expect(chunks).toEqual([testOutput]);
    });

    it('should include streaming headers', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => testOutput,
      } as Response);

      const stream = streamFlow(flowAlias, testInput, { baseUrl });

      // Consume stream to trigger request
      for await (const chunk of stream) {
        // Just consume
      }

      const expectedUrl = `${baseUrl}/api/flows/by-alias/${flowAlias}/execute`;
      expect(mockFetch).toHaveBeenCalledWith(expectedUrl, expect.objectContaining({
        headers: expect.objectContaining({
          'Accept': 'text/event-stream',
        }),
      }));
    });
  });

  describe('buildFlowUrl utility', () => {
    it('should build correct flow URLs', () => {
      expect(buildFlowUrl(baseUrl, flowAlias)).toBe(
        'http://localhost:3000/api/flows/by-alias/test-flow/execute'
      );
    });

    it('should handle trailing slashes in base URL', () => {
      expect(buildFlowUrl('http://localhost:3000/', flowAlias)).toBe(
        'http://localhost:3000/api/flows/by-alias/test-flow/execute'
      );
    });

    it('should handle special characters in flow alias', () => {
      expect(buildFlowUrl(baseUrl, 'my-special-flow_v2')).toBe(
        'http://localhost:3000/api/flows/by-alias/my-special-flow_v2/execute'
      );
    });
  });

  describe('FlowshaprClient class', () => {
    let client: FlowshaprClient;

    beforeEach(() => {
      client = new FlowshaprClient({ baseUrl });
    });

    it('should create client with base URL', () => {
      expect(client).toBeInstanceOf(FlowshaprClient);
    });

    it('should execute flow by alias', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => testOutput,
      } as Response);

      const result = await client.runFlow(flowAlias, testInput);

      expect(result).toBe(testOutput);
      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/api/flows/by-alias/${flowAlias}/execute`,
        expect.any(Object)
      );
    });

    it('should stream flow by alias', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => testOutput,
      } as Response);

      const stream = client.streamFlow(flowAlias, testInput);
      const chunks = [];

      for await (const chunk of stream) {
        chunks.push(chunk);
      }

      expect(chunks).toEqual([testOutput]);
    });

    it('should set authentication header', async () => {
      const authToken = 'client-auth-token';
      client.setAuth(authToken);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => testOutput,
      } as Response);

      await client.runFlow(flowAlias, testInput);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${authToken}`,
          }),
        })
      );
    });

    it('should set timeout', async () => {
      const timeoutMs = 15000;
      client.setTimeout(timeoutMs);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => testOutput,
      } as Response);

      await client.runFlow(flowAlias, testInput);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          signal: expect.any(AbortSignal),
        })
      );
    });

    it('should merge default options with call options', async () => {
      client.setAuth('default-token');
      client.setTimeout(10000);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => testOutput,
      } as Response);

      await client.runFlow(flowAlias, testInput, {
        headers: { 'Custom-Header': 'custom-value' },
        timeout: 20000, // Should override default timeout
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer default-token',
            'Custom-Header': 'custom-value',
          }),
          signal: expect.any(AbortSignal), // Should use the overridden timeout
        })
      );
    });

    it('should handle base URL with trailing slash', () => {
      const clientWithSlash = new FlowshaprClient('http://localhost:3000/');

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => testOutput,
      } as Response);

      clientWithSlash.runFlow(flowAlias, testInput);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/flows/by-alias/test-flow/execute',
        expect.any(Object)
      );
    });
  });

  describe('flowshapr default export', () => {
    it('should provide all SDK functions', () => {
      expect(flowshapr.runFlow).toBe(runFlow);
      expect(flowshapr.streamFlow).toBe(streamFlow);
      expect(flowshapr.buildFlowUrl).toBe(buildFlowUrl);
      expect(typeof flowshapr.createClient).toBe('function');
    });

    it('should create client instances', () => {
      const client = flowshapr.createClient({ baseUrl });
      expect(client).toBeInstanceOf(FlowshaprClient);
    });

    it('should create client with default options', () => {
      const defaultOptions = {
        baseUrl,
        headers: { 'Default-Header': 'default-value' },
        timeout: 30000,
      };

      const client = flowshapr.createClient(defaultOptions);
      expect(client).toBeInstanceOf(FlowshaprClient);

      // Verify default options are applied
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => testOutput,
      } as Response);

      client.runFlow(flowAlias, testInput);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Default-Header': 'default-value',
          }),
          signal: expect.any(AbortSignal),
        })
      );
    });
  });

  describe('Error handling', () => {
    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(runFlow(flowAlias, testInput, { baseUrl })).rejects.toThrow('Network error');
    });

    it('should handle malformed JSON responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => { throw new Error('Invalid JSON'); },
      } as Response);

      await expect(runFlow(flowAlias, testInput, { baseUrl })).rejects.toThrow(
        'HTTP 500: Internal Server Error'
      );
    });

    it('should handle different error response formats', async () => {
      // Test string error
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'String error message' }),
      } as Response);

      await expect(runFlow(flowAlias, testInput, { baseUrl }))
        .rejects.toThrow('String error message');

      // Test object error with message
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: { message: 'Object error message' } }),
      } as Response);

      await expect(runFlow(flowAlias, testInput, { baseUrl }))
        .rejects.toThrow('Object error message');
    });
  });
});