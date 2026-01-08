# DataTables Viewer

Production-grade, configurable data table viewer for research applications.

![Version](https://img.shields.io/badge/version-3.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)

## Overview

DataTables Viewer is a high-performance, extensible table viewer designed for researchers working with large datasets. It features:

- 🚀 **Configurable Rendering** - Define table layouts via JSON configuration
- 🎨 **Rich Transformers** - Transform cells into links, badges, heatmaps, and more
- 📊 **Category Management** - Group and toggle column visibility by category
- ⌨️ **Keyboard Navigation** - Full keyboard support for power users
- 🔌 **Plugin System** - Extend functionality with custom plugins
- 🌙 **Dark Mode** - Light, dark, and system themes
- 📤 **Export** - CSV, JSON, TSV export with column selection

## Quick Start

```bash
# Clone and install
git clone <repo-url>
cd DataTables_Viewer
npm install

# Start development server
npm run dev

# Open browser
open http://localhost:5173
```

### Test Mode

Use these credentials to test with local mock data:

- **Token**: `test`
- **Object ID**: `test/test/test`

## Documentation

| Document | Description |
|----------|-------------|
| [Developer Guide](docs/DEVELOPER_GUIDE.md) | Architecture, project structure, and extending the viewer |
| [API Reference](docs/API.md) | Complete API documentation for all managers and utilities |
| [Testing Guide](docs/TESTING.md) | Unit, integration, and E2E testing documentation |
| [Changelog](CHANGELOG.md) | Version history and changes |

## Project Structure

```
DataTables_Viewer/
├── public/
│   └── config/                  # JSON configuration files
│       ├── index.json           # Main app config
│       ├── test-data.json       # Test data type
│       ├── genome-data-tables.json  # Production config
│       └── schemas/             # JSON Schema definitions
├── src/
│   ├── main.ts                  # Entry point
│   ├── style.css                # Global styles
│   ├── core/                    # Core managers
│   │   ├── ApiClient.ts         # HTTP client
│   │   ├── EventBus.ts          # Pub/sub events
│   │   ├── StateManager.ts      # State management
│   │   ├── PluginManager.ts     # Plugin system
│   │   ├── KeyboardManager.ts   # Keyboard shortcuts
│   │   ├── PreferencesManager.ts # User settings
│   │   ├── ExportManager.ts     # Data export
│   │   └── NotificationManager.ts # Toast notifications
│   ├── ui/                      # UI components
│   │   ├── TableRenderer.ts     # Main orchestrator
│   │   └── components/          # UI components
│   ├── utils/                   # Utilities
│   │   ├── config-manager.ts    # Configuration
│   │   └── transformers.ts      # Cell transformers
│   └── types/                   # TypeScript types
├── docs/                        # Documentation
└── tests/                       # Test suites
```

## Configuration

### Main Config (index.json)

```json
{
  "app": {
    "name": "DataTables Viewer",
    "version": "3.0.0"
  },
  "dataTypes": {
    "my_data": {
      "configUrl": "/config/my-config.json",
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
    { "id": "core", "name": "Core Fields", "defaultVisible": true }
  ],
  "tables": {
    "my_table": {
      "displayName": "My Table",
      "columns": [
        {
          "column": "gene_id",
          "displayName": "Gene ID",
          "dataType": "id",
          "categories": ["core"],
          "transform": {
            "type": "link",
            "options": { "urlTemplate": "https://ncbi.nlm.nih.gov/gene/{value}" }
          }
        }
      ]
    }
  }
}
```

## Features

### Column Categories

Group related columns and toggle visibility as a group:

```json
{
  "sharedCategories": [
    { "id": "core", "name": "Core", "defaultVisible": true },
    { "id": "sequence", "name": "Sequence Data", "defaultVisible": false }
  ],
  "columns": [
    { "column": "id", "categories": ["core"] },
    { "column": "dna_seq", "categories": ["sequence"] }
  ]
}
```

### Cell Transformers

Transform cell values for display:

| Transformer | Description |
|-------------|-------------|
| `link` | Clickable hyperlinks |
| `badge` | Colored badges |
| `number` | Formatted numbers |
| `heatmap` | Color gradients |
| `boolean` | Icons for true/false |
| `sequence` | DNA/protein sequences |
| `ontology` | GO terms, etc. |

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `?` | Show keyboard help |
| `Ctrl+A` | Select all rows |
| `Ctrl+Shift+E` | Export to CSV |
| `Esc` | Clear selection |
| `R` | Refresh data |
| `↑/↓` | Navigate rows |

### Plugin System

Extend functionality with plugins:

```typescript
const myPlugin = {
  id: 'my-plugin',
  name: 'My Plugin',
  version: '1.0.0',
  onInit(api) {
    api.on('data:loaded', () => {
      api.showNotification('Data loaded!', 'success');
    });
  }
};

pluginManager.register(myPlugin);
pluginManager.activate('my-plugin');
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm test` | Run tests |
| `npm run test:coverage` | Run tests with coverage |
| `npm run typecheck` | TypeScript type checking |

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

See [DEVELOPER_GUIDE.md](docs/DEVELOPER_GUIDE.md) for coding guidelines.

## License

MIT License - see [LICENSE](LICENSE) for details.

## Acknowledgments

- [Bootstrap Icons](https://icons.getbootstrap.com/) - UI icons
- [Vite](https://vitejs.dev/) - Build tool
- [TypeScript](https://www.typescriptlang.org/) - Type safety
