# TUIX Kitchen Sink Demo

This is the ideal TUIX application structure demonstrating best practices for:

## 🏗️ Project Structure

```
kitchen-sink-demo/
├── package.json             # Dependencies and scripts
├── src/
│   ├── index.tsx           # ALL routing visible here
│   ├── commands/           # Command implementations
│   │   ├── dashboard/      # Structured command pattern
│   │   │   ├── schema.ts   # Argument definitions
│   │   │   ├── handler.tsx # UI logic
│   │   │   └── index.ts    # Exports
│   │   ├── process/        # Subcommands
│   │   │   ├── files/     
│   │   │   └── database/   
│   │   ├── monitor/        # Simple structured command
│   │   └── showcase/       # Component demos
│   ├── plugins/            # Custom plugins
│   │   └── weather.tsx     # Example user plugin
│   ├── components/         # Reusable UI components
│   │   ├── common/         # Shared components
│   │   ├── showcase/       # Showcase-specific
│   │   └── weather/        # Plugin-specific
│   ├── transforms/         # Data transformers
│   ├── schemas/            # Reusable schemas
│   ├── hooks/              # Custom hooks with runes
│   ├── types/              # TypeScript definitions
│   └── utils/              # Helpers and utilities
├── COMMAND_PATTERNS.md     # Pattern documentation
└── API_REVIEW.md          # Architecture review
```

## 🎯 Key Patterns Demonstrated

### 1. Declarative CLI Definition
```tsx
// src/index.tsx - Clean, declarative CLI structure using render props
<CLI name="kitchen-sink" alias="ks" configFilenameBase="kitchen-sink">
  {(config) => (
    <>
      <RegisterPlugin plugin={ProcessManagerPlugin} as="pm" />
      <RegisterPlugin plugin={WeatherPlugin} as="weather" />
      <KitchenSinkApp config={config} />
    </>
  )}
</CLI>
```

### 2. Schema-Based Command Arguments
```tsx
// Commands with validated arguments and flags using render props
<Command name="process">
  {(args, flags) => (
    <>
      <Arg name="files" schema={cliArraySchema} />
      <Flag name="ignore" schema={cliArraySchema} transform={transformIdArrayToDbRecords} />
      <If condition={flags.ignore.length}>
        {/* Conditional rendering based on arguments */}
      </If>
    </>
  )}
</Command>
```

### 3. Full Svelte 5 Runes Integration
```tsx
// Reactive state with $state, $derived, $effect, $context
const state = $state({ count: 0, history: [] })
const doubled = $derived(() => state.count * 2)
$effect(() => console.log('State changed'))
```

### 4. Plugin System Architecture
```tsx
// System plugins from TUIX + custom user plugins
import { ProcessManagerPlugin, LoggerPlugin } from '@tuix/plugins'
import { WeatherPlugin } from './plugins/weather' // Custom demo plugin

// Plugins encapsulate functionality, not the base app
<RegisterPlugin plugin={WeatherPlugin} as="weather" />
```

### 5. Streaming Data with Transforms
```tsx
// Real-time data processing with declarative transforms using render props
<Stream source="system-stats" interval={1000}>
  {(data) => (
    <Transform source={data} with={processStatsTransformer}>
      {(stats) => <SystemMonitor stats={stats} />}
    </Transform>
  )}
</Stream>
```

### 6. Snippets and Render Syntax
```tsx
// Svelte 5 snippet system for reusable UI patterns
{#snippet StatCard(label: string, value: any, style?: string)}
  <Box style={`border padding ${style}`}>
    <Text style="subtitle">{label}</Text>
    <Text style="value">{value}</Text>
  </Box>
{/snippet}

// Usage with @render
{@render StatCard('Total Items', items.length, 'success')}
```

## 🚀 Running the Demo

```bash
# Install globally (once built)
bun install -g ./

# Run commands directly
ks dashboard                           # Show system dashboard
ks process files *.ts --parallel       # Process files with schema validation
ks monitor --interval 500              # Monitor with streaming data
ks exec "ps aux" --follow              # Execute commands with output streaming
ks weather current "New York"          # Custom plugin usage
ks plugins demo                        # Plugin system demonstration
ks showcase                            # Full component and styling showcase

# Access system plugins directly
ks pm list                             # Process manager: list processes
ks pm start "npm run build"            # Process manager: start process
ks logger set-level debug              # Logger: change log level

# Or run locally without installing
bun run src/index.tsx dashboard
bun run src/index.tsx pm list

# Build standalone binary
bun run build
./kitchen-sink dashboard
```

## 📚 What This Demonstrates

1. **Declarative CLI Architecture**: Clean, composable command definition with nested structures
2. **Schema-Based Validation**: Arguments and flags with transformation and validation
3. **Full Svelte 5 Features**: Complete runes system, snippets, and render syntax
4. **Plugin System**: System plugins (PM, Logger) + custom user plugins (Weather)
5. **Streaming Architecture**: Real-time data with Transform components
6. **Complete Component System**: All TUIX display, interactive, and layout components
7. **Advanced Styling**: Themes, gradients, animations with composable style() API
8. **Effect.ts Integration**: Functional programming patterns throughout
9. **TypeScript Excellence**: 100% type safety, no `any` types, proper inference
10. **Testing-Ready Structure**: Organized for comprehensive test coverage

## 🎨 Advanced Features Showcased

### Styling System
- Dynamic theming with reactive color schemes
- Composable style() API with method chaining
- CSS-in-TS with full TypeScript support
- Animation and transition system
- Responsive layout with flexbox and grid

### Data Flow
- Stream-first architecture with real-time updates
- Declarative data transformation pipelines
- Schema-based argument parsing and validation
- Cross-plugin communication and state sharing
- Error handling with Effect error channels

### Developer Experience
- Hot reload during development
- Comprehensive component showcase
- Plugin development patterns
- CLI command composition examples
- Integration testing demonstrations

## 🔌 Plugin Architecture

### System Plugins (from @tuix/plugins)
- **Process Manager**: Lifecycle management for system processes
- **Logger**: Structured logging with multiple transports and levels

### Custom Plugin Example (Weather)
- External API integration patterns
- Plugin state management with runes
- Cross-plugin communication (uses PM and Logger)
- Command registration within plugins
- Resource cleanup and lifecycle management

## 🏗️ Perfect API Reference

This kitchen sink demo represents the **perfect TUIX application structure**. Every pattern shown here should be:
- **Replicated exactly** in production applications
- **Used as reference** during framework development
- **Maintained as documentation** of best practices
- **Extended carefully** when adding new features

This demo serves as the definitive template and API reference for TUIX applications.