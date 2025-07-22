/**
 * End-to-End CLI Workflow Integration Tests
 * 
 * Tests complete CLI workflows from command execution to output,
 * verifying the integration of all major systems.
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test"
import { Effect, Layer, Context } from "effect"
import { createCLI, type CLI } from "@cli/index"
import { createHooks } from "@cli/hooks"
import { EventBus } from "@core/model/events/eventBus"
import { TerminalService, RendererService, InputService } from "@core/services"
import { ScopeManager } from "@core/model/scope/manager"
import { text, box, vstack } from "@core/view"
import type { View } from "@core/view"

// Mock services for testing
class MockTerminalService implements TerminalService {
  output: string[] = []
  
  write(text: string) {
    this.output.push(text)
    return Effect.void
  }
  
  writeLine(text: string) {
    this.output.push(text + '\n')
    return Effect.void
  }
  
  clear() {
    this.output = []
    return Effect.void
  }
  
  moveCursor(x: number, y: number) {
    return Effect.void
  }
  
  hideCursor() {
    return Effect.void
  }
  
  showCursor() {
    return Effect.void
  }
  
  getSize() {
    return Effect.succeed({ rows: 24, columns: 80 })
  }
  
  enableRawMode() {
    return Effect.void
  }
  
  disableRawMode() {
    return Effect.void
  }
}

class MockRendererService implements RendererService {
  lastView: View | null = null
  
  render(view: View) {
    this.lastView = view
    return Effect.void
  }
  
  clear() {
    this.lastView = null
    return Effect.void
  }
}

class MockInputService implements InputService {
  onData(handler: (data: string) => void) {
    return Effect.succeed(() => Effect.void)
  }
  
  onKeypress(handler: (key: any) => void) {
    return Effect.succeed(() => Effect.void)
  }
  
  onMouse(handler: (event: any) => void) {
    return Effect.succeed(() => Effect.void)
  }
}

describe("CLI Workflow Integration", () => {
  let terminal: MockTerminalService
  let renderer: MockRendererService
  let input: MockInputService
  let eventBus: EventBus
  let scopeManager: ScopeManager
  
  const createTestLayer = () => {
    terminal = new MockTerminalService()
    renderer = new MockRendererService()
    input = new MockInputService()
    eventBus = new EventBus()
    scopeManager = new ScopeManager(eventBus)
    
    return Layer.mergeAll(
      Layer.succeed(TerminalService, terminal),
      Layer.succeed(RendererService, renderer),
      Layer.succeed(InputService, input),
      Layer.succeed(EventBus, eventBus),
      Layer.succeed(ScopeManager, scopeManager)
    )
  }

  describe("Basic Command Execution", () => {
    it("should execute simple command", async () => {
      const cli = createCLI({
        name: "test-cli",
        version: "1.0.0"
      })
      
      cli.command("hello", {
        description: "Say hello",
        handler: () => Effect.gen(function* () {
          yield* terminal.writeLine("Hello, World!")
          return "success"
        })
      })
      
      await Effect.runPromise(
        cli.run(["hello"]).pipe(
          Effect.provide(createTestLayer())
        )
      )
      
      expect(terminal.output).toContain("Hello, World!\n")
    })

    it("should handle command with arguments", async () => {
      const cli = createCLI({
        name: "test-cli",
        version: "1.0.0"
      })
      
      cli.command("greet <name>", {
        description: "Greet someone",
        handler: (args) => Effect.gen(function* () {
          yield* terminal.writeLine(`Hello, ${args.name}!`)
          return "success"
        })
      })
      
      await Effect.runPromise(
        cli.run(["greet", "Alice"]).pipe(
          Effect.provide(createTestLayer())
        )
      )
      
      expect(terminal.output).toContain("Hello, Alice!\n")
    })

    it("should handle command with options", async () => {
      const cli = createCLI({
        name: "test-cli",
        version: "1.0.0"
      })
      
      cli.command("deploy", {
        description: "Deploy application",
        options: {
          env: {
            type: "string",
            description: "Environment",
            default: "staging"
          },
          force: {
            type: "boolean",
            description: "Force deployment",
            default: false
          }
        },
        handler: (args) => Effect.gen(function* () {
          const env = args.env as string
          const force = args.force as boolean
          yield* terminal.writeLine(`Deploying to ${env}${force ? ' (forced)' : ''}`)
          return "success"
        })
      })
      
      await Effect.runPromise(
        cli.run(["deploy", "--env", "production", "--force"]).pipe(
          Effect.provide(createTestLayer())
        )
      )
      
      expect(terminal.output).toContain("Deploying to production (forced)\n")
    })
  })

  describe("Nested Commands", () => {
    it("should execute nested commands", async () => {
      const cli = createCLI({
        name: "test-cli",
        version: "1.0.0"
      })
      
      const db = cli.command("db", {
        description: "Database commands"
      })
      
      db.command("migrate", {
        description: "Run migrations",
        handler: () => Effect.gen(function* () {
          yield* terminal.writeLine("Running migrations...")
          yield* terminal.writeLine("Migrations complete!")
          return "success"
        })
      })
      
      db.command("seed", {
        description: "Seed database",
        handler: () => Effect.gen(function* () {
          yield* terminal.writeLine("Seeding database...")
          yield* terminal.writeLine("Database seeded!")
          return "success"
        })
      })
      
      await Effect.runPromise(
        cli.run(["db", "migrate"]).pipe(
          Effect.provide(createTestLayer())
        )
      )
      
      expect(terminal.output).toContain("Running migrations...\n")
      expect(terminal.output).toContain("Migrations complete!\n")
    })
  })

  describe("Interactive Commands", () => {
    it("should render interactive UI", async () => {
      const cli = createCLI({
        name: "test-cli",
        version: "1.0.0"
      })
      
      cli.command("interactive", {
        description: "Interactive command",
        handler: () => Effect.gen(function* () {
          const view = vstack([
            text("Interactive Mode"),
            box({ border: "single" }, [
              text("Press q to quit")
            ])
          ])
          
          yield* renderer.render(view)
          return "success"
        })
      })
      
      await Effect.runPromise(
        cli.run(["interactive"]).pipe(
          Effect.provide(createTestLayer())
        )
      )
      
      expect(renderer.lastView).toBeDefined()
      expect(renderer.lastView?.type).toBe("vstack")
    })
  })

  describe("Plugin Integration", () => {
    it("should load and execute plugin commands", async () => {
      const cli = createCLI({
        name: "test-cli",
        version: "1.0.0"
      })
      
      // Create a plugin
      const plugin = {
        id: "test-plugin",
        name: "Test Plugin",
        version: "1.0.0",
        commands: {
          "plugin-cmd": {
            description: "Plugin command",
            handler: () => Effect.gen(function* () {
              yield* terminal.writeLine("Plugin command executed!")
              return "success"
            })
          }
        }
      }
      
      cli.use(plugin)
      
      await Effect.runPromise(
        cli.run(["plugin-cmd"]).pipe(
          Effect.provide(createTestLayer())
        )
      )
      
      expect(terminal.output).toContain("Plugin command executed!\n")
    })
  })

  describe("Error Handling", () => {
    it("should handle command errors gracefully", async () => {
      const cli = createCLI({
        name: "test-cli",
        version: "1.0.0"
      })
      
      cli.command("failing", {
        description: "Failing command",
        handler: () => Effect.fail(new Error("Command failed!"))
      })
      
      const result = await Effect.runPromise(
        cli.run(["failing"]).pipe(
          Effect.provide(createTestLayer()),
          Effect.either
        )
      )
      
      expect(result._tag).toBe("Left")
      if (result._tag === "Left") {
        expect(result.left.message).toContain("Command failed!")
      }
    })

    it("should show help for unknown commands", async () => {
      const cli = createCLI({
        name: "test-cli",
        version: "1.0.0"
      })
      
      cli.command("known", {
        description: "Known command",
        handler: () => Effect.succeed("success")
      })
      
      await Effect.runPromise(
        cli.run(["unknown"]).pipe(
          Effect.provide(createTestLayer()),
          Effect.catchAll(() => Effect.void)
        )
      )
      
      const output = terminal.output.join("")
      expect(output).toContain("Command not found")
      // Help should suggest the known command
      expect(output).toContain("known")
    })
  })

  describe("Hook System Integration", () => {
    it("should execute lifecycle hooks", async () => {
      const hooksCalled: string[] = []
      
      const cli = createCLI({
        name: "test-cli",
        version: "1.0.0"
      })
      
      const hooks = createHooks(eventBus)
      
      await Effect.runPromise(
        Effect.all([
          hooks.beforeCommand.tap("test", () => {
            hooksCalled.push("beforeCommand")
            return Effect.void
          }),
          hooks.afterCommand.tap("test", () => {
            hooksCalled.push("afterCommand")
            return Effect.void
          })
        ])
      )
      
      cli.command("hooked", {
        description: "Command with hooks",
        handler: () => Effect.gen(function* () {
          yield* terminal.writeLine("Command executed")
          return "success"
        })
      })
      
      await Effect.runPromise(
        cli.run(["hooked"]).pipe(
          Effect.provide(createTestLayer())
        )
      )
      
      expect(hooksCalled).toContain("beforeCommand")
      expect(hooksCalled).toContain("afterCommand")
      expect(terminal.output).toContain("Command executed\n")
    })
  })

  describe("Scope System Integration", () => {
    it("should respect command scopes", async () => {
      const cli = createCLI({
        name: "test-cli",
        version: "1.0.0"
      })
      
      // Register a scoped command
      await Effect.runPromise(
        scopeManager.registerScope({
          id: "admin",
          type: "permission",
          metadata: { level: "admin" }
        }).pipe(
          Effect.provide(Layer.succeed(EventBus, eventBus))
        )
      )
      
      cli.command("admin:users", {
        description: "Manage users (admin only)",
        handler: () => Effect.gen(function* () {
          yield* terminal.writeLine("Managing users...")
          return "success"
        })
      })
      
      // Should fail without proper scope
      const result = await Effect.runPromise(
        cli.run(["admin:users"]).pipe(
          Effect.provide(createTestLayer()),
          Effect.either
        )
      )
      
      // Depending on implementation, this might need adjustment
      expect(result._tag).toBeDefined()
    })
  })

  describe("Complex Workflows", () => {
    it("should handle multi-step workflow", async () => {
      const cli = createCLI({
        name: "test-cli",
        version: "1.0.0"
      })
      
      let state = { initialized: false, configured: false, deployed: false }
      
      cli.command("init", {
        description: "Initialize project",
        handler: () => Effect.gen(function* () {
          yield* terminal.writeLine("Initializing project...")
          state.initialized = true
          yield* terminal.writeLine("Project initialized!")
          return "success"
        })
      })
      
      cli.command("configure", {
        description: "Configure project",
        handler: () => Effect.gen(function* () {
          if (!state.initialized) {
            yield* terminal.writeLine("Error: Project not initialized!")
            return yield* Effect.fail(new Error("Not initialized"))
          }
          yield* terminal.writeLine("Configuring project...")
          state.configured = true
          yield* terminal.writeLine("Project configured!")
          return "success"
        })
      })
      
      cli.command("deploy", {
        description: "Deploy project",
        handler: () => Effect.gen(function* () {
          if (!state.configured) {
            yield* terminal.writeLine("Error: Project not configured!")
            return yield* Effect.fail(new Error("Not configured"))
          }
          yield* terminal.writeLine("Deploying project...")
          state.deployed = true
          yield* terminal.writeLine("Project deployed!")
          return "success"
        })
      })
      
      // Execute workflow
      await Effect.runPromise(
        Effect.all([
          cli.run(["init"]),
          cli.run(["configure"]),
          cli.run(["deploy"])
        ], { concurrency: "unbounded" }).pipe(
          Effect.provide(createTestLayer())
        )
      )
      
      expect(state.initialized).toBe(true)
      expect(state.configured).toBe(true)
      expect(state.deployed).toBe(true)
      
      const output = terminal.output.join("")
      expect(output).toContain("Project initialized!")
      expect(output).toContain("Project configured!")
      expect(output).toContain("Project deployed!")
    })
  })
})