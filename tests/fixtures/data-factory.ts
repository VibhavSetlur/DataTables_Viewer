/**
 * Test Data Factory
 * 
 * Factory functions for generating test data.
 */

// =============================================================================
// ROW DATA
// =============================================================================

export interface MockRow {
    id: number;
    feature_id: string;
    genome_id: string;
    contig_id: string;
    bakta_function: string;
    rast_function: string;
    gene_names: string;
    length: number;
    start: number;
    end: number;
    strand: '+' | '-';
    sequence?: string;
}

/**
 * Create mock table rows
 */
export function createMockRows(count: number, options: { withSequence?: boolean } = {}): MockRow[] {
    return Array.from({ length: count }, (_, i) => ({
        id: i + 1,
        feature_id: `Gene_${String(i + 1).padStart(4, '0')}`,
        genome_id: `Genome_${Math.floor(i / 100) + 1}`,
        contig_id: `Contig_${Math.floor(i / 50) + 1}`,
        bakta_function: `Mock Function ${i + 1} - Hypothetical protein`,
        rast_function: `RAST Function ${i + 1}`,
        gene_names: i % 5 === 0 ? `gene${i}` : '',
        length: Math.floor(Math.random() * 5000) + 100,
        start: i * 1000,
        end: i * 1000 + Math.floor(Math.random() * 5000) + 100,
        strand: Math.random() > 0.5 ? '+' : '-',
        ...(options.withSequence && {
            sequence: generateRandomSequence(Math.floor(Math.random() * 100) + 50)
        })
    }));
}

/**
 * Generate random DNA sequence
 */
export function generateRandomSequence(length: number): string {
    const bases = ['A', 'T', 'G', 'C'];
    return Array.from({ length }, () => bases[Math.floor(Math.random() * 4)]).join('');
}

// =============================================================================
// TABLE INFO
// =============================================================================

export interface MockTableInfo {
    name: string;
    row_count: number;
    displayName: string;
}

/**
 * Create mock table list
 */
export function createMockTables(): MockTableInfo[] {
    return [
        { name: 'genome_features', row_count: 500, displayName: 'Genome Features' },
        { name: 'pan_genome_features', row_count: 200, displayName: 'Pangenome Features' },
        { name: 'genome_ani', row_count: 100, displayName: 'ANI Matrix' }
    ];
}

// =============================================================================
// CONFIGURATION
// =============================================================================

export interface MockCategory {
    id: string;
    name: string;
    description?: string;
    icon?: string;
    color?: string;
    defaultVisible: boolean;
    order?: number;
}

export interface MockColumn {
    column: string;
    displayName: string;
    dataType?: string;
    visible?: boolean;
    sortable?: boolean;
    filterable?: boolean;
    categories?: string[];
    transform?: {
        type: string;
        options?: Record<string, any>;
    };
}

/**
 * Create mock data type configuration
 */
export function createMockDataTypeConfig() {
    return {
        id: 'test_data',
        name: 'Test Data',
        version: '1.0.0',
        description: 'Test data type for unit testing',
        defaults: {
            pageSize: 50,
            density: 'normal',
            showRowNumbers: true
        },
        sharedCategories: createMockCategories(),
        tables: {
            genome_features: createMockTableSchema()
        }
    };
}

/**
 * Create mock categories
 */
export function createMockCategories(): MockCategory[] {
    return [
        { id: 'core', name: 'Core Identifiers', color: '#6366f1', defaultVisible: true, order: 1 },
        { id: 'functional', name: 'Functional Annotation', color: '#22c55e', defaultVisible: true, order: 2 },
        { id: 'location', name: 'Genomic Location', color: '#f59e0b', defaultVisible: false, order: 3 },
        { id: 'sequence', name: 'Sequence Data', color: '#06b6d4', defaultVisible: false, order: 4 }
    ];
}

/**
 * Create mock table schema
 */
export function createMockTableSchema() {
    return {
        displayName: 'Genome Features',
        description: 'Test genomic features table',
        columns: createMockColumns()
    };
}

/**
 * Create mock columns
 */
export function createMockColumns(): MockColumn[] {
    return [
        { column: 'id', displayName: 'ID', dataType: 'integer', visible: false, categories: ['core'] },
        { column: 'feature_id', displayName: 'Feature ID', dataType: 'id', sortable: true, filterable: true, categories: ['core'] },
        { column: 'genome_id', displayName: 'Genome ID', dataType: 'string', sortable: true, categories: ['core'] },
        { column: 'contig_id', displayName: 'Contig', dataType: 'string', categories: ['location'] },
        { column: 'bakta_function', displayName: 'Function (Bakta)', dataType: 'string', categories: ['functional'] },
        { column: 'length', displayName: 'Length (bp)', dataType: 'integer', categories: ['location'] },
        { column: 'strand', displayName: 'Strand', dataType: 'string', categories: ['location'] }
    ];
}

// =============================================================================
// API RESPONSES
// =============================================================================

/**
 * Create mock list tables response
 */
export function createMockListTablesResponse() {
    return {
        tables: createMockTables(),
        type: 'test_data'
    };
}

/**
 * Create mock get table data response
 */
export function createMockGetTableDataResponse(count = 50) {
    const rows = createMockRows(count);
    return {
        headers: Object.keys(rows[0] || {}),
        data: rows,
        total_count: count
    };
}

// =============================================================================
// STATE
// =============================================================================

/**
 * Create mock initial state
 */
export function createMockInitialState() {
    return {
        data: [],
        headers: [],
        columns: [],
        visibleColumns: new Set<string>(),
        totalCount: 0,
        currentPage: 0,
        pageSize: 50,
        loading: false,
        error: null,
        activeTableName: '',
        availableTables: [],
        selectedRows: new Set<number>(),
        sortColumn: null,
        sortDirection: 'asc' as const,
        searchQuery: ''
    };
}

/**
 * Create mock loaded state
 */
export function createMockLoadedState(rowCount = 50) {
    const rows = createMockRows(rowCount);
    const columns = createMockColumns();

    return {
        data: rows,
        headers: Object.keys(rows[0] || {}),
        columns,
        visibleColumns: new Set(columns.filter(c => c.visible !== false).map(c => c.column)),
        totalCount: rowCount,
        currentPage: 0,
        pageSize: 50,
        loading: false,
        error: null,
        activeTableName: 'genome_features',
        availableTables: createMockTables(),
        selectedRows: new Set<number>(),
        sortColumn: null,
        sortDirection: 'asc' as const,
        searchQuery: ''
    };
}

// =============================================================================
// EVENTS
// =============================================================================

/**
 * Create mock keyboard event
 */
export function createMockKeyboardEvent(
    key: string,
    options: Partial<KeyboardEventInit> = {}
): KeyboardEvent {
    return new KeyboardEvent('keydown', {
        key,
        bubbles: true,
        cancelable: true,
        ...options
    });
}

/**
 * Create mock mouse event
 */
export function createMockMouseEvent(
    type: string,
    options: Partial<MouseEventInit> = {}
): MouseEvent {
    return new MouseEvent(type, {
        bubbles: true,
        cancelable: true,
        ...options
    });
}
