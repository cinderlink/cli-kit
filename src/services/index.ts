/**
 * Services Module - Exports all service interfaces and utilities
 * 
 * This module provides a centralized export point for all service interfaces
 * and their associated utilities.
 */

// Service interfaces
export * from "./terminal.ts"
export * from "./input.ts"
export * from "./renderer.ts"
export * from "./storage.ts"
export * from "./hit-test.ts"
export * from "./mouse-router.ts"

// Re-export common types from core
export type {
  TerminalError,
  InputError,
  RenderError,
  StorageError,
  AppError,
  KeyEvent,
  MouseEvent,
  WindowSize,
  View,
  Viewport,
  TerminalCapabilities,
  AppServices,
  Component,
  Cmd
} from "@/core/types.ts"