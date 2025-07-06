/**
 * CLI Startup Performance Benchmarks
 * 
 * Tests startup performance of various CLI configurations
 */

import { test, describe, expect } from "bun:test"
import { defineConfig } from "../../cli"
import { CLIParser } from "../../src/cli/parser"
import { CLIRouter } from "../../src/cli/router"
import { z } from "zod"

describe("CLI Startup Performance", () => {
  const runTimed = async (name: string, fn: () => void, iterations = 100) => {
    const start = performance.now()
    for (let i = 0; i < iterations; i++) {
      fn()
    }
    const end = performance.now()
    const total = end - start
    const avg = total / iterations
    console.log(`${name}: ${total.toFixed(2)}ms total, ${avg.toFixed(4)}ms avg (${iterations} iterations)`)
    return { total, avg, iterations }
  }

  // Minimal config
  const minimalConfig = defineConfig({
    name: "bench-cli",
    version: "1.0.0"
  })
  
  // Config with many commands
  const complexConfig = defineConfig({
    name: "bench-cli",
    version: "1.0.0",
    options: {
      verbose: z.boolean().default(false),
      json: z.boolean().default(false),
      quiet: z.boolean().default(false)
    },
    commands: Object.fromEntries(
      Array.from({ length: 50 }, (_, i) => [
        `command${i}`,
        {
          description: `Command ${i}`,
          args: {
            input: z.string().describe("Input file"),
            output: z.string().describe("Output file")
          },
          options: {
            force: z.boolean().default(false),
            dryRun: z.boolean().default(false)
          },
          handler: () => {}
        }
      ])
    )
  })
  
  test("minimal config parsing", async () => {
    const result = await runTimed("Minimal config parsing", () => {
      const parser = new CLIParser(minimalConfig)
      parser.parse(["--help"])
    })
    expect(result.avg).toBeLessThan(10) // Should parse quickly
  })
  
  test("complex config parsing", async () => {
    const result = await runTimed("Complex config parsing", () => {
      const parser = new CLIParser(complexConfig)
      parser.parse(["command25", "input.txt", "output.txt", "--force"])
    })
    expect(result.avg).toBeLessThan(50) // More commands = slower
  })
  
  test("router initialization - minimal", async () => {
    const result = await runTimed("Router init (minimal)", () => {
      new CLIRouter(minimalConfig)
    })
    expect(result.avg).toBeLessThan(5)
  })
  
  test("router initialization - complex", async () => {
    const result = await runTimed("Router init (complex)", () => {
      new CLIRouter(complexConfig)
    })
    expect(result.avg).toBeLessThan(20)
  })
  
  test("help generation - minimal", async () => {
    const parser = new CLIParser(minimalConfig)
    
    const result = await runTimed("Help generation (minimal)", () => {
      parser.generateHelp()
    })
    expect(result.avg).toBeLessThan(5)
  })
  
  test("help generation - complex", async () => {
    const parser = new CLIParser(complexConfig)
    
    const result = await runTimed("Help generation (complex)", () => {
      parser.generateHelp()
    }, 50) // Fewer iterations for complex operations
    expect(result.avg).toBeLessThan(20)
  })
})