/**
 * Integration tests for plugin nesting functionality
 * 
 * These tests validate that the Phase 1 scope system fixes work correctly
 * for nested plugin scenarios like those in examples/declarative-plugin-app.tsx
 */

import { test, expect } from "bun:test"
import { Effect } from "effect"
import { jsx } from "../../src/jsx/app"
import { Plugin, Command } from "../../src/jsx/index"
import { LoggingPlugin } from "../../src/plugins/logging"
import { ProcessManagerPlugin } from "../../src/process-manager/plugin"
import { JSXScopeIntegration, createJSXScopeIntegration } from "../../src/core/jsx-scope-integration"
import { ScopeStack } from "../../src/core/scope"

// Mock handlers for testing
const mockStartHandler = () => ({ message: "Service started" })
const mockShowHandler = () => ({ message: "Showing logs" })
const mockStatusHandler = () => ({ message: "Service status" })

test("nested plugins create proper command hierarchy", async () => {
  const integration = createJSXScopeIntegration()
  
  // Simulate: <Plugin name="pm">
  const pmPluginDef = await Effect.runPromise(integration.processPluginElement({
    type: "Plugin",
    props: { name: "pm", description: "Process Manager" }
  }))
  
  // Simulate: <Command name="start">
  const startCommandDef = await Effect.runPromise(integration.processCommandElement({
    type: "Command", 
    props: { name: "start", handler: mockStartHandler }
  }))
  
  // Register the start command
  const startRegistration = await Effect.runPromise(integration.registerCommand(startCommandDef))
  expect(startRegistration.fullPath).toEqual(["pm"])
  
  // Finish start command scope
  await Effect.runPromise(integration.finishCommandElement())
  
  // Simulate: <Plugin name="logs"> (nested in pm)
  const logsPluginDef = await Effect.runPromise(integration.processPluginElement({
    type: "Plugin",
    props: { name: "logs", description: "Logging utilities" }
  }))
  
  // Simulate: <Command name="show"> (in logs plugin)
  const showCommandDef = await Effect.runPromise(integration.processCommandElement({
    type: "Command",
    props: { name: "show", handler: mockShowHandler }
  }))
  
  // Register the show command - should have full path ["pm", "logs"]
  const showRegistration = await Effect.runPromise(integration.registerCommand(showCommandDef))
  expect(showRegistration.fullPath).toEqual(["pm", "logs"])
  
  // Verify hierarchy
  const info = integration.getHierarchyInfo()
  expect(info.currentPath).toEqual(["pm", "logs", "show"])
  expect(info.scopes.map(s => s.name)).toEqual(["pm", "logs", "show"])
  expect(info.scopes.map(s => s.type)).toEqual(["plugin", "plugin", "command"])
})

test("deeply nested plugin hierarchy works correctly", async () => {
  const integration = createJSXScopeIntegration()
  
  // Create: pm > logs > viewer > interactive
  await Effect.runPromise(integration.processPluginElement({
    type: "Plugin",
    props: { name: "pm" }
  }))
  
  await Effect.runPromise(integration.processPluginElement({
    type: "Plugin", 
    props: { name: "logs" }
  }))
  
  await Effect.runPromise(integration.processPluginElement({
    type: "Plugin",
    props: { name: "viewer" }
  }))
  
  await Effect.runPromise(integration.processCommandElement({
    type: "Command",
    props: { name: "interactive", handler: () => ({}) }
  }))
  
  // Verify full path
  expect(integration.getCurrentPath()).toEqual(["pm", "logs", "viewer", "interactive"])
  
  // Register command and verify path context
  const commandDef = { name: "interactive", handler: () => ({}) }
  const registration = await Effect.runPromise(integration.registerCommand(commandDef))
  expect(registration.fullPath).toEqual(["pm", "logs", "viewer"])
})

test("sibling plugins maintain separate scopes", async () => {
  const integration = createJSXScopeIntegration()
  
  // Create pm plugin
  await Effect.runPromise(integration.processPluginElement({
    type: "Plugin",
    props: { name: "pm" }
  }))
  
  // Add first nested plugin: logs
  await Effect.runPromise(integration.processPluginElement({
    type: "Plugin",
    props: { name: "logs" }
  }))
  
  await Effect.runPromise(integration.processCommandElement({
    type: "Command",
    props: { name: "show", handler: mockShowHandler }
  }))
  
  const logsPath = integration.getCurrentPath()
  expect(logsPath).toEqual(["pm", "logs", "show"])
  
  // Exit logs plugin and command
  await Effect.runPromise(integration.finishCommandElement()) // exit show command
  await Effect.runPromise(integration.finishPluginElement()) // exit logs plugin
  
  // Add second nested plugin: monitoring (sibling to logs)
  await Effect.runPromise(integration.processPluginElement({
    type: "Plugin",
    props: { name: "monitoring" }
  }))
  
  await Effect.runPromise(integration.processCommandElement({
    type: "Command",
    props: { name: "status", handler: mockStatusHandler }
  }))
  
  const monitoringPath = integration.getCurrentPath()
  expect(monitoringPath).toEqual(["pm", "monitoring", "status"])
  
  // Verify scopes are separate
  expect(logsPath).not.toEqual(monitoringPath)
  expect(logsPath[1]).toBe("logs")
  expect(monitoringPath[1]).toBe("monitoring")
})

test("plugin scope cleanup works correctly", async () => {
  const integration = createJSXScopeIntegration()
  
  // Build hierarchy
  await Effect.runPromise(integration.processPluginElement({
    type: "Plugin", props: { name: "pm" }
  }))
  
  await Effect.runPromise(integration.processPluginElement({
    type: "Plugin", props: { name: "logs" }
  }))
  
  await Effect.runPromise(integration.processCommandElement({
    type: "Command", props: { name: "show" }
  }))
  
  expect(integration.getCurrentPath()).toEqual(["pm", "logs", "show"])
  
  // Clean up in reverse order
  const commandScope = await Effect.runPromise(integration.finishCommandElement())
  expect(commandScope?.name).toBe("show")
  expect(integration.getCurrentPath()).toEqual(["pm", "logs"])
  
  const logsScope = await Effect.runPromise(integration.finishPluginElement())
  expect(logsScope?.name).toBe("logs")
  expect(integration.getCurrentPath()).toEqual(["pm"])
  
  const pmScope = await Effect.runPromise(integration.finishPluginElement())
  expect(pmScope?.name).toBe("pm")
  expect(integration.getCurrentPath()).toEqual([])
})

test("real-world declarative plugin app scenario", async () => {
  const integration = createJSXScopeIntegration()
  
  // Simulate the structure from examples/declarative-plugin-app.tsx
  
  // RegisterPlugin with LoggingPlugin as="logs"
  await Effect.runPromise(integration.processPluginElement({
    type: "RegisterPlugin",
    props: { 
      name: "logs", // Add missing name
      plugin: LoggingPlugin, 
      as: "logs",
      alias: "l",
      config: { defaultLevel: "info" }
    }
  }))
  
  // Verify logs plugin is registered
  expect(integration.getCurrentPath()).toEqual(["logs"])
  expect(integration.isInPluginScope()).toBe(true)
  
  // Exit logs plugin
  await Effect.runPromise(integration.finishPluginElement())
  
  // RegisterPlugin with ProcessManagerPlugin as="pm"  
  await Effect.runPromise(integration.processPluginElement({
    type: "RegisterPlugin", 
    props: {
      name: "pm", // Add missing name
      plugin: ProcessManagerPlugin,
      as: "pm",
      alias: "p",
      config: { autoSave: true }
    }
  }))
  
  expect(integration.getCurrentPath()).toEqual(["pm"])
  
  // Exit pm plugin
  await Effect.runPromise(integration.finishPluginElement())
  
  // Custom app plugin with nested commands
  await Effect.runPromise(integration.processPluginElement({
    type: "Plugin",
    props: { name: "app", description: "Application management" }
  }))
  
  // app init command
  await Effect.runPromise(integration.processCommandElement({
    type: "Command",
    props: { name: "init", description: "Initialize project" }
  }))
  
  const initRegistration = await Effect.runPromise(integration.registerCommand({
    name: "init",
    description: "Initialize project"
  }))
  expect(initRegistration.fullPath).toEqual(["app"])
  
  await Effect.runPromise(integration.finishCommandElement())
  
  // app dev command with nested subcommands
  await Effect.runPromise(integration.processCommandElement({
    type: "Command",
    props: { name: "dev", description: "Development commands" }
  }))
  
  // app dev setup
  await Effect.runPromise(integration.processCommandElement({
    type: "Command", 
    props: { name: "setup", description: "Setup dev environment" }
  }))
  
  const setupRegistration = await Effect.runPromise(integration.registerCommand({
    name: "setup",
    description: "Setup dev environment"
  }))
  expect(setupRegistration.fullPath).toEqual(["app", "dev"])
  
  expect(integration.getCurrentPath()).toEqual(["app", "dev", "setup"])
})

test("command registration requires plugin scope", async () => {
  const integration = createJSXScopeIntegration()
  
  // Try to register command without any plugin scope
  const commandDef = { name: "orphan", description: "Orphaned command" }
  
  try {
    await Effect.runPromise(integration.registerCommand(commandDef))
    expect(true).toBe(false) // Should not reach here
  } catch (error) {
    expect(error.toString()).toContain("No active scope")
  }
})

test("anonymous commands work correctly", async () => {
  const integration = createJSXScopeIntegration()
  
  await Effect.runPromise(integration.processPluginElement({
    type: "Plugin",
    props: { name: "test" }
  }))
  
  // Process anonymous command (handler-only)
  const commandDef = await Effect.runPromise(integration.processCommandElement({
    type: "Command",
    props: { handler: () => ({ result: "anonymous" }) }
  }))
  
  expect(commandDef.name).toBe("<anonymous>")
  expect(commandDef.handler).toBeInstanceOf(Function)
  expect(integration.getCurrentPath()).toEqual(["test", "<anonymous>"])
})

test("scope stack statistics and debugging", async () => {
  const integration = createJSXScopeIntegration()
  
  // Build some hierarchy
  await Effect.runPromise(integration.processPluginElement({
    type: "Plugin", props: { name: "pm" }
  }))
  
  await Effect.runPromise(integration.processCommandElement({
    type: "Command", props: { name: "start" }
  }))
  
  const stats = integration.getStats()
  expect(stats.totalScopes).toBe(2)
  expect(stats.pluginScopes).toBe(1)
  expect(stats.commandScopes).toBe(1)
  
  const hierarchy = integration.getHierarchyInfo()
  expect(hierarchy.stackDepth).toBe(2)
  expect(hierarchy.currentPath).toEqual(["pm", "start"])
  expect(hierarchy.scopes).toHaveLength(2)
})

test("clear functionality resets state", async () => {
  const integration = createJSXScopeIntegration()
  
  // Build hierarchy
  await Effect.runPromise(integration.processPluginElement({
    type: "Plugin", props: { name: "pm" }
  }))
  
  expect(integration.getCurrentPath()).toEqual(["pm"])
  
  // Clear all scopes
  await Effect.runPromise(integration.clear())
  
  expect(integration.getCurrentPath()).toEqual([])
  expect(integration.isInPluginScope()).toBe(false)
  expect(integration.isInCommandScope()).toBe(false)
})

test("exemplar scoping bug: auth commands leak into dev scope", async () => {
  const integration = createJSXScopeIntegration()
  
  // This simulates the actual structure in exemplar-jsx.tsx:
  // <ProcessManagerPlugin name="dev" />
  // {authPlugin} 
  // These should be sibling scopes, but auth commands are leaking into dev scope
  
  // Process manager plugin as "dev"
  await Effect.runPromise(integration.processPluginElement({
    type: "ProcessManagerPlugin",
    props: { name: "dev" }
  }))
  
  // Add a dev command (like "start")
  await Effect.runPromise(integration.processCommandElement({
    type: "Command",
    props: { name: "start" }
  }))
  
  const startRegistration = await Effect.runPromise(integration.registerCommand({
    name: "start",
    description: "Start service"
  }))
  expect(startRegistration.fullPath).toEqual(["dev"])
  
  await Effect.runPromise(integration.finishCommandElement()) // finish start command
  await Effect.runPromise(integration.finishPluginElement())  // finish dev plugin
  
  // Now auth plugin should be processed at root level
  await Effect.runPromise(integration.processPluginElement({
    type: "Plugin", 
    props: { name: "auth" }
  }))
  
  // Auth commands should be registered under "auth", NOT "dev"
  await Effect.runPromise(integration.processCommandElement({
    type: "Command",
    props: { name: "login" }
  }))
  
  const loginRegistration = await Effect.runPromise(integration.registerCommand({
    name: "login",
    description: "Login command"
  }))
  
  // This should be correct - login under "auth" scope
  expect(loginRegistration.fullPath).toEqual(["auth"])
  expect(integration.getCurrentPath()).toEqual(["auth", "login"])
  
  // This means CLI commands should be:
  // "ex dev start" (correct)
  // "ex auth login" (correct)
  // NOT "ex dev login" (which is what exemplar is seeing)
})

test("correct exemplar structure: nested plugins", async () => {
  const integration = createJSXScopeIntegration()
  
  // This is how it SHOULD be structured:
  // <Plugin name="dev">
  //   <ProcessManagerPlugin />
  //   <Plugin name="auth">
  //     <Command name="login" />
  //   </Plugin>
  // </Plugin>
  
  // Root "dev" plugin
  await Effect.runPromise(integration.processPluginElement({
    type: "Plugin",
    props: { name: "dev" }
  }))
  
  // Nested auth plugin  
  await Effect.runPromise(integration.processPluginElement({
    type: "Plugin",
    props: { name: "auth" }
  }))
  
  // Login command in auth plugin
  await Effect.runPromise(integration.processCommandElement({
    type: "Command",
    props: { name: "login" }
  }))
  
  const loginRegistration = await Effect.runPromise(integration.registerCommand({
    name: "login", 
    description: "Login command"
  }))
  
  // This is the CORRECT behavior - login is registered under "dev > auth"
  expect(loginRegistration.fullPath).toEqual(["dev", "auth"])
  expect(integration.getCurrentPath()).toEqual(["dev", "auth", "login"])
  
  // This means the CLI command will be "ex dev auth login" as expected
})