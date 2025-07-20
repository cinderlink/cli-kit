#!/usr/bin/env bun
/**
 * Kitchen Sink Demo - Perfect TUIX CLI Application
 * 
 * This file shows ALL routing at a glance while demonstrating:
 * - Structured commands (handler/schema/provider pattern)
 * - Quick inline commands (for simple cases)
 * - Plugin registration patterns
 * - Svelte 5 runes integration
 */

import { jsx } from '@tuix/jsx'
import { CLI, Scope, Command, Arg, Flag } from '@tuix/cli'
import { ProcessManagerPlugin, LoggerPlugin } from '@tuix/plugins'
import { Text, Box, Button } from '@tuix/components'
import { $state } from '@tuix/reactivity'
import { createCommandSchema } from './utils/command-helpers'

// Structured command imports (the clean way)
import { DashboardCommand } from './commands/dashboard'
import { ProcessFilesCommand } from './commands/process/files'
import { ProcessDatabaseCommand } from './commands/process/database'
import { MonitorCommand } from './commands/monitor'

// Showcase commands (showing different patterns)
import { ShowcaseDisplayCommand } from './commands/showcase/display'
import { ShowcaseInteractiveCommand } from './commands/showcase/interactive'
import { ShowcaseLayoutCommand } from './commands/showcase/layout'
import { ShowcaseStylingCommand } from './commands/showcase/styling'

// Custom plugin
import { WeatherPlugin } from './plugins/weather'

// Utility components
import { ClearScreen } from './components/common/ClearScreen'
import { ConfigDisplay } from './components/common/ConfigDisplay'

// Simple inline schemas (the fast way)
import { z } from 'zod'

const quickCommandSchema = z.object({
  args: z.object({
    name: z.string().optional()
  }),
  flags: z.object({
    verbose: z.boolean().default(false)
  })
})

// Main CLI application
jsx(() => (
  <CLI name="kitchen-sink" alias="ks" configName="kitchen-sink">
    {({ config }) => {
      // Can use runes at the top level too!
      const cliState = $state({
        commandHistory: [],
        lastCommand: null
      })
      
      return (
        <>
          {/* System plugins with customization options */}
          <ProcessManagerPlugin 
            as="pm"
            processWrapper={({ children, process }) => (
              <Box style="custom-pm-wrapper">
                <Text>🚀 {process.name}</Text>
                {children}
              </Box>
            )}
          />
          
          {/* Standard plugin with default namespace */}
          <LoggerPlugin />
          
          {/* Custom plugin inline (the fast way) */}
          <WeatherPlugin />
          
          {/* --- Main Commands --- */}
          
          {/* Structured command (the clean way) */}
          <DashboardCommand config={config} />
          
          {/* Process scope with mixed approaches */}
          <Scope name="process" description="Process files and data">
            {/* Structured subcommand */}
            <ProcessFilesCommand />
            <ProcessDatabaseCommand />
            
            {/* Quick inline subcommand */}
            <Command 
              name="quick" 
              description="Quick process demo"
              schema={quickCommandSchema}
            >
              {({ args, flags }) => (
                <Box>
                  <Text>Quick process for: {args.name || 'default'}</Text>
                  {flags.verbose && <Text>Verbose mode enabled</Text>}
                </Box>
              )}
            </Command>
          </Scope>
          
          {/* Monitor with inline enhancements */}
          <MonitorCommand 
            beforeRender={() => cliState.lastCommand = 'monitor'}
          />
          
          {/* Showcase scope */}
          <Scope name="showcase" description="Component and styling showcase">
            <ShowcaseDisplayCommand />
            <ShowcaseInteractiveCommand />
            <ShowcaseLayoutCommand />
            <ShowcaseStylingCommand />
          </Scope>
          
          {/* Quick inline commands (the fast way) */}
          <Command name="hello" description="Simple greeting">
            {({ args }) => {
              const state = $state({ count: 0 })
              return (
                <Box>
                  <Text>Hello! Called {state.count} times</Text>
                  <Button onClick={() => state.count++}>Increment</Button>
                </Box>
              )
            }}
          </Command>
          
          {/* Even quicker - no schema needed */}
          <Command name="version">
            <Text>Kitchen Sink Demo v1.0.0</Text>
          </Command>
          
          {/* Utility scope with inline commands */}
          <Scope name="util" description="Utility commands">
            <Command name="clear">
              <ClearScreen />
            </Command>
            
            <Command name="config">
              {() => <ConfigDisplay config={config} />}
            </Command>
          </Scope>
        </>
      )
    }}
  </CLI>
)).catch(console.error)