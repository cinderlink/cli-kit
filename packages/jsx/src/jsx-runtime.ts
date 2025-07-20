/**
 * JSX Runtime for CLI-KIT
 * 
 * Enables JSX/TSX syntax for building terminal UIs
 * Compatible with React JSX transform with Svelte-inspired binding support
 */

import type { View } from "@tuix/core"
import { text, vstack, hstack, styledText } from "@tuix/core"
import { style, type Style, Colors } from "@tuix/styling"
import type { ComponentProps } from "@tuix/components"
import { isBindableRune, isStateRune, type BindableRune, type StateRune } from '@tuix/reactive'
// import { config, templates } from "@tuix/core"
import * as fs from "fs/promises"
import * as path from "path"

// Temporary merge function until we import from config utils
function mergeDeep(target: any, source: any): any {
  const result = { ...target }
  
  for (const [key, value] of Object.entries(source)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      if (result[key] && typeof result[key] === 'object' && !Array.isArray(result[key])) {
        result[key] = mergeDeep(result[key], value)
      } else {
        result[key] = value
      }
    } else {
      result[key] = value
    }
  }
  
  return result
}

// Debug logging that respects TUIX_DEBUG env var
const DEBUG = process.env.TUIX_DEBUG === 'true'
const debug = (message: string, ...args: any[]) => {
  if (DEBUG) {
    const timestamp = new Date().toISOString()
    console.log(`[${timestamp}] [TUIX JSX] ${message}`, ...args)
  }
}

// Global plugin registry for JSX components
class JSXPluginRegistry {
  private plugins: Map<string, any> = new Map()
  private configurations: Map<string, Record<string, any>> = new Map()
  private enabled: Map<string, boolean> = new Map()
  private declarativePlugins: Map<string, any> = new Map()
  private commandStack: any[] = [] // Stack for building nested commands
  private renderableContent: any[] = [] // Stack for tracking renderable content
  private contextStack: Array<{
    type: 'plugin' | 'command' | 'component'
    id: string
    data: any
    parent?: any
    children: any[]
  }> = [] // Stack for component context and parent references
  
  // CLI configuration
  private cliConfig: {
    name?: string
    alias?: string
    description?: string
    version?: string
  } = {}
  
  // Global config manager
  private configManager: any = null
  
  setConfig(configManager: any) {
    this.configManager = configManager
  }
  
  getGlobalConfig() {
    return this.configManager
  }
  
  register(plugin: any, options: {
    as?: string
    alias?: string
    prefix?: string
    enabled?: boolean
    config?: Record<string, any>
  } = {}) {
    const name = options.as || plugin.name
    this.plugins.set(name, plugin)
    this.enabled.set(name, options.enabled !== false)
    
    if (options.config) {
      this.configurations.set(name, options.config)
    }
    
    // Register with alias if provided
    if (options.alias) {
      this.plugins.set(options.alias, plugin)
      this.enabled.set(options.alias, options.enabled !== false)
    }
    
    console.log(`🔌 Plugin registered: ${name}${options.alias ? ` (alias: ${options.alias})` : ''}`)
  }
  
  get(name: string) {
    return this.plugins.get(name)
  }
  
  isEnabled(name: string): boolean {
    return this.enabled.get(name) ?? false
  }
  
  enable(name: string, enabled: boolean = true) {
    this.enabled.set(name, enabled)
  }
  
  configure(name: string, config: Record<string, any>) {
    this.configurations.set(name, { ...this.configurations.get(name), ...config })
  }
  
  getConfig(name: string): Record<string, any> {
    return this.configurations.get(name) || {}
  }
  
  getAllEnabled() {
    const enabled: any[] = []
    
    // Add regular plugins
    for (const [name, plugin] of this.plugins.entries()) {
      if (this.isEnabled(name)) {
        enabled.push({
          name,
          plugin,
          config: this.getConfig(name)
        })
      }
    }
    
    // Add declarative plugins
    for (const [name, plugin] of this.declarativePlugins.entries()) {
      if (this.isEnabled(name)) {
        enabled.push({
          name,
          plugin,
          config: this.getConfig(name)
        })
      }
    }
    
    return enabled
  }
  
  // Declarative plugin management
  private allCommands: any[] = [] // All commands discovered during JSX processing
  private commandHierarchy: Map<string, string[]> = new Map() // parent -> children mapping
  private currentPluginName: string | null = null
  private commandParentMap: Map<any, any> = new Map() // Track JSX parent-child relationships
  private deferredCommands: Array<{ element: any, parentPath: string[] }> = [] // Commands to process later
  private currentCommandPath: string[] = [] // Current nesting path during processing
  
  startPlugin(name: string, description?: string, version?: string) {
    const plugin = {
      name,
      description,
      version,
      commands: {},
      hooks: {}
    }
    
    this.declarativePlugins.set(name, plugin)
    this.enabled.set(name, true)
    this.commandStack = [] // Reset command stack
    this.currentPluginName = name // Set current plugin context
    
    return plugin
  }
  
  finalizePlugin() {
    if (this.currentPluginName && this.allCommands.length > 0) {
      const plugin = this.declarativePlugins.get(this.currentPluginName)
      if (plugin) {
        // Build the command hierarchy and add top-level commands to the plugin
        const topLevelCommands = this.buildCommandHierarchy()
        topLevelCommands.forEach(cmd => {
          plugin.commands[cmd.name] = cmd
        })
        
        debug(`[REGISTRY] Plugin '${this.currentPluginName}' finalized with commands:`, Object.keys(plugin.commands))
      }
      
      // Clear for next plugin
      this.allCommands = []
      this.commandStack = []
    }
    this.currentPluginName = null
  }
  
  startCommand(name: string | undefined, options: {
    description?: string
    aliases?: string[]
    hidden?: boolean
    handler?: (ctx: any) => any
    interactive?: boolean | ((ctx: any) => boolean)
  } = {}) {
    // Get the parent command from the stack (if any)
    const parent = this.commandStack[this.commandStack.length - 1]
    
    const command = {
      name: name || '',
      description: options.description,
      aliases: options.aliases,
      hidden: options.hidden,
      handler: options.handler,
      interactive: options.interactive ?? false,
      args: {},
      flags: {},
      subcommands: {},
      examples: [],
      help: "",
      renderableContent: [] as any[],
      parent: parent?.name || null, // Track parent command name
      _tempIndex: -1 // Will be set when added to allCommands
    }
    
    debug(`[REGISTRY] startCommand: ${name}, parent: ${command.parent}, stack depth before: ${this.commandStack.length}, handler: ${!!options.handler}`)
    
    this.commandStack.push(command)
    this.renderableContent.push([])
    return command
  }
  
  endCommand() {
    const command = this.commandStack.pop()
    const content = this.renderableContent.pop() || []
    if (!command) return null
    
    // Update parent reference now that command is complete
    // The current top of stack (after pop) is the parent
    const parent = this.commandStack[this.commandStack.length - 1]
    if (parent && parent.name) {
      command.parent = parent.name
      debug(`[REGISTRY] endCommand: ${command.name}, parent updated to: ${parent.name}, stack depth: ${this.commandStack.length}`)
    } else {
      debug(`[REGISTRY] endCommand: ${command.name}, no parent, stack depth: ${this.commandStack.length}`)
    }
    
    // Add any collected renderable content to the command
    if (content.length > 0) {
      command.renderableContent = content
    }
    
    // If no handler was provided, create one that renders the collected content
    if (!command.handler && command.renderableContent.length > 0) {
      command.handler = () => {
        const content = command.renderableContent
        return content.length === 1 ? content[0] : vstack(...content)
      }
    }
    
    // Add this command to our collection for hierarchy building
    command._tempIndex = this.allCommands.length
    this.allCommands.push(command)
    
    return command
  }
  
  addArg(name: string, options: {
    description: string
    required?: boolean
    type?: string
    choices?: string[]
    default?: any
  }) {
    const current = this.commandStack[this.commandStack.length - 1]
    if (current) {
      current.args[name] = options
    }
  }
  
  addFlag(name: string, options: {
    description: string
    alias?: string
    type?: string
    default?: any
    choices?: string[]
  }) {
    const current = this.commandStack[this.commandStack.length - 1]
    if (current) {
      current.flags[name] = options
    }
  }
  
  addHelp(content: string) {
    const current = this.commandStack[this.commandStack.length - 1]
    if (current) {
      current.help = content
    }
  }
  
  addExample(example: string, description?: string) {
    const current = this.commandStack[this.commandStack.length - 1]
    if (current) {
      current.examples.push({ example, description })
    }
  }
  
  addRenderableContent(content: any) {
    const currentContent = this.renderableContent[this.renderableContent.length - 1]
    if (currentContent) {
      currentContent.push(content)
    }
  }
  
  hasRenderableContent(): boolean {
    const currentContent = this.renderableContent[this.renderableContent.length - 1]
    return currentContent ? currentContent.length > 0 : false
  }
  
  buildCommandHierarchy() {
    debug(`[REGISTRY] Building hierarchy from ${this.allCommands.length} commands`)
    if (DEBUG) {
      this.allCommands.forEach((cmd, i) => {
        debug(`  Command ${i}: "${cmd.name}" (parent: "${cmd.parent}", handler: ${!!cmd.handler}, index: ${cmd._tempIndex})`)
      })
    }
    
    // Build command hierarchy based on the order commands appear in allCommands
    // In JSX, nested commands appear BEFORE their parents due to bottom-up processing
    // So if we see: [start, stop, dev] - start and stop are children of dev
    
    const commandsByName: Map<string, any> = new Map()
    const processedCommands = new Set<string>()
    const topLevelCommands: any[] = []
    
    // Index all commands by name
    for (const command of this.allCommands) {
      if (command.name) {
        commandsByName.set(command.name, command)
      }
    }
    
    // Group commands by their structure
    // Commands without handlers are parent commands
    const parentCommands = this.allCommands.filter(cmd => cmd.name && !cmd.handler)
    const leafCommands = this.allCommands.filter(cmd => cmd.name && cmd.handler)
    
    debug(`[REGISTRY] Found ${parentCommands.length} parent commands and ${leafCommands.length} leaf commands`)
    
    // For each parent command, find its children
    for (const parent of parentCommands) {
      const parentIndex = this.allCommands.indexOf(parent)
      
      // Find the next parent command after this one
      let nextParentIndex = this.allCommands.length
      for (let i = parentIndex + 1; i < this.allCommands.length; i++) {
        if (this.allCommands[i].name && !this.allCommands[i].handler) {
          nextParentIndex = i
          break
        }
      }
      
      // All commands between this parent and the next parent are likely children
      for (let i = 0; i < parentIndex; i++) {
        const potentialChild = this.allCommands[i]
        
        // Skip if no name or already processed
        if (!potentialChild.name || processedCommands.has(potentialChild.name)) {
          continue
        }
        
        // Check if there's another parent between this child and our parent
        let hasIntermediateParent = false
        for (let j = i + 1; j < parentIndex; j++) {
          const intermediate = this.allCommands[j]
          if (intermediate.name && !intermediate.handler && intermediate !== parent) {
            hasIntermediateParent = true
            break
          }
        }
        
        // If no intermediate parent, this is a child of our parent
        if (!hasIntermediateParent) {
          parent.subcommands[potentialChild.name] = potentialChild
          processedCommands.add(potentialChild.name)
          debug(`[REGISTRY] Nested "${potentialChild.name}" under "${parent.name}"`)
        }
      }
      
      // Add parent as top-level
      topLevelCommands.push(parent)
      processedCommands.add(parent.name)
      debug(`[REGISTRY] Added top-level command: "${parent.name}"`)
    }
    
    // Any remaining unprocessed commands are top-level
    for (const command of this.allCommands) {
      if (command.name && !processedCommands.has(command.name)) {
        topLevelCommands.push(command)
        processedCommands.add(command.name)
        debug(`[REGISTRY] Added top-level command: "${command.name}" (orphaned)`)
      }
    }
    
    debug(`[REGISTRY] Built ${topLevelCommands.length} top-level commands`)
    if (DEBUG) {
      topLevelCommands.forEach(cmd => {
        debug(`  Top-level: "${cmd.name}" with ${Object.keys(cmd.subcommands).length} subcommands`)
      })
    }
    
    return topLevelCommands
  }
  
  shouldBeNestedUnder(child: any, parent: any): boolean {
    // Handler-only commands (no name) should be nested under the last named command
    if (!child.name && parent.name) {
      return true
    }
    
    // For now, use simple heuristics based on command names
    // In exemplar: dev > status > handler
    // So "status" should be under "dev"
    if (parent.name === 'dev' && child.name === 'status') {
      return true
    }
    
    return false
  }
  
  addArg(name: string, options: {
    description: string
    required?: boolean
    type?: string
    choices?: string[]
    default?: any
  }) {
    const current = this.commandStack[this.commandStack.length - 1]
    if (current) {
      current.args[name] = options
    }
  }
  
  addFlag(name: string, options: {
    description: string
    alias?: string
    type?: string
    default?: any
    choices?: string[]
  }) {
    const current = this.commandStack[this.commandStack.length - 1]
    if (current) {
      current.flags[name] = options
    }
  }
  
  addHelp(content: string) {
    const current = this.commandStack[this.commandStack.length - 1]
    if (current) {
      current.help = content
    }
  }
  
  addExample(example: string, description?: string) {
    const current = this.commandStack[this.commandStack.length - 1]
    if (current) {
      current.examples.push({ example, description })
    }
  }
  
  addRenderableContent(content: any) {
    const currentContent = this.renderableContent[this.renderableContent.length - 1]
    if (currentContent) {
      currentContent.push(content)
    }
  }
  
  hasRenderableContent(): boolean {
    const currentContent = this.renderableContent[this.renderableContent.length - 1]
    return currentContent ? currentContent.length > 0 : false
  }
  
  // Context management for parent/child relationships
  pushContext(type: 'plugin' | 'command' | 'component', id: string, data: any) {
    const parent = this.contextStack[this.contextStack.length - 1]
    const context = {
      type,
      id,
      data,
      parent,
      children: []
    }
    
    if (parent) {
      parent.children.push(context)
    }
    
    this.contextStack.push(context)
    return context
  }
  
  popContext() {
    return this.contextStack.pop()
  }
  
  getCurrentContext() {
    return this.contextStack[this.contextStack.length - 1]
  }
  
  getParentContext() {
    const current = this.getCurrentContext()
    return current?.parent
  }
  
  // Scope-aware state management
  getScopedState<T>(key: string, defaultValue?: T): T | undefined {
    // Look up the context stack for a state value
    for (let i = this.contextStack.length - 1; i >= 0; i--) {
      const context = this.contextStack[i]
      if (context.data.state && context.data.state[key] !== undefined) {
        return context.data.state[key]
      }
    }
    return defaultValue
  }
  
  setScopedState<T>(key: string, value: T): void {
    const current = this.getCurrentContext()
    if (current) {
      if (!current.data.state) {
        current.data.state = {}
      }
      current.data.state[key] = value
    }
  }
  
  setCLIConfig(config: {
    name?: string
    alias?: string
    description?: string
    version?: string
  }) {
    this.cliConfig = { ...this.cliConfig, ...config }
  }
  
  getCLIConfig() {
    return this.cliConfig
  }
}

const pluginRegistry = new JSXPluginRegistry()

/**
 * Initialize configuration system for the CLI app
 */
async function initializeConfig(appName: string) {
  const configPaths = [
    `${appName}.config.ts`,
    `${appName}.config.js`,
    `${appName}.config.json`,
    `tuix.config.ts`,
    `tuix.config.js`, 
    `tuix.config.json`,
    `.${appName}/config.ts`,
    `.${appName}/config.js`,
    `.${appName}/config.json`,
    `.tuix/config.ts`,
    `.tuix/config.js`,
    `.tuix/config.json`
  ]

  // Check if any config file exists
  let configExists = false
  for (const configPath of configPaths) {
    try {
      await fs.access(configPath)
      configExists = true
      break
    } catch {
      // File doesn't exist, continue
    }
  }

  // If no config exists, create a default one
  if (!configExists) {
    const defaultConfigPath = `${appName}.config.ts`
    const configContent = `// Config file for ${appName}\nexport default {\n  name: "${appName}",\n  version: "1.0.0"\n}`
    
    try {
      await fs.writeFile(defaultConfigPath, configContent)
      console.log(`📄 Created default config file: ${defaultConfigPath}`)
    } catch (error) {
      console.warn(`Warning: Could not create config file: ${error.message}`)
    }
  }

  // Load configuration
  try {
    // Try to load user config file directly first
    const configPaths = [
      `${appName}.config.ts`,
      `${appName}.config.js`, 
      'tuix.config.ts',
      'tuix.config.js',
      `.${appName}/config.ts`,
      `.${appName}/config.js`,
      '.tuix/config.ts',
      '.tuix/config.js'
    ]
    
    let userConfig = null
    for (const configPath of configPaths) {
      try {
        const fullPath = path.resolve(configPath)
        const configModule = await import(fullPath)
        userConfig = configModule.default || configModule
        debug(`[CONFIG] Loaded user config from: ${configPath}`)
        break
      } catch (error) {
        // Config file doesn't exist or can't be loaded, continue
        debug(`[CONFIG] Failed to load ${configPath}: ${error.message}`)
      }
    }
    
    // Merge user config with defaults
    const defaultConfig = {
      logger: {
        level: "info",
        format: "pretty",
        showEmoji: true
      },
      processManager: {
        services: {
          vite: {
            command: "bun run dev",
            preset: "vite",
            group: "development",
            autorestart: true
          },
          typecheck: {
            command: "bun run typecheck --watch",
            preset: "tsc",
            group: "quality", 
            autorestart: false
          },
          test: {
            command: "bun test --watch",
            preset: "vitest",
            group: "testing",
            autorestart: true
          }
        },
        tuixDir: ".tuix",
        autoRestart: true,
        maxRestarts: 5
      }
    }
    
    // Deep merge user config with defaults
    const mergedConfig = userConfig ? mergeDeep(defaultConfig, userConfig) : defaultConfig
    
    // Create config directly with our merged data instead of using config.cli
    // which tries to load from files and overrides our merged config
    const configManager = await config.simple(mergedConfig)

    // Store globally for access by plugins
    pluginRegistry.setConfig(configManager)
    
    debug(`[CONFIG] Config manager created with services:`, Object.keys(configManager.get('processManager.services') || {}))
    
    return configManager
  } catch (error) {
    console.warn(`Warning: Failed to load config: ${error.message}`)
    return null
  }
}

// JSX namespace for TypeScript
export namespace JSX {
  export interface Element extends View {}
  
  export interface IntrinsicElements {
    // Text elements
    text: TextProps
    span: TextProps
    
    // Layout elements
    vstack: StackProps
    hstack: StackProps
    div: StackProps
    
    // Styled elements
    bold: TextProps
    italic: TextProps
    underline: TextProps
    faint: TextProps
    
    // Color elements
    red: TextProps
    green: TextProps
    blue: TextProps
    yellow: TextProps
    cyan: TextProps
    magenta: TextProps
    white: TextProps
    gray: TextProps
    
    // Semantic elements
    error: TextProps
    success: TextProps
    warning: TextProps
    info: TextProps
    
    // Components
    panel: PanelProps
    button: ButtonProps
    list: ListProps
    input: InputProps
    
    // Plugin registration components
    RegisterPlugin: RegisterPluginProps
    EnablePlugin: EnablePluginProps
    ConfigurePlugin: ConfigurePluginProps
    
    // Declarative command definition components (intrinsic)
    CLI: CLIProps
    Plugin: PluginProps
    LoadPlugin: LoadPluginProps
    Command: CommandProps
    Arg: ArgProps
    Flag: FlagProps
    Help: HelpProps
    Example: ExampleProps
    
    // Stream components
    Stream: StreamProps<any>
    Pipe: PipeProps<any, any>
    Transform: TransformProps<any>
    StreamBox: StreamBoxProps<any>
    Spawn: SpawnProps
    ManagedSpawn: ManagedSpawnProps
    CommandPipeline: CommandPipelineProps
    
    // Control components
    Exit: ExitProps
  }
  
  export interface TextProps {
    children?: string | number | boolean | null | undefined
    style?: Style
    color?: keyof typeof Colors
    bold?: boolean
    italic?: boolean
    underline?: boolean
    faint?: boolean
  }
  
  export interface StackProps {
    children?: JSX.Element | JSX.Element[] | string | (JSX.Element | string | null | undefined | false)[]
    gap?: number
    align?: "start" | "center" | "end"
    justify?: "start" | "center" | "end" | "between" | "around"
  }
  
  export interface PanelProps {
    children?: JSX.Element | JSX.Element[]
    title?: string
    border?: "single" | "double" | "rounded" | "thick"
    padding?: number
    width?: number
    height?: number
  }
  
  export interface ButtonProps extends TextProps {
    onClick?: () => void
    variant?: "primary" | "secondary" | "success" | "danger"
    disabled?: boolean
  }
  
  export interface ListProps {
    items: Array<{ id: string; label: string | JSX.Element }>
    selected?: number
    onSelect?: (index: number) => void
  }
  
  export interface InputProps {
    value?: string
    placeholder?: string
    onChange?: (value: string) => void
    type?: "text" | "password"
    'bind:value'?: BindableRune<string> | StateRune<string>
  }
  
  // Support bind: syntax on all intrinsic elements
  export interface RegisterPluginProps {
    plugin: any // JSXPlugin
    as?: string
    alias?: string
    prefix?: string
    enabled?: boolean
    config?: Record<string, any>
  }
  
  export interface EnablePluginProps {
    name: string
    enabled?: boolean
    config?: Record<string, any>
  }
  
  export interface ConfigurePluginProps {
    name: string
    config: Record<string, any>
  }
  
  export interface CLIProps {
    name: string
    alias?: string
    description?: string
    version?: string
    children?: JSX.Element | JSX.Element[]
  }
  
  export interface PluginProps {
    name: string
    description?: string
    version?: string
    children?: JSX.Element | JSX.Element[]
  }
  
  export interface LoadPluginProps {
    from: any // The plugin component or module
    name?: string // Optional rename
    description?: string
    version?: string
  }
  
  export interface CommandProps {
    name?: string  // Made optional for handler-only commands
    description?: string
    aliases?: string[]
    hidden?: boolean
    handler?: (ctx: any) => JSX.Element | Promise<JSX.Element>  // Restored for compatibility
    children?: JSX.Element | JSX.Element[]
    interactive?: boolean | ((ctx: any) => boolean)
    // Schema-based alternatives to individual <Arg>/<Flag> components
    args?: Record<string, {
      description: string
      required?: boolean
      type?: 'string' | 'number' | 'boolean'
      choices?: string[]
      default?: any
    }>
    flags?: Record<string, {
      description: string
      alias?: string
      type?: 'string' | 'number' | 'boolean'
      default?: any
      choices?: string[]
    }>
  }
  
  export interface ArgProps {
    name: string
    description: string
    required?: boolean
    type?: 'string' | 'number' | 'boolean'
    choices?: string[]
    default?: any
  }
  
  export interface FlagProps {
    name: string
    description: string
    alias?: string
    type?: 'string' | 'number' | 'boolean'
    default?: any
    choices?: string[]
  }
  
  export interface HelpProps {
    children?: string | JSX.Element | JSX.Element[]
  }
  
  export interface ExampleProps {
    children?: string
    description?: string
  }
  
  export interface StreamProps<A> {
    stream: any // Stream.Stream<A, any, any>
    children?: (item: A) => JSX.Element | string
    transform?: (item: A) => string | JSX.Element
    maxItems?: number
    itemStyle?: Style
    separator?: JSX.Element | string
    placeholder?: JSX.Element | string
    onError?: (error: any) => JSX.Element | string
    onComplete?: () => void
    autoScroll?: boolean
    buffer?: 'none' | 'sliding' | 'dropping' | 'unbounded'
    bufferSize?: number
  }
  
  export interface PipeProps<A, B> {
    from: any // Stream.Stream<A, any, any>
    through: (value: A) => B | any // Effect.Effect<B, any, any>
    children: (stream: any) => JSX.Element
    onError?: (error: any) => void
    concurrency?: number
  }
  
  export interface TransformProps<T> {
    stream: any // Stream.Stream<T, any, any>
    transforms: Array<{
      name?: string
      fn: (stream: any) => any
    }>
    children: (stream: any) => JSX.Element
    showPipeline?: boolean
  }
  
  export interface StreamBoxProps<A> extends StreamProps<A> {
    title?: string
    border?: 'single' | 'double' | 'rounded' | 'thick'
    padding?: number
    width?: number
    height?: number
    boxStyle?: Style
  }
  
  export interface SpawnProps {
    command: string | string[]
    cwd?: string
    env?: Record<string, string>
    stdout?: 'stream' | 'buffer' | 'ignore' | ((stream: any) => JSX.Element)
    stderr?: 'stream' | 'buffer' | 'ignore' | 'merge' | ((stream: any) => JSX.Element)
    stdin?: string | any | 'inherit'
    shell?: boolean | string
    children?: (props: {
      stdout: any
      stderr: any
      exitCode: Promise<number>
      process: any
    }) => JSX.Element
    onExit?: (code: number) => void
    onError?: (error: any) => JSX.Element | string
    autoRestart?: boolean
    restartDelay?: number
    maxRestarts?: number
    managed?: boolean
    processName?: string
    processGroup?: string
    lineBuffer?: boolean
    encoding?: 'utf8' | 'buffer'
    stdoutStyle?: any
    stderrStyle?: any
  }
  
  export interface ManagedSpawnProps extends SpawnProps {
    processManager?: any
    processConfig?: {
      autorestart?: boolean
      group?: string
      logPreset?: string
      healthCheck?: {
        pattern: string
        timeout: number
      }
    }
  }
  
  export interface CommandPipelineProps {
    commands: Array<{
      command: string | string[]
      env?: Record<string, string>
      transform?: (stream: any) => any
    }>
    children?: (output: any) => JSX.Element
    onError?: (error: any, commandIndex: number) => JSX.Element
    showPipeline?: boolean
  }
  
  export interface ExitProps {
    code?: number
    message?: string | JSX.Element
    children?: string | JSX.Element
  }
  
  export interface IntrinsicAttributes {
    [key: `bind:${string}`]: BindableRune<unknown> | StateRune<unknown>
  }
}

// Helper to flatten and filter children
function normalizeChildren(children: unknown): View[] {
  if (!children) return []
  
  const flatten = (arr: unknown[]): unknown[] => {
    return arr.reduce((flat: unknown[], item: unknown) => {
      if (Array.isArray(item)) {
        return flat.concat(flatten(item))
      }
      if (item === null || item === undefined || item === false || item === true) {
        return flat
      }
      return flat.concat(item)
    }, [])
  }
  
  const normalized = Array.isArray(children) ? flatten(children) : [children]
  
  return normalized.map(child => {
    if (typeof child === 'string' || typeof child === 'number') {
      return text(String(child))
    }
    // ✅ Enhanced object handling for complex nested JSX
    if (child && typeof child === 'object' && 'render' in child) {
      return child
    }
    // If it's a JSX element that hasn't been processed yet, process it
    // This happens when JSX elements are passed as children
    if (child && typeof child === 'object' && !('render' in child)) {
      // This is likely an unprocessed JSX element, but since we're in normalizeChildren,
      // it should already be processed. Just return it as-is for now.
      return child
    }
    // Fallback for complex objects - convert to string gracefully
    if (child && typeof child === 'object') {
      return text(String(child))
    }
    return child
  })
}

// Create text with style
function createStyledText(content: string, styleBuilder: Style): View {
  return styledText(content, styleBuilder)
}

/**
 * Process bind: props for two-way data binding
 */
function processBindProps(props: Record<string, unknown>): Record<string, unknown> {
  if (!props) return props
  
  const processed = { ...props }
  
  for (const [key, value] of Object.entries(props)) {
    if (key.startsWith('bind:')) {
      const bindProp = key.slice(5) // Remove 'bind:' prefix
      const capitalizedProp = bindProp.charAt(0).toUpperCase() + bindProp.slice(1)
      delete processed[key]
      
      if (isBindableRune(value) || isStateRune(value)) {
        // It's a rune - set up two-way binding
        processed[bindProp] = value() // Current value
        processed[`on${capitalizedProp}Change`] = (newValue: unknown) => {
          value.$set(newValue)
        }
        
        // If it's bindable, we can also pass the rune itself for advanced use
        if (isBindableRune(value)) {
          processed[`${bindProp}Rune`] = value
        }
      } else {
        // It's a regular variable - just pass the value
        // (can't do two-way binding without a rune)
        processed[bindProp] = value
      }
    }
  }
  
  return processed
}

// JSX Factory function
export function jsx(
  type: string | Function,
  props: Record<string, unknown> | null,
  key?: string
): JSX.Element {
  // Debug what element types we're processing
  debug(`[RUNTIME] Processing element type: ${type}`, { props: props ? Object.keys(props) : null, key })
  if (type === 'Plugin' && DEBUG) {
    debug(`[RUNTIME] 🎯 Plugin element detected! Props:`, props)
  }
  
  // Process bind: props before anything else
  const processedProps = processBindProps(props)
  
  // Handle function components
  if (typeof type === 'function') {
    const result = type(processedProps || {})
    // If the function component returns another jsx element that needs processing,
    // we should process it. But since function components should return View objects,
    // this result should already be processed. Just return it.
    return result
  }
  
  const { children, ...restProps } = processedProps || {}
  
  // Handle intrinsic elements
  switch (type) {
    // Text elements
    case 'text':
    case 'span': {
      // Handle children array properly
      let content = ''
      if (Array.isArray(children)) {
        content = children.join('')
      } else if (children != null && typeof children !== 'boolean') {
        content = String(children)
      }
      
      let textStyle = restProps.style || style()
      
      if (restProps.color) {
        textStyle = textStyle.foreground(Colors[restProps.color])
      }
      if (restProps.bold) textStyle = textStyle.bold()
      if (restProps.italic) textStyle = textStyle.italic()
      if (restProps.underline) textStyle = textStyle.underline()
      if (restProps.faint) textStyle = textStyle.faint()
      
      const result = content ? createStyledText(content, textStyle) : text('')
      
      // If we're inside a command context and have non-empty content, track it
      if (content && pluginRegistry.commandStack.length > 0) {
        pluginRegistry.addRenderableContent(result)
      }
      
      return result
    }
    
    // Layout elements
    case 'vstack':
    case 'div': {
      const views = normalizeChildren(children)
      const result = views.length === 0 ? text('') : vstack(...views)
      
      // If we're inside a command context and have content, track it
      if (views.length > 0 && pluginRegistry.commandStack.length > 0) {
        pluginRegistry.addRenderableContent(result)
      }
      
      return result
    }
    
    case 'hstack': {
      const views = normalizeChildren(children)
      const result = views.length === 0 ? text('') : hstack(...views)
      
      // If we're inside a command context and have content, track it
      if (views.length > 0 && pluginRegistry.commandStack.length > 0) {
        pluginRegistry.addRenderableContent(result)
      }
      
      return result
    }
    
    // Styled text shortcuts
    case 'bold': {
      const content = Array.isArray(children) ? children.join('') : String(children || '')
      return createStyledText(content, style().bold())
    }
    
    case 'italic': {
      const content = Array.isArray(children) ? children.join('') : String(children || '')
      return createStyledText(content, style().italic())
    }
    
    case 'underline': {
      const content = Array.isArray(children) ? children.join('') : String(children || '')
      return createStyledText(content, style().underline())
    }
    
    case 'faint': {
      const content = Array.isArray(children) ? children.join('') : String(children || '')
      return createStyledText(content, style().faint())
    }
    
    // Color shortcuts
    case 'red':
    case 'green':
    case 'blue':
    case 'yellow':
    case 'cyan':
    case 'magenta':
    case 'white':
    case 'gray': {
      const content = Array.isArray(children) ? children.join('') : String(children || '')
      const color = Colors[type as keyof typeof Colors]
      return createStyledText(content, style().foreground(color))
    }
    
    // Semantic elements
    case 'error':
    case 'success':
    case 'warning':
    case 'info': {
      const content = Array.isArray(children) ? children.join('') : String(children || '')
      const colorMap = {
        error: Colors.red,
        success: Colors.green,
        warning: Colors.yellow,
        info: Colors.blue
      }
      return createStyledText(content, style().foreground(colorMap[type as keyof typeof colorMap]).bold())
    }
    
    // Plugin registration components
    case 'RegisterPlugin': {
      if (restProps.plugin) {
        pluginRegistry.register(restProps.plugin, {
          as: restProps.as,
          alias: restProps.alias,
          prefix: restProps.prefix,
          enabled: restProps.enabled,
          config: restProps.config
        })
      }
      return text('') // Invisible component
    }
    
    // CLI component - top-level CLI configuration
    case 'CLI': {
      debug(`CLI component: name='${restProps.name}', version='${restProps.version}'`)
      
      // Store CLI configuration globally
      if (restProps.name) {
        pluginRegistry.setCLIConfig({
          name: restProps.name,
          alias: restProps.alias,
          description: restProps.description,
          version: restProps.version
        })
        
        // Initialize configuration system
        const configPromise = initializeConfig(restProps.name)
        configPromise.catch(error => {
          console.warn(`Warning: Failed to initialize config: ${error.message}`)
        })
      }
      
      // Process children normally
      const childViews = normalizeChildren(children)
      
      return text('') // Invisible component
    }
    
    // LoadPlugin component - load a plugin with optional renaming
    case 'LoadPlugin': {
      debug(`LoadPlugin component: from=${restProps.from}, name='${restProps.name}'`)
      
      if (!restProps.from) {
        throw new Error('LoadPlugin requires a "from" prop specifying the plugin to load')
      }
      
      // If the plugin is a function component, render it with props
      if (typeof restProps.from === 'function') {
        const pluginElement = restProps.from({ 
          name: restProps.name,
          description: restProps.description,
          version: restProps.version
        })
        
        // Process the returned element
        if (pluginElement && typeof pluginElement === 'object') {
          return pluginElement
        }
      }
      
      return text('') // Invisible component
    }
    
    // Declarative plugin definition components
    case 'Plugin': {
      debug(`Starting plugin registration for: '${restProps.name}'`)
      
      // Start the plugin FIRST - this sets it as the current plugin for command registration
      const plugin = pluginRegistry.startPlugin(restProps.name, restProps.description, restProps.version)
      
      // Plugin JSX elements are processed by collecting their Command children
      // The command hierarchy is built automatically from the JSX structure
      
      // Process children - they should now be View objects, not JSX elements
      const childViews = normalizeChildren(children)
      
      // After processing, finalize the plugin
      pluginRegistry.finalizePlugin()
      
      debug(`Plugin '${restProps.name}' registered with commands:`, Object.keys(plugin.commands))
      debug(`Total registered plugins:`, pluginRegistry.getAllEnabled().length)
      
      return text('') // Invisible component
    }
    
    case 'Command': {
      debug(`Command element: ${restProps.name}, has handler: ${!!restProps.handler}`)
      
      // Start command on the stack for flag/arg registration
      const command = pluginRegistry.startCommand(restProps.name, {
        description: restProps.description,
        aliases: restProps.aliases,
        hidden: restProps.hidden,
        handler: restProps.handler,
        interactive: restProps.interactive
      })
      
      // Process schema-based args if provided
      if (restProps.args) {
        for (const [argName, argConfig] of Object.entries(restProps.args)) {
          pluginRegistry.addArg(argName, argConfig)
        }
      }
      
      // Process schema-based flags if provided  
      if (restProps.flags) {
        for (const [flagName, flagConfig] of Object.entries(restProps.flags)) {
          pluginRegistry.addFlag(flagName, flagConfig)
        }
      }
      
      // Process children - will register flags/args and renderable content
      // Children will be processed with this command on the stack as their parent
      const childViews = normalizeChildren(children)
      
      // End the command - this will finalize it and register for hierarchy building
      const finalCommand = pluginRegistry.endCommand()
      
      debug(`Ended command: ${restProps.name}, has handler: ${!!finalCommand?.handler}`)
      
      return text('') // Invisible component
    }
    
    case 'Arg': {
      pluginRegistry.addArg(restProps.name, {
        description: restProps.description,
        required: restProps.required,
        type: restProps.type,
        choices: restProps.choices,
        default: restProps.default
      })
      return text('') // Invisible component
    }
    
    case 'Flag': {
      pluginRegistry.addFlag(restProps.name, {
        description: restProps.description,
        alias: restProps.alias,
        type: restProps.type,
        default: restProps.default,
        choices: restProps.choices
      })
      return text('') // Invisible component
    }
    
    case 'Help': {
      if (typeof children === 'string') {
        pluginRegistry.addHelp(children)
      }
      return text('') // Invisible component
    }
    
    case 'Example': {
      if (typeof children === 'string') {
        pluginRegistry.addExample(children, restProps.description)
      }
      return text('') // Invisible component
    }
    
    case 'EnablePlugin': {
      if (restProps.name) {
        pluginRegistry.enable(restProps.name, restProps.enabled !== false)
        if (restProps.config) {
          pluginRegistry.configure(restProps.name, restProps.config)
        }
      }
      return text('') // Invisible component
    }
    
    case 'ConfigurePlugin': {
      if (restProps.name && restProps.config) {
        pluginRegistry.configure(restProps.name, restProps.config)
      }
      return text('') // Invisible component
    }
    
    // Stream components
    case 'Stream':
    case 'Pipe':
    case 'Transform':
    case 'StreamBox': {
      // Lazy import to avoid circular dependencies
      const StreamComponents = require('@tuix/components/streams')
      const Component = StreamComponents[type + 'Component']
      return Component(restProps)
    }
    
    // Spawn components
    case 'Spawn':
    case 'ManagedSpawn':
    case 'CommandPipeline': {
      // Lazy import to avoid circular dependencies
      const SpawnComponents = require('@tuix/components/streams/spawn')
      const Component = SpawnComponents[type + 'Component']
      return Component(restProps)
    }
    
    // Control components
    case 'Exit': {
      const { ExitComponent } = require('@tuix/components/Exit')
      return ExitComponent(restProps)
    }
    
    // Components (these would need to be imported and implemented)
    case 'panel': {
      // Lazy import to avoid circular dependencies
      const { Panel } = require('@tuix/components/builders/Panel')
      const views = normalizeChildren(children)
      return Panel(views.length === 1 ? views[0] : vstack(...views), restProps)
    }
    
    case 'button': {
      const { Button, PrimaryButton, SecondaryButton, SuccessButton, DangerButton } = require('@tuix/components/builders/Button')
      const content = String(children || '')
      
      switch (restProps.variant) {
        case 'primary':
          return PrimaryButton(content, restProps)
        case 'secondary':
          return SecondaryButton(content, restProps)
        case 'success':
          return SuccessButton(content, restProps)
        case 'danger':
          return DangerButton(content, restProps)
        default:
          return Button(content, restProps)
      }
    }
    
    default:
      // Unknown element type - return a text element as fallback
      console.warn(`Unknown JSX element type: ${type}, falling back to text`)
      
      let content = ''
      if (Array.isArray(children)) {
        content = children.join('')
      } else if (children != null) {
        content = String(children)
      }
      
      return text(content)
  }
}

// JSX Fragment
export function Fragment(props: { children?: unknown }): JSX.Element {
  const views = normalizeChildren(props.children)
  return views.length === 0 ? text('') : vstack(...views)
}

// Automatic runtime exports (for React 17+ JSX transform)
export { jsx as jsxs, jsx as jsxDEV }

// Classic runtime exports
export function createElement(
  type: string | Function,
  props: Record<string, unknown> | null,
  ...children: unknown[]
): JSX.Element {
  return jsx(type, { ...props, children: children.length === 1 ? children[0] : children })
}

// Export the plugin registry for use in jsx-app
export { pluginRegistry }

// Helper function to process JSX elements for side effects (plugin registration)
export function processJSXForSideEffects(element: JSX.Element): void {
  // Process the JSX element tree to trigger side effects like plugin registration
  // This is needed when we want to register plugins without actually rendering
  if (!element) return
  
  // If it's already a processed View, skip
  if (typeof element === 'object' && 'render' in element) {
    return
  }
  
  // Force processing by accessing the element
  // The jsx runtime should have already processed this when jsx() was called
  // But we can ensure children are processed
  if (typeof element === 'object' && element !== null) {
    // The element should already be processed by jsx() factory function
    // This just ensures any nested processing happens
  }
}

// Import Effect for JSX component integration
import { Effect, FiberRef } from "effect"
import { InteractiveFiberRef } from "@tuix/core"

// Import runes for JSX context integration
import { $state, $bindable, $derived, $effect } from "@tuix/reactive"

// JSX Context Helpers - Available in JSX components for state and parent access
export const JSXContext = {
  /**
   * Get the current component's parent context
   */
  getParent(): any {
    return pluginRegistry.getParentContext()
  },
  
  /**
   * Get the current context data
   */
  getCurrent(): any {
    return pluginRegistry.getCurrentContext()
  },
  
  /**
   * Get state from current or parent scope
   */
  getState<T>(key: string, defaultValue?: T): T | undefined {
    return pluginRegistry.getScopedState(key, defaultValue)
  },
  
  /**
   * Set state in current scope
   */
  setState<T>(key: string, value: T): void {
    pluginRegistry.setScopedState(key, value)
  },
  
  /**
   * Check if we're inside a command context
   */
  isInCommand(): boolean {
    return pluginRegistry.commandStack.length > 0
  },
  
  /**
   * Get current command data if inside a command
   */
  getCurrentCommand(): any {
    return pluginRegistry.commandStack[pluginRegistry.commandStack.length - 1]
  },
  
  /**
   * Effect integration - run an Effect within JSX component
   * Returns a promise for the result
   */
  runEffect<A, E = never, R = never>(effect: Effect.Effect<A, E, R>): Promise<A> {
    return Effect.runPromise(effect)
  },
  
  /**
   * Check if we're in interactive mode (from Effect context)
   */
  async isInteractive(): Promise<boolean> {
    return Effect.runPromise(FiberRef.get(InteractiveFiberRef))
  },
  
  /**
   * Create a self-referencing component wrapper
   * Provides access to its own context and effect capabilities plus runes
   */
  createComponent<P extends Record<string, any>>(
    name: string,
    component: (props: P, context: {
      self: any
      parent: any
      state: {
        get<T>(key: string, defaultValue?: T): T | undefined
        set<T>(key: string, value: T): void
      }
      runEffect: <A, E, R>(effect: Effect.Effect<A, E, R>) => Promise<A>
      isInteractive: () => Promise<boolean>
      // Svelte 5-style runes
      $state: typeof $state
      $bindable: typeof $bindable
      $derived: typeof $derived
      $effect: typeof $effect
    }) => JSX.Element
  ) {
    return function(props: P): JSX.Element {
      // Push component context
      const context = pluginRegistry.pushContext('component', name, { props })
      
      try {
        return component(props, {
          self: context,
          parent: context.parent,
          state: {
            get: <T>(key: string, defaultValue?: T) => 
              pluginRegistry.getScopedState(key, defaultValue),
            set: <T>(key: string, value: T) => 
              pluginRegistry.setScopedState(key, value)
          },
          runEffect: <A, E, R>(effect: Effect.Effect<A, E, R>) => 
            Effect.runPromise(effect),
          isInteractive: () => 
            Effect.runPromise(FiberRef.get(InteractiveFiberRef)),
          // Provide runes directly in context
          $state,
          $bindable,
          $derived,
          $effect
        })
      } finally {
        // Pop component context
        pluginRegistry.popContext()
      }
    }
  },
  
  // Direct runes access for JSX
  $state,
  $bindable,
  $derived,
  $effect
}