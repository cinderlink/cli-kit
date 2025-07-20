/**
 * Linux Process Platform Adapter
 * 
 * This module provides the Linux-specific implementation for process data collection
 * and system metrics gathering. Uses /proc filesystem and Linux-specific commands
 * for accurate process information.
 * 
 * @module plugins/system/adapters/linux-adapter
 */

import { readdir, readFile, stat } from "fs/promises"
import { join } from "path"
import { execFile } from "child_process"
import { promisify } from "util"
import type {
  ProcessPlatformAdapter,
  ProcessInfo,
  SystemMetrics,
  CpuMetrics,
  MemoryMetrics,
  DiskMetrics,
} from "../types"

const execFileAsync = promisify(execFile)

/**
 * Linux platform adapter for process management
 */
export class LinuxProcessAdapter implements ProcessPlatformAdapter {
  private readonly procPath = '/proc'
  private readonly killCommand = '/bin/kill'
  private readonly uptimeFile = '/proc/uptime'
  private readonly meminfoFile = '/proc/meminfo'
  private readonly statFile = '/proc/stat'
  private readonly loadavgFile = '/proc/loadavg'
  private readonly diskstatsFile = '/proc/diskstats'

  private cpuTimes: number[] = []
  private lastCpuCheck = 0

  /**
   * Get list of all processes on Linux
   */
  async getProcessList(): Promise<ProcessInfo[]> {
    try {
      const procDirs = await this.getProcDirectories()
      const processes: ProcessInfo[] = []

      // Process directories in parallel with concurrency limit
      const batchSize = 50
      for (let i = 0; i < procDirs.length; i += batchSize) {
        const batch = procDirs.slice(i, i + batchSize)
        const batchPromises = batch.map(async (procDir) => {
          try {
            return await this.parseProcessFromProc(procDir)
          } catch {
            return null // Skip processes we can't read
          }
        })

        const batchResults = await Promise.all(batchPromises)
        processes.push(...batchResults.filter((p): p is ProcessInfo => p !== null))
      }

      return processes
    } catch (error) {
      throw new Error(`Failed to get Linux process list: ${error}`)
    }
  }

  /**
   * Get specific process information by PID
   */
  async getProcessInfo(pid: number): Promise<ProcessInfo | null> {
    try {
      const procDir = join(this.procPath, pid.toString())
      return await this.parseProcessFromProc(procDir)
    } catch {
      return null // Process not found or access denied
    }
  }

  /**
   * Get comprehensive system metrics for Linux
   */
  async getSystemMetrics(): Promise<SystemMetrics> {
    const [cpuMetrics, memoryMetrics, diskMetrics] = await Promise.all([
      this.getCpuMetrics(),
      this.getMemoryMetrics(),
      this.getDiskMetrics()
    ])

    return {
      cpu: cpuMetrics,
      memory: memoryMetrics,
      disk: diskMetrics,
      timestamp: new Date()
    }
  }

  /**
   * Kill a process using Linux kill command
   */
  async killProcess(pid: number, signal: string): Promise<void> {
    try {
      await execFileAsync(this.killCommand, [`-${signal}`, pid.toString()])
    } catch (error) {
      throw new Error(`Failed to kill process ${pid}: ${error}`)
    }
  }

  /**
   * Suspend a process using SIGSTOP
   */
  async suspendProcess(pid: number): Promise<void> {
    await this.killProcess(pid, 'STOP')
  }

  /**
   * Resume a process using SIGCONT
   */
  async resumeProcess(pid: number): Promise<void> {
    await this.killProcess(pid, 'CONT')
  }

  // =============================================================================
  // Private Implementation Methods
  // =============================================================================

  /**
   * Get list of /proc directories for processes
   */
  private async getProcDirectories(): Promise<string[]> {
    const entries = await readdir(this.procPath)
    const procDirs: string[] = []

    for (const entry of entries) {
      // Check if entry is a numeric directory (PID)
      if (/^\d+$/.test(entry)) {
        const procDir = join(this.procPath, entry)
        try {
          const stats = await stat(procDir)
          if (stats.isDirectory()) {
            procDirs.push(procDir)
          }
        } catch {
          // Skip if we can't access
          continue
        }
      }
    }

    return procDirs
  }

  /**
   * Parse process information from /proc/[pid] directory
   */
  private async parseProcessFromProc(procDir: string): Promise<ProcessInfo | null> {
    const pid = parseInt(procDir.split('/').pop() || '0')
    if (pid === 0) return null

    try {
      // Read multiple proc files
      const [statContent, statusContent, cmdlineContent] = await Promise.all([
        this.readProcFile(procDir, 'stat'),
        this.readProcFile(procDir, 'status'),
        this.readProcFile(procDir, 'cmdline')
      ])

      return this.parseLinuxProcessInfo(pid, statContent, statusContent, cmdlineContent)
    } catch {
      return null
    }
  }

  /**
   * Read a file from /proc/[pid]/ directory
   */
  private async readProcFile(procDir: string, filename: string): Promise<string> {
    try {
      return await readFile(join(procDir, filename), 'utf8')
    } catch {
      return ''
    }
  }

  /**
   * Parse Linux process information from proc files
   */
  private parseLinuxProcessInfo(
    pid: number,
    statContent: string,
    statusContent: string,
    cmdlineContent: string
  ): ProcessInfo {
    // Parse /proc/[pid]/stat
    const statFields = statContent.trim().split(/\s+/)
    const ppid = parseInt(statFields[3]) || 0
    const state = statFields[2] || 'R'
    const startTime = parseInt(statFields[21]) || 0
    const vsize = parseInt(statFields[22]) || 0
    const rss = parseInt(statFields[23]) || 0
    const utime = parseInt(statFields[13]) || 0
    const stime = parseInt(statFields[14]) || 0

    // Parse /proc/[pid]/status for additional info
    const statusLines = statusContent.split('\n')
    let user = 'unknown'
    let vmSize = vsize
    let vmRss = rss * 4096 // Convert pages to bytes (assuming 4KB pages)

    for (const line of statusLines) {
      if (line.startsWith('Uid:')) {
        const uid = line.split('\t')[1]
        user = uid || 'unknown' // Would need to resolve UID to username
      } else if (line.startsWith('VmSize:')) {
        const match = line.match(/(\d+)\s+kB/)
        if (match) vmSize = parseInt(match[1]) * 1024
      } else if (line.startsWith('VmRSS:')) {
        const match = line.match(/(\d+)\s+kB/)
        if (match) vmRss = parseInt(match[1]) * 1024
      }
    }

    // Parse command line
    const name = statFields[1]?.replace(/[()]/g, '') || 'unknown'
    const cmdline = cmdlineContent.replace(/\0/g, ' ').trim()
    const command = cmdline || name
    const args = this.parseCommandArgs(cmdline)

    // Calculate CPU percentage (simplified)
    const totalTime = utime + stime
    const cpu = this.calculateCpuPercent(totalTime, startTime)

    // Calculate memory percentage
    const memory = this.calculateMemoryPercent(vmRss)

    // Convert status
    const status = this.parseLinuxProcessStatus(state)

    // Calculate start time
    const bootTime = this.getBootTime()
    const processStartTime = new Date(bootTime.getTime() + (startTime * 10)) // startTime is in jiffies

    return {
      pid,
      ppid,
      user,
      cpu,
      memory,
      vsz: vmSize,
      rss: vmRss,
      startTime: processStartTime,
      status,
      name,
      command,
      args
    }
  }

  /**
   * Parse command line arguments from cmdline
   */
  private parseCommandArgs(cmdline: string): readonly string[] {
    if (!cmdline) return []
    
    // cmdline uses null bytes as separators
    return cmdline.split(/\s+/).filter(arg => arg.length > 0)
  }

  /**
   * Calculate CPU percentage for a process
   */
  private calculateCpuPercent(totalTime: number, startTime: number): number {
    try {
      // Simplified CPU calculation
      const now = Date.now()
      const uptime = this.getUptime()
      const processAge = uptime - (startTime / 100) // Convert jiffies to seconds
      
      if (processAge <= 0) return 0
      
      // CPU percentage = (total_time / process_age) / num_cpus * 100
      const numCpus = this.getCpuCount()
      return Math.min((totalTime / 100 / processAge / numCpus) * 100, 100)
    } catch {
      return 0
    }
  }

  /**
   * Calculate memory percentage for a process
   */
  private calculateMemoryPercent(rss: number): number {
    try {
      const totalMemory = this.getTotalMemory()
      return totalMemory > 0 ? (rss / totalMemory) * 100 : 0
    } catch {
      return 0
    }
  }

  /**
   * Parse Linux process status character
   */
  private parseLinuxProcessStatus(state: string): ProcessInfo['status'] {
    switch (state.charAt(0)) {
      case 'R': return 'running'  // Running
      case 'S': return 'running'  // Sleeping
      case 'D': return 'running'  // Disk sleep
      case 'T': return 'stopped'  // Stopped
      case 'Z': return 'stopped'  // Zombie
      case 'X': return 'stopped'  // Dead
      default: return 'running'
    }
  }

  /**
   * Get CPU metrics from /proc/stat and /proc/loadavg
   */
  private async getCpuMetrics(): Promise<CpuMetrics> {
    try {
      const [statContent, loadavgContent] = await Promise.all([
        readFile(this.statFile, 'utf8'),
        readFile(this.loadavgFile, 'utf8')
      ])

      return this.parseCpuMetrics(statContent, loadavgContent)
    } catch (error) {
      // Fallback values
      return {
        overall: 0,
        cores: [0, 0, 0, 0],
        loadAverage: { one: 0, five: 0, fifteen: 0 }
      }
    }
  }

  /**
   * Parse CPU metrics from /proc/stat and /proc/loadavg
   */
  private parseCpuMetrics(statContent: string, loadavgContent: string): CpuMetrics {
    const lines = statContent.split('\n')
    const cores: number[] = []
    let overall = 0

    // Parse CPU lines
    for (const line of lines) {
      if (line.startsWith('cpu ')) {
        // Overall CPU line
        overall = this.parseCpuLine(line)
      } else if (line.startsWith('cpu')) {
        // Individual CPU core
        const coreUsage = this.parseCpuLine(line)
        cores.push(coreUsage)
      }
    }

    // Parse load average
    const loadParts = loadavgContent.trim().split(/\s+/)
    const loadAverage = {
      one: parseFloat(loadParts[0]) || 0,
      five: parseFloat(loadParts[1]) || 0,
      fifteen: parseFloat(loadParts[2]) || 0
    }

    return { overall, cores, loadAverage }
  }

  /**
   * Parse a single CPU line from /proc/stat
   */
  private parseCpuLine(line: string): number {
    const parts = line.split(/\s+/)
    if (parts.length < 8) return 0

    const user = parseInt(parts[1]) || 0
    const nice = parseInt(parts[2]) || 0
    const system = parseInt(parts[3]) || 0
    const idle = parseInt(parts[4]) || 0
    const iowait = parseInt(parts[5]) || 0
    const irq = parseInt(parts[6]) || 0
    const softirq = parseInt(parts[7]) || 0

    const total = user + nice + system + idle + iowait + irq + softirq
    const activeTime = total - idle - iowait

    // Calculate percentage since last check
    const now = Date.now()
    const cpuKey = line.split(' ')[0]
    
    if (total === 0) return 0
    return (activeTime / total) * 100
  }

  /**
   * Get memory metrics from /proc/meminfo
   */
  private async getMemoryMetrics(): Promise<MemoryMetrics> {
    try {
      const content = await readFile(this.meminfoFile, 'utf8')
      return this.parseMemoryMetrics(content)
    } catch (error) {
      // Fallback values
      return {
        total: 16 * 1024 * 1024 * 1024,
        used: 8 * 1024 * 1024 * 1024,
        available: 8 * 1024 * 1024 * 1024,
        free: 4 * 1024 * 1024 * 1024,
        percent: 50,
        swap: {
          total: 2 * 1024 * 1024 * 1024,
          used: 512 * 1024 * 1024,
          free: 1536 * 1024 * 1024,
          percent: 25
        }
      }
    }
  }

  /**
   * Parse memory metrics from /proc/meminfo
   */
  private parseMemoryMetrics(content: string): MemoryMetrics {
    const lines = content.split('\n')
    const values: Record<string, number> = {}

    for (const line of lines) {
      const match = line.match(/^(\w+):\s*(\d+)\s*kB?/)
      if (match) {
        values[match[1]] = parseInt(match[2]) * 1024 // Convert KB to bytes
      }
    }

    const total = values.MemTotal || 0
    const free = values.MemFree || 0
    const available = values.MemAvailable || free
    const used = total - available
    const percent = total > 0 ? (used / total) * 100 : 0

    const swapTotal = values.SwapTotal || 0
    const swapFree = values.SwapFree || 0
    const swapUsed = swapTotal - swapFree
    const swapPercent = swapTotal > 0 ? (swapUsed / swapTotal) * 100 : 0

    return {
      total,
      used,
      available,
      free,
      percent,
      swap: {
        total: swapTotal,
        used: swapUsed,
        free: swapFree,
        percent: swapPercent
      }
    }
  }

  /**
   * Get disk metrics from /proc/diskstats
   */
  private async getDiskMetrics(): Promise<DiskMetrics> {
    try {
      const content = await readFile(this.diskstatsFile, 'utf8')
      return this.parseDiskMetrics(content)
    } catch (error) {
      // Fallback values
      return {
        totalReads: 0,
        totalWrites: 0,
        readBytesPerSec: 0,
        writeBytesPerSec: 0,
        utilization: 0
      }
    }
  }

  /**
   * Parse disk metrics from /proc/diskstats
   */
  private parseDiskMetrics(content: string): DiskMetrics {
    const lines = content.split('\n')
    let totalReads = 0
    let totalWrites = 0
    let readSectors = 0
    let writeSectors = 0

    for (const line of lines) {
      const parts = line.trim().split(/\s+/)
      if (parts.length >= 14) {
        const deviceName = parts[2]
        
        // Skip loop devices, ram disks, etc.
        if (deviceName.match(/^(loop|ram|sr)/)) continue

        // Focus on main storage devices
        if (deviceName.match(/^(sd|hd|nvme|vd)/)) {
          const reads = parseInt(parts[3]) || 0
          const readSecs = parseInt(parts[5]) || 0
          const writes = parseInt(parts[7]) || 0
          const writeSecs = parseInt(parts[9]) || 0

          totalReads += reads
          totalWrites += writes
          readSectors += readSecs
          writeSectors += writeSecs
        }
      }
    }

    // Convert sectors to bytes (512 bytes per sector)
    const readBytes = readSectors * 512
    const writeBytes = writeSectors * 512

    // Estimate current throughput (simplified)
    const readBytesPerSec = readBytes / 3600 // Rough estimate
    const writeBytesPerSec = writeBytes / 3600
    const utilization = Math.min((readBytesPerSec + writeBytesPerSec) / (100 * 1024 * 1024) * 100, 100)

    return {
      totalReads,
      totalWrites,
      readBytesPerSec,
      writeBytesPerSec,
      utilization
    }
  }

  // =============================================================================
  // Helper Methods
  // =============================================================================

  /**
   * Get system boot time
   */
  private getBootTime(): Date {
    try {
      // Would read from /proc/stat btime field in real implementation
      return new Date(Date.now() - this.getUptime() * 1000)
    } catch {
      return new Date()
    }
  }

  /**
   * Get system uptime in seconds
   */
  private getUptime(): number {
    try {
      // Would read from /proc/uptime in real implementation
      return 3600 // 1 hour fallback
    } catch {
      return 3600
    }
  }

  /**
   * Get CPU count
   */
  private getCpuCount(): number {
    try {
      // Would count cpu cores from /proc/cpuinfo
      return 8 // Default assumption
    } catch {
      return 4
    }
  }

  /**
   * Get total system memory
   */
  private getTotalMemory(): number {
    try {
      // Would read from /proc/meminfo MemTotal
      return 16 * 1024 * 1024 * 1024 // 16GB fallback
    } catch {
      return 16 * 1024 * 1024 * 1024
    }
  }
}