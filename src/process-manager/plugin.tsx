/**
 * Process Manager Plugin for JSX CLI Applications
 * 
 * Wraps the existing tuix process manager functionality in a JSX plugin interface
 * with beautiful terminal styling and user-friendly commands
 */

import { defineJSXCommand, type JSXCommandContext } from "../jsx/app"
import { ProcessManager as ProcessManagerClass } from "../process-manager/manager"
import { ProcessMonitor } from "../process-manager"
import { createConsoleLogger } from "../logger"
import { runApp } from "../core/runtime"
import { LiveServices } from "../services/impl"
import { Effect } from "effect"
import { type TuixConfig } from "../config/types"
import * as fs from "fs/promises"
import * as path from "path"

/**
 * Parse a command string into command and arguments array
 * Handles quoted arguments properly
 */
function parseCommand(commandString: string): { command: string; args: string[] } {
  const parts: string[] = []
  let current = ''
  let inQuotes = false
  let quoteChar = ''
  
  for (let i = 0; i < commandString.length; i++) {
    const char = commandString[i]
    
    if ((char === '"' || char === "'") && !inQuotes) {
      inQuotes = true
      quoteChar = char
    } else if (char === quoteChar && inQuotes) {
      inQuotes = false
      quoteChar = ''
    } else if (char === ' ' && !inQuotes) {
      if (current.trim()) {
        parts.push(current.trim())
        current = ''
      }
    } else {
      current += char
    }
  }
  
  if (current.trim()) {
    parts.push(current.trim())
  }
  
  return {
    command: parts[0] || '',
    args: parts.slice(1)
  }
}

// Global process manager instance
let processManager: ProcessManagerClass | null = null

/**
 * Initialize process manager if not already done
 */
async function getProcessManager(tuixConfig?: TuixConfig): Promise<ProcessManagerClass> {
  if (!processManager) {
    // Get config data - handle both plain object and config manager
    const configData = tuixConfig?.toObject ? tuixConfig.toObject() : tuixConfig || {}
    const debugEnabled = configData.enableTuixDebug ?? process.env.TUIX_DEBUG === 'true'
    
    // Debug logging will be handled by logger below
    
    const loggerConfig = configData.logger || {
      level: "info",
      colorize: true,
      prettyPrint: true,
      showEmoji: true
    }
    
    const logger = createConsoleLogger(debugEnabled ? 'debug' : loggerConfig.level, { 
      colorize: loggerConfig.colorize !== false, 
      prettyPrint: loggerConfig.prettyPrint !== false, 
      showEmoji: loggerConfig.showEmoji !== false 
    })
    
    // Helper to run logger effects
    const log = async (level: 'debug' | 'info' | 'warn' | 'error', message: string, metadata?: Record<string, any>) => {
      if (level === 'debug' && !debugEnabled) return
      await Effect.runPromise(logger[level](message, metadata)).catch(() => {
        console[level === 'debug' ? 'log' : level](`[ProcessManager] ${message}`, metadata)
      })
    }

    const processManagerConfig = configData.processManager || {}
    
    processManager = new ProcessManagerClass({
      logger: logger.child("process-manager"),
      logDir: processManagerConfig.logDir || "./logs",
      autoSave: processManagerConfig.autoSave !== false,
      cwd: process.cwd(), // Pass the current working directory where exemplar was called
      debugTuix: debugEnabled
    })

    await processManager.init()
    
    // Always load from config
    if (processManagerConfig.services) {
      await log('debug', `🔧 Loading ${Object.keys(processManagerConfig.services).length} services from config`)
      for (const [name, config] of Object.entries(processManagerConfig.services)) {
        try {
          // Check if process already exists
          const existing = processManager.list().find(p => p.name === name)
          if (existing) {
            await log('debug', `  • Service ${name} already exists`)
            continue
          }
          
          await log('debug', `  • Adding service: ${name}`)
          
          // Parse command string into command and args if needed
          let processConfig = { name, ...config }
          if (typeof config.command === 'string' && config.command.includes(' ')) {
            const { command, args } = parseCommand(config.command)
            processConfig = {
              ...processConfig,
              command,
              args: [...args, ...(config.args || [])]
            }
            await log('debug', `    • Parsed command: ${processConfig.command} with args: [${processConfig.args.join(', ')}]`)
          }
          
          await processManager.add(processConfig)
        } catch (error) {
          await log('error', `  ❌ Failed to add ${name}: ${error instanceof Error ? error.message : String(error)}`)
        }
      }
      await log('debug', `✅ Loaded ${processManager.list().length} services into ProcessManager`)
    } else {
      await log('warn', '⚠️ No services found in config')
      await log('debug', `Config data: ${JSON.stringify(configData, null, 2)}`)
    }
  }
  return processManager
}

/**
 * Get service configuration presets (copied from tuix binary)
 */
async function getServiceConfig(serviceName: string, preset?: string) {
  const presets: Record<string, any> = {
    vitest: {
      name: serviceName,
      command: "bun test --watch",
      autorestart: true,
      group: "testing",
      logPreset: "vitest",
      healthCheck: {
        pattern: "Test Files|PASS|FAIL",
        timeout: 10000
      }
    },
    vite: {
      name: serviceName,
      command: "bun run dev",
      autorestart: true,
      group: "build",
      logPreset: "vite",
      healthCheck: {
        pattern: "Local:|ready in|build started",
        timeout: 15000
      }
    },
    tsc: {
      name: serviceName,
      command: "bun run typecheck --watch",
      autorestart: false,
      group: "quality",
      logPreset: "tsc",
      healthCheck: {
        pattern: "Found \\d+ errors|No errors found",
        timeout: 10000
      }
    },
    eslint: {
      name: serviceName,
      command: "bun run lint --watch",
      autorestart: false,
      group: "quality",
      logPreset: "eslint",
      healthCheck: {
        pattern: "✓|✗|problems?",
        timeout: 8000
      }
    },
    bun: {
      name: serviceName,
      command: "bun test --watch",
      autorestart: true,
      group: "testing",
      logPreset: "bun",
      healthCheck: {
        pattern: "pass|fail|\\d+ test",
        timeout: 8000
      }
    }
  }
  
  if (preset && presets[preset]) {
    return presets[preset]
  }
  
  return {
    name: serviceName,
    command: serviceName,
    autorestart: false,
    logPreset: "default"
  }
}

// Old command definitions removed - now inlined in ProcessManagerPlugin JSX

/**
 * Process status display component
 */
const ProcessStatusView = ({ process, detailed }: { process: any, detailed?: boolean }) => {
  const statusColors = {
    running: 'green',
    stopped: 'gray',
    error: 'red',
    starting: 'yellow'
  }

  const statusIcons = {
    running: '🟢',
    stopped: '⚪',
    error: '🔴',
    starting: '🟡'
  }

  const uptime = process.startTime ? 
    `${Math.floor((Date.now() - process.startTime.getTime()) / 1000)}s` : "-"

  return (
    <panel border="single" style={{ padding: '0.5' }}>
      <vstack>
        <hstack>
          <text>{statusIcons[process.status as keyof typeof statusIcons] || '⚫'}</text>
          <text bold color="cyan">{process.name.padEnd(20)}</text>
          <text color={statusColors[process.status as keyof typeof statusColors] || 'white'}>
            [{process.status.toUpperCase().padEnd(8)}]
          </text>
          <text color="gray">PID: {(process.pid || "-").toString().padEnd(8)}</text>
          <text color="blue">⏱️  {uptime.padEnd(10)}</text>
          <text color="yellow">🔄 {process.restarts || 0}</text>
        </hstack>
        
        {detailed && (
          <vstack>
            <text color="gray">├─ Command: {process.command || "Unknown"}</text>
            {process.group && <text color="purple">├─ Group: {process.group}</text>}
            {process.args?.length > 0 && <text color="gray">└─ Args: {process.args.join(' ')}</text>}
          </vstack>
        )}
      </vstack>
    </panel>
  )
}

/**
 * Log entry display component
 */
const LogEntryView = ({ log, service }: { log: any, service: string }) => {
  const levelColors = {
    debug: 'gray',
    info: 'blue',
    warn: 'yellow',
    error: 'red'
  }

  return (
    <hstack>
      <text color="gray">{log.timestamp.toLocaleTimeString()}</text>
      <text color={levelColors[log.level as keyof typeof levelColors] || 'white'}>
        {log.level.toUpperCase()}
      </text>
      <text color="cyan">[{service}]</text>
      <text>{log.message}</text>
    </hstack>
  )
}

/**
 * Interactive status monitoring component
 */
const InteractiveStatusView = ({ pm, service, timeout }: { 
  pm: ProcessManagerClass
  service?: string
  timeout?: number 
}) => {
  return (
    <vstack>
      <text color="cyan" bold>📊 Interactive Process Monitor</text>
      <text color="gray">
        {service ? `Monitoring: ${service}` : 'Monitoring all processes'}
        {timeout && ` (timeout: ${timeout}s)`}
      </text>
      <text></text>
      <text color="yellow">🚧 Interactive monitoring would be rendered here</text>
      <text color="gray">Press 'q' to quit, 'r' to refresh</text>
    </vstack>
  )
}

/**
 * Main Process Manager Plugin as JSX Component
 */
export const ProcessManagerPlugin = ({ 
  name = "pm", 
  description = "Process management and monitoring", 
  version = "1.0.0",
  as
}: { 
  name?: string
  description?: string 
  version?: string
  as?: string
} = {}) => {
  console.log(`[ProcessManagerPlugin] Called with name='${name}', as='${as}'`)
  // Use the 'as' prop to rename the plugin if provided
  const pluginName = as || name
  
  console.log(`[ProcessManagerPlugin] Returning plugin JSX with name='${pluginName}'`)
  
  // Define the process manager getter inside the component scope
  // so it's available to all handlers
  const getProcessManagerForHandlers = async (tuixConfig?: any): Promise<ProcessManagerClass> => {
    return await getProcessManager(tuixConfig)
  }

  return (
  <plugin name={pluginName} description={description} version={version}>
    <command 
      name="start" 
      description="Start a service or all services"
      args={{
        service: {
          description: "Service name (optional, starts all if not specified)",
          required: false
        }
      }}
      flags={{
        preset: {
          description: "Service preset (vitest, vite, tsc, eslint, bun)",
          alias: "p",
          type: "string",
          choices: ["vitest", "vite", "tsc", "eslint", "bun"]
        },
        command: {
          description: "Custom command to run",
          alias: "c",
          type: "string"
        },
        group: {
          description: "Service group",
          alias: "g",
          type: "string"
        },
        autorestart: {
          description: "Auto-restart on failure",
          alias: "r",
          type: "boolean"
        }
      }}
      handler={async (ctx) => {
        try {
          const pm = await getProcessManagerForHandlers(ctx.tuixConfig)
          const serviceName = ctx.args.service
          
          // If no service specified, show list or start all
          if (!serviceName) {
            const processes = pm.list()
            
            if (processes.length === 0) {
              return (
                <vstack>
                  <text color="yellow">No services configured yet.</text>
                  <text></text>
                  <text color="cyan" bold>💡 Recommended: Add services to your config file</text>
                  <text color="gray">Add this to your tuix.config.ts or {ctx.cliName}.config.ts:</text>
                  <text></text>
                  <panel border="single" title="Example Config">
                    <vstack>
                      <text color="green">export default defineConfig({`{`}</text>
                      <text color="green">  processManager: {`{`}</text>
                      <text color="green">    services: {`{`}</text>
                      <text color="green">      'dev-server': {`{`}</text>
                      <text color="green">        command: 'npm run dev',</text>
                      <text color="green">        autorestart: true,</text>
                      <text color="green">        group: 'development'</text>
                      <text color="green">      {`}`}</text>
                      <text color="green">    {`}`}</text>
                      <text color="green">  {`}`}</text>
                      <text color="green">{`}`})</text>
                    </vstack>
                  </panel>
                  <text></text>
                  <text color="gray">Or add manually: {ctx.cliName} {pluginName} start &lt;service&gt; --command &lt;cmd&gt;</text>
                  <text color="gray">Or use a preset: {ctx.cliName} {pluginName} start &lt;service&gt; --preset vite</text>
                </vstack>
              )
            }
            
            // Start all stopped services
            const stoppedServices = processes.filter(p => p.status === 'stopped')
            if (stoppedServices.length === 0) {
              return (
                <vstack>
                  <text color="green">✅ All services are already running!</text>
                  <ProcessStatusView process={processes[0]} />
                </vstack>
              )
            }
            
            // Start all stopped services
            for (const service of stoppedServices) {
              await pm.start(service.name)
            }
            
            return (
              <vstack>
                <text color="green">✅ Started {stoppedServices.length} service(s)</text>
                <text></text>
                {stoppedServices.map(service => (
                  <text key={service.name} color="gray">  • {service.name}</text>
                ))}
              </vstack>
            )
          }
          
          // Check if service already exists
          const existing = pm.list().find(p => p.name === serviceName)
          
          if (!existing) {
            // Create service with preset or custom configuration
            let config
            if (ctx.flags.command) {
              config = {
                name: serviceName,
                command: ctx.flags.command,
                autorestart: ctx.flags.autorestart || false,
                group: ctx.flags.group || "default"
              }
            } else {
              config = await getServiceConfig(serviceName, ctx.flags.preset as string)
              if (ctx.flags.group) config.group = ctx.flags.group
              if (ctx.flags.autorestart !== undefined) config.autorestart = ctx.flags.autorestart
            }
            
            await pm.add(config)
          }
          
          await pm.start(serviceName)
          
          return (
            <vstack>
              <text color="green">✅ Service started successfully!</text>
              <panel title="Service Details" border="rounded">
                <vstack>
                  <text>Name: {serviceName}</text>
                  {ctx.flags.preset && <text>Preset: {ctx.flags.preset}</text>}
                  {ctx.flags.command && <text>Command: {ctx.flags.command}</text>}
                  {ctx.flags.group && <text>Group: {ctx.flags.group}</text>}
                  <text>Auto-restart: {ctx.flags.autorestart ? 'Yes' : 'No'}</text>
                </vstack>
              </panel>
            </vstack>
          )
        } catch (error) {
          return (
            <vstack>
              <text color="red">❌ Failed to start service: {error.message}</text>
              <text color="blue">Try: {ctx.cliName} {pluginName} start &lt;service&gt; --preset &lt;preset&gt;</text>
            </vstack>
          )
        }
      }}
    />
    
    <command 
      name="stop" 
      description="Stop a service or all services"
      args={{
        service: {
          description: "Service name (optional, stops all if not specified)",
          required: false
        }
      }}
      flags={{
        force: {
          description: "Force stop",
          alias: "f", 
          type: "boolean"
        }
      }}
      handler={async (ctx) => {
        try {
          const pm = await getProcessManagerForHandlers(ctx.tuixConfig)
          const serviceName = ctx.args.service
          
          // If no service specified, stop all running services
          if (!serviceName) {
            const processes = pm.list()
            const runningServices = processes.filter(p => p.status === 'running')
            
            if (runningServices.length === 0) {
              return <text color="yellow">No services are currently running.</text>
            }
            
            // Stop all running services
            for (const service of runningServices) {
              await pm.stop(service.name)
            }
            
            return (
              <vstack>
                <text color="green">✅ Stopped {runningServices.length} service(s)</text>
                <text></text>
                {runningServices.map(service => (
                  <text key={service.name} color="gray">  • {service.name}</text>
                ))}
              </vstack>
            )
          }
          
          await pm.stop(serviceName)
          
          return (
            <text color="green">✅ Service stopped: {serviceName}</text>
          )
        } catch (error) {
          return (
            <text color="red">❌ Failed to stop: {error.message}</text>
          )
        }
      }}
    />
    
    <command 
      name="restart" 
      description="Restart a service or all services"
      args={{
        service: {
          description: "Service name (optional, restarts all if not specified)",
          required: false
        }
      }}
      handler={async (ctx) => {
        try {
          const pm = await getProcessManagerForHandlers(ctx.tuixConfig)
          const serviceName = ctx.args.service
          
          // If no service specified, restart all services
          if (!serviceName) {
            const processes = pm.list()
            
            if (processes.length === 0) {
              return <text color="yellow">No services configured.</text>
            }
            
            // Restart all services in parallel
            await Promise.all(
              processes.map(service => pm.restart(service.name))
            )
            
            return (
              <vstack>
                <text color="green">✅ Restarted {processes.length} service(s)</text>
                <text></text>
                {processes.map(service => (
                  <text key={service.name} color="gray">  • {service.name}</text>
                ))}
              </vstack>
            )
          }
          
          await pm.restart(serviceName)
          
          return (
            <text color="green">✅ Service restarted: {serviceName}</text>
          )
        } catch (error) {
          return (
            <text color="red">❌ Failed to restart: {error.message}</text>
          )
        }
      }}
    />
    
    <command 
      name="status" 
      description="Show process status"
      args={{
        service: {
          description: "Specific service name",
          required: false
        }
      }}
      flags={{
        watch: {
          description: "Watch status in real-time",
          alias: "w",
          type: "boolean"
        },
        detailed: {
          description: "Show detailed information",
          alias: "d", 
          type: "boolean"
        }
      }}
      interactive={(ctx) => ctx.flags.watch === true}
      handler={async (ctx) => {
        try {
          const pm = await getProcessManagerForHandlers(ctx.tuixConfig)
          
          let processes: any[]
          if (ctx.args.service) {
            // Check if the specific service exists first
            const allProcesses = pm.list()
            const serviceProcess = allProcesses.find(p => p.name === ctx.args.service)
            if (!serviceProcess) {
              return (
                <vstack>
                  <text color="red">❌ Service '{ctx.args.service}' not found</text>
                  <text></text>
                  <text color="gray">Available services:</text>
                  {allProcesses.length === 0 ? (
                    <text color="yellow">  No services configured</text>
                  ) : (
                    allProcesses.map(proc => (
                      <text key={proc.name} color="cyan">  • {proc.name}</text>
                    ))
                  )}
                </vstack>
              )
            }
            processes = [serviceProcess]
          } else {
            processes = pm.list()
          }
          
          return (
            <vstack>
              <panel border="double" title="📊 Process Status Dashboard" style={{ padding: '1' }}>
                {processes.length === 0 ? (
                  <vstack>
                    <text color="yellow">⚠️  No processes configured or running</text>
                    <text></text>
                    <text color="gray">Quick start options:</text>
                    <text color="green">  • {ctx.cliName} {pluginName} start &lt;name&gt; --preset vite</text>
                    <text color="green">  • {ctx.cliName} {pluginName} start &lt;name&gt; --command "npm run dev"</text>
                    <text color="green">  • {ctx.cliName} {pluginName} config --init</text>
                  </vstack>
                ) : (
                  <vstack>
                    <hstack>
                      <text color="gray">Total: {processes.length}</text>
                      <text color="green">Running: {processes.filter(p => p.status === 'running').length}</text>
                      <text color="red">Stopped: {processes.filter(p => p.status === 'stopped').length}</text>
                      <text color="yellow">Other: {processes.filter(p => !['running', 'stopped'].includes(p.status)).length}</text>
                    </hstack>
                    <text>{'─'.repeat(80)}</text>
                    {processes.map((proc: any) => (
                      <ProcessStatusView key={proc.name} process={proc} detailed={ctx.flags.detailed} />
                    ))}
                  </vstack>
                )}
              </panel>
            </vstack>
          )
        } catch (error) {
          return (
            <text color="red">❌ Failed to get process status: {error.message}</text>
          )
        }
      }}
    />
    
    <command 
      name="logs" 
      description="Show process logs"
      args={{
        service: {
          description: "Service name",
          required: false
        }
      }}
      flags={{
        lines: {
          description: "Number of lines to show",
          alias: "n",
          type: "number",
          default: 50
        },
        follow: {
          description: "Follow log output",
          alias: "f",
          type: "boolean"
        }
      }}
      handler={async (ctx) => {
        try {
          const pm = await getProcessManagerForHandlers(ctx.tuixConfig)
          
          // If no service specified, show available services
          if (!ctx.args.service) {
            const processes = pm.list()
            return (
              <vstack>
                <text color="cyan" bold>Process Logs</text>
                <text></text>
                {processes.length === 0 ? (
                  <text color="yellow">No processes running.</text>
                ) : (
                  <vstack>
                    <text>Available services:</text>
                    {processes.map(proc => (
                      <text key={proc.name} color="green">  • {proc.name}</text>
                    ))}
                    <text></text>
                    <text color="gray">Usage: {ctx.cliName} {pluginName} logs &lt;service&gt;</text>
                  </vstack>
                )}
              </vstack>
            )
          }
          
          const logs = pm.getLogs(ctx.args.service, ctx.flags.lines)
          
          return (
            <vstack>
              <text color="blue" bold>📝 Logs: {ctx.args.service}</text>
              <text color="gray">Showing {logs.length} entries</text>
              <text></text>
              
              {logs.length === 0 ? (
                <text color="yellow">No logs available for this service</text>
              ) : (
                <vstack>
                  {logs.map((log, i) => (
                    <LogEntryView key={i} log={log} service={ctx.args.service} />
                  ))}
                  {ctx.flags.follow && (
                    <text color="cyan">🔄 Following logs... Press Ctrl+C to stop</text>
                  )}
                </vstack>
              )}
            </vstack>
          )
        } catch (error) {
          return (
            <text color="red">❌ Failed to get logs: {error.message}</text>
          )
        }
      }}
    />

    {/* Dashboard command */}
    <command 
      name="dashboard" 
      description="Interactive process and log dashboard"
      flags={{
        logs: {
          description: "Show log dashboard instead of process dashboard",
          alias: "l",
          type: "boolean"
        },
        preset: {
          description: "Apply log filter preset",
          alias: "p",
          type: "string",
          choices: ["errors", "warnings", "debug", "vite", "vitest", "typescript", "production", "recent"]
        },
        refresh: {
          description: "Refresh interval in milliseconds",
          alias: "r", 
          type: "number",
          default: 1000
        }
      }}
      interactive={true}
      handler={async (ctx) => {
        try {
          const pm = await getProcessManagerForHandlers(ctx.tuixConfig)
          
          if (ctx.flags.logs) {
            // Show log dashboard with filtering
            const processes = pm.list().map(proc => ({
              name: proc.name,
              logs: pm.getLogs(proc.name, 100),
              status: proc.status
            }))
            
            return (
              <vstack>
                <panel border="double" title="📊 Live Log Dashboard" style={{ padding: '1' }}>
                  <vstack>
                    <hstack>
                      <text color="gray">Monitoring: {processes.length} processes</text>
                      {ctx.flags.preset && <text color="cyan">Preset: {ctx.flags.preset}</text>}
                      <text color="blue">Refresh: {ctx.flags.refresh}ms</text>
                    </hstack>
                    <text>{'─'.repeat(80)}</text>
                    
                    {processes.length === 0 ? (
                      <panel border="single" style={{ padding: '1' }}>
                        <vstack>
                          <text color="yellow">⚠️  No processes running</text>
                          <text color="gray">Start some services first: {ctx.cliName} {pluginName} start &lt;service&gt;</text>
                        </vstack>
                      </panel>
                    ) : (
                      <vstack>
                        {/* Process status overview */}
                        <panel border="rounded" title="Process Overview" style={{ padding: '1' }}>
                          <vstack>
                            {processes.map(proc => {
                              const recentLogs = proc.logs.filter(log => 
                                Date.now() - log.timestamp.getTime() < 60000
                              )
                              const errorCount = recentLogs.filter(log => log.level === 'error').length
                              const warnCount = recentLogs.filter(log => log.level === 'warn').length
                              
                              return (
                                <hstack key={proc.name}>
                                  <text color={proc.status === 'running' ? 'green' : proc.status === 'error' ? 'red' : 'gray'}>●</text>
                                  <text bold color="cyan">{proc.name.padEnd(20)}</text>
                                  <text color="blue">{proc.logs.length.toString().padStart(5)} logs</text>
                                  {errorCount > 0 && <text color="red">  ❌ {errorCount} errors</text>}
                                  {warnCount > 0 && <text color="yellow">  ⚠️  {warnCount} warnings</text>}
                                </hstack>
                              )
                            })}
                          </vstack>
                        </panel>
                        
                        <text></text>
                        
                        {/* Recent log entries */}
                        <panel border="rounded" title="Recent Logs" style={{ padding: '1', maxHeight: '20' }}>
                          <vstack>
                            {(() => {
                      // Combine and sort all logs
                      const allLogs: any[] = []
                      processes.forEach(proc => {
                        proc.logs.forEach(log => {
                          allLogs.push({ ...log, processName: proc.name })
                        })
                      })
                      allLogs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
                      
                      // Apply preset filter
                      let filteredLogs = allLogs
                      if (ctx.flags.preset) {
                        const presetMap = {
                          errors: (log: any) => log.level === 'error' || log.level === 'fatal',
                          warnings: (log: any) => ['warn', 'error', 'fatal'].includes(log.level),
                          debug: (log: any) => log.level !== 'trace',
                          vite: (log: any) => /\b(vite|hmr|dev|build)\b/i.test(log.message),
                          vitest: (log: any) => /\b(test|vitest|spec|pass|fail)\b/i.test(log.message),
                          typescript: (log: any) => /\b(typescript|tsc|error ts)\b/i.test(log.message),
                          production: (log: any) => !log.message.includes('[DEV]') && !log.message.includes('hmr'),
                          recent: (log: any) => Date.now() - log.timestamp.getTime() < 5 * 60 * 1000
                        }
                        const presetFilter = presetMap[ctx.flags.preset as keyof typeof presetMap]
                        if (presetFilter) {
                          filteredLogs = filteredLogs.filter(presetFilter)
                        }
                      }
                      
                              return filteredLogs.slice(0, 20).map((log, i) => {
                                const timestamp = log.timestamp.toLocaleTimeString()
                                const levelColors = {
                                  error: 'red',
                                  warn: 'yellow', 
                                  info: 'blue',
                                  debug: 'gray'
                                }
                                const color = levelColors[log.level as keyof typeof levelColors] || 'white'
                                
                                return (
                                  <hstack key={i}>
                                    <text color="gray">{timestamp}</text>
                                    <text color="cyan">[{log.processName.padEnd(12)}]</text>
                                    <text color={color} bold>{log.level.toUpperCase().padEnd(5)}</text>
                                    <text>{log.message.substring(0, 80)}{log.message.length > 80 ? '...' : ''}</text>
                                  </hstack>
                                )
                              })
                            })()}
                          </vstack>
                        </panel>
                    
                        <text></text>
                        <panel border="single" style={{ padding: '0.5' }}>
                          <hstack>
                            <text color="yellow">🔄 Live updating...</text>
                            <text color="gray">Press Ctrl+C to exit</text>
                            <text color="cyan">Tip: Use --preset for filtering</text>
                          </hstack>
                        </panel>
                      </vstack>
                    )}
                  </vstack>
                </panel>
              </vstack>
            )
          } else {
            // Traditional process monitor dashboard
            await Effect.runPromise(
              ProcessMonitor({ manager: pm }).pipe(
                Effect.provide(LiveServices)
              )
            )
            
            return (
              <text color="green">Process dashboard exited</text>
            )
          }
        } catch (error) {
          return (
            <text color="red">❌ Failed to start dashboard: {error.message}</text>
          )
        }
      }}
    />
    
    {/* Config management command */}
    <command 
      name="config" 
      description="Manage process manager configuration"
      flags={{
        init: {
          description: "Initialize config file with example services",
          type: "boolean"
        },
        show: {
          description: "Show current config",
          type: "boolean"
        },
        path: {
          description: "Show config file path",
          type: "boolean"
        }
      }}
      handler={async (ctx) => {
        try {
          if (ctx.flags.init) {
            // Create example config file
            const configName = ctx.cliName === 'tuix' ? 'tuix' : ctx.cliName
            const configPath = `${configName}.config.ts`
            
            const configContent = `import { defineConfig } from 'tuix'

export default defineConfig({
  // Process manager services
  processManager: {
    services: {
      // Example development server
      'dev-server': {
        command: 'npm run dev',
        autorestart: true,
        group: 'development',
        env: {
          NODE_ENV: 'development'
        }
      },
      
      // Example test watcher
      'test-watch': {
        command: 'npm run test:watch',
        autorestart: true,
        group: 'testing'
      },
      
      // Example type checker
      'typecheck': {
        command: 'npm run typecheck --watch',
        autorestart: false,
        group: 'quality'
      }
    },
    
    // Process manager settings
    logDir: './logs',
    autoSave: true
  },
  
  // Logger configuration
  logger: {
    level: 'info',
    format: 'json',
    outputs: ['console']
  }
})
`
            
            await Bun.write(configPath, configContent)
            
            return (
              <vstack>
                <text color="green">✅ Created config file: {configPath}</text>
                <text></text>
                <text color="cyan">📝 Example services added:</text>
                <text color="gray">  • dev-server (npm run dev)</text>
                <text color="gray">  • test-watch (npm run test:watch)</text>
                <text color="gray">  • typecheck (npm run typecheck --watch)</text>
                <text></text>
                <text color="yellow">Edit the config file to customize your services!</text>
                <text color="gray">Then run: {ctx.cliName} {pluginName} start</text>
              </vstack>
            )
          }
          
          if (ctx.flags.show) {
            const config = ctx.tuixConfig
            if (!config) {
              return <text color="yellow">No config loaded. Run with --init to create one.</text>
            }
            
            const services = config.processManager?.services || {}
            const serviceCount = Object.keys(services).length
            
            return (
              <vstack>
                <text color="cyan" bold>📋 Current Configuration</text>
                <text></text>
                <text>Services configured: {serviceCount}</text>
                <text></text>
                {serviceCount > 0 && (
                  <panel title="Configured Services" border="rounded">
                    <vstack>
                      {Object.entries(services).map(([name, service]: [string, any]) => (
                        <hstack key={name}>
                          <text color="green">{name}:</text>
                          <text color="gray">{service.command}</text>
                          {service.group && <text color="purple">[{service.group}]</text>}
                          {service.autorestart && <text color="yellow">[auto-restart]</text>}
                        </hstack>
                      ))}
                    </vstack>
                  </panel>
                )}
              </vstack>
            )
          }
          
          if (ctx.flags.path) {
            const configName = ctx.cliName === 'tuix' ? 'tuix' : ctx.cliName
            const possiblePaths = [
              `${configName}.config.ts`,
              `${configName}.config.js`,
              `tuix.config.ts`,
              `tuix.config.js`,
              `.${configName}/config.ts`,
              `.${configName}/config.js`,
              `.tuix/config.ts`,
              `.tuix/config.js`
            ]
            
            return (
              <vstack>
                <text color="cyan" bold>📁 Config File Locations</text>
                <text color="gray">Config is loaded from first found file:</text>
                <text></text>
                {possiblePaths.map((path, i) => (
                  <text key={i} color="gray">  {i + 1}. {path}</text>
                ))}
                <text></text>
                <text color="yellow">Use --init to create a config file</text>
              </vstack>
            )
          }
          
          // Default: show help
          return (
            <vstack>
              <text color="cyan" bold>⚙️ Process Manager Config</text>
              <text></text>
              <text color="gray">Available commands:</text>
              <text color="green">  --init    Create example config file</text>
              <text color="green">  --show    Show current configuration</text>
              <text color="green">  --path    Show config file search paths</text>
              <text></text>
              <text color="yellow">Example: {ctx.cliName} {pluginName} config --init</text>
            </vstack>
          )
        } catch (error) {
          return (
            <text color="red">❌ Config command failed: {error.message}</text>
          )
        }
      }}
    />

    {/* Aliases */}
    <command 
      name="ps" 
      description="Show process status (alias)" 
      handler={async (ctx) => {
        try {
          const pm = await getProcessManagerForHandlers(ctx.tuixConfig)
          const processes = pm.list()
          
          return (
            <vstack>
              <panel border="double" title="📊 Process Status" style={{ padding: '1' }}>
                {processes.length === 0 ? (
                  <text color="yellow">No processes running. Use '{ctx.cliName} {pluginName} start' to begin.</text>
                ) : (
                  <vstack>
                    <text color="gray">{processes.length} process{processes.length > 1 ? 'es' : ''} monitored</text>
                    <text></text>
                    {processes.map((proc: any) => (
                      <ProcessStatusView key={proc.name} process={proc} />
                    ))}
                  </vstack>
                )}
              </panel>
            </vstack>
          )
        } catch (error) {
          return (
            <text color="red">❌ Failed to get process status: {error.message}</text>
          )
        }
      }}
    />
  </plugin>
  )
}

/**
 * Export getProcessManager for external use
 */
export { getProcessManager }

/**
 * Plugin hooks - these need to be registered separately since JSX components can't include hooks
 */
export const ProcessManagerHooks = {
  onInit: async (config?: TuixConfig) => {
    const debugEnabled = config?.enableTuixDebug ?? process.env.TUIX_DEBUG === 'true'
    if (debugEnabled) {
      console.log("🔧 Process Manager plugin initialized")
    }
    // Pre-initialize the process manager
    await getProcessManager(config)
  },
  
  onExit: async (config?: TuixConfig) => {
    const debugEnabled = config?.enableTuixDebug ?? process.env.TUIX_DEBUG === 'true'
    if (debugEnabled) {
      console.log("🔧 Process Manager plugin shutting down")
    }
    // Don't stop processes on plugin exit - they should persist
    // Only save state to ensure process info is persisted
    if (processManager) {
      await processManager.save?.()
    }
  }
}

export default ProcessManagerPlugin