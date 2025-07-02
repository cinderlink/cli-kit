# Examples Documentation

This document provides detailed explanations of all the example applications included with CLI-Kit, demonstrating various features and patterns.

## Table of Contents

- [Quick Start Examples](#quick-start-examples)
- [Component Showcases](#component-showcases)
- [Real-World Applications](#real-world-applications)
- [Advanced Patterns](#advanced-patterns)
- [Running Examples](#running-examples)

## Quick Start Examples

### Hello World (`examples/hello-world.ts`)

The simplest possible CLI-Kit application demonstrating the basic MVU pattern.

```typescript
import { Effect } from "effect"
import { runApp } from "@/index.ts"
import { text, vstack } from "@/core/view.ts"
import { style, Colors } from "@/styling/index.ts"
import { InputService } from "@/services/index.ts"

interface Model {
  readonly count: number
}

type Msg = { readonly tag: "increment" }

const app: Component<Model, Msg> = {
  init: Effect.succeed([{ count: 0 }, []]),
  
  update: (msg: Msg, model: Model) => {
    return Effect.succeed([{ ...model, count: model.count + 1 }, []])
  },
  
  view: (model: Model) => {
    return vstack(
      text("Hello CLI-Kit! 👋", style(Colors.BrightCyan)),
      text(`Count: ${model.count}`, style(Colors.White)),
      text("Press Space to increment", style(Colors.Gray))
    )
  },
  
  subscriptions: (model: Model) =>
    Effect.gen(function* (_) {
      const input = yield* _(InputService)
      return input.mapKeys(key => {
        if (key.key === ' ') return { tag: "increment" }
        return null
      })
    })
}
```

**Key Concepts:**
- Basic component structure
- Model-View-Update pattern
- Input subscriptions
- Simple state management

### Counter (`examples/counter.ts`)

Extended counter example with increment, decrement, and reset functionality.

**Features:**
- Multiple message types
- Keyboard navigation
- State validation
- Error handling

## Component Showcases

### Button Showcase (`examples/button-showcase.ts`)

Comprehensive demonstration of all button variants and their interactions.

**Features Demonstrated:**
- All button variants (Primary, Secondary, Success, Danger, Warning, Ghost)
- Focus management between buttons
- Button states (normal, focused, pressed, disabled)
- Keyboard navigation (Tab, Shift+Tab, Enter)
- Click handling and feedback

**Code Highlights:**

```typescript
// Button creation with different variants
const buttons = [
  primaryButton("Save", { width: 12 }),
  secondaryButton("Cancel", { width: 12 }),
  successButton("Submit", { width: 12 }),
  dangerButton("Delete", { width: 12 }),
  warningButton("Warning", { width: 12 }),
  ghostButton("Ghost", { width: 12 })
]

// Focus management
const nextButton = () => {
  const nextIndex = (model.focusIndex + 1) % buttons.length
  // Blur current, focus next
}
```

**Learning Points:**
- Component state management
- Focus handling patterns
- Event propagation
- UI feedback systems

### Table Showcase (`examples/table-showcase.ts`)

Advanced data table demonstrating sorting, filtering, and selection.

**Features Demonstrated:**
- Column definition with custom rendering
- Row selection (single and multiple)
- Sorting by column (ascending/descending)
- Text-based filtering
- Pagination and navigation
- Status indicators and badges

**Code Highlights:**

```typescript
// Column with custom rendering
createColumn<User>("status", "Status", { 
  width: 10, 
  sortable: true, 
  align: 'center',
  render: (value: string) => {
    switch (value) {
      case 'active': return '🟢 Active'
      case 'inactive': return '🔴 Inactive'
      case 'pending': return '🟡 Pending'
    }
  }
})

// Filter management
const filter: TableFilter = {
  column: model.filterColumn,
  value: model.filterValue.trim(),
  type: "contains"
}
```

**Learning Points:**
- Complex data display patterns
- Custom cell rendering
- State-driven filtering
- Multi-level navigation

### Tabs Showcase (`examples/tabs-showcase.ts`)

Multi-view interface with tab navigation and rich content.

**Features Demonstrated:**
- Multiple tabs with different content types
- Tab navigation (keyboard and number shortcuts)
- Icons and badges in tab titles
- Dynamic content switching
- State preservation between tabs

**Code Highlights:**

```typescript
// Tab definition with metadata
const sampleTabs = [
  {
    id: "overview",
    title: "Overview", 
    icon: "📊",
    content: "Welcome content..."
  },
  {
    id: "data",
    title: "Data",
    icon: "📈", 
    badge: "42",
    content: "Data visualization..."
  }
]

// Navigation handling
subscriptions: (model: Model) => {
  return input.mapKeys(key => {
    if (key.key === 'left') return { tag: "tabsMsg", msg: { tag: "prevTab" } }
    if (key.key === 'right') return { tag: "tabsMsg", msg: { tag: "nextTab" } }
    // Number key shortcuts 1-9
    if (key.key >= '1' && key.key <= '9') {
      const tabIndex = parseInt(key.key) - 1
      return { tag: "tabsMsg", msg: { tag: "selectTab", tabId: tabs[tabIndex].id } }
    }
  })
}
```

**Learning Points:**
- Multi-view application structure
- Navigation patterns
- Content organization
- Keyboard shortcuts

### Progress & Spinner Showcases

**Progress Bar Showcase (`examples/progressbar-showcase.ts`)**
- Determinate and indeterminate progress
- Different visual styles (simple, fancy, ASCII)
- Animation and timing
- Progress state management

**Spinner Showcase (`examples/spinner-showcase.ts`)**
- Multiple animation styles
- Loading states
- Timer-based updates
- Visual feedback patterns

## Real-World Applications

### Contact Form (`examples/contact-form.ts`)

Complete form application demonstrating real-world patterns.

**Features:**
- Multiple input fields with validation
- Form state management
- Field navigation (Tab/Shift+Tab)
- Submit and reset functionality
- Error display and handling
- Responsive layout

**Code Structure:**

```typescript
interface FormModel {
  readonly name: TextInputModel
  readonly email: TextInputModel
  readonly message: TextInputModel
  readonly focusedField: 'name' | 'email' | 'message'
  readonly submitted: boolean
  readonly errors: Array<string>
}

// Field validation
const validateForm = (model: FormModel): Array<string> => {
  const errors: Array<string> = []
  
  if (!model.name.value.trim()) {
    errors.push("Name is required")
  }
  
  if (!model.email.value.includes('@')) {
    errors.push("Valid email is required")
  }
  
  return errors
}
```

**Learning Points:**
- Form state management
- Field validation patterns
- Multi-component coordination
- User experience design

### Layout Patterns (`examples/layout-patterns.ts`)

Demonstrates various layout techniques and responsive design.

**Features:**
- Grid layouts
- Nested containers
- Responsive behavior
- Dynamic sizing
- Content alignment

## Advanced Patterns

### Mouse Demo (`examples/mouse-demo.ts`)

Demonstrates mouse event capture and handling.

**Features:**
- Mouse event capture
- Coordinate tracking
- Click detection
- Event logging and display

**Note:** This example shows mouse event capture at the runtime level. Full coordinate-to-component routing is still in development.

### State Management Patterns

**Complex State Example:**

```typescript
// Hierarchical state management
interface AppModel {
  readonly navigation: NavigationModel
  readonly currentView: ViewType
  readonly modals: Array<ModalModel>
  readonly notifications: Array<NotificationModel>
}

// State updates with side effects
const updateWithSideEffects = (msg: Msg, model: Model) => {
  switch (msg.tag) {
    case "saveData":
      return Effect.gen(function* (_) {
        const storage = yield* _(StorageService)
        yield* _(storage.save("userdata", model.data))
        
        return [
          { ...model, saved: true },
          [Effect.succeed({ tag: "showNotification", text: "Data saved!" })]
        ]
      })
  }
}
```

### Error Handling Patterns

```typescript
// Graceful error handling
const safeUpdate = (msg: Msg, model: Model) => {
  return Effect.gen(function* (_) {
    try {
      const [newModel, cmds] = yield* _(unsafeUpdate(msg, model))
      return [newModel, cmds]
    } catch (error) {
      return [
        { ...model, error: error.message },
        []
      ]
    }
  })
}
```

## Running Examples

### Prerequisites

```bash
# Install dependencies
bun install

# Ensure TypeScript compilation works
bun run tsc --noEmit
```

### Running Individual Examples

```bash
# Basic examples
bun examples/hello-world.ts
bun examples/counter.ts

# Component showcases
bun examples/button-showcase.ts
bun examples/table-showcase.ts
bun examples/tabs-showcase.ts
bun examples/progressbar-showcase.ts
bun examples/spinner-showcase.ts

# Real-world applications
bun examples/contact-form.ts
bun examples/layout-patterns.ts

# Advanced examples
bun examples/mouse-demo.ts
```

### Common Issues and Solutions

**Issue: Example doesn't respond to keyboard input**
- Ensure the component implements `subscriptions`
- Check that the input service is properly provided
- Verify key mapping logic

**Issue: Styling doesn't appear correctly**
- Check terminal color support
- Verify ANSI escape sequence support
- Test in different terminal emulators

**Issue: Layout appears broken**
- Check terminal size
- Verify box model calculations
- Test with different content lengths

### Customizing Examples

All examples are designed to be educational and modifiable:

1. **Change styling**: Modify color schemes and decorations
2. **Add features**: Extend with additional functionality
3. **Combine patterns**: Mix concepts from different examples
4. **Create variations**: Build your own versions

### Example Template

Use this template to create new examples:

```typescript
import { Effect } from "effect"
import { runApp } from "@/index.ts"
import { text, vstack } from "@/core/view.ts"
import { style, Colors } from "@/styling/index.ts"
import { InputService } from "@/services/index.ts"
import type { Component, RuntimeConfig } from "@/core/types.ts"
import { LiveServices } from "../src/services/impl/index.ts"

// =============================================================================
// Model
// =============================================================================

interface Model {
  // Your state here
}

// =============================================================================
// Messages  
// =============================================================================

type Msg = 
  // Your messages here

// =============================================================================
// Component
// =============================================================================

const app: Component<Model, Msg> = {
  init: Effect.succeed([/* initial model */, []]),
  
  update: (msg: Msg, model: Model) => {
    // Handle messages
  },
  
  view: (model: Model) => {
    // Render your UI
  },
  
  subscriptions: (model: Model) =>
    Effect.gen(function* (_) {
      const input = yield* _(InputService)
      return input.mapKeys(key => {
        // Handle keyboard input
      })
    })
}

// =============================================================================
// Main
// =============================================================================

const config: RuntimeConfig = {
  fps: 30,
  debug: false,
  quitOnEscape: true,
  quitOnCtrlC: true,
  enableMouse: false,
  fullscreen: true
}

const program = runApp(app, config).pipe(
  Effect.provide(LiveServices)
)

Effect.runPromise(program).catch(console.error)
```

This template provides the basic structure for creating new CLI-Kit applications and can be adapted for any use case.