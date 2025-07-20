/**
 * Plugin Nesting Integration Tests
 * 
 * Verifies that the scope system properly handles nested plugins
 * and creates correct command hierarchies.
 */

import { test, expect, describe, beforeEach } from "bun:test"
import { Effect } from "effect"
import { getScopeStack, initializeScopeSystem, debugScopeHierarchy } from "../../src/core/scope-hooks"
import { jsx } from "../../src/jsx/runtime"
import { createJSXScopeIntegration } from "../../src/core/jsx-scope-integration"

describe("Plugin Nesting with Scope System", () => {
  let scopeIntegration: ReturnType<typeof createJSXScopeIntegration>
  
  // Reset scope system before each test
  beforeEach(() => {
    initializeScopeSystem()
    scopeIntegration = createJSXScopeIntegration(getScopeStack())
  })
  
  test("CLI components properly integrate with scope system", async () => {
    const commands: Record<string, any> = {}
    
    // Mock handler to track registrations
    const trackingHandler = (path: string[]) => {
      return ({ args, options }) => {
        const fullPath = path.join(' ')
        commands[fullPath] = { args, options, path }
        return `Executed: ${fullPath}`
      }
    }
    
    // Simulate processing Plugin component
    const pluginElement = {
      type: 'Plugin',
      props: {
        name: 'pm',
        description: 'Process manager',
        children: []
      }
    }
    
    const pluginDef = await Effect.runPromise(
      scopeIntegration.processPluginElement(pluginElement)
    )
    
    expect(pluginDef.name).toBe('pm')
    expect(pluginDef.description).toBe('Process manager')
    
    // Simulate processing Command component within plugin
    const commandElement = {
      type: 'Command',
      props: {
        name: 'start',
        description: 'Start a process',
        handler: trackingHandler(['pm', 'start'])
      }
    }
    
    const commandDef = await Effect.runPromise(
      scopeIntegration.processCommandElement(commandElement)
    )
    
    expect(commandDef.name).toBe('start')
    
    // Register command and verify path
    const registration = await Effect.runPromise(
      scopeIntegration.registerCommand(commandDef)
    )
    
    expect(registration.fullPath).toEqual(['pm'])
    expect(registration.scopeId).toBeTruthy()
    
    // Get scope hierarchy
    const scopeStack = getScopeStack()
    const stats = scopeStack.getStats()
    
    // Verify scope creation
    expect(stats.totalScopes).toBeGreaterThan(0)
    expect(stats.typeBreakdown.plugin).toBeGreaterThanOrEqual(1)
    expect(stats.typeBreakdown.command).toBeGreaterThanOrEqual(1)
  })
  
  test("nested plugins create proper command hierarchy", async () => {
    // Process parent plugin
    await Effect.runPromise(
      scopeIntegration.processPluginElement({
        type: 'Plugin',
        props: { name: 'dev', description: 'Development tools' }
      })
    )
    
    // Process nested plugin
    await Effect.runPromise(
      scopeIntegration.processPluginElement({
        type: 'Plugin',
        props: { name: 'db', description: 'Database tools' }
      })
    )
    
    // Process command in nested plugin
    const commandDef = await Effect.runPromise(
      scopeIntegration.processCommandElement({
        type: 'Command',
        props: { 
          name: 'migrate',
          handler: () => 'Migrating...'
        }
      })
    )
    
    // Register command
    const registration = await Effect.runPromise(
      scopeIntegration.registerCommand(commandDef)
    )
    
    // Should have full path from parent plugins
    expect(registration.fullPath).toEqual(['dev', 'db'])
    
    // Verify current path
    expect(scopeIntegration.getCurrentPath()).toEqual(['dev', 'db', 'migrate'])
  })
  
  test("sibling plugins maintain separate scopes", async () => {
    // Create first plugin
    await Effect.runPromise(
      scopeIntegration.processPluginElement({
        type: 'Plugin',
        props: { name: 'auth', description: 'Authentication' }
      })
    )
    
    // Add command to auth
    await Effect.runPromise(
      scopeIntegration.processCommandElement({
        type: 'Command',
        props: { name: 'login', handler: () => 'Login' }
      })
    )
    
    const authPath = scopeIntegration.getCurrentPath()
    expect(authPath).toEqual(['auth', 'login'])
    
    // Finish auth command and plugin
    await Effect.runPromise(scopeIntegration.finishCommandElement())
    await Effect.runPromise(scopeIntegration.finishPluginElement())
    
    // Create sibling plugin
    await Effect.runPromise(
      scopeIntegration.processPluginElement({
        type: 'Plugin',
        props: { name: 'dev', description: 'Development' }
      })
    )
    
    // Add command to dev
    await Effect.runPromise(
      scopeIntegration.processCommandElement({
        type: 'Command',
        props: { name: 'start', handler: () => 'Start' }
      })
    )
    
    const devPath = scopeIntegration.getCurrentPath()
    expect(devPath).toEqual(['dev', 'start'])
    
    // Paths should be completely separate
    expect(devPath).not.toContain('auth')
  })
  
  test("deeply nested plugins create correct paths", async () => {
    // Create deep nesting: level1 > level2 > level3
    const levels = ['level1', 'level2', 'level3']
    
    for (const level of levels) {
      await Effect.runPromise(
        scopeIntegration.processPluginElement({
          type: 'Plugin',
          props: { name: level }
        })
      )
    }
    
    // Add command at deepest level
    await Effect.runPromise(
      scopeIntegration.processCommandElement({
        type: 'Command',
        props: { name: 'deep', handler: () => 'Deep command' }
      })
    )
    
    // Verify full path
    expect(scopeIntegration.getCurrentPath()).toEqual(['level1', 'level2', 'level3', 'deep'])
    
    // Register and verify
    const registration = await Effect.runPromise(
      scopeIntegration.registerCommand({
        name: 'deep',
        handler: () => 'Deep command'
      })
    )
    
    expect(registration.fullPath).toEqual(['level1', 'level2', 'level3'])
  })
  
  test("scope metadata is preserved through nesting", async () => {
    const scopeStack = getScopeStack()
    
    // Create plugin with metadata
    await Effect.runPromise(
      scopeIntegration.processPluginElement({
        type: 'Plugin',
        props: { 
          name: 'feature',
          description: 'Feature plugin',
          version: '1.0.0'
        }
      })
    )
    
    // Create command with metadata
    await Effect.runPromise(
      scopeIntegration.processCommandElement({
        type: 'Command',
        props: {
          name: 'run',
          description: 'Run the feature',
          aliases: ['r', 'exec'],
          hidden: false,
          handler: () => 'Running'
        }
      })
    )
    
    // Find scopes
    const featureScope = scopeStack.findByPath(['feature'])
    const runScope = scopeStack.findByPath(['feature', 'run'])
    
    // Verify plugin metadata
    expect(featureScope?.metadata.description).toBe('Feature plugin')
    expect(featureScope?.metadata.version).toBe('1.0.0')
    
    // Verify command metadata
    expect(runScope?.metadata.description).toBe('Run the feature')
    expect(runScope?.metadata.aliases).toEqual(['r', 'exec'])
    expect(runScope?.metadata.hidden).toBe(false)
  })
})

describe("Scope Lifecycle Management", () => {
  let scopeIntegration: ReturnType<typeof createJSXScopeIntegration>
  
  beforeEach(() => {
    initializeScopeSystem()
    scopeIntegration = createJSXScopeIntegration(getScopeStack())
  })
  
  test("scopes are properly cleaned up after processing", async () => {
    const scopeStack = getScopeStack()
    
    // Get initial state
    const initialStats = scopeStack.getStats()
    const initialDepth = initialStats.stackDepth
    
    // Process plugin and command
    await Effect.runPromise(
      scopeIntegration.processPluginElement({
        type: 'Plugin',
        props: { name: 'temp' }
      })
    )
    
    await Effect.runPromise(
      scopeIntegration.processCommandElement({
        type: 'Command',
        props: { name: 'cmd', handler: () => 'Command' }
      })
    )
    
    // Stack should be deeper during processing
    const duringStats = scopeStack.getStats()
    expect(duringStats.stackDepth).toBeGreaterThan(initialDepth)
    
    // Finish processing
    await Effect.runPromise(scopeIntegration.finishCommandElement())
    await Effect.runPromise(scopeIntegration.finishPluginElement())
    
    // Stack depth should return to initial
    const finalStats = scopeStack.getStats()
    expect(finalStats.stackDepth).toBe(initialDepth)
    
    // But registry keeps all scopes for reference
    expect(finalStats.totalScopes).toBeGreaterThan(initialStats.totalScopes)
  })
  
  test("error handling preserves scope stack integrity", async () => {
    const scopeStack = getScopeStack()
    const initialDepth = scopeStack.getStats().stackDepth
    
    // Process plugin
    await Effect.runPromise(
      scopeIntegration.processPluginElement({
        type: 'Plugin',
        props: { name: 'error-test' }
      })
    )
    
    // Try to register command without being in command scope
    try {
      await Effect.runPromise(
        scopeIntegration.registerCommand({
          name: 'invalid',
          handler: () => 'Invalid'
        })
      )
      // Should not reach here
      expect(true).toBe(false)
    } catch (error) {
      // Expected error
      expect(error).toBeDefined()
    }
    
    // Clean up
    await Effect.runPromise(scopeIntegration.finishPluginElement())
    
    // Stack should be back to initial depth
    expect(scopeStack.getStats().stackDepth).toBe(initialDepth)
  })
})