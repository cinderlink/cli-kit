/**
 * System Metrics Collection
 * 
 * Cross-platform system metrics collection for CPU, memory, disk, and network usage.
 * Designed for efficient real-time updates with platform-specific optimizations.
 */

import { Effect, pipe } from "effect"
import type { 
  SystemMetrics, 
  CpuMetrics, 
  MemoryMetrics, 
  DiskMetrics, 
  NetworkMetrics,
  ProcessInfo,
  ProcessStatus
} from "./types"

/**
 * Platform detection
 */
export type Platform = 'darwin' | 'linux' | 'win32' | 'freebsd' | 'openbsd'

/**
 * Get current platform
 */
export function getPlatform(): Platform {
  return process.platform as Platform
}

/**
 * System metrics collector class
 * 
 * Provides cross-platform system metrics collection with caching
 * and efficient update strategies for real-time monitoring.
 */
export class SystemMetricsCollector {
  private platform: Platform
  private cache = new Map<string, { data: any; timestamp: number }>()
  private cacheTimeout = 500 // Cache for 500ms to avoid excessive system calls

  constructor() {
    this.platform = getPlatform()
  }

  /**
   * Collect all system metrics
   */
  async collectSystemMetrics(): Promise<SystemMetrics> {
    return pipe(
      Effect.all({
        cpu: this.collectCpuMetrics(),
        memory: this.collectMemoryMetrics(),
        disk: this.collectDiskMetrics(),
        network: this.collectNetworkMetrics(),
        loadAverage: this.collectLoadAverage(),
        uptime: this.collectUptime()
      }),
      Effect.map(({ cpu, memory, disk, network, loadAverage, uptime }) => ({
        cpu,
        memory,
        disk,
        network,
        loadAverage,
        uptime
      })),
      Effect.runPromise
    )
  }

  /**
   * Collect CPU metrics
   */
  private collectCpuMetrics(): Effect.Effect<CpuMetrics, Error, never> {
    return Effect.tryPromise({
      try: async () => {
        const cached = this.getFromCache('cpu')
        if (cached) return cached

        const metrics = await this.platformSpecificCpuMetrics()
        this.setCache('cpu', metrics)
        return metrics
      },
      catch: (error) => new Error(`Failed to collect CPU metrics: ${error}`)
    })
  }

  /**
   * Collect memory metrics
   */
  private collectMemoryMetrics(): Effect.Effect<MemoryMetrics, Error, never> {
    return Effect.tryPromise({
      try: async () => {
        const cached = this.getFromCache('memory')
        if (cached) return cached

        const metrics = await this.platformSpecificMemoryMetrics()
        this.setCache('memory', metrics)
        return metrics
      },
      catch: (error) => new Error(`Failed to collect memory metrics: ${error}`)
    })
  }

  /**
   * Collect disk metrics
   */
  private collectDiskMetrics(): Effect.Effect<DiskMetrics, Error, never> {
    return Effect.tryPromise({
      try: async () => {
        const cached = this.getFromCache('disk')
        if (cached) return cached

        const metrics = await this.platformSpecificDiskMetrics()
        this.setCache('disk', metrics)
        return metrics
      },
      catch: (error) => new Error(`Failed to collect disk metrics: ${error}`)
    })
  }

  /**
   * Collect network metrics
   */
  private collectNetworkMetrics(): Effect.Effect<NetworkMetrics, Error, never> {
    return Effect.tryPromise({
      try: async () => {
        const cached = this.getFromCache('network')
        if (cached) return cached

        const metrics = await this.platformSpecificNetworkMetrics()
        this.setCache('network', metrics)
        return metrics
      },
      catch: (error) => new Error(`Failed to collect network metrics: ${error}`)
    })
  }

  /**
   * Collect load average
   */
  private collectLoadAverage(): Effect.Effect<{ oneMinute: number; fiveMinute: number; fifteenMinute: number }, Error, never> {
    return Effect.tryPromise({
      try: async () => {
        const os = await import('os')
        const loadavg = os.loadavg()
        return {
          oneMinute: loadavg[0],
          fiveMinute: loadavg[1],
          fifteenMinute: loadavg[2]
        }
      },
      catch: (error) => new Error(`Failed to collect load average: ${error}`)
    })
  }

  /**
   * Collect system uptime
   */
  private collectUptime(): Effect.Effect<number, Error, never> {
    return Effect.tryPromise({
      try: async () => {
        const os = await import('os')
        return os.uptime()
      },
      catch: (error) => new Error(`Failed to collect uptime: ${error}`)
    })
  }

  /**
   * Platform-specific CPU metrics collection
   */
  private async platformSpecificCpuMetrics(): Promise<CpuMetrics> {
    const os = await import('os')
    
    switch (this.platform) {
      case 'darwin':
        return this.darwinCpuMetrics()
      case 'linux':
        return this.linuxCpuMetrics()
      default:
        // Fallback to Node.js os module
        const cpus = os.cpus()
        const loadavg = os.loadavg()
        
        let user = 0, nice = 0, sys = 0, idle = 0, irq = 0
        
        cpus.forEach(cpu => {
          user += cpu.times.user
          nice += cpu.times.nice
          sys += cpu.times.sys
          idle += cpu.times.idle
          irq += cpu.times.irq
        })
        
        const total = user + nice + sys + idle + irq
        
        return {
          overall: ((total - idle) / total) * 100,
          perCore: cpus.map(cpu => {
            const coreTotal = Object.values(cpu.times).reduce((sum, time) => sum + time, 0)
            return ((coreTotal - cpu.times.idle) / coreTotal) * 100
          }),
          user: (user / total) * 100,
          system: (sys / total) * 100,
          idle: (idle / total) * 100,
          iowait: 0, // Not available on all platforms
          loadAverage: loadavg as [number, number, number]
        }
    }
  }

  /**
   * macOS-specific CPU metrics
   */
  private async darwinCpuMetrics(): Promise<CpuMetrics> {
    try {
      const { execAsync } = await this.getExecAsync()
      
      // Use top command for more detailed CPU info
      const topOutput = await execAsync('top -l 1 -n 0 | grep "CPU usage"')
      const cpuMatch = topOutput.match(/CPU usage: ([\d.]+)% user, ([\d.]+)% sys, ([\d.]+)% idle/)
      
      const os = await import('os')
      const cpus = os.cpus()
      const loadavg = os.loadavg()
      
      if (cpuMatch) {
        const user = parseFloat(cpuMatch[1])
        const system = parseFloat(cpuMatch[2])
        const idle = parseFloat(cpuMatch[3])
        const overall = user + system
        
        return {
          overall,
          perCore: cpus.map(() => overall), // Simplified for now
          user,
          system,
          idle,
          iowait: 0,
          loadAverage: loadavg as [number, number, number]
        }
      }
      
      // Fallback to os module
      return this.platformSpecificCpuMetrics()
    } catch {
      return this.platformSpecificCpuMetrics()
    }
  }

  /**
   * Linux-specific CPU metrics
   */
  private async linuxCpuMetrics(): Promise<CpuMetrics> {
    try {
      const fs = await import('fs/promises')
      const statContent = await fs.readFile('/proc/stat', 'utf8')
      const lines = statContent.split('\n')
      const cpuLine = lines[0]
      
      const values = cpuLine.split(/\s+/).slice(1).map(Number)
      const [user, nice, system, idle, iowait, irq, softirq] = values
      
      const total = user + nice + system + idle + iowait + irq + softirq
      const overall = ((total - idle - iowait) / total) * 100
      
      const os = await import('os')
      const loadavg = os.loadavg()
      
      return {
        overall,
        perCore: [], // Would need per-core parsing
        user: (user / total) * 100,
        system: (system / total) * 100,
        idle: (idle / total) * 100,
        iowait: (iowait / total) * 100,
        loadAverage: loadavg as [number, number, number]
      }
    } catch {
      return this.platformSpecificCpuMetrics()
    }
  }

  /**
   * Platform-specific memory metrics collection
   */
  private async platformSpecificMemoryMetrics(): Promise<MemoryMetrics> {
    const os = await import('os')
    
    switch (this.platform) {
      case 'darwin':
        return this.darwinMemoryMetrics()
      case 'linux':
        return this.linuxMemoryMetrics()
      default:
        // Fallback to Node.js os module
        const totalMem = os.totalmem()
        const freeMem = os.freemem()
        const usedMem = totalMem - freeMem
        
        return {
          total: totalMem,
          used: usedMem,
          available: freeMem,
          free: freeMem,
          cached: 0,
          buffers: 0,
          percent: (usedMem / totalMem) * 100,
          swap: {
            total: 0,
            used: 0,
            free: 0,
            percent: 0
          }
        }
    }
  }

  /**
   * macOS-specific memory metrics
   */
  private async darwinMemoryMetrics(): Promise<MemoryMetrics> {
    try {
      const { execAsync } = await this.getExecAsync()
      
      // Get memory info from vm_stat
      const vmStatOutput = await execAsync('vm_stat')
      const pageSize = 4096 // macOS page size
      
      const parsePages = (output: string, pattern: RegExp): number => {
        const match = output.match(pattern)
        return match ? parseInt(match[1]) * pageSize : 0
      }
      
      const free = parsePages(vmStatOutput, /Pages free:\s+(\d+)/)
      const inactive = parsePages(vmStatOutput, /Pages inactive:\s+(\d+)/)
      const speculative = parsePages(vmStatOutput, /Pages speculative:\s+(\d+)/)
      const wired = parsePages(vmStatOutput, /Pages wired down:\s+(\d+)/)
      const active = parsePages(vmStatOutput, /Pages active:\s+(\d+)/)
      const compressed = parsePages(vmStatOutput, /Pages occupied by compressor:\s+(\d+)/)
      
      const os = await import('os')
      const total = os.totalmem()
      const available = free + inactive + speculative
      const used = total - available
      
      return {
        total,
        used,
        available,
        free,
        cached: inactive,
        buffers: 0,
        percent: (used / total) * 100,
        swap: {
          total: 0, // Would need additional command
          used: 0,
          free: 0,
          percent: 0
        }
      }
    } catch {
      return this.platformSpecificMemoryMetrics()
    }
  }

  /**
   * Linux-specific memory metrics
   */
  private async linuxMemoryMetrics(): Promise<MemoryMetrics> {
    try {
      const fs = await import('fs/promises')
      const meminfoContent = await fs.readFile('/proc/meminfo', 'utf8')
      
      const parseKB = (pattern: RegExp): number => {
        const match = meminfoContent.match(pattern)
        return match ? parseInt(match[1]) * 1024 : 0
      }
      
      const total = parseKB(/MemTotal:\s+(\d+) kB/)
      const available = parseKB(/MemAvailable:\s+(\d+) kB/)
      const free = parseKB(/MemFree:\s+(\d+) kB/)
      const buffers = parseKB(/Buffers:\s+(\d+) kB/)
      const cached = parseKB(/Cached:\s+(\d+) kB/)
      const swapTotal = parseKB(/SwapTotal:\s+(\d+) kB/)
      const swapFree = parseKB(/SwapFree:\s+(\d+) kB/)
      
      const used = total - available
      const swapUsed = swapTotal - swapFree
      
      return {
        total,
        used,
        available,
        free,
        cached,
        buffers,
        percent: (used / total) * 100,
        swap: {
          total: swapTotal,
          used: swapUsed,
          free: swapFree,
          percent: swapTotal ? (swapUsed / swapTotal) * 100 : 0
        }
      }
    } catch {
      return this.platformSpecificMemoryMetrics()
    }
  }

  /**
   * Platform-specific disk metrics collection
   */
  private async platformSpecificDiskMetrics(): Promise<DiskMetrics> {
    // Simplified implementation - would need platform-specific iostat/diskutil parsing
    return {
      filesystems: [],
      totalReads: 0,
      totalWrites: 0,
      bytesRead: 0,
      bytesWritten: 0,
      ioUtil: 0
    }
  }

  /**
   * Platform-specific network metrics collection
   */
  private async platformSpecificNetworkMetrics(): Promise<NetworkMetrics> {
    // Simplified implementation - would need platform-specific network stats parsing
    return {
      interfaces: [],
      totalBytesReceived: 0,
      totalBytesSent: 0,
      totalPacketsReceived: 0,
      totalPacketsSent: 0
    }
  }

  /**
   * Cache management
   */
  private getFromCache<T>(key: string): T | null {
    const cached = this.cache.get(key)
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data as T
    }
    return null
  }

  private setCache<T>(key: string, data: T): void {
    this.cache.set(key, { data, timestamp: Date.now() })
  }

  /**
   * Get async exec function
   */
  private async getExecAsync() {
    const { promisify } = await import('util')
    const { exec } = await import('child_process')
    return { execAsync: promisify(exec) }
  }
}

/**
 * Process information collector
 * 
 * Collects process information using platform-specific commands and APIs.
 */
export class ProcessCollector {
  private platform: Platform
  private cache = new Map<string, { data: any; timestamp: number }>()
  private cacheTimeout = 1000 // Cache for 1 second

  constructor() {
    this.platform = getPlatform()
  }

  /**
   * Collect all running processes
   */
  async collectProcesses(): Promise<ProcessInfo[]> {
    return pipe(
      Effect.tryPromise({
        try: async () => {
          const cached = this.getFromCache('processes')
          if (cached) return cached

          const processes = await this.platformSpecificProcessCollection()
          this.setCache('processes', processes)
          return processes
        },
        catch: (error) => new Error(`Failed to collect processes: ${error}`)
      }),
      Effect.runPromise
    )
  }

  /**
   * Platform-specific process collection
   */
  private async platformSpecificProcessCollection(): Promise<ProcessInfo[]> {
    switch (this.platform) {
      case 'darwin':
        return this.darwinProcessCollection()
      case 'linux':
        return this.linuxProcessCollection()
      default:
        return this.fallbackProcessCollection()
    }
  }

  /**
   * macOS process collection using ps command
   */
  private async darwinProcessCollection(): Promise<ProcessInfo[]> {
    try {
      const { execAsync } = await this.getExecAsync()
      
      // Use ps with specific format for consistent parsing
      const psOutput = await execAsync('ps -eo pid,ppid,user,pcpu,pmem,lstart,comm,command')
      
      return await this.parsePsOutput(psOutput)
    } catch (error) {
      console.warn('Failed to collect macOS processes:', error)
      return []
    }
  }

  /**
   * Linux process collection using ps command and /proc
   */
  private async linuxProcessCollection(): Promise<ProcessInfo[]> {
    try {
      const { execAsync } = await this.getExecAsync()
      
      // Use ps with specific format
      const psOutput = await execAsync('ps -eo pid,ppid,user,pcpu,pmem,lstart,comm,command')
      
      return await this.parsePsOutput(psOutput)
    } catch (error) {
      console.warn('Failed to collect Linux processes:', error)
      return []
    }
  }

  /**
   * Fallback process collection
   */
  private async fallbackProcessCollection(): Promise<ProcessInfo[]> {
    // Minimal fallback - could be expanded with more platform support
    return []
  }

  /**
   * Parse ps command output into ProcessInfo objects
   */
  private async parsePsOutput(psOutput: string): Promise<ProcessInfo[]> {
    const lines = psOutput.trim().split('\n').slice(1) // Skip header
    const processes: ProcessInfo[] = []

    for (const line of lines) {
      try {
        const match = line.match(/^\s*(\d+)\s+(\d+)\s+(\S+)\s+([\d.]+)\s+([\d.]+)\s+(.+)$/)
        if (!match) continue

        const [, pidStr, ppidStr, user, cpuStr, memStr, rest] = match
        
        // Split the rest to extract start time, command name, and full command
        const restParts = rest.trim().split(/\s+/)
        const startTimeParts = restParts.slice(0, 5) // Assume start time takes 5 parts
        const command = restParts.slice(5).join(' ') || restParts[restParts.length - 1]
        const name = command.split(' ')[0].split('/').pop() || command

        const pid = parseInt(pidStr)
        const ppid = parseInt(ppidStr)
        const cpu = parseFloat(cpuStr)
        const memoryPercent = parseFloat(memStr)
        
        // Estimate memory in bytes (simplified)
        const os = await import('os')
        const totalMem = os.totalmem()
        const memory = (memoryPercent / 100) * totalMem

        processes.push({
          pid,
          ppid,
          name,
          command,
          user,
          cpu,
          memory,
          startTime: new Date(), // Simplified - would parse from startTimeParts
          status: this.guessProcessStatus(cpu),
          priority: 0,
          threads: 1
        })
      } catch (error) {
        // Skip malformed lines
        continue
      }
    }

    return processes
  }

  /**
   * Guess process status from CPU usage
   */
  private guessProcessStatus(cpu: number): ProcessStatus {
    if (cpu > 0.1) return 'running'
    return 'sleeping'
  }

  /**
   * Cache management
   */
  private getFromCache<T>(key: string): T | null {
    const cached = this.cache.get(key)
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data as T
    }
    return null
  }

  private setCache<T>(key: string, data: T): void {
    this.cache.set(key, { data, timestamp: Date.now() })
  }

  /**
   * Get async exec function
   */
  private async getExecAsync() {
    const { promisify } = await import('util')
    const { exec } = await import('child_process')
    return { execAsync: promisify(exec) }
  }
}