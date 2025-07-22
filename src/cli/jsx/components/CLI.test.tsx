/**
 * CLI JSX Component Tests
 * 
 * Tests for the CLI JSX components used in exemplar including:
 * - CLI root component with plugins and commands
 * - Plugin component registration and nesting
 * - Command component with args and flags
 * - Help text generation and display
 * - Command execution and context passing
 * - Scope integration with CLI components
 * - Example component rendering
 */

import { test, expect, describe, beforeEach, mock } from 'bun:test'
import { Effect } from 'effect'
import { jsx } from '@jsx/runtime'
import { 
  CLI, 
  Plugin, 
  Command, 
  Arg, 
  Flag, 
  Help, 
  Example,
  type CLIProps,
  type PluginProps,
  type CommandProps
} from './index'
import { scopeManager } from '@core/model/scope/manager'
import { createMockTerminalService, createTestHarness } from '@testing/testUtils'
import { text } from '@core/view'

describe('CLI JSX Components', () => {
  beforeEach(() => {
    // Clear scope manager state
    scopeManager.clear()
  })

  describe('CLI Component', () => {
    test('should create CLI root scope', () => {
      const app = (
        <CLI name="test-cli" version="1.0.0" description="Test CLI">
          <Command name="hello" description="Say hello">
            {() => <text>Hello World</text>}
          </Command>
        </CLI>
      )

      // Render the CLI
      const rendered = app

      // Check that CLI scope was registered
      const cliScopes = scopeManager.getScopesByPath(['test-cli'])
      expect(cliScopes).toHaveLength(1)
      expect(cliScopes[0].type).toBe('cli')
      expect(cliScopes[0].metadata?.name).toBe('test-cli')
      expect(cliScopes[0].metadata?.version).toBe('1.0.0')
    })

    test('should support CLI with alias', () => {
      const app = (
        <CLI name="exemplar" alias="ex" version="1.0.0">
          <Command name="test">{() => <text>Test</text>}</Command>
        </CLI>
      )

      const rendered = app

      const cliScopes = scopeManager.getScopesByPath(['exemplar'])
      expect(cliScopes[0].metadata?.alias).toBe('ex')
    })
  })

  describe('Plugin Component', () => {
    test('should register plugin scope under CLI', () => {
      const app = (
        <CLI name="myapp">
          <Plugin name="auth" description="Authentication plugin">
            <Command name="login" description="Login to service">
              {() => <text>Login form</text>}
            </Command>
          </Plugin>
        </CLI>
      )

      const rendered = app

      // Check plugin scope
      const pluginScopes = scopeManager.getScopesByPath(['myapp', 'auth'])
      expect(pluginScopes).toHaveLength(1)
      expect(pluginScopes[0].type).toBe('plugin')
      expect(pluginScopes[0].metadata?.description).toBe('Authentication plugin')
    })

    test('should support nested plugins', () => {
      const app = (
        <CLI name="myapp">
          <Plugin name="dev" description="Development tools">
            <Plugin name="db" description="Database tools">
              <Command name="migrate">
                {() => <text>Running migrations...</text>}
              </Command>
            </Plugin>
          </Plugin>
        </CLI>
      )

      const rendered = app

      // Check nested plugin scope
      const dbScopes = scopeManager.getScopesByPath(['myapp', 'dev', 'db'])
      expect(dbScopes).toHaveLength(1)
      expect(dbScopes[0].type).toBe('plugin')
      
      // Check command under nested plugin
      const cmdScopes = scopeManager.getScopesByPath(['myapp', 'dev', 'db', 'migrate'])
      expect(cmdScopes).toHaveLength(1)
      expect(cmdScopes[0].type).toBe('command')
    })
  })

  describe('Command Component', () => {
    test('should register command with handler', () => {
      const handler = mock((ctx: JSXCommandContext) => <text>Command output</text>)

      const app = (
        <CLI name="myapp">
          <Command name="build" description="Build the project">
            {handler}
          </Command>
        </CLI>
      )

      const rendered = app

      const cmdScopes = scopeManager.getScopesByPath(['myapp', 'build'])
      expect(cmdScopes).toHaveLength(1)
      expect(cmdScopes[0].type).toBe('command')
      expect(cmdScopes[0].executable).toBe(true)
      expect(cmdScopes[0].handler).toBe(handler)
    })

    test('should register command with args', () => {
      const app = (
        <CLI name="myapp">
          <Command name="greet" description="Greet someone">
            <Arg name="name" description="Name to greet" required />
            <Arg name="title" description="Optional title" />
            {(ctx) => <text>Hello {ctx.args.title} {ctx.args.name}</text>}
          </Command>
        </CLI>
      )

      const rendered = app

      const cmdScopes = scopeManager.getScopesByPath(['myapp', 'greet'])
      const argScopes = scopeManager.getChildScopes(cmdScopes[0].id)
        .filter(s => s.type === 'arg')

      expect(argScopes).toHaveLength(2)
      expect(argScopes.find(s => s.name === 'name')?.metadata?.required).toBe(true)
      expect(argScopes.find(s => s.name === 'title')?.metadata?.required).toBeFalsy()
    })

    test('should register command with flags', () => {
      const app = (
        <CLI name="myapp">
          <Command name="deploy">
            <Flag name="force" alias="f" description="Force deployment" />
            <Flag name="env" description="Environment" type="string" default="production" />
            {(ctx) => <text>Deploying to {ctx.flags.env}</text>}
          </Command>
        </CLI>
      )

      const rendered = app

      const cmdScopes = scopeManager.getScopesByPath(['myapp', 'deploy'])
      const flagScopes = scopeManager.getChildScopes(cmdScopes[0].id)
        .filter(s => s.type === 'flag')

      expect(flagScopes).toHaveLength(2)
      
      const forceFlag = flagScopes.find(s => s.name === 'force')
      expect(forceFlag?.metadata?.alias).toBe('f')
      
      const envFlag = flagScopes.find(s => s.name === 'env')
      expect(envFlag?.metadata?.type).toBe('string')
      expect(envFlag?.metadata?.default).toBe('production')
    })
  })

  describe('Help Component', () => {
    test('should register help text for command', () => {
      const app = (
        <CLI name="myapp">
          <Command name="sync" description="Sync data">
            <Help>
              Synchronizes data between local and remote.
              
              This command will:
              - Fetch latest from remote
              - Merge with local changes
              - Push updates back
            </Help>
            {() => <text>Syncing...</text>}
          </Command>
        </CLI>
      )

      const rendered = app

      const cmdScopes = scopeManager.getScopesByPath(['myapp', 'sync'])
      const helpScopes = scopeManager.getChildScopes(cmdScopes[0].id)
        .filter(s => s.type === 'help')

      expect(helpScopes).toHaveLength(1)
      expect(helpScopes[0].metadata?.text).toContain('Synchronizes data')
    })
  })

  describe('Example Component', () => {
    test('should register examples for command', () => {
      const app = (
        <CLI name="myapp">
          <Command name="convert">
            <Example description="Convert JPEG to PNG">
              myapp convert input.jpg output.png
            </Example>
            <Example description="Convert with quality setting">
              myapp convert --quality=90 input.jpg output.png
            </Example>
            {() => <text>Converting...</text>}
          </Command>
        </CLI>
      )

      const rendered = app

      const cmdScopes = scopeManager.getScopesByPath(['myapp', 'convert'])
      const exampleScopes = scopeManager.getChildScopes(cmdScopes[0].id)
        .filter(s => s.type === 'example')

      expect(exampleScopes).toHaveLength(2)
      expect(exampleScopes[0].metadata?.description).toBe('Convert JPEG to PNG')
      expect(exampleScopes[0].metadata?.code).toContain('myapp convert input.jpg')
    })
  })

  describe('Command Execution', () => {
    test('should execute command handler with context', async () => {
      let executedContext: JSXCommandContext | null = null

      const app = (
        <CLI name="myapp">
          <Command name="test">
            <Arg name="file" />
            <Flag name="verbose" alias="v" />
            {(ctx) => {
              executedContext = ctx
              return <text>Executed</text>
            }}
          </Command>
        </CLI>
      )

      const rendered = app

      // Simulate command execution
      const cmdScope = scopeManager.getScopesByPath(['myapp', 'test'])[0]
      const handler = cmdScope.handler as Function

      const result = handler({
        args: { file: 'test.js' },
        flags: { verbose: true }
      })

      expect(executedContext).toEqual({
        args: { file: 'test.js' },
        flags: { verbose: true }
      })
    })

    test('should handle async command handlers', async () => {
      const app = (
        <CLI name="myapp">
          <Command name="fetch">
            {async (ctx) => {
              await new Promise(resolve => setTimeout(resolve, 10))
              return <text>Data fetched</text>
            }}
          </Command>
        </CLI>
      )

      const rendered = app

      const cmdScope = scopeManager.getScopesByPath(['myapp', 'fetch'])[0]
      const handler = cmdScope.handler as Function

      const result = await handler({})
      expect(result.type).toBe('text')
      expect(result.content).toBe('Data fetched')
    })
  })

  describe('Complex CLI Structure', () => {
    test('should handle exemplar-style CLI structure', () => {
      const ProcessManagerPlugin = ({ name }: { name: string }) => (
        <Plugin name={name} description="Process management">
          <Command name="start" description="Start services">
            {() => <text>Starting services...</text>}
          </Command>
          <Command name="stop" description="Stop services">
            {() => <text>Stopping services...</text>}
          </Command>
        </Plugin>
      )

      const app = (
        <CLI name="exemplar" alias="ex" version="1.0.0" description="Exemplar toolkit">
          <ProcessManagerPlugin name="dev" />
          
          <Plugin name="auth" description="Authentication">
            <Command name="login" description="Login to service">
              <Arg name="username" required />
              <Flag name="remember" description="Remember credentials" />
              {(ctx) => <text>Logging in as {ctx.args.username}</text>}
            </Command>
            <Command name="logout">
              {() => <text>Logged out</text>}
            </Command>
          </Plugin>

          <Command name="init" description="Initialize project">
            <Arg name="template" description="Project template" />
            <Help>
              Initializes a new Exemplar project.
              
              Available templates:
              - api: REST API template
              - web: Web application template
              - cli: CLI tool template
            </Help>
            <Example description="Create API project">
              exemplar init api
            </Example>
            {(ctx) => (
              <vstack gap={1}>
                <text bold>Initializing {ctx.args.template || 'default'} project...</text>
                <text color="green">✓ Project created successfully</text>
              </vstack>
            )}
          </Command>
        </CLI>
      )

      const rendered = app

      // Verify structure
      expect(scopeManager.getScopesByPath(['exemplar'])).toHaveLength(1)
      expect(scopeManager.getScopesByPath(['exemplar', 'dev'])).toHaveLength(1)
      expect(scopeManager.getScopesByPath(['exemplar', 'dev', 'start'])).toHaveLength(1)
      expect(scopeManager.getScopesByPath(['exemplar', 'auth'])).toHaveLength(1)
      expect(scopeManager.getScopesByPath(['exemplar', 'auth', 'login'])).toHaveLength(1)
      expect(scopeManager.getScopesByPath(['exemplar', 'init'])).toHaveLength(1)

      // Check init command has help and example
      const initScope = scopeManager.getScopesByPath(['exemplar', 'init'])[0]
      const children = scopeManager.getChildScopes(initScope.id)
      
      expect(children.some(c => c.type === 'help')).toBe(true)
      expect(children.some(c => c.type === 'example')).toBe(true)
      expect(children.some(c => c.type === 'arg' && c.name === 'template')).toBe(true)
    })
  })

  describe('Dynamic Command Loading', () => {
    test('should support lazy-loaded commands', () => {
      const app = (
        <CLI name="myapp">
          <Command name="heavy" description="Heavy command" lazy>
            {async () => {
              // Simulate dynamic import
              const module = await import('./heavy-module')
              return module.render()
            }}
          </Command>
        </CLI>
      )

      const rendered = app

      const cmdScope = scopeManager.getScopesByPath(['myapp', 'heavy'])[0]
      expect(cmdScope.metadata?.lazy).toBe(true)
    })
  })

  describe('Error Handling', () => {
    test('should handle errors in command handlers', async () => {
      const app = (
        <CLI name="myapp">
          <Command name="error">
            {() => {
              throw new Error('Command failed')
            }}
          </Command>
        </CLI>
      )

      const rendered = app

      const cmdScope = scopeManager.getScopesByPath(['myapp', 'error'])[0]
      const handler = cmdScope.handler as Function

      expect(() => handler({})).toThrow('Command failed')
    })
  })

  describe('UI Rendering', () => {
    test('should render command output with styles', () => {
      const app = (
        <CLI name="myapp">
          <Command name="status">
            {() => (
              <box borderStyle="rounded" borderColor="green" padding={1}>
                <vstack gap={1}>
                  <text bold color="green">✓ All systems operational</text>
                  <hstack gap={2}>
                    <text>CPU:</text>
                    <text color="cyan">45%</text>
                  </hstack>
                  <hstack gap={2}>
                    <text>Memory:</text>
                    <text color="yellow">2.1GB / 8GB</text>
                  </hstack>
                </vstack>
              </box>
            )}
          </Command>
        </CLI>
      )

      const rendered = app

      const cmdScope = scopeManager.getScopesByPath(['myapp', 'status'])[0]
      const handler = cmdScope.handler as Function
      const output = handler({})

      // Verify output structure
      expect(output.type).toBe('box')
      expect(output.props.borderStyle).toBe('rounded')
      expect(output.props.borderColor).toBe('green')
    })
  })
})