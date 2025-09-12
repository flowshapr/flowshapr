export class FlowshaprClient {
    constructor(config) {
        if (!config.baseUrl)
            throw new Error('baseUrl is required');
        if (!config.apiKey)
            throw new Error('apiKey is required');
        this.baseUrl = config.baseUrl.replace(/\/$/, '');
        this.apiKey = config.apiKey;
    }
    async runByAlias(alias, input, options) {
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
            return data;
        }
        return {
            success: false,
            error: (data && (data.error ?? data)) || directRes.statusText,
            meta: { status: directRes.status },
        };
    }
    async runById(flowId, input, options) {
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
        return data;
    }
    async resolveFlowIdByAlias(alias, options) {
        // 1) Try listing flows and exact-match alias (case-insensitive)
        const listUrl = `${this.baseUrl}/api/flows?search=${encodeURIComponent(alias)}&limit=50&offset=0`;
        const listRes = await fetch(listUrl, { headers: this.headers(), signal: options?.signal });
        if (listRes.ok) {
            const listData = await this.safeJson(listRes);
            const flows = listData?.data || [];
            const match = flows.find(f => (f.alias || '').toLowerCase() === alias.toLowerCase());
            if (match?.id)
                return match.id;
        }
        // 2) As a fallback, try GET by id (in case alias was actually an id)
        const getUrl = `${this.baseUrl}/api/flows/${encodeURIComponent(alias)}`;
        const getRes = await fetch(getUrl, { headers: this.headers(), signal: options?.signal });
        if (getRes.ok) {
            const getData = await this.safeJson(getRes);
            const id = getData?.data?.id;
            if (id)
                return id;
        }
        throw new Error(`Flow with alias '${alias}' not found`);
    }
    headers() {
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
        };
    }
    async safeJson(res) {
        try {
            return await res.json();
        }
        catch {
            return null;
        }
    }
}
