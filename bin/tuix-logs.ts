#!/usr/bin/env bun
/**
 * Log Explorer CLI
 * 
 * Interactive log viewer and analyzer
 */

import { Effect } from "effect"
import { runApp } from "../src/core/runtime"
import { LiveServices } from "../src/services/impl"
import { createCLI } from "../src/cli"
import { Box } from "../src/components/Box"
import { Text } from "../src/components/Text"
import { LogExplorer } from "../src/logger/components/LogExplorer"
import { InteractiveLogEntry, LogLevel } from "../src/logger/types"
import { JSONFormatter } from "../src/logger/formatters"
import * as fs from "fs"
import * as readline from "readline"

interface LogFile {
  path: string
  entries: InteractiveLogEntry[]
}

async function parseLogFile(filePath: string): Promise<InteractiveLogEntry[]> {
  const entries: InteractiveLogEntry[] = []
  
  const fileStream = fs.createReadStream(filePath)
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  })

  let id = 0
  for await (const line of rl) {
    try {
      const parsed = JSON.parse(line)
      entries.push({
        id: String(id++),
        expanded: false,
        level: parsed.level || "info",
        message: parsed.message || parsed.msg || "",
        timestamp: new Date(parsed.timestamp || parsed.time || Date.now()),
        metadata: parsed,
        context: parsed.context,
        error: parsed.error,
        span: parsed.span
      })
    } catch (err) {
      // Try to parse as plain text log
      const match = line.match(/^(\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}(?:\.\d{3})?)\s+(\w+)\s+(.*)$/)
      if (match) {
        entries.push({
          id: String(id++),
          expanded: false,
          level: (match[2]?.toLowerCase() || "info") as LogLevel,
          message: match[3] || line,
          timestamp: new Date(match[1]),
          metadata: { raw: line }
        })
      }
    }
  }

  return entries
}

const cli = createCLI({
  name: "tuix-logs",
  version: "1.0.0",
  description: "Interactive log explorer for tuix applications",
  commands: {
    view: {
      description: "View log files interactively",
      options: {
        file: {
          type: "string",
          alias: "f",
          description: "Log file to view",
          required: true
        },
        tail: {
          type: "boolean",
          alias: "t",
          description: "Follow log file (like tail -f)"
        },
        timeout: {
          type: "number",
          description: "Auto-stop after specified seconds (for AI assistants)"
        },
        level: {
          type: "string",
          alias: "l",
          description: "Minimum log level to show",
          default: "trace"
        },
        search: {
          type: "string",
          alias: "s",
          description: "Search term to filter logs"
        }
      },
      handler: async (args) => {
        const entries = await parseLogFile(args.file as string)
        
        if (args.tail) {
          // TODO: Implement file watching
          console.log("Tail mode not yet implemented")
          
          // Handle timeout for tail mode
          const timeoutSeconds = args.timeout as number || 0
          if (timeoutSeconds > 0) {
            console.log(`⏰ Would timeout after ${timeoutSeconds}s`)
          }
          return
        }

        // Handle timeout for interactive mode
        const timeoutSeconds = args.timeout as number || 0
        if (timeoutSeconds > 0) {
          console.log(`📝 Interactive log viewer for ${args.file} (auto-close in ${timeoutSeconds}s)...`)
          console.log()
          
          // Set up timeout
          setTimeout(() => {
            console.log(`\n⏰ Timeout reached (${timeoutSeconds}s), closing log viewer`)
            process.exit(0)
          }, timeoutSeconds * 1000)
        }

        return () => (
          <LogExplorer
            entries={entries}
            showSearch={true}
            showFilters={true}
          />
        )
      }
    },
    
    analyze: {
      description: "Analyze log files and show statistics",
      options: {
        file: {
          type: "string",
          alias: "f",
          description: "Log file to analyze",
          required: true
        },
        format: {
          type: "string",
          description: "Output format (json, table, summary)",
          default: "summary"
        }
      },
      handler: async (args) => {
        const entries = await parseLogFile(args.file as string)
        
        // Calculate statistics
        const stats = {
          total: entries.length,
          byLevel: {} as Record<LogLevel, number>,
          errors: entries.filter(e => e.level === "error" || e.level === "fatal"),
          timeRange: {
            start: entries[0]?.timestamp,
            end: entries[entries.length - 1]?.timestamp
          }
        }

        // Count by level
        for (const entry of entries) {
          stats.byLevel[entry.level] = (stats.byLevel[entry.level] || 0) + 1
        }

        if (args.format === "json") {
          console.log(JSON.stringify(stats, null, 2))
          return
        }

        return () => (
          <Box direction="vertical" padding={2} gap={1}>
            <Text bold size="large">Log Analysis Report</Text>
            <Text>File: {args.file}</Text>
            <Box height={1} />
            
            <Text bold>Summary:</Text>
            <Text>Total entries: {stats.total}</Text>
            <Text>Time range: {stats.timeRange.start?.toISOString()} to {stats.timeRange.end?.toISOString()}</Text>
            <Box height={1} />
            
            <Text bold>Entries by level:</Text>
            {Object.entries(stats.byLevel).map(([level, count]) => (
              <Text key={level}>  {level.toUpperCase()}: {count}</Text>
            ))}
            <Box height={1} />
            
            {stats.errors.length > 0 && (
              <>
                <Text bold color="red">Recent errors:</Text>
                {stats.errors.slice(-5).map((error, i) => (
                  <Box key={i} direction="vertical" paddingLeft={2}>
                    <Text color="red">{error.timestamp.toISOString()} - {error.message}</Text>
                  </Box>
                ))}
              </>
            )}
          </Box>
        )
      }
    },

    merge: {
      description: "Merge multiple log files",
      options: {
        files: {
          type: "string",
          alias: "f",
          description: "Log files to merge (comma-separated)",
          required: true
        },
        output: {
          type: "string",
          alias: "o",
          description: "Output file",
          required: true
        },
        sort: {
          type: "boolean",
          description: "Sort by timestamp",
          default: true
        }
      },
      handler: async (args) => {
        const files = (args.files as string).split(",")
        const allEntries: any[] = []

        for (const file of files) {
          const entries = await parseLogFile(file.trim())
          allEntries.push(...entries.map(e => ({
            ...e.metadata,
            _source: file.trim()
          })))
        }

        if (args.sort) {
          allEntries.sort((a, b) => 
            new Date(a.timestamp || a.time).getTime() - 
            new Date(b.timestamp || b.time).getTime()
          )
        }

        const formatter = new JSONFormatter()
        const output = fs.createWriteStream(args.output as string)
        
        for (const entry of allEntries) {
          output.write(JSON.stringify(entry) + "\n")
        }
        
        output.end()

        console.log(`Merged ${allEntries.length} entries from ${files.length} files into ${args.output}`)
      }
    },

    stream: {
      description: "Stream logs from a running application",
      options: {
        port: {
          type: "number",
          alias: "p",
          description: "Port to listen on",
          default: 3000
        },
        format: {
          type: "string",
          description: "Expected log format (json, text)",
          default: "json"
        }
      },
      handler: async (args) => {
        // This would set up a server to receive logs
        console.log("Log streaming server not yet implemented")
        console.log(`Would listen on port ${args.port} for ${args.format} logs`)
      }
    }
  }
})

// Run the CLI
cli()