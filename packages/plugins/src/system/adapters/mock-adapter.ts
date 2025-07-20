/**
 * Mock Process Platform Adapter
 * 
 * This module provides a mock implementation for testing and development
 * purposes. It generates realistic fake data for processes and system metrics.
 * 
 * @module plugins/system/adapters/mock-adapter
 */

import type {
  ProcessPlatformAdapter,
  ProcessInfo,
  SystemMetrics,
  CpuMetrics,
  MemoryMetrics,
  DiskMetrics,
} from "../types"

/**
 * Mock adapter for development and testing
 */
export class MockProcessAdapter implements ProcessPlatformAdapter {
  private mockProcesses: ProcessInfo[] = []
  private processCounter = 1000
  
  constructor() {
    this.generateMockProcesses()
  }
  
  /**
   * Get mock process list
   */
  async getProcessList(): Promise<ProcessInfo[]> {
    // Simulate some variation in processes
    this.updateMockProcesses()
    return [...this.mockProcesses]
  }
  
  /**
   * Get mock process info by PID
   */
  async getProcessInfo(pid: number): Promise<ProcessInfo | null> {
    return this.mockProcesses.find(p => p.pid === pid) || null
  }
  
  /**
   * Get mock system metrics
   */
  async getSystemMetrics(): Promise<SystemMetrics> {
    return {
      cpu: this.generateMockCpuMetrics(),
      memory: this.generateMockMemoryMetrics(),
      disk: this.generateMockDiskMetrics(),
      timestamp: new Date()
    }
  }
  
  /**
   * Mock kill process
   */
  async killProcess(pid: number, signal: string): Promise<void> {
    const process = this.mockProcesses.find(p => p.pid === pid)
    if (process) {
      process.status = 'stopped'
      console.log(`Mock: Killed process ${pid} with signal ${signal}`)
    } else {
      throw new Error(`Process ${pid} not found`)
    }
  }
  
  /**
   * Mock suspend process
   */
  async suspendProcess(pid: number): Promise<void> {
    const process = this.mockProcesses.find(p => p.pid === pid)
    if (process) {
      process.status = 'stopped'
      console.log(`Mock: Suspended process ${pid}`)
    } else {
      throw new Error(`Process ${pid} not found`)
    }
  }
  
  /**
   * Mock resume process
   */
  async resumeProcess(pid: number): Promise<void> {
    const process = this.mockProcesses.find(p => p.pid === pid)
    if (process) {
      process.status = 'running'
      console.log(`Mock: Resumed process ${pid}`)
    } else {
      throw new Error(`Process ${pid} not found`)
    }
  }
  
  /**
   * Generate initial mock processes
   */
  private generateMockProcesses(): void {
    const processNames = [
      'launchd', 'kernel_task', 'kextcred', 'misd', 'UserEventAgent',
      'loginwindow', 'WindowServer', 'Dock', 'Finder', 'SystemUIServer',
      'node', 'bun', 'code', 'chrome', 'firefox', 'slack', 'zoom',
      'terminal', 'iTerm2', 'vim', 'git', 'npm', 'tuix-dev'
    ]
    
    const users = ['root', 'system', process.env.USER || 'user', '_spotlight', '_windowserver']
    
    for (let i = 0; i < 25; i++) {
      const pid = this.processCounter++
      const name = processNames[Math.floor(Math.random() * processNames.length)]
      const user = users[Math.floor(Math.random() * users.length)]
      
      this.mockProcesses.push({
        pid,
        ppid: i === 0 ? 0 : Math.floor(Math.random() * 10) + 1,
        name,
        command: `/usr/bin/${name}`,
        args: this.generateMockArgs(name),
        user: user || 'unknown',
        cpu: Math.random() * 100,
        memory: Math.random() * 100,
        vsz: Math.floor(Math.random() * 1000000000), // Up to 1GB virtual
        rss: Math.floor(Math.random() * 500000000),  // Up to 500MB resident
        startTime: new Date(Date.now() - Math.random() * 86400000), // Random time in last 24h
        status: Math.random() > 0.1 ? 'running' : 'stopped'
      })
    }
  }
  
  /**
   * Generate mock command arguments
   */
  private generateMockArgs(processName: string): readonly string[] {
    const commonArgs: Record<string, string[]> = {
      'node': ['--enable-source-maps', 'server.js'],
      'bun': ['run', 'dev'],
      'code': ['--no-sandbox', '--disable-gpu'],
      'chrome': ['--no-sandbox', '--disable-web-security'],
      'firefox': ['-profile', '/tmp/firefox'],
      'git': ['status'],
      'npm': ['run', 'build'],
      'tuix-dev': ['--debug', '--hot-reload']
    }
    
    return commonArgs[processName] || []
  }
  
  /**
   * Update mock processes with some variation
   */
  private updateMockProcesses(): void {
    for (const process of this.mockProcesses) {
      // Simulate CPU and memory fluctuation
      process.cpu = Math.max(0, Math.min(100, process.cpu + (Math.random() - 0.5) * 10))
      process.memory = Math.max(0, Math.min(100, process.memory + (Math.random() - 0.5) * 5))
      
      // Occasionally change process status
      if (Math.random() < 0.01) {
        process.status = process.status === 'running' ? 'stopped' : 'running'
      }
    }
    
    // Occasionally add/remove processes
    if (Math.random() < 0.05 && this.mockProcesses.length < 50) {
      this.addRandomProcess()
    } else if (Math.random() < 0.02 && this.mockProcesses.length > 10) {
      this.removeRandomProcess()
    }
  }
  
  /**
   * Add a random mock process
   */
  private addRandomProcess(): void {
    const newProcessNames = ['temp-process', 'background-task', 'worker', 'helper']
    const name = newProcessNames[Math.floor(Math.random() * newProcessNames.length)]
    
    this.mockProcesses.push({
      pid: this.processCounter++,
      ppid: this.mockProcesses[Math.floor(Math.random() * this.mockProcesses.length)].pid,
      name,
      command: `/tmp/${name}`,
      args: ['--temp'],
      user: process.env.USER || 'user',
      cpu: Math.random() * 20,
      memory: Math.random() * 30,
      vsz: Math.floor(Math.random() * 100000000),
      rss: Math.floor(Math.random() * 50000000),
      startTime: new Date(),
      status: 'running'
    })
  }
  
  /**
   * Remove a random mock process
   */
  private removeRandomProcess(): void {
    const removeIndex = Math.floor(Math.random() * this.mockProcesses.length)
    this.mockProcesses.splice(removeIndex, 1)
  }
  
  /**
   * Generate mock CPU metrics
   */
  private generateMockCpuMetrics(): CpuMetrics {
    const coreCount = 8
    const cores = Array.from({ length: coreCount }, () => Math.random() * 100)
    const overall = cores.reduce((sum, usage) => sum + usage, 0) / coreCount
    
    return {
      overall,
      cores,
      loadAverage: {
        one: Math.random() * 4,
        five: Math.random() * 4,
        fifteen: Math.random() * 4
      }
    }
  }
  
  /**
   * Generate mock memory metrics
   */
  private generateMockMemoryMetrics(): MemoryMetrics {
    const total = 16 * 1024 * 1024 * 1024 // 16GB
    const used = Math.floor(total * (0.3 + Math.random() * 0.4)) // 30-70% used
    const available = total - used
    const free = Math.floor(available * Math.random())
    
    return {
      total,
      available,
      used,
      free,
      percent: (used / total) * 100,
      swap: {
        total: 2 * 1024 * 1024 * 1024, // 2GB swap
        used: Math.floor(Math.random() * 512 * 1024 * 1024), // Up to 512MB used
        free: 2 * 1024 * 1024 * 1024 - Math.floor(Math.random() * 512 * 1024 * 1024),
        percent: Math.random() * 25 // Up to 25% swap usage
      }
    }
  }
  
  /**
   * Generate mock disk metrics
   */
  private generateMockDiskMetrics(): DiskMetrics {
    return {
      totalReads: Math.floor(Math.random() * 1000000),
      totalWrites: Math.floor(Math.random() * 500000),
      readBytesPerSec: Math.floor(Math.random() * 100 * 1024 * 1024), // Up to 100MB/s
      writeBytesPerSec: Math.floor(Math.random() * 50 * 1024 * 1024),  // Up to 50MB/s
      utilization: Math.random() * 100
    }
  }
}