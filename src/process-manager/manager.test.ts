import { test, expect, describe, beforeEach, afterEach } from "bun:test"
import { Effect } from "effect"
import { ProcessManager, ProcessManagerLive, ProcessStatus, ProcessConfig } from "./index.js"

describe("ProcessManager", () => {
  describe("process lifecycle", () => {
    test("should start a process", async () => {
      const config: ProcessConfig = {
        id: "test-process",
        command: "echo",
        args: ["hello", "world"],
        cwd: process.cwd(),
        env: process.env
      }

      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const manager = yield* ProcessManager
          const processHandle = yield* manager.start(config)
          const status = yield* manager.getStatus(processHandle.id)
          return { processHandle, status }
        }).pipe(
          Effect.provide(ProcessManagerLive)
        )
      )

      expect(result.processHandle.id).toBe("test-process")
      expect(result.status).toBe(ProcessStatus.RUNNING)
    })

    test("should stop a process", async () => {
      const config: ProcessConfig = {
        id: "stoppable-process",
        command: "sleep",
        args: ["10"], // Long running process
        cwd: process.cwd(),
        env: process.env
      }

      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const manager = yield* ProcessManager
          const processHandle = yield* manager.start(config)
          
          // Give it a moment to start
          yield* Effect.sleep(100)
          
          yield* manager.stop(processHandle.id)
          const status = yield* manager.getStatus(processHandle.id)
          
          return status
        }).pipe(
          Effect.provide(ProcessManagerLive)
        )
      )

      expect(result).toBe(ProcessStatus.STOPPED)
    })

    test("should restart a process", async () => {
      const config: ProcessConfig = {
        id: "restartable-process",
        command: "echo",
        args: ["restart-test"],
        cwd: process.cwd(),
        env: process.env
      }

      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const manager = yield* ProcessManager
          const initialHandle = yield* manager.start(config)
          
          // Wait for completion
          yield* Effect.sleep(100)
          
          const restartedHandle = yield* manager.restart(initialHandle.id)
          const status = yield* manager.getStatus(restartedHandle.id)
          
          return { initialId: initialHandle.id, restartedId: restartedHandle.id, status }
        }).pipe(
          Effect.provide(ProcessManagerLive)
        )
      )

      expect(result.initialId).toBe(result.restartedId)
      expect(result.status).toBe(ProcessStatus.RUNNING)
    })
  })

  describe("process monitoring", () => {
    test("should list running processes", async () => {
      const config1: ProcessConfig = {
        id: "monitor-process-1",
        command: "sleep",
        args: ["1"],
        cwd: process.cwd(),
        env: process.env
      }

      const config2: ProcessConfig = {
        id: "monitor-process-2", 
        command: "sleep",
        args: ["1"],
        cwd: process.cwd(),
        env: process.env
      }

      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const manager = yield* ProcessManager
          yield* manager.start(config1)
          yield* manager.start(config2)
          
          const processes = yield* manager.listProcesses()
          return processes.map(p => p.id)
        }).pipe(
          Effect.provide(ProcessManagerLive)
        )
      )

      expect(result).toContain("monitor-process-1")
      expect(result).toContain("monitor-process-2")
    })

    test("should get process metrics", async () => {
      const config: ProcessConfig = {
        id: "metrics-process",
        command: "echo",
        args: ["metrics-test"],
        cwd: process.cwd(),
        env: process.env
      }

      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const manager = yield* ProcessManager
          const handle = yield* manager.start(config)
          
          // Wait for process to complete
          yield* Effect.sleep(100)
          
          const metrics = yield* manager.getMetrics(handle.id)
          return metrics
        }).pipe(
          Effect.provide(ProcessManagerLive)
        )
      )

      expect(result.processId).toBe("metrics-process")
      expect(result.startTime).toBeDefined()
      expect(typeof result.cpu).toBe("number")
      expect(typeof result.memory).toBe("number")
    })

    test("should handle process failure", async () => {
      const config: ProcessConfig = {
        id: "failing-process",
        command: "exit",
        args: ["1"], // Non-zero exit code
        cwd: process.cwd(),
        env: process.env
      }

      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const manager = yield* ProcessManager
          const handle = yield* manager.start(config)
          
          // Wait for process to fail
          yield* Effect.sleep(200)
          
          const status = yield* manager.getStatus(handle.id)
          return status
        }).pipe(
          Effect.provide(ProcessManagerLive)
        )
      )

      expect(result).toBe(ProcessStatus.FAILED)
    })
  })

  describe("process configuration", () => {
    test("should respect working directory", async () => {
      const config: ProcessConfig = {
        id: "cwd-process",
        command: "pwd",
        args: [],
        cwd: "/tmp",
        env: process.env
      }

      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const manager = yield* ProcessManager
          const handle = yield* manager.start(config)
          
          // Wait for completion
          yield* Effect.sleep(100)
          
          const logs = yield* manager.getLogs(handle.id)
          return logs.stdout.trim()
        }).pipe(
          Effect.provide(ProcessManagerLive)
        )
      )

      expect(result).toBe("/tmp")
    })

    test("should use custom environment variables", async () => {
      const config: ProcessConfig = {
        id: "env-process",
        command: "printenv",
        args: ["CUSTOM_VAR"],
        cwd: process.cwd(),
        env: { ...process.env, CUSTOM_VAR: "test-value" }
      }

      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const manager = yield* ProcessManager
          const handle = yield* manager.start(config)
          
          // Wait for completion
          yield* Effect.sleep(100)
          
          const logs = yield* manager.getLogs(handle.id)
          return logs.stdout.trim()
        }).pipe(
          Effect.provide(ProcessManagerLive)
        )
      )

      expect(result).toBe("test-value")
    })
  })

  describe("auto-restart functionality", () => {
    test("should auto-restart failed processes when enabled", async () => {
      let attemptCount = 0

      const config: ProcessConfig = {
        id: "auto-restart-process",
        command: "sh",
        args: ["-c", `if [ ${++attemptCount} -lt 2 ]; then exit 1; else echo success; fi`],
        cwd: process.cwd(),
        env: process.env,
        autoRestart: true,
        maxRestarts: 2
      }

      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const manager = yield* ProcessManager
          const handle = yield* manager.start(config)
          
          // Wait for auto-restart to occur
          yield* Effect.sleep(500)
          
          const status = yield* manager.getStatus(handle.id)
          const restartCount = yield* manager.getRestartCount(handle.id)
          
          return { status, restartCount }
        }).pipe(
          Effect.provide(ProcessManagerLive)
        )
      )

      expect(result.restartCount).toBeGreaterThan(0)
      expect(result.restartCount).toBeLessThanOrEqual(2)
    })

    test("should not exceed max restart limit", async () => {
      const config: ProcessConfig = {
        id: "max-restart-process",
        command: "exit",
        args: ["1"], // Always fail
        cwd: process.cwd(),
        env: process.env,
        autoRestart: true,
        maxRestarts: 1
      }

      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const manager = yield* ProcessManager
          const handle = yield* manager.start(config)
          
          // Wait for restarts to exhaust
          yield* Effect.sleep(1000)
          
          const status = yield* manager.getStatus(handle.id)
          const restartCount = yield* manager.getRestartCount(handle.id)
          
          return { status, restartCount }
        }).pipe(
          Effect.provide(ProcessManagerLive)
        )
      )

      expect(result.status).toBe(ProcessStatus.FAILED)
      expect(result.restartCount).toBe(1)
    })
  })
})