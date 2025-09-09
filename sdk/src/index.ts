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

export class FlowshaprClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(config: ClientConfig) {
    if (!config.baseUrl) throw new Error('baseUrl is required');
    if (!config.apiKey) throw new Error('apiKey is required');
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.apiKey = config.apiKey;
  }

  async runByAlias<T = any>(alias: string, input: any, options?: ExecuteOptions): Promise<ExecuteResponse<T>> {
    // Use the server's by-alias execute endpoint (enforces token scoping).
    // Surface server errors directly to the caller instead of falling back,
    // so 401/403/404 are visible.
    const directUrl = `${this.baseUrl}/api/flows/by-alias/${encodeURIComponent(alias)}/execute`;
    const directRes = await fetch(directUrl, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ input }),
      signal: options?.signal,
    });

    const data = await this.safeJson(directRes);
    if (directRes.ok) {
      return data as ExecuteResponse<T>;
    }

    return {
      success: false,
      error: (data && (data.error ?? data)) || directRes.statusText,
      meta: { status: directRes.status },
    } as ExecuteResponse<T>;
  }

  async runById<T = any>(flowId: string, input: any, options?: ExecuteOptions): Promise<ExecuteResponse<T>> {
    const url = `${this.baseUrl}/api/flows/${encodeURIComponent(flowId)}/execute`;
    const res = await fetch(url, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ input }),
      signal: options?.signal,
    });

    const data = await this.safeJson(res);
    if (!res.ok) {
      return { success: false, error: data?.error || data || res.statusText };
    }
    return data as ExecuteResponse<T>;
  }

  private async resolveFlowIdByAlias(alias: string, options?: ExecuteOptions): Promise<string> {
    // 1) Try listing flows and exact-match alias (case-insensitive)
    const listUrl = `${this.baseUrl}/api/flows?search=${encodeURIComponent(alias)}&limit=50&offset=0`;
    const listRes = await fetch(listUrl, { headers: this.headers(), signal: options?.signal });
    if (listRes.ok) {
      const listData: any = await this.safeJson(listRes);
      const flows: any[] = listData?.data || [];
      const match = flows.find(f => (f.alias || '').toLowerCase() === alias.toLowerCase());
      if (match?.id) return match.id;
    }

    // 2) As a fallback, try GET by id (in case alias was actually an id)
    const getUrl = `${this.baseUrl}/api/flows/${encodeURIComponent(alias)}`;
    const getRes = await fetch(getUrl, { headers: this.headers(), signal: options?.signal });
    if (getRes.ok) {
      const getData: any = await this.safeJson(getRes);
      const id = getData?.data?.id;
      if (id) return id;
    }

    throw new Error(`Flow with alias '${alias}' not found`);
  }

  private headers() {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
    } as Record<string, string>;
  }

  private async safeJson(res: Response) {
    try {
      return await res.json();
    } catch {
      return null;
    }
  }
}
