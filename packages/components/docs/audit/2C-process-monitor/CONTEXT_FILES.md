# Context Files for Task 2C: ProcessMonitor Component

## Core Component Files
- `src/components/ProcessMonitor.ts` - Main ProcessMonitor component
- `src/components/ProcessMonitor.tsx` - JSX version
- `examples/process-monitor.ts` - Existing example to enhance

## Related Components
- `src/components/Table.ts` - For process list display
- `src/components/ProgressBar.ts` - For resource usage bars
- `src/components/Text.ts` - For metric display
- `src/components/Box.ts` - For layout structure

## Process Management
- `src/process-manager/` - Process manager implementation
- `examples/bun-process-manager-demo.ts` - Process manager demo
- `examples/process-manager-integration.tsx` - Integration example

## Services and Runtime
- `src/services/terminal.ts` - Terminal control for updates
- `src/services/renderer.ts` - Efficient rendering
- `src/core/runtime.ts` - Runtime management
- `src/reactivity/runes.ts` - For reactive updates

## Visualization
- `src/components/builders/Panel.ts` - For metric panels
- `src/styling/color.ts` - Color coding for metrics
- `src/styling/gradients.ts` - For usage visualizations

## Testing Infrastructure
- `src/testing/test-utils.ts` - Testing utilities
- `src/testing/e2e-harness.ts` - E2E testing setup

## Platform Integration
- Bun's native process APIs
- System metric collection utilities
- Cross-platform compatibility layer

## Type Definitions
- `src/core/types.ts` - Core types
- Process-specific types to be created