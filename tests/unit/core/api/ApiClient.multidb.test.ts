/**
 * Comprehensive tests for ApiClient multi-database methods.
 *
 * Validates that the UPA query-parameter fix is correctly implemented
 * and that all URL construction for multi-database endpoints produces
 * the expected patterns (no UPA in path segments).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiClient } from '@core/api/ApiClient';

// Mock logger
vi.mock('@utils/logger', () => ({
    logger: {
        debug: vi.fn(),
        warn: vi.fn(),
        info: vi.fn(),
        error: vi.fn(),
    }
}));

// ---------------------------------------------------------------------------
// Track all fetch calls to inspect URL construction
// ---------------------------------------------------------------------------
let fetchCalls: { url: string; method: string; body?: any }[] = [];

beforeEach(() => {
    fetchCalls = [];
    Object.defineProperty(document, 'cookie', { value: '', writable: true });
    vi.clearAllMocks();

    // Mock global fetch to capture requests
    global.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === 'string' ? input : input.toString();
        const method = init?.method || 'GET';
        const body = init?.body ? JSON.parse(init.body as string) : undefined;
        fetchCalls.push({ url, method, body });

        return new Response(JSON.stringify({
            berdl_table_id: 'test',
            tables: [],
            headers: [],
            data: [],
            total_count: 0,
            source: 'test',
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    }) as any;
});

// ---------------------------------------------------------------------------
// URL Construction Tests — Core of the UPA fix
// ---------------------------------------------------------------------------

describe('ApiClient - Multi-Database URL Construction', () => {
    let client: ApiClient;

    beforeEach(() => {
        client = new ApiClient({
            baseUrl: 'https://appdev.kbase.us/services/berdl_table_scanner',
            token: 'test-token',
        });
    });

    // ----- listDatabases -----

    it('listDatabases: should place UPA in query param, not path', async () => {
        await client.listDatabases('76990/7/2');
        expect(fetchCalls).toHaveLength(1);

        const url = fetchCalls[0].url;
        expect(url).toContain('/databases?upa=');
        expect(url).not.toContain('/object/');
    });

    it('listDatabases: should URL-encode UPA with slashes', async () => {
        await client.listDatabases('76990/Test2');
        const url = fetchCalls[0].url;
        expect(url).toContain('upa=76990%2FTest2');
    });

    it('listDatabases: should URL-encode UPA with three segments', async () => {
        await client.listDatabases('76990/7/2');
        const url = fetchCalls[0].url;
        expect(url).toContain('upa=76990%2F7%2F2');
    });

    it('listDatabases: should use GET method', async () => {
        await client.listDatabases('76990/7/2');
        expect(fetchCalls[0].method).toBe('GET');
    });

    // ----- listTablesInDatabase -----

    it('listTablesInDatabase: should place UPA in query param', async () => {
        await client.listTablesInDatabase('76990/7/2', 'GCF_000368685.1');
        const url = fetchCalls[0].url;
        expect(url).toContain('/db/GCF_000368685.1/tables?upa=');
        expect(url).not.toContain('/object/');
    });

    it('listTablesInDatabase: should encode db_name with special chars', async () => {
        await client.listTablesInDatabase('76990/7/2', 'db with spaces');
        const url = fetchCalls[0].url;
        expect(url).toContain('/db/db%20with%20spaces/tables');
    });

    it('listTablesInDatabase: should encode UPA', async () => {
        await client.listTablesInDatabase('76990/Test2', 'mydb');
        const url = fetchCalls[0].url;
        expect(url).toContain('upa=76990%2FTest2');
    });

    // ----- getTableDataFromDatabase -----

    it('getTableDataFromDatabase: should place UPA in query param', async () => {
        await client.getTableDataFromDatabase('76990/7/2', 'testdb', {
            table_name: 'Genes',
            limit: 50,
            offset: 0,
        });
        const url = fetchCalls[0].url;
        expect(url).toContain('/db/testdb/tables/Genes/data?');
        expect(url).toContain('upa=76990%2F7%2F2');
        expect(url).not.toContain('/object/');
    });

    it('getTableDataFromDatabase: should include limit and offset', async () => {
        await client.getTableDataFromDatabase('76990/7/2', 'testdb', {
            table_name: 'Genes',
            limit: 25,
            offset: 50,
        });
        const url = fetchCalls[0].url;
        expect(url).toContain('limit=25');
        expect(url).toContain('offset=50');
    });

    it('getTableDataFromDatabase: should include sort params when provided', async () => {
        await client.getTableDataFromDatabase('76990/7/2', 'testdb', {
            table_name: 'Genes',
            limit: 10,
            offset: 0,
            sort_column: 'score',
            sort_order: 'DESC',
        });
        const url = fetchCalls[0].url;
        expect(url).toContain('sort_column=score');
        expect(url).toContain('sort_order=DESC');
    });

    it('getTableDataFromDatabase: should include search param when provided', async () => {
        await client.getTableDataFromDatabase('76990/7/2', 'testdb', {
            table_name: 'Genes',
            limit: 10,
            offset: 0,
            search_value: 'dnaA',
        });
        const url = fetchCalls[0].url;
        expect(url).toContain('search=dnaA');
    });

    it('getTableDataFromDatabase: should NOT include sort when not provided', async () => {
        await client.getTableDataFromDatabase('76990/7/2', 'testdb', {
            table_name: 'Genes',
            limit: 10,
            offset: 0,
        });
        const url = fetchCalls[0].url;
        expect(url).not.toContain('sort_column');
        expect(url).not.toContain('sort_order');
    });

    it('getTableDataFromDatabase: should encode table name', async () => {
        await client.getTableDataFromDatabase('76990/7/2', 'testdb', {
            table_name: 'My Table',
            limit: 10,
            offset: 0,
        });
        const url = fetchCalls[0].url;
        expect(url).toContain('/tables/My%20Table/data');
    });

    it('getTableDataFromDatabase: should use GET method', async () => {
        await client.getTableDataFromDatabase('76990/7/2', 'testdb', {
            table_name: 'Genes',
            limit: 10,
            offset: 0,
        });
        expect(fetchCalls[0].method).toBe('GET');
    });
});

// ---------------------------------------------------------------------------
// Legacy Endpoint Tests — ensure POST /table-data still works
// ---------------------------------------------------------------------------

describe('ApiClient - Legacy POST Endpoint', () => {
    let client: ApiClient;

    beforeEach(() => {
        client = new ApiClient({
            baseUrl: 'https://appdev.kbase.us/services/berdl_table_scanner',
            token: 'test-token',
        });
    });

    it('getTableData: should use POST method', async () => {
        await client.getTableData({
            berdl_table_id: '76990/7/2',
            table_name: 'Genes',
            limit: 10,
            offset: 0,
        });
        expect(fetchCalls[0].method).toBe('POST');
    });

    it('getTableData: should send UPA in request body', async () => {
        await client.getTableData({
            berdl_table_id: '76990/7/2',
            table_name: 'Genes',
            limit: 10,
        });
        const body = fetchCalls[0].body;
        expect(body.berdl_table_id).toBe('76990/7/2');
    });

    it('getTableData: should NOT put UPA in URL', async () => {
        await client.getTableData({
            berdl_table_id: '76990/7/2',
            table_name: 'Genes',
            limit: 10,
        });
        const url = fetchCalls[0].url;
        expect(url).not.toContain('76990');
        expect(url).toContain('/table-data');
    });

    it('getTableData: should include table_name in body', async () => {
        await client.getTableData({
            berdl_table_id: '76990/7/2',
            table_name: 'Genes',
            limit: 10,
        });
        expect(fetchCalls[0].body.table_name).toBe('Genes');
    });
});

// ---------------------------------------------------------------------------
// Single-Object Path Endpoints (still use path-based UPA)
// ---------------------------------------------------------------------------

describe('ApiClient - Single-Object Endpoints', () => {
    let client: ApiClient;

    beforeEach(() => {
        client = new ApiClient({
            baseUrl: 'https://appdev.kbase.us/services/berdl_table_scanner',
            token: 'test-token',
        });
    });

    it('getTableSchema: should encode UPA in path', async () => {
        await client.getTableSchema('76990/7/2', 'Genes');
        const url = fetchCalls[0].url;
        expect(url).toContain('/object/76990%2F7%2F2/tables/Genes/schema');
    });

    it('getTableStatistics: should encode UPA in path', async () => {
        await client.getTableStatistics('76990/7/2', 'Genes');
        const url = fetchCalls[0].url;
        expect(url).toContain('/object/76990%2F7%2F2/tables/Genes/stats');
    });

    it('getSchema: should encode UPA in path', async () => {
        await client.getSchema('76990/7/2');
        const url = fetchCalls[0].url;
        expect(url).toContain('/schema/76990%2F7%2F2/tables');
    });
});

// ---------------------------------------------------------------------------
// Auth / Cookie Tests
// ---------------------------------------------------------------------------

describe('ApiClient - Authentication', () => {
    it('should use explicit token in Authorization header', async () => {
        const client = new ApiClient({ token: 'my-token' });
        await client.listDatabases('76990/7/2').catch(() => { });

        const headers = (global.fetch as any).mock.calls[0]?.[1]?.headers;
        expect(headers?.Authorization || headers?.authorization).toContain('my-token');
    });

    it('should use kbase_session cookie when no token provided', () => {
        document.cookie = 'kbase_session=cookie-tok; path=/';
        const client = new ApiClient();
        const headers = client.getHeaders() as any;
        expect(headers['Authorization']).toBe('Bearer cookie-tok');
    });

    it('should prefer kbase_session over backup', () => {
        document.cookie = 'kbase_session=primary; kbase_session_backup=backup';
        const client = new ApiClient();
        const headers = client.getHeaders() as any;
        expect(headers['Authorization']).toBe('Bearer primary');
    });
});

// ---------------------------------------------------------------------------
// Regression: UPA never appears as a path segment in multi-DB endpoints
// ---------------------------------------------------------------------------

describe('ApiClient - UPA Path Collision Regression', () => {
    let client: ApiClient;

    beforeEach(() => {
        client = new ApiClient({
            baseUrl: 'https://example.com/api',
            token: 'tok',
        });
    });

    const upas = [
        '76990/7/2',
        '76990/Test2',
        '12345/my-object/3',
        '100/200/300',
    ];

    for (const upa of upas) {
        it(`listDatabases('${upa}'): UPA must not be a path segment`, async () => {
            await client.listDatabases(upa);
            const url = new URL(fetchCalls[0].url);
            // The pathname should be just /api/databases
            expect(url.pathname).toBe('/api/databases');
            expect(url.searchParams.get('upa')).toBe(upa);
        });

        it(`listTablesInDatabase('${upa}', 'db1'): UPA must be query param`, async () => {
            fetchCalls = [];
            await client.listTablesInDatabase(upa, 'db1');
            const url = new URL(fetchCalls[0].url);
            expect(url.pathname).toBe('/api/db/db1/tables');
            expect(url.searchParams.get('upa')).toBe(upa);
        });

        it(`getTableDataFromDatabase('${upa}', 'db1', ...): UPA must be query param`, async () => {
            fetchCalls = [];
            await client.getTableDataFromDatabase(upa, 'db1', {
                table_name: 'T1',
                limit: 10,
                offset: 0,
            });
            const url = new URL(fetchCalls[0].url);
            expect(url.pathname).toBe('/api/db/db1/tables/T1/data');
            expect(url.searchParams.get('upa')).toBe(upa);
        });
    }
});
