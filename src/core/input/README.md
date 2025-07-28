# Core Input Module

This module provides comprehensive input handling for terminal applications, including keyboard focus management, mouse interaction, and keyboard event processing.

## Overview

The input module consists of three main subsystems:
- **Focus Management**: Tab order, focus trapping, and keyboard navigation
- **Mouse Handling**: Click detection, hover states, and hit testing
- **Keyboard Processing**: Key event parsing and shortcut handling

## Focus Management

### Focus Service

```typescript
import { FocusService } from "@core/input"

// Register a focusable component
yield* focusService.register({
  id: 'my-button',
  tabIndex: 0,
  focusable: true,
  onFocus: () => Effect.log("Button focused"),
  onBlur: () => Effect.log("Button blurred")
})

// Navigate focus
yield* focusService.focusNext() // Tab
yield* focusService.focusPrevious() // Shift+Tab

// Focus trapping for modals
yield* focusService.pushTrap('modal-container')
// ... modal interaction
yield* focusService.popTrap()
```

## Mouse Handling

### Hit Testing

```typescript
import { mouseEventHitsComponent, createBounds } from "@core/input"

// Test if a mouse event hits a component
const bounds = createBounds('button', 0, 0, 20, 10)
const hit = mouseEventHitsComponent(
  { type: 'press', x: 10, y: 5 },
  bounds
) // true
```

### Mouse Router

```typescript
import { MouseRouterService } from "@core/input"

// Route mouse events to components
const router = yield* _(MouseRouterService)
yield* _(router.registerComponent(
  'button',
  buttonBounds,
  clickHandler(() => ({ _tag: 'ButtonClicked' as const }))
))
```

## Keyboard Input

### Key Event Processing

```typescript
import { KeyEvent } from "@core/input" // Key parsing will be implemented

// Key events are structured data
const keyEvent: KeyEvent = {
  type: 'press',
  key: 'a',
  modifiers: { ctrl: true, shift: false, alt: false, meta: false }
}
```

## Architecture

The input system:
- Uses Effect for all async operations and state management
- Maintains focus order through a sorted component registry
- Implements focus trapping via a stack-based system
- Performs efficient hit testing for mouse events
- Provides normalized key event data across platforms

## Module Boundaries

This module is part of the core framework and can be used by:
- UI components that need focus management
- Interactive elements requiring mouse support
- Applications needing keyboard shortcuts

It depends on:
- Effect for state management and async operations
- Core services for terminal interaction

## Best Practices

1. Always unregister components on cleanup to prevent memory leaks
2. Use appropriate tab indices for logical navigation order
3. Implement focus trapping for modal dialogs
4. Provide visual focus indicators for accessibility
5. Handle both mouse and keyboard interaction for all interactive elements
6. Test keyboard navigation flow thoroughly