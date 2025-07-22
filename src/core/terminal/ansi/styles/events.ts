/**
 * Styling Event System
 * 
 * Defines events for style application, theme management, and
 * layout computation in the terminal UI.
 */

import type { BaseEvent } from '../../../model/events/event-bus'

/**
 * Computed styles structure
 */
export interface ComputedStyles {
  readonly foreground?: string
  readonly background?: string
  readonly bold?: boolean
  readonly italic?: boolean
  readonly underline?: boolean
  readonly padding?: number
  readonly margin?: number
  readonly border?: boolean
}

/**
 * Layout information
 */
export interface LayoutInfo {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
  readonly visible: boolean
  readonly zIndex?: number
}

/**
 * Theme configuration
 */
export interface ThemeConfig {
  readonly name: string
  readonly colors: {
    readonly primary: string
    readonly secondary: string
    readonly background: string
    readonly foreground: string
    readonly error: string
    readonly warning: string
    readonly success: string
    readonly info: string
  }
  readonly typography?: {
    readonly fontFamily?: string
    readonly fontSize?: number
  }
}

/**
 * Style events
 */
export interface StyleEvent extends BaseEvent {
  readonly type: 'style-applied' | 'theme-changed' | 'layout-computed'
  readonly component?: string
  readonly styles?: ComputedStyles
  readonly theme?: ThemeConfig
  readonly layout?: LayoutInfo
}

/**
 * Theme events
 */
export interface ThemeEvent extends BaseEvent {
  readonly type: 'theme-loaded' | 'theme-switched' | 'theme-customized'
  readonly themeName: string
  readonly themeConfig: ThemeConfig
  readonly previousTheme?: string
}

/**
 * Layout events
 */
export interface LayoutEvent extends BaseEvent {
  readonly type: 'layout-invalidated' | 'layout-updated' | 'layout-error'
  readonly component: string
  readonly reason?: 'resize' | 'style-change' | 'hierarchy-change'
  readonly error?: Error
}

/**
 * Animation events
 */
export interface AnimationEvent extends BaseEvent {
  readonly type: 'animation-started' | 'animation-completed' | 'animation-cancelled'
  readonly animationId: string
  readonly component: string
  readonly duration?: number
  readonly properties?: string[]
}

/**
 * All styling event types
 */
export type StylingEvent = 
  | StyleEvent
  | ThemeEvent
  | LayoutEvent
  | AnimationEvent

/**
 * Styling event channel names
 */
export const StylingEventChannels = {
  STYLE: 'style-events',
  THEME: 'theme-events',
  LAYOUT: 'layout-events',
  ANIMATION: 'animation-events'
} as const

export type StylingEventChannel = typeof StylingEventChannels[keyof typeof StylingEventChannels]