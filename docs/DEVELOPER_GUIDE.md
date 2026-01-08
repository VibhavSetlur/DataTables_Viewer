# Developer Guide

Comprehensive guide for developers working on or extending the DataTables Viewer.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Quick Start](#quick-start)
3. [Project Structure](#project-structure)
4. [Core Concepts](#core-concepts)
5. [Adding Features](#adding-features)
6. [Creating Plugins](#creating-plugins)
7. [Configuration](#configuration)
8. [Best Practices](#best-practices)
9. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

### High-Level Design

```
┌─────────────────────────────────────────────────────────────────┐
│                        Configuration Layer                       │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────────┐ │
│  │ index.json   │ │ test-data    │ │ genome-data-tables.json │ │
│  │ (app config) │ │   .json      │ │ (data type config)      │ │
│  └──────────────┘ └──────────────┘ └──────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         Core Layer                               │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌──────────────┐  │
│  │ EventBus   │ │ StateMan.  │ │ ApiClient  │ │ ConfigMan.   │  │
│  │ (pub/sub)  │ │ (state)    │ │ (HTTP)     │ │ (configs)    │  │
│  └────────────┘ └────────────┘ └────────────┘ └──────────────┘  │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌──────────────┐  │
│  │ PluginMan. │ │ Keyboard   │ │ Prefs.     │ │ Export       │  │
│  │ (extend)   │ │ (shortcuts)│ │ (settings) │ │ (files)      │  │
│  └────────────┘ └────────────┘ └────────────┘ └──────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                          UI Layer                                │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                     TableRenderer                           │ │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐   │ │
│  │  │ Sidebar  │ │ Toolbar  │ │ DataGrid │ │ Schema Modal │   │ │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────────┘   │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow

```
User Action → Event → StateManager → Subscribers → UI Update
     │
     └→ API Call (if needed) → Response → State Update → UI
```

---

## Quick Start

### Prerequisites

- Node.js 18+
- npm 9+

### Setup

```bash
# Clone repository
git clone <repo-url>
cd DataTables_Viewer

# Install dependencies
npm install

# Start development server
npm run dev

# Open browser
open http://localhost:5173
```

### Development Workflow

```bash
# Type checking (continuous)
npm run typecheck:watch

# Run tests
npm test

# Build for production
npm run build

# Preview production build
npm run preview
```

---

## Project Structure

```
DataTables_Viewer/
├── public/
│   └── config/
│       ├── index.json           # Main app configuration
│       ├── test-data.json       # Test data type config
│       ├── genome-data-tables.json  # Production data type
│       └── schemas/
│           └── config.schema.json   # JSON Schema for validation
├── src/
│   ├── main.ts                  # Entry point
│   ├── style.css                # Global styles
│   ├── core/                    # Core managers
│   │   ├── EventBus.ts          # Pub/sub system
│   │   ├── StateManager.ts      # Application state
│   │   ├── ApiClient.ts         # HTTP client
│   │   ├── CategoryManager.ts   # Column categories
│   │   ├── PluginManager.ts     # Plugin system
│   │   ├── KeyboardManager.ts   # Keyboard shortcuts
│   │   ├── PreferencesManager.ts # User preferences
│   │   ├── ExportManager.ts     # Data export
│   │   ├── NotificationManager.ts # Toast notifications
│   │   └── data-type-registry.ts # Data type configs
│   ├── ui/
│   │   ├── Component.ts         # Base component class
│   │   ├── TableRenderer.ts     # Main orchestrator
│   │   └── components/
│   │       ├── Sidebar.ts       # Navigation sidebar
│   │       ├── Toolbar.ts       # Actions toolbar
│   │       └── DataGrid.ts      # Data table
│   ├── utils/
│   │   ├── config-manager.ts    # Configuration loading
│   │   └── transformers.ts      # Cell transformers
│   └── types/
│       └── schema.ts            # TypeScript types
├── docs/
│   ├── API.md                   # API reference
│   ├── TESTING.md               # Testing guide
│   └── DEVELOPER_GUIDE.md       # This file
├── tests/
│   ├── unit/                    # Unit tests
│   ├── integration/             # Integration tests
│   └── e2e/                     # End-to-end tests
└── package.json
```

---

## Core Concepts

### 1. State Management

All application state flows through `StateManager`:

```typescript
import { StateManager } from './core/StateManager';

const state = new StateManager();

// Read state
const current = state.getState();
console.log(current.data, current.loading);

// Update state (immutable)
state.update({ loading: true });

// Subscribe to changes
const unsubscribe = state.subscribe(newState => {
  console.log('State changed:', newState);
});

// Cleanup
unsubscribe();
```

### 2. Event Bus

Decoupled communication between components:

```typescript
import { eventBus } from './core/EventBus';

// Subscribe
eventBus.on('data:loaded', (payload) => {
  console.log('Received:', payload);
});

// Emit
eventBus.emit('data:loaded', { rows: 100 });

// One-time listener
eventBus.once('app:ready', () => {
  console.log('App initialized');
});

// Wildcard (debug)
eventBus.on('*', (event, payload) => {
  console.log(`[Event] ${event}:`, payload);
});
```

### 3. Configuration System

Configuration resolves in layers:

```
Global Defaults → Data Type Defaults → Table Settings → Column Settings
```

```typescript
import { ConfigManager } from './utils/config-manager';

const config = await ConfigManager.create();

// Get table config (merged with defaults)
const tableConfig = config.getTableConfig('genes');

// Access settings
console.log(tableConfig.columns);
console.log(tableConfig.categories);
console.log(tableConfig.settings.pageSize);
```

### 4. Transformers

Transform cell values for display:

```typescript
// In config
{
  "column": "uniprot_id",
  "transform": {
    "type": "link",
    "options": {
      "urlTemplate": "https://uniprot.org/uniprot/{value}",
      "target": "_blank"
    }
  }
}

// Multiple transforms (chain)
{
  "column": "score",
  "transform": [
    { "type": "number", "options": { "decimals": 2 } },
    { "type": "heatmap", "options": { "min": 0, "max": 100 } }
  ]
}
```

---

## Adding Features

### Adding a New Transformer

1. **Define the transformer** in `src/utils/transformers.ts`:

```typescript
export function myTransformer(
  value: any, 
  options: { prefix?: string; suffix?: string }
): string {
  if (value === null || value === undefined) return '—';
  return `${options.prefix || ''}${value}${options.suffix || ''}`;
}

// Register
registerTransformer('myTransform', myTransformer);
```

2. **Use in config**:

```json
{
  "column": "myColumn",
  "transform": {
    "type": "myTransform",
    "options": { "prefix": "$", "suffix": " USD" }
  }
}
```

### Adding a Keyboard Shortcut

```typescript
import { keyboardManager } from './core/KeyboardManager';

keyboardManager.register({
  id: 'custom-action',
  keys: 'Ctrl+Shift+X',
  description: 'Do something custom',
  category: 'actions',
  handler: (e) => {
    e.preventDefault();
    // Your action
  }
});
```

### Adding a New Preference

1. **Add to schema** in `PreferencesManager.ts`:

```typescript
export interface UserPreferences {
  // ... existing
  myNewPref: boolean;
}

const PREFERENCE_SCHEMAS = {
  // ... existing
  myNewPref: {
    default: false,
    validate: (v): v is boolean => typeof v === 'boolean',
    onApply: (value) => {
      // Side effect when preference changes
    }
  }
};
```

2. **Use in code**:

```typescript
import { preferences } from './core/PreferencesManager';

if (preferences.get('myNewPref')) {
  // Feature enabled
}
```

---

## Creating Plugins

### Plugin Structure

```typescript
import type { Plugin, PluginAPI } from './core/PluginManager';

export const myPlugin: Plugin = {
  id: 'my-plugin',
  name: 'My Custom Plugin',
  version: '1.0.0',
  description: 'Adds custom functionality',
  author: 'Your Name',
  
  // Lifecycle hooks
  onInit(api: PluginAPI) {
    console.log('Plugin initialized');
    
    // Register custom transformer
    api.registerTransformer('myCustom', (value, opts) => {
      return `[${value}]`;
    });
    
    // Add toolbar button
    api.addToolbarButton({
      id: 'my-action',
      icon: 'bi-star',
      label: 'My Action',
      onClick: () => {
        api.showNotification('Action triggered!', 'info');
      }
    });
    
    // Subscribe to events
    api.on('data:loaded', ({ rowCount }) => {
      console.log(`Loaded ${rowCount} rows`);
    });
  },
  
  onActivate() {
    console.log('Plugin activated');
  },
  
  onDeactivate() {
    console.log('Plugin deactivated');
  },
  
  onDestroy() {
    console.log('Plugin destroyed');
  }
};
```

### Registering Plugins

```typescript
import { pluginManager } from './core/PluginManager';
import { myPlugin } from './plugins/my-plugin';

// Register
pluginManager.register(myPlugin);

// Activate
pluginManager.activate('my-plugin');
```

---

## Configuration

### Main Config (index.json)

```json
{
  "app": {
    "name": "My DataTables App",
    "version": "1.0.0"
  },
  "apis": {
    "production": {
      "id": "production",
      "url": "https://api.example.com",
      "type": "rest"
    }
  },
  "dataTypes": {
    "my_data": {
      "configUrl": "/config/my-data.json",
      "matches": ["MyApp.DataType-*"],
      "autoLoad": true
    }
  },
  "defaults": {
    "pageSize": 50,
    "theme": "system"
  },
  "features": {
    "schemaExplorer": true,
    "exportFormats": ["csv", "json"]
  }
}
```

### Data Type Config

```json
{
  "id": "my_data",
  "name": "My Data Type",
  "version": "1.0.0",
  "sharedCategories": [
    {
      "id": "core",
      "name": "Core Fields",
      "defaultVisible": true
    }
  ],
  "tables": {
    "my_table": {
      "displayName": "My Table",
      "columns": [
        {
          "column": "id",
          "displayName": "ID",
          "dataType": "integer",
          "sortable": true,
          "categories": ["core"]
        }
      ]
    }
  }
}
```

---

## Best Practices

### Code Style

1. **Use TypeScript strictly** - Enable `strict: true` in tsconfig
2. **Prefer immutability** - Don't mutate state directly
3. **Use events** for cross-component communication
4. **Keep components focused** - Single responsibility
5. **Document public APIs** - JSDoc comments

### Performance

1. **Debounce user input** - Search, filters (300-500ms)
2. **Virtualize large lists** - Use windowing for 1000+ rows
3. **Lazy load configs** - Only load what's needed
4. **Memoize transformations** - Cache expensive operations

### Testing

1. **Test behavior, not implementation**
2. **Use factories for test data**
3. **Mock external dependencies**
4. **Aim for 80%+ coverage**

---

## Troubleshooting

### Common Issues

#### Config Not Loading

```typescript
// Check console for errors
localStorage.setItem('DATATABLE_DEBUG', 'true');

// Verify file exists
fetch('/config/index.json').then(r => console.log(r.status));
```

#### Columns Not Showing

1. Check if `state.columns` is populated
2. Verify category visibility
3. Check for JavaScript errors
4. Ensure config is loaded

#### Transformers Not Applied

1. Verify transformer type is registered
2. Check config spelling
3. Look for console errors
4. Verify value is not null/undefined

### Debug Mode

```typescript
// Enable debug logging
localStorage.setItem('DATATABLE_DEBUG', 'true');

// View all events
eventBus.on('*', (event, data) => {
  console.log(`[Event] ${event}:`, data);
});

// Inspect state
console.log(stateManager.getState());
```

### Getting Help

1. Check the [API documentation](./API.md)
2. Review [test examples](./TESTING.md)
3. Search existing issues
4. Create a new issue with reproduction steps

---

## Version History

See [CHANGELOG.md](../CHANGELOG.md) for version history and changes.
