# API Reference

Complete API documentation for DataTables Viewer components and utilities.

## Table of Contents

1. [Core Managers](#core-managers)
2. [UI Components](#ui-components)
3. [Utilities](#utilities)
4. [Types](#types)
5. [Events](#events)

---

## Core Managers

### EventBus

Pub/sub event system for decoupled communication.

```typescript
import { eventBus, EventBus } from './core/EventBus';
```

#### Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `on` | `on(event: string, handler: Function): () => void` | Subscribe to event. Returns unsubscribe function. |
| `off` | `off(event: string, handler: Function): void` | Unsubscribe from event |
| `once` | `once(event: string, handler: Function): () => void` | Subscribe for single event |
| `emit` | `emit(event: string, payload?: any): void` | Emit event with optional payload |
| `clear` | `clear(event?: string): void` | Clear listeners for event or all |

#### Example

```typescript
// Subscribe
const unsub = eventBus.on('table:changed', ({ tableName }) => {
  console.log('Table changed to:', tableName);
});

// Emit
eventBus.emit('table:changed', { tableName: 'genes' });

// Cleanup
unsub();
```

---

### StateManager

Centralized state management with immutable updates.

```typescript
import { StateManager } from './core/StateManager';
```

#### State Interface

```typescript
interface AppState {
  data: Record<string, any>[];
  headers: string[];
  columns: TableColumnConfig[];
  visibleColumns: Set<string>;
  totalCount: number;
  currentPage: number;
  pageSize: number;
  loading: boolean;
  error: string | null;
  activeTableName: string | null;
  availableTables: TableInfo[];
  selectedRows: Set<number>;
  sortColumn: string | null;
  sortDirection: 'asc' | 'desc';
  sortOrder: 'asc' | 'desc';     // Alias
  searchQuery: string;
  searchValue: string;           // Alias
  theme: 'light' | 'dark';
  density: 'compact' | 'normal' | 'comfortable';
  showRowNumbers: boolean;
}
```

#### Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `getState` | `getState(): AppState` | Get current state (readonly) |
| `update` | `update(partial: Partial<AppState>): void` | Merge partial state |
| `subscribe` | `subscribe(callback: (state: AppState) => void): () => void` | Subscribe to changes |
| `reset` | `reset(): void` | Reset to initial state |

#### Example

```typescript
const sm = new StateManager();

// Read
const { data, loading } = sm.getState();

// Update
sm.update({ loading: true, error: null });

// Subscribe
const unsub = sm.subscribe(state => {
  if (state.error) showError(state.error);
});
```

---

### ApiClient

HTTP client for data fetching.

```typescript
import { ApiClient } from './core/ApiClient';
```

#### Constructor

```typescript
new ApiClient(config: ApiConfig)

interface ApiConfig {
  url: string;
  type: 'rest' | 'json_server' | 'mock';
  headers?: Record<string, string>;
  timeout?: number;
}
```

#### Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `setToken` | `setToken(token: string): void` | Set auth token |
| `listTables` | `listTables(objectId: string): Promise<TablesResponse>` | List available tables |
| `getTableData` | `getTableData(params: TableDataParams): Promise<TableDataResponse>` | Fetch table data |
| `getTableSchema` | `getTableSchema(objectId: string, tableName: string): Promise<SchemaResponse>` | Get schema |

#### Example

```typescript
const client = new ApiClient({
  url: 'https://api.example.com',
  type: 'rest'
});

client.setToken('my-auth-token');

const { tables } = await client.listTables('object-id');
const { headers, data, total_count } = await client.getTableData({
  berdl_table_id: 'object-id',
  table_name: 'genes',
  offset: 0,
  limit: 50
});
```

---

### PreferencesManager

User preferences with validation and persistence.

```typescript
import { preferences, PreferencesManager } from './core/PreferencesManager';
```

#### Preferences Interface

```typescript
interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  density: 'compact' | 'normal' | 'comfortable';
  fontSize: 'small' | 'medium' | 'large';
  pageSize: number;
  showRowNumbers: boolean;
  showGridLines: boolean;
  stickyHeader: boolean;
  stickyFirstColumn: boolean;
  confirmBeforeExport: boolean;
  rememberColumnWidths: boolean;
  rememberSortOrder: boolean;
  rememberFilters: boolean;
  defaultExportFormat: 'csv' | 'json' | 'tsv' | 'xlsx';
  includeHiddenColumns: boolean;
  exportSelectedOnly: boolean;
  reduceMotion: boolean;
  highContrast: boolean;
  keyboardNavigation: boolean;
}
```

#### Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `get` | `get<K>(key: K): UserPreferences[K]` | Get preference value |
| `set` | `set<K>(key: K, value: UserPreferences[K]): boolean` | Set preference (validates) |
| `setMany` | `setMany(updates: Partial<UserPreferences>): void` | Set multiple |
| `reset` | `reset<K>(key: K): void` | Reset to default |
| `resetAll` | `resetAll(): void` | Reset all preferences |
| `subscribe` | `subscribe<K>(key: K, callback: Function): () => void` | Watch for changes |
| `getAll` | `getAll(): UserPreferences` | Get all preferences |
| `export` | `export(): string` | Export as JSON |
| `import` | `import(json: string): boolean` | Import from JSON |

#### Example

```typescript
// Get
const theme = preferences.get('theme');

// Set with validation
preferences.set('pageSize', 100);  // ✓ valid
preferences.set('pageSize', 999);  // ✗ invalid, returns false

// Subscribe
const unsub = preferences.subscribe('theme', (newTheme) => {
  document.body.className = newTheme;
});
```

---

### NotificationManager

Toast notification system.

```typescript
import { notifications, NotificationManager } from './core/NotificationManager';
```

#### Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `show` | `show(options: NotificationOptions): string` | Show notification, returns ID |
| `info` | `info(message: string, options?): string` | Info toast |
| `success` | `success(message: string, options?): string` | Success toast |
| `warning` | `warning(message: string, options?): string` | Warning toast |
| `danger` | `danger(message: string, options?): string` | Error toast |
| `dismiss` | `dismiss(id: string): void` | Dismiss notification |
| `dismissAll` | `dismissAll(): void` | Dismiss all |
| `update` | `update(id: string, options: Partial<NotificationOptions>): void` | Update message |

#### Options

```typescript
interface NotificationOptions {
  id?: string;              // Unique identifier
  title?: string;           // Optional title
  message: string;          // Required message
  type?: 'info' | 'success' | 'warning' | 'danger';
  duration?: number;        // Auto-dismiss (ms), 0 = persistent
  dismissible?: boolean;    // Show close button
  progress?: boolean;       // Show progress bar
  actions?: NotificationAction[];  // Action buttons
}
```

#### Example

```typescript
// Simple
notifications.success('Data loaded successfully');

// With options
notifications.show({
  title: 'Export Complete',
  message: '500 rows exported to CSV',
  type: 'success',
  duration: 3000
});

// With actions
const id = notifications.show({
  title: 'Unsaved Changes',
  message: 'You have unsaved changes. Save before leaving?',
  type: 'warning',
  duration: 0,
  actions: [
    { label: 'Discard', handler: () => navigate() },
    { label: 'Save', variant: 'primary', handler: () => save() }
  ]
});
```

---

### ExportManager

Data export to multiple formats.

```typescript
import { exportManager, ExportManager } from './core/ExportManager';
```

#### Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `export` | `export(data, options): Promise<ExportResult>` | Export data to file |
| `toClipboard` | `toClipboard(data, options?): Promise<boolean>` | Copy to clipboard |
| `getExtension` | `getExtension(format): string` | Get file extension |
| `getMimeType` | `getMimeType(format): string` | Get MIME type |

#### Options

```typescript
interface ExportOptions {
  format: 'csv' | 'tsv' | 'json' | 'json-lines' | 'xlsx';
  filename?: string;
  columns?: ExportColumn[];  // Custom column selection
  includeHeaders?: boolean;
  delimiter?: string;        // CSV delimiter
  lineEnding?: 'unix' | 'windows';
  jsonPretty?: boolean;
  chunkSize?: number;        // Progress reporting interval
  onProgress?: (progress: number, message: string) => void;
}
```

#### Example

```typescript
// Simple CSV export
await exportManager.export(data, {
  format: 'csv',
  filename: 'genes_export'
});

// Customized export
await exportManager.export(data, {
  format: 'json',
  filename: 'filtered_data',
  jsonPretty: true,
  columns: [
    { key: 'id', header: 'Gene ID' },
    { key: 'name', header: 'Gene Name' },
    { key: 'score', header: 'Score', transform: (v) => v.toFixed(2) }
  ]
});

// Copy to clipboard
await exportManager.toClipboard(selectedRows);
```

---

### PluginManager

Plugin system for extensibility.

```typescript
import { pluginManager, PluginManager } from './core/PluginManager';
```

#### Plugin Interface

```typescript
interface Plugin {
  id: string;
  name: string;
  version: string;
  description?: string;
  author?: string;
  dependencies?: string[];
  
  onInit?(api: PluginAPI): void;
  onActivate?(): void;
  onDeactivate?(): void;
  onDestroy?(): void;
}
```

#### PluginAPI

```typescript
interface PluginAPI {
  // State
  getState(): AppState;
  updateState(partial: Partial<AppState>): void;
  
  // Events
  on(event: string, handler: Function): () => void;
  emit(event: string, payload?: any): void;
  
  // UI
  addToolbarButton(config: ToolbarButtonConfig): void;
  removeToolbarButton(id: string): void;
  showNotification(message: string, type?: NotificationType): void;
  
  // Data
  registerTransformer(name: string, fn: TransformerFunction): void;
  getData(): Record<string, any>[];
  getSelectedRows(): Record<string, any>[];
}
```

#### Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `register` | `register(plugin: Plugin): boolean` | Register plugin |
| `unregister` | `unregister(id: string): boolean` | Unregister plugin |
| `activate` | `activate(id: string): boolean` | Activate plugin |
| `deactivate` | `deactivate(id: string): boolean` | Deactivate plugin |
| `isActive` | `isActive(id: string): boolean` | Check if active |
| `getPlugin` | `getPlugin(id: string): Plugin | undefined` | Get plugin |
| `getAll` | `getAll(): Plugin[]` | Get all plugins |

#### Example

```typescript
const myPlugin: Plugin = {
  id: 'my-plugin',
  name: 'My Plugin',
  version: '1.0.0',
  
  onInit(api) {
    api.on('data:loaded', () => {
      api.showNotification('Data loaded!', 'success');
    });
    
    api.addToolbarButton({
      id: 'custom-action',
      icon: 'bi-star',
      label: 'Custom',
      onClick: () => console.log('Clicked!')
    });
  }
};

pluginManager.register(myPlugin);
pluginManager.activate('my-plugin');
```

---

### KeyboardManager

Keyboard shortcut management.

```typescript
import { keyboardManager, KeyboardManager } from './core/KeyboardManager';
```

#### Shortcut Interface

```typescript
interface ShortcutDefinition {
  id: string;
  keys: string;           // e.g., 'Ctrl+S', 'Alt+Shift+E'
  description: string;
  category: string;       // 'navigation' | 'selection' | 'actions' | 'view'
  handler: (e: KeyboardEvent) => void;
  enabled?: boolean;
  global?: boolean;       // Works even when input focused
}
```

#### Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `register` | `register(shortcut: ShortcutDefinition): void` | Register shortcut |
| `unregister` | `unregister(id: string): void` | Unregister shortcut |
| `enable` | `enable(id: string): void` | Enable shortcut |
| `disable` | `disable(id: string): void` | Disable shortcut |
| `getAll` | `getAll(): ShortcutDefinition[]` | Get all shortcuts |
| `showHelp` | `showHelp(): void` | Show help modal |
| `hideHelp` | `hideHelp(): void` | Hide help modal |

#### Example

```typescript
keyboardManager.register({
  id: 'export-csv',
  keys: 'Ctrl+Shift+E',
  description: 'Export to CSV',
  category: 'actions',
  handler: (e) => {
    e.preventDefault();
    exportManager.export(data, { format: 'csv' });
  }
});
```

---

## Events

### Standard Events

| Event | Payload | Description |
|-------|---------|-------------|
| `data:loaded` | `{ rowCount, tableName }` | Data fetch complete |
| `data:error` | `{ error, message }` | Data fetch failed |
| `table:changed` | `{ tableName, previous }` | Active table changed |
| `columns:changed` | `{ visible, hidden }` | Column visibility changed |
| `selection:changed` | `{ selected, count }` | Row selection changed |
| `sort:changed` | `{ column, direction }` | Sort order changed |
| `filter:changed` | `{ query, filters }` | Filter applied |
| `page:changed` | `{ page, pageSize }` | Pagination changed |
| `export:started` | `{ format, rowCount }` | Export started |
| `export:completed` | `ExportResult` | Export finished |
| `export:failed` | `{ error }` | Export failed |
| `preferences:changed` | `{ key, value, oldValue }` | Preference updated |
| `plugin:activated` | `{ id, name }` | Plugin activated |
| `plugin:deactivated` | `{ id }` | Plugin deactivated |

---

## Types

### TableColumnConfig

```typescript
interface TableColumnConfig {
  column: string;
  displayName: string;
  dataType?: ColumnDataType;
  visible?: boolean;
  sortable?: boolean;
  filterable?: boolean;
  searchable?: boolean;
  copyable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
  pin?: 'left' | 'right' | 'none';
  categories?: string[];
  transform?: TransformerConfig;
}
```

### CategoryConfig

```typescript
interface CategoryConfig {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  defaultVisible?: boolean;
  order?: number;
}
```

### TransformerConfig

```typescript
interface TransformerConfig {
  type: TransformerType;
  options?: Record<string, any>;
}

type TransformerType = 
  | 'link' | 'badge' | 'number' | 'date' | 'boolean'
  | 'percentage' | 'heatmap' | 'sequence' | 'ontology'
  | 'copy' | 'truncate' | 'highlight' | 'chain';
```

### ColumnDataType

```typescript
type ColumnDataType = 
  | 'string' | 'number' | 'integer' | 'float' | 'boolean'
  | 'date' | 'datetime' | 'timestamp' | 'duration'
  | 'id' | 'url' | 'email' | 'phone'
  | 'percentage' | 'currency' | 'filesize'
  | 'sequence' | 'ontology' | 'json' | 'array';
```

---

## Utilities

### Transformers

Available transformer types and their options:

#### link

```typescript
{
  type: 'link',
  options: {
    urlTemplate: string,  // Use {value} placeholder
    target?: '_blank' | '_self',
    icon?: string
  }
}
```

#### number

```typescript
{
  type: 'number',
  options: {
    decimals?: number,
    locale?: string,
    prefix?: string,
    suffix?: string,
    notation?: 'standard' | 'scientific' | 'compact'
  }
}
```

#### badge

```typescript
{
  type: 'badge',
  options: {
    color?: string,
    bgColor?: string,
    mapping?: Record<string, { color: string, bgColor: string }>
  }
}
```

#### heatmap

```typescript
{
  type: 'heatmap',
  options: {
    min: number,
    max: number,
    colorScale?: 'sequential' | 'diverging',
    showValue?: boolean,
    decimals?: number
  }
}
```

#### boolean

```typescript
{
  type: 'boolean',
  options: {
    trueLabel?: string,
    falseLabel?: string,
    trueIcon?: string,
    falseIcon?: string,
    trueColor?: string,
    falseColor?: string
  }
}
```

#### sequence

```typescript
{
  type: 'sequence',
  options: {
    type?: 'dna' | 'rna' | 'protein',
    truncate?: number,
    monospace?: boolean
  }
}
```

#### ontology

```typescript
{
  type: 'ontology',
  options: {
    prefix: string,        // e.g., 'GO'
    urlTemplate: string,
    style?: 'badge' | 'link' | 'text'
  }
}
```
