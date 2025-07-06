/**
 * Plugin Testing Demo
 * 
 * Demonstrates how to test CLI plugins
 */

import {
  createMockPluginContext,
  testPluginCommand,
  testPluginHook,
  testServiceRegistration,
  executeWithPlugins
} from "../../src/cli/plugin-test-utils"
import { definePlugin } from "../../src/cli/plugin"
import { defineConfig } from "../../src/cli/config"
import { z } from "zod"

// Example plugin to test
const mathPlugin = definePlugin({
  metadata: {
    name: "math",
    version: "1.0.0",
    description: "Math operations plugin"
  },
  
  commands: {
    add: {
      description: "Add two numbers",
      args: {
        a: z.number().describe("First number"),
        b: z.number().describe("Second number")
      },
      handler: (args) => {
        const result = args.a + args.b
        console.log(`${args.a} + ${args.b} = ${result}`)
        return result
      }
    },
    
    multiply: {
      description: "Multiply two numbers",
      args: {
        a: z.number().describe("First number"),
        b: z.number().describe("Second number")
      },
      handler: (args) => {
        const result = args.a * args.b
        console.log(`${args.a} × ${args.b} = ${result}`)
        return result
      }
    }
  },
  
  hooks: {
    beforeCommand: (command, args) => {
      console.log(`[Math Plugin] Executing command: ${command.join(' ')}`)
    },
    
    afterCommand: (command, args, result) => {
      console.log(`[Math Plugin] Command completed with result: ${result}`)
    }
  },
  
  install: (context) => {
    console.log("[Math Plugin] Installing...")
    
    // Register a calculation service
    if ((context as any).provideService) {
      (context as any).provideService("calculator", {
        add: (a: number, b: number) => a + b,
        multiply: (a: number, b: number) => a * b,
        divide: (a: number, b: number) => b !== 0 ? a / b : null,
        subtract: (a: number, b: number) => a - b
      })
    }
  },
  
  uninstall: (context) => {
    console.log("[Math Plugin] Uninstalling...")
  }
})

// Demo: Testing the plugin
async function runTests() {
  console.log("=== Plugin Testing Demo ===\n")
  
  // Test 1: Mock Plugin Context
  console.log("1. Testing Mock Plugin Context:")
  const ctx = createMockPluginContext({
    config: { debug: true }
  })
  console.log("Created context with config:", ctx.config)
  console.log()
  
  // Test 2: Test Command Execution
  console.log("2. Testing Command Execution:")
  try {
    const addResult = await testPluginCommand(mathPlugin, ["add"], { a: 5, b: 3 })
    console.log("Add command result:", addResult)
    
    const multiplyResult = await testPluginCommand(mathPlugin, ["multiply"], { a: 4, b: 7 })
    console.log("Multiply command result:", multiplyResult)
  } catch (error) {
    console.error("Command test failed:", error)
  }
  console.log()
  
  // Test 3: Test Hooks
  console.log("3. Testing Hooks:")
  const hookResult = await testPluginHook(
    mathPlugin,
    "beforeCommand",
    ["add"],
    { a: 10, b: 20 }
  )
  console.log("Hook was called:", hookResult.called)
  console.log("Hook args:", hookResult.args)
  console.log()
  
  // Test 4: Test Service Registration
  console.log("4. Testing Service Registration:")
  const services = testServiceRegistration(mathPlugin)
  console.log("Registered services:", Array.from(services.keys()))
  const calculator = services.get("calculator")
  if (calculator) {
    console.log("Calculator service methods:", Object.keys(calculator))
    console.log("Testing calculator.add(10, 5):", calculator.add(10, 5))
  }
  console.log()
  
  // Test 5: Full CLI Execution with Plugin
  console.log("5. Testing Full CLI Execution:")
  const baseConfig = defineConfig({
    name: "test-cli",
    version: "1.0.0",
    description: "Test CLI for plugin demo",
    commands: {
      version: {
        description: "Show version",
        handler: (args) => {
          console.log("Test CLI v1.0.0")
          return "1.0.0"
        }
      }
    }
  })
  
  try {
    // Test base command
    console.log("Executing base command 'version':")
    await executeWithPlugins(baseConfig, [mathPlugin], ["version"])
    
    // Test plugin command
    console.log("\nExecuting plugin command 'add 15 25':")
    const result = await executeWithPlugins(baseConfig, [mathPlugin], ["add", "15", "25"])
    console.log("Final result:", result)
  } catch (error) {
    console.error("Execution failed:", error)
  }
  console.log()
  
  // Test 6: Error Handling
  console.log("6. Testing Error Handling:")
  const errorPlugin = definePlugin({
    metadata: {
      name: "error-test",
      version: "1.0.0"
    },
    commands: {
      fail: {
        description: "Command that fails",
        handler: (args) => {
          throw new Error("Intentional failure for testing")
        }
      }
    },
    hooks: {
      onError: (error, command, args) => {
        console.log(`[Error Plugin] Caught error in command '${command.join(' ')}':`, error.message)
      }
    }
  })
  
  try {
    await executeWithPlugins(baseConfig, [errorPlugin], ["fail"])
  } catch (error) {
    console.log("Expected error was thrown and handled")
  }
  
  console.log("\n=== Testing Complete ===")
}

// Run tests if executed directly
if (typeof Bun !== 'undefined' && import.meta.path === Bun.main) {
  runTests().catch(console.error)
}