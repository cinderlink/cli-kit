# Kitchen Sink Architecture & Terminology

## Core Concepts

### **CLI (Command Line Interface)**
The root container that defines the entire application. It handles:
- Binary name and aliases
- Configuration loading
- Plugin registration
- Global context provision
- Entry point for all commands

### **Command**
A discrete unit of functionality accessible via the CLI. Commands:
- Are scoped at a specific level (root, sub-command, sub-sub-command, etc.)
- Accept arguments and flags
- Perform a specific action
- Can contain nested sub-commands
- Return output to the terminal

Example hierarchy:
```
ks                        # Binary
├── dashboard            # Root command
├── process              # Root command with sub-commands
│   ├── files           # Sub-command
│   └── database        # Sub-command
├── monitor             # Root command
└── showcase            # Root command
```

### **Plugin**
An encapsulated set of commands and functionality that can be registered with the CLI. Plugins:
- Group related commands under a namespace
- Provide services to other parts of the app
- Can communicate with other plugins
- Have their own lifecycle (init, activate, deactivate)
- Are reusable across different CLI applications

### **Component**
A UI element that renders to the terminal. Components:
- Follow the MVU (Model-View-Update) pattern
- Are composable and reusable
- Handle their own state with runes
- Render text, boxes, tables, etc. to the terminal

### **Service**
Core functionality providers that components and commands use:
- **Terminal**: Low-level terminal operations
- **Input**: Keyboard and mouse handling
- **Renderer**: Component rendering to terminal
- **Storage**: Persistent data storage

### **Transform**
Data processing utilities that:
- Convert CLI arguments to typed data
- Transform streaming data
- Process command output
- Handle data flow between components

### **Schema**
Type definitions and validation for:
- Command arguments
- Flag values
- Configuration
- Plugin interfaces

## File Organization Structure

```
src/
├── index.tsx           # Entry point with CLI setup
├── app.tsx            # Main application component
│
├── commands/          # Individual command implementations
│   ├── dashboard.tsx  # Dashboard command
│   ├── process.tsx    # Process command with sub-commands
│   ├── monitor.tsx    # Monitor command
│   ├── exec.tsx       # Execute command
│   ├── plugins.tsx    # Plugin management commands
│   └── showcase.tsx   # Component showcase command
│
├── plugins/           # Plugin implementations
│   └── weather.tsx    # Example user plugin
│
├── components/        # Reusable UI components
│   ├── DashboardView.tsx
│   ├── ProcessList.tsx
│   ├── ProcessFiles.tsx
│   ├── SystemMonitor.tsx
│   ├── PluginList.tsx
│   └── common/
│       ├── StatCard.tsx
│       └── LoadingState.tsx
│
├── transforms/        # Data transformation utilities
│   ├── file-transformer.ts
│   ├── stdio-transformer.ts
│   └── stats-transformer.ts
│
├── schemas/          # Argument and data schemas
│   ├── process-schemas.ts
│   ├── monitor-schemas.ts
│   └── common-schemas.ts
│
├── hooks/            # Custom hooks
│   ├── useAppState.ts
│   ├── useTheme.ts
│   └── useStreaming.ts
│
├── utils/            # General utilities
│   ├── formatters.ts
│   └── validators.ts
│
└── types/            # TypeScript type definitions
    ├── commands.ts
    ├── plugins.ts
    └── app.ts
```

## Design Principles

1. **Single Responsibility**: Each file has ONE clear purpose
2. **Command Isolation**: Commands are self-contained units
3. **Component Reusability**: UI components are generic and reusable
4. **Plugin Encapsulation**: Plugins bundle related functionality
5. **Type Safety**: Everything is properly typed
6. **Declarative Structure**: JSX defines the CLI structure clearly
7. **MVU Pattern**: Components follow Model-View-Update strictly

## Data Flow

1. **CLI** receives user input
2. **Command** is matched and executed
3. **Arguments** are validated against **Schemas**
4. **Transforms** process the input data
5. **Components** render the UI using the data
6. **Plugins** provide additional functionality
7. **Services** handle low-level operations