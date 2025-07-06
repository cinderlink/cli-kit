/**
 * Simple CLI Example
 * 
 * Demonstrates the new CLI framework with basic commands
 */

import { defineConfig, runCLI, commonOptions } from "../../cli"
import { z } from "zod"

// Define our CLI
const config = defineConfig({
  name: "simple-cli",
  version: "1.0.0",
  description: "A simple CLI built with CLI-KIT",
  
  // Global options
  options: {
    verbose: commonOptions.verbose,
    config: commonOptions.config
  },
  
  commands: {
    hello: {
      description: "Say hello to someone",
      args: {
        name: z.string().describe("Person to greet")
      },
      options: {
        uppercase: z.boolean().default(false).describe("Use uppercase")
      },
      handler: (args) => {
        const greeting = `Hello, ${args.name}!`
        console.log(args.uppercase ? greeting.toUpperCase() : greeting)
      }
    },
    
    count: {
      description: "Count from 1 to N",
      args: {
        number: z.number().min(1).max(100).describe("Number to count to")
      },
      options: {
        delay: z.number().default(1000).describe("Delay between numbers (ms)")
      },
      handler: async (args) => {
        console.log("Received args:", args)
        console.log(`Counting to ${args.number}...`)
        for (let i = 1; i <= args.number; i++) {
          console.log(i)
          if (i < args.number) {
            await new Promise(resolve => setTimeout(resolve, args.delay))
          }
        }
        console.log("Done!")
      }
    },
    
    echo: {
      description: "Echo text back",
      args: {
        text: z.string().describe("Text to echo")
      },
      aliases: ["e"],
      handler: (args) => {
        console.log(args.text)
      }
    }
  }
})

// Run the CLI if this file is executed directly
if (typeof Bun !== 'undefined' && import.meta.path === Bun.main) {
  runCLI(config).catch(console.error)
}