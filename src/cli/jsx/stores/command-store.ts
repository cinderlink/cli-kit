/**
 * Command Store
 * 
 * Manages CLI command state using Svelte 5 runes
 */

import { $state, $derived } from '../../../reactivity/runes'
import { Effect } from 'effect'
import { scopeManager } from '../../../scope/manager'
import type { ScopeDef } from '../../../scope/types'
import type { JSXCommandConfig, JSXCommandContext } from '../types'

class CommandStore {
  // State
  #commandPath = $state<string[]>([])
  #commandContext = $state<JSXCommandContext | null>(null)
  #registeredCommands = $state<Map<string, JSXCommandConfig>>(new Map())

  // Derived state
  get currentPath() {
    return this.#commandPath
  }

  get context() {
    return this.#commandContext
  }

  get availableCommands() {
    return $derived(() => {
      // Get all scopes
      const allScopes = scopeManager.getAllScopes()
      
      // Find commands at the current path level
      let currentScope: ScopeDef | undefined
      
      if (this.#commandPath.length === 0) {
        // At root - find CLI scope
        currentScope = allScopes.find(s => s.type === 'cli')
      } else {
        // Navigate to current path - match by array comparison
        currentScope = allScopes.find(s => 
          s.path.length === this.#commandPath.length &&
          s.path.every((segment, i) => segment === this.#commandPath[i]) &&
          (s.type === 'plugin' || s.type === 'command')
        )
      }
      
      if (!currentScope) return []
      
      // Get children from scope manager
      const children = scopeManager.getChildScopes(currentScope.id)
      
      // Return executable children (plugins and commands)
      return children.filter(child => 
        child.executable && (child.type === 'plugin' || child.type === 'command')
      )
    })
  }

  get hasCommands() {
    return $derived(() => this.availableCommands.length > 0)
  }

  // Methods
  setCommandPath(path: string[]) {
    this.#commandPath = path
  }

  setCommandContext(path: string[], args: Record<string, any> = {}, flags: Record<string, any> = {}) {
    this.#commandPath = path
    this.#commandContext = {
      args,
      flags,
      command: path[path.length - 1] || '',
      commandPath: path
    }
  }

  clearCommandContext() {
    this.#commandPath = []
    this.#commandContext = null
  }

  registerCommand(command: JSXCommandConfig) {
    const key = command.path?.join('/') || command.name
    this.#registeredCommands.set(key, command)
  }

  getCommandByPath(path: string[]): ScopeDef | undefined {
    const allScopes = scopeManager.getAllScopes()
    
    // Handle root case specially
    if (path.length === 0) {
      return allScopes.find(scope => scope.type === 'cli')
    }
    
    // Find exact path match
    return allScopes.find(scope => 
      scope.path.length === path.length &&
      scope.path.every((segment, i) => segment === path[i]) &&
      scope.executable &&
      (scope.type === 'command' || scope.type === 'plugin')
    )
  }

  getCommandConfig(path: string[]): JSXCommandConfig | undefined {
    const key = path.join('/')
    return this.#registeredCommands.get(key)
  }

  commandExists(path: string[]): boolean {
    return !!this.getCommandByPath(path)
  }

  getSubcommands(path: string[]): ScopeDef[] {
    const command = this.getCommandByPath(path)
    if (!command) return []
    
    // Get children from scope manager
    const children = scopeManager.getChildScopes(command.id)
    
    return children.filter(child => 
      child.executable && (child.type === 'command' || child.type === 'plugin')
    )
  }
}

// Export singleton instance
export const commandStore = new CommandStore()