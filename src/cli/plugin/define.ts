/**
 * Plugin Definition Functions
 *
 * Functions for creating and defining plugins
 */

import type { Plugin, PluginMetadata, PluginAPI, JSXPlugin, JSXCommandConfig } from './types'
import type { Command } from '@cli/types'
import { z } from 'zod'

/**
 * Define a plugin with type safety
 *
 * @example
 * ```typescript
 * const myPlugin = definePlugin({
 *   metadata: {
 *     name: 'my-plugin',
 *     version: '1.0.0'
 *   },
 *   commands: {
 *     hello: {
 *       description: 'Say hello',
 *       handler: async () => {
 *         console.log('Hello!')
 *       }
 *     }
 *   }
 * })
 * ```
 */
export function definePlugin(plugin: Plugin): Plugin {
  // Validate plugin structure
  if (!plugin.metadata?.name) {
    throw new Error('Plugin must have a name in metadata')
  }

  if (!plugin.metadata?.version) {
    throw new Error('Plugin must have a version in metadata')
  }

  // Ensure all commands have handlers
  if (plugin.commands) {
    for (const [name, command] of Object.entries(plugin.commands)) {
      if (!command.handler) {
        throw new Error(`Command '${name}' must have a handler`)
      }
    }
  }

  return plugin
}

/**
 * Create a plugin using builder pattern or direct configuration
 */
export function createPlugin(
  options: Plugin | ((api: PluginAPI) => void),
  metadata?: PluginMetadata
): Plugin {
  if (typeof options === 'function') {
    const builder = new PluginBuilder(metadata)
    options(builder)
    return builder.build()
  }

  return definePlugin(options)
}

/**
 * Plugin builder for programmatic plugin creation
 */
export class PluginBuilder implements PluginAPI {
  private plugin: Plugin

  constructor(metadata?: PluginMetadata) {
    this.plugin = {
      metadata: metadata || { name: '', version: '' },
      commands: {},
      extensions: {},
      wrappers: [],
      services: {},
    }
  }

  metadata(metadata: PluginMetadata): PluginAPI {
    this.plugin.metadata = { ...this.plugin.metadata, ...metadata }
    return this
  }

  command(name: string, command: Command): PluginAPI {
    if (!this.plugin.commands) this.plugin.commands = {}
    this.plugin.commands[name] = command
    return this
  }

  extend(commandPath: string, extension: Plugin['extensions'][string]): PluginAPI {
    if (!this.plugin.extensions) this.plugin.extensions = {}
    this.plugin.extensions[commandPath] = extension
    return this
  }

  wrapper(wrapper: Plugin['wrappers'][number]): PluginAPI {
    if (!this.plugin.wrappers) this.plugin.wrappers = []
    this.plugin.wrappers.push(wrapper)
    return this
  }

  config(schema: z.ZodSchema, defaults?: Record<string, unknown>): PluginAPI {
    this.plugin.configSchema = schema
    if (defaults) this.plugin.defaultConfig = defaults
    return this
  }

  cliConfig(config: Partial<Plugin['cliConfig']>): PluginAPI {
    this.plugin.cliConfig = { ...this.plugin.cliConfig, ...config }
    return this
  }

  service(name: string, service: unknown): PluginAPI {
    if (!this.plugin.services) this.plugin.services = {}
    this.plugin.services[name] = service
    return this
  }

  onInstall(hook: Plugin['install']): PluginAPI {
    this.plugin.install = hook
    return this
  }

  onActivate(hook: Plugin['activate']): PluginAPI {
    this.plugin.activate = hook
    return this
  }

  onDeactivate(hook: Plugin['deactivate']): PluginAPI {
    this.plugin.deactivate = hook
    return this
  }

  onUpdate(hook: Plugin['update']): PluginAPI {
    this.plugin.update = hook
    return this
  }

  onUninstall(hook: Plugin['uninstall']): PluginAPI {
    this.plugin.uninstall = hook
    return this
  }

  build(): Plugin {
    return definePlugin(this.plugin)
  }
}

/**
 * Create plugin from builder function
 */
export function createPluginFromBuilder(
  builderFn: (builder: PluginBuilder) => PluginBuilder
): Plugin
export function createPluginFromBuilder(builder: PluginBuilder): Plugin
export function createPluginFromBuilder(arg: unknown): Plugin {
  if (typeof arg === 'function') {
    const builder = new PluginBuilder()
    const result = arg(builder)
    return result.build()
  } else if (arg instanceof PluginBuilder) {
    return arg.build()
  }

  throw new Error('Invalid argument to createPluginFromBuilder')
}

/**
 * Convert JSX plugin to standard plugin format
 */
export function jsxToPlugin(jsxPlugin: JSXPlugin): Plugin {
  const plugin: Plugin = {
    metadata: {
      name: jsxPlugin.name,
      version: jsxPlugin.version || '0.0.0',
      description: jsxPlugin.description,
    },
  }

  // Convert JSX commands to standard commands
  if (jsxPlugin.commands) {
    plugin.commands = {}
    for (const [name, jsxCommand] of Object.entries(jsxPlugin.commands)) {
      plugin.commands[name] = jsxCommandToCommand(jsxCommand)
    }
  }

  // Convert lifecycle hooks
  if (jsxPlugin.onInstall) plugin.install = async () => await jsxPlugin.onInstall()
  if (jsxPlugin.onActivate) plugin.activate = async () => await jsxPlugin.onActivate()
  if (jsxPlugin.onDeactivate) plugin.deactivate = async () => await jsxPlugin.onDeactivate()

  return plugin
}

function jsxCommandToCommand(jsxCommand: JSXCommandConfig): Command {
  return {
    description: jsxCommand.description || '',
    handler: jsxCommand.handler,
    options: jsxCommand.options,
    flags: jsxCommand.flags,
    arguments: jsxCommand.arguments,
    subcommands: jsxCommand.subcommands
      ? Object.fromEntries(
          Object.entries(jsxCommand.subcommands).map(([name, sub]) => [
            name,
            jsxCommandToCommand(sub),
          ])
        )
      : undefined,
  }
}
