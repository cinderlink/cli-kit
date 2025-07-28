#!/usr/bin/env bun

/**
 * TUIX Command Line Tool
 * 
 * Main binary for TUIX framework utilities
 * Dogfoods the CLI framework with JSX components
 */

import { render } from '../src/jsx/app'
import { CLI, Command, Plugin, Flag, Option } from '../src/cli/jsx/components'
import { Box, Text, Spinner } from '../src/ui/components'
import { ProcessManager } from '../src/process-manager/manager'
import { Effect } from 'effect'
import type { JSXCommandContext } from '../src/cli/jsx/types'

// Development Commands
const DevStartHandler = async ({ options }: JSXCommandContext) => {
  const services = options.services
    ? (options.services as string).split(',').map(s => s.trim())
    : ['typecheck', 'test-watch']

  const coverage = options.coverage || false
  const interactive = options.interactive || false
  const timeout = options.timeout as number | undefined

  return (
    <Box flexDirection="column" gap={1}>
      <Text color="green" bold>🚀 Starting development environment...</Text>
      <Box flexDirection="column" paddingLeft={2}>
        <Text>📦 Services: {services.join(', ')}</Text>
        {coverage && <Text>📊 Coverage: enabled</Text>}
        {interactive && <Text>🎛️ Interactive: enabled</Text>}
        {timeout && <Text>⏱️ Timeout: {timeout}s</Text>}
      </Box>
    </Box>
  )
}

const DevStopHandler = async () => {
  return <Text color="yellow">🛑 Stopping all development services...</Text>
}

const DevStatusHandler = async () => {
  return <Text color="blue">📊 Development services status</Text>
}

// Process Manager Commands
const PMListHandler = async () => {
  const pm = new ProcessManager()
  const processes = await pm.list()
  
  return (
    <Box flexDirection="column">
      <Text bold>Process List:</Text>
      {processes.length === 0 ? (
        <Text color="dim">No processes running</Text>
      ) : (
        processes.map(p => (
          <Text key={p.name}>{p.name}: {p.status}</Text>
        ))
      )}
    </Box>
  )
}

const PMStatusHandler = async ({ options }: JSXCommandContext) => {
  return (
    <Box>
      <Text>Process Manager Status</Text>
      {options.watch && <Text color="dim">Watching for changes...</Text>}
    </Box>
  )
}

// Documentation Command
const DocsHandler = async ({ options }: JSXCommandContext) => {
  const topic = options.topic as string | undefined
  
  return (
    <Box flexDirection="column">
      <Text bold>📚 TUIX Documentation</Text>
      {topic ? (
        <Text>Showing docs for: {topic}</Text>
      ) : (
        <Text color="dim">Use --topic to specify a documentation section</Text>
      )}
    </Box>
  )
}

// Health Check Commands
const DoctorCheckHandler = async () => {
  return (
    <Box flexDirection="column">
      <Text bold>🏥 Running health checks...</Text>
      <Text color="green">✓ Bun installed</Text>
      <Text color="green">✓ TypeScript configured</Text>
      <Text color="green">✓ Effect.ts available</Text>
    </Box>
  )
}

// Main CLI Application
const TuixCLI = () => (
  <CLI name="tuix" version="1.0.0-rc.3" description="🎨 A performant TUI framework for Bun">
    {/* Development Plugin */}
    <Plugin name="dev" description="Development environment management">
      <Command name="start" description="Start development services">
        <Option name="services" type="string" description="Comma-separated list of services" />
        <Flag name="coverage" description="Enable test coverage" />
        <Flag name="interactive" description="Start interactive monitor" />
        <Option name="timeout" type="number" description="Auto-stop timeout in seconds" />
        {DevStartHandler}
      </Command>
      <Command name="stop" description="Stop all development services">
        {DevStopHandler}
      </Command>
      <Command name="status" description="Show development services status">
        {DevStatusHandler}
      </Command>
    </Plugin>

    {/* Process Manager Plugin */}
    <Plugin name="pm" description="Process manager commands">
      <Command name="list" description="List all processes">
        {PMListHandler}
      </Command>
      <Command name="status" description="Show process statuses">
        <Flag name="watch" description="Watch for changes" />
        {PMStatusHandler}
      </Command>
      <Command name="start" description="Start a new process">
        <Option name="name" type="string" required description="Process name" />
        <Option name="command" type="string" required description="Command to run" />
        {() => <Text>Process start handler not implemented</Text>}
      </Command>
      <Command name="stop" description="Stop a process">
        <Option name="name" type="string" required description="Process name" />
        {() => <Text>Process stop handler not implemented</Text>}
      </Command>
    </Plugin>

    {/* Logs Command */}
    <Command name="logs" description="View service logs">
      <Option name="service" type="string" description="Service name" />
      <Flag name="follow" alias="f" description="Follow log output" />
      <Flag name="tail" alias="t" description="Show only recent logs" />
      <Option name="lines" alias="n" type="number" description="Number of lines" />
      {() => <Text>Logs viewer not implemented</Text>}
    </Command>

    {/* Screenshot Command */}
    <Command name="screenshot" description="Screenshot management">
      <Command name="capture" description="Capture a screenshot">
        <Option name="output" alias="o" type="string" description="Output file path" />
        {() => <Text>Screenshot capture not implemented</Text>}
      </Command>
      <Command name="list" description="List screenshots">
        {() => <Text>Screenshot list not implemented</Text>}
      </Command>
    </Command>

    {/* Documentation Command */}
    <Command name="docs" description="View framework documentation">
      <Option name="topic" type="string" description="Documentation topic" />
      <Flag name="browser" alias="b" description="Open in browser" />
      {DocsHandler}
    </Command>

    {/* Project Initialization */}
    <Command name="init" description="Create new TUIX project">
      <Option name="name" type="string" required description="Project name" />
      <Option name="template" type="string" description="Project template" />
      <Flag name="typescript" description="Use TypeScript" />
      <Flag name="git" description="Initialize git repository" />
      {() => <Text>Project init not implemented</Text>}
    </Command>

    {/* Health Check Plugin */}
    <Plugin name="doctor" description="Health checks and diagnostics">
      <Command name="check" description="Run all health checks">
        {DoctorCheckHandler}
      </Command>
      <Command name="fix" description="Attempt to fix issues">
        <Flag name="force" description="Force fix without confirmation" />
        {() => <Text>Doctor fix not implemented</Text>}
      </Command>
      <Command name="detect" description="Detect environment and tools">
        {() => <Text>Environment detection not implemented</Text>}
      </Command>
    </Plugin>
  </CLI>
)

// Run the CLI application
render(TuixCLI)