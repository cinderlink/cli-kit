/**
 * Process Management Actions
 * 
 * Provides safe process management capabilities including kill, suspend, resume,
 * and priority adjustment operations with proper error handling and permissions.
 */

import { Effect, pipe } from "effect"
import type { ProcessAction, ProcessActionResult, ProcessInfo, DetailedProcessInfo } from "./types"

/**
 * Process action error types
 */
export class ProcessActionError extends Error {
  constructor(
    message: string,
    public readonly pid: number,
    public readonly action: ProcessAction,
    public readonly code?: string
  ) {
    super(message)
    this.name = 'ProcessActionError'
  }
}

/**
 * Process management actions
 */
export class ProcessActions {
  /**
   * Kill a process with specified signal
   */
  async killProcess(pid: number, signal: string = 'TERM'): Promise<ProcessActionResult> {
    return pipe(
      Effect.tryPromise({
        try: async () => {
          await this.sendSignal(pid, signal)
          return {
            success: true,
            action: 'kill' as ProcessAction,
            pid
          }
        },
        catch: (error) => new ProcessActionError(
          `Failed to kill process ${pid}: ${error}`,
          pid,
          'kill'
        )
      }),
      Effect.catchAll((error: ProcessActionError) => 
        Effect.succeed({
          success: false,
          error: error.message,
          action: error.action,
          pid: error.pid
        })
      ),
      Effect.runPromise
    )
  }

  /**
   * Terminate a process gracefully (SIGTERM)
   */
  async terminateProcess(pid: number): Promise<ProcessActionResult> {
    return this.killProcess(pid, 'TERM')
  }

  /**
   * Force kill a process (SIGKILL)
   */
  async forceKillProcess(pid: number): Promise<ProcessActionResult> {
    return this.killProcess(pid, 'KILL')
  }

  /**
   * Suspend a process (SIGSTOP)
   */
  async suspendProcess(pid: number): Promise<ProcessActionResult> {
    return pipe(
      Effect.tryPromise({
        try: async () => {
          await this.sendSignal(pid, 'STOP')
          return {
            success: true,
            action: 'suspend' as ProcessAction,
            pid
          }
        },
        catch: (error) => new ProcessActionError(
          `Failed to suspend process ${pid}: ${error}`,
          pid,
          'suspend'
        )
      }),
      Effect.catchAll((error: ProcessActionError) => 
        Effect.succeed({
          success: false,
          error: error.message,
          action: error.action,
          pid: error.pid
        })
      ),
      Effect.runPromise
    )
  }

  /**
   * Resume a suspended process (SIGCONT)
   */
  async resumeProcess(pid: number): Promise<ProcessActionResult> {
    return pipe(
      Effect.tryPromise({
        try: async () => {
          await this.sendSignal(pid, 'CONT')
          return {
            success: true,
            action: 'resume' as ProcessAction,
            pid
          }
        },
        catch: (error) => new ProcessActionError(
          `Failed to resume process ${pid}: ${error}`,
          pid,
          'resume'
        )
      }),
      Effect.catchAll((error: ProcessActionError) => 
        Effect.succeed({
          success: false,
          error: error.message,
          action: error.action,
          pid: error.pid
        })
      ),
      Effect.runPromise
    )
  }

  /**
   * Change process priority (nice value)
   */
  async setProcessPriority(pid: number, priority: number): Promise<ProcessActionResult> {
    return pipe(
      Effect.tryPromise({
        try: async () => {
          await this.renice(pid, priority)
          return {
            success: true,
            action: 'nice' as ProcessAction,
            pid
          }
        },
        catch: (error) => new ProcessActionError(
          `Failed to set priority for process ${pid}: ${error}`,
          pid,
          'nice'
        )
      }),
      Effect.catchAll((error: ProcessActionError) => 
        Effect.succeed({
          success: false,
          error: error.message,
          action: error.action,
          pid: error.pid
        })
      ),
      Effect.runPromise
    )
  }

  /**
   * Get detailed process information
   */
  async getProcessDetails(pid: number): Promise<DetailedProcessInfo | null> {
    return pipe(
      Effect.tryPromise({
        try: async () => {
          const [basicInfo, openFiles, networkConnections, memoryMap, environment] = await Promise.all([
            this.getBasicProcessInfo(pid),
            this.getOpenFiles(pid),
            this.getNetworkConnections(pid),
            this.getMemoryMap(pid),
            this.getEnvironment(pid)
          ])

          if (!basicInfo) return null

          return {
            ...basicInfo,
            openFiles,
            networkConnections,
            memoryMap,
            environment,
            workingDirectory: await this.getWorkingDirectory(pid),
            executablePath: await this.getExecutablePath(pid)
          }
        },
        catch: (error) => {
          console.warn(`Failed to get process details for ${pid}:`, error)
          return null
        }
      }),
      Effect.runPromise
    )
  }

  /**
   * Check if process exists
   */
  async processExists(pid: number): Promise<boolean> {
    try {
      await this.sendSignal(pid, '0') // Signal 0 checks existence without affecting process
      return true
    } catch {
      return false
    }
  }

  /**
   * Get list of available signals for the platform
   */
  getAvailableSignals(): string[] {
    const commonSignals = ['TERM', 'KILL', 'STOP', 'CONT', 'HUP', 'INT', 'QUIT', 'USR1', 'USR2']
    
    // Platform-specific signals could be added here
    return commonSignals
  }

  /**
   * Send signal to process
   */
  private async sendSignal(pid: number, signal: string): Promise<void> {
    const process = await import('process')
    
    try {
      process.kill(pid, signal as NodeJS.Signals)
    } catch (error: any) {
      if (error.code === 'ESRCH') {
        throw new Error('Process not found')
      } else if (error.code === 'EPERM') {
        throw new Error('Permission denied')
      } else {
        throw error
      }
    }
  }

  /**
   * Change process priority using renice
   */
  private async renice(pid: number, priority: number): Promise<void> {
    const { promisify } = await import('util')
    const { exec } = await import('child_process')
    const execAsync = promisify(exec)
    
    try {
      await execAsync(`renice ${priority} ${pid}`)
    } catch (error: any) {
      if (error.stderr?.includes('Permission denied')) {
        throw new Error('Permission denied - may require sudo')
      }
      throw new Error(error.stderr || error.message)
    }
  }

  /**
   * Get basic process information
   */
  private async getBasicProcessInfo(pid: number): Promise<ProcessInfo | null> {
    try {
      const { promisify } = await import('util')
      const { exec } = await import('child_process')
      const execAsync = promisify(exec)
      
      const result = await execAsync(`ps -p ${pid} -o pid,ppid,user,pcpu,pmem,lstart,comm,command`)
      const lines = result.stdout.trim().split('\n')
      
      if (lines.length < 2) return null
      
      const processLine = lines[1]
      const match = processLine.match(/^\s*(\d+)\s+(\d+)\s+(\S+)\s+([\d.]+)\s+([\d.]+)\s+(.+)$/)
      
      if (!match) return null
      
      const [, pidStr, ppidStr, user, cpuStr, memStr, rest] = match
      const restParts = rest.trim().split(/\s+/)
      const command = restParts.slice(5).join(' ')
      const name = command.split(' ')[0].split('/').pop() || command
      
      return {
        pid: parseInt(pidStr),
        ppid: parseInt(ppidStr),
        name,
        command,
        user,
        cpu: parseFloat(cpuStr),
        memory: parseFloat(memStr) * 1024 * 1024, // Rough conversion
        startTime: new Date(), // Simplified
        status: 'running',
        priority: 0,
        threads: 1
      }
    } catch {
      return null
    }
  }

  /**
   * Get open files for process
   */
  private async getOpenFiles(pid: number): Promise<any[]> {
    try {
      const { promisify } = await import('util')
      const { exec } = await import('child_process')
      const execAsync = promisify(exec)
      
      const result = await execAsync(`lsof -p ${pid}`)
      const lines = result.stdout.trim().split('\n').slice(1) // Skip header
      
      return lines.map(line => {
        const parts = line.split(/\s+/)
        return {
          fd: parseInt(parts[3]) || 0,
          type: parts[4] || 'unknown',
          path: parts.slice(8).join(' ') || 'unknown',
          mode: parts[1] || 'unknown'
        }
      }).filter(file => !isNaN(file.fd))
    } catch {
      return []
    }
  }

  /**
   * Get network connections for process
   */
  private async getNetworkConnections(pid: number): Promise<any[]> {
    try {
      const { promisify } = await import('util')
      const { exec } = await import('child_process')
      const execAsync = promisify(exec)
      
      const result = await execAsync(`lsof -p ${pid} -i`)
      const lines = result.stdout.trim().split('\n').slice(1) // Skip header
      
      return lines.map(line => {
        const parts = line.split(/\s+/)
        const node = parts[8] || ''
        const [localAddr, remoteAddr] = node.split('->')
        
        return {
          protocol: parts[7]?.toLowerCase() || 'unknown',
          localAddress: localAddr?.split(':')[0] || '',
          localPort: parseInt(localAddr?.split(':')[1]) || 0,
          remoteAddress: remoteAddr?.split(':')[0] || '',
          remotePort: parseInt(remoteAddr?.split(':')[1]) || 0,
          state: parts[9] || 'unknown'
        }
      }).filter(conn => conn.localPort > 0)
    } catch {
      return []
    }
  }

  /**
   * Get memory map for process (simplified)
   */
  private async getMemoryMap(pid: number): Promise<any[]> {
    // This would require platform-specific implementation
    // For now, return empty array
    return []
  }

  /**
   * Get environment variables for process
   */
  private async getEnvironment(pid: number): Promise<Record<string, string>> {
    try {
      const fs = await import('fs/promises')
      const envData = await fs.readFile(`/proc/${pid}/environ`, 'utf8')
      const env: Record<string, string> = {}
      
      envData.split('\0').forEach(line => {
        const [key, ...valueParts] = line.split('=')
        if (key) {
          env[key] = valueParts.join('=')
        }
      })
      
      return env
    } catch {
      return {}
    }
  }

  /**
   * Get working directory for process
   */
  private async getWorkingDirectory(pid: number): Promise<string> {
    try {
      const fs = await import('fs/promises')
      return await fs.readlink(`/proc/${pid}/cwd`)
    } catch {
      return ''
    }
  }

  /**
   * Get executable path for process
   */
  private async getExecutablePath(pid: number): Promise<string> {
    try {
      const fs = await import('fs/promises')
      return await fs.readlink(`/proc/${pid}/exe`)
    } catch {
      return ''
    }
  }
}

/**
 * Interactive process management for ProcessMonitor
 */
export class InteractiveProcessManager {
  private actions: ProcessActions
  private selectedPid: number | null = null
  
  constructor() {
    this.actions = new ProcessActions()
  }

  /**
   * Set selected process
   */
  setSelectedProcess(pid: number | null): void {
    this.selectedPid = pid
  }

  /**
   * Kill selected process with confirmation
   */
  async killSelectedProcess(signal: string = 'TERM'): Promise<ProcessActionResult | null> {
    if (!this.selectedPid) return null
    
    const result = await this.actions.killProcess(this.selectedPid, signal)
    return result
  }

  /**
   * Suspend selected process
   */
  async suspendSelectedProcess(): Promise<ProcessActionResult | null> {
    if (!this.selectedPid) return null
    
    const result = await this.actions.suspendProcess(this.selectedPid)
    return result
  }

  /**
   * Resume selected process
   */
  async resumeSelectedProcess(): Promise<ProcessActionResult | null> {
    if (!this.selectedPid) return null
    
    const result = await this.actions.resumeProcess(this.selectedPid)
    return result
  }

  /**
   * Set priority for selected process
   */
  async setSelectedProcessPriority(priority: number): Promise<ProcessActionResult | null> {
    if (!this.selectedPid) return null
    
    const result = await this.actions.setProcessPriority(this.selectedPid, priority)
    return result
  }

  /**
   * Get details for selected process
   */
  async getSelectedProcessDetails(): Promise<DetailedProcessInfo | null> {
    if (!this.selectedPid) return null
    
    return await this.actions.getProcessDetails(this.selectedPid)
  }

  /**
   * Check if selected process exists
   */
  async selectedProcessExists(): Promise<boolean> {
    if (!this.selectedPid) return false
    
    return await this.actions.processExists(this.selectedPid)
  }

  /**
   * Get available actions for current selection
   */
  getAvailableActions(): ProcessAction[] {
    if (!this.selectedPid) return []
    
    return ['kill', 'terminate', 'suspend', 'resume', 'nice']
  }

  /**
   * Get process actions instance
   */
  getActions(): ProcessActions {
    return this.actions
  }
}