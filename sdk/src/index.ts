/**
 * FlowShapr SDK - Genkit-compatible client for FlowShapr flows
 *
 * This SDK provides a Genkit-compatible API for executing FlowShapr flows.
 * It matches the API of `genkit/beta/client` for seamless compatibility.
 */

export interface FlowShaprClientOptions {
  headers?: Record<string, string>;
  timeout?: number;
  baseUrl?: string;
  // Legacy support for direct apiKey parameter
  apiKey?: string;
}

/**
 * Run a flow by alias and get the complete result.
 * Compatible with Genkit's runFlow API but with FlowShapr-specific flow alias support.
 *
 * @param flowAlias - The flow alias (slug) to execute
 * @param input - The input data for the flow
 * @param options - Optional configuration (headers, timeout, baseUrl)
 * @returns Promise resolving to the flow output
 */
export async function runFlow<T = any>(
  flowAlias: string,
  input: any,
  options?: FlowShaprClientOptions
): Promise<T> {
  const baseUrl = options?.baseUrl || 'https://app.flowshapr.ai';
  const url = `${baseUrl.replace(/\/$/, '')}/api/flows/by-alias/${flowAlias}/execute`;

  return runFlowByUrl<T>(url, input, options);
}

/**
 * Run a flow by full URL and get the complete result.
 * This is the low-level function that handles the actual HTTP request.
 *
 * @param url - The full flow endpoint URL
 * @param input - The input data for the flow
 * @param options - Optional configuration (headers, timeout)
 * @returns Promise resolving to the flow output
 */
export async function runFlowByUrl<T = any>(
  url: string,
  input: any,
  options?: FlowShaprClientOptions
): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    body: JSON.stringify(input),
    signal: options?.timeout ? AbortSignal.timeout(options.timeout) : undefined,
  });

  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;

    try {
      const errorData = await response.json();
      if (errorData.error) {
        if (typeof errorData.error === 'string') {
          errorMessage = errorData.error;
        } else if (errorData.error.message) {
          errorMessage = errorData.error.message;
        }
      }
    } catch {
      // If we can't parse the error, use the HTTP status message
    }

    throw new Error(errorMessage);
  }

  return await response.json();
}

/**
 * Run a flow by alias and stream the results.
 * Compatible with Genkit's streamFlow API but with FlowShapr-specific flow alias support.
 *
 * @param flowAlias - The flow alias (slug) to execute
 * @param input - The input data for the flow
 * @param options - Optional configuration (headers, timeout, baseUrl)
 * @returns AsyncGenerator yielding stream chunks
 */
export async function* streamFlow<T = any>(
  flowAlias: string,
  input: any,
  options?: FlowShaprClientOptions
): AsyncGenerator<T, void, unknown> {
  const baseUrl = options?.baseUrl || 'https://app.flowshapr.ai';
  const url = `${baseUrl.replace(/\/$/, '')}/api/flows/by-alias/${flowAlias}/execute`;

  yield* streamFlowByUrl<T>(url, input, options);
}

/**
 * Run a flow by full URL and stream the results.
 * This is the low-level function that handles the actual streaming HTTP request.
 *
 * @param url - The full flow endpoint URL
 * @param input - The input data for the flow
 * @param options - Optional configuration (headers, timeout)
 * @returns AsyncGenerator yielding stream chunks
 */
export async function* streamFlowByUrl<T = any>(
  url: string,
  input: any,
  options?: FlowShaprClientOptions
): AsyncGenerator<T, void, unknown> {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream',
      ...options?.headers,
    },
    body: JSON.stringify(input),
    signal: options?.timeout ? AbortSignal.timeout(options.timeout) : undefined,
  });

  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;

    try {
      const errorData = await response.json();
      if (errorData.error) {
        if (typeof errorData.error === 'string') {
          errorMessage = errorData.error;
        } else if (errorData.error.message) {
          errorMessage = errorData.error.message;
        }
      }
    } catch {
      // If we can't parse the error, use the HTTP status message
    }

    throw new Error(errorMessage);
  }

  // Check if the response is Server-Sent Events
  const contentType = response.headers.get('content-type');
  if (contentType?.includes('text/event-stream')) {
    // Handle Server-Sent Events streaming
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      throw new Error('Response body is not readable');
    }

    try {
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();

            if (data === '[DONE]') {
              return;
            }

            try {
              const parsed = JSON.parse(data);
              yield parsed;
            } catch (e) {
              // Skip malformed JSON
              console.warn('Failed to parse SSE data:', data);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  } else {
    // Non-streaming response - yield the complete result
    const result = await response.json();
    yield result;
  }
}

/**
 * Helper function to construct flow URLs
 */
export function buildFlowUrl(baseUrl: string, flowAlias: string): string {
  const base = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  return `${base}/api/flows/by-alias/${flowAlias}/execute`;
}

/**
 * FlowShapr client class for managing multiple flows with persistent configuration
 */
export class FlowshaprClient {
  private baseUrl: string;
  private defaultOptions: FlowShaprClientOptions;

  constructor(options: FlowShaprClientOptions = {}) {
    this.baseUrl = (options.baseUrl || 'https://app.flowshapr.ai').replace(/\/$/, '');
    this.defaultOptions = { ...options };

    // Handle legacy apiKey parameter by adding it to headers
    if (options.apiKey) {
      this.defaultOptions.headers = {
        ...this.defaultOptions.headers,
        Authorization: `Bearer ${options.apiKey}`,
      };
    }
  }

  /**
   * Run a flow by alias
   */
  async runFlow<T = any>(
    flowAlias: string,
    input: any,
    options?: Omit<FlowShaprClientOptions, 'baseUrl'>
  ): Promise<T> {
    const mergedOptions = {
      ...this.defaultOptions,
      ...options,
      baseUrl: this.baseUrl
    };
    return runFlow<T>(flowAlias, input, mergedOptions);
  }

  /**
   * Stream a flow by alias
   */
  streamFlow<T = any>(
    flowAlias: string,
    input: any,
    options?: Omit<FlowShaprClientOptions, 'baseUrl'>
  ): AsyncGenerator<T, void, unknown> {
    const mergedOptions = {
      ...this.defaultOptions,
      ...options,
      baseUrl: this.baseUrl
    };
    return streamFlow<T>(flowAlias, input, mergedOptions);
  }

  /**
   * Set default authentication header
   */
  setAuth(token: string): void {
    this.defaultOptions.headers = {
      ...this.defaultOptions.headers,
      Authorization: `Bearer ${token}`,
    };
  }

  /**
   * Set default timeout
   */
  setTimeout(timeout: number): void {
    this.defaultOptions.timeout = timeout;
  }

  // Backward compatibility methods for existing users
  /**
   * @deprecated Use runFlow instead. This method is kept for backward compatibility.
   */
  async runByAlias<T = any>(alias: string, input: any, options?: { signal?: AbortSignal }): Promise<{success: boolean, result?: T, error?: any}> {
    try {
      const result = await this.runFlow<T>(alias, input, { timeout: options?.signal ? undefined : this.defaultOptions.timeout });
      return { success: true, result };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : error
      };
    }
  }

  /**
   * @deprecated Use runFlow with flow ID instead. This method is kept for backward compatibility.
   */
  async runById<T = any>(flowId: string, input: any, options?: { signal?: AbortSignal }): Promise<{success: boolean, result?: T, error?: any}> {
    try {
      const url = `${this.baseUrl}/api/flows/${encodeURIComponent(flowId)}/execute`;
      const result = await runFlowByUrl<T>(url, input, {
        ...this.defaultOptions,
        timeout: options?.signal ? undefined : this.defaultOptions.timeout
      });
      return { success: true, result };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : error
      };
    }
  }
}

// Export default client instance and convenience functions
export const flowshapr = {
  runFlow,
  streamFlow,
  runFlowByUrl,
  streamFlowByUrl,
  buildFlowUrl,
  createClient: (options?: FlowShaprClientOptions) => new FlowshaprClient(options),

  // Convenience functions with default production base URL
  production: {
    runFlow: (flowAlias: string, input: any, options?: Omit<FlowShaprClientOptions, 'baseUrl'>) =>
      runFlow(flowAlias, input, { ...options, baseUrl: 'https://app.flowshapr.ai' }),
    streamFlow: (flowAlias: string, input: any, options?: Omit<FlowShaprClientOptions, 'baseUrl'>) =>
      streamFlow(flowAlias, input, { ...options, baseUrl: 'https://app.flowshapr.ai' }),
  },

  // Convenience functions for local development
  local: {
    runFlow: (flowAlias: string, input: any, options?: Omit<FlowShaprClientOptions, 'baseUrl'>) =>
      runFlow(flowAlias, input, { ...options, baseUrl: 'http://localhost:3000' }),
    streamFlow: (flowAlias: string, input: any, options?: Omit<FlowShaprClientOptions, 'baseUrl'>) =>
      streamFlow(flowAlias, input, { ...options, baseUrl: 'http://localhost:3000' }),
  },
};