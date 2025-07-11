/**
 * Hook System for Plugin Middleware
 * 
 * Provides a flexible hook system for plugins to intercept and modify CLI behavior
 */

import { Effect } from "effect"
import type { PluginMiddleware } from "./plugin"

export type HookHandler = (...args: any[]) => any | Promise<any>
export type AsyncHookHandler = (...args: any[]) => Promise<any>

export interface Hook<TArgs extends any[] = any[], TResult = any> {
  name: string
  handlers: HookHandler[]
  type: 'sync' | 'async' | 'waterfall' | 'parallel'
}

export interface HookContext {
  command: string[]
  args: any
  config: any
  plugins: any[]
  cancelled?: boolean
  error?: Error
  metadata?: Record<string, any>
}

export class HookSystem {
  private hooks: Map<string, Hook> = new Map()
  private middleware: PluginMiddleware[] = []
  
  constructor() {
    // Register default hooks
    this.registerHook('beforeCommand', 'waterfall')
    this.registerHook('afterCommand', 'waterfall')
    this.registerHook('onError', 'waterfall')
    this.registerHook('beforeParse', 'waterfall')
    this.registerHook('afterParse', 'waterfall')
    this.registerHook('beforeValidate', 'waterfall')
    this.registerHook('afterValidate', 'waterfall')
    this.registerHook('beforeExecute', 'waterfall')
    this.registerHook('afterExecute', 'waterfall')
    this.registerHook('beforeRender', 'waterfall')
    this.registerHook('afterRender', 'waterfall')
  }
  
  /**
   * Register a new hook type
   */
  registerHook(
    name: string,
    type: Hook['type'] = 'waterfall'
  ): void {
    if (!this.hooks.has(name)) {
      this.hooks.set(name, {
        name,
        handlers: [],
        type
      })
    }
  }
  
  /**
   * Add a handler to a hook
   */
  addHandler(
    hookName: string,
    handler: HookHandler
  ): void {
    const hook = this.hooks.get(hookName)
    
    if (!hook) {
      throw new Error(`Hook '${hookName}' is not registered`)
    }
    
    hook.handlers.push(handler)
  }
  
  /**
   * Remove a handler from a hook
   */
  removeHandler(
    hookName: string,
    handler: HookHandler
  ): boolean {
    const hook = this.hooks.get(hookName)
    
    if (!hook) {
      return false
    }
    
    const index = hook.handlers.indexOf(handler)
    if (index >= 0) {
      hook.handlers.splice(index, 1)
      return true
    }
    
    return false
  }
  
  /**
   * Add plugin middleware
   */
  addMiddleware(middleware: PluginMiddleware): void {
    this.middleware.push(middleware)
    
    // Register middleware handlers in hooks
    if (middleware.beforeCommand) {
      this.addHandler('beforeCommand', middleware.beforeCommand)
    }
    
    if (middleware.afterCommand) {
      this.addHandler('afterCommand', middleware.afterCommand)
    }
    
    if (middleware.onError) {
      this.addHandler('onError', middleware.onError)
    }
  }
  
  /**
   * Execute a hook
   */
  async execute<TResult = any>(
    hookName: string,
    ...args: any[]
  ): Promise<TResult> {
    const hook = this.hooks.get(hookName)
    
    if (!hook || hook.handlers.length === 0) {
      // Return first argument for waterfall hooks
      return args[0] as TResult
    }
    
    switch (hook.type) {
      case 'sync':
        return this.executeSync(hook, args) as TResult
        
      case 'async':
        return await this.executeAsync(hook, args) as TResult
        
      case 'waterfall':
        return await this.executeWaterfall(hook, args) as TResult
        
      case 'parallel':
        return await this.executeParallel(hook, args) as TResult
        
      default:
        throw new Error(`Unknown hook type: ${hook.type}`)
    }
  }
  
  /**
   * Execute a hook with context
   */
  async executeWithContext<TResult = any>(
    hookName: string,
    context: HookContext,
    ...args: any[]
  ): Promise<TResult> {
    // Add context as first argument
    return this.execute(hookName, context, ...args)
  }
  
  /**
   * Apply middleware transformations
   */
  async applyMiddleware(
    stage: 'args' | 'result',
    value: any,
    command: string[]
  ): Promise<any> {
    let transformed = value
    
    for (const mw of this.middleware) {
      if (stage === 'args' && mw.transformArgs) {
        transformed = await mw.transformArgs(transformed, command)
      } else if (stage === 'result' && mw.transformResult) {
        transformed = await mw.transformResult(transformed, command)
      }
    }
    
    return transformed
  }
  
  /**
   * Validate with middleware
   */
  async validate(
    stage: 'args' | 'result',
    value: any,
    command: string[]
  ): Promise<{ valid: boolean; error?: string }> {
    for (const mw of this.middleware) {
      const validator = stage === 'args' ? mw.validateArgs : mw.validateResult
      
      if (validator) {
        const result = await validator(value, command)
        
        if (typeof result === 'string') {
          return { valid: false, error: result }
        } else if (!result) {
          return { valid: false, error: `Validation failed in middleware` }
        }
      }
    }
    
    return { valid: true }
  }
  
  /**
   * Create a hook runner Effect
   */
  createHookRunner(hookName: string) {
    return (...args: any[]) =>
      Effect.tryPromise({
        try: () => this.execute(hookName, ...args),
        catch: (error) => new Error(`Hook '${hookName}' failed: ${error}`)
      })
  }
  
  // Private execution methods
  
  private executeSync(hook: Hook, args: any[]): any {
    let result = args[0]
    
    for (const handler of hook.handlers) {
      try {
        result = handler(...args)
      } catch (error) {
        console.error(`Sync hook '${hook.name}' handler error:`, error)
        throw error
      }
    }
    
    return result
  }
  
  private async executeAsync(hook: Hook, args: any[]): Promise<any> {
    for (const handler of hook.handlers) {
      try {
        await handler(...args)
      } catch (error) {
        console.error(`Async hook '${hook.name}' handler error:`, error)
        throw error
      }
    }
    
    return args[0]
  }
  
  private async executeWaterfall(hook: Hook, args: any[]): Promise<any> {
    let result = args[0]
    
    for (const handler of hook.handlers) {
      try {
        const handlerResult = handler(result, ...args.slice(1))
        
        if (handlerResult instanceof Promise) {
          result = await handlerResult
        } else {
          result = handlerResult
        }
      } catch (error) {
        console.error(`Waterfall hook '${hook.name}' handler error:`, error)
        throw error
      }
    }
    
    return result
  }
  
  private async executeParallel(hook: Hook, args: any[]): Promise<any[]> {
    const promises = hook.handlers.map(handler => {
      try {
        const result = handler(...args)
        return result instanceof Promise ? result : Promise.resolve(result)
      } catch (error) {
        return Promise.reject(error)
      }
    })
    
    return Promise.all(promises)
  }
}

/**
 * Create a composable hook
 */
export function createHook<TArgs extends any[] = any[], TResult = any>(
  name: string,
  type: Hook['type'] = 'waterfall'
): {
  execute: (...args: TArgs) => Promise<TResult>
  addHandler: (handler: (...args: TArgs) => TResult | Promise<TResult>) => void
  removeHandler: (handler: (...args: TArgs) => TResult | Promise<TResult>) => void
} {
  const handlers: HookHandler[] = []
  
  const executeHandlers = async (...args: TArgs): Promise<TResult> => {
    if (handlers.length === 0) {
      return args[0] as any
    }
    
    if (type === 'waterfall') {
      let result = args[0]
      
      for (const handler of handlers) {
        result = await handler(result, ...args.slice(1))
      }
      
      return result as any
    } else if (type === 'parallel') {
      const results = await Promise.all(
        handlers.map(h => h(...args))
      )
      return results as any
    } else {
      // sync or async
      for (const handler of handlers) {
        await handler(...args)
      }
      return args[0] as any
    }
  }
  
  return {
    execute: executeHandlers,
    addHandler: (handler) => handlers.push(handler),
    removeHandler: (handler) => {
      const index = handlers.indexOf(handler)
      if (index >= 0) handlers.splice(index, 1)
    }
  }
}

/**
 * Hook decorators for easy hook registration
 */
export const Hooks = {
  /**
   * Decorator to register a method as a hook handler
   */
  handler(hookName: string) {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
      const originalMethod = descriptor.value
      
      // Store hook metadata
      if (!target._hooks) {
        target._hooks = {}
      }
      
      target._hooks[propertyKey] = {
        hookName,
        handler: originalMethod
      }
      
      return descriptor
    }
  },
  
  /**
   * Before command execution
   */
  beforeCommand(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    return Hooks.handler('beforeCommand')(target, propertyKey, descriptor)
  },
  
  /**
   * After command execution
   */
  afterCommand(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    return Hooks.handler('afterCommand')(target, propertyKey, descriptor)
  },
  
  /**
   * On error
   */
  onError(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    return Hooks.handler('onError')(target, propertyKey, descriptor)
  }
}

/**
 * Create a hook system with Effect integration
 */
export const createHookSystem = (): Effect.Effect<HookSystem, never, never> =>
  Effect.sync(() => new HookSystem())

/**
 * Execute hook as an Effect
 */
export const executeHook = (
  hookSystem: HookSystem,
  hookName: string,
  ...args: any[]
) =>
  Effect.tryPromise({
    try: () => hookSystem.execute(hookName, ...args),
    catch: (error) => new Error(`Hook execution failed: ${error}`)
  })