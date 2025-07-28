import { test, expect, describe, beforeEach, afterEach } from 'bun:test'
import { Effect } from 'effect'
import { ProcessManager, ProcessManagerLive } from './index'
import type { ProcessStatus, ProcessConfig } from './types'

describe('ProcessManager', () => {
  describe('process lifecycle', () => {
    test('should start a process', async () => {
      const config: ProcessConfig = {
        id: 'test-process',
        name: 'test-process',
        command: process.platform === 'win32' ? 'cmd' : 'node',
        args:
          process.platform === 'win32'
            ? ['/c', 'echo hello world']
            : ['-e', 'console.log("hello world")'],
        cwd: process.cwd(),
        env: process.env,
      }

      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const manager = yield* ProcessManager
          const processHandle = yield* manager.start(config)
          const status = yield* manager.getStatus(processHandle.id)
          return { processHandle, status }
        }).pipe(Effect.provide(ProcessManagerLive))
      )

      expect(result.processHandle.id).toBe('test-process')
      expect(result.status).toBe('running')
    })

    test('should stop a process', async () => {
      const config: ProcessConfig = {
        id: 'stoppable-process',
        name: 'stoppable-process',
        command: process.platform === 'win32' ? 'cmd' : 'node',
        args:
          process.platform === 'win32'
            ? ['/c', 'timeout /t 10 /nobreak']
            : ['-e', 'setTimeout(() => {}, 10000)'],
        cwd: process.cwd(),
        env: process.env,
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
        }).pipe(Effect.provide(ProcessManagerLive))
      )

      expect(result).toBe('stopped')
    })

    test('should restart a process', async () => {
      const config: ProcessConfig = {
        id: 'restartable-process',
        name: 'restartable-process',
        command: process.platform === 'win32' ? 'cmd' : 'node',
        args:
          process.platform === 'win32'
            ? ['/c', 'echo restart-test']
            : ['-e', 'console.log("restart-test")'],
        cwd: process.cwd(),
        env: process.env,
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
        }).pipe(Effect.provide(ProcessManagerLive))
      )

      expect(result.initialId).toBe(result.restartedId)
      expect(result.status).toBe('running')
    })
  })

  describe('process monitoring', () => {
    test('should list running processes', async () => {
      const config1: ProcessConfig = {
        id: 'monitor-process-1',
        name: 'monitor-process-1',
        command: process.platform === 'win32' ? 'cmd' : 'node',
        args:
          process.platform === 'win32'
            ? ['/c', 'timeout /t 1 /nobreak']
            : ['-e', 'setTimeout(() => {}, 1000)'],
        cwd: process.cwd(),
        env: process.env,
      }

      const config2: ProcessConfig = {
        id: 'monitor-process-2',
        name: 'monitor-process-2',
        command: process.platform === 'win32' ? 'cmd' : 'node',
        args:
          process.platform === 'win32'
            ? ['/c', 'timeout /t 1 /nobreak']
            : ['-e', 'setTimeout(() => {}, 1000)'],
        cwd: process.cwd(),
        env: process.env,
      }

      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const manager = yield* ProcessManager
          yield* manager.start(config1)
          yield* manager.start(config2)

          const processes = yield* manager.listProcesses()
          return processes.map(p => p.id)
        }).pipe(Effect.provide(ProcessManagerLive))
      )

      expect(result).toContain('monitor-process-1')
      expect(result).toContain('monitor-process-2')
    })

    test('should get process metrics', async () => {
      const config: ProcessConfig = {
        id: 'metrics-process',
        name: 'metrics-process',
        command: process.platform === 'win32' ? 'cmd' : 'node',
        args:
          process.platform === 'win32'
            ? ['/c', 'echo metrics-test']
            : ['-e', 'console.log("metrics-test")'],
        cwd: process.cwd(),
        env: process.env,
      }

      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const manager = yield* ProcessManager
          const handle = yield* manager.start(config)

          // Wait for process to complete
          yield* Effect.sleep(100)

          const metrics = yield* manager.getMetrics(handle.id)
          return metrics
        }).pipe(Effect.provide(ProcessManagerLive))
      )

      expect(result.processId).toBe('metrics-process')
      expect(result.startTime).toBeDefined()
      expect(typeof result.cpu).toBe('number')
      expect(typeof result.memory).toBe('number')
    })

    test('should handle process failure', async () => {
      const config: ProcessConfig = {
        id: 'failing-process',
        name: 'failing-process',
        command: process.platform === 'win32' ? 'cmd' : 'node',
        args: process.platform === 'win32' ? ['/c', 'exit /b 1'] : ['-e', 'process.exit(1)'],
        cwd: process.cwd(),
        env: process.env,
      }

      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const manager = yield* ProcessManager
          const handle = yield* manager.start(config)

          // Wait for process to fail
          yield* Effect.sleep(200)

          const status = yield* manager.getStatus(handle.id)
          return status
        }).pipe(Effect.provide(ProcessManagerLive))
      )

      expect(result).toBe('error')
    })
  })

  describe('process configuration', () => {
    test('should respect working directory', async () => {
      const config: ProcessConfig = {
        id: 'cwd-process',
        name: 'cwd-process',
        command: process.platform === 'win32' ? 'cmd' : 'node',
        args: process.platform === 'win32' ? ['/c', 'cd'] : ['-e', 'console.log(process.cwd())'],
        cwd: process.platform === 'win32' ? process.env.TEMP || 'C:\\temp' : '/tmp',
        env: process.env,
      }

      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const manager = yield* ProcessManager
          const handle = yield* manager.start(config)

          // Wait for completion
          yield* Effect.sleep(100)

          const logs = yield* manager.getLogs(handle.id)
          return logs.stdout.trim()
        }).pipe(Effect.provide(ProcessManagerLive))
      )

      const expectedPath =
        process.platform === 'win32'
          ? process.env.TEMP || 'C:\\temp'
          : result.includes('/private/tmp')
            ? '/private/tmp'
            : '/tmp'
      expect(result.replace(/\\+/g, '/')).toMatch(/\/tmp$|C:\/temp/)
    })

    test('should use custom environment variables', async () => {
      const config: ProcessConfig = {
        id: 'env-process',
        name: 'env-process',
        command: process.platform === 'win32' ? 'cmd' : 'node',
        args:
          process.platform === 'win32'
            ? ['/c', 'echo %CUSTOM_VAR%']
            : ['-e', 'console.log(process.env.CUSTOM_VAR)'],
        cwd: process.cwd(),
        env: { ...process.env, CUSTOM_VAR: 'test-value' },
      }

      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const manager = yield* ProcessManager
          const handle = yield* manager.start(config)

          // Wait for completion
          yield* Effect.sleep(100)

          const logs = yield* manager.getLogs(handle.id)
          return logs.stdout.trim()
        }).pipe(Effect.provide(ProcessManagerLive))
      )

      expect(result).toBe('test-value')
    })
  })

  describe('auto-restart functionality', () => {
    test('should auto-restart failed processes when enabled', async () => {
      let attemptCount = 0

      const config: ProcessConfig = {
        id: 'auto-restart-process',
        name: 'auto-restart-process',
        command: process.platform === 'win32' ? 'cmd' : 'node',
        args:
          process.platform === 'win32'
            ? ['/c', 'exit /b 1'] // Always fail on Windows
            : ['-e', 'process.exit(1)'], // Always fail on Unix
        cwd: process.cwd(),
        env: process.env,
        autoRestart: true,
        maxRestarts: 2,
      }

      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const manager = yield* ProcessManager
          const handle = yield* manager.start(config)

          // Wait for auto-restart to occur (longer delay for restart logic)
          yield* Effect.sleep(1500)

          const status = yield* manager.getStatus(handle.id)
          const restartCount = yield* manager.getRestartCount(handle.id)

          return { status, restartCount }
        }).pipe(Effect.provide(ProcessManagerLive))
      )

      expect(result.restartCount).toBeGreaterThan(0)
      expect(result.restartCount).toBeLessThanOrEqual(2)
    })

    test('should not exceed max restart limit', async () => {
      const config: ProcessConfig = {
        id: 'max-restart-process',
        name: 'max-restart-process',
        command: process.platform === 'win32' ? 'cmd' : 'node',
        args: process.platform === 'win32' ? ['/c', 'exit /b 1'] : ['-e', 'process.exit(1)'],
        cwd: process.cwd(),
        env: process.env,
        autoRestart: true,
        maxRestarts: 1,
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
        }).pipe(Effect.provide(ProcessManagerLive))
      )

      expect(result.status).toBe('error')
      expect(result.restartCount).toBe(1)
    })
  })
})
