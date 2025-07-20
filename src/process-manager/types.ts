/**
 * Process Manager Types
 * 
 * Core types for the process management system with Effect integration
 */

import { Context } from "effect"
import type { Logger } from "../logger/types"

export interface ProcessConfig {
  name: string
  command: string
  args?: string[]
  cwd?: string
  env?: Record<string, string>
  autostart?: boolean
  autorestart?: boolean
  restartDelay?: number // ms
  maxRestarts?: number
  watch?: boolean
  watchPaths?: string[]
  ignoreWatch?: string[]
  watchDebounce?: number // ms to wait before restarting after file change
  logFile?: string
  errorFile?: string
  maxMemory?: number // MB
  maxCpu?: number // percentage
  group?: string // For grouping related processes
  interpreter?: "node" | "bun" | "deno" | "python" | "ruby" | "shell"
  uid?: number
  gid?: number
  healthCheck?: HealthCheckConfig
  skipValidation?: boolean // Skip command validation (useful for complex commands)
}

export interface ProcessState {
  name: string
  config: ProcessConfig
  status: ProcessStatus
  pid?: number
  startTime?: Date
  restarts: number
  lastError?: string
  memory?: number
  cpu?: number
  logs: ProcessLog[]
  stats?: ProcessStats
  health?: HealthStatus
}

export type ProcessStatus = 
  | "stopped"
  | "starting"
  | "running"
  | "stopping"
  | "error"
  | "crashed"

export interface ProcessLog {
  timestamp: Date
  level: "debug" | "info" | "warn" | "error"
  message: string
  source: "stdout" | "stderr" | "system"
}

export interface ProcessStats {
  memory: number
  cpu: number
  uptime: number
  network?: {
    bytesIn: number
    bytesOut: number
  }
}

export interface HealthCheckConfig {
  type: "output" | "http" | "tcp" | "script"
  // For output type: watch for patterns in stdout/stderr
  outputPattern?: string | RegExp
  // For http type
  url?: string
  method?: "GET" | "POST" | "HEAD"
  expectedStatus?: number[]
  // For tcp type
  host?: string
  port?: number
  // For script type
  script?: string
  // Common options
  interval?: number // Check interval in ms
  timeout?: number // Timeout for each check
  retries?: number // Number of retries before marking unhealthy
  startPeriod?: number // Grace period before starting checks
  startupDelay?: number // Delay before first health check during startup
}

export interface HealthStatus {
  healthy: boolean
  lastCheck: Date
  consecutiveFailures: number
  message?: string
}

export interface ProcessManagerConfig {
  configPath?: string
  logDir?: string
  pidDir?: string
  tuixDir?: string
  cwd?: string // Working directory for spawning processes
  maxLogSize?: number // MB
  maxLogFiles?: number
  globalEnv?: Record<string, string>
  logger?: Logger
  autoSave?: boolean
  statsInterval?: number // ms
  skipShutdownHandlers?: boolean // For testing or when embedding
}

export interface ProcessEvent {
  type: "start" | "stop" | "restart" | "crash" | "error" | "log" | "stats" | "health"
  process: string
  timestamp: Date
  data?: any
}

export interface ProcessManagerStats {
  processes: {
    total: number
    running: number
    stopped: number
    errored: number
  }
  system: {
    memory: {
      total: number
      used: number
      free: number
    }
    cpu: {
      usage: number
      loadAverage: number[]
    }
    uptime: number
  }
}

export interface ProcessGroup {
  name: string
  processes: string[]
  autostart?: boolean
  startOrder?: "parallel" | "sequential"
  stopOrder?: "parallel" | "sequential"
}

export interface ProcessDependency {
  process: string
  dependsOn: string[]
  waitForReady?: boolean
  readyTimeout?: number
}

export interface DoctorReport {
  timestamp: Date
  issues: DoctorIssue[]
  recommendations: string[]
  orphanedProcesses: OrphanedProcess[]
  runawayProcesses: RunawayProcess[]
  fixesApplied: DoctorFix[]
}

export interface DoctorIssue {
  severity: "critical" | "warning" | "info"
  process?: string
  type: "orphaned" | "runaway" | "unhealthy" | "resource_limit" | "crash_loop"
  message: string
  details?: any
}

export interface OrphanedProcess {
  pid: number
  name?: string
  command: string
  startTime: Date
}

export interface RunawayProcess {
  name: string
  pid: number
  issue: "memory" | "cpu" | "restart_loop"
  value: number
  threshold: number
}

export interface DoctorFix {
  issue: DoctorIssue
  action: string
  success: boolean
  error?: string
}

export const ProcessManager = Context.GenericTag<ProcessManager>("tuix/ProcessManager")

export interface ProcessManager {
  // Process lifecycle
  add(config: ProcessConfig): Promise<ProcessState>
  remove(name: string): Promise<void>
  start(name: string): Promise<void>
  stop(name: string): Promise<void>
  restart(name: string): Promise<void>
  
  // Bulk operations
  startAll(): Promise<{ success: boolean; failures: string[]; summary: string }>
  stopAll(): Promise<void>
  startGroup(groupName: string): Promise<void>
  stopGroup(groupName: string): Promise<void>
  
  // Status and monitoring
  status(name?: string): ProcessState | ProcessState[]
  list(): ProcessState[]
  stats(name?: string): ProcessStats | ProcessManagerStats
  
  // Logs
  getLogs(name: string, lines?: number): Promise<ProcessLog[]>
  clearLogs(name: string): void
  tailLogs(name: string, callback: (log: ProcessLog) => void): () => void
  
  // Configuration
  save(): Promise<void>
  load(): Promise<void>
  
  // Events
  on(event: string, listener: (...args: unknown[]) => void): this
  off(event: string, listener: (...args: unknown[]) => void): this
  
  // Lifecycle
  shutdown(): Promise<void>
  
  // Diagnostics
  doctor(options?: { autoFix?: boolean }): Promise<DoctorReport>
  
  // Groups
  createGroup(group: ProcessGroup): void
  deleteGroup(name: string): void
  getGroups(): ProcessGroup[]
  
  // Dependencies
  setDependencies(dependencies: ProcessDependency[]): void
  getDependencies(): ProcessDependency[]
}