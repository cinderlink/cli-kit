/**
 * Logging Plugin for JSX CLI Applications
 * 
 * Wraps the existing tuix logging functionality in a JSX plugin interface
 * with beautiful terminal styling and user-friendly commands
 */

import { defineJSXCommand, type JSXCommandContext } from "../jsx/app"
import { Plugin, Command } from "../jsx/index"
import { LogExplorer, createConsoleLogger, createDevelopmentLogger } from "../logger"
import { TUITransport } from "../logger/transports"
import { runApp } from "../core/runtime"
import { LiveServices } from "../services/impl"
import { Effect } from "effect"
import * as fs from "fs/promises"
import * as path from "path"

// Import the tuix binary logging functions (these are already well-tested)
// We'll adapt them to work with JSX styling

// State for the logging plugin - will be initialized with proper dir
let loggingState = {
  loggers: new Map<string, any>(),
  currentLogFile: null as string | null,
  logLevel: 'info' as 'debug' | 'info' | 'warn' | 'error',
  logDir: './logs' // Default, will be overridden by props/config
}

/**
 * Show logs command - similar to tuix logs
 */
const ShowLogsCommand = defineJSXCommand({
  name: "show",
  description: "Show logs from a file or logger",
  aliases: ["view", "cat"],
  args: {
    source: {
      description: "Log file or logger name",
      required: true
    }
  },
  flags: {
    lines: {
      description: "Number of lines to show",
      alias: "n",
      type: "number",
      default: 50
    },
    follow: {
      description: "Follow log output (tail -f)",
      alias: "f",
      type: "boolean"
    },
    filter: {
      description: "Filter logs by pattern/regex",
      type: "string"
    },
    level: {
      description: "Minimum log level to show",
      type: "string",
      choices: ["debug", "info", "warn", "error"]
    },
    interactive: {
      description: "Use interactive log explorer",
      alias: "i",
      type: "boolean"
    },
    timeout: {
      description: "Auto-stop watchers after specified seconds",
      type: "number"
    },
    dir: {
      description: "Override log directory",
      alias: "d",
      type: "string"
    }
  },
  examples: [
    "logs show app.log --lines 100",
    "logs show app.log --follow --filter 'error'",
    "logs show app.log --interactive",
    "logs show system --level warn"
  ],
  // Interactive when --follow or --interactive flags are used
  interactive: (ctx) => ctx.flags.follow === true || ctx.flags.interactive === true,
  handler: async (ctx) => {
    const { source } = ctx.args
    const { lines, follow, filter, level, interactive, timeout } = ctx.flags

    // Update log directory from config if not already set
    if (!ctx.flags.dir && ctx.tuixConfig) {
      if (ctx.tuixConfig.logsDirectory) {
        loggingState.logDir = ctx.tuixConfig.logsDirectory
      } else if (ctx.tuixConfig.tuixDir) {
        loggingState.logDir = path.join(ctx.tuixConfig.tuixDir, 'logs')
      }
    }

    if (interactive) {
      return <InteractiveLogsView source={source} filter={filter} level={level} timeout={timeout} />
    }

    try {
      // Check if it's a log file or logger name
      const isFile = source.includes('.') || source.includes('/')
      let logEntries: any[] = []

      if (isFile) {
        // Read from file - use dir flag if provided
        const logDir = ctx.flags.dir || loggingState.logDir
        const logPath = path.isAbsolute(source) ? source : path.join(logDir, source)
        const content = await fs.readFile(logPath, 'utf-8')
        const lines = content.split('\n').filter(line => line.trim())
        
        logEntries = lines.map((line, i) => {
          try {
            const parsed = JSON.parse(line)
            return {
              timestamp: new Date(parsed.timestamp || parsed.time || Date.now()),
              level: parsed.level || 'info',
              message: parsed.message || parsed.msg || line,
              source: path.basename(logPath)
            }
          } catch {
            return {
              timestamp: new Date(),
              level: 'info',
              message: line,
              source: path.basename(logPath)
            }
          }
        })
      } else {
        // Get from logger
        const logger = loggingState.loggers.get(source)
        if (!logger) {
          return (
            <vstack>
              <text color="red">{`Logger not found: ${source}`}</text>
              <text>{`Available loggers: ${Array.from(loggingState.loggers.keys()).join(', ')}`}</text>
            </vstack>
          )
        }
        
        // This would need to be implemented based on your logger interface
        logEntries = [] // logger.getRecentLogs?.(lines) || []
      }

      // Apply filters
      if (level) {
        const levelPriority = { debug: 0, info: 1, warn: 2, error: 3 }
        const minPriority = levelPriority[level as keyof typeof levelPriority]
        logEntries = logEntries.filter(entry => 
          levelPriority[entry.level as keyof typeof levelPriority] >= minPriority
        )
      }

      if (filter) {
        const regex = new RegExp(filter, 'i')
        logEntries = logEntries.filter(entry => regex.test(entry.message))
      }

      // Limit entries
      if (lines) {
        logEntries = logEntries.slice(-lines)
      }

      return (
        <vstack>
          <panel border="double" title={`📝 Logs from ${source}`} style={{ padding: '1' }}>
            <vstack>
              <hstack>
                <text color="gray">Entries: {logEntries.length}</text>
                {filter && <text color="cyan">Filter: {filter}</text>}
                {level && <text color="yellow">Level ≥ {level}</text>}
              </hstack>
              <text>{'─'.repeat(80)}</text>
              
              {logEntries.length === 0 ? (
                <panel border="single" style={{ padding: '1' }}>
                  <text color="yellow">⚠️  No log entries found</text>
                </panel>
              ) : (
                <panel border="rounded" title="Log Entries" style={{ padding: '1', maxHeight: '30' }}>
                  <vstack>
                    {logEntries.map((entry, i) => (
                      <LogEntryView key={i} entry={entry} />
                    ))}
                  </vstack>
                </panel>
              )}

              {follow && (
                <panel border="single" style={{ padding: '0.5' }}>
                  <hstack>
                    <text color="cyan">🔄 Following logs...</text>
                    <text color="gray">Ctrl+C to stop</text>
                  </hstack>
                </panel>
              )}
            </vstack>
          </panel>
        </vstack>
      )
    } catch (error) {
      return (
        <vstack>
          <text color="red">{`Failed to read logs: ${error instanceof Error ? error.message : String(error)}`}</text>
          <text color="blue">Usage: logs show &lt;file|logger&gt; [options]</text>
        </vstack>
      )
    }
  }
})

/**
 * List available logs
 */
const ListLogsCommand = defineJSXCommand({
  name: "list",
  description: "List available log files and loggers",
  aliases: ["ls"],
  flags: {
    verbose: {
      description: "Show detailed information",
      alias: "v",
      type: "boolean"
    },
    dir: {
      description: "Override log directory",
      alias: "d",
      type: "string"
    }
  },
  handler: async (ctx) => {
    const logFiles: string[] = []
    const loggers = Array.from(loggingState.loggers.keys())

    // Update log directory from config if not already set
    if (!ctx.flags.dir && ctx.tuixConfig) {
      if (ctx.tuixConfig.logsDirectory) {
        loggingState.logDir = ctx.tuixConfig.logsDirectory
      } else if (ctx.tuixConfig.tuixDir) {
        loggingState.logDir = path.join(ctx.tuixConfig.tuixDir, 'logs')
      }
    }

    try {
      // List log files in log directory - use dir flag if provided
      const logDir = ctx.flags.dir || loggingState.logDir
      const files = await fs.readdir(logDir)
      logFiles.push(...files.filter(file => file.endsWith('.log') || file.endsWith('.json')))
    } catch {
      // Log directory doesn't exist or is not accessible
    }

    return (
      <vstack>
        <panel border="double" title="📋 Available Logs" style={{ padding: '1' }}>
          <vstack>
            <panel title="📁 Log Files" border="rounded" style={{ padding: '1' }}>
              <vstack>
                {logFiles.length === 0 ? (
                  <text color="gray">No log files found in {ctx.flags.dir || loggingState.logDir}</text>
                ) : (
                  <vstack>
                    <text color="gray">Directory: {ctx.flags.dir || loggingState.logDir}</text>
                    <text></text>
                    {logFiles.map(file => (
                      <hstack key={file}>
                        <text color="green">📄</text>
                        <text color="cyan">{file}</text>
                        {ctx.flags.verbose && (
                          <text color="gray">  ({path.join(ctx.flags.dir || loggingState.logDir, file)})</text>
                        )}
                      </hstack>
                    ))}
                  </vstack>
                )}
              </vstack>
            </panel>

            <text></text>

            <panel title="🔧 Active Loggers" border="rounded" style={{ padding: '1' }}>
              <vstack>
                {loggers.length === 0 ? (
                  <text color="gray">No active loggers</text>
                ) : (
                  loggers.map(name => (
                    <hstack key={name}>
                      <text color="blue">•</text>
                      <text color="cyan">{name}</text>
                    </hstack>
                  ))
                )}
              </vstack>
            </panel>

            <text></text>
            <panel border="single" style={{ padding: '0.5' }}>
              <text color="gray">Use '{ctx.cliName} logs show &lt;name&gt;' to view logs</text>
            </panel>
          </vstack>
        </panel>
      </vstack>
    )
  }
})

/**
 * Configure logging
 */
const ConfigCommand = defineJSXCommand({
  name: "config",
  description: "Configure logging settings",
  subcommands: {
    set: defineJSXCommand({
      name: "set",
      description: "Set logging configuration",
      args: {
        key: {
          description: "Configuration key",
          required: true,
          choices: ["level", "dir", "format"]
        },
        value: {
          description: "Configuration value",
          required: true
        }
      },
      handler: (ctx) => {
        const { key, value } = ctx.args

        switch (key) {
          case 'level':
            if (!['debug', 'info', 'warn', 'error'].includes(value)) {
              return <error>Invalid log level. Use: debug, info, warn, error</error>
            }
            loggingState.logLevel = value
            break
          
          case 'dir':
            loggingState.logDir = value
            break
            
          default:
            return <error>Unknown configuration key: {key}</error>
        }

        return (
          <vstack>
            <text color="green">Configuration updated</text>
            <text>{`${key}: ${value}`}</text>
          </vstack>
        )
      }
    }),

    get: defineJSXCommand({
      name: "get",
      description: "Get logging configuration",
      args: {
        key: {
          description: "Configuration key",
          required: false
        }
      },
      handler: (ctx) => {
        if (!ctx.args.key) {
          return (
            <panel border="double" title="⚙️  Logging Configuration" style={{ padding: '1' }}>
              <vstack>
                <hstack>
                  <text color="gray">Log Level:</text>
                  <text color="cyan" bold>{loggingState.logLevel}</text>
                </hstack>
                <hstack>
                  <text color="gray">Directory:</text>
                  <text color="blue">{loggingState.logDir}</text>
                </hstack>
                <hstack>
                  <text color="gray">Active Loggers:</text>
                  <text color="green">{loggingState.loggers.size}</text>
                </hstack>
              </vstack>
            </panel>
          )
        }

        const config: Record<string, any> = {
          level: loggingState.logLevel,
          dir: loggingState.logDir,
          loggers: loggingState.loggers.size
        }

        const value = config[ctx.args.key as keyof typeof config]
        if (value === undefined) {
          return <error>Unknown configuration key: {ctx.args.key}</error>
        }

        return <text>{`${ctx.args.key}: ${value}`}</text>
      }
    })
  },
  handler: () => (
    <vstack>
      <text color="blue" bold>Logging Configuration</text>
      <text>Use subcommands:</text>
      <text color="green">• config get [key]</text>
      <text color="green">• config set &lt;key&gt; &lt;value&gt;</text>
    </vstack>
  )
})

/**
 * Interactive log viewer component
 */
const InteractiveLogsView = ({ source, filter, level, timeout }: {
  source: string
  filter?: string
  level?: string
  timeout?: number
}) => {
  return (
    <vstack>
      <panel border="double" title="📺 Interactive Log Viewer" style={{ padding: '1' }}>
        <vstack>
          <panel border="rounded" title="Configuration" style={{ padding: '1' }}>
            <vstack>
              <hstack>
                <text color="gray">Source:</text>
                <text color="cyan" bold>{source}</text>
              </hstack>
              {filter && (
                <hstack>
                  <text color="gray">Filter:</text>
                  <text color="yellow">{filter}</text>
                </hstack>
              )}
              {level && (
                <hstack>
                  <text color="gray">Min Level:</text>
                  <text color="blue">{level}</text>
                </hstack>
              )}
              {timeout && (
                <hstack>
                  <text color="gray">Timeout:</text>
                  <text color="green">{timeout}s</text>
                </hstack>
              )}
            </vstack>
          </panel>
          
          <text></text>
          
          <panel border="single" style={{ padding: '1' }}>
            <vstack>
              <text color="yellow">🔄 Interactive log viewer loading...</text>
              <text></text>
              <text color="gray">Controls:</text>
              <text color="green">  • Press 'q' to quit</text>
              <text color="green">  • Use arrow keys to navigate</text>
              <text color="green">  • Press 'f' to filter</text>
              <text color="green">  • Press '/' to search</text>
            </vstack>
          </panel>
        </vstack>
      </panel>
    </vstack>
  )
}

/**
 * Log entry display component
 */
const LogEntryView = ({ entry }: { entry: any }) => {
  const levelColors = {
    debug: 'gray',
    info: 'blue',
    warn: 'yellow',
    error: 'red'
  }

  const levelIcons = {
    debug: '🔍',
    info: 'ℹ️',
    warn: '⚠️',
    error: '❌'
  }

  return (
    <hstack>
      <text color="gray">{entry.timestamp.toLocaleTimeString()}</text>
      <text color={levelColors[entry.level as keyof typeof levelColors] || 'white'} bold>
        {levelIcons[entry.level as keyof typeof levelIcons] || '•'} {entry.level.toUpperCase().padEnd(5)}
      </text>
      <text color="cyan">[{entry.source.padEnd(12)}]</text>
      <text>{entry.message}</text>
    </hstack>
  )
}

/**
 * Main logging plugin as JSX component
 */
export const LoggingPlugin = ({ 
  name = "logs", 
  description = "Comprehensive logging functionality", 
  version = "1.0.0",
  dir,
  as
}: { 
  name?: string
  description?: string 
  version?: string
  dir?: string
  as?: string
} = {}) => {
  // Use the 'as' prop to rename the plugin if provided
  const pluginName = as || name
  
  // Initialize log directory from props or config
  // This happens synchronously on first render
  if (dir && loggingState.logDir !== dir) {
    loggingState.logDir = dir
  }
  
  return (
  <Plugin name={pluginName} description={description} version={version}>
    <Command {...ShowLogsCommand} />
    <Command {...ListLogsCommand} />
    <Command {...ConfigCommand} />
    
    {/* Aliases */}
    <Command {...ShowLogsCommand} name="view" />
    <Command {...ShowLogsCommand} name="cat" />
    <Command {...ListLogsCommand} name="ls" />
    
    {/* Tail command */}
    <Command
      name="tail"
      description="Follow log output (alias for show --follow)"
      args={{
        source: {
          description: "Log file or logger name",
          required: true
        }
      }}
      flags={{
        lines: {
          description: "Number of lines to show initially",
          alias: "n",
          type: "number",
          default: 10
        },
        dir: {
          description: "Override log directory",
          alias: "d",
          type: "string"
        }
      }}
      interactive={true}
      handler={(ctx) => {
        // Update log dir if provided
        if (ctx.flags.dir) {
          loggingState.logDir = ctx.flags.dir
        }
        // Delegate to show command with follow flag
        return ShowLogsCommand.handler({
          ...ctx,
          flags: { ...ctx.flags, follow: true }
        })
      }}
    />
  </Plugin>
  )
}

// Helper function to register a logger
export function registerLogger(name: string, logger: any) {
  loggingState.loggers.set(name, logger)
  console.log(`📝 Logger registered: ${name}`)
}

// Helper function to get a logger
export function getLogger(name: string) {
  return loggingState.loggers.get(name)
}

// Initialize loggers when plugin is loaded
export const LoggingPluginHooks = {
  onInit: async (config?: any) => {
    console.log("📝 Logging plugin initialized")
    
    // Set log directory from config
    if (config?.logsDirectory) {
      loggingState.logDir = config.logsDirectory
    } else if (config?.tuixDir) {
      loggingState.logDir = path.join(config.tuixDir, 'logs')
    }
    
    // Create default console logger
    const defaultLogger = createConsoleLogger("info", { 
      colorize: true,
      prettyPrint: true,
      showEmoji: true 
    })
    
    loggingState.loggers.set("console", defaultLogger)
    loggingState.loggers.set("default", defaultLogger)
  },
  
  onExit: async () => {
    console.log("📝 Logging plugin shutting down")
  }
}

export default LoggingPlugin