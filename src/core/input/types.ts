/**
 * Input Module Type Definitions
 *
 * Centralized type definitions for the input module, providing types
 * for keyboard, mouse, and focus management.
 */

import { z } from 'zod'

// =============================================================================
// Mouse Types
// =============================================================================

/**
 * Mouse event types
 */
export const MouseEventTypeSchema = z.enum(['press', 'release', 'motion', 'wheel'])
export type MouseEventType = z.infer<typeof MouseEventTypeSchema>

/**
 * Mouse button types
 */
export const MouseButtonSchema = z.enum(['left', 'right', 'middle'])
export type MouseButton = z.infer<typeof MouseButtonSchema>

/**
 * Mouse event
 */
export const MouseEventSchema = z.object({
  type: MouseEventTypeSchema,
  x: z.number(),
  y: z.number(),
  button: MouseButtonSchema.optional(),
  wheelDelta: z.number().optional(),
  modifiers: z
    .object({
      shift: z.boolean(),
      ctrl: z.boolean(),
      alt: z.boolean(),
      meta: z.boolean(),
    })
    .optional(),
})

export type MouseEvent = z.infer<typeof MouseEventSchema>

// =============================================================================
// Keyboard Types
// =============================================================================

/**
 * Key event types
 */
export const KeyEventTypeSchema = z.enum(['press', 'release'])
export type KeyEventType = z.infer<typeof KeyEventTypeSchema>

/**
 * Key event
 */
export const KeyEventSchema = z.object({
  type: KeyEventTypeSchema,
  key: z.string(),
  code: z.string().optional(),
  modifiers: z.object({
    shift: z.boolean(),
    ctrl: z.boolean(),
    alt: z.boolean(),
    meta: z.boolean(),
  }),
})

export type KeyEvent = z.infer<typeof KeyEventSchema>

// =============================================================================
// Focus Types
// =============================================================================

/**
 * Focus event types
 */
export type FocusEventType = 'focus' | 'blur'

/**
 * Focus direction for navigation
 */
export type FocusDirection = 'next' | 'previous' | 'up' | 'down' | 'left' | 'right'

/**
 * Focus trap mode
 */
export type FocusTrapMode = 'soft' | 'hard'

// =============================================================================
// Input State Types
// =============================================================================

/**
 * Combined input state
 */
export interface InputState {
  readonly mouse: {
    readonly position: { x: number; y: number }
    readonly buttons: Set<MouseButton>
  }
  readonly keyboard: {
    readonly pressedKeys: Set<string>
    readonly modifiers: {
      shift: boolean
      ctrl: boolean
      alt: boolean
      meta: boolean
    }
  }
  readonly focus: {
    readonly currentId: string | null
    readonly trapStack: ReadonlyArray<string>
  }
}

// =============================================================================
// Re-exports from sub-modules
// =============================================================================

export type { FocusableComponent } from './focus/manager'
export type { ComponentBounds, HitTestResult, MouseRegion } from './mouse/hitTest'
export type { ComponentMouseHandler, MouseRoutingResult } from './mouse/router'
