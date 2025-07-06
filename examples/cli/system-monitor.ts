/**
 * System Monitor CLI
 * 
 * Real-time system monitoring dashboard showcasing:
 * - Live data updates
 * - Multiple panels
 * - Charts and graphs
 * - Keyboard navigation
 * - Resource monitoring
 */

import { defineConfig } from "../../src/cli/config"
import { runCLI } from "../../src/cli/runner"
import { z } from "zod"
import { createComponent } from "../../src/components/component"
import { Panel } from "../../src/components/builders/Panel"
import { text, vstack, hstack, styledText } from "../../src/core/view"
import { style, Colors } from "../../src/styling"
import { $state, $derived, $effect } from "../../src/components/reactivity"
import * as os from "os"
import { exec } from "child_process"
import { promisify } from "util"

const execAsync = promisify(exec)

// System info types
interface SystemInfo {
  hostname: string
  platform: string
  arch: string
  release: string
  uptime: string
  loadAvg: number[]
  totalMem: number
  freeMem: number
  cpuCount: number
}

interface ProcessInfo {
  pid: number
  name: string
  cpu: number
  memory: number
}

// Format bytes to human readable
function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let size = bytes
  let unitIndex = 0
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }
  
  return `${size.toFixed(1)} ${units[unitIndex]}`
}

// Format uptime
function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  
  const parts = []
  if (days > 0) parts.push(`${days}d`)
  if (hours > 0) parts.push(`${hours}h`)
  if (minutes > 0) parts.push(`${minutes}m`)
  
  return parts.join(' ') || '0m'
}

// Get system info
async function getSystemInfo(): Promise<SystemInfo> {
  return {
    hostname: os.hostname(),
    platform: os.platform(),
    arch: os.arch(),
    release: os.release(),
    uptime: formatUptime(os.uptime()),
    loadAvg: os.loadavg(),
    totalMem: os.totalmem(),
    freeMem: os.freemem(),
    cpuCount: os.cpus().length
  }
}

// Get process list (simplified for demo)
async function getProcessList(): Promise<ProcessInfo[]> {
  try {
    // This is platform-specific, simplified for demo
    if (os.platform() === 'darwin' || os.platform() === 'linux') {
      const { stdout } = await execAsync('ps aux | head -20')
      const lines = stdout.split('\n').slice(1).filter(line => line.trim())
      
      return lines.map((line, index) => {
        const parts = line.split(/\s+/)
        return {
          pid: parseInt(parts[1]) || index,
          name: parts[10] || 'unknown',
          cpu: parseFloat(parts[2]) || 0,
          memory: parseFloat(parts[3]) || 0
        }
      }).slice(0, 10) // Top 10 processes
    }
  } catch (error) {
    console.error('Failed to get process list:', error)
  }
  
  return []
}

// Create a simple bar chart
function createBar(value: number, max: number, width: number = 20): string {
  const filled = Math.round((value / max) * width)
  const empty = width - filled
  return '█'.repeat(filled) + '░'.repeat(empty)
}

// System Monitor Component
const createSystemMonitor = (props: { refreshRate?: number }) => {
  const component = createComponent<{ refreshRate?: number }>(() => {
  const { refreshRate = 2000 } = props
  
  // State
  const systemInfo = $state<SystemInfo | null>(null)
  const processes = $state<ProcessInfo[]>([])
  const selectedTab = $state(0)
  const refreshEnabled = $state(true)
  const lastUpdate = $state(new Date())
  
  // Load data
  const loadData = async () => {
    if (!refreshEnabled.value) return
    
    const [sysInfo, procList] = await Promise.all([
      getSystemInfo(),
      getProcessList()
    ])
    
    systemInfo.set(sysInfo)
    processes.set(procList)
    lastUpdate.set(new Date())
  }
  
  // Memory usage percentage
  const getMemoryUsage = () => {
    if (!systemInfo.value) return 0
    const used = systemInfo.value.totalMem - systemInfo.value.freeMem
    return (used / systemInfo.value.totalMem) * 100
  }
  
  // Initial load
  loadData()
  
  // Set up refresh interval
  $effect(() => {
    const interval = setInterval(() => {
      if (refreshEnabled.value) {
        loadData()
      }
    }, refreshRate)
    
    return () => clearInterval(interval)
  })
  
  return {
    init: () => ({ selectedTab: 0 }),
    
    update: (msg, model) => {
      switch (msg._tag) {
        case "KeyPress":
          switch (msg.key.name) {
            case "tab":
              selectedTab.update(t => (t + 1) % 3)
              break
            case "r":
              loadData()
              break
            case "p":
              refreshEnabled.update(e => !e)
              break
            case "q":
              return [model, [{ _tag: "Quit" }]]
          }
          break
      }
      
      return [model, []]
    },
    
    view: () => {
      if (!systemInfo.value) {
        return Panel(
          text("Loading system information..."),
          { title: "System Monitor" }
        )
      }
      
      // Simple tab implementation
      const tabLabels = ["Overview", "Processes", "Help"]
      const tabBar = hstack(
        ...tabLabels.map((label, i) => 
          styledText(
            ` ${label} `,
            i === selectedTab.value 
              ? style().background(Colors.blue).foreground(Colors.white).bold()
              : style().faint()
          )
        )
      )
      
      let content: any
      
      if (selectedTab.value === 0) {
        // Overview tab
        content = vstack(
            hstack(
              text("Hostname: "),
              styledText(systemInfo.value.hostname, style().foreground(Colors.cyan))
            ),
            hstack(
              text("Platform: "),
              text(`${systemInfo.value.platform} ${systemInfo.value.arch}`)
            ),
            hstack(
              text("Uptime: "),
              styledText(systemInfo.value.uptime, style().foreground(Colors.green))
            ),
            text(""),
            text("CPU Information:"),
            hstack(
              text("  Cores: "),
              text(systemInfo.value.cpuCount.toString())
            ),
            hstack(
              text("  Load: "),
              text(systemInfo.value.loadAvg.map(l => l.toFixed(2)).join(" "))
            ),
            text(""),
            text("Memory Usage:"),
            hstack(
              text("  "),
              text(createBar(getMemoryUsage(), 100)),
              text(` ${getMemoryUsage().toFixed(1)}%`)
            ),
            hstack(
              text("  Used: "),
              text(formatBytes(systemInfo.value.totalMem - systemInfo.value.freeMem))
            ),
            hstack(
              text("  Free: "),
              text(formatBytes(systemInfo.value.freeMem))
            ),
            hstack(
              text("  Total: "),
              text(formatBytes(systemInfo.value.totalMem))
            )
        )
      } else if (selectedTab.value === 1) {
        // Processes tab
        content = vstack(
            text("Top Processes by CPU:"),
            text(""),
            ...processes.value.map(proc => 
              hstack(
                styledText(proc.pid.toString().padEnd(8), style().faint()),
                text(proc.name.substring(0, 30).padEnd(32)),
                styledText(`CPU: ${proc.cpu.toFixed(1)}%`.padEnd(12), 
                  style().foreground(proc.cpu > 50 ? Colors.red : Colors.green)),
                styledText(`MEM: ${proc.memory.toFixed(1)}%`, 
                  style().foreground(proc.memory > 30 ? Colors.yellow : Colors.green))
              )
            )
          )
      } else {
        // Help tab
        content = vstack(
            text("Keyboard Shortcuts:"),
            text(""),
            hstack(
              styledText("Tab", style().foreground(Colors.cyan)),
              text("   - Switch between tabs")
            ),
            hstack(
              styledText("r", style().foreground(Colors.cyan)),
              text("     - Refresh data")
            ),
            hstack(
              styledText("p", style().foreground(Colors.cyan)),
              text("     - Toggle auto-refresh")
            ),
            hstack(
              styledText("q", style().foreground(Colors.cyan)),
              text("     - Quit")
            ),
            text(""),
            text("Status:"),
            hstack(
              text("Auto-refresh: "),
              styledText(
                refreshEnabled.value ? "ON" : "OFF",
                style().foreground(refreshEnabled.value ? Colors.green : Colors.red)
              )
            ),
            hstack(
              text("Last update: "),
              text(lastUpdate.value.toLocaleTimeString())
            )
          )
      }
      
      return Panel(
        vstack(
          tabBar,
          text(""),
          content,
          text(""),
          hstack(
            text("Press "),
            styledText("Tab", style().bold()),
            text(" to switch tabs, "),
            styledText("q", style().bold()),
            text(" to quit")
          )
        ),
        { title: "System Monitor", border: "double" }
      )
    }
  }
  })
  
  return component(props)
}

// CLI Configuration
const config = defineConfig({
  name: "sysmon",
  version: "1.0.0",
  description: "Real-time system monitoring dashboard",
  
  options: {
    refresh: z.number().default(2000).describe("Refresh rate in milliseconds"),
    json: z.boolean().default(false).describe("Output current stats as JSON")
  },
  
  commands: {
    start: {
      description: "Start the system monitor dashboard",
      options: {
        refresh: z.number().default(2000).describe("Refresh rate in milliseconds")
      },
      handler: async (args) => {
        return createSystemMonitor({ refreshRate: args.refresh })
      }
    },
    
    snapshot: {
      description: "Take a snapshot of current system stats",
      handler: async (args) => {
        const [sysInfo, procList] = await Promise.all([
          getSystemInfo(),
          getProcessList()
        ])
        
        const snapshot = {
          timestamp: new Date().toISOString(),
          system: sysInfo,
          topProcesses: procList.slice(0, 5)
        }
        
        if (args.json) {
          console.log(JSON.stringify(snapshot, null, 2))
          return
        }
        
        return Panel(
          vstack(
            text(`System Snapshot - ${new Date().toLocaleString()}`),
            text(""),
            text(`Hostname: ${sysInfo.hostname}`),
            text(`Platform: ${sysInfo.platform} ${sysInfo.arch}`),
            text(`Uptime: ${sysInfo.uptime}`),
            text(""),
            text("Memory:"),
            text(`  Total: ${formatBytes(sysInfo.totalMem)}`),
            text(`  Free: ${formatBytes(sysInfo.freeMem)}`),
            text(`  Used: ${formatBytes(sysInfo.totalMem - sysInfo.freeMem)}`),
            text(""),
            text("Top Processes:"),
            ...procList.slice(0, 5).map(p => 
              text(`  ${p.name} - CPU: ${p.cpu}%, MEM: ${p.memory}%`)
            )
          ),
          { title: "System Snapshot" }
        )
      }
    }
  }
})

// Run if executed directly
if (typeof Bun !== 'undefined' && import.meta.path === Bun.main) {
  // Default to start command if no command provided
  const args = process.argv.slice(2)
  if (args.length === 0 || (args.length === 1 && args[0].startsWith('--'))) {
    args.unshift('start')
  }
  
  runCLI(config, args).catch(console.error)
}