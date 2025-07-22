#!/usr/bin/env bun
/** @jsxImportSource tuix */

/**
 * Process Manager Plugin for JSX CLI Applications
 * 
 * Provides process management commands integrated with the CLI framework
 */

import type { JSXCommandContext } from "../cli/jsx/types"
import { ProcessManager as ProcessManagerClass } from "./manager"
import { ProcessMonitor } from "./index"
import { createConsoleLogger } from "../logger"
import { PrettyLogEntry } from "../logger/components/LogComponents"
import { runApp } from "../core/runtime"
import { LiveServices } from "../core/services/impl"
import { Effect } from "effect"
import type { ProcessConfig } from "./types"
import { ProcessStatusView } from "./components/ProcessStatusView"
import * as fs from "fs/promises"
import * as path from "path"

// Single instance of process manager
let processManager: ProcessManagerClass | null = null

export function getProcessManager(config?: any): ProcessManagerClass {
  if (!processManager) {
    const logger = createConsoleLogger("debug", {
      colorize: true,
      prettyPrint: true,
      showEmoji: true
    })
    
    processManager = new ProcessManagerClass(logger, config || {})
  }
  return processManager
}

/**
 * Process Manager Plugin Configuration
 */
export interface ProcessManagerPluginConfig {
  name?: string
  description?: string
}

/**
 * Main Process Manager Plugin Component
 */
export const ProcessManagerPlugin = ({ 
  name = "pm", 
  description = "Process management and monitoring"
}: ProcessManagerPluginConfig) => {
  
  // Return JSX elements instead of config object to integrate with scope system
  return (
    <plugin name={name} description={description} aliases={["process", "proc"]}>
      <command 
        name="start"
        description="Start a new process or saved process"
        handler={async (ctx) => {
          const pm = getProcessManager()
          
          try {
            // Implementation would go here - get name from args
            const processName = ctx.args.name || "default"
            await pm.start(processName, {
              watch: ctx.flags.watch,
              group: ctx.flags.group
            })
            
            return (
              <vstack>
                <text color="green">✅ Process started: {processName}</text>
              </vstack>
            )
          } catch (error) {
            return (
              <vstack>
                <text color="red">❌ Failed to start process: {error.message}</text>
              </vstack>
            )
          }
        }}
      >
        <arg name="name" description="Process name" required />
        <flag name="watch" description="Watch for file changes and restart" />
        <flag name="group" description="Process group" />
      </command>
      
      <command 
        name="status"
        description="Show status of all processes"
        handler={async (ctx) => {
          const pm = getProcessManager()
          const states = pm.list()
          
          if (states.length === 0) {
            return <text color="gray">No processes running</text>
          }
          
          return (
            <vstack gap={1}>
              <text color="cyan" bold>📊 Process Status</text>
              {states.map(process => (
                <ProcessStatusView 
                  key={process.name} 
                  process={process} 
                  detailed={ctx.flags.detailed} 
                />
              ))}
            </vstack>
          )
        }}
      >
        <flag name="detailed" description="Show detailed process information" />
      </command>
      
      <command 
        name="logs"
        description="Show process logs"
        handler={async (ctx) => {
          const pm = getProcessManager()
          const processName = ctx.args.name || ctx.flags.name
          const lines = ctx.flags.lines || 20
          const logs = pm.getLogs(processName, lines)
          
          return (
            <vstack gap={0.5}>
              <text color="cyan" bold>📋 Process Logs</text>
              {logs.map((log, i) => (
                <PrettyLogEntry
                  key={i}
                  level={log.level}
                  message={log.message}
                  timestamp={log.timestamp}
                  context={[log.source]}
                  showEmoji={true}
                  showTimestamp={true}
                />
              ))}
            </vstack>
          )
        }}
      >
        <arg name="name" description="Process name to show logs for" />
        <flag name="lines" description="Number of lines to show" type="number" default={20} />
      </command>
      
      <command 
        name="monitor"
        description="Monitor processes interactively"
        handler={async (ctx) => {
          const pm = getProcessManager()
          
          const component = {
            init: Effect.succeed([{}, []] as const),
            update: () => Effect.succeed([{}, []] as const),
            view: () => ProcessMonitor({ manager: pm }),
            subscription: () => Effect.succeed([])
          }
          
          return await Effect.runPromise(
            runApp(
              component,
              LiveServices
            )
          )
        }}
      />
    </plugin>
  )
}

export default ProcessManagerPlugin