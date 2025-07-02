# API Reference

Complete API documentation for CLI-Kit. This document covers all exported functions, types, and interfaces.

## Table of Contents

- [Core API](#core-api)
- [Components API](#components-api)
- [Styling API](#styling-api)
- [Services API](#services-api)
- [Types](#types)

## Core API

### Main Functions

#### `runApp<Model, Msg>(component: Component<Model, Msg>, config: RuntimeConfig): Effect<void, ApplicationError, AppServices>`

Starts a CLI-Kit application with the specified component and configuration.

**Parameters:**
- `component`: The root component of your application
- `config`: Runtime configuration options

**Returns:** Effect that runs the application

**Example:**
```typescript
const config: RuntimeConfig = {
  fps: 30,
  quitOnCtrlC: true,
  fullscreen: true
}

Effect.runPromise(runApp(myComponent, config))
```

### View Functions

#### `text(content: string, style?: Style): View`

Creates a text view with optional styling.

**Parameters:**
- `content`: The text content to display
- `style`: Optional styling to apply

**Returns:** View representing the styled text

#### `vstack(...views: View[]): View`

Creates a vertical stack layout.

**Parameters:**
- `views`: Array of views to stack vertically

**Returns:** View representing the vertical stack

#### `hstack(...views: View[]): View`

Creates a horizontal stack layout.

**Parameters:**
- `views`: Array of views to stack horizontally

**Returns:** View representing the horizontal stack

#### `box(content: View, options: BoxOptions): View`

Creates a container with borders, padding, and styling.

**Parameters:**
- `content`: The view to wrap in a box
- `options`: Box configuration options

**Returns:** View representing the boxed content

### Configuration Types

#### `RuntimeConfig`

```typescript
interface RuntimeConfig {
  readonly fps?: number           // Target FPS (default: 60)
  readonly debug?: boolean        // Enable debug logging
  readonly quitOnEscape?: boolean // Quit on ESC key
  readonly quitOnCtrlC?: boolean  // Quit on Ctrl+C
  readonly enableMouse?: boolean  // Enable mouse support
  readonly fullscreen?: boolean   // Use alternate screen buffer
}
```

## Components API

### TextInput

#### `textInput(options: TextInputOptions): UIComponent<TextInputModel, TextInputMsg>`

Creates a text input component.

**Options:**
```typescript
interface TextInputOptions {
  readonly placeholder?: string
  readonly width?: number
  readonly maxLength?: number
  readonly echoMode?: EchoMode
  readonly multiline?: boolean
  readonly validator?: (value: string) => string | null
  readonly styles?: Partial<TextInputStyles>
}
```

#### Specialized Text Inputs

- `emailInput(options)`: Text input with email validation
- `passwordInput(options)`: Text input with password masking

### Button

#### `button(text: string, options: ButtonOptions): UIComponent<ButtonModel, ButtonMsg>`

Creates a button component.

**Options:**
```typescript
interface ButtonOptions {
  readonly variant?: ButtonVariant
  readonly width?: number
  readonly icon?: string
  readonly disabled?: boolean
  readonly styles?: Partial<ButtonStyles>
}
```

#### Button Variants

- `primaryButton(text, options)`: Primary blue button
- `secondaryButton(text, options)`: Secondary gray button
- `successButton(text, options)`: Success green button
- `dangerButton(text, options)`: Danger red button
- `warningButton(text, options)`: Warning yellow button
- `ghostButton(text, options)`: Transparent button

### List

#### `list(options: ListOptions): UIComponent<ListModel, ListMsg>`

Creates a selectable list component.

**Options:**
```typescript
interface ListOptions {
  readonly items: ReadonlyArray<ListItem>
  readonly height?: number
  readonly selectionMode?: 'single' | 'multi' | 'none'
  readonly showBorder?: boolean
  readonly styles?: Partial<ListStyles>
}
```

#### Specialized Lists

- `singleSelectList(items, options)`: Single selection list
- `multiSelectList(items, options)`: Multiple selection list

### Table

#### `table<T>(options: TableOptions<T>): UIComponent<TableModel<T>, TableMsg<T>>`

Creates a data table component.

**Options:**
```typescript
interface TableOptions<T> {
  readonly columns: ReadonlyArray<TableColumn<T>>
  readonly rows: ReadonlyArray<TableRow<T>>
  readonly selectionMode?: TableSelectionMode
  readonly showHeader?: boolean
  readonly showRowNumbers?: boolean
  readonly width?: number
  readonly pageSize?: number
  readonly initialSort?: TableSort
  readonly initialFilters?: ReadonlyArray<TableFilter>
}
```

#### Helper Functions

- `createColumn<T>(key, title, options)`: Create table column
- `createRow<T>(id, data, options)`: Create table row
- `simpleTable<T>(data, columnKeys)`: Quick table from data

### Tabs

#### `tabs<T>(options: TabsOptions<T>): UIComponent<TabsModel<T>, TabsMsg<T>>`

Creates a tabs component.

**Options:**
```typescript
interface TabsOptions<T> {
  readonly tabs: ReadonlyArray<Tab<T>>
  readonly activeTabId?: string
  readonly tabBarVisible?: boolean
  readonly styles?: Partial<TabStyles>
  readonly width?: number
  readonly height?: number
}
```

#### Helper Functions

- `createTab<T>(id, title, content, options)`: Create tab
- `stringTabs(tabData)`: Create tabs with string content

### Progress & Feedback

#### `progressBar(options: ProgressBarOptions): UIComponent<ProgressBarModel, ProgressBarMsg>`

Creates a progress bar component.

#### `spinner(options: SpinnerOptions): UIComponent<SpinnerModel, SpinnerMsg>`

Creates a loading spinner component.

**Spinner Styles:**
- `SpinnerStyle.Dots`: Rotating dots animation
- `SpinnerStyle.Line`: Line rotation animation
- `SpinnerStyle.Arc`: Arc rotation animation
- `SpinnerStyle.Box`: Box rotation animation
- `SpinnerStyle.Circle`: Circle rotation animation
- `SpinnerStyle.Bounce`: Bouncing animation
- `SpinnerStyle.Pulse`: Pulsing animation
- `SpinnerStyle.Points`: Points animation

## Styling API

### Style Creation

#### `style(color?: Color): Style`

Creates a new style with optional foreground color.

**Chaining Methods:**
- `.foreground(color: Color)`: Set foreground color
- `.background(color: Color)`: Set background color
- `.bold()`: Apply bold formatting
- `.italic()`: Apply italic formatting
- `.underline()`: Apply underline
- `.strikethrough()`: Apply strikethrough
- `.dim()`: Apply dim/faded effect
- `.blink()`: Apply blinking effect
- `.invert()`: Invert colors

### Colors

#### Standard Colors
```typescript
Colors.Black, Colors.Red, Colors.Green, Colors.Yellow
Colors.Blue, Colors.Magenta, Colors.Cyan, Colors.White
```

#### Bright Colors
```typescript
Colors.BrightBlack, Colors.BrightRed, Colors.BrightGreen, Colors.BrightYellow
Colors.BrightBlue, Colors.BrightMagenta, Colors.BrightCyan, Colors.BrightWhite
```

#### Extended Colors
```typescript
Colors.Gray, Colors.DarkGray
```

### Borders

#### Border Styles
```typescript
Borders.none     // No border
Borders.single   // ┌─┐ style
Borders.double   // ╔═╗ style
Borders.rounded  // ╭─╮ style
Borders.thick    // ┏━┓ style
```

## Services API

### InputService

Provides keyboard and mouse input handling.

#### Methods

- `keyEvents: Stream<KeyEvent>`: Stream of keyboard events
- `mouseEvents: Stream<MouseEvent>`: Stream of mouse events
- `mapKeys(mapper: (key: KeyEvent) => Msg | null): Stream<Msg>`: Map key events to messages
- `enableMouse: Effect<void>`: Enable mouse tracking
- `disableMouse: Effect<void>`: Disable mouse tracking

### TerminalService

Provides terminal control functions.

#### Methods

- `getSize(): Effect<{ width: number; height: number }>`: Get terminal size
- `clear(): Effect<void>`: Clear terminal
- `hideCursor(): Effect<void>`: Hide cursor
- `showCursor(): Effect<void>`: Show cursor
- `enableAlternateScreen(): Effect<void>`: Enable alternate screen buffer
- `disableAlternateScreen(): Effect<void>`: Disable alternate screen buffer

### RendererService

Handles rendering views to the terminal.

#### Methods

- `render(view: View): Effect<void>`: Render a view to terminal
- `renderAt(view: View, x: number, y: number): Effect<void>`: Render at specific position

### StorageService

Provides persistent storage capabilities.

#### Methods

- `save<T>(key: string, value: T): Effect<void>`: Save data
- `load<T>(key: string): Effect<T | null>`: Load data
- `remove(key: string): Effect<void>`: Remove data
- `clear(): Effect<void>`: Clear all data

## Types

### Core Types

#### `Component<Model, Msg>`

The main component interface that all components must implement.

```typescript
interface Component<Model, Msg> {
  readonly init: Effect<[Model, ReadonlyArray<Cmd<Msg>>], never, AppServices>
  readonly update: (msg: Msg, model: Model) => Effect<[Model, ReadonlyArray<Cmd<Msg>>], never, AppServices>
  readonly view: (model: Model) => View
  readonly subscriptions?: (model: Model) => Effect<Sub<Msg>, never, AppServices>
}
```

#### `View`

Represents a renderable view element.

```typescript
type View = 
  | { readonly _tag: "Text"; readonly content: string; readonly style?: Style }
  | { readonly _tag: "VStack"; readonly children: ReadonlyArray<View> }
  | { readonly _tag: "HStack"; readonly children: ReadonlyArray<View> }
  | { readonly _tag: "Box"; readonly child: View; readonly options: BoxOptions }
```

#### `KeyEvent`

Represents a keyboard input event.

```typescript
interface KeyEvent {
  readonly key: string      // Key name (e.g., 'a', 'enter', 'ctrl+c')
  readonly ctrl: boolean    // Ctrl modifier pressed
  readonly shift: boolean   // Shift modifier pressed
  readonly alt: boolean     // Alt modifier pressed
  readonly meta: boolean    // Meta/Cmd modifier pressed
}
```

#### `MouseEvent`

Represents a mouse input event.

```typescript
interface MouseEvent {
  readonly type: 'press' | 'release' | 'move'
  readonly button: 'left' | 'right' | 'middle' | 'none'
  readonly x: number        // Column position
  readonly y: number        // Row position
  readonly ctrl: boolean    // Ctrl modifier pressed
  readonly shift: boolean   // Shift modifier pressed
  readonly alt: boolean     // Alt modifier pressed
}
```

### Component Types

#### `UIComponent<Model, Msg>`

Extended component interface for UI components.

```typescript
interface UIComponent<Model, Msg> extends Component<Model, Msg> {
  readonly id: string
  readonly focus?: () => Effect<Msg, never, never>
  readonly blur?: () => Effect<Msg, never, never>
  readonly focused?: (model: Model) => boolean
  readonly setSize?: (width: number, height?: number) => Effect<Msg, never, never>
  readonly getSize?: (model: Model) => { width: number; height: number }
  readonly handleKey?: (key: KeyEvent, model: Model) => Msg | null
  readonly handleMouse?: (mouse: MouseEvent, model: Model) => Msg | null
}
```

#### Common Component Traits

```typescript
interface Focusable {
  readonly focused: boolean
}

interface Sized {
  readonly width: number
  readonly height?: number
}

interface Disableable {
  readonly disabled: boolean
}
```

### Style Types

#### `Style`

Represents text and layout styling.

```typescript
interface Style {
  readonly foregroundColor?: Color
  readonly backgroundColor?: Color
  readonly bold?: boolean
  readonly italic?: boolean
  readonly underline?: boolean
  readonly strikethrough?: boolean
  readonly dim?: boolean
  readonly blink?: boolean
  readonly invert?: boolean
}
```

#### `Color`

Represents a color value.

```typescript
type Color = number // ANSI color code
```

#### `BoxOptions`

Configuration for box containers.

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

#### `Padding`

Represents spacing values.

```typescript
interface Padding {
  readonly top: number
  readonly right: number
  readonly bottom: number
  readonly left: number
}
```

### Effect Types

#### `Cmd<Msg>`

Represents a command that produces a message.

```typescript
type Cmd<Msg> = Effect<Msg, never, AppServices>
```

#### `Sub<Msg>`

Represents a subscription that produces a stream of messages.

```typescript
type Sub<Msg> = Stream<Msg, never, AppServices>
```

#### `AppServices`

The services available to components.

```typescript
type AppServices = 
  | TerminalService
  | InputService  
  | RendererService
  | StorageService
  | MouseRouterService
```

### Error Types

#### `ApplicationError`

Base error type for application errors.

```typescript
class ApplicationError extends Error {
  readonly _tag = "ApplicationError"
  constructor(
    readonly message: string,
    readonly cause?: unknown
  )
}
```

#### Component-Specific Errors

- `InputError`: Input handling errors
- `RenderError`: Rendering errors
- `StorageError`: Storage operation errors
- `TerminalError`: Terminal control errors

## Usage Patterns

### Component Creation Pattern

```typescript
// 1. Define your model
interface MyModel {
  readonly value: string
  readonly focused: boolean
}

// 2. Define your messages
type MyMsg = 
  | { readonly tag: "setValue"; readonly value: string }
  | { readonly tag: "focus" }
  | { readonly tag: "blur" }

// 3. Create the component
const myComponent: Component<MyModel, MyMsg> = {
  init: Effect.succeed([{ value: "", focused: false }, []]),
  
  update: (msg, model) => {
    switch (msg.tag) {
      case "setValue":
        return Effect.succeed([{ ...model, value: msg.value }, []])
      case "focus":
        return Effect.succeed([{ ...model, focused: true }, []])
      case "blur":
        return Effect.succeed([{ ...model, focused: false }, []])
    }
  },
  
  view: (model) => {
    const style = model.focused 
      ? style(Colors.BrightWhite).background(Colors.Blue)
      : style(Colors.White)
    return text(model.value, style)
  },
  
  subscriptions: (model) =>
    Effect.gen(function* (_) {
      const input = yield* _(InputService)
      return input.mapKeys(key => {
        // Handle keyboard input
        return null
      })
    })
}
```

### Service Usage Pattern

```typescript
// Using services in components
subscriptions: (model: Model) =>
  Effect.gen(function* (_) {
    const input = yield* _(InputService)
    const terminal = yield* _(TerminalService)
    const storage = yield* _(StorageService)
    
    // Use services...
    return Stream.empty
  })
```

This API reference covers the complete public interface of CLI-Kit. For implementation details and examples, see the other documentation files and the examples directory.