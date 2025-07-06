/**
 * Debug router to see what's working
 */

import { describe, it, expect } from "bun:test"

describe("Debug Router", () => {
  it("imports router correctly", () => {
    const { CLIRouter, Router } = require("@/cli/router")
    
    expect(CLIRouter).toBeDefined()
    expect(Router).toBeDefined()
    expect(Router).toBe(CLIRouter)
  })

  it("creates router instance", () => {
    const { Router } = require("@/cli/router")
    
    const config = {
      name: "test",
      version: "1.0.0",
      commands: {
        hello: {
          description: "Say hello",
          handler: async () => ({ message: "Hello" })
        }
      }
    }
    
    const router = new Router(config)
    expect(router).toBeDefined()
    
    // Check methods exist
    expect(typeof router.getCommands).toBe("function")
    expect(typeof router.addCommand).toBe("function")
    expect(typeof router.getCommand).toBe("function")
    expect(typeof router.execute).toBe("function")
    
    // Test basic functionality
    const commands = router.getCommands()
    expect(commands).toContain("hello")
  })
})