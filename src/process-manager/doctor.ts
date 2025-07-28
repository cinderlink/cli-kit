/**
 * Process Manager Doctor
 *
 * Diagnose and fix common process management issues
 */

import { ProcessManager } from './manager'
import type {
  DoctorReport,
  DoctorIssue,
  OrphanedProcess,
  RunawayProcess,
  DoctorFix,
  ProcessState,
} from './types'
import { spawn } from 'bun'
import { join } from 'path'

export class ProcessDoctor {
  constructor(
    private manager: ProcessManager,
    private options: {
      autoFix?: boolean
      logDir?: string
      pidDir?: string
    } = {}
  ) {}

  /**
   * Run comprehensive diagnostics
   */
  async diagnose(): Promise<DoctorReport> {
    const report: DoctorReport = {
      timestamp: new Date(),
      issues: [],
      recommendations: [],
      orphanedProcesses: [],
      runawayProcesses: [],
      fixesApplied: [],
    }

    // Check for orphaned processes
    await this.checkOrphanedProcesses(report)

    // Check for runaway processes
    await this.checkRunawayProcesses(report)

    // Check for unhealthy processes
    await this.checkUnhealthyProcesses(report)

    // Check for crash loops
    await this.checkCrashLoops(report)

    // Analyze logs for issues
    await this.analyzeLogs(report)

    // Generate recommendations
    this.generateRecommendations(report)

    // Apply automatic fixes if enabled
    if (this.options.autoFix) {
      await this.applyFixes(report)
    }

    return report
  }

  /**
   * Check for orphaned processes
   */
  private async checkOrphanedProcesses(report: DoctorReport) {
    const pidDir = this.options.pidDir || join(process.cwd(), '.pids')

    try {
      // Get all PID files
      const files = await Array.fromAsync(Bun.readdir(pidDir))

      for (const file of files) {
        if (!file.endsWith('.pid')) continue

        const pidFile = join(pidDir, file)
        const content = await Bun.file(pidFile).text()
        const pid = parseInt(content.trim())

        if (!isNaN(pid)) {
          // Check if process exists
          try {
            process.kill(pid, 0)

            // Process exists, check if it's managed
            const processName = file.replace('.pid', '')
            const managedProcesses = this.manager.list()
            const isManaged = managedProcesses.some(p => p.name === processName && p.pid === pid)

            if (!isManaged) {
              // Found orphaned process
              const processInfo = await this.getProcessInfo(pid)

              const orphaned: OrphanedProcess = {
                pid,
                name: processName,
                command: processInfo.command,
                startTime: processInfo.startTime,
              }

              report.orphanedProcesses.push(orphaned)

              report.issues.push({
                severity: 'warning',
                type: 'orphaned',
                message: `Found orphaned process: ${processName} (PID: ${pid})`,
                details: orphaned,
              })
            }
          } catch {
            // Process doesn't exist, PID file is stale
            report.issues.push({
              severity: 'info',
              type: 'orphaned',
              message: `Stale PID file found: ${file}`,
              details: { pidFile, pid },
            })
          }
        }
      }
    } catch (error) {
      report.issues.push({
        severity: 'warning',
        type: 'orphaned',
        message: `Failed to check for orphaned processes: ${error}`,
        details: { error: String(error) },
      })
    }
  }

  /**
   * Check for runaway processes
   */
  private async checkRunawayProcesses(report: DoctorReport) {
    const processes = this.manager.list()

    for (const process of processes) {
      if (process.status !== 'running' || !process.pid) continue

      // Check restart count
      if (process.restarts > 10) {
        const runaway: RunawayProcess = {
          name: process.name,
          pid: process.pid,
          issue: 'restart_loop',
          value: process.restarts,
          threshold: 10,
        }

        report.runawayProcesses.push(runaway)

        report.issues.push({
          severity: 'critical',
          process: process.name,
          type: 'runaway',
          message: `Process ${process.name} is in a restart loop (${process.restarts} restarts)`,
          details: runaway,
        })
      }

      // Check resource usage
      if (process.stats) {
        // Check memory
        if (
          process.config.maxMemory &&
          process.stats.memory > process.config.maxMemory * 1024 * 1024 * 1.5
        ) {
          const runaway: RunawayProcess = {
            name: process.name,
            pid: process.pid,
            issue: 'memory',
            value: process.stats.memory,
            threshold: process.config.maxMemory * 1024 * 1024,
          }

          report.runawayProcesses.push(runaway)

          report.issues.push({
            severity: 'critical',
            process: process.name,
            type: 'runaway',
            message: `Process ${process.name} exceeds memory limit by 50%`,
            details: runaway,
          })
        }

        // Check CPU
        if (process.config.maxCpu && process.stats.cpu > process.config.maxCpu * 1.5) {
          const runaway: RunawayProcess = {
            name: process.name,
            pid: process.pid,
            issue: 'cpu',
            value: process.stats.cpu,
            threshold: process.config.maxCpu,
          }

          report.runawayProcesses.push(runaway)

          report.issues.push({
            severity: 'critical',
            process: process.name,
            type: 'runaway',
            message: `Process ${process.name} exceeds CPU limit by 50%`,
            details: runaway,
          })
        }
      }
    }
  }

  /**
   * Check for unhealthy processes
   */
  private async checkUnhealthyProcesses(report: DoctorReport) {
    const processes = this.manager.list()

    for (const process of processes) {
      if (process.status !== 'running') continue

      // Check health status
      if (process.health && !process.health.healthy) {
        report.issues.push({
          severity: 'warning',
          process: process.name,
          type: 'unhealthy',
          message: `Process ${process.name} is unhealthy: ${process.health.message}`,
          details: process.health,
        })
      }

      // Check if process has health checks configured
      if (!process.config.healthCheck && process.config.autostart) {
        report.issues.push({
          severity: 'info',
          process: process.name,
          type: 'unhealthy',
          message: `Process ${process.name} has no health checks configured`,
          details: { autostart: true },
        })
      }
    }
  }

  /**
   * Check for crash loops
   */
  private async checkCrashLoops(report: DoctorReport) {
    const processes = this.manager.list()

    for (const process of processes) {
      // Analyze recent logs for crash patterns
      const recentLogs = process.logs.slice(-50)
      const errorLogs = recentLogs.filter(log => log.level === 'error')

      if (errorLogs.length > 20) {
        // High error rate
        const errorPatterns = this.analyzeErrorPatterns(errorLogs)

        if (errorPatterns.repeating > 10) {
          report.issues.push({
            severity: 'critical',
            process: process.name,
            type: 'crash_loop',
            message: `Process ${process.name} has repeating errors`,
            details: {
              errorCount: errorLogs.length,
              repeatingPatterns: errorPatterns.repeating,
              commonErrors: errorPatterns.common,
            },
          })
        }
      }
    }
  }

  /**
   * Analyze logs for common issues
   */
  private async analyzeLogs(report: DoctorReport) {
    const processes = this.manager.list()

    for (const process of processes) {
      const logs = process.logs.slice(-100)

      // Look for common error patterns
      const patterns = [
        { pattern: /EADDRINUSE/i, issue: 'Port already in use' },
        { pattern: /ENOMEM|out of memory/i, issue: 'Out of memory' },
        { pattern: /ECONNREFUSED/i, issue: 'Connection refused' },
        { pattern: /ETIMEDOUT/i, issue: 'Connection timeout' },
        { pattern: /cannot find module/i, issue: 'Missing dependency' },
        { pattern: /permission denied/i, issue: 'Permission error' },
        { pattern: /segmentation fault/i, issue: 'Segmentation fault' },
        { pattern: /stack overflow/i, issue: 'Stack overflow' },
      ]

      for (const { pattern, issue } of patterns) {
        const matches = logs.filter(log => pattern.test(log.message))

        if (matches.length > 0) {
          report.issues.push({
            severity: matches.length > 5 ? 'warning' : 'info',
            process: process.name,
            type: 'resource_limit',
            message: `Process ${process.name} has ${issue} errors`,
            details: {
              count: matches.length,
              lastOccurrence: matches[matches.length - 1].timestamp,
            },
          })
        }
      }
    }
  }

  /**
   * Generate recommendations based on issues found
   */
  private generateRecommendations(report: DoctorReport) {
    const hasOrphaned = report.orphanedProcesses.length > 0
    const hasRunaway = report.runawayProcesses.length > 0
    const hasCrashLoops = report.issues.some(i => i.type === 'crash_loop')
    const hasUnhealthy = report.issues.some(i => i.type === 'unhealthy')

    if (hasOrphaned) {
      report.recommendations.push(
        'Clean up orphaned processes to free system resources',
        'Review process shutdown procedures to prevent orphaning'
      )
    }

    if (hasRunaway) {
      report.recommendations.push(
        'Review resource limits for runaway processes',
        'Consider implementing circuit breakers for restart loops',
        'Add monitoring alerts for resource usage'
      )
    }

    if (hasCrashLoops) {
      report.recommendations.push(
        'Investigate root cause of crashes',
        'Implement exponential backoff for restarts',
        'Add better error handling and recovery'
      )
    }

    if (hasUnhealthy) {
      report.recommendations.push(
        'Configure health checks for all critical processes',
        'Review health check thresholds and intervals',
        'Implement automated recovery for unhealthy processes'
      )
    }

    // General recommendations
    if (report.issues.length === 0) {
      report.recommendations.push('All processes appear healthy - continue monitoring')
    }
  }

  /**
   * Apply automatic fixes
   */
  private async applyFixes(report: DoctorReport) {
    for (const issue of report.issues) {
      const fix = await this.attemptFix(issue)
      if (fix) {
        report.fixesApplied.push(fix)
      }
    }
  }

  /**
   * Attempt to fix an issue
   */
  private async attemptFix(issue: DoctorIssue): Promise<DoctorFix | null> {
    const fix: DoctorFix = {
      issue,
      action: '',
      success: false,
    }

    try {
      switch (issue.type) {
        case 'orphaned':
          if (issue.details?.pidFile) {
            // Remove stale PID file
            fix.action = 'Remove stale PID file'
            const { unlink } = await import('fs/promises')
            await unlink(issue.details.pidFile)
            fix.success = true
          } else if (issue.details?.pid) {
            // Kill orphaned process
            fix.action = `Kill orphaned process (PID: ${issue.details.pid})`
            process.kill(issue.details.pid, 'SIGTERM')
            fix.success = true
          }
          break

        case 'runaway':
          if (issue.process && issue.details?.issue === 'restart_loop') {
            // Stop process to break restart loop
            fix.action = `Stop process ${issue.process} to break restart loop`
            await this.manager.stop(issue.process)
            fix.success = true
          }
          break

        case 'resource_limit':
          if (issue.details?.count > 10) {
            // Restart process to clear error state
            fix.action = `Restart process ${issue.process} to clear errors`
            await this.manager.restart(issue.process!)
            fix.success = true
          }
          break
      }
    } catch (error) {
      fix.error = String(error)
    }

    return fix.action ? fix : null
  }

  /**
   * Get process information by PID
   */
  private async getProcessInfo(pid: number): Promise<{ command: string; startTime: Date }> {
    try {
      const proc = spawn({
        cmd: ['ps', '-o', 'comm,etime', '-p', pid.toString()],
        stdout: 'pipe',
      })

      const output = await new Response(proc.stdout).text()
      const lines = output.trim().split('\n')

      if (lines.length >= 2) {
        const [command, etime] = lines[1].trim().split(/\s+/)
        return {
          command: command || 'unknown',
          startTime: this.parseElapsedTime(etime || '0'),
        }
      }
    } catch {}

    return {
      command: 'unknown',
      startTime: new Date(),
    }
  }

  /**
   * Parse elapsed time from ps output
   */
  private parseElapsedTime(etime: string): Date {
    // Parse format: [[dd-]hh:]mm:ss
    const now = Date.now()
    let milliseconds = 0

    const parts = etime.split(/[-:]/)
    if (parts.length === 4) {
      // dd-hh:mm:ss
      milliseconds =
        parseInt(parts[0]) * 86400000 +
        parseInt(parts[1]) * 3600000 +
        parseInt(parts[2]) * 60000 +
        parseInt(parts[3]) * 1000
    } else if (parts.length === 3) {
      // hh:mm:ss
      milliseconds =
        parseInt(parts[0]) * 3600000 + parseInt(parts[1]) * 60000 + parseInt(parts[2]) * 1000
    } else if (parts.length === 2) {
      // mm:ss
      milliseconds = parseInt(parts[0]) * 60000 + parseInt(parts[1]) * 1000
    }

    return new Date(now - milliseconds)
  }

  /**
   * Analyze error patterns
   */
  private analyzeErrorPatterns(errors: Array<{ message: string }>) {
    const patterns = new Map<string, number>()

    for (const error of errors) {
      const normalized = error.message.toLowerCase().trim()
      patterns.set(normalized, (patterns.get(normalized) || 0) + 1)
    }

    const common = Array.from(patterns.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([pattern, count]) => ({ pattern, count }))

    const repeating = Array.from(patterns.values()).filter(count => count > 1).length

    return { common, repeating }
  }

  /**
   * Generate a readable report
   */
  formatReport(report: DoctorReport): string {
    const lines: string[] = []

    lines.push('=== Process Manager Health Report ===')
    lines.push(`Generated: ${report.timestamp.toISOString()}`)
    lines.push('')

    // Summary
    lines.push('## Summary')
    lines.push(`- Issues Found: ${report.issues.length}`)
    lines.push(`- Orphaned Processes: ${report.orphanedProcesses.length}`)
    lines.push(`- Runaway Processes: ${report.runawayProcesses.length}`)
    lines.push(`- Fixes Applied: ${report.fixesApplied.length}`)
    lines.push('')

    // Issues
    if (report.issues.length > 0) {
      lines.push('## Issues')
      for (const issue of report.issues) {
        const icon =
          issue.severity === 'critical' ? '🔴' : issue.severity === 'warning' ? '🟡' : '🔵'
        lines.push(`${icon} [${issue.severity.toUpperCase()}] ${issue.message}`)
        if (issue.process) {
          lines.push(`   Process: ${issue.process}`)
        }
      }
      lines.push('')
    }

    // Recommendations
    if (report.recommendations.length > 0) {
      lines.push('## Recommendations')
      for (const rec of report.recommendations) {
        lines.push(`- ${rec}`)
      }
      lines.push('')
    }

    // Fixes Applied
    if (report.fixesApplied.length > 0) {
      lines.push('## Fixes Applied')
      for (const fix of report.fixesApplied) {
        const status = fix.success ? '✅' : '❌'
        lines.push(`${status} ${fix.action}`)
        if (fix.error) {
          lines.push(`   Error: ${fix.error}`)
        }
      }
    }

    return lines.join('\n')
  }
}
