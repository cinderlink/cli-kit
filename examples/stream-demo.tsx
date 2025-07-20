#!/usr/bin/env bun

/**
 * Stream Components Demo
 * 
 * Demonstrates the powerful stream handling capabilities of Tuix
 * with Effect.ts integration for process spawning, data transformation,
 * and real-time terminal UI updates.
 */

import { jsx } from "../src/jsx-app"
import { Stream as EffectStream, Effect, pipe, Schedule } from "effect"
import { 
  fromArray, 
  poll, 
  timer, 
  random 
} from "../src/components/streams"

function StreamDemo() {
  // Create various example streams
  const numberStream = timer(1000, 10) // Emit numbers 0-9 every second
  
  const randomStream = random(0, 100, 500) // Random numbers every 500ms
  
  const textStream = fromArray([
    "Starting application...",
    "Loading configuration...",
    "Connecting to database...",
    "Server ready on port 3000",
    "Accepting connections..."
  ], 800) // Array items with 800ms delay
  
  return (
    <vstack>
      <text color="cyan" bold>🌊 Tuix Stream Components Demo</text>
      <text>Real-time data streaming with Effect.ts</text>
      <text></text>
      
      {/* Basic Stream Example */}
      <StreamBox 
        title="Timer Stream" 
        border="rounded"
        stream={numberStream}
        transform={(n) => <text color="blue">Tick {n}: {new Date().toLocaleTimeString()}</text>}
        maxItems={5}
      />
      
      {/* Stream with Custom Rendering */}
      <StreamBox
        title="Random Numbers"
        border="single"
        stream={randomStream}
        maxItems={10}
        separator="—"
      >
        {(value) => (
          <hstack>
            <text color={value > 50 ? "green" : "red"}>
              {value.toFixed(2)}
            </text>
            <text color="gray">
              {"|".repeat(Math.floor(value / 10))}
            </text>
          </hstack>
        )}
      </StreamBox>
      
      {/* Pipe Example - Transform stream data */}
      <Pipe
        from={numberStream}
        through={(n) => `Number ${n} squared is ${n * n}`}
      >
        {(transformedStream) => (
          <StreamBox
            title="Transformed Stream (Squared Numbers)"
            border="double"
            stream={transformedStream}
            itemStyle={{ foreground: "yellow" }}
          />
        )}
      </Pipe>
      
      {/* Transform Example - Multiple transformations */}
      <Transform
        stream={randomStream}
        transforms={[
          {
            name: "Round",
            fn: (s) => Stream.map(s, (n: number) => Math.round(n))
          },
          {
            name: "Filter > 50",
            fn: (s) => Stream.filter(s, (n: number) => n > 50)
          },
          {
            name: "Add Label",
            fn: (s) => Stream.map(s, (n: number) => `High value: ${n}`)
          }
        ]}
        showPipeline={true}
      >
        {(finalStream) => (
          <StreamBox
            title="Multi-Transform Pipeline"
            border="rounded"
            stream={finalStream}
            placeholder="Waiting for values > 50..."
            itemStyle={{ foreground: "magenta", bold: true }}
          />
        )}
      </Transform>
      
      {/* Spawn Example - Run a command and stream output */}
      <panel title="Command Execution" border="rounded">
        <Spawn
          command="ls -la"
          stdout="stream"
          stderr="stream"
          stdoutStyle={{ foreground: "green" }}
          stderrStyle={{ foreground: "red" }}
        />
      </panel>
      
      {/* Custom spawn rendering */}
      <Spawn command={["echo", "Hello from spawned process!"]} >
        {({ stdout, stderr, exitCode }) => (
          <vstack>
            <text color="blue">Command Output:</text>
            <Stream stream={stdout} transform={(line) => <text>→ {line}</text>} />
            <Stream stream={stderr} transform={(line) => <error>⚠ {line}</error>} />
          </vstack>
        )}
      </Spawn>
      
      {/* Command Pipeline - Pipe multiple commands */}
      <CommandPipeline
        commands={[
          { command: "ls -la" },
          { command: "grep -E '\\.tsx?$'" },
          { command: "wc -l" }
        ]}
        showPipeline={true}
      >
        {(output) => (
          <StreamBox
            title="Pipeline Result"
            border="thick"
            stream={output}
            transform={(line) => <success>TypeScript files: {line.trim()}</success>}
          />
        )}
      </CommandPipeline>
      
      {/* Complex Example - Log file monitoring */}
      <Plugin name="monitor" description="System monitoring">
        <Command name="logs" description="Monitor log files">
          <Arg name="file" description="Log file to monitor" default="/var/log/system.log" />
          <Flag name="filter" description="Filter pattern" alias="f" />
          <Flag name="lines" description="Initial lines to show" type="number" default={10} />
          
          <Command handler={(ctx) => {
            // Simulate tailing a log file
            const logStream = poll(async () => {
              const timestamp = new Date().toISOString()
              const level = Math.random() > 0.7 ? "ERROR" : 
                           Math.random() > 0.5 ? "WARN" : "INFO"
              const message = [
                "User authentication successful",
                "Database query completed",
                "Cache miss for key: user_123",
                "API request to /users endpoint",
                "Background job started",
                "Memory usage: 78%",
                "Connection timeout",
                "Rate limit exceeded"
              ][Math.floor(Math.random() * 8)]
              
              return `${timestamp} [${level}] ${message}`
            }, 2000)
            
            // Apply filter if provided
            const filteredStream = ctx.flags.filter
              ? pipe(
                  logStream,
                  Stream.filter((line: string) => 
                    line.includes(ctx.flags.filter as string)
                  )
                )
              : logStream
            
            return (
              <vstack>
                <text color="cyan">📜 Monitoring: {ctx.args.file}</text>
                {ctx.flags.filter && (
                  <text color="yellow">Filter: "{ctx.flags.filter}"</text>
                )}
                <text></text>
                
                <StreamBox
                  title="Log Output"
                  border="rounded"
                  stream={filteredStream}
                  maxItems={20}
                  autoScroll={true}
                  placeholder="Waiting for log entries..."
                  transform={(line: string) => {
                    const isError = line.includes("[ERROR]")
                    const isWarn = line.includes("[WARN]")
                    
                    return (
                      <text 
                        color={isError ? "red" : isWarn ? "yellow" : "gray"}
                        bold={isError}
                      >
                        {line}
                      </text>
                    )
                  }}
                />
                
                <text></text>
                <text color="gray">Press Ctrl+C to stop monitoring</text>
              </vstack>
            )
          }} />
        </Command>
      </Plugin>
      
      {/* Instructions */}
      <text></text>
      <panel title="Available Commands" border="single">
        <vstack>
          <text color="green">• monitor logs                    # Monitor default log</text>
          <text color="green">• monitor logs /path/to/file      # Monitor specific file</text>
          <text color="green">• monitor logs --filter ERROR     # Filter for errors</text>
          <text color="green">• monitor logs -f WARN -n 50      # Filter warnings, show 50 lines</text>
        </vstack>
      </panel>
      
      <text></text>
      <text color="gray">💡 Streams automatically handle backpressure and cleanup!</text>
    </vstack>
  )
}

// Run the demo
jsx(StreamDemo).catch(console.error)