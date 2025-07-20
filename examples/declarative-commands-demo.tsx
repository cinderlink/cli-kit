#!/usr/bin/env bun

/**
 * Declarative Commands Demo
 * 
 * Demonstrates defining plugins and nested commands using JSX syntax
 * like <Command name="foo"><Command name="bar"><Command name="baz" />
 * 
 * This enables command structures like:
 * - my-bin foo 
 * - my-bin foo bar
 * - my-bin foo bar baz
 */

import { jsx } from "../src/jsx-app"

// Define a plugin declaratively with nested commands
function App() {
  return (
    <vstack>
      {/* Define a plugin with deeply nested commands */}
      <Plugin name="myPlugin" description="Example plugin with nested commands" version="1.0.0">
        <Command name="foo" description="Top-level foo command">
          <Help>
            The foo command provides access to various sub-functionalities.
            Use 'foo --help' to see available subcommands.
          </Help>
          <Example description="Basic usage">my-bin foo</Example>
          
          <Command name="bar" description="Bar subcommand under foo">
            <Arg name="input" description="Input file to process" required />
            <Flag name="verbose" description="Enable verbose output" alias="v" />
            <Flag name="output" description="Output file" alias="o" type="string" />
            
            <Help>
              The bar command processes input files with various options.
              It's a subcommand of foo, so call it with 'foo bar'.
            </Help>
            <Example description="Process a file">my-bin foo bar input.txt --verbose</Example>
            <Example description="Process with output">my-bin foo bar input.txt -o output.txt</Example>
            
            <Command 
              name="baz" 
              description="Deep nested baz command"
              handler={(ctx) => (
                <vstack>
                  <success>🎉 Reached baz command!</success>
                  <text>Path: foo → bar → baz</text>
                  <text>Input: {ctx.args.input}</text>
                  <text>Verbose: {ctx.flags.verbose ? 'Yes' : 'No'}</text>
                  {ctx.flags.output && <text>Output: {ctx.flags.output}</text>}
                </vstack>
              )}
            >
              <Flag name="force" description="Force operation" alias="f" />
              <Help>
                The deepest command in our hierarchy. This demonstrates
                three levels of nesting: foo → bar → baz
              </Help>
              <Example>my-bin foo bar input.txt baz --force</Example>
            </Command>
            
            <Command 
              name="qux" 
              description="Alternative deep command"
              handler={(ctx) => (
                <vstack>
                  <success>✨ Reached qux command!</success>
                  <text>Path: foo → bar → qux</text>
                  <text>This is an alternative to baz at the same level.</text>
                </vstack>
              )}
            >
              <Arg name="mode" description="Operation mode" choices={["fast", "slow", "auto"]} default="auto" />
              <Flag name="dry-run" description="Show what would be done" />
            </Command>
          </Command>
          
          <Command name="direct" description="Direct subcommand of foo" handler={(ctx) => (
            <vstack>
              <success>Direct command executed!</success>
              <text>This is directly under foo, parallel to bar.</text>
            </vstack>
          )}>
            <Flag name="immediate" description="Execute immediately" alias="i" />
          </Command>
        </Command>
        
        {/* Another top-level command */}
        <Command name="status" description="Show plugin status" handler={() => (
          <vstack>
            <text color="cyan" bold>📊 Plugin Status</text>
            <panel title="myPlugin" border="rounded">
              <vstack>
                <text>✅ Plugin loaded successfully</text>
                <text>📁 Commands: foo, status</text>
                <text>🔗 Nested: foo.bar.baz, foo.bar.qux, foo.direct</text>
              </vstack>
            </panel>
          </vstack>
        )}>
          <Flag name="detailed" description="Show detailed status" alias="d" />
        </Command>
      </Plugin>
      
      {/* Another plugin to demonstrate multiple plugins */}
      <Plugin name="utils" description="Utility commands">
        <Command name="config" description="Configuration management">
          <Command name="get" description="Get configuration value" handler={(ctx) => (
            <vstack>
              <text>Config value for '{ctx.args.key}': {ctx.args.key === 'theme' ? 'dark' : 'undefined'}</text>
            </vstack>
          )}>
            <Arg name="key" description="Configuration key" required />
          </Command>
          
          <Command name="set" description="Set configuration value" handler={(ctx) => (
            <vstack>
              <success>Set {ctx.args.key} = {ctx.args.value}</success>
            </vstack>
          )}>
            <Arg name="key" description="Configuration key" required />
            <Arg name="value" description="Configuration value" required />
            <Flag name="global" description="Set globally" alias="g" />
          </Command>
        </Command>
      </Plugin>
      
      {/* Main app UI - only shown when no CLI commands are run */}
      <text color="cyan" bold>🎯 Declarative Commands Demo</text>
      <text>This app demonstrates deeply nested command structures defined with JSX.</text>
      <text></text>
      
      <panel title="Available Command Paths" border="rounded">
        <vstack>
          <text color="green">• myPlugin foo</text>
          <text color="green">• myPlugin foo direct</text>
          <text color="green">• myPlugin foo bar &lt;input&gt;</text>
          <text color="green">• myPlugin foo bar &lt;input&gt; baz</text>
          <text color="green">• myPlugin foo bar &lt;input&gt; qux</text>
          <text color="green">• myPlugin status</text>
          <text color="blue">• utils config get &lt;key&gt;</text>
          <text color="blue">• utils config set &lt;key&gt; &lt;value&gt;</text>
        </vstack>
      </panel>
      
      <text></text>
      <text color="yellow">🧪 Test Commands:</text>
      <vstack>
        <text color="gray">• bun run examples/declarative-commands-demo.tsx myPlugin foo</text>
        <text color="gray">• bun run examples/declarative-commands-demo.tsx myPlugin foo bar test.txt --verbose</text>
        <text color="gray">• bun run examples/declarative-commands-demo.tsx myPlugin foo bar test.txt baz --force</text>
        <text color="gray">• bun run examples/declarative-commands-demo.tsx utils config get theme</text>
        <text color="gray">• bun run examples/declarative-commands-demo.tsx help</text>
      </vstack>
    </vstack>
  )
}

// Export for testing
export { App }

// Run the app
jsx(App).catch(console.error)