export type ExecuteOptions = {
    signal?: AbortSignal;
    metadata?: Record<string, any>;
};
export type ExecuteResponse<T = any> = {
    success: boolean;
    result?: T;
    error?: any;
    runtime?: string;
    meta?: any;
};
export interface ClientConfig {
    baseUrl: string;
    apiKey: string;
}
export declare class FlowshaprClient {
    private baseUrl;
    private apiKey;
    constructor(config: ClientConfig);
    runByAlias<T = any>(alias: string, input: any, options?: ExecuteOptions): Promise<ExecuteResponse<T>>;
    runById<T = any>(flowId: string, input: any, options?: ExecuteOptions): Promise<ExecuteResponse<T>>;
    private resolveFlowIdByAlias;
    private headers;
    private safeJson;
}
