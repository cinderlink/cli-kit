/**
 * JSX Runtime for CLI-KIT
 * 
 * Enables JSX/TSX syntax for building terminal UIs
 * Uses React JSX transform with Svelte-inspired binding support
 */

import type { View } from "@core/types"
import { text, box, vstack, hstack, styledText, isView } from "@core/view"
import { style, type Style, Colors } from "@core/terminal/ansi/styles"
import { isBindableRune, isStateRune, type BindableRune, type StateRune } from '@core/update/reactivity/runes'
import { config, templates } from "tuix/config"
import { mergeDeep } from "@config/utils"
import * as fs from "fs/promises"
import * as path from "path"
import { Effect } from "effect"
import { 
  scopeManager,
  type ScopeContext,
  type ScopeDef
} from "@core/model/scope"
import { getGlobalEventBus } from "@core/model/events/eventBus"
import { getGlobalRegistry } from "@core/runtime/module/registry"
// CLI components will be imported dynamically to avoid circular dependencies
import { Scope, ScopeContent, ScopeFallback } from "@core/model/scope/jsx/components"
import { JSXModule } from "@jsx/module"
import type { JSXPluginEvent, JSXCommandEvent } from "@jsx/events"
// import { onMount } from '../../reactivity/jsx-lifecycle' // TODO: Fix jsx-lifecycle import


import { jsxDebug } from '@core/debug'

// Debug logging that respects TUIX_DEBUG env var
const debug = jsxDebug.debug

// Global plugin registry for JSX components - now uses stores
class JSXPluginRegistry {
  // Keep private fields that aren't replaced by stores
  private declarativePlugins: Map<string, any> = new Map()
  
  // Use the global scope manager
  private scopeManager = scopeManager
  
  // Track current scope context
  private currentScopeId: string | null = null
  private scopeIdStack: string[] = []
  
  // JSX Module integration
  private jsxModule: JSXModule | null = null
  
  
  // Command context for proper JSX evaluation
  private activeCommand: {
    path: string[]  // e.g., ['dev'] or ['dev', 'start']
    args: Record<string, any>
    flags: Record<string, any>
  } | null = null
  
  // Global config manager
  private configManager: any = null
  
  constructor() {
    // Initialize JSX module if available
    this.initializeJSXModule()
  }
  
  private initializeJSXModule() {
    try {
      const registry = getGlobalRegistry()
      this.jsxModule = registry.getModule<JSXModule>('jsx')
      
      if (this.jsxModule) {
        debug('JSX Module found and initialized')
      }
    } catch (error) {
      debug('JSX Module not available yet:', error)
    }
  }
  
  // Helper to get current scope
  private getCurrentScope(): ScopeDef | null {
    if (!this.currentScopeId) return null
    return this.scopeManager.getScopeDef(this.currentScopeId)
  }
  
  // Helper to push scope
  private pushScope(scope: ScopeDef): void {
    if (this.currentScopeId) {
      this.scopeIdStack.push(this.currentScopeId)
    }
    this.currentScopeId = scope.id
    Effect.runSync(this.scopeManager.registerScope(scope))
  }
  
  // Helper to pop scope
  private popScope(): ScopeDef | null {
    const current = this.getCurrentScope()
    if (this.scopeIdStack.length > 0) {
      this.currentScopeId = this.scopeIdStack.pop()!
    } else {
      this.currentScopeId = null
    }
    return current
  }
  
  // --- Plugin Store Integration (declarative) ---
  
  /**
   * Register a declarative plugin component
   * This is for JSX-based plugins, not loaded plugins
   */
  registerDeclarativePlugin(name: string, component: any, metadata?: any) {
    debug('Registering declarative plugin:', name)
    
    // Store the plugin component
    this.declarativePlugins.set(name, {
      component,
      metadata: metadata || {},
      registeredAt: new Date()
    })
    
    // Create and register plugin scope
    const pluginScope: ScopeDef = {
      id: `plugin_${name}_${Date.now()}`,
      type: 'plugin',
      name,
      path: [name],
      description: metadata?.description,
      executable: true,
      metadata,
      children: []
    }
    
    this.pushScope(pluginScope)
    
    // Emit plugin event if JSX module is available
    if (this.jsxModule) {
      Effect.runSync(
        this.jsxModule.emitPluginStart(name, pluginScope as ScopeContext)
      )
    }
    
    return name
  }
  
  /**
   * Unregister a declarative plugin
   */
  unregisterDeclarativePlugin(name: string) {
    debug('Unregistering declarative plugin:', name)
    
    // Find and remove the plugin scope
    const allScopes = this.scopeManager.getAllScopes()
    const pluginScope = allScopes.find(s => s.type === 'plugin' && s.name === name)
    
    if (pluginScope) {
      Effect.runSync(this.scopeManager.removeScope(pluginScope.id))
    }
    
    // Remove from declarative plugins
    this.declarativePlugins.delete(name)
    
    // Pop scope if it's current
    if (this.currentScopeId === pluginScope?.id) {
      this.popScope()
    }
    
    // Emit plugin end event
    if (this.jsxModule && pluginScope) {
      Effect.runSync(
        this.jsxModule.emitPluginEnd(name)
      )
    }
  }
  
  /**
   * Get a declarative plugin by name
   */
  getDeclarativePlugin(name: string): any {
    return this.declarativePlugins.get(name)
  }
  
  /**
   * List all declarative plugins
   */
  listDeclarativePlugins(): string[] {
    return Array.from(this.declarativePlugins.keys())
  }
  
  /**
   * Check if a declarative plugin exists
   */
  hasDeclarativePlugin(name: string): boolean {
    return this.declarativePlugins.has(name)
  }
  
  // --- Plugin Registry Integration (loaded plugins) ---
  
  /**
   * Register a loaded plugin (from file system)
   */
  registerPlugin(name: string, plugin: any, description?: string, version?: string) {
    debug('Registering loaded plugin:', name)
    
    // Import plugin store dynamically to avoid circular deps
    const { pluginStore } = require("../plugins")
    
    // Use the store to register the plugin
    pluginStore.register(plugin)
    pluginStore.enable(name)
    
    // Create plugin scope
    const pluginScope: ScopeDef = {
      id: `plugin_${name}_${Date.now()}`,
      type: 'plugin',
      name,
      path: [name],
      description,
      metadata: { version, plugin },
      executable: true,
      children: []
    }
    
    this.pushScope(pluginScope)
    
    // Emit plugin start event
    if (this.jsxModule) {
      Effect.runSync(
        this.jsxModule.emitPluginStart(name, pluginScope as ScopeContext)
      )
    }
    
    return name
  }
  
  /**
   * Unregister a loaded plugin
   */
  unregisterPlugin(name: string) {
    debug('Unregistering loaded plugin:', name)
    
    // Import plugin store dynamically
    const { pluginStore } = require("../plugins")
    
    // Find the plugin scope
    const allScopes = this.scopeManager.getAllScopes()
    const pluginScope = allScopes.find(s => s.type === 'plugin' && s.name === name)
    
    if (pluginScope) {
      // Pop scope if current
      if (this.currentScopeId === pluginScope.id) {
        this.popScope()
      }
      
      // Remove scope
      Effect.runSync(this.scopeManager.removeScope(pluginScope.id))
    }
    
    // Emit plugin end event
    if (this.jsxModule) {
      Effect.runSync(
        this.jsxModule.emitPluginEnd(name)
      )
    }
    
    // Disable in store
    pluginStore.disable(name)
  }
  
  /**
   * Get a loaded plugin
   */
  getPlugin(name: string): any {
    const { pluginStore } = require("../plugins")
    return pluginStore.isEnabled(name) ? pluginStore.getPlugin(name) : null
  }
  
  /**
   * List all loaded plugins
   */
  listPlugins(): string[] {
    const { pluginStore } = require("../plugins")
    return pluginStore.listEnabled()
  }
  
  // --- Command Registration ---
  
  registerCommand(path: string[], handler: any, metadata?: any) {
    debug('Registering command:', path.join(' '))
    
    const currentScope = this.getCurrentScope()
    const parentPath = currentScope?.path || []
    const fullPath = [...parentPath, ...path]
    
    // Create command scope
    const commandScope: ScopeDef = {
      id: `command_${fullPath.join('_')}_${Date.now()}`,
      type: 'command',
      name: path[path.length - 1],
      path: fullPath,
      handler,
      executable: true,
      metadata,
      children: []
    }
    
    // Register with scope manager
    Effect.runSync(this.scopeManager.registerScope(commandScope))
    
    // If current scope exists, add as child
    if (currentScope) {
      currentScope.children.push(commandScope)
    }
    
    // Emit command event if JSX module is available
    if (this.jsxModule) {
      Effect.runSync(
        this.jsxModule.emitCommandRegistered(fullPath, commandScope as ScopeContext)
      )
    }
    
    return fullPath.join(' ')
  }
  
  unregisterCommand(path: string[]) {
    debug('Unregistering command:', path.join(' '))
    
    // Find command scope
    const allScopes = this.scopeManager.getAllScopes()
    const commandScope = allScopes.find(s => 
      s.type === 'command' && 
      s.path.length === path.length &&
      s.path.every((p, i) => p === path[i])
    )
    
    if (commandScope) {
      Effect.runSync(this.scopeManager.removeScope(commandScope.id))
    }
  }
  
  // --- Command Execution ---
  
  executeCommand(path: string[], args: any = {}, flags: any = {}) {
    debug('Executing command:', path.join(' '))
    
    // Find command scope
    const allScopes = this.scopeManager.getAllScopes()
    const commandScope = allScopes.find(s => 
      s.type === 'command' && 
      s.path.length === path.length &&
      s.path.every((p, i) => p === path[i])
    )
    
    if (!commandScope || !commandScope.handler) {
      throw new Error(`Command not found: ${path.join(' ')}`)
    }
    
    // Execute handler
    return commandScope.handler({ args, flags })
  }
  
  // --- Context Management ---
  
  setActiveCommand(command: { path: string[], args: any, flags: any } | null) {
    this.activeCommand = command
  }
  
  getActiveCommand() {
    return this.activeCommand
  }
  
  // Context management for parent/child relationships
  pushContext(type: 'plugin' | 'command' | 'component', id: string, data: any) {
    const scope: ScopeDef = {
      id: `${type}_${id}_${Date.now()}`,
      type,
      name: id,
      path: this.getCurrentScope()?.path ? [...this.getCurrentScope()!.path, id] : [id],
      metadata: data,
      executable: type !== 'component',
      children: []
    }
    
    this.pushScope(scope)
    this.commandStack.push({ type, id, data })
  }
  
  popContext() {
    const context = this.commandStack.pop()
    const poppedScope = this.popScope()
    
    if (context && poppedScope) {
      debug(`Popped ${context.type} context:`, context.id)
    }
    
    return context
  }
  
  getCurrentContext() {
    return this.commandStack[this.commandStack.length - 1] || null
  }
  
  getContextStack() {
    return [...this.commandStack]
  }
  
  // Track renderable content for help generation
  pushRenderableContent(content: any) {
    this.renderableContent.push(content)
  }
  
  popRenderableContent() {
    return this.renderableContent.pop()
  }
  
  hasRenderableContent(): boolean {
    return this.renderableContent.length > 0
  }
  
  // Scope-aware state management
  getScopedState<T>(key: string, defaultValue?: T): T | undefined {
    // Look up the scope hierarchy for a state value
    let currentId = this.currentScopeId
    while (currentId) {
      const scope = this.scopeManager.getScopeDef(currentId)
      if (scope?.metadata?.[key] !== undefined) {
        return scope.metadata[key]
      }
      // Move up to parent
      const state = this.scopeManager.getScope(currentId)
      currentId = state?.parentId || null
    }
    return defaultValue
  }
  
  setScopedState(key: string, value: any) {
    const currentScope = this.getCurrentScope()
    if (currentScope) {
      currentScope.metadata = currentScope.metadata || {}
      currentScope.metadata[key] = value
    }
  }
  
  // Helper to get all plugins in the current scope
  getScopedPlugins(): any[] {
    const allScopes = this.scopeManager.getAllScopes()
    return allScopes
      .filter(s => s.type === 'plugin')
      .map(s => s.metadata?.plugin)
      .filter(Boolean)
  }
  
  // Config management
  setConfigManager(configManager: any) {
    this.configManager = configManager
  }
  
  getConfigManager() {
    return this.configManager
  }
  
  // Get the scope manager for direct access
  getScopeManager() {
    return this.scopeManager
  }
  
  // Helper methods for scope access
  getCurrentPlugin(): any | null {
    const currentScope = this.getCurrentScope()
    if (currentScope?.type === 'plugin') {
      return currentScope.metadata?.plugin || null
    }
    
    // Look up the scope hierarchy
    let currentId = this.currentScopeId
    while (currentId) {
      const scope = this.scopeManager.getScopeDef(currentId)
      if (scope?.type === 'plugin') {
        return scope.metadata?.plugin || null
      }
      const state = this.scopeManager.getScope(currentId)
      currentId = state?.parentId || null
    }
    
    return null
  }
  
  getCurrentCommand(): any | null {
    const currentScope = this.getCurrentScope()
    if (currentScope?.type === 'command') {
      return currentScope
    }
    
    // Look up the scope hierarchy  
    let currentId = this.currentScopeId
    while (currentId) {
      const scope = this.scopeManager.getScopeDef(currentId)
      if (scope?.type === 'command') {
        return scope
      }
      const state = this.scopeManager.getScope(currentId)
      currentId = state?.parentId || null
    }
    
    return null
  }
  
  // Debug helpers
  getDebugInfo() {
    return {
      currentScopeId: this.currentScopeId,
      scopeStackDepth: this.scopeIdStack.length,
      commandStackDepth: this.commandStack.length,
      renderableContentDepth: this.renderableContent.length,
      declarativePluginsCount: this.declarativePlugins.size,
      totalScopes: this.scopeManager.getAllScopes().length
    }
  }
}

// Create global registry instance
const registry = new JSXPluginRegistry()

/**
 * JSX factory function for creating terminal UI elements
 * 
 * This is the core JSX runtime factory that transforms JSX syntax into View objects.
 * Supports both intrinsic elements (like 'text', 'vstack') and function components.
 * 
 * @param type - The element type (string for intrinsics, function for components)
 * @param props - Element properties/attributes object
 * @param children - Child elements (can be Views, strings, or arrays)
 * @returns A View object that can be rendered to the terminal
 * 
 * @example
 * ```tsx
 * // Intrinsic element
 * const textElement = jsx('text', { style: { color: 'red' } }, 'Hello World')
 * 
 * // Function component
 * const MyComponent = ({ name }: { name: string }) => jsx('text', null, `Hello ${name}`)
 * const componentElement = jsx(MyComponent, { name: 'Drew' })
 * ```
 * 
 * @throws Error if the element type is unknown and cannot be converted to a text node
 */
// Export component registrations
export const jsx = (
  type: string | Function,
  props: Record<string, any> | null,
  ...children: any[]
): View => {
  debug('[RUNTIME] Processing element type:', type, {
    props: props ? Object.keys(props) : null,
    key: props?.key,
  })

  // Handle null/undefined props
  const safeProps = props || {}
  
  // Handle children - can be passed as props.children or as rest args
  const allChildren = safeProps.children 
    ? Array.isArray(safeProps.children) 
      ? safeProps.children 
      : [safeProps.children]
    : children

  // Filter out null/undefined children and flatten
  const validChildren = allChildren
    .flat(Infinity)
    .filter(child => child != null)

  // Handle function components
  if (typeof type === 'function') {
    debug('[RUNTIME] Calling function component:', type.name || 'Anonymous')
    const componentProps = { ...safeProps, children: validChildren }
    const result = type(componentProps)
    debug('[RUNTIME] Function component returned:', typeof result)
    if (result && typeof result === 'object') {
      debug('[RUNTIME] Result details:', {
        render: typeof result.render,
        width: result.width,
        height: result.height
      })
    }
    return result
  }

  // Handle built-in JSX intrinsics
  switch (type) {
    case 'text':
      return text(validChildren.join(''))
    
    case 'box':
      // Ensure children are Views before passing to box/vstack
      const boxChildren = validChildren.map(child => {
        if (isView(child)) return child
        if (typeof child === 'string') return text(child)
        // If it's a JSX element that was already processed, it should be a View
        return child
      }).filter(isView)
      
      return box(boxChildren.length === 1 ? boxChildren[0] : vstack(...boxChildren))
    
    case 'vstack':
      // Ensure children are Views before passing to vstack
      const vstackChildren = validChildren.map(child => {
        if (isView(child)) return child
        if (typeof child === 'string') return text(child)
        // If it's a JSX element that was already processed, it should be a View
        return child
      }).filter(isView)
      
      return vstack(...vstackChildren)
    
    case 'hstack':
      // Ensure children are Views before passing to hstack
      const hstackChildren = validChildren.map(child => {
        if (isView(child)) return child
        if (typeof child === 'string') return text(child)
        // If it's a JSX element that was already processed, it should be a View
        return child
      }).filter(isView)
      
      return hstack(...hstackChildren)
    
    case 'styled-text':
    case 'styledText':
      const textContent = validChildren.join('')
      return styledText(textContent, safeProps.style || {})
    
    // CLI Components - these are not intrinsic elements
    // They must be explicitly imported in user code
    // Example: import { CLI, Command } from '@cli/jsx/components'
    case 'cli':
    case 'plugin':
    case 'command':
    case 'arg':
    case 'flag':
    case 'option':
    case 'help':
    case 'example':
    case 'exit':
    case 'load-plugin':
    case 'command-line-scope':
    case 'command-line-help':
      // These are not built-in - must be imported by user
      return text(`[${type} component must be imported from @cli/jsx/components]`)
      
    // Scope Components
    case 'scope':
      return Scope({ ...safeProps, children: validChildren })
      
    case 'scope-content':
      return ScopeContent({ ...safeProps, children: validChildren })
      
    case 'scope-fallback':
      return ScopeFallback({ ...safeProps, children: validChildren })
    
    default:
      // For unknown types, try to create a text node
      debug(`[RUNTIME] Unknown element type: ${type}, creating text node`)
      return text(`[${type}]`)
  }
}

/**
 * JSX Fragment component for grouping multiple elements without a wrapper
 * 
 * Fragments allow you to group multiple JSX elements without adding an extra
 * container element to the DOM. Single children are returned as-is, multiple
 * children are automatically wrapped in a vertical stack.
 * 
 * @param props - Fragment properties
 * @param props.children - Child elements to group
 * @returns A single View or vstack containing the children
 * 
 * @example
 * ```tsx
 * // Multiple children get wrapped in vstack
 * <>
 *   <text>First line</text>
 *   <text>Second line</text>
 * </>
 * 
 * // Single child returned as-is
 * <>
 *   <text>Only child</text>
 * </>
 * ```
 */
// Export Fragment support
export const Fragment = ({ children }: { children?: any }) => {
  const childArray = Array.isArray(children) ? children : [children]
  const validChildren = childArray.filter(child => child != null)
  
  if (validChildren.length === 0) {
    return text('')
  }
  
  if (validChildren.length === 1) {
    return validChildren[0]
  }
  
  return vstack(validChildren)
}

/**
 * React-compatible createElement function
 * 
 * Alias for the jsx function to maintain compatibility with React's createElement API.
 * This allows existing React components to work seamlessly with tuix.
 * 
 * @param type - The element type (string for intrinsics, function for components)
 * @param props - Element properties/attributes object
 * @param children - Child elements
 * @returns A View object that can be rendered to the terminal
 * 
 * @example
 * ```tsx
 * const element = createElement('text', { style: { color: 'blue' } }, 'Hello')
 * ```
 */
// Export createElement
export const createElement = jsx

// Export JSX namespace types
export namespace JSX {
  export interface Element extends View {}
  
  export interface IntrinsicElements {
    text: { children?: any }
    box: { children?: any; style?: Style; padding?: number; margin?: number }
    vstack: { children?: any; gap?: number; align?: 'left' | 'center' | 'right' }
    hstack: { children?: any; gap?: number; align?: 'top' | 'middle' | 'bottom' }
    'styled-text': { children?: any; style?: Style }
    styledText: { children?: any; style?: Style }
    
    // CLI Components
    cli: any
    plugin: any
    command: any
    arg: any
    flag: any
    option: any
    help: any
    example: any
    exit: any
    'load-plugin': any
    'command-line-scope': any
    'command-line-help': any
    
    // Scope Components
    scope: any
    'scope-content': any
    'scope-fallback': any
  }
  
  export interface ElementChildrenAttribute {
    children: {}
  }
}

// Export jsx-runtime functions
export { jsx as jsxs, jsx as jsxDEV }

/**
 * Global JSX plugin registry instance
 * 
 * Provides access to the central registry for managing plugins, commands,
 * and component lifecycle within the JSX runtime environment.
 * 
 * @example
 * ```tsx
 * // Register a plugin
 * pluginRegistry.registerPlugin('myPlugin', pluginInstance)
 * 
 * // Check if plugin exists
 * if (pluginRegistry.hasDeclarativePlugin('myPlugin')) {
 *   // Plugin is available
 * }
 * ```
 */
// Export the registry for plugin access
export const pluginRegistry = registry

// Convenience exports for common patterns
export const registerPlugin = registry.registerPlugin.bind(registry)
export const registerCommand = registry.registerCommand.bind(registry)
export const executeCommand = registry.executeCommand.bind(registry)
export const getScopeManager = registry.getScopeManager.bind(registry)

// Export utilities
export { config, templates }

// Export JSXContext
export const JSXContext = {
  registry,
  getScopeManager
}