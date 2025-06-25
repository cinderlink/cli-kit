/**
 * Core Module - Main exports for the CLI-Kit framework
 * 
 * This module provides the primary public API for the framework,
 * including types, components, and utilities.
 */

// Core types and interfaces
export * from "./types.ts"

// Error system (avoid duplicates by importing specific items)
export {
  TerminalError,
  InputError,
  RenderError,
  StorageError,
  ConfigError,
  ComponentError,
  ApplicationError,
  ValidationError,
  ErrorUtils,
  withErrorBoundary,
  withRecovery,
  RecoveryStrategies
} from "./errors.ts"

export type {
  AppError,
  CriticalError,
  RecoverableError,
  ErrorRecoveryStrategy,
  ErrorBoundaryConfig
} from "./errors.ts"

// Re-export commonly used Effect types for convenience
export { Effect, Context, Layer, Stream, Queue, Ref } from "effect"

// Re-export Zod for schema validation
export { z as Schema } from "zod"

// Runtime system
export { Runtime, runApp } from "./runtime.ts"
export type { RuntimeConfig, SystemMsg } from "./runtime.ts"

// Key handling utilities
export { KeyUtils, KeyType } from "./keys.ts"