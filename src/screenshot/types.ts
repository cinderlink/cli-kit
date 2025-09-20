/**
 * TUIX Screenshot System Types
 * 
 * Defines the screenshot format (.cks) that captures both visual output
 * and component structure for perfect reproduction
 */

import type { View } from "@/core/types.ts"
import type { Style } from "@/styling/types.ts"

/**
 * TUIX Screenshot format (.cks)
 * Human-readable format that can be re-inflated into pixel-perfect views
 */
export interface TuixScreenshot {
  // Metadata
  readonly metadata: {
    readonly version: string           // TUIX version
    readonly timestamp: string         // ISO timestamp
    readonly name: string             // Screenshot name
    readonly description?: string     // Optional description
    readonly app?: string            // Source app name
    readonly dimensions: {
      readonly width: number
      readonly height: number
    }
  }
  
  // Visual representation (human-readable)
  readonly visual: {
    readonly lines: string[]         // Terminal output lines
    readonly styles: StyleMap[]      // Style information per line
  }
  
  // Component tree (for reconstruction)
  readonly components: ComponentSnapshot
  
  // Raw terminal codes (optional, for exact reproduction)
  readonly raw?: {
    readonly ansiCodes: string      // Full ANSI sequence
  }
}

/**
 * Style information for a line of text
 */
export interface StyleMap {
  readonly line: number
  readonly segments: Array<{
    readonly start: number          // Column start
    readonly end: number           // Column end
    readonly style?: {
      readonly foreground?: string // Color as hex or name
      readonly background?: string
      readonly bold?: boolean
      readonly italic?: boolean
      readonly underline?: boolean
    }
  }>
}

/**
 * Component tree snapshot
 */
export interface ComponentSnapshot {
  readonly type: 'text' | 'styledText' | 'box' | 'hstack' | 'vstack' | 'spacer' | 'custom'
  readonly props?: Record<string, any>
  readonly children?: ComponentSnapshot[]
  readonly content?: string
}

/**
 * Screenshot capture options
 */
export interface ScreenshotOptions {
  readonly name: string
  readonly description?: string
  readonly includeRaw?: boolean      // Include raw ANSI codes
  readonly prettify?: boolean        // Format for readability
}
