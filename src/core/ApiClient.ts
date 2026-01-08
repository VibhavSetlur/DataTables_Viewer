/**
 * KBase TableScanner API Client
 * 
 * TypeScript implementation of the KBase Client.
 */

import type { ApiConfig } from '../types/schema';

interface ClientOptions {
    apiConfig?: ApiConfig;
    baseUrl?: string;
    token?: string;
    environment?: 'appdev' | 'prod' | 'local';
    headers?: Record<string, string>;
}

interface CacheEntry<T> {
    data: T;
    timestamp: number;
}

interface TableDataRequest {
    berdl_table_id: string;
    table_name: string;
    limit?: number;
    offset?: number;
    columns?: string[];
    sort_column?: string | null;
    sort_order?: 'ASC' | 'DESC';
    search_value?: string;
    col_filter?: Record<string, any>;
    query_filters?: any;
    kb_env?: string;
}

interface TableDataResponse {
    headers: string[];
    data: any[][];
    total_count: number;
}

export class ApiClient {
    private baseUrl: string;
    private token: string | null;
    private environment: string;
    private customHeaders: Record<string, string>;
    private cache: Map<string, CacheEntry<any>>;
    private cacheTTL: number;

    constructor(options: ClientOptions = {}) {
        this.environment = options.environment || 'appdev';

        if (options.apiConfig) {
            this.baseUrl = options.apiConfig.url;
            this.customHeaders = options.apiConfig.headers || {};
            // If environment is in options, it overrides; otherwise check apiConfig? 
            // ApiConfig definitions don't currently have environment, keep defaulting to 'appdev' or options
        } else {
            this.baseUrl = options.baseUrl || this.getDefaultUrl(this.environment);
            this.customHeaders = options.headers || {};
        }

        this.token = options.token || null;
        this.cache = new Map();
        this.cacheTTL = 300000; // 5 minutes
    }

    private getDefaultUrl(env: string): string {
        const urls: Record<string, string> = {
            appdev: 'https://appdev.kbase.us/services/berdl_table_scanner',
            prod: 'https://kbase.us/services/berdl_table_scanner',
            local: 'http://localhost:8000'
        };
        return urls[env] || urls.appdev;
    }

    private getHeaders(): HeadersInit {
        const headers: HeadersInit = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...this.customHeaders
        };
        if (this.token) {
            (headers as any)['Authorization'] = this.token;
        }
        return headers;
    }

    private getCacheKey(endpoint: string, params: any): string {
        return `${endpoint}:${JSON.stringify(params || {})}`;
    }

    private getFromCache<T>(key: string): T | null {
        const cached = this.cache.get(key);
        if (cached && (Date.now() - cached.timestamp < this.cacheTTL)) {
            return cached.data;
        }
        return null;
    }

    private setCache<T>(key: string, data: T): void {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }

    public clearCache(): void {
        this.cache.clear();
    }

    public setToken(token: string): void {
        this.token = token;
        this.clearCache();
    }

    public updateConfig(config: ApiConfig): void {
        this.baseUrl = config.url;
        this.customHeaders = config.headers || {};
        this.clearCache();
    }

    public setEnvironment(environment: 'appdev' | 'prod' | 'local'): void {
        this.environment = environment;
        // Only reset baseUrl to default if NOT using explicit config?
        // For backward compatibility, if this method is called, we assume we want to switch to default url for that env
        this.baseUrl = this.getDefaultUrl(environment);
        this.clearCache();
    }

    private async request<T>(endpoint: string, method: string, body?: any, useCache = false): Promise<T> {
        const cacheKey = this.getCacheKey(endpoint, body);

        if (useCache && method === 'GET') {
            const cached = this.getFromCache<T>(cacheKey);
            if (cached) return cached;
        }
        // POST requests with useCache=true also supported in original
        if (useCache && method === 'POST') {
            const cached = this.getFromCache<T>(cacheKey);
            if (cached) return cached;
        }

        const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`;
        const options: RequestInit = {
            method,
            headers: this.getHeaders(),
        };

        let fetchUrl = url;
        if (body) {
            if (method === 'GET') {
                const urlObj = new URL(url);
                Object.entries(body as Record<string, any>).forEach(([k, v]) => {
                    if (v != null) urlObj.searchParams.set(k, String(v));
                });
                fetchUrl = urlObj.toString();
            } else {
                options.body = JSON.stringify(body);
            }
        }

        const response = await fetch(fetchUrl, options);

        if (!response.ok) {
            let errorMsg = `HTTP ${response.status}`;
            try {
                const data = await response.json();
                errorMsg = data.detail || data.message || errorMsg;
            } catch {
                errorMsg = `${errorMsg}: ${response.statusText}`;
            }
            throw new Error(errorMsg);
        }

        const data = await response.json();
        if (useCache) {
            this.setCache(cacheKey, data);
        }
        return data as T;
    }

    // Public Methods

    public async listTables(berdlTableId: string): Promise<any> {
        return this.request(`/object/${berdlTableId}/tables`, 'GET', undefined, true);
    }

    public async getTableData(req: TableDataRequest): Promise<TableDataResponse> {
        const body = {
            ...req,
            limit: req.limit || 100,
            offset: req.offset || 0,
            kb_env: this.environment
        };
        // Use cache for data requests? Original used _post with useCache=false for getTableDataREST but implicit check.
        // But getTableData used _post without useCache arg (defaults false).
        // Let's keep it false for data to ensure freshness, or customizable.
        return this.request('/table-data', 'POST', body, false);
    }
}

