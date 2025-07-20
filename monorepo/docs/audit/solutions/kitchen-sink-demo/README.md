# TUIX Kitchen Sink Demo

This is the ideal TUIX application structure demonstrating best practices for:

## 🏗️ Project Structure

```
kitchen-sink-demo/
├── package.json           # Clean dependencies
├── src/
│   ├── index.tsx         # Simple entry point
│   ├── plugins/          # Plugin composition
│   │   └── kitchen-sink.tsx
│   ├── commands/         # Command organization
│   │   ├── process.tsx   # Process management commands
│   │   ├── logs.tsx      # Logging commands
│   │   ├── dev.tsx       # Development commands
│   │   └── dashboard.tsx # Default dashboard
│   ├── components/       # Reusable components
│   │   ├── ProcessList.tsx
│   │   ├── ProcessStarter.tsx
│   │   ├── Dashboard.tsx
│   │   └── tabs/        # Organized sub-components
│   ├── hooks/           # Custom hooks
│   │   ├── useAppState.ts
│   │   └── useTheme.ts
│   └── utils/           # Utilities
│       └── formatters.ts
└── tests/               # Test files mirror src/
```

## 🎯 Key Patterns Demonstrated

### 1. Clean Entry Point
```tsx
// src/index.tsx
jsx(() => <KitchenSinkPlugin />).catch(console.error)
```

### 2. Composable Commands
```tsx
// Commands are organized in separate files
<Plugin>
  <ProcessCommands />
  <LogCommands />
  <DevCommands />
</Plugin>
```

### 3. Reactive State Management
```tsx
// Using $state, $derived, $context
const state = $state({ count: 0 })
const doubled = $derived(() => state.count * 2)
```

### 4. Plugin Integration
```tsx
// Clean plugin usage
const pm = useProcessManager()
const logger = useLogger()
```

### 5. Component Composition
```tsx
// Small, focused components
<ProcessList />
<ProcessStarter command="npm start" />
```

## 🚀 Running the Demo

```bash
# Development mode
bun run dev

# Run specific command
bun run dev pm list
bun run dev logs --follow
bun run dev dashboard

# Build standalone binary
bun run build
./kitchen-sink
```

## 📚 What This Demonstrates

1. **Monorepo Package Usage**: Clean imports from `@tuix/*` packages
2. **TypeScript Best Practices**: Full type safety, no `any` types
3. **Separation of Concerns**: Commands, components, hooks, utils
4. **Plugin Architecture**: How to use and compose plugins
5. **Streaming Data**: Real-time updates with Effect streams
6. **Error Handling**: Proper Effect error channels
7. **Testing Structure**: Mirrors source for easy testing

## 🎨 Styling Patterns

- Theme hooks for consistent styling
- Composable style() API
- Gradient and animation support
- Responsive layouts

## 🔌 Plugin Usage

- Process Manager: Process lifecycle management
- Logger: Structured logging with transports
- Custom plugins can follow the same pattern

This demo serves as both documentation and a template for new TUIX applications.