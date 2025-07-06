/**
 * Core types for the CLI framework
 */

import { z } from "zod"
import type { Component } from "../core/types"

export interface CLIConfig {
  name: string
  version: string
  description?: string
  options?: Record<string, z.ZodSchema>
  commands?: Record<string, CommandConfig>
  plugins?: PluginReference[]
  hooks?: CLIHooks
  settings?: Record<string, any>
}

export interface CommandConfig {
  description: string
  options?: Record<string, z.ZodSchema>
  args?: Record<string, z.ZodSchema>
  arguments?: z.ZodSchema[] // Alternative to args
  commands?: Record<string, CommandConfig> // Subcommands
  handler?: LazyHandler | Handler
  aliases?: string[]
  hidden?: boolean
  lazy?: boolean
}

export interface LazyHandler {
  (): Promise<Handler>
  _lazy: true
  _loader?: () => Promise<{ default: Handler }>
}

export type Handler = (args: any) => Promise<Component<any, any> | void> | Component<any, any> | void

export interface CLIHooks {
  beforeCommand?: (command: string[], args: any) => Promise<void> | void
  afterCommand?: (command: string[], args: any, result: any) => Promise<void> | void
  onError?: (error: Error, command: string[], args: any) => Promise<void> | void
}

export type PluginReference = string | Plugin

export interface Plugin {
  name: string
  version: string
  description?: string
  commands?: Record<string, CommandConfig>
  extends?: Record<string, CommandExtension>
  middleware?: PluginMiddleware
  install?: () => Promise<void> | void
  uninstall?: () => Promise<void> | void
}

export interface CommandExtension {
  options?: Record<string, z.ZodSchema>
  args?: Record<string, z.ZodSchema>
  wrapper?: HandlerWrapper
}

export type HandlerWrapper = (originalHandler: Handler) => Handler

export interface PluginMiddleware {
  beforeCommand?: (command: string[], args: any) => Promise<void> | void
  afterCommand?: (command: string[], args: any, result: any) => Promise<void> | void
  onError?: (error: Error, command: string[], args: any) => Promise<void> | void
}

export interface ParsedArgs {
  command: string[]
  args: Record<string, any>
  options: Record<string, any>
  rawArgs: string[]
}

export interface CLIContext {
  config: CLIConfig
  parsedArgs: ParsedArgs
  plugins: Plugin[]
}