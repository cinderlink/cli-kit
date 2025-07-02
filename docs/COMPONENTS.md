# Components Documentation

This document provides detailed information about all available components in CLI-Kit.

## Table of Contents

- [Overview](#overview)
- [Form Controls](#form-controls)
  - [TextInput](#textinput)
  - [Button](#button)
  - [List](#list)
- [Data Display](#data-display)
  - [Table](#table)
  - [Tabs](#tabs)
  - [ProgressBar](#progressbar)
  - [Spinner](#spinner)
- [Layout](#layout)
  - [Box](#box)
  - [VStack/HStack](#vstackhstack)

## Overview

All components in CLI-Kit follow the same architectural pattern:

1. **Component Function**: Creates a new component instance
2. **Model Interface**: Defines the component's state
3. **Message Type**: Defines the actions the component can handle
4. **Styling Options**: Customizable appearance

### Common Component Interface

```typescript
interface UIComponent<Model, Msg> {
  id: string
  init(): Effect<[Model, Cmd<Msg>[]], never, never>
  update(msg: Msg, model: Model): Effect<[Model, Cmd<Msg>[]], never, never>
  view(model: Model): View
  focus?(): Effect<Msg, never, never>
  blur?(): Effect<Msg, never, never>
  handleKey?(key: KeyEvent, model: Model): Msg | null
  handleMouse?(mouse: MouseEvent, model: Model): Msg | null
}
```

---

## Form Controls

### TextInput

Text input component for single and multi-line text entry with validation.

#### Basic Usage

```typescript
import { textInput, emailInput, passwordInput } from "@/components/index.ts"

// Basic text input
const nameInput = textInput({
  placeholder: "Enter your name",
  width: 30
})

// Email input with validation
const emailInput = emailInput({
  placeholder: "user@example.com",
  width: 40
})

// Password input (masked)
const passwordInput = passwordInput({
  placeholder: "Password",
  width: 25
})
```

#### Configuration Options

```typescript
interface TextInputOptions {
  readonly placeholder?: string
  readonly width?: number
  readonly maxLength?: number
  readonly echoMode?: EchoMode        // Normal, Password, NoEcho
  readonly multiline?: boolean
  readonly validator?: (value: string) => string | null
  readonly styles?: Partial<TextInputStyles>
}
```

#### Messages

```typescript
type TextInputMsg = 
  | { readonly tag: "setValue"; readonly value: string }
  | { readonly tag: "insertChar"; readonly char: string }
  | { readonly tag: "deleteChar" }
  | { readonly tag: "moveCursor"; readonly direction: "left" | "right" }
  | { readonly tag: "submit" }
  | { readonly tag: "focus" }
  | { readonly tag: "blur" }
```

#### Example

```typescript
const component: Component<Model, Msg> = {
  init: Effect.gen(function* (_) {
    const [inputModel] = yield* _(textInput({
      placeholder: "Enter message...",
      width: 50,
      validator: (value) => value.length < 3 ? "Too short" : null
    }).init())
    
    return [{ input: inputModel }, []]
  }),
  
  // Handle input messages in your update function
  update: (msg: Msg, model: Model) => {
    if (msg.tag === "inputMsg") {
      return inputComponent.update(msg.msg, model.input).pipe(
        Effect.map(([newInputModel, cmds]) => [
          { ...model, input: newInputModel },
          cmds.map(cmd => cmd.pipe(Effect.map(inputMsg => ({ tag: "inputMsg", msg: inputMsg }))))
        ])
      )
    }
    // ... other message handling
  }
}
```

---

### Button

Interactive button component with multiple variants and states.

#### Basic Usage

```typescript
import { 
  button, 
  primaryButton, 
  secondaryButton, 
  dangerButton 
} from "@/components/index.ts"

// Basic button
const saveBtn = primaryButton("Save", { width: 12 })

// Danger button
const deleteBtn = dangerButton("Delete", { width: 12 })

// Custom button
const customBtn = button("Custom", {
  variant: ButtonVariant.Ghost,
  width: 15,
  icon: "🎨"
})
```

#### Button Variants

```typescript
enum ButtonVariant {
  Primary = "primary",      // Blue background
  Secondary = "secondary",  // Gray background
  Success = "success",      // Green background
  Danger = "danger",        // Red background
  Warning = "warning",      // Yellow background
  Ghost = "ghost"           // Transparent background
}
```

#### Configuration Options

```typescript
interface ButtonOptions {
  readonly variant?: ButtonVariant
  readonly width?: number
  readonly icon?: string
  readonly disabled?: boolean
  readonly styles?: Partial<ButtonStyles>
}
```

#### Messages

```typescript
type ButtonMsg = 
  | { readonly tag: "press" }
  | { readonly tag: "release" }
  | { readonly tag: "click" }
  | { readonly tag: "focus" }
  | { readonly tag: "blur" }
```

---

### List

Selectable list component with single and multi-select support.

#### Basic Usage

```typescript
import { list, singleSelectList, multiSelectList } from "@/components/index.ts"

const items = [
  { id: "1", content: "Apple", value: "apple" },
  { id: "2", content: "Banana", value: "banana" },
  { id: "3", content: "Cherry", value: "cherry" }
]

// Single select list
const singleList = singleSelectList(items, { height: 5 })

// Multi select list
const multiList = multiSelectList(items, { height: 5 })
```

#### Configuration Options

```typescript
interface ListOptions {
  readonly height?: number
  readonly showBorder?: boolean
  readonly selectionMode?: 'single' | 'multi' | 'none'
  readonly styles?: Partial<ListStyles>
}
```

#### Messages

```typescript
type ListMsg = 
  | { readonly tag: "selectItem"; readonly itemId: string }
  | { readonly tag: "toggleSelection"; readonly itemId: string }
  | { readonly tag: "navigateUp" }
  | { readonly tag: "navigateDown" }
  | { readonly tag: "focus" }
  | { readonly tag: "blur" }
```

---

## Data Display

### Table

Feature-rich data table with sorting, filtering, and pagination.

#### Basic Usage

```typescript
import { table, createColumn, createRow } from "@/components/index.ts"

interface User {
  id: number
  name: string
  email: string
  role: string
}

const columns = [
  createColumn<User>("name", "Name", { width: 20, sortable: true }),
  createColumn<User>("email", "Email", { width: 25, sortable: true }),
  createColumn<User>("role", "Role", { width: 12, align: 'center' })
]

const rows = users.map(user => createRow(`user-${user.id}`, user))

const userTable = table({
  columns,
  rows,
  selectionMode: TableSelectionMode.Multiple,
  showHeader: true,
  pageSize: 10
})
```

#### Column Configuration

```typescript
interface TableColumn<T> {
  readonly key: string                // Property key
  readonly title: string              // Display title
  readonly width?: number             // Fixed width
  readonly sortable?: boolean         // Enable sorting
  readonly filterable?: boolean       // Enable filtering
  readonly align?: 'left' | 'center' | 'right'
  readonly render?: (value: any, row: T, index: number) => string
}
```

#### Messages

```typescript
type TableMsg<T> = 
  | { readonly tag: "selectRow"; readonly rowId: string }
  | { readonly tag: "sortColumn"; readonly column: string }
  | { readonly tag: "addFilter"; readonly filter: TableFilter }
  | { readonly tag: "navigateUp" | "navigateDown" }
  | { readonly tag: "navigatePageUp" | "navigatePageDown" }
```

#### Advanced Features

- **Sorting**: Click column headers or use sort messages
- **Filtering**: Add text-based filters for any column
- **Selection**: Single or multiple row selection
- **Pagination**: Navigate large datasets efficiently
- **Custom Rendering**: Custom cell content rendering

---

### Tabs

Multi-view interface with tab navigation.

#### Basic Usage

```typescript
import { tabs, createTab, stringTabs } from "@/components/index.ts"

// String-based tabs (simple)
const simpleTabs = stringTabs([
  { id: "home", title: "Home", content: "Welcome home!" },
  { id: "about", title: "About", content: "About this app..." },
  { id: "settings", title: "Settings", content: "App settings..." }
])

// Advanced tabs with icons and badges
const advancedTabs = tabs({
  tabs: [
    createTab("overview", "Overview", overviewContent, { icon: "📊" }),
    createTab("data", "Data", dataContent, { icon: "📈", badge: "42" }),
    createTab("settings", "Settings", settingsContent, { icon: "⚙️" })
  ],
  activeTabId: "overview"
})
```

#### Configuration Options

```typescript
interface Tab<T> {
  readonly id: string
  readonly title: string
  readonly content: T
  readonly disabled?: boolean
  readonly badge?: string
  readonly icon?: string
}
```

#### Messages

```typescript
type TabsMsg<T> = 
  | { readonly tag: "selectTab"; readonly tabId: string }
  | { readonly tag: "nextTab" | "prevTab" }
  | { readonly tag: "addTab"; readonly tab: Tab<T> }
  | { readonly tag: "removeTab"; readonly tabId: string }
```

#### Navigation

- **Arrow Keys**: Left/Right to navigate
- **Tab Key**: Tab/Shift+Tab to navigate
- **Number Keys**: 1-9 for direct tab access

---

### ProgressBar

Progress indicator with determinate and indeterminate modes.

#### Basic Usage

```typescript
import { 
  progressBar, 
  simpleProgressBar, 
  fancyProgressBar,
  loadingBar 
} from "@/components/index.ts"

// Simple progress bar
const simple = simpleProgressBar({ width: 40 })

// Fancy progress bar with styling
const fancy = fancyProgressBar({ width: 50 })

// Indeterminate loading bar
const loading = loadingBar({ width: 30 })
```

#### Progress Styles

```typescript
// Simple ASCII style
"[████████████████████        ] 75%"

// Fancy Unicode style  
"▐█████████████████████████░░░▌ 75%"

// Custom style
interface ProgressBarStyle {
  readonly filled: string      // Character for filled portion
  readonly empty: string       // Character for empty portion
  readonly prefix?: string     // Left bracket
  readonly suffix?: string     // Right bracket
}
```

#### Messages

```typescript
type ProgressBarMsg = 
  | { readonly tag: "setProgress"; readonly progress: number }
  | { readonly tag: "tick" }      // For indeterminate animation
```

---

### Spinner

Loading animation with multiple styles.

#### Basic Usage

```typescript
import { 
  spinner, 
  loadingSpinner, 
  processingSpinner 
} from "@/components/index.ts"

// Basic spinner
const basic = spinner({ style: SpinnerStyle.Dots })

// Loading spinner with text
const loading = loadingSpinner("Loading...")

// Processing spinner
const processing = processingSpinner("Processing data...")
```

#### Spinner Styles

```typescript
enum SpinnerStyle {
  Dots = "dots",        // ⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏
  Line = "line",        // -\|/
  Arc = "arc",          // ◜◠◝◞◡◟
  Box = "box",          // ▖▘▝▗
  Circle = "circle",    // ◐◓◑◒
  Bounce = "bounce",    // ⠁⠂⠄⠂
  Pulse = "pulse",      // ●○●○
  Points = "points"     // ∙∘∙∘
}
```

---

## Layout

### Box

Container component with borders, padding, and styling.

#### Basic Usage

```typescript
import { box } from "@/core/view.ts"
import { Borders } from "@/styling/index.ts"

const content = vstack(
  text("Title", style(Colors.BrightWhite)),
  text("Content goes here...")
)

const boxed = box(content, {
  border: Borders.rounded,
  borderStyle: style(Colors.Blue),
  padding: { top: 1, right: 2, bottom: 1, left: 2 },
  width: 40,
  height: 10
})
```

#### Box Options

```typescript
interface BoxOptions {
  readonly border?: BorderStyle
  readonly borderStyle?: Style
  readonly padding?: Padding
  readonly margin?: Padding
  readonly width?: number
  readonly height?: number
  readonly align?: 'left' | 'center' | 'right'
  readonly valign?: 'top' | 'middle' | 'bottom'
}
```

### VStack/HStack

Layout containers for arranging components.

#### Basic Usage

```typescript
import { vstack, hstack } from "@/core/view.ts"

// Vertical stack
const vertical = vstack(
  text("Header"),
  text("Content"),
  text("Footer")
)

// Horizontal stack
const horizontal = hstack(
  text("Left"),
  text("Center"),
  text("Right")
)

// Nested layouts
const complex = vstack(
  text("Title"),
  hstack(
    text("Left Panel"),
    text("Right Panel")
  ),
  text("Status")
)
```

---

## Best Practices

### Component Composition

1. **Keep components focused**: Each component should have a single responsibility
2. **Use message passing**: Components communicate through well-defined messages
3. **Leverage subscriptions**: Use input subscriptions for keyboard/mouse handling
4. **Style consistently**: Use the styling system for consistent appearance

### State Management

1. **Immutable models**: Always return new model instances
2. **Clear message types**: Use discriminated unions for type safety
3. **Handle all cases**: Ensure all message types are handled in update functions

### Performance

1. **Avoid expensive operations in view**: Keep view functions pure and fast
2. **Use Effect properly**: Leverage Effect's lazy evaluation and error handling
3. **Clean up subscriptions**: Ensure proper cleanup of resources

### Error Handling

1. **Use Effect errors**: Leverage Effect's error handling capabilities
2. **Validate input**: Always validate user input in components
3. **Graceful degradation**: Handle error states gracefully in the UI