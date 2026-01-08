# Testing Guide

Complete testing documentation for DataTables Viewer covering unit tests, integration tests, and end-to-end testing.

## Table of Contents

1. [Testing Philosophy](#testing-philosophy)
2. [Test Setup](#test-setup)
3. [Unit Testing](#unit-testing)
4. [Integration Testing](#integration-testing)
5. [E2E Testing](#e2e-testing)
6. [Test Data](#test-data)
7. [Coverage](#coverage)
8. [CI/CD Integration](#cicd-integration)

---

## Testing Philosophy

### Principles

1. **Test Behavior, Not Implementation** - Focus on what the code does, not how it does it
2. **Arrange-Act-Assert** - Clear structure for all tests
3. **Single Responsibility** - Each test validates one behavior
4. **Fast & Isolated** - Tests should run quickly and not depend on external services
5. **Readable** - Tests serve as documentation

### Testing Pyramid

```
        ╱╲
       ╱ E2E ╲           ~10% - Browser automation
      ╱────────╲
     ╱Integration╲       ~20% - API & component integration  
    ╱──────────────╲
   ╱   Unit Tests   ╲    ~70% - Individual functions & classes
  ╲──────────────────╱
```

---

## Test Setup

### Dependencies

```bash
npm install -D vitest @testing-library/dom jsdom @vitest/coverage-v8
npm install -D playwright @playwright/test
```

### Configuration

**vitest.config.ts**
```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      exclude: ['node_modules', 'tests', '*.config.*']
    },
    include: ['tests/**/*.test.ts']
  }
});
```

**tests/setup.ts**
```typescript
import { beforeEach, afterEach, vi } from 'vitest';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};
global.localStorage = localStorageMock as any;

// Reset mocks between tests
beforeEach(() => {
  vi.clearAllMocks();
  document.body.innerHTML = '';
});

afterEach(() => {
  vi.restoreAllMocks();
});
```

---

## Unit Testing

### Core Managers

**tests/unit/EventBus.test.ts**
```typescript
import { describe, it, expect, vi } from 'vitest';
import { EventBus } from '../../src/core/EventBus';

describe('EventBus', () => {
  it('should emit and receive events', () => {
    const bus = EventBus.getInstance();
    const handler = vi.fn();
    
    bus.on('test:event', handler);
    bus.emit('test:event', { value: 42 });
    
    expect(handler).toHaveBeenCalledWith({ value: 42 });
  });
  
  it('should support one-time listeners', () => {
    const bus = EventBus.getInstance();
    const handler = vi.fn();
    
    bus.once('single:event', handler);
    bus.emit('single:event', {});
    bus.emit('single:event', {});
    
    expect(handler).toHaveBeenCalledTimes(1);
  });
  
  it('should remove listeners with off()', () => {
    const bus = EventBus.getInstance();
    const handler = vi.fn();
    
    bus.on('remove:test', handler);
    bus.off('remove:test', handler);
    bus.emit('remove:test', {});
    
    expect(handler).not.toHaveBeenCalled();
  });
  
  it('should support wildcard subscriptions', () => {
    const bus = EventBus.getInstance();
    const handler = vi.fn();
    
    bus.on('*', handler);
    bus.emit('any:event', { data: 'test' });
    
    expect(handler).toHaveBeenCalledWith('any:event', { data: 'test' });
  });
});
```

**tests/unit/StateManager.test.ts**
```typescript
import { describe, it, expect, vi } from 'vitest';
import { StateManager } from '../../src/core/StateManager';

describe('StateManager', () => {
  it('should initialize with default state', () => {
    const sm = new StateManager();
    const state = sm.getState();
    
    expect(state.data).toEqual([]);
    expect(state.loading).toBe(false);
    expect(state.currentPage).toBe(0);
  });
  
  it('should update state immutably', () => {
    const sm = new StateManager();
    const initial = sm.getState();
    
    sm.update({ loading: true });
    const updated = sm.getState();
    
    expect(updated.loading).toBe(true);
    expect(initial.loading).toBe(false);
    expect(initial).not.toBe(updated);
  });
  
  it('should notify subscribers on update', () => {
    const sm = new StateManager();
    const subscriber = vi.fn();
    
    sm.subscribe(subscriber);
    sm.update({ currentPage: 5 });
    
    expect(subscriber).toHaveBeenCalledWith(expect.objectContaining({
      currentPage: 5
    }));
  });
  
  it('should allow unsubscribing', () => {
    const sm = new StateManager();
    const subscriber = vi.fn();
    
    const unsubscribe = sm.subscribe(subscriber);
    unsubscribe();
    sm.update({ loading: true });
    
    expect(subscriber).not.toHaveBeenCalled();
  });
});
```

**tests/unit/PreferencesManager.test.ts**
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PreferencesManager } from '../../src/core/PreferencesManager';

describe('PreferencesManager', () => {
  beforeEach(() => {
    localStorage.clear();
  });
  
  it('should return default values', () => {
    const prefs = PreferencesManager.getInstance();
    
    expect(prefs.get('theme')).toBe('system');
    expect(prefs.get('pageSize')).toBe(50);
  });
  
  it('should validate preference values', () => {
    const prefs = PreferencesManager.getInstance();
    
    expect(prefs.set('pageSize', 999)).toBe(false);
    expect(prefs.get('pageSize')).toBe(50);
  });
  
  it('should persist to localStorage', () => {
    const prefs = PreferencesManager.getInstance();
    
    prefs.set('density', 'compact');
    
    expect(localStorage.setItem).toHaveBeenCalled();
  });
  
  it('should notify subscribers of changes', () => {
    const prefs = PreferencesManager.getInstance();
    const listener = vi.fn();
    
    prefs.subscribe('theme', listener);
    prefs.set('theme', 'dark');
    
    expect(listener).toHaveBeenCalledWith('dark');
  });
});
```

### Transformers

**tests/unit/transformers.test.ts**
```typescript
import { describe, it, expect } from 'vitest';
import { 
  applyTransformer, 
  linkTransformer, 
  numberTransformer,
  badgeTransformer 
} from '../../src/utils/transformers';

describe('Transformers', () => {
  describe('linkTransformer', () => {
    it('should create link HTML', () => {
      const result = linkTransformer('ABC123', {
        urlTemplate: 'https://example.com/{value}'
      });
      
      expect(result).toContain('href="https://example.com/ABC123"');
      expect(result).toContain('ABC123');
    });
    
    it('should handle empty values', () => {
      const result = linkTransformer('', {
        urlTemplate: 'https://example.com/{value}'
      });
      
      expect(result).toBe('—');
    });
  });
  
  describe('numberTransformer', () => {
    it('should format numbers with locale', () => {
      const result = numberTransformer(1234.567, {
        decimals: 2,
        locale: 'en-US'
      });
      
      expect(result).toBe('1,234.57');
    });
    
    it('should handle suffix/prefix', () => {
      const result = numberTransformer(42, {
        suffix: '%',
        decimals: 0
      });
      
      expect(result).toBe('42%');
    });
  });
  
  describe('badgeTransformer', () => {
    it('should create badge HTML', () => {
      const result = badgeTransformer('Active', {
        color: '#22c55e'
      });
      
      expect(result).toContain('ts-badge');
      expect(result).toContain('Active');
    });
  });
});
```

---

## Integration Testing

### API Client

**tests/integration/ApiClient.test.ts**
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiClient } from '../../src/core/ApiClient';

describe('ApiClient Integration', () => {
  let client: ApiClient;
  
  beforeEach(() => {
    client = new ApiClient({
      url: 'https://api.example.com',
      type: 'rest'
    });
    
    // Mock fetch
    global.fetch = vi.fn();
  });
  
  it('should list tables from API', async () => {
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        tables: [
          { name: 'genes', row_count: 100 },
          { name: 'proteins', row_count: 50 }
        ]
      })
    });
    
    const result = await client.listTables('test-id');
    
    expect(result.tables).toHaveLength(2);
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('list_tables'),
      expect.any(Object)
    );
  });
  
  it('should handle API errors gracefully', async () => {
    (fetch as any).mockRejectedValueOnce(new Error('Network error'));
    
    await expect(client.listTables('test-id')).rejects.toThrow('Network error');
  });
  
  it('should include auth token in requests', async () => {
    client.setToken('my-secret-token');
    
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ tables: [] })
    });
    
    await client.listTables('test-id');
    
    expect(fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          'Authorization': 'my-secret-token'
        })
      })
    );
  });
});
```

### ComponentIntegration

**tests/integration/Sidebar.test.ts**
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Sidebar } from '../../src/ui/components/Sidebar';
import { StateManager } from '../../src/core/StateManager';
import { ConfigManager } from '../../src/utils/config-manager';

describe('Sidebar Integration', () => {
  let sidebar: Sidebar;
  let stateManager: StateManager;
  let container: HTMLElement;
  
  beforeEach(async () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    
    stateManager = new StateManager();
    const configManager = await ConfigManager.create();
    
    sidebar = new Sidebar({
      container,
      configManager,
      stateManager,
      onApiChange: vi.fn(),
      onLoadData: vi.fn(),
      onTableChange: vi.fn(),
      onExport: vi.fn(),
      onReset: vi.fn(),
      onShowSchema: vi.fn()
    });
  });
  
  it('should render column list when state updates', () => {
    stateManager.update({
      columns: [
        { column: 'id', displayName: 'ID', visible: true },
        { column: 'name', displayName: 'Name', visible: true }
      ],
      visibleColumns: new Set(['id', 'name'])
    });
    
    sidebar.renderColumnList();
    
    const checkboxes = container.querySelectorAll('.ts-col-item input');
    expect(checkboxes).toHaveLength(2);
  });
  
  it('should toggle column visibility on click', () => {
    stateManager.update({
      columns: [{ column: 'test', displayName: 'Test', visible: true }],
      visibleColumns: new Set(['test'])
    });
    
    sidebar.renderColumnList();
    
    const checkbox = container.querySelector('[data-col="test"]') as HTMLInputElement;
    checkbox.click();
    
    expect(stateManager.getState().visibleColumns.has('test')).toBe(false);
  });
});
```

---

## E2E Testing

### Playwright Configuration

**playwright.config.ts**
```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure'
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } }
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI
  }
});
```

### E2E Test Examples

**tests/e2e/data-loading.spec.ts**
```typescript
import { test, expect } from '@playwright/test';

test.describe('Data Loading', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });
  
  test('should load test data successfully', async ({ page }) => {
    // Fill credentials
    await page.fill('#ts-token', 'test');
    await page.fill('#ts-berdl', 'test/test/test');
    
    // Click load
    await page.click('#ts-load');
    
    // Wait for data
    await expect(page.locator('.ts-table tbody tr')).toHaveCount.greaterThan(0);
  });
  
  test('should show loading state', async ({ page }) => {
    await page.fill('#ts-token', 'test');
    await page.fill('#ts-berdl', 'test/test/test');
    
    // Start loading
    await page.click('#ts-load');
    
    // Should show spinner
    await expect(page.locator('.ts-spinner')).toBeVisible();
    
    // Should hide after loading
    await expect(page.locator('.ts-spinner')).toBeHidden({ timeout: 10000 });
  });
  
  test('should display error for invalid credentials', async ({ page }) => {
    await page.fill('#ts-berdl', '');
    await page.click('#ts-load');
    
    await expect(page.locator('.ts-alert-danger')).toBeVisible();
  });
});

test.describe('Table Interactions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.fill('#ts-token', 'test');
    await page.fill('#ts-berdl', 'test/test/test');
    await page.click('#ts-load');
    await page.waitForSelector('.ts-table tbody tr');
  });
  
  test('should select row on click', async ({ page }) => {
    await page.click('.ts-table tbody tr:first-child');
    
    await expect(page.locator('.ts-table tbody tr:first-child')).toHaveClass(/selected/);
    await expect(page.locator('.ts-status-selections')).toContainText('1 selected');
  });
  
  test('should sort column on header click', async ({ page }) => {
    const header = page.locator('th[data-col="id"]');
    await header.click();
    
    await expect(header).toHaveClass(/sort-asc/);
    
    await header.click();
    await expect(header).toHaveClass(/sort-desc/);
  });
  
  test('should filter with search', async ({ page }) => {
    await page.fill('#ts-search', 'Gene_001');
    
    // Wait for debounce
    await page.waitForTimeout(500);
    
    const rows = page.locator('.ts-table tbody tr');
    await expect(rows).toHaveCount.lessThan(500);
  });
  
  test('should paginate correctly', async ({ page }) => {
    await page.click('[data-page="next"]');
    
    await expect(page.locator('.ts-page-info')).toContainText('51');
  });
});

test.describe('Column Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.fill('#ts-token', 'test');
    await page.fill('#ts-berdl', 'test/test/test');
    await page.click('#ts-load');
    await page.waitForSelector('.ts-col-list');
  });
  
  test('should toggle column visibility', async ({ page }) => {
    // Uncheck column
    await page.click('[data-col="genome_id"]');
    
    // Column should be hidden
    await expect(page.locator('th[data-col="genome_id"]')).toBeHidden();
    
    // Re-check
    await page.click('[data-col="genome_id"]');
    await expect(page.locator('th[data-col="genome_id"]')).toBeVisible();
  });
  
  test('should toggle category visibility', async ({ page }) => {
    // Find and click category toggle
    const categoryToggle = page.locator('.ts-toggle-list li').filter({ hasText: 'Genomic Location' });
    await categoryToggle.click();
    
    // Related columns should toggle
    await expect(page.locator('th[data-col="contig_id"]')).toBeVisible();
  });
});
```

---

## Test Data

### Mock Data Factory

**tests/fixtures/data-factory.ts**
```typescript
export function createMockRows(count: number): Record<string, any>[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    feature_id: `Gene_${String(i + 1).padStart(3, '0')}`,
    genome_id: `Genome_${Math.floor(i / 10) + 1}`,
    bakta_function: `Mock Function ${i + 1}`,
    length: Math.floor(Math.random() * 5000) + 100,
    strand: Math.random() > 0.5 ? '+' : '-'
  }));
}

export function createMockTables() {
  return [
    { name: 'genome_features', row_count: 500, displayName: 'Genome Features' },
    { name: 'pan_genome_features', row_count: 200, displayName: 'Pangenome Features' },
    { name: 'genome_ani', row_count: 100, displayName: 'ANI Matrix' }
  ];
}

export function createMockConfig() {
  return {
    id: 'test_data',
    name: 'Test Data',
    version: '1.0.0',
    sharedCategories: [
      { id: 'core', name: 'Core', defaultVisible: true },
      { id: 'location', name: 'Location', defaultVisible: false }
    ],
    tables: {
      genome_features: {
        displayName: 'Genome Features',
        columns: [
          { column: 'id', displayName: 'ID', categories: ['core'] },
          { column: 'feature_id', displayName: 'Feature ID', categories: ['core'] }
        ]
      }
    }
  };
}
```

---

## Coverage

### Running Coverage

```bash
# Unit + Integration tests with coverage
npm run test:coverage

# View HTML report
open coverage/index.html
```

### Coverage Thresholds

**vitest.config.ts**
```typescript
export default defineConfig({
  test: {
    coverage: {
      thresholds: {
        statements: 80,
        branches: 75,
        functions: 80,
        lines: 80
      }
    }
  }
});
```

### Interpreting Reports

| Metric | Target | Description |
|--------|--------|-------------|
| Statements | ≥80% | Lines of code executed |
| Branches | ≥75% | If/else paths taken |
| Functions | ≥80% | Functions called |
| Lines | ≥80% | Source lines covered |

---

## CI/CD Integration

### GitHub Actions

**.github/workflows/test.yml**
```yaml
name: Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Type check
        run: npm run typecheck
      
      - name: Lint
        run: npm run lint
      
      - name: Unit & Integration tests
        run: npm run test:coverage
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
  
  e2e:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Install Playwright
        run: npx playwright install --with-deps
      
      - name: Run E2E tests
        run: npx playwright test
      
      - name: Upload report
        uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

### Pre-commit Hooks

**package.json**
```json
{
  "scripts": {
    "test": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:e2e": "playwright test",
    "typecheck": "tsc --noEmit",
    "lint": "eslint src --ext .ts,.tsx",
    "prepare": "husky install"
  },
  "lint-staged": {
    "*.ts": ["eslint --fix", "vitest related --run"]
  }
}
```

---

## Quick Reference

### Commands

| Command | Description |
|---------|-------------|
| `npm test` | Run tests in watch mode |
| `npm run test:coverage` | Run with coverage |
| `npm run test:e2e` | Run Playwright tests |
| `npm run test:ui` | Open Vitest UI |

### File Structure

```
tests/
├── setup.ts              # Global test setup
├── fixtures/             # Mock data factories
│   └── data-factory.ts
├── unit/                 # Unit tests
│   ├── EventBus.test.ts
│   ├── StateManager.test.ts
│   └── transformers.test.ts
├── integration/          # Integration tests
│   ├── ApiClient.test.ts
│   └── Sidebar.test.ts
└── e2e/                  # End-to-end tests
    ├── data-loading.spec.ts
    └── table-interactions.spec.ts
```
