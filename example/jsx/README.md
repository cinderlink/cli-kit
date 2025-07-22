# Tuix JSX Example Application

A comprehensive example application showcasing all the features of the Tuix framework using JSX, reactive state management with runes, and advanced terminal UI components.

## Features

### 🎛️ Interactive Dashboard
- Real-time system metrics with animated charts
- Live notification feed with categorized alerts
- Activity timeline with user actions
- Theme switching (dark/light/matrix)
- Reactive state management using runes

### 📝 Advanced Form with Validation
- Real-time input validation using bindable runes
- Password strength indicator with visual feedback
- Dynamic form fields with conditional rendering
- Two-way data binding with validation transforms
- Support for different form modes (create/edit)

### 📊 Data Visualization
- Animated bar charts with live data updates
- Line charts with time series data
- ASCII-based pie charts with percentages
- Interactive scatter plots
- Multiple chart types with smooth transitions

### 📁 File System Explorer
- Simulated file system navigation
- Directory traversal with keyboard shortcuts
- File type icons and metadata display
- Hidden file toggle functionality
- File size formatting and date display

### 💻 Terminal Emulator
- Interactive command-line interface
- Command history with arrow key navigation
- Tab completion for available commands
- Simulated shell environment
- Support for common Unix commands

### ⚙️ Settings & Preferences
- Multi-tab settings interface
- Theme customization options
- Behavior and feature toggles
- Advanced configuration options
- Settings profiles with save/load functionality

### 🎨 Component Showcase
- Comprehensive display of all UI components
- Interactive elements with state management
- Modal dialogs and overlay components
- Progress indicators and loading states
- Typography and styling demonstrations

## Architecture

### State Management
- Uses Tuix's Svelte 5-inspired runes (`$state`, `$derived`, `$bindable`)
- Reactive data flow with automatic UI updates
- Global application state with the `appStore`
- Component-level state for isolated functionality

### Component Structure
```
src/
├── components/          # Reusable UI components
│   ├── charts/         # Data visualization components
│   ├── SystemMetrics.tsx
│   ├── NotificationPanel.tsx
│   ├── ActivityFeed.tsx
│   └── QuickActions.tsx
├── commands/           # CLI command handlers
│   ├── dashboard/      # Interactive dashboard
│   ├── form/          # Advanced form with validation
│   ├── visualization/ # Data visualization demo
│   ├── explorer/      # File system explorer
│   ├── terminal/      # Terminal emulator
│   ├── settings/      # Settings interface
│   └── showcase/      # Component showcase
├── stores/            # Global state management
│   └── appStore.ts    # Main application store
└── index.tsx          # Application entry point
```

### Key Technologies
- **JSX**: Declarative UI components with familiar React-like syntax
- **Runes**: Reactive state management (`$state`, `$derived`, `$bindable`)
- **Effect System**: Lifecycle management with `onMount`, `onDestroy`
- **CLI Framework**: Robust command routing and argument parsing
- **Typography**: Rich text rendering with colors and styles

## Getting Started

### Prerequisites
- Bun v1.0.0 or higher
- TypeScript 5+

### Installation
```bash
# Navigate to the example directory
cd example/jsx

# Install dependencies
bun install

# Start the application
bun start
```

### Available Commands

Run individual commands directly:

```bash
# Interactive dashboard with real-time updates
bun run dashboard --refresh 3 --theme matrix

# Advanced form with validation
bun run form --mode create

# Data visualization with different chart types
bun run visualize sample --type bar
bun run visualize sample --type line
bun run visualize sample --type pie
bun run visualize sample --type scatter

# File system explorer
bun run explorer . --show-hidden

# Terminal emulator
bun run terminal --shell /bin/zsh --history 1000

# Settings interface
bun run settings --profile default

# Component showcase
bun run showcase --interactive
```

### Development Mode
```bash
# Watch for changes and auto-reload
bun run dev

# Build for production
bun run build
```

## Component Examples

### Reactive State with Runes
```tsx
import { $state, $derived } from 'tuix/runes'

function Counter() {
  const count = $state(0)
  const doubled = $derived(() => count() * 2)
  
  return (
    <Box>
      <Text>Count: {count()}</Text>
      <Text>Doubled: {doubled()}</Text>
      <Button onClick={() => count.$set(count() + 1)}>
        Increment
      </Button>
    </Box>
  )
}
```

### Form Validation with Bindable Runes
```tsx
const username = $bindable('', {
  validate: (value) => {
    if (value.length < 3) return 'Too short'
    return true
  }
})

return (
  <TextInput
    value={username}
    placeholder="Enter username"
  />
)
```

### Data Visualization
```tsx
<BarChart
  data={[
    { label: 'Jan', value: 65, color: 'blue' },
    { label: 'Feb', value: 75, color: 'green' }
  ]}
  width={50}
  height={15}
/>
```

## Key Features Demonstrated

- **Reactive Programming**: Automatic UI updates when state changes
- **Component Composition**: Reusable, composable UI building blocks
- **Event Handling**: Interactive components with user input
- **Lifecycle Management**: Setup and cleanup with `onMount`/`onDestroy`
- **Validation**: Real-time form validation with visual feedback
- **Theming**: Dynamic theme switching with persistent state
- **Data Binding**: Two-way data binding with transformation
- **Animations**: Smooth transitions and visual feedback
- **Accessibility**: Keyboard navigation and screen reader support

## Performance

- Optimized rendering with minimal re-renders
- Efficient state updates using runes
- Lazy loading of expensive components
- Memory-efficient data structures
- Smooth 60fps animations

## Browser Compatibility

This is a terminal UI application that runs in:
- Terminal emulators (iTerm2, Terminal.app, etc.)
- SSH sessions
- Docker containers
- CI/CD environments

## Contributing

This example serves as both a showcase and a testing ground for Tuix features. When adding new components or features:

1. Follow the established patterns
2. Add comprehensive examples
3. Document new functionality
4. Test across different terminals
5. Maintain backward compatibility

## License

MIT - See the main Tuix framework license for details.