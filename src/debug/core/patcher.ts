/**
 * Framework Patcher
 * 
 * Patches framework internals to capture debug information
 */

import { debug } from './store'
import { scopeManager } from '@core/model/scope/manager'
import type { ScopeDef } from '@core/model/scope/types'
import { DEBUG_DEFAULTS } from '../constants'

export interface PatchOptions {
  patchScope?: boolean
  patchJSX?: boolean
  patchRender?: boolean
  patchLogger?: boolean
}

let patchesApplied = false

export function applyDebugPatches(options: PatchOptions = {}) {
  if (patchesApplied) return
  patchesApplied = true
  
  const {
    patchScope = true,
    patchJSX = true,
    patchRender = true,
    patchLogger = DEBUG_DEFAULTS.CAPTURE_LOGGER
  } = options
  
  debug.system('Applying debug patches')
  
  if (patchScope) patchScopeManager()
  if (patchJSX) patchJSXRuntime()
  if (patchRender) patchRenderSystem()
  if (patchLogger) patchLoggerModule()
  
  // Install error handlers
  installErrorHandlers()
}

function patchScopeManager() {
  // Patch registerScope
  const originalRegister = scopeManager.registerScope.bind(scopeManager)
  scopeManager.registerScope = (scope: ScopeDef) => {
    debug.scope(`Registering scope: ${scope.type}:${scope.name}`, {
      id: scope.id,
      path: scope.path,
      parent: scope.metadata?.parentId
    })
    return originalRegister(scope)
  }
  
  // Patch activateScope
  const originalActivate = scopeManager.activateScope.bind(scopeManager)
  scopeManager.activateScope = (scopeId: string) => {
    const scope = scopeManager.getAllScopes().find(s => s.id === scopeId)
    debug.scope(`Activating scope: ${scope?.name || scopeId}`, { 
      scopeId,
      path: scope?.path 
    })
    return originalActivate(scopeId)
  }
  
  // Patch deactivateScope
  const originalDeactivate = scopeManager.deactivateScope.bind(scopeManager)
  scopeManager.deactivateScope = (scopeId: string) => {
    const scope = scopeManager.getAllScopes().find(s => s.id === scopeId)
    debug.scope(`Deactivating scope: ${scope?.name || scopeId}`, { scopeId })
    return originalDeactivate(scopeId)
  }
  
  debug.system('Scope manager patched')
}

async function patchJSXRuntime() {
  try {
    const jsxRuntime = await import('@jsx/runtime')
    
    // Patch createElement
    const originalCreateElement = jsxRuntime.createElement
    jsxRuntime.createElement = function(type: any, props: any, ...children: any[]) {
      const componentName = typeof type === 'function' ? type.name : String(type)
      
      debug.jsx(`Creating element: ${componentName}`, {
        props: Object.keys(props || {}),
        childCount: children.length
      })
      
      if (DEBUG_DEFAULTS.CAPTURE_PERFORMANCE) {
        const start = performance.now()
        const result = originalCreateElement.call(this, type, props, ...children)
        const duration = performance.now() - start
        debug.performance(`createElement ${componentName}`, duration, { componentName })
        return result
      }
      
      return originalCreateElement.call(this, type, props, ...children)
    }
    
    debug.system('JSX runtime patched')
  } catch (error) {
    debug.error('Failed to patch JSX runtime', error as Error)
  }
}

async function patchRenderSystem() {
  try {
    const runtime = await import('@core/runtime')
    
    // Patch runApp
    const originalRunApp = runtime.runApp
    runtime.runApp = function(component: any) {
      debug.render('Starting application render', { 
        componentName: component.name || 'App' 
      })
      
      if (DEBUG_DEFAULTS.CAPTURE_PERFORMANCE) {
        const start = performance.now()
        const result = originalRunApp.call(this, component)
        const duration = performance.now() - start
        debug.performance('Application startup', duration)
        return result
      }
      
      return originalRunApp.call(this, component)
    }
    
    debug.system('Render system patched')
  } catch (error) {
    debug.error('Failed to patch render system', error as Error)
  }
}

async function patchLoggerModule() {
  try {
    const loggerModule = await import('@logger')
    
    // Create debug transport
    const DebugTransport = {
      name: 'debug',
      async write(entry: any) {
        debug.logger(entry.message, entry, { source: entry.logger || 'unknown' })
      },
      async close() {}
    }
    
    // Patch TuixLogger constructor
    const OriginalLogger = loggerModule.TuixLogger
    loggerModule.TuixLogger = class extends OriginalLogger {
      constructor(config: any) {
        // Add debug transport
        const transports = config.transports || []
        transports.push(DebugTransport)
        super({ ...config, transports })
      }
    }
    
    debug.system('Logger module patched')
  } catch (error) {
    debug.error('Failed to patch logger module', error as Error)
  }
}

function installErrorHandlers() {
  process.on('uncaughtException', (error) => {
    debug.error('Uncaught exception', error)
  })
  
  process.on('unhandledRejection', (reason, promise) => {
    debug.error('Unhandled rejection', reason as Error)
  })
  
  debug.system('Error handlers installed')
}