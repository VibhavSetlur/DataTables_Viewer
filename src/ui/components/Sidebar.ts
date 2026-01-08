import { Component, type ComponentOptions } from '../Component';
import { ConfigManager } from '../../utils/config-manager';
import { StateManager } from '../../core/StateManager';
import { CategoryManager } from '../../core/CategoryManager';
// import { type ApiConfig } from '../../types/schema'; // Unused

export interface SidebarOptions extends ComponentOptions {
    configManager: ConfigManager;
    stateManager: StateManager;
    onApiChange: (apiId: string) => void;
    onLoadData: () => void;
    onTableChange: (tableName: string) => void;
    onExport: () => void;
    onReset: () => void;
    onShowSchema: (tableName: string) => void;
}

export class Sidebar extends Component {
    private configManager: ConfigManager;
    private stateManager: StateManager;
    private categoryManager: CategoryManager | null = null;
    private options: SidebarOptions;

    constructor(options: SidebarOptions) {
        super(options);
        this.configManager = options.configManager;
        this.stateManager = options.stateManager;
        this.options = options;

        // Subscribe to state changes to update UI
        this.stateManager.subscribe(state => {
            if (this.dom.loadBtn) {
                this.dom.loadBtn.innerHTML = state.loading
                    ? '<span class="ts-spinner"></span> Loading...'
                    : '<i class="bi bi-database-fill"></i> Load Data';
                (this.dom.loadBtn as HTMLButtonElement).disabled = state.loading;

                if (state.activeTableName && state.availableTables.length > 0) {
                    this.updateTableInfo(state.activeTableName);
                }
            }

            // Re-render column list when columns change
            if (state.columns.length > 0 && this.dom.colList) {
                this.renderColumnList();
            }
        });
    }

    public setCategoryManager(manager: CategoryManager) {
        this.categoryManager = manager;
        this.renderCategories();
        this.renderColumnList();
        // Auto-expand columns section when data is loaded
        this.expandColumnsSection();
    }

    /** Expand the columns section to show available columns */
    public expandColumnsSection() {
        if (this.dom.colsSection) {
            this.dom.colsSection.style.display = 'block';
        }
    }

    /** Collapse the columns section */
    public collapseColumnsSection() {
        if (this.dom.colsSection) {
            this.dom.colsSection.style.display = 'none';
        }
    }

    protected render() {
        const appName = this.configManager.getAppName() || 'DataTables Viewer';
        this.container.innerHTML = `
            <header class="ts-sidebar-header">
                <div class="ts-brand">
                    <div class="ts-brand-icon"><i class="bi bi-grid-3x3-gap-fill"></i></div>
                    <span class="ts-brand-name">${appName}</span>
                </div>
            </header>

            <div class="ts-sidebar-body">
                <!-- Connection -->
                <section class="ts-section" style="padding: 0 4px;">
                    <div class="ts-section-header">
                        <span class="ts-section-title">Data Source</span>
                        <i class="bi bi-database-fill-gear ts-text-muted"></i>
                    </div>
                    <div class="ts-field">
                        <label class="ts-label">Auth Token <span style="color:red">*</span></label>
                        <input type="password" class="ts-input" id="ts-token" placeholder="Enter KBase token...">
                    </div>
                    <div class="ts-field">
                        <label class="ts-label">Object ID / UPA</label>
                        <input type="text" class="ts-input" id="ts-berdl" 
                            placeholder="e.g., 76990/7/2" value="76990/7/2">
                    </div>
                    <button class="ts-btn-primary" id="ts-load">
                        <i class="bi bi-lightning-charge-fill"></i> Load Data
                    </button>
                </section>

                <!-- Table Selection -->
                <section class="ts-section" id="ts-nav-section" style="display:none; padding: 0 4px;">
                    <div class="ts-section-header">
                        <span class="ts-section-title">Active Table</span>
                    </div>
                    <select class="ts-select" id="ts-table-select"></select>
                    <button class="ts-btn-secondary" id="ts-view-schema" style="margin-top:8px;">
                        <i class="bi bi-file-earmark-code"></i> View Schema
                    </button>
                </section>

                <!-- Columns -->
                <section class="ts-section" id="ts-cols-section" style="display:none; padding: 0 4px;">
                    <div class="ts-section-header">
                        <span class="ts-section-title">Columns</span>
                        <button class="ts-section-action" id="ts-cols-toggle-all">Show All</button>
                    </div>
                    <div class="ts-col-list" id="ts-col-list"></div>
                </section>

                <!-- Categories -->
                <section class="ts-section" id="ts-cat-section" style="display:none; padding: 0 4px;">
                    <div class="ts-section-header">
                        <span class="ts-section-title">Categories</span>
                        <button class="ts-section-action" id="ts-cat-toggle-all">Show All</button>
                    </div>
                    <ul class="ts-toggle-list" id="ts-cat-list"></ul>
                </section>

                <!-- Active Filters -->
                <section class="ts-section" id="ts-filters-section" style="display:none; padding: 0 4px;">
                    <div class="ts-section-header">
                        <span class="ts-section-title">Active Filters</span>
                        <button class="ts-section-action" id="ts-clear-filters">Clear All</button>
                    </div>
                    <div class="ts-filter-chips" id="ts-filter-chips"></div>
                </section>

                <!-- Actions -->
                <section class="ts-section" style="padding: 0 4px; margin-top: auto;">
                    <div class="ts-btn-group" style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                        <button class="ts-btn-secondary" id="ts-export">
                            <i class="bi bi-download"></i> Export
                        </button>
                        <button class="ts-btn-secondary" id="ts-reset">
                            <i class="bi bi-arrow-counterclockwise"></i> Reset
                        </button>
                    </div>
                </section>
            </div>
        `;
        this.cacheDom({
            // apiField: '#ts-api-field', // Removed
            // apiSelect: '#ts-api-select', // Removed
            token: '#ts-token',
            berdl: '#ts-berdl',
            loadBtn: '#ts-load',
            navSection: '#ts-nav-section',
            tableSelect: '#ts-table-select',
            viewSchema: '#ts-view-schema', // New ID
            colsSection: '#ts-cols-section',
            colList: '#ts-col-list',
            colsToggleAll: '#ts-cols-toggle-all',
            catSection: '#ts-cat-section',
            catList: '#ts-cat-list',
            catToggleAll: '#ts-cat-toggle-all',
            filtersSection: '#ts-filters-section',
            filterChips: '#ts-filter-chips',
            clearFilters: '#ts-clear-filters',
            export: '#ts-export',
            reset: '#ts-reset'
        });

        // this.initApiSelector(); // Removed
    }

    protected bindEvents() {
        // Load
        this.dom.loadBtn?.addEventListener('click', () => this.options.onLoadData());
        this.dom.berdl?.addEventListener('keypress', (e: KeyboardEvent) => {
            if (e.key === 'Enter') this.options.onLoadData();
        });

        // API Select logic removed

        // Table Select
        this.dom.tableSelect?.addEventListener('change', (e: Event) => {
            this.options.onTableChange((e.target as HTMLSelectElement).value);
        });

        // Actions
        this.dom.export?.addEventListener('click', () => this.options.onExport());
        this.dom.reset?.addEventListener('click', () => this.options.onReset());

        // Column Toggles
        this.dom.colsToggleAll?.addEventListener('click', () => {
            // Logic relating to state updates for columns should ideally be in App or delegated
            // For now, we'll manipulate state directly via manager if possible or emit event
            // To keep it simple, we'll update state directly since we have the manager
            this.toggleAllColumns();
        });

        // Category toggle all
        this.dom.catToggleAll?.addEventListener('click', () => {
            if (this.categoryManager) {
                const allVisible = this.categoryManager.getAllCategories().every(c => c.visible);
                this.categoryManager.getAllCategories().forEach(c => {
                    if (allVisible !== c.visible) return;
                    this.categoryManager!.toggleCategory(c.id);
                });
                this.stateManager.update({ visibleColumns: this.categoryManager.getVisibleColumns() });
                this.renderCategories();
                this.renderColumnList();
                // We need to trigger a grid refresh - using state update usually does it if subscribed
            }
        });

        // Categories list click
        this.dom.catList?.addEventListener('click', (e: Event) => {
            const item = (e.target as HTMLElement).closest('.ts-toggle-item') as HTMLElement;
            if (item && this.categoryManager) {
                const catId = item.dataset.cat;
                if (catId) {
                    this.categoryManager.toggleCategory(catId);
                    this.stateManager.update({ visibleColumns: this.categoryManager.getVisibleColumns() });
                    this.renderCategories();
                    this.renderColumnList();
                }
            }
        });

        // Column list click delegation
        this.dom.colList?.addEventListener('change', (e: Event) => {
            const target = e.target as HTMLInputElement;
            if (target.matches('input[type="checkbox"]')) {
                const col = target.dataset.col;
                if (col) {
                    const state = this.stateManager.getState();
                    if (target.checked) state.visibleColumns.add(col);
                    else state.visibleColumns.delete(col);
                    this.stateManager.update({ visibleColumns: state.visibleColumns });
                }
            }
        });

        // Schema view click
        // Note: we bind to document body delegation for safety or just re-bind on state change?
        // Actually, just binding to this.dom.viewSchema is fine because it stays in DOM unless re-rendered.
        // But if `updateTables` re-renders the parent section, we lose it?
        // Wait, updateTables modifies dom.navSection children? No, it modifies tableSelect. 
        // navSection is just shown/hidden.
        // But let's make sure the button exists.

        if (this.dom.viewSchema) {
            this.dom.viewSchema.addEventListener('click', () => {
                const state = this.stateManager.getState();
                if (state.activeTableName) {
                    this.options.onShowSchema(state.activeTableName);
                } else {
                    // Fallback if no table is explicitly active but we have tables?
                    const select = this.dom.tableSelect as HTMLSelectElement;
                    if (select && select.value) {
                        this.options.onShowSchema(select.value);
                    } else {
                        alert("Please select a table to view its schema.");
                    }
                }
            });
        }
    }

    // Public API for App to drive UI updates

    public initApiSelector() {
        // Selector removed
    }

    public updateTables(tables: any[]) {
        if (!this.dom.navSection) return;

        if (tables.length > 0) {
            this.dom.navSection.style.display = 'block';
            this.dom.tableSelect.innerHTML = '';
            tables.forEach((t: any) => {
                const opt = document.createElement('option');
                opt.value = t.name;
                const countValue = t.row_count ?? t.count;
                const count = typeof countValue === 'number' ? countValue.toLocaleString() : '?';
                opt.textContent = `${t.displayName || t.name} (${count} rows)`;
                this.dom.tableSelect.appendChild(opt);
            });
        } else {
            this.dom.navSection.style.display = 'none';
        }
    }

    public updateTableInfo(name: string) {
        // Just update select value if not matching
        if (this.dom.tableSelect && (this.dom.tableSelect as HTMLSelectElement).value !== name) {
            (this.dom.tableSelect as HTMLSelectElement).value = name;
        }
    }


    public renderColumnList() {
        if (!this.dom.colList) return;
        this.dom.colsSection.style.display = 'block'; // Ensure visible
        const state = this.stateManager.getState();
        this.dom.colList.innerHTML = state.columns.map(c => `
            <label class="ts-col-item">
                <input type="checkbox" data-col="${c.column}" ${state.visibleColumns.has(c.column) ? 'checked' : ''}>
                <span>${c.displayName || c.column}</span>
            </label>
        `).join('');

        const allVisible = state.columns.every(c => state.visibleColumns.has(c.column));
        if (this.dom.colsToggleAll) this.dom.colsToggleAll.textContent = allVisible ? 'Hide All' : 'Show All';
    }


    public renderCategories() {
        if (!this.categoryManager || !this.dom.catList) return;
        const cats = this.categoryManager.getAllCategories();
        this.dom.catList.innerHTML = '';

        if (cats.length === 0) { this.dom.catSection.style.display = 'none'; return; }

        this.dom.catSection.style.display = 'block';
        const allVisible = cats.every(c => c.visible);
        if (this.dom.catToggleAll) this.dom.catToggleAll.textContent = allVisible ? 'Hide All' : 'Show All';

        cats.forEach(cat => {
            const li = document.createElement('li');
            li.className = `ts-toggle-item ${cat.visible ? 'active' : ''}`;
            li.dataset.cat = cat.id;
            li.innerHTML = `
                <div class="ts-toggle-label">
                    <i class="${cat.icon || 'bi bi-folder-fill'}" style="color:${cat.color || 'var(--accent)'}"></i>
                    <span>${cat.name}</span>
                </div>
                <div class="ts-switch ${cat.visible ? 'on' : ''}"></div>
            `;
            this.dom.catList.appendChild(li);
        });
    }

    public renderFilterChips() {
        // Re-implement filter chips logic here or keep in App?
        // It's better here as it's part of the Sidebar "Active Filters" section
        const state = this.stateManager.getState();
        const filters = state.columnFilters;
        const hasFilters = Object.keys(filters).length > 0;

        if (this.dom.filtersSection) this.dom.filtersSection.style.display = hasFilters ? 'block' : 'none';
        if (!this.dom.filterChips) return;

        this.dom.filterChips.innerHTML = Object.entries(filters).map(([col, val]) => `
             <div class="ts-chip">
                 <span>${col}: ${val}</span>
                 <button class="ts-chip-clear" data-col="${col}"><i class="bi bi-x"></i></button>
             </div>
         `).join('');

        // Bind chip clear events
        this.dom.filterChips.querySelectorAll('.ts-chip-clear').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const col = (e.currentTarget as HTMLElement).dataset.col;
                if (col) {
                    const newState = { ...this.stateManager.getState().columnFilters };
                    delete newState[col];
                    this.stateManager.update({ columnFilters: newState, currentPage: 0 });
                    // This trigger update via subscription, but we might need to trigger data fetch
                    // This is where "App" orchestrator pattern shines. 
                    // Ideally we emit event, but for now StateManager subscription in App can handle fetch
                }
            });
        });
    }

    private toggleAllColumns() {
        const state = this.stateManager.getState();
        const allVisible = state.columns.every(c => state.visibleColumns.has(c.column));
        state.columns.forEach(c => {
            if (allVisible) state.visibleColumns.delete(c.column);
            else state.visibleColumns.add(c.column);
        });
        this.stateManager.update({ visibleColumns: state.visibleColumns });
        this.renderColumnList();
        // Render table triggers via state subscription in DataGrid
    }

    // Accessors for values
    public getToken(): string {
        return (this.dom.token as HTMLInputElement)?.value || '';
    }

    public getBerdlId(): string {
        return (this.dom.berdl as HTMLInputElement)?.value || '';
    }
}
