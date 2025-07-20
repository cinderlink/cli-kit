#!/usr/bin/env bun

/**
 * Comprehensive Declarative CLI Example
 * 
 * This example demonstrates the recommended approach for building CLI applications
 * with Tuix using declarative JSX syntax. It showcases:
 * 
 * - Declarative plugin registration with <RegisterPlugin>
 * - Built-in ProcessManager and Logger plugins
 * - Custom application commands
 * - Nested command structures
 * - Rich terminal UI with panels and styling
 */

import { jsx, RegisterPlugin, Plugin, Command, Arg, Flag, Help, Example, ConfigurePlugin, text, vstack, hstack, panel, success, error, warning } from "../src/jsx/app"
import { LoggingPlugin } from "../src/plugins/logging"
import { ProcessManagerPlugin } from "../src/process-manager/plugin"

// Main app component demonstrating the declarative approach
function AppComponent() {
  return (
    <vstack>
      {/* Register built-in plugins declaratively */}
      <RegisterPlugin 
        plugin={LoggingPlugin} 
        as="logs" 
        alias="l" 
        enabled={true}
        config={{
          defaultLevel: "info",
          logDir: "./logs",
          maxFiles: 10
        }}
      />
      
      <RegisterPlugin 
        plugin={ProcessManagerPlugin} 
        as="pm" 
        alias="p"
        enabled={true}
        config={{
          autoSave: true,
          healthChecks: true,
          restartDelay: 1000
        }}
      />
      
      {/* Define custom application commands declaratively */}
      <Plugin name="app" description="Application management commands" version="2.0.0">
        <Command name="init" description="Initialize a new project">
          <Arg name="name" description="Project name" required />
          <Flag name="template" description="Project template" type="string" default="default" />
          <Flag name="git" description="Initialize git repository" type="boolean" default={true} />
          
          <Help>
            Initialize a new Tuix project with the specified name.
            This will create a new directory with a basic project structure.
          </Help>
          
          <Example>app init my-cli</Example>
          <Example description="Use TypeScript template">app init my-cli --template typescript</Example>
          
          <Command handler={(ctx) => (
            <vstack>
              <success>🎉 Creating new project: {ctx.args.name}</success>
              <text>Template: {ctx.flags.template}</text>
              {ctx.flags.git && <text color="blue">✓ Git repository initialized</text>}
              <text></text>
              <panel title="Next Steps" border="single">
                <vstack>
                  <text>1. cd {ctx.args.name}</text>
                  <text>2. bun install</text>
                  <text>3. bun run dev</text>
                </vstack>
              </panel>
            </vstack>
          )} />
        </Command>
        
        <Command name="dev" description="Development commands">
          <Command name="setup" description="Set up development environment">
            <Flag name="services" description="Services to start" type="string" default="test,typecheck" />
            <Flag name="coverage" description="Enable test coverage" alias="c" />
            
            <Command handler={(ctx) => {
              const services = (ctx.flags.services as string).split(',').map(s => s.trim())
              
              return (
                <vstack>
                  <text color="cyan" bold>🚀 Setting up development environment...</text>
                  <text></text>
                  
                  <panel title="Starting Services" border="rounded">
                    <vstack>
                      {services.map(service => (
                        <hstack key={service}>
                          <text color="green">✓</text>
                          <text>{service}</text>
                          {ctx.flags.coverage && service === 'test' && 
                            <text color="blue">(with coverage)</text>
                          }
                        </hstack>
                      ))}
                    </vstack>
                  </panel>
                  
                  <text></text>
                  <text>Run these commands:</text>
                  {services.map(service => (
                    <text key={service} color="gray">
                      • pm start {service} --preset {service === 'test' ? 'vitest' : service}
                    </text>
                  ))}
                </vstack>
              )
            }} />
          </Command>
          
          <Command name="status" description="Show development status" handler={() => (
            <vstack>
              <text color="cyan" bold>📊 Development Status</text>
              <text></text>
              <text>Run these commands for more info:</text>
              <text color="green">• pm status        # Show running processes</text>
              <text color="green">• logs list        # Show available logs</text>
              <text color="green">• pm groups list   # Show process groups</text>
            </vstack>
          )} />
        </Command>
        
        <Command name="deploy" description="Deploy application">
          <Arg name="environment" description="Target environment" required choices={["dev", "staging", "prod"]} />
          <Flag name="dry-run" description="Preview deployment" alias="d" />
          <Flag name="force" description="Skip confirmation" alias="f" />
          
          <Help>
            Deploy your application to the specified environment.
            Use --dry-run to preview changes before deploying.
          </Help>
          
          <Example>app deploy staging</Example>
          <Example description="Preview production deployment">app deploy prod --dry-run</Example>
          
          <Command handler={async (ctx) => {
            if (ctx.flags['dry-run']) {
              return (
                <vstack>
                  <warning>DRY RUN: Deployment preview for {ctx.args.environment}</warning>
                  <text>Would deploy the following:</text>
                  <text color="gray">• Current branch: main</text>
                  <text color="gray">• Commit: abc123</text>
                  <text color="gray">• Target: {ctx.args.environment}</text>
                </vstack>
              )
            }
            
            if (!ctx.flags.force && ctx.args.environment === 'prod') {
              return (
                <vstack>
                  <warning>⚠️ Production deployment requires confirmation</warning>
                  <text>Use --force to skip this check</text>
                </vstack>
              )
            }
            
            return (
              <vstack>
                <text color="blue">🚀 Deploying to {ctx.args.environment}...</text>
                <text>Building application...</text>
                <text>Running tests...</text>
                <text>Uploading assets...</text>
                <success>✅ Deployment complete!</success>
              </vstack>
            )
          }} />
        </Command>
      </Plugin>
      
      {/* Configure plugins after registration */}
      <ConfigurePlugin 
        name="logs" 
        config={{ 
          verboseMode: process.env.NODE_ENV === 'development',
          timestampFormat: 'ISO'
        }} 
      />
      
      {/* Main app UI (only shown when no CLI command is provided) */}
      <text color="cyan" bold>🎯 Declarative CLI with Tuix</text>
      <text>A comprehensive example of building CLIs with JSX</text>
      <text></text>
      
      <panel title="Features Demonstrated" border="rounded">
        <vstack>
          <hstack>
            <text color="blue">📝</text>
            <text bold>Logging System</text>
            <text color="gray">- Built-in logging with file management</text>
          </hstack>
          <hstack>
            <text color="green">🔧</text>
            <text bold>Process Manager</text>
            <text color="gray">- Start, stop, and monitor processes</text>
          </hstack>
          <hstack>
            <text color="purple">🎯</text>
            <text bold>Declarative Commands</text>
            <text color="gray">- Define CLI structure with JSX</text>
          </hstack>
          <hstack>
            <text color="yellow">🔀</text>
            <text bold>Nested Commands</text>
            <text color="gray">- Organize commands hierarchically</text>
          </hstack>
        </vstack>
      </panel>
      
      <text></text>
      <text color="yellow">📚 Example Commands:</text>
      <vstack>
        <text color="green">• logs list                    # List log files</text>
        <text color="green">• logs show app.log --follow   # Follow log output</text>
        <text color="green">• pm start test --preset vitest # Start test runner</text>
        <text color="green">• pm status --watch            # Monitor processes</text>
        <text color="green">• app init my-project          # Create new project</text>
        <text color="green">• app dev setup                # Setup dev environment</text>
        <text color="green">• app deploy staging --dry-run # Preview deployment</text>
        <text color="green">• help                         # Show all commands</text>
      </vstack>
      
      <text></text>
      <text color="gray">💡 Tip: Use --help with any command for detailed information</text>
    </vstack>
  )
}

// Run the app using the declarative approach (recommended)
import { Effect } from "effect"
Effect.runPromise(jsx(AppComponent)).catch(console.error)