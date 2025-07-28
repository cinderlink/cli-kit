/**
 * Store Adapter
 *
 * Provides backward-compatible store interfaces that delegate to MVU model
 */

import { Effect } from 'effect'
import type { AppModel, AppMsg } from './model'
import type { CLIAppOptions } from '@cli/jsx/app'
import type { JSXCommandContext } from '@cli/jsx/types'
import type { Plugin } from '@cli/plugin'
import { scopeManager } from '@core/model/scope/manager'
import type { ScopeDef } from '@core/model/scope/types'

// Store context that holds model and dispatch
interface StoreContext {
  getModel: () => AppModel
  dispatch: (msg: AppMsg) => void
}

/**
 * CLI Store Adapter
 * Provides backward-compatible interface for cliStore
 */
export class CLIStoreAdapter {
  constructor(private context: StoreContext) {}

  get config() {
    return this.context.getModel().cli.config
  }

  get name() {
    return this.context.getModel().cli.config.name || 'CLI Application'
  }

  get version() {
    return this.context.getModel().cli.config.version || '0.0.0'
  }

  get description() {
    return this.context.getModel().cli.config.description || ''
  }

  get isRunning() {
    return this.context.getModel().cli.isRunning
  }

  get exitCode() {
    return this.context.getModel().cli.exitCode
  }

  setConfig(config: CLIAppOptions) {
    this.context.dispatch({ type: 'SetCLIConfig', config })
  }

  start() {
    this.context.dispatch({ type: 'StartCLI' })
  }

  stop(code: number = 0) {
    this.context.dispatch({ type: 'StopCLI', exitCode: code })
  }

  reset() {
    this.context.dispatch({ type: 'ResetCLI' })
  }
}

/**
 * Command Store Adapter
 * Provides backward-compatible interface for commandStore
 */
export class CommandStoreAdapter {
  constructor(private context: StoreContext) {}

  get currentPath() {
    return this.context.getModel().commands.activePath
  }

  get context() {
    return this.context.getModel().commands.context
  }

  get availableCommands() {
    const path = this.currentPath
    const currentScope = this.getScopeByPath(path)
    if (!currentScope) return []

    return scopeManager
      .getChildScopes(currentScope.id)
      .filter(child => child.executable && (child.type === 'command' || child.type === 'plugin'))
  }

  get activeCommand() {
    const path = this.currentPath
    return this.getScopeByPath(path)
  }

  setCommandPath(path: string[]): Effect.Effect<void, Error> {
    return Effect.gen(function* () {
      // Find scope for this path
      const scope = yield* Effect.fromNullable(
        this.getScopeByPath(path),
        () => new Error(`No command found at path: ${path.join(' ')}`)
      )

      // Dispatch the message
      this.context.dispatch({ type: 'SetCommandPath', path })

      // Activate the scope
      yield* scopeManager.activateScope(scope.id)
    }).bind(this)
  }

  executeCommand(
    path: string[],
    context: JSXCommandContext
  ): Effect.Effect<JSX.Element | null, Error> {
    return Effect.gen(function* () {
      // Dispatch the execute message
      this.context.dispatch({ type: 'ExecuteCommand', path, context })

      // Get the command scope
      const scope = yield* Effect.fromNullable(
        this.getScopeByPath(path),
        () => new Error(`Command not found: ${path.join(' ')}`)
      )

      // Execute the handler if it exists
      if (scope.handler) {
        const result = yield* Effect.promise(() => Promise.resolve(scope.handler!(context)))
        return result
      }

      return null
    }).bind(this)
  }

  getScopeByPath(path: string[]): ScopeDef | undefined {
    const allScopes = scopeManager.getAllScopes()

    return allScopes.find(
      scope =>
        scope.path.length === path.length && scope.path.every((segment, i) => segment === path[i])
    )
  }

  getCommandByPath(path: string[]): ScopeDef | undefined {
    const scope = this.getScopeByPath(path)
    return scope?.executable ? scope : undefined
  }

  commandExists(path: string[]): boolean {
    return !!this.getCommandByPath(path)
  }

  getSubcommands(path: string[]): ScopeDef[] {
    const parentScope = this.getScopeByPath(path)
    if (!parentScope) return []

    return scopeManager
      .getChildScopes(parentScope.id)
      .filter(child => child.executable && (child.type === 'command' || child.type === 'plugin'))
  }

  getCLIScope(): ScopeDef | undefined {
    return scopeManager.getAllScopes().find(scope => scope.type === 'cli')
  }

  resetContext() {
    this.context.dispatch({ type: 'ResetCommandContext' })
  }

  getHelpScope(path: string[]): ScopeDef | undefined {
    const parentScope = this.getScopeByPath(path)
    if (!parentScope) return undefined

    return scopeManager.getChildScopes(parentScope.id).find(child => child.type === 'help')
  }

  isHelpRequested(): boolean {
    const path = this.currentPath
    return path.length > 0 && path[path.length - 1] === 'help'
  }

  subscribe(callback: (store: this) => void): () => void {
    // This is a simple polling implementation
    // In a real app, you'd use proper subscriptions
    let unsubscribed = false

    const poll = () => {
      if (!unsubscribed) {
        callback(this)
        setTimeout(poll, 16) // ~60fps
      }
    }

    poll()

    return () => {
      unsubscribed = true
    }
  }
}

/**
 * Plugin Store Adapter
 * Provides backward-compatible interface for pluginStore
 */
export class PluginStoreAdapter {
  constructor(private context: StoreContext) {}

  private get plugins() {
    return this.context.getModel().plugins.plugins
  }

  private get options() {
    const model = this.context.getModel().plugins
    return {
      autoEnable: model.autoEnable,
      validateDependencies: model.validateDependencies,
      allowDuplicates: false, // Always false in new system
    }
  }

  getOptions() {
    return { ...this.options }
  }

  add(plugin: Plugin, config?: Record<string, unknown>) {
    this.context.dispatch({ type: 'RegisterPlugin', plugin, config })

    // Return the registered plugin if successful
    const registered = this.plugins.get(plugin.metadata.name)
    return registered || null
  }

  get(name: string) {
    return this.plugins.get(name)
  }

  getAll() {
    return Array.from(this.plugins.values())
  }

  getAllNames() {
    return Array.from(this.plugins.keys())
  }

  has(name: string) {
    return this.plugins.has(name)
  }

  remove(name: string) {
    this.context.dispatch({ type: 'UnregisterPlugin', name })
    return !this.plugins.has(name)
  }

  enable(name: string) {
    this.context.dispatch({ type: 'EnablePlugin', name })
    return true
  }

  disable(name: string) {
    this.context.dispatch({ type: 'DisablePlugin', name })
    return true
  }

  isEnabled(name: string) {
    const plugin = this.plugins.get(name)
    return plugin?.enabled ?? false
  }

  getEnabled() {
    return this.getAll().filter(p => p.enabled)
  }

  getDisabled() {
    return this.getAll().filter(p => !p.enabled)
  }

  setConfig(name: string, config: Record<string, unknown>) {
    this.context.dispatch({ type: 'ConfigurePlugin', name, config })
  }

  getConfig(name: string) {
    const plugin = this.plugins.get(name)
    return plugin?.config
  }

  getDependencies(name: string) {
    const plugin = this.plugins.get(name)
    return plugin?.dependencies ?? []
  }

  getDependents(name: string) {
    const plugin = this.plugins.get(name)
    return plugin?.dependents ?? []
  }

  validateDependencies(name: string) {
    const plugin = this.plugins.get(name)
    if (!plugin) return false

    return plugin.dependencies.every(dep => this.plugins.has(dep))
  }

  clear() {
    // Remove all plugins one by one
    this.getAllNames().forEach(name => this.remove(name))
  }
}
