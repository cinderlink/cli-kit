import { z } from "zod"

export const commonOptions = {
  verbose: z.boolean().default(false).describe("Enable verbose output"),
  quiet: z.boolean().default(false).describe("Suppress standard output"),
  debug: z.boolean().default(false).describe("Enable debug logging"),
  help: z.boolean().default(false).describe("Show help information"),
  version: z.boolean().default(false).describe("Show version information"),
  config: z.string().optional().describe("Path to configuration file"),
  output: z.string().optional().describe("Optional output path"),
  force: z.boolean().default(false).describe("Execute without confirmation"),
  yes: z.boolean().default(false).describe("Answer yes to prompts"),
  no: z.boolean().default(false).describe("Answer no to prompts"),
  port: z.number().min(1).max(65535).default(3000).describe("Port number"),
  host: z.string().default("localhost").describe("Host to bind to"),
  input: z.string().describe("Input file path"),
  watch: z.boolean().default(false).describe("Watch for changes"),
  logLevel: z.enum(["debug", "info", "warn", "error"]).default("info").describe("Logging level"),
  format: z.enum(["text", "json", "yaml"]).default("text").describe("Output format")
} as const

export const commonArgs = {
  path: z.string().describe("File or directory path"),
  file: z.string().describe("File path"),
  directory: z.string().describe("Directory path"),
  name: z.string().describe("Entity name"),
  id: z.string().describe("Identifier"),
  url: z.string().url().describe("URL"),
  email: z.string().email().describe("Email address"),
  value: z.string().describe("Generic value"),
  values: z.array(z.string()).describe("Multiple values")
} as const
