# Context Files for Task 2B: LogViewer Component

## Core Component Files
- `src/components/LogViewer.ts` - Main LogViewer component implementation
- `src/components/LogViewer.tsx` - JSX version of LogViewer component
- `examples/log-viewer.ts` - Example usage and demo

## Related Components
- `src/components/Viewport.ts` - Virtual scrolling implementation reference
- `src/components/Table.ts` - Table component for structured view reference
- `src/components/TextInput.ts` - Search input implementation reference
- `src/components/Text.ts` - Text rendering and ANSI support

## Styling and Rendering
- `src/styling/color.ts` - Color utilities for syntax highlighting
- `src/styling/advanced.ts` - Advanced styling for log levels
- `src/services/renderer.ts` - Rendering service for performance

## Streaming and Services
- `src/components/streams/` - Streaming components and utilities
- `src/services/storage.ts` - Storage service for log persistence
- `src/services/input.ts` - Input handling for keyboard shortcuts

## Testing Infrastructure
- `src/testing/test-utils.ts` - Testing utilities
- `src/testing/visual-test.ts` - Visual testing utilities
- `examples/log-viewer.ts` - Example implementation to test against

## Type Definitions
- `src/core/types.ts` - Core type definitions
- Component-specific types to be created in LogViewer.ts

## Performance References
- `src/utils/string-width-optimized.ts` - String width calculations
- `src/core/view-cache.ts` - View caching for performance