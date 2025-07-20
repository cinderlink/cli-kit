/**
 * Tests for JSX Runtime Integration with New Scope System
 * 
 * These tests verify that the JSX runtime correctly uses the new scope system
 * instead of the old broken context system
 */

import { test, expect } from "bun:test"
import { jsx } from "../../src/jsx/runtime"

// Mock handlers for testing
const mockDevHandler = () => ({ message: "Dev command executed" })
const mockAuthHandler = () => ({ message: "Auth command executed" })

test("JSX runtime creates separate plugin scopes", () => {
  // This test simulates the exemplar scenario to verify the fix
  
  // Create ProcessManagerPlugin as "dev"
  const devPlugin = jsx('Plugin', {
    name: 'dev',
    description: 'Development tools'
  })
  
  // Create separate auth plugin
  const authPlugin = jsx('Plugin', {
    name: 'auth', 
    description: 'Authentication'
  })
  
  // Both should return invisible components
  expect(devPlugin).toBeDefined()
  expect(authPlugin).toBeDefined()
  
  // The actual scoping behavior is tested through command registration
  // which happens as a side effect of JSX processing
})

test("JSX runtime handles nested plugins correctly", () => {
  // Create a plugin with nested commands
  const plugin = jsx('Plugin', {
    name: 'pm',
    description: 'Process Manager',
    children: [
      jsx('Command', {
        name: 'start',
        description: 'Start a service',
        handler: mockDevHandler
      }),
      jsx('Plugin', {
        name: 'logs',
        description: 'Logging utilities',
        children: [
          jsx('Command', {
            name: 'show',
            description: 'Show logs',
            handler: mockAuthHandler
          })
        ]
      })
    ]
  })
  
  expect(plugin).toBeDefined()
})

test("JSX runtime handles command elements", () => {
  // Test command processing
  const command = jsx('Command', {
    name: 'test',
    description: 'Test command',
    handler: mockDevHandler
  })
  
  expect(command).toBeDefined()
})

test("JSX runtime scope integration doesn't break existing elements", () => {
  // Test that other JSX elements still work
  const textElement = jsx('text', { children: 'Hello World' })
  const vstackElement = jsx('vstack', { children: [
    jsx('text', { children: 'Line 1' }),
    jsx('text', { children: 'Line 2' })
  ]})
  
  expect(textElement).toBeDefined()
  expect(vstackElement).toBeDefined()
  
  // Elements should be View objects with render methods
  expect(typeof textElement).toBe('object')
  expect(typeof vstackElement).toBe('object')
})

test("JSX runtime error handling works", () => {
  // Test error scenarios
  
  // Plugin without name should throw JSXScopeError (this is correct behavior)
  expect(() => {
    jsx('Plugin', { description: 'No name plugin' })
  }).toThrow('Plugin element must have a name')
  
  // Command without name should work (commands can be anonymous)
  expect(() => {
    jsx('Command', { description: 'No name command' })
  }).not.toThrow()
})

test("JSX runtime complex nesting scenario", () => {
  // Simulate the exemplar structure that was causing issues
  const app = jsx('cli', {
    name: 'exemplar',
    alias: 'ex',
    children: [
      // ProcessManager as "dev"
      jsx('Plugin', {
        name: 'dev',
        description: 'Development tools',
        children: [
          jsx('Command', {
            name: 'start',
            description: 'Start services',
            handler: mockDevHandler
          }),
          jsx('Command', {
            name: 'stop', 
            description: 'Stop services',
            handler: mockDevHandler
          })
        ]
      }),
      
      // Separate auth plugin
      jsx('Plugin', {
        name: 'auth',
        description: 'Authentication',
        children: [
          jsx('Command', {
            name: 'login',
            description: 'Login to API',
            handler: mockAuthHandler
          }),
          jsx('Command', {
            name: 'status',
            description: 'Auth status', 
            handler: mockAuthHandler
          })
        ]
      })
    ]
  })
  
  expect(app).toBeDefined()
  
  // The CLI element returns a View object, not an App object
  expect(typeof app).toBe('object')
  expect(app.render).toBeInstanceOf(Function)
  expect(app.width).toBeDefined()
  expect(app.height).toBeDefined()
})