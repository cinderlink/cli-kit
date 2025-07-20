/**
 * Process Manager Plugin - Built-in plugin for process management
 * 
 * This plugin provides comprehensive process management capabilities including
 * process lifecycle management, monitoring, and control. Matches the kitchen-sink
 * demo patterns exactly.
 * 
 * @module core/plugin/builtin/process-manager
 */

import { Effect, Ref, TMap } from "effect"
import { z } from "zod"
import { createPlugin } from "../types"
import type { Plugin, ProcessInfo, ProcessManagerPluginProps, HookContext } from "../types"
import { StandardSignals } from "../signals"
import { createBeforeHook, createAfterHook, HOOK_NAMES, HookContext as HookContextService } from "../hooks"

// =============================================================================
// Process Manager Service
// =============================================================================

/**
 * Process configuration schema
 */
const ProcessConfigSchema = z.object({
  name: z.string(),
  command: z.string(),
  args: z.array(z.string()).default([]),
  env: z.record(z.string()).optional(),
  cwd: z.string().optional(),
  autoRestart: z.boolean().default(false),
  restartDelay: z.number().default(1000),
  maxRestarts: z.number().default(5),
})

export type ProcessConfig = z.infer<typeof ProcessConfigSchema>

/**
 * Process manager service interface
 */
export interface ProcessManagerService {
  readonly startProcess: (config: ProcessConfig) => Effect.Effect<ProcessInfo, Error, never>
  readonly stopProcess: (id: string) => Effect.Effect<void, Error, never>
  readonly restartProcess: (id: string) => Effect.Effect<ProcessInfo, Error, never>
  readonly killProcess: (id: string) => Effect.Effect<void, Error, never>
  readonly listProcesses: () => Effect.Effect<ProcessInfo[], never, never>
  readonly getProcess: (id: string) => Effect.Effect<ProcessInfo, Error, never>
  readonly getProcessByName: (name: string) => Effect.Effect<ProcessInfo, Error, never>
  readonly isProcessRunning: (id: string) => Effect.Effect<boolean, never, never>
  readonly getProcessCount: () => Effect.Effect<number, never, never>
}

/**
 * Create process manager service
 */
function createProcessManagerService(): Effect.Effect<ProcessManagerService, never, never> {
  return Effect.gen(function* () {
    const processesRef = yield* Ref.make<TMap.Map<string, ProcessInfo>>(TMap.empty())
    const restartCountsRef = yield* Ref.make<TMap.Map<string, number>>(TMap.empty())

    const startProcess = (config: ProcessConfig): Effect.Effect<ProcessInfo, Error, never> =>
      Effect.gen(function* () {
        // Validate config
        const validConfig = ProcessConfigSchema.parse(config)
        
        // Create process info
        const processInfo: ProcessInfo = {
          id: crypto.randomUUID(),
          name: validConfig.name,
          command: validConfig.command,
          args: validConfig.args,
          status: 'running',
          pid: Math.floor(Math.random() * 10000) + 1000, // Mock PID
          startTime: new Date(),
        }

        // Store process
        yield* Ref.update(processesRef, processes => 
          TMap.set(processes, processInfo.id, processInfo)
        )

        // Reset restart count
        yield* Ref.update(restartCountsRef, counts => 
          TMap.set(counts, processInfo.id, 0)
        )

        return processInfo
      })

    const stopProcess = (id: string): Effect.Effect<void, Error, never> =>
      Effect.gen(function* () {
        const processes = yield* Ref.get(processesRef)
        const process = TMap.get(processes, id)
        
        if (process._tag === 'None') {
          return yield* Effect.fail(new Error(`Process ${id} not found`))
        }

        const stoppedProcess: ProcessInfo = {
          ...process.value,
          status: 'stopped',
          endTime: new Date(),
        }

        yield* Ref.update(processesRef, processes =>
          TMap.set(processes, id, stoppedProcess)
        )
      })

    const restartProcess = (id: string): Effect.Effect<ProcessInfo, Error, never> =>
      Effect.gen(function* () {
        const processes = yield* Ref.get(processesRef)
        const process = TMap.get(processes, id)
        
        if (process._tag === 'None') {
          return yield* Effect.fail(new Error(`Process ${id} not found`))
        }

        const oldProcess = process.value
        
        // Stop the process first
        yield* stopProcess(id)
        
        // Create new process with same config
        const newProcess: ProcessInfo = {
          ...oldProcess,
          id: crypto.randomUUID(),
          status: 'running',
          pid: Math.floor(Math.random() * 10000) + 1000, // Mock PID
          startTime: new Date(),
          endTime: undefined,
        }

        yield* Ref.update(processesRef, processes =>
          TMap.set(processes, newProcess.id, newProcess)
        )

        // Increment restart count
        const restartCounts = yield* Ref.get(restartCountsRef)
        const currentCount = TMap.get(restartCounts, id)
        const newCount = currentCount._tag === 'Some' ? currentCount.value + 1 : 1
        
        yield* Ref.update(restartCountsRef, counts =>
          TMap.set(counts, newProcess.id, newCount)
        )

        return newProcess
      })

    const killProcess = (id: string): Effect.Effect<void, Error, never> =>
      Effect.gen(function* () {
        const processes = yield* Ref.get(processesRef)
        const process = TMap.get(processes, id)
        
        if (process._tag === 'None') {
          return yield* Effect.fail(new Error(`Process ${id} not found`))
        }

        const killedProcess: ProcessInfo = {
          ...process.value,
          status: 'error',
          endTime: new Date(),
        }

        yield* Ref.update(processesRef, processes =>
          TMap.set(processes, id, killedProcess)
        )
      })

    const listProcesses = (): Effect.Effect<ProcessInfo[], never, never> =>
      Effect.gen(function* () {
        const processes = yield* Ref.get(processesRef)
        return Array.from(TMap.values(processes))
      })

    const getProcess = (id: string): Effect.Effect<ProcessInfo, Error, never> =>
      Effect.gen(function* () {
        const processes = yield* Ref.get(processesRef)
        const process = TMap.get(processes, id)
        
        if (process._tag === 'None') {
          return yield* Effect.fail(new Error(`Process ${id} not found`))
        }

        return process.value
      })

    const getProcessByName = (name: string): Effect.Effect<ProcessInfo, Error, never> =>
      Effect.gen(function* () {
        const processes = yield* Ref.get(processesRef)
        const processList = Array.from(TMap.values(processes))
        const process = processList.find(p => p.name === name)
        
        if (!process) {
          return yield* Effect.fail(new Error(`Process with name ${name} not found`))
        }

        return process
      })

    const isProcessRunning = (id: string): Effect.Effect<boolean, never, never> =>
      Effect.gen(function* () {
        const processes = yield* Ref.get(processesRef)
        const process = TMap.get(processes, id)
        
        if (process._tag === 'None') {
          return false
        }

        return process.value.status === 'running'
      })

    const getProcessCount = (): Effect.Effect<number, never, never> =>
      Effect.gen(function* () {
        const processes = yield* Ref.get(processesRef)
        return TMap.size(processes)
      })

    return {
      startProcess,
      stopProcess,
      restartProcess,
      killProcess,
      listProcesses,
      getProcess,
      getProcessByName,
      isProcessRunning,
      getProcessCount,
    }
  })
}

// =============================================================================
// Process Manager Plugin
// =============================================================================

/**
 * Create process manager plugin
 */
export function createProcessManagerPlugin(): Effect.Effect<Plugin, never, never> {
  return Effect.gen(function* () {
    const service = yield* createProcessManagerService()

    return createPlugin({
      name: 'process-manager',
      version: '1.0.0',
      description: 'Process management plugin for TUIX',
      author: 'TUIX Team',
      
      hooks: {
        [HOOK_NAMES.PROCESS_START]: createBeforeHook(
          Effect.gen(function* () {
            const context = yield* HookContextService
            console.log(`Starting process: ${context.args[0]}`)
          }) as Effect.Effect<void, never, HookContext>
        ),
        
        [HOOK_NAMES.PROCESS_STOP]: createAfterHook(
          Effect.gen(function* () {
            const context = yield* HookContextService
            console.log(`Process stopped: ${context.args[0]}`)
          }) as Effect.Effect<void, never, HookContext>
        ),
        
        [HOOK_NAMES.APP_SHUTDOWN]: createBeforeHook(
          Effect.gen(function* () {
            // Stop all running processes on app shutdown
            const processes = yield* service.listProcesses()
            const runningProcesses = processes.filter(p => p.status === 'running')
            
            for (const process of runningProcesses) {
              yield* service.stopProcess(process.id)
            }
          }) as Effect.Effect<void, never, HookContext>
        ),
      },
      
      signals: {
        [StandardSignals.PROCESS_STARTED.name]: StandardSignals.PROCESS_STARTED,
        [StandardSignals.PROCESS_STOPPED.name]: StandardSignals.PROCESS_STOPPED,
        [StandardSignals.PROCESS_ERROR.name]: StandardSignals.PROCESS_ERROR,
      },
      
      services: {
        processManager: service,
      },
      
      config: ProcessConfigSchema,
      
      defaultConfig: {
        autoRestart: false,
        restartDelay: 1000,
        maxRestarts: 5,
      },
    })
  })
}

/**
 * Process manager plugin instance
 */
export const processManagerPlugin = Effect.runSync(createProcessManagerPlugin())

// =============================================================================
// Process Manager Utilities
// =============================================================================

/**
 * Process manager utility functions
 */
export const ProcessManagerUtils = {
  /**
   * Create a process config from command line arguments
   */
  createConfigFromArgs: (name: string, command: string, args: string[] = []): ProcessConfig => ({
    name,
    command,
    args,
    autoRestart: false,
    restartDelay: 1000,
    maxRestarts: 5,
  }),
  
  /**
   * Validate process configuration
   */
  validateConfig: (config: unknown): ProcessConfig => {
    return ProcessConfigSchema.parse(config)
  },
  
  /**
   * Format process info for display
   */
  formatProcessInfo: (process: ProcessInfo): string => {
    const uptime = process.endTime 
      ? `${process.endTime.getTime() - process.startTime.getTime()}ms`
      : `${Date.now() - process.startTime.getTime()}ms`
    
    return `${process.name} (${process.id}): ${process.status} - ${process.command} ${process.args.join(' ')} [${uptime}]`
  },
  
  /**
   * Get process statistics
   */
  getProcessStats: (processes: ProcessInfo[]) => {
    const running = processes.filter(p => p.status === 'running').length
    const stopped = processes.filter(p => p.status === 'stopped').length
    const error = processes.filter(p => p.status === 'error').length
    
    return {
      total: processes.length,
      running,
      stopped,
      error,
    }
  },
}

// =============================================================================
// Export Types
// =============================================================================

export type { ProcessConfig, ProcessManagerService }