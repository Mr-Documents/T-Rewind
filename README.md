# T-Rewind: Time-Travel Debugger for VS Code

[![VS Code Version](https://img.shields.io/badge/VS%20Code-1.80.0+-blue.svg)](https://code.visualstudio.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.1+-blue.svg)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Version](https://img.shields.io/badge/Version-0.0.1-orange.svg)](package.json)

**T-Rewind** is a professional-grade VS Code extension that brings time-travel debugging capabilities to your development workflow. Capture, visualize, and navigate through your code's evolution with precision diff-based storage and an intuitive timeline interface.

---

## 🚀 Features

### Core Capabilities
- **Continuous Code History Tracking**: Automatically captures file changes in real-time during recording sessions
- **Visual Timeline Interface**: Interactive webview-based timeline for intuitive navigation through code history
- **Diff-Based Storage**: Efficient storage using unified diff patches to minimize memory footprint
- **Time-Travel Navigation**: Jump to any point in time and reconstruct file states instantly
- **Smart File Restoration**: Restore individual files to any previous state with a single click
- **Bookmark System**: Mark important moments in your development timeline for quick access
- **Live Diff Viewing**: See changes as they happen with real-time diff visualization

### Intelligent Filtering
- Automatic exclusion of build artifacts (`dist/`, `out/`)
- Ignores dependency directories (`node_modules/`)
- Skips version control metadata (`.git/`)
- Configurable debounce for file change recording

### State Management
- **Workspace Persistence**: Timeline state persists across VS Code sessions
- **Session Metadata**: Track recording sessions with timestamps and tags
- **Immer-powered State**: Immutable state management with excellent performance

---

## 🏗️ Architecture

### Core Components

```
src/
├── core/
│   ├── timelineManager.ts    # Central state management & timeline logic
│   ├── diffEngine.ts         # Diff computation & content reconstruction
│   └── fileWatcher.ts        # Real-time file system monitoring
├── ui/
│   ├── components/           # React UI components
│   └── webview/              # Webview integration layer
├── types/
│   └── index.ts              # TypeScript type definitions
├── commands/                 # VS Code command handlers
└── extension.ts              # Extension entry point & activation
```

### Data Flow

1. **Recording Phase**
   - `FileWatcher` monitors file system events (create, modify, delete)
   - Changes are debounced and filtered
   - `DiffEngine` computes patches for modifications
   - `TimelineManager` stores snapshots with delta compression

2. **Navigation Phase**
   - User interacts with timeline UI
   - `TimelineManager` updates current time pointer
   - `DiffEngine` reconstructs file content at selected timestamp
   - UI displays restored state with diff visualization

3. **Restoration Phase**
   - User selects file and timestamp for restoration
   - `DiffEngine` reconstructs full content from patches
   - File system writes restored content
   - Workspace updates reflect restored state

### Technology Stack

- **Language**: TypeScript 5.1+
- **Runtime**: Node.js 20.x
- **UI Framework**: React 18.2+ with JSX
- **State Management**: Immer 10.0+
- **Diff Engine**: jsdiff 5.1+
- **Icons**: Lucide React 0.263+
- **Build**: Webpack 5.85+ with TypeScript loader
- **Target**: VS Code Extension API 1.80.0+

---

## 📦 Installation

### From VS Code Marketplace (Coming Soon)

```bash
code --install-extension time-travel-team.vscode-time-travel
```

### Manual Installation

1. Clone the repository:
```bash
git clone https://github.com/Mr-Documents/T-Rewind.git
cd "Time-Travel Debugger(VS Code)"
```

2. Install dependencies:
```bash
npm install
```

3. Build the extension:
```bash
npm run compile
```

4. Package the extension:
```bash
npm run package
```

5. Install in VS Code:
```bash
code --install-extension ./vscode-time-travel-0.0.1.vsix
```

---

## 🎯 Usage

### Getting Started

1. **Open the Timeline**
   - Use the command palette: `Time-Travel: Open Timeline`
   - Or access via the sidebar: `View > Time-Travel`

2. **Start Recording**
   - Click the record button in the timeline panel
   - Or use: `Time-Travel: Start Recording`
   - The extension will begin capturing file changes

3. **Make Changes**
   - Edit files in your workspace as usual
   - Changes are automatically captured and timestamped

4. **Navigate History**
   - Click anywhere on the timeline to jump to that moment
   - Use bookmarks to mark important states
   - View file content at any point in time

5. **Restore Files**
   - Select a file and timestamp
   - Click "Restore" to revert the file to that state
   - The file is immediately updated in your workspace

### Keyboard Shortcuts

| Command | Shortcut |
|---------|----------|
| Open Timeline | `Ctrl+Shift+T` (configurable) |
| Start Recording | `Ctrl+Shift+R` (configurable) |
| Stop Recording | `Ctrl+Shift+S` (configurable) |

### Workflow Example

```typescript
// 1. Start recording session
// 2. Make changes to multiple files
// 3. Realize you need to revert a specific function
// 4. Navigate to the timestamp before the changes
// 5. Restore the specific file
// 6. Continue development from that point
```

---

## 🔧 Development

### Prerequisites

- Node.js 20.x or higher
- npm 9.x or higher
- VS Code 1.80.0 or higher

### Setup Development Environment

1. Install dependencies:
```bash
npm install
```

2. Run in watch mode for development:
```bash
npm run watch
```

3. Press `F5` in VS Code to launch the Extension Development Host

### Build Commands

```bash
# Compile TypeScript
npm run compile

# Watch for changes
npm run watch

# Production build
npm run package

# Run linter
npm run lint

# Run tests
npm run test
```

### Project Structure

- `src/core/`: Core business logic (timeline, diff, file watching)
- `src/ui/`: React components and webview integration
- `src/types/`: TypeScript type definitions
- `src/commands/`: VS Code command implementations
- `src/extension.ts`: Extension activation and entry point

### Code Style

- **ESLint**: Configured with TypeScript ESLint rules
- **Prettier**: Recommended for consistent formatting (add via `.prettierrc`)
- **TypeScript Strict Mode**: Enabled for type safety

---

## 🧪 Testing

### Running Tests

```bash
# Compile tests
npm run compile-tests

# Run tests
npm run test

# Watch mode for tests
npm run watch-tests
```

### Test Structure

Tests are located in the `test/` directory and use the Mocha framework with VS Code's test utilities.

---

## 🤝 Contributing

We welcome contributions! Please follow these guidelines:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes** following the existing code style
4. **Add tests** for new functionality
5. **Ensure all tests pass**: `npm test`
6. **Commit your changes**: `git commit -m 'Add amazing feature'`
7. **Push to the branch**: `git push origin feature/amazing-feature`
8. **Open a Pull Request**

### Development Guidelines

- Follow TypeScript best practices
- Write meaningful commit messages
- Add comments for complex logic
- Update documentation as needed
- Ensure no linting errors: `npm run lint`

---

## 📝 Roadmap

### Current Version: 0.0.1 (MVP)

- [x] Basic file change recording
- [x] Timeline visualization
- [x] Diff-based storage
- [x] File restoration
- [x] Bookmark system
- [x] Workspace state persistence

### Planned Features

- [ ] Collaborative session sharing
- [ ] Git integration with branch switching
- [ ] Advanced search and filtering
- [ ] Export/import timeline sessions
- [ ] Performance analytics
- [ ] Custom keyboard shortcuts
- [ ] Multi-workspace support
- [ ] Cloud storage integration

---

## 🐛 Known Issues

- Large file handling may impact performance
- Recording sessions with thousands of changes may consume significant memory
- Binary files are not supported in current version

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- Built with [VS Code Extension API](https://code.visualstudio.com/api)
- UI powered by [React](https://reactjs.org/)
- State management with [Immer](https://immerjs.github.io/immer/)
- Diff computation using [jsdiff](https://github.com/kpdecker/jsdiff)
- Icons from [Lucide](https://lucide.dev/)

---

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/Mr-Documents/T-Rewind/issues)
- **Discussions**: [GitHub Discussions](https://github.com/Mr-Documents/time-travel-debugger/discussions)
- **Email**: thewillingdocument@gmail.com

---

## 🌟 Star History

If you find this extension helpful, please consider giving it a star on GitHub!

---

**Built with ❤️**
