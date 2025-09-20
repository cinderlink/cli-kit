import { z } from "zod"

export type CommandOptionsSchema = Record<string, z.ZodTypeAny>
export type CommandArgumentsSchema = z.ZodTuple<[z.ZodTypeAny, ...z.ZodTypeAny[]]> | z.ZodObject<any> | undefined

export interface CommandExecutionContext {
  readonly commandPath: readonly string[]
  readonly options: Record<string, unknown>
  readonly args: unknown
  readonly raw: {
    readonly argv: readonly string[]
  }
  readonly config: CLIConfig
  readonly cli: CLIInstance
}

export type CommandResult = void | string | Promise<void | string>

export type CommandHandler = (context: CommandExecutionContext) => CommandResult

export interface CommandConfig {
  readonly description?: string
  readonly summary?: string
  readonly options?: CommandOptionsSchema
  readonly args?: CommandArgumentsSchema
  readonly examples?: readonly string[]
  readonly handler: CommandHandler
  readonly hidden?: boolean
}

export interface CommandMap {
  readonly [name: string]: CommandConfig | NestedCommandGroup
}

export interface NestedCommandGroup {
  readonly description?: string
  readonly commands: CommandMap
}

export interface CLIHooks {
  readonly beforeCommand?: (info: CommandExecutionContext) => Promise<void> | void
  readonly afterCommand?: (info: CommandExecutionContext, result: string | void) => Promise<void> | void
  readonly onError?: (error: unknown, info: CommandExecutionContext) => Promise<void> | void
}

export interface CLIPlugin {
  readonly name: string
  readonly version?: string
  readonly commands?: CommandMap
  readonly hooks?: CLIHooks
}

export interface CLISettings {
  readonly colors?: boolean
  readonly interactive?: boolean
  readonly output?: "text" | "json"
}

export interface CLIConfig {
  readonly name: string
  readonly version: string
  readonly description?: string
  readonly commands: CommandMap
  readonly options?: CommandOptionsSchema
  readonly hooks?: CLIHooks
  readonly plugins?: readonly CLIPlugin[]
  readonly settings?: CLISettings
}

export interface NormalizedCLIConfig extends CLIConfig {
  readonly options: CommandOptionsSchema
  readonly hooks: CLIHooks
  readonly plugins: readonly CLIPlugin[]
  readonly settings: CLISettings
}

export interface CLIInstance {
  readonly config: NormalizedCLIConfig
  run(argv?: readonly string[]): Promise<void>
}

export interface ParsedArgv {
  readonly argv: readonly string[]
  readonly positionals: readonly string[]
  readonly options: Record<string, unknown>
}

export interface CommandResolution {
  readonly path: readonly string[]
  readonly command: CommandConfig
}
