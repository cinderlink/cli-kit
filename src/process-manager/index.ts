/**
 * Process Manager Module
 *
 * Effect-based process management service
 */

import { Effect, Context, Layer } from 'effect'
import type {
  ProcessConfig,
  ProcessState,
  ProcessStatus,
  ProcessLog,
  ProcessManagerConfig,
} from './types'

// Re-export all types
export type {
  ProcessConfig,
  ProcessState,
  ProcessStatus,
  ProcessLog,
  ProcessManagerConfig,
} from './types'

// Export the native process manager class (for direct usage)
export { ProcessManager as ProcessManagerClass } from './manager'
export { setupManagedProcess } from './manager'

/**
 * Process handle returned by the service
 */
export interface ProcessHandle {
  readonly id: string
  readonly pid: number
  readonly status: ProcessStatus
}

/**
 * Process metrics
 */
export interface ProcessMetrics {
  processId: string
  startTime: Date
  cpu: number
  memory: number
  uptime: number
}

/**
 * Process logs
 */
export interface ProcessLogs {
  stdout: string
  stderr: string
}

/**
 * Process Manager Service Interface
 */
export interface ProcessManagerService {
  readonly start: (config: ProcessConfig) => Effect.Effect<ProcessHandle, Error>
  readonly stop: (processId: string) => Effect.Effect<void, Error>
  readonly restart: (processId: string) => Effect.Effect<ProcessHandle, Error>
  readonly getStatus: (processId: string) => Effect.Effect<ProcessStatus, Error>
  readonly listProcesses: () => Effect.Effect<ReadonlyArray<ProcessHandle>, Error>
  readonly getMetrics: (processId: string) => Effect.Effect<ProcessMetrics, Error>
  readonly getLogs: (processId: string) => Effect.Effect<ProcessLogs, Error>
  readonly getRestartCount: (processId: string) => Effect.Effect<number, Error>
}

/**
 * Process Manager Context Tag
 */
export const ProcessManager = Context.GenericTag<ProcessManagerService>('ProcessManager')

/**
 * Process Manager Layer Implementation
 */
export const ProcessManagerLive = Layer.effect(
  ProcessManager,
  Effect.gen(function* () {
    const { ProcessManager: ProcessManagerClass } = yield* Effect.promise(() => import('./manager'))

    // Create the underlying process manager instance
    const manager = new ProcessManagerClass()
    yield* Effect.promise(() => manager.init())

    const service: ProcessManagerService = {
      start: (config: ProcessConfig) =>
        Effect.tryPromise({
          try: async () => {
            // Normalize the config - if id is provided but name is not, use id as name
            const processName = config.name || config.id
            if (!processName) {
              throw new Error('Process must have either name or id')
            }

            const normalizedConfig = {
              ...config,
              name: processName,
              autorestart: config.autorestart || config.autoRestart,
            }

            // Check if process already exists
            if (!manager.list().find(p => p.name === processName)) {
              // Add the process configuration first
              await manager.add(normalizedConfig)
            }

            // Then start it
            await manager.start(processName)

            // Get the process status to build the handle
            const processState = manager.list().find(p => p.name === processName)
            if (!processState) {
              throw new Error(`Process ${processName} not found after start`)
            }

            return {
              id: processState.name,
              pid: processState.pid || 0,
              status: processState.status as ProcessStatus,
            }
          },
          catch: error => new Error(`Failed to start process: ${error}`),
        }),

      stop: (processId: string) =>
        Effect.tryPromise({
          try: () => manager.stop(processId),
          catch: error => new Error(`Failed to stop process: ${error}`),
        }),

      restart: (processId: string) =>
        Effect.tryPromise({
          try: async () => {
            await manager.restart(processId)

            // Get the process status to build the handle
            const processState = manager.list().find(p => p.name === processId)
            if (!processState) {
              throw new Error(`Process ${processId} not found after restart`)
            }

            return {
              id: processState.name,
              pid: processState.pid || 0,
              status: processState.status as ProcessStatus,
            }
          },
          catch: error => new Error(`Failed to restart process: ${error}`),
        }),

      getStatus: (processId: string) =>
        Effect.try({
          try: () => {
            const processState = manager.list().find(p => p.name === processId)
            if (!processState) {
              throw new Error(`Process ${processId} not found`)
            }
            return processState.status as ProcessStatus
          },
          catch: error => new Error(`Failed to get process status: ${error}`),
        }),

      listProcesses: () =>
        Effect.try({
          try: () => {
            const processes = manager.list()
            return processes.map(p => ({
              id: p.name,
              pid: p.pid || 0,
              status: p.status as ProcessStatus,
            }))
          },
          catch: error => new Error(`Failed to list processes: ${error}`),
        }),

      getMetrics: (processId: string) =>
        Effect.try({
          try: () => {
            const processState = manager.list().find(p => p.name === processId)
            if (!processState) {
              throw new Error(`Process ${processId} not found`)
            }

            return {
              processId: processState.name,
              startTime: processState.startTime || new Date(),
              cpu: processState.cpu || 0,
              memory: processState.memory || 0,
              uptime: processState.startTime ? Date.now() - processState.startTime.getTime() : 0,
            }
          },
          catch: error => new Error(`Failed to get process metrics: ${error}`),
        }),

      getLogs: (processId: string) =>
        Effect.try({
          try: () => {
            const logs = manager.getLogs(processId)
            const stdout = logs
              .filter(l => l.source === 'stdout')
              .map(l => l.message)
              .join('\n')
            const stderr = logs
              .filter(l => l.source === 'stderr')
              .map(l => l.message)
              .join('\n')

            return {
              stdout,
              stderr,
            }
          },
          catch: error => new Error(`Failed to get process logs: ${error}`),
        }),

      getRestartCount: (processId: string) =>
        Effect.try({
          try: () => {
            const processState = manager.list().find(p => p.name === processId)
            if (!processState) {
              throw new Error(`Process ${processId} not found`)
            }
            return processState.restarts
          },
          catch: error => new Error(`Failed to get restart count: ${error}`),
        }),
    }

    return service
  })
)

// Export process manager creation utilities (for non-Effect usage)
export async function createProcessManager(
  config?: ProcessManagerConfig,
  cwd?: string
): Promise<import('./manager').ProcessManager> {
  const { ProcessManager } = await import('./manager')
  const manager = new ProcessManager(config, cwd)
  await manager.init()
  return manager
}

// Export components
export { ProcessMonitor } from './components/ProcessMonitor'

// Export the plugin
export { ProcessManagerPlugin } from './Plugin'

// Constants
export * from './constants'

// For backward compatibility, also export the module implementation
export { ProcessManagerModule } from './module'
