/**
 * Zod Schemas for TUIX Core Types - Comprehensive validation system
 * 
 * This module provides a complete set of Zod schemas for runtime validation
 * and type inference across the TUIX framework. The schemas ensure data integrity
 * at runtime while providing excellent TypeScript integration through inference.
 * 
 * ## Key Features:
 * 
 * ### Type-Safe Validation
 * - Runtime validation with compile-time type inference
 * - Comprehensive input sanitization and constraint checking
 * - Composable schema definitions for complex data structures
 * 
 * ### Framework Integration
 * - Schemas for all core TUIX types (views, components, styles)
 * - Input event validation (keyboard, mouse, resize)
 * - Configuration and error handling schemas
 * 
 * ### CLI and Process Management
 * - Command-line interface configuration schemas
 * - Process management and IPC type definitions
 * - Plugin and hook system validation
 * 
 * ### Validation Utilities
 * - Type guards for safe runtime checks
 * - Parse functions with detailed error reporting
 * - Utility functions for common validation patterns
 * 
 * @example
 * ```typescript
 * import { KeyEventSchema, validateKeyEvent, parseKeyEvent } from './schemas'
 * 
 * // Type guard usage
 * if (validateKeyEvent(unknownData)) {
 *   // Now TypeScript knows it's a KeyEvent
 *   console.log('Key pressed:', unknownData.key)
 * }
 * 
 * // Parse with error handling
 * try {
 *   const keyEvent = parseKeyEvent(rawInput)
 *   handleKeyPress(keyEvent)
 * } catch (error) {
 *   console.error('Invalid key event:', error.message)
 * }
 * 
 * // Schema composition
 * const CustomComponentSchema = ComponentSchema.extend({
 *   customProp: z.string()
 * })
 * ```
 * 
 * @module core/schemas
 */

import { z } from "zod"

// =============================================================================
// Basic Schemas - Fundamental data types
// =============================================================================

/**
 * Color value schema supporting multiple formats
 * 
 * Validates color values in hex format (#RRGGBB), RGB function format,
 * or predefined color names. Includes standard and bright color variants.
 */

export const ColorSchema = z.union([
  z.string().regex(/^#[0-9a-fA-F]{6}$/), // Hex colors
  z.string().regex(/^rgb\(\d+,\s*\d+,\s*\d+\)$/), // RGB
  z.enum([
    "black", "red", "green", "yellow", "blue", "magenta", "cyan", "white",
    "brightBlack", "brightRed", "brightGreen", "brightYellow", 
    "brightBlue", "brightMagenta", "brightCyan", "brightWhite",
    "gray", "grey", "darkGray", "darkGrey", "lightGray", "lightGrey"
  ])
])

/**
 * 2D position schema with non-negative integer coordinates
 * 
 * Represents a point in 2D space with x and y coordinates.
 * Used for cursor positions, layout coordinates, and positioning.
 */
export const PositionSchema = z.object({
  x: z.number().int().min(0),
  y: z.number().int().min(0)
})

export const SizeSchema = z.object({
  width: z.number().int().min(0),
  height: z.number().int().min(0)
})

export const BoundsSchema = PositionSchema.extend({
  width: z.number().int().min(0),
  height: z.number().int().min(0)
})

// =============================================================================
// Keyboard & Input Schemas
// =============================================================================

export const KeyTypeSchema = z.enum([
  "character", "space", "tab", "enter", "escape", "backspace", "delete",
  "arrowUp", "arrowDown", "arrowLeft", "arrowRight",
  "home", "end", "pageUp", "pageDown", "insert",
  "f1", "f2", "f3", "f4", "f5", "f6", "f7", "f8", "f9", "f10", "f11", "f12",
  "unknown"
])

export const KeyEventSchema = z.object({
  key: z.string(),
  runes: z.string(),
  type: KeyTypeSchema,
  ctrl: z.boolean(),
  alt: z.boolean(),
  shift: z.boolean(),
  meta: z.boolean()
})

export const MouseButtonSchema = z.enum([
  "left", "right", "middle", "wheel-up", "wheel-down"
])

export const MouseEventTypeSchema = z.enum([
  "press", "release", "motion", "wheel"
])

export const MouseEventSchema = z.object({
  type: MouseEventTypeSchema,
  x: z.number().int().min(0),
  y: z.number().int().min(0),
  button: MouseButtonSchema,
  ctrl: z.boolean(),
  alt: z.boolean(),
  shift: z.boolean()
})

export const WindowSizeSchema = SizeSchema

// =============================================================================
// Styling Schemas
// =============================================================================

export const PaddingSchema = z.union([
  z.number().int().min(0),
  z.object({
    top: z.number().int().min(0).optional(),
    right: z.number().int().min(0).optional(),
    bottom: z.number().int().min(0).optional(),
    left: z.number().int().min(0).optional()
  })
])

export const AlignSchema = z.enum(["left", "center", "right"])
export const VerticalAlignSchema = z.enum(["top", "middle", "bottom"])

export const StyleSchema = z.object({
  color: ColorSchema.optional(),
  background: ColorSchema.optional(),
  bold: z.boolean().optional(),
  dim: z.boolean().optional(),
  italic: z.boolean().optional(),
  underline: z.boolean().optional(),
  strikethrough: z.boolean().optional(),
  blink: z.boolean().optional(),
  reverse: z.boolean().optional(),
  hidden: z.boolean().optional(),
  padding: PaddingSchema.optional(),
  margin: PaddingSchema.optional(),
  align: AlignSchema.optional(),
  verticalAlign: VerticalAlignSchema.optional(),
  width: z.number().int().min(0).optional(),
  height: z.number().int().min(0).optional(),
  minWidth: z.number().int().min(0).optional(),
  maxWidth: z.number().int().min(0).optional(),
  minHeight: z.number().int().min(0).optional(),
  maxHeight: z.number().int().min(0).optional()
})

export const BorderCharactersSchema = z.object({
  top: z.string(),
  bottom: z.string(),
  left: z.string(),
  right: z.string(),
  topLeft: z.string(),
  topRight: z.string(),
  bottomLeft: z.string(),
  bottomRight: z.string()
})

// =============================================================================
// View System Schemas
// =============================================================================

export const ViewSchema: z.ZodType<{
  render: () => Promise<string>
  width?: number
  height?: number
  handleKey?: (key: unknown) => Promise<unknown>
  handleMouse?: (mouse: unknown) => Promise<unknown>
}> = z.lazy(() => z.object({
  render: z.function()
    .args()
    .returns(z.promise(z.string())),
  width: z.number().int().min(0).optional(),
  height: z.number().int().min(0).optional(),
  handleKey: z.function()
    .args(KeyEventSchema)
    .returns(z.promise(z.unknown()))
    .optional(),
  handleMouse: z.function()
    .args(MouseEventSchema)
    .returns(z.promise(z.unknown()))
    .optional()
}))

// =============================================================================
// Component Schemas
// =============================================================================

export const CmdSchema = z.function()
  .returns(z.promise(z.unknown()))

export const ComponentSchema = z.object({
  init: z.function()
    .returns(z.promise(z.tuple([z.unknown(), z.array(CmdSchema)]))),
  update: z.function()
    .args(z.unknown(), z.unknown())
    .returns(z.promise(z.tuple([z.unknown(), z.array(CmdSchema)]))),
  view: z.function()
    .args(z.unknown())
    .returns(ViewSchema),
  subscriptions: z.function()
    .args(z.unknown())
    .returns(z.array(z.function()))
    .optional()
})

// =============================================================================
// Configuration Schemas
// =============================================================================

export const AppOptionsSchema = z.object({
  altScreen: z.boolean().optional().default(true),
  mouseMode: z.boolean().optional().default(false),
  debugMode: z.boolean().optional().default(false),
  logLevel: z.enum(["debug", "info", "warn", "error"]).optional().default("info"),
  refreshRate: z.number().int().min(1).max(120).optional().default(60)
})

export const ViewportSchema = BoundsSchema

export const TerminalCapabilitiesSchema = z.object({
  colors: z.union([z.literal('none'), z.literal('basic'), z.literal('256'), z.literal('truecolor')]),
  unicode: z.boolean(),
  mouse: z.boolean(),
  clipboard: z.boolean(),
  sixel: z.boolean(),
  kitty: z.boolean(),
  iterm2: z.boolean(),
  windowTitle: z.boolean(),
  columns: z.number(),
  rows: z.number(),
  alternateScreen: z.boolean().optional(),
  cursorShapes: z.boolean().optional()
})

// =============================================================================
// CLI Framework Schemas
// =============================================================================

export const CLIOptionSchema = z.object({
  description: z.string().optional(),
  type: z.enum(["string", "number", "boolean"]),
  required: z.boolean().optional().default(false),
  default: z.unknown().optional(),
  choices: z.array(z.string()).optional(),
  validate: z.function().args(z.unknown()).returns(z.boolean()).optional()
})

export const CLICommandSchema = z.object({
  description: z.string().optional(),
  args: z.record(z.string(), CLIOptionSchema).optional(),
  options: z.record(z.string(), CLIOptionSchema).optional(),
  handler: z.function()
    .args(z.record(z.string(), z.unknown()))
    .returns(z.union([z.string(), z.promise(z.string())]))
})

export const CLIConfigSchema = z.object({
  name: z.string(),
  version: z.string(),
  description: z.string().optional(),
  commands: z.record(z.string(), CLICommandSchema),
  options: z.record(z.string(), CLIOptionSchema).optional(),
  plugins: z.array(z.unknown()).optional(),
  hooks: z.record(z.string(), z.function()).optional()
})

// =============================================================================
// Error Schemas
// =============================================================================

export const ErrorCodeSchema = z.enum([
  "TERMINAL_ERROR",
  "INPUT_ERROR", 
  "RENDER_ERROR",
  "STORAGE_ERROR",
  "CONFIG_ERROR",
  "COMPONENT_ERROR",
  "APPLICATION_ERROR",
  "VALIDATION_ERROR"
])

export const AppErrorSchema = z.object({
  code: ErrorCodeSchema,
  message: z.string(),
  cause: z.unknown().optional(),
  timestamp: z.number(),
  context: z.record(z.string(), z.unknown()).optional()
})

// =============================================================================
// Process Management Schemas
// =============================================================================

export const ProcessStatusSchema = z.enum([
  "stopped", "starting", "running", "stopping", "failed", "crashed"
])

export const IPCChannelTypeSchema = z.enum([
  "unix-socket", "tcp", "named-pipe", "stdio"
])

export const ProcessConfigSchema = z.object({
  name: z.string(),
  command: z.string(),
  args: z.array(z.string()).optional(),
  cwd: z.string().optional(),
  env: z.record(z.string(), z.string()).optional(),
  ipc: IPCChannelTypeSchema.optional(),
  autoRestart: z.boolean().optional().default(false),
  maxRestarts: z.number().int().min(0).optional(),
  restartDelay: z.number().int().min(0).optional()
})

export const ProcessLogSchema = z.object({
  timestamp: z.number(),
  level: z.enum(["info", "warn", "error", "debug"]),
  message: z.string(),
  source: z.enum(["stdout", "stderr", "system"])
})

// =============================================================================
// Type Inference Exports
// =============================================================================

export type Color = z.infer<typeof ColorSchema>
export type Position = z.infer<typeof PositionSchema>
export type Size = z.infer<typeof SizeSchema>
export type Bounds = z.infer<typeof BoundsSchema>
export type KeyType = z.infer<typeof KeyTypeSchema>
export type MouseButton = z.infer<typeof MouseButtonSchema>
export type MouseEventType = z.infer<typeof MouseEventTypeSchema>
export type MouseEvent = z.infer<typeof MouseEventSchema>
export type WindowSize = z.infer<typeof WindowSizeSchema>
export type Padding = z.infer<typeof PaddingSchema>
export type Align = z.infer<typeof AlignSchema>
export type VerticalAlign = z.infer<typeof VerticalAlignSchema>
export type Style = z.infer<typeof StyleSchema>
export type BorderCharacters = z.infer<typeof BorderCharactersSchema>
export type TerminalCapabilities = z.infer<typeof TerminalCapabilitiesSchema>
export type CLIOption = z.infer<typeof CLIOptionSchema>
export type CLICommand = z.infer<typeof CLICommandSchema>
export type CLIConfig = z.infer<typeof CLIConfigSchema>
export type ErrorCode = z.infer<typeof ErrorCodeSchema>
export type ProcessStatus = z.infer<typeof ProcessStatusSchema>
export type IPCChannelType = z.infer<typeof IPCChannelTypeSchema>
export type ProcessConfig = z.infer<typeof ProcessConfigSchema>
export type ProcessLog = z.infer<typeof ProcessLogSchema>

// =============================================================================
// Validation Utilities - Type guards and runtime validation
// =============================================================================

/**
 * Type guard for keyboard events
 * 
 * Safely determines if an unknown value is a valid KeyEvent.
 * Returns true if the value passes validation, false otherwise.
 * 
 * @param data - Unknown data to validate
 * @returns True if data is a valid KeyEvent
 * 
 * @example
 * ```typescript
 * if (validateKeyEvent(rawInput)) {
 *   // TypeScript now knows rawInput is KeyEvent
 *   console.log('Key:', rawInput.key)
 * }
 * ```
 */
export const validateKeyEvent = (data: unknown): data is KeyEvent => {
  return KeyEventSchema.safeParse(data).success
}

export const validateMouseEvent = (data: unknown): data is MouseEvent => {
  return MouseEventSchema.safeParse(data).success
}

export const validateStyle = (data: unknown): data is Style => {
  return StyleSchema.safeParse(data).success
}

export const validateComponent = (data: unknown): data is Component => {
  return ComponentSchema.safeParse(data).success
}

export const validateCLIConfig = (data: unknown): data is CLIConfig => {
  return CLIConfigSchema.safeParse(data).success
}

export const validateProcessConfig = (data: unknown): data is ProcessConfig => {
  return ProcessConfigSchema.safeParse(data).success
}

// =============================================================================
// Parse Utilities - Validation with detailed error reporting
// =============================================================================

/**
 * Parse and validate keyboard event data
 * 
 * Parses unknown data as a KeyEvent, throwing detailed validation
 * errors if the data doesn't match the expected schema.
 * 
 * @param data - Unknown data to parse
 * @returns Validated KeyEvent object
 * @throws ZodError with detailed validation failure information
 * 
 * @example
 * ```typescript
 * try {
 *   const keyEvent = parseKeyEvent(userInput)
 *   handleKeyPress(keyEvent)
 * } catch (error) {
 *   console.error('Invalid key event:', error.message)
 * }
 * ```
 */
export const parseKeyEvent = (data: unknown): KeyEvent => {
  return KeyEventSchema.parse(data)
}

export const parseMouseEvent = (data: unknown): MouseEvent => {
  return MouseEventSchema.parse(data)
}

export const parseStyle = (data: unknown): Style => {
  return StyleSchema.parse(data)
}

export const parseComponent = (data: unknown): Component => {
  return ComponentSchema.parse(data)
}

export const parseCLIConfig = (data: unknown): CLIConfig => {
  return CLIConfigSchema.parse(data)
}

export const parseProcessConfig = (data: unknown): ProcessConfig => {
  return ProcessConfigSchema.parse(data)
}

// Need to add KeyEvent type since it was removed from the inference exports
export type KeyEvent = z.infer<typeof KeyEventSchema>