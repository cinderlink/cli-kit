# CLI Framework API Reference

## Core Functions

### defineConfig

Creates a type-safe CLI configuration.

```typescript
function defineConfig(config: CLIConfig): CLIConfig
```

**Parameters:**
- `config: CLIConfig` - The CLI configuration object

**Returns:** The validated configuration object

**Example:**
```typescript
const config = defineConfig({
  name: "my-cli",
  version: "1.0.0",
  description: "My CLI application",
  commands: {
    hello: {
      description: "Say hello",
      handler: () => console.log("Hello!")
    }
  }
})
```

### runCLI

Executes the CLI with the given configuration.

```typescript
function runCLI(config: CLIConfig, argv?: string[]): Promise<void>
```

**Parameters:**
- `config: CLIConfig` - The CLI configuration
- `argv?: string[]` - Optional argument array (defaults to process.argv.slice(2))

**Returns:** Promise that resolves when CLI execution completes

**Example:**
```typescript
await runCLI(config)
// Or with custom args
await runCLI(config, ["hello", "--name", "World"])
```

### lazyLoad

Creates a lazy-loaded command handler.

```typescript
function lazyLoad(importFn: () => Promise<{ default: Handler }>): LazyHandler
```

**Parameters:**
- `importFn` - Function that returns a promise resolving to a module with default export

**Returns:** A lazy handler function

**Example:**
```typescript
commands: {
  heavy: {
    description: "Heavy command",
    handler: lazyLoad(() => import("./commands/heavy"))
  }
}
```

## Configuration Types

### CLIConfig

Main CLI configuration interface.

```typescript
interface CLIConfig {
  name: string
  version: string
  description?: string
  options?: Record<string, z.ZodSchema>
  commands?: Record<string, CommandConfig>
  plugins?: Plugin[]
  hooks?: CLIHooks
}
```

**Properties:**
- `name` - CLI application name
- `version` - Application version
- `description` - Optional description
- `options` - Global options available to all commands
- `commands` - Command definitions
- `plugins` - Array of plugins to load
- `hooks` - Lifecycle hooks

### CommandConfig

Command configuration interface.

```typescript
interface CommandConfig {
  description: string
  args?: Record<string, z.ZodSchema>
  options?: Record<string, z.ZodSchema>
  commands?: Record<string, CommandConfig>
  handler?: Handler | LazyHandler
  aliases?: string[]
  hidden?: boolean
  examples?: CommandExample[]
}
```

**Properties:**
- `description` - Command description
- `args` - Positional arguments schema
- `options` - Command options schema
- `commands` - Nested subcommands
- `handler` - Command handler function
- `aliases` - Alternative command names
- `hidden` - Hide from help output
- `examples` - Usage examples

### CLIHooks

Lifecycle hooks interface.

```typescript
interface CLIHooks {
  beforeCommand?: (command: string[], args: ParsedArgs) => Promise<void> | void
  afterCommand?: (command: string[], args: ParsedArgs, result: any) => Promise<void> | void
  onError?: (error: Error, command: string[], args: ParsedArgs) => Promise<void> | void
}
```

## Plugin API

### definePlugin

Creates a plugin with declarative configuration.

```typescript
function definePlugin(plugin: Plugin): Plugin
```

**Example:**
```typescript
const myPlugin = definePlugin({
  metadata: {
    name: "my-plugin",
    version: "1.0.0"
  },
  commands: {
    hello: {
      description: "Say hello",
      handler: () => console.log("Hello from plugin!")
    }
  }
})
```

### createPlugin

Creates a plugin using the builder API.

```typescript
function createPlugin(
  name: string,
  version: string,
  builder: (api: PluginAPI) => void
): Plugin
```

**Parameters:**
- `name` - Plugin name
- `version` - Plugin version
- `builder` - Function that receives the plugin API

**Example:**
```typescript
const myPlugin = createPlugin("my-plugin", "1.0.0", (api) => {
  api.addCommand("hello", {
    description: "Say hello",
    handler: () => console.log("Hello!")
  })
  
  api.provideService("greeting", {
    greet: (name: string) => `Hello, ${name}!`
  })
})
```

### PluginAPI

API provided to plugin builder functions.

```typescript
interface PluginAPI {
  addCommand(name: string, config: CommandConfig): void
  addHook(name: string, handler: Function): void
  provideService(name: string, service: any): void
  extendCommand(name: string, extension: CommandExtension): void
  onInstall(handler: (context: PluginContext) => Promise<void> | void): void
  onUninstall(handler: (context: PluginContext) => Promise<void> | void): void
}
```

## Component API

### Panel

Creates a panel with optional title and styling.

```typescript
function Panel(
  content: View | View[],
  options?: PanelOptions
): View
```

**Parameters:**
- `content` - Panel content (single view or array)
- `options` - Panel configuration options

**Options:**
```typescript
interface PanelOptions {
  title?: string
  border?: BorderStyle
  padding?: number | Padding
  style?: StyleProps
  width?: number
  height?: number
}
```

**Example:**
```typescript
Panel(
  vstack(
    text("Hello"),
    text("World")
  ),
  { title: "Greeting", border: "rounded" }
)
```

### SuccessPanel

Creates a success-themed panel.

```typescript
function SuccessPanel(content: View | View[], title?: string): View
```

### ErrorPanel

Creates an error-themed panel.

```typescript
function ErrorPanel(content: View | View[], title?: string): View
```

### InfoPanel

Creates an info-themed panel.

```typescript
function InfoPanel(content: View | View[], title?: string): View
```

## View Functions

### text

Creates a text view.

```typescript
function text(content: string): View
```

### styledText

Creates styled text.

```typescript
function styledText(content: string, style: Style): View
```

**Example:**
```typescript
styledText("Important!", style().foreground(Colors.red).bold())
```

### vstack

Creates a vertical stack of views.

```typescript
function vstack(...views: View[]): View
```

### hstack

Creates a horizontal stack of views.

```typescript
function hstack(...views: View[]): View
```

## Styling API

### style

Creates a new style builder.

```typescript
function style(): Style
```

**Methods:**
- `foreground(color: Color)` - Set text color
- `background(color: Color)` - Set background color
- `bold(value?: boolean)` - Make text bold
- `italic(value?: boolean)` - Make text italic
- `underline(value?: boolean)` - Underline text
- `faint(value?: boolean)` - Make text faint/dim

**Example:**
```typescript
style()
  .foreground(Colors.blue)
  .background(Colors.white)
  .bold()
```

### Colors

Predefined color constants.

```typescript
const Colors = {
  black: Color,
  red: Color,
  green: Color,
  yellow: Color,
  blue: Color,
  magenta: Color,
  cyan: Color,
  white: Color,
  gray: Color,
  // Bright variants
  brightRed: Color,
  brightGreen: Color,
  // ... etc
}
```

## Reactive State API

### $state

Creates reactive state.

```typescript
function $state<T>(initial: T): Signal<T>
```

**Example:**
```typescript
const count = $state(0)

// Get value
console.log(count.value)

// Set value
count.set(5)

// Update value
count.update(n => n + 1)

// Subscribe to changes
const unsubscribe = count.subscribe(value => {
  console.log("Count changed:", value)
})
```

### $derived

Creates derived state that updates when dependencies change.

```typescript
function $derived<T>(fn: () => T): ReadonlySignal<T>
```

**Example:**
```typescript
const firstName = $state("John")
const lastName = $state("Doe")

const fullName = $derived(() => `${firstName.value} ${lastName.value}`)
```

### $effect

Creates a side effect that runs when dependencies change.

```typescript
function $effect(fn: () => void | (() => void)): void
```

**Example:**
```typescript
const count = $state(0)

$effect(() => {
  console.log("Count is now:", count.value)
  
  // Optional cleanup
  return () => {
    console.log("Cleaning up")
  }
})
```

## Component Creation

### createComponent

Creates a component with simplified API.

```typescript
function createComponent<Props = {}>(
  setup: (props: Props) => ComponentDefinition
): (props: Props) => Component
```

**Example:**
```typescript
const Counter = createComponent<{ initial?: number }>((props) => {
  const count = $state(props.initial || 0)
  
  return {
    update: (msg, model) => {
      if (msg._tag === "KeyPress") {
        if (msg.key.name === "up") count.update(n => n + 1)
        if (msg.key.name === "down") count.update(n => n - 1)
      }
      return [model, []]
    },
    
    view: () => Panel(
      vstack(
        text("Counter"),
        text(`Count: ${count.value}`),
        text("Press ↑/↓ to change")
      )
    )
  }
})
```

## Testing API

### testPluginCommand

Tests a plugin command.

```typescript
async function testPluginCommand(
  plugin: Plugin,
  commandPath: string[],
  args?: Record<string, any>
): Promise<any>
```

### testPluginHook

Tests a plugin hook.

```typescript
async function testPluginHook(
  plugin: Plugin,
  hookName: string,
  ...args: any[]
): Promise<HookTestResult>
```

### executeWithPlugins

Executes a command with plugins applied.

```typescript
async function executeWithPlugins(
  config: CLIConfig,
  plugins: Plugin[],
  argv: string[]
): Promise<any>
```

## Parser API

### CLIParser

Parses command-line arguments.

```typescript
class CLIParser {
  constructor(config: CLIConfig)
  parse(argv: string[]): ParsedArgs
  generateHelp(commandPath?: string[]): string
}
```

### ParsedArgs

Parsed arguments structure.

```typescript
interface ParsedArgs {
  command: string[]
  args: Record<string, any>
  options: Record<string, any>
  rawArgs: string[]
}
```

## Router API

### CLIRouter

Routes commands to handlers.

```typescript
class CLIRouter {
  constructor(config: CLIConfig)
  route(args: ParsedArgs): RouteResult
  executeHandler(handler: Handler, args: any, isLazy?: boolean): Promise<any>
}
```

## Type Utilities

### Handler

Command handler type.

```typescript
type Handler = (args: any) => any | Promise<any>
```

### LazyHandler

Lazy-loaded handler type.

```typescript
type LazyHandler = () => Promise<Handler>
```

### View

Terminal view type.

```typescript
interface View {
  render: () => Effect<string, RenderError, never>
  width?: number
  height?: number
}
```

### Component

Full component interface.

```typescript
interface Component<Model, Msg> {
  init: Effect<[Model, Cmd<Msg>[]], never, AppServices>
  update: (msg: Msg, model: Model) => Effect<[Model, Cmd<Msg>[]], never, AppServices>
  view: (model: Model) => View
  subscriptions?: (model: Model) => Effect<Sub<Msg>, never, AppServices>
}
```

## Error Types

### CLIError

Base error class for CLI errors.

```typescript
class CLIError extends Error {
  constructor(message: string, code?: string)
  code?: string
}
```

### CommandNotFoundError

Thrown when a command is not found.

```typescript
class CommandNotFoundError extends CLIError {
  constructor(command: string[])
  suggestions: string[]
}
```

### ValidationError

Thrown when argument validation fails.

```typescript
class ValidationError extends CLIError {
  constructor(message: string, field?: string)
  field?: string
  details?: z.ZodError
}
```

## Utilities

### commonOptions

Common option schemas.

```typescript
const commonOptions = {
  help: z.boolean().default(false).describe("Show help"),
  version: z.boolean().default(false).describe("Show version"),
  verbose: z.boolean().default(false).describe("Verbose output"),
  quiet: z.boolean().default(false).describe("Quiet mode"),
  json: z.boolean().default(false).describe("JSON output")
}
```

### commonArgs

Common argument schemas.

```typescript
const commonArgs = {
  file: z.string().describe("File path"),
  directory: z.string().describe("Directory path"),
  url: z.string().url().describe("URL"),
  port: z.number().min(1).max(65535).describe("Port number"),
  count: z.number().min(0).describe("Count")
}
```

## Environment Variables

### CLI_DEBUG

Enable debug output.

```bash
CLI_DEBUG=true my-cli command
```

### CLI_NO_COLOR

Disable colored output.

```bash
CLI_NO_COLOR=1 my-cli command
```

### CLI_PLUGINS_PATH

Additional plugin search paths.

```bash
CLI_PLUGINS_PATH=/path/to/plugins:/another/path my-cli command
```