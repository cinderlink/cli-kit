# Phase 2 Implementation Guide
## Technical Patterns from Bubbletea & Lipgloss Research

### 🏗️ **Architecture Patterns**

#### **1. Component Structure (from Bubbletea)**

```typescript
// Standard component interface based on Bubbletea patterns
export interface Component<Model, Msg> {
  // Core MVU methods
  init(): Effect.Effect<[Model, ReadonlyArray<Cmd<Msg>>], never, AppServices>
  update(msg: Msg, model: Model): Effect.Effect<[Model, ReadonlyArray<Cmd<Msg>>], never, AppServices>
  view(model: Model): View
  
  // Focus management (standard across all interactive components)
  focus(): Effect.Effect<Cmd<Msg>, never, never>
  blur(): Effect.Effect<Cmd<Msg>, never, never>
  focused(): boolean
  
  // Size management
  setSize(width: number, height: number): Effect.Effect<void, never, never>
  
  // Configuration
  keyMap: KeyMap<Msg>
  styles: ComponentStyles
}

// Example: TextInput component structure
export interface TextInputModel {
  value: string
  cursor: number
  focused: boolean
  width: number
  placeholder: string
  echoMode: EchoMode
  cursorStyle: CursorStyle
}

export type TextInputMsg =
  | { _tag: "CharacterInput"; char: string }
  | { _tag: "CursorLeft" }
  | { _tag: "CursorRight" }
  | { _tag: "CursorStart" }
  | { _tag: "CursorEnd" }
  | { _tag: "DeleteCharacter" }
  | { _tag: "Clear" }
  | { _tag: "Paste"; text: string }
```

#### **2. KeyMap Pattern (from Bubbletea)**

```typescript
// Inspired by bubbles/key
export interface KeyBinding<Msg> {
  keys: string[]
  help: { key: string; desc: string }
  disabled: boolean
  msg: Msg
}

export interface KeyMap<Msg> {
  // Standard navigation
  up: KeyBinding<Msg>
  down: KeyBinding<Msg>
  left: KeyBinding<Msg>
  right: KeyBinding<Msg>
  
  // Actions
  select: KeyBinding<Msg>
  cancel: KeyBinding<Msg>
  
  // Component specific
  [key: string]: KeyBinding<Msg>
}

// Helper for creating key bindings
export const KeyBinding = {
  create: <Msg>(keys: string[], help: [string, string], msg: Msg): KeyBinding<Msg> => ({
    keys,
    help: { key: help[0], desc: help[1] },
    disabled: false,
    msg
  })
}
```

### 🎨 **Styling System (from Lipgloss)**

#### **1. Immutable Style API**

```typescript
import { Data, Option, pipe } from "effect"

// Core style class using Effect's Data module
export class Style extends Data.Class<{
  readonly props: StyleProps
  readonly renderer: Option.Option<Renderer>
}> {
  // Chainable API returning new instances
  bold(value = true): Style {
    return new Style({
      ...this,
      props: {
        ...this.props,
        bold: Option.some(value)
      }
    })
  }
  
  foreground(color: Color): Style {
    return new Style({
      ...this,
      props: {
        ...this.props,
        foreground: Option.some(color)
      }
    })
  }
  
  border(style: Border, sides?: BorderSides): Style {
    return new Style({
      ...this,
      props: {
        ...this.props,
        border: Option.some(style),
        borderSides: Option.some(sides ?? BorderSides.All)
      }
    })
  }
  
  padding(top: number, right?: number, bottom?: number, left?: number): Style {
    const [t, r, b, l] = normalizeSides(top, right, bottom, left)
    return new Style({
      ...this,
      props: {
        ...this.props,
        padding: Option.some({ top: t, right: r, bottom: b, left: l })
      }
    })
  }
  
  width(w: number): Style {
    return new Style({
      ...this,
      props: {
        ...this.props,
        width: Option.some(w)
      }
    })
  }
  
  align(position: Position): Style {
    return new Style({
      ...this,
      props: {
        ...this.props,
        align: Option.some(position)
      }
    })
  }
}

// Style builder for convenience
export const style = (): Style => new Style({
  props: createEmptyProps(),
  renderer: Option.none()
})
```

#### **2. Color System**

```typescript
import { Data, Brand } from "effect"

// Color as discriminated union
export type Color = Data.TaggedUnion<{
  NoColor: {}
  Hex: { readonly value: string }
  ANSI: { readonly code: number }
  ANSI256: { readonly code: number }
  RGB: { readonly r: number; readonly g: number; readonly b: number }
  Adaptive: { readonly light: Color; readonly dark: Color }
}>

export const Color = Data.taggedUnion<Color>("_tag")

// Smart constructors
export const Colors = {
  none: (): Color => Color.NoColor({}),
  
  hex: (value: string): Option.Option<Color> => {
    if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
      return Option.some(Color.Hex({ value }))
    }
    return Option.none()
  },
  
  rgb: (r: number, g: number, b: number): Option.Option<Color> => {
    if (r >= 0 && r <= 255 && g >= 0 && g <= 255 && b >= 0 && b <= 255) {
      return Option.some(Color.RGB({ r, g, b }))
    }
    return Option.none()
  },
  
  adaptive: (light: Color, dark: Color): Color => 
    Color.Adaptive({ light, dark }),
  
  // Predefined ANSI colors
  black: Color.ANSI({ code: 30 }),
  red: Color.ANSI({ code: 31 }),
  green: Color.ANSI({ code: 32 }),
  yellow: Color.ANSI({ code: 33 }),
  blue: Color.ANSI({ code: 34 }),
  magenta: Color.ANSI({ code: 35 }),
  cyan: Color.ANSI({ code: 36 }),
  white: Color.ANSI({ code: 37 }),
}
```

#### **3. Border System**

```typescript
export interface Border {
  readonly top: string
  readonly bottom: string
  readonly left: string
  readonly right: string
  readonly topLeft: string
  readonly topRight: string
  readonly bottomLeft: string
  readonly bottomRight: string
}

export const Borders = {
  None: createBorder(" "),
  
  Normal: {
    top: "─", bottom: "─",
    left: "│", right: "│",
    topLeft: "┌", topRight: "┐",
    bottomLeft: "└", bottomRight: "┘"
  },
  
  Rounded: {
    top: "─", bottom: "─",
    left: "│", right: "│",
    topLeft: "╭", topRight: "╮",
    bottomLeft: "╰", bottomRight: "╯"
  },
  
  Thick: {
    top: "━", bottom: "━",
    left: "┃", right: "┃",
    topLeft: "┏", topRight: "┓",
    bottomLeft: "┗", bottomRight: "┛"
  },
  
  Double: {
    top: "═", bottom: "═",
    left: "║", right: "║",
    topLeft: "╔", topRight: "╗",
    bottomLeft: "╚", bottomRight: "╝"
  }
} as const

export enum BorderSides {
  None = 0,
  Top = 1 << 0,
  Right = 1 << 1,
  Bottom = 1 << 2,
  Left = 1 << 3,
  All = Top | Right | Bottom | Left
}
```

#### **4. Layout Positions**

```typescript
import { Brand } from "effect"

// Position as branded type (0.0 to 1.0)
export type Position = number & Brand.Brand<"Position">

export const Position = {
  of: (n: number): Option.Option<Position> =>
    n >= 0 && n <= 1 
      ? Option.some(n as Position)
      : Option.none(),
  
  // Predefined positions
  Top: 0.0 as Position,
  Center: 0.5 as Position,
  Bottom: 1.0 as Position,
  Left: 0.0 as Position,
  Right: 1.0 as Position,
}
```

### 🔧 **Component Implementation Examples**

#### **1. List Component (Bubbletea-inspired)**

```typescript
export interface ListModel<T> {
  items: ReadonlyArray<T>
  cursor: number
  selected: Set<number>
  filtered: ReadonlyArray<number>
  viewport: ViewportModel
  showHelp: boolean
  styles: ListStyles
}

export type ListMsg<T> = 
  | { _tag: "CursorUp" }
  | { _tag: "CursorDown" }
  | { _tag: "Select" }
  | { _tag: "SelectAll" }
  | { _tag: "Filter"; query: string }
  | { _tag: "ViewportMsg"; msg: ViewportMsg }

export class List<T> implements Component<ListModel<T>, ListMsg<T>> {
  constructor(
    private itemHeight: number = 1,
    private renderItem: (item: T, selected: boolean) => View
  ) {}
  
  init(): Effect.Effect<[ListModel<T>, Cmd<ListMsg<T>>[]], never, AppServices> {
    return Effect.succeed([
      {
        items: [],
        cursor: 0,
        selected: new Set(),
        filtered: [],
        viewport: ViewportModel.create(),
        showHelp: true,
        styles: defaultListStyles()
      },
      []
    ])
  }
  
  // ... update and view methods following Bubbletea patterns
}
```

#### **2. Table Component (Lipgloss-inspired)**

```typescript
export class Table extends Data.Class<{
  readonly headers: ReadonlyArray<string>
  readonly rows: ReadonlyArray<ReadonlyArray<string>>
  readonly widths: ReadonlyArray<number>
  readonly heights: ReadonlyArray<number>
  readonly styleFunc: (row: number, col: number) => Style
  readonly border: Border
  readonly borderStyle: Style
}> {
  // Fluent builder API
  static create(): Table {
    return new Table({
      headers: [],
      rows: [],
      widths: [],
      heights: [],
      styleFunc: () => style(),
      border: Borders.Normal,
      borderStyle: style()
    })
  }
  
  withHeaders(...headers: string[]): Table {
    return new Table({ ...this, headers })
  }
  
  withRows(rows: ReadonlyArray<ReadonlyArray<string>>): Table {
    return new Table({ ...this, rows })
  }
  
  withBorder(border: Border): Table {
    return new Table({ ...this, border })
  }
  
  withStyleFunc(fn: (row: number, col: number) => Style): Table {
    return new Table({ ...this, styleFunc: fn })
  }
  
  render(): Effect.Effect<string, RenderError, RendererService> {
    return pipe(
      calculateCellSizes(this),
      Effect.flatMap(sizes => renderTableWithSizes(this, sizes))
    )
  }
}
```

### 📦 **Service Integration Patterns**

#### **1. Renderer Service with Lipgloss Concepts**

```typescript
export interface RendererService {
  // Core rendering
  render(view: View): Effect.Effect<string, RenderError, never>
  renderStyle(text: string, style: Style): Effect.Effect<string, RenderError, never>
  
  // Terminal info
  getColorProfile(): Effect.Effect<ColorProfile, never, never>
  getSize(): Effect.Effect<{ width: number; height: number }, never, never>
  
  // Advanced features
  measureText(text: string): Effect.Effect<{ width: number; height: number }, never, never>
  wrapText(text: string, width: number): Effect.Effect<string, never, never>
}
```

#### **2. Focus Management Service**

```typescript
export interface FocusService {
  // Focus tracking
  getCurrentFocus(): Effect.Effect<Option.Option<string>, never, never>
  setFocus(id: string): Effect.Effect<void, never, never>
  
  // Tab order
  registerComponent(id: string, order: number): Effect.Effect<void, never, never>
  focusNext(): Effect.Effect<Option.Option<string>, never, never>
  focusPrevious(): Effect.Effect<Option.Option<string>, never, never>
  
  // Focus trapping
  trapFocus(containerId: string): Effect.Effect<void, never, never>
  releaseTrap(): Effect.Effect<void, never, never>
}
```

### 🎯 **Best Practices Summary**

1. **Component Design**
   - Self-contained state in Model
   - Message-based updates
   - Composable through embedding
   - Standard focus/size methods

2. **Styling**
   - Immutable style objects
   - Chainable API
   - Option types for unset values
   - Adaptive colors for themes

3. **Layout**
   - Explicit size constraints
   - Overflow handling
   - Responsive to terminal size
   - Position-based alignment

4. **Error Handling**
   - Tagged errors with Effect
   - Recovery strategies
   - Graceful degradation
   - Debug information

5. **Performance**
   - Virtual rendering for large lists
   - Memoization of expensive operations
   - Efficient string building
   - Minimal allocations

This implementation guide provides concrete patterns adapted from the Bubbletea and Lipgloss ecosystems, optimized for TypeScript and Effect.ts.