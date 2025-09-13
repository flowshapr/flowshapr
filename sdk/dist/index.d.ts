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
export declare function runFlow<T = any>(flowAlias: string, input: any, options?: FlowShaprClientOptions): Promise<T>;
/**
 * Run a flow by full URL and get the complete result.
 * This is the low-level function that handles the actual HTTP request.
 *
 * @param url - The full flow endpoint URL
 * @param input - The input data for the flow
 * @param options - Optional configuration (headers, timeout)
 * @returns Promise resolving to the flow output
 */
export declare function runFlowByUrl<T = any>(url: string, input: any, options?: FlowShaprClientOptions): Promise<T>;
/**
 * Run a flow by alias and stream the results.
 * Compatible with Genkit's streamFlow API but with FlowShapr-specific flow alias support.
 *
 * @param flowAlias - The flow alias (slug) to execute
 * @param input - The input data for the flow
 * @param options - Optional configuration (headers, timeout, baseUrl)
 * @returns AsyncGenerator yielding stream chunks
 */
export declare function streamFlow<T = any>(flowAlias: string, input: any, options?: FlowShaprClientOptions): AsyncGenerator<T, void, unknown>;
/**
 * Run a flow by full URL and stream the results.
 * This is the low-level function that handles the actual streaming HTTP request.
 *
 * @param url - The full flow endpoint URL
 * @param input - The input data for the flow
 * @param options - Optional configuration (headers, timeout)
 * @returns AsyncGenerator yielding stream chunks
 */
export declare function streamFlowByUrl<T = any>(url: string, input: any, options?: FlowShaprClientOptions): AsyncGenerator<T, void, unknown>;
/**
 * Helper function to construct flow URLs
 */
export declare function buildFlowUrl(baseUrl: string, flowAlias: string): string;
/**
 * FlowShapr client class for managing multiple flows with persistent configuration
 */
export declare class FlowshaprClient {
    private baseUrl;
    private defaultOptions;
    constructor(options?: FlowShaprClientOptions);
    /**
     * Run a flow by alias
     */
    runFlow<T = any>(flowAlias: string, input: any, options?: Omit<FlowShaprClientOptions, 'baseUrl'>): Promise<T>;
    /**
     * Stream a flow by alias
     */
    streamFlow<T = any>(flowAlias: string, input: any, options?: Omit<FlowShaprClientOptions, 'baseUrl'>): AsyncGenerator<T, void, unknown>;
    /**
     * Set default authentication header
     */
    setAuth(token: string): void;
    /**
     * Set default timeout
     */
    setTimeout(timeout: number): void;
    /**
     * @deprecated Use runFlow instead. This method is kept for backward compatibility.
     */
    runByAlias<T = any>(alias: string, input: any, options?: {
        signal?: AbortSignal;
    }): Promise<{
        success: boolean;
        result?: T;
        error?: any;
    }>;
    /**
     * @deprecated Use runFlow with flow ID instead. This method is kept for backward compatibility.
     */
    runById<T = any>(flowId: string, input: any, options?: {
        signal?: AbortSignal;
    }): Promise<{
        success: boolean;
        result?: T;
        error?: any;
    }>;
}
export declare const flowshapr: {
    runFlow: typeof runFlow;
    streamFlow: typeof streamFlow;
    runFlowByUrl: typeof runFlowByUrl;
    streamFlowByUrl: typeof streamFlowByUrl;
    buildFlowUrl: typeof buildFlowUrl;
    createClient: (options?: FlowShaprClientOptions) => FlowshaprClient;
    production: {
        runFlow: (flowAlias: string, input: any, options?: Omit<FlowShaprClientOptions, "baseUrl">) => Promise<any>;
        streamFlow: (flowAlias: string, input: any, options?: Omit<FlowShaprClientOptions, "baseUrl">) => AsyncGenerator<any, void, unknown>;
    };
    local: {
        runFlow: (flowAlias: string, input: any, options?: Omit<FlowShaprClientOptions, "baseUrl">) => Promise<any>;
        streamFlow: (flowAlias: string, input: any, options?: Omit<FlowShaprClientOptions, "baseUrl">) => AsyncGenerator<any, void, unknown>;
    };
};
