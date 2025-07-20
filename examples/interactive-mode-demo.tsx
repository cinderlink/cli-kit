#!/usr/bin/env bun
/**
 * Interactive Mode Demo
 * 
 * Demonstrates the context-based interactive mode system in Tuix
 */

import { jsx } from "../src/jsx-app"
import { Effect } from "effect"
import { Interactive } from "../src/core/interactive"
import { timer } from "../src/components/streams"

function InteractiveModeDemo() {
  return (
    <vstack>
      <Plugin name="demo" description="Interactive mode demonstrations">
        {/* Non-interactive command (default) */}
        <Command name="quick" description="Quick command that exits immediately"
          handler={() => (
            <vstack>
              <success>✅ Quick operation completed!</success>
              <text>This command rendered and exited immediately.</text>
            </vstack>
          )}
        />
        
        {/* Always interactive command */}
        <Command name="monitor" description="Monitor system status"
          interactive={true}
          handler={() => (
            <vstack>
              <text color="cyan" bold>System Monitor</text>
              <text>Press Ctrl+C to exit</text>
              <text></text>
              <Stream 
                stream={timer(1000)}
                transform={(n) => (
                  <hstack>
                    <text color="green">⚡</text>
                    <text>Heartbeat {n}</text>
                    <text color="gray">CPU: {Math.round(Math.random() * 100)}%</text>
                  </hstack>
                )}
                maxItems={10}
              />
            </vstack>
          )}
        />
        
        {/* Conditionally interactive based on flags */}
        <Command name="logs" description="View logs">
          <Flag name="follow" alias="f" description="Follow log output" />
          <Flag name="lines" alias="n" type="number" default={10} description="Number of lines" />
          
          <Command 
            interactive={(ctx) => ctx.flags.follow === true}
            handler={(ctx) => (
              <vstack>
                <text color="blue" bold>Log Viewer</text>
                <text>Showing last {ctx.flags.lines} lines</text>
                
                {ctx.flags.follow ? (
                  <vstack>
                    <text color="yellow">Following logs... Press Ctrl+C to stop</text>
                    <Stream
                      stream={timer(2000, 100)}
                      transform={(n) => (
                        <text color="gray">[{new Date().toLocaleTimeString()}] Log entry #{n}</text>
                      )}
                      maxItems={ctx.flags.lines}
                      autoScroll={true}
                    />
                  </vstack>
                ) : (
                  <vstack>
                    {Array.from({ length: ctx.flags.lines }, (_, i) => (
                      <text key={i} color="gray">Static log line {i + 1}</text>
                    ))}
                  </vstack>
                )}
              </vstack>
            )}
          />
        </Command>
        
        {/* Interactive with timeout */}
        <Command name="countdown" description="Countdown timer with auto-exit"
          interactive={{
            enabled: true,
            timeout: 10000,  // Exit after 10 seconds
            onExit: (code) => console.log(`\nExited with code ${code}`)
          }}
          handler={() => (
            <vstack>
              <text color="yellow" bold>⏰ Countdown Timer</text>
              <text>This will auto-exit after 10 seconds...</text>
              <text></text>
              <Stream
                stream={timer(1000, 10)}
                transform={(n) => {
                  const remaining = 10 - n
                  return (
                    <hstack>
                      <text color={remaining <= 3 ? "red" : "green"}>
                        {remaining} seconds remaining
                      </text>
                      {remaining === 0 && <Exit message="💥 Time's up!" />}
                    </hstack>
                  )
                }}
              />
            </vstack>
          )}
        />
        
        {/* Advanced interactive control */}
        <Command name="advanced" description="Advanced interactive mode demo">
          <Flag name="mode" choices={["auto", "manual", "timed"]} default="auto" />
          
          <Command handler={(ctx) => Effect.gen(function* () {
            // This demonstrates using the Interactive API directly
            const mode = ctx.flags.mode
            
            if (mode === "auto") {
              return (
                <vstack>
                  <text color="blue">Auto mode - exits after 5 seconds</text>
                  <Exit delay={5000} message="Auto-exit complete" />
                </vstack>
              )
            }
            
            if (mode === "timed") {
              // Use interactive scope for just part of the command
              yield* Interactive.scope(
                Effect.gen(function* () {
                  return (
                    <vstack>
                      <text color="yellow">Timed interactive section (10s)</text>
                      <Stream
                        stream={timer(1000, 10)}
                        transform={(n) => <text>Interactive tick: {n}</text>}
                      />
                    </vstack>
                  )
                }),
                { timeout: 10000 }
              )
              
              return <success>Timed section complete!</success>
            }
            
            // Manual mode
            return (
              <vstack>
                <text color="green">Manual mode - exit when ready</text>
                <text>Press Ctrl+C to exit</text>
              </vstack>
            )
          }).pipe(
            Effect.map((element) => ({
              element,
              interactive: ctx.flags.mode === "manual"
            }))
          )} />
        </Command>
      </Plugin>
      
      <text color="cyan" bold>Interactive Mode Demo</text>
      <text>Try these commands:</text>
      <text color="green">• demo quick          - Exits immediately</text>
      <text color="green">• demo monitor        - Always interactive</text>
      <text color="green">• demo logs           - Non-interactive</text>
      <text color="green">• demo logs --follow  - Interactive when following</text>
      <text color="green">• demo countdown      - Interactive with timeout</text>
      <text color="green">• demo advanced       - Advanced mode control</text>
    </vstack>
  )
}

jsx(InteractiveModeDemo).catch(console.error)