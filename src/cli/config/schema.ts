/**
 * CLI Configuration Schema Extensions
 * 
 * Extends the core config schema with CLI-specific validations
 */

import { z } from "zod"

/**
 * Common CLI option schemas
 */
export const commonOptions = {
  /** Enable verbose output */
  verbose: z.boolean().default(false).describe("Enable verbose output"),
  /** Enable quiet mode */
  quiet: z.boolean().default(false).describe("Suppress non-error output"),
  /** Show help information */
  help: z.boolean().default(false).describe("Show help information"),
  /** Show version information */
  version: z.boolean().default(false).describe("Show version information"),
  /** Output format */
  format: z.enum(["json", "yaml", "table", "plain"]).default("plain").describe("Output format"),
  /** Disable colors in output */
  noColor: z.boolean().default(false).describe("Disable colored output"),
  /** Output file path */
  output: z.string().optional().describe("Output file path"),
  /** Input file path */
  input: z.string().optional().describe("Input file path"),
  /** Configuration file path */
  config: z.string().optional().describe("Path to configuration file"),
  /** Enable watch mode */
  watch: z.boolean().default(false).describe("Enable watch mode"),
  /** Server port */
  port: z.number().min(1).max(65535).optional().describe("Server port"),
  /** Server host */
  host: z.string().default("localhost").describe("Server host"),
}

/**
 * Common CLI argument schemas
 */
export const commonArgs = {
  /** File path argument */
  file: z.string().describe("File path"),
  /** Directory path argument */
  directory: z.string().describe("Directory path"),
  /** Generic string argument */
  string: z.string().describe("String value"),
  /** Generic number argument */
  number: z.number().describe("Numeric value"),
  /** Boolean flag argument */
  boolean: z.boolean().describe("Boolean flag"),
  /** URL argument */
  url: z.string().url().describe("URL"),
  /** Email argument */
  email: z.string().email().describe("Email address"),
}

/**
 * Reserved command names that cannot be used
 */
export const RESERVED_NAMES = [
  "help",
  "version",
  "--help",
  "-h",
  "--version",
  "-v",
  "constructor",
  "prototype",
  "__proto__",
  "toString",
  "valueOf",
  "hasOwnProperty",
  "isPrototypeOf",
  "propertyIsEnumerable",
  "toLocaleString",
]

/**
 * Version string validation pattern
 */
export const VERSION_PATTERN = /^\d+\.\d+\.\d+(-[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)*)?(\+[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)*)?$/