/**
 * Type definitions for JSX runtime
 * Defines interfaces and types used throughout the JSX system
 */

// Core View interface (copied from original codebase)
export interface View {
  render(): string
}

// Rune types (from reactivity system)
export interface BindableRune<T> {
  (): T
  $set(value: T): void
}

export interface StateRune<T> {
  (): T
  $set(value: T): void
}

// Style interface (simplified from styling system)
export interface Style {
  foreground(color: string): Style
  background(color: string): Style
  bold(): Style
  italic(): Style
  underline(): Style
  faint(): Style
}

// Colors enum (from styling system)
export const Colors = {
  red: '#ff0000',
  green: '#00ff00',
  blue: '#0000ff',
  yellow: '#ffff00',
  cyan: '#00ffff',
  magenta: '#ff00ff',
  white: '#ffffff',
  gray: '#808080',
  black: '#000000'
} as const

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
    
    // Declarative command definition components
    CLI: CLIProps
    Plugin: PluginProps
    LoadPlugin: LoadPluginProps
    Command: CommandProps
    Arg: ArgProps
    Flag: FlagProps
    Help: HelpProps
    Example: ExampleProps
    Scope: ScopeProps
    
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
  
  export interface RegisterPluginProps {
    plugin: any
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
    configName?: string
    children?: JSX.Element | JSX.Element[] | ((context: { config: any }) => JSX.Element)
  }
  
  export interface PluginProps {
    name: string
    description?: string
    version?: string
    children?: JSX.Element | JSX.Element[]
  }
  
  export interface LoadPluginProps {
    from: any
    name?: string
    description?: string
    version?: string
  }
  
  export interface CommandProps {
    name?: string
    description?: string
    aliases?: string[]
    hidden?: boolean
    handler?: (ctx: any) => JSX.Element | Promise<JSX.Element>
    children?: JSX.Element | JSX.Element[] | ((context: any) => JSX.Element)
    interactive?: boolean | ((ctx: any) => boolean)
    schema?: any
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
  
  export interface ScopeProps {
    name: string
    description?: string
    children?: JSX.Element | JSX.Element[]
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
  
  export interface ExitProps {
    code?: number
    message?: string | JSX.Element
    children?: string | JSX.Element
  }
  
  export interface IntrinsicAttributes {
    [key: `bind:${string}`]: BindableRune<unknown> | StateRune<unknown>
  }
}