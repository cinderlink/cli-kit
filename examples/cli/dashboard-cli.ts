/**
 * Dashboard CLI Example
 * 
 * Demonstrates the new simplified component API with a dashboard interface
 */

import { 
  defineConfig, 
  runCLI,
  createComponent,
  $state,
  $derived,
  $effect,
  onMount,
  Panel,
  HeaderPanel,
  InfoPanel,
  SuccessPanel,
  WarningPanel,
  ErrorPanel,
  SimpleButton,
  PrimaryButton,
  SecondaryButton,
  ButtonGroup,
  text,
  styledText,
  vstack,
  hstack,
  style,
  Colors
} from "../../cli"
import { z } from "zod"

// Dashboard component using the simplified API
const Dashboard = createComponent((context) => {
  // Reactive state
  const status = context.$state("Loading...")
  const uptime = context.$state(0)
  const errors = context.$state(0)
  const warnings = context.$state(0)
  const isConnected = context.$state(false)
  
  // Derived state
  const statusColor = context.$derived(() => {
    if (!isConnected()) return Colors.red
    if (errors() > 0) return Colors.red
    if (warnings() > 0) return Colors.yellow
    return Colors.green
  })
  
  const statusMessage = context.$derived(() => {
    if (!isConnected()) return "Disconnected"
    if (errors() > 0) return `${errors()} Errors`
    if (warnings() > 0) return `${warnings()} Warnings`
    return "All Systems Operational"
  })
  
  // Effects and lifecycle
  context.onMount(() => {
    console.log("Dashboard mounted!")
    
    // Simulate connecting
    setTimeout(() => {
      status.set("Connected")
      isConnected.set(true)
    }, 1000)
    
    // Simulate data updates
    const interval = setInterval(() => {
      uptime.update(current => current + 1)
      
      // Randomly add warnings/errors
      if (Math.random() < 0.1) {
        warnings.update(w => w + 1)
      }
      if (Math.random() < 0.05) {
        errors.update(e => e + 1)
      }
    }, 2000)
    
    return () => clearInterval(interval)
  })
  
  context.$effect(() => {
    console.log(`Status changed: ${statusMessage()}`)
  })
  
  return {
    view: () => vstack(
      HeaderPanel(
        vstack(
          styledText("🚀 CLI Dashboard", style().foreground(Colors.brightCyan).bold()),
          text(""),
          styledText("System Monitoring & Control", style().foreground(Colors.gray))
        ),
        "CLI-KIT Dashboard"
      ),
      
      text(""),
      
      hstack(
        InfoPanel(
          vstack(
            styledText(`Uptime: ${uptime()}s`, style().foreground(Colors.white)),
            styledText(`Status: ${status()}`, style().foreground(statusColor()))
          ),
          "System Status"
        ),
        
        text("  "),
        
        isConnected() && errors() > 0 
          ? ErrorPanel(
              vstack(
                styledText(`${errors()} errors detected`, style().foreground(Colors.white)),
                styledText("Immediate attention required", style().foreground(Colors.brightRed))
              ),
              "Critical Issues"
            )
          : warnings() > 0
          ? WarningPanel(
              vstack(
                styledText(`${warnings()} warnings`, style().foreground(Colors.white)),
                styledText("Review recommended", style().foreground(Colors.brightYellow))
              ),
              "Warnings"
            )
          : SuccessPanel(
              vstack(
                styledText("All systems normal", style().foreground(Colors.white)),
                styledText("No issues detected", style().foreground(Colors.brightGreen))
              ),
              "Status"
            )
      ),
      
      text(""),
      
      Panel(
        vstack(
          styledText("Actions:", style().foreground(Colors.brightWhite).bold()),
          text(""),
          ButtonGroup([
            PrimaryButton("Refresh", () => {
              status.set("Refreshing...")
              setTimeout(() => status.set("Connected"), 500)
            }),
            SecondaryButton("Clear Errors", () => {
              errors.set(0)
              warnings.set(0)
            }),
            SimpleButton("Disconnect", {
              variant: 'danger',
              onClick: () => {
                isConnected.set(false)
                status.set("Disconnected")
              }
            })
          ])
        ),
        { title: "Controls", padding: 2 }
      )
    )
  }
})

// CLI configuration with dashboard command
const config = defineConfig({
  name: "dashboard-cli",
  version: "1.0.0",
  description: "A dashboard CLI built with the simplified API",
  
  commands: {
    dashboard: {
      description: "Show the interactive dashboard",
      options: {
        refresh: z.number().default(2000).describe("Refresh interval in ms")
      },
      handler: (args) => {
        console.log(`Starting dashboard with refresh interval: ${args.refresh}ms`)
        return Dashboard
      }
    },
    
    status: {
      description: "Show quick status",
      handler: () => {
        const StatusDisplay = createComponent((context) => {
          const loading = context.$state(true)
          
          context.onMount(() => {
            setTimeout(() => loading.set(false), 1000)
          })
          
          return {
            view: () => loading() 
              ? Panel(text("Loading status..."), { title: "Status" })
              : SuccessPanel(
                  vstack(
                    text("✓ System operational"),
                    text("✓ All services running"),
                    text("✓ No issues detected")
                  ),
                  "System Status"
                )
          }
        })
        
        return StatusDisplay
      }
    },
    
    demo: {
      description: "Component showcase demo",
      handler: () => {
        const ComponentDemo = createComponent((context) => {
          const counter = context.$state(0)
          const message = context.$state("Hello from CLI-KIT!")
          
          const doubledCounter = context.$derived(() => counter() * 2)
          
          return {
            view: () => vstack(
              HeaderPanel(
                text("Component Showcase"),
                "CLI-KIT Demo"
              ),
              
              text(""),
              
              hstack(
                InfoPanel(
                  vstack(
                    styledText(`Counter: ${counter()}`, style().foreground(Colors.white)),
                    styledText(`Doubled: ${doubledCounter()}`, style().foreground(Colors.cyan))
                  ),
                  "Reactive State"
                ),
                
                text("  "),
                
                Panel(
                  vstack(
                    styledText(message(), style().foreground(Colors.white)),
                    text(""),
                    ButtonGroup([
                      PrimaryButton("Increment", () => counter.update(c => c + 1)),
                      SecondaryButton("Reset", () => counter.set(0)),
                      SimpleButton("Change Message", {
                        variant: 'info',
                        onClick: () => message.set(`Updated at ${new Date().toLocaleTimeString()}`)
                      })
                    ])
                  ),
                  { title: "Controls" }
                )
              )
            )
          }
        })
        
        return ComponentDemo
      }
    }
  }
})

// Run the CLI if this file is executed directly
if (typeof Bun !== 'undefined' && import.meta.path === Bun.main) {
  runCLI(config).catch(console.error)
}