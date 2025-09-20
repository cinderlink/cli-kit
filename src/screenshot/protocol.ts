/**
 * TUIX Screenshot Protocol
 * 
 * Allows TUIX apps to communicate with the screenshot tool
 * for enhanced capture capabilities
 */

import { Effect } from "effect"
import type { View } from "@/core/types.ts"
import type { ComponentSnapshot } from "./types.ts"

/**
 * Environment variable that indicates screenshot mode
 */
export const TUIX_SCREENSHOT_ENV = "TUIX_SCREENSHOT"
export const TUIX_SCREENSHOT_PIPE = "TUIX_SCREENSHOT_PIPE"
export const TUIX_SCREENSHOT_FORMAT = "TUIX_SCREENSHOT_FORMAT"

/**
 * Check if we're running in screenshot mode
 */
export function isScreenshotMode(): boolean {
  return process.env[TUIX_SCREENSHOT_ENV] === "true"
}

/**
 * Get screenshot configuration from environment
 */
export function getScreenshotConfig() {
  return {
    enabled: isScreenshotMode(),
    format: process.env[TUIX_SCREENSHOT_FORMAT] || "enhanced",
    pipePath: process.env[TUIX_SCREENSHOT_PIPE]
}
}

/**
 * Screenshot metadata that TUIX apps can provide
 */
export interface ScreenshotMetadata {
  readonly appName: string
  readonly appVersion: string
  readonly componentTree?: ComponentSnapshot
  readonly state?: Record<string, any>
  readonly dimensions?: { width: number; height: number }
  readonly features?: string[]
}

/**
 * Enhanced app wrapper that provides screenshot metadata
 */
export function screenshotAwareApp<Model, Msg>(
  component: any, // Component type
  config: any,    // AppOptions type
  metadata?: Partial<ScreenshotMetadata>
) {
  const screenshotConfig = getScreenshotConfig()
  
  if (!screenshotConfig.enabled) {
    // Normal execution
    return { component, config }
  }
  
  // Enhanced execution with metadata output
  return {
    component: {
      ...component,
      // Wrap the view function to emit metadata
      view: (model: Model) => {
        const view = component.view(model)
        
        // Emit metadata through a side channel
        if (screenshotConfig.pipePath) {
          emitScreenshotMetadata({
            ...metadata,
            state: model,
            componentTree: extractComponentTree(view)
          })
        }
        
        return view
      }
    },
    config: {
      ...config,
      // Add screenshot-specific config
      fps: 1, // Single frame for screenshot
      exitAfterRender: screenshotConfig.format === "static"
    }
  }
}

/**
 * Emit screenshot metadata through IPC or file
 */
function emitScreenshotMetadata(metadata: ScreenshotMetadata): void {
  const config = getScreenshotConfig()
  
  if (config.pipePath) {
    // Write to named pipe or file
    try {
      const fs = require('fs')
      fs.writeFileSync(
        config.pipePath,
        JSON.stringify({
          type: "screenshot-metadata",
          timestamp: Date.now(),
          metadata
        }) + '\n',
        { flag: 'a' }
      )
    } catch (error) {
      // Fail silently in screenshot mode
    }
  }
}

/**
 * Component tree extractor (reused from capture.ts)
 */
function extractComponentTree(view: View): ComponentSnapshot {
  const viewAny = view as any
  
  if (viewAny._tag === 'Text') {
    return {
      type: 'text',
      content: viewAny.content
    }
  } else if (viewAny._tag === 'StyledText') {
    return {
      type: 'styledText',
      content: viewAny.content,
      props: {
        style: serializeStyle(viewAny.style)
      }
    }
  } else if (viewAny._tag === 'HStack') {
    return {
      type: 'hstack',
      children: viewAny.children.map(extractComponentTree)
    }
  } else if (viewAny._tag === 'VStack') {
    return {
      type: 'vstack',
      children: viewAny.children.map(extractComponentTree)
    }
  } else if (viewAny._tag === 'Box') {
    return {
      type: 'box',
      props: {
        border: viewAny.border,
        style: viewAny.style ? serializeStyle(viewAny.style) : undefined
      },
      children: viewAny.child ? [extractComponentTree(viewAny.child)] : []
    }
  } else if (viewAny._tag === 'Spacer') {
    return {
      type: 'spacer',
      props: {
        size: viewAny.size
      }
    }
  } else {
    return {
      type: 'custom',
      props: {
        _tag: viewAny._tag,
        ...viewAny
      }
    }
  }
}

/**
 * Serialize style for metadata
 */
function serializeStyle(style: any): any {
  // Extract style properties that can be serialized
  return {
    foreground: style.foreground?._tag === 'RGB' 
      ? `rgb(${style.foreground.r},${style.foreground.g},${style.foreground.b})`
      : style.foreground,
    background: style.background?._tag === 'RGB'
      ? `rgb(${style.background.r},${style.background.g},${style.background.b})`
      : style.background,
    bold: style.bold,
    italic: style.italic,
    underline: style.underline
  }
}

/**
 * Helper to add screenshot capabilities to an app
 */
export function withScreenshot<Model, Msg>(
  metadata: Partial<ScreenshotMetadata> = {}
) {
  return (component: any, config: any) => {
    return screenshotAwareApp(component, config, metadata)
  }
}
