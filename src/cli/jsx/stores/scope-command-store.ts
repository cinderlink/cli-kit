/**
 * Scope-based Command Store
 * 
 * Replaces the old command store with a scope-system based implementation.
 * Uses the scope manager as the single source of truth for command state.
 */

import { $state, $derived } from '../../../reactivity/runes'
import { Effect } from 'effect'
import { scopeManager } from '../../../scope/manager'
import type { ScopeDef } from '../../../scope/types'
import type { JSXCommandContext } from '../types'

class ScopeCommandStore {
  // Current execution context (set when a command is executed)
  #commandContext = $state<JSXCommandContext | null>(null)

  // Derived current path from active scopes
  get currentPath() {
    return $derived(() => {
      // Get all active scopes sorted by path depth
      const activeScopes = scopeManager.getAllScopes()
        .filter(scope => scopeManager.getScopeStatus(scope.id) === 'active')
        .sort((a, b) => b.path.length - a.path.length) // Deepest first
      
      // Return the path of the deepest active scope
      return activeScopes[0]?.path || []
    })
  }

  get context() {
    return this.#commandContext
  }

  get availableCommands() {
    return $derived(() => {
      const path = this.currentPath
      
      // Find the active scope at current path
      const currentScope = this.getScopeByPath(path)
      if (!currentScope) return []
      
      // Get executable children
      return scopeManager.getChildScopes(currentScope.id)
        .filter(child => child.executable && 
          (child.type === 'command' || child.type === 'plugin'))
    })
  }

  get activeCommand() {
    return $derived(() => {
      const path = this.currentPath
      return this.getScopeByPath(path)
    })
  }

  /**
   * Set the active command path by activating the appropriate scope
   */
  setCommandPath(path: string[]): Effect.Effect<void, Error> {
    return Effect.gen(function* () {
      // Find scope for this path
      const scope = yield* Effect.fromNullable(
        this.getScopeByPath(path),
        () => new Error(`No command found at path: ${path.join(' ')}`)
      )
      
      // Activate the scope
      yield* scopeManager.activateScope(scope.id)
    }).bind(this)
  }

  /**
   * Execute a command by path with given context
   */
  executeCommand(path: string[], context: JSXCommandContext): Effect.Effect<any, Error> {
    return Effect.gen(function* () {
      // Set the context
      this.#commandContext = context
      
      // Activate the command scope
      yield* this.setCommandPath(path)
      
      // Get the command scope
      const scope = yield* Effect.fromNullable(
        this.getScopeByPath(path),
        () => new Error(`Command not found: ${path.join(' ')}`)
      )
      
      // Execute the handler if it exists
      if (scope.handler) {
        const result = yield* Effect.promise(() => 
          Promise.resolve(scope.handler!(context))
        )
        return result
      }
      
      // No handler - this might be a parent command, show help
      return null
    }).bind(this)
  }

  /**
   * Get scope by exact path match
   */
  getScopeByPath(path: string[]): ScopeDef | undefined {
    const allScopes = scopeManager.getAllScopes()
    
    return allScopes.find(scope => 
      scope.path.length === path.length &&
      scope.path.every((segment, i) => segment === path[i])
    )
  }

  /**
   * Get executable scope (command/plugin) by path
   */
  getCommandByPath(path: string[]): ScopeDef | undefined {
    const scope = this.getScopeByPath(path)
    return scope?.executable ? scope : undefined
  }

  /**
   * Check if a command exists at the given path
   */
  commandExists(path: string[]): boolean {
    return !!this.getCommandByPath(path)
  }

  /**
   * Get subcommands for a given path
   */
  getSubcommands(path: string[]): ScopeDef[] {
    const parentScope = this.getScopeByPath(path)
    if (!parentScope) return []
    
    return scopeManager.getChildScopes(parentScope.id)
      .filter(child => child.executable && 
        (child.type === 'command' || child.type === 'plugin'))
  }

  /**
   * Get CLI root scope
   */
  getCLIScope(): ScopeDef | undefined {
    return scopeManager.getAllScopes()
      .find(scope => scope.type === 'cli')
  }

  /**
   * Reset command context (typically after execution)
   */
  resetContext() {
    this.#commandContext = null
  }

  /**
   * Get the help scope for a given path
   */
  getHelpScope(path: string[]): ScopeDef | undefined {
    const parentScope = this.getScopeByPath(path)
    if (!parentScope) return undefined
    
    return scopeManager.getChildScopes(parentScope.id)
      .find(child => child.type === 'help')
  }

  /**
   * Check if help was requested for the current path
   */
  isHelpRequested(): boolean {
    const path = this.currentPath
    return path.length > 0 && path[path.length - 1] === 'help'
  }

  /**
   * Subscribe to command store changes
   */
  subscribe(callback: (store: this) => void): () => void {
    // Use effect to track derived values
    let unsubscribed = false
    
    const effect = Effect.gen(function* () {
      while (!unsubscribed) {
        callback(this)
        yield* Effect.sleep(16) // ~60fps polling
      }
    }).bind(this)
    
    Effect.runFork(effect)
    
    return () => {
      unsubscribed = true
    }
  }
}

// Export singleton instance
export const scopeCommandStore = new ScopeCommandStore()

// Export for testing
export { ScopeCommandStore }