/**
 * Panel Builder Functions
 * 
 * Simplified API for creating Panel components
 */

import { Colors, style } from "@tuix/styling"
import { Borders } from "@tuix/styling"
import { styledBox } from "@tuix/layout"
import { View as ViewUtils } from "@tuix/core"
import type { View } from "@tuix/core"
import { Style } from "@tuix/styling"

const { vstack, hstack, text, styledText } = ViewUtils

/**
 * Map border string names to Border objects
 */
function mapBorderString(borderName: string) {
  switch (borderName) {
    case 'single':
    case 'normal':
      return Borders.Normal
    case 'rounded':
      return Borders.Rounded
    case 'double':
      return Borders.Double
    case 'thick':
      return Borders.Thick
    case 'none':
      return Borders.None
    default:
      return Borders.Rounded // fallback
  }
}

export interface PanelOptions {
  title?: string
  border?: string | any // Allow both string and Border object
  padding?: number | { top?: number; right?: number; bottom?: number; left?: number }
  style?: Style
  className?: string
  width?: number
  height?: number
  collapsible?: boolean
  collapsed?: boolean
}

/**
 * Create a simple panel with content
 */
export function Panel(content: View | View[], options: PanelOptions = {}): View {
  const {
    title,
    border: borderOption = Borders.Rounded,
    padding = 1,
    style: panelStyle = style().foreground(Colors.white),
    className,
    width,
    height,
    collapsible = false,
    collapsed = false
  } = options

  // Map string border names to Border objects
  const border = typeof borderOption === 'string' ? mapBorderString(borderOption) : borderOption

  // Normalize padding
  const normalizedPadding = typeof padding === 'number' 
    ? { top: padding, right: padding, bottom: padding, left: padding }
    : { top: 0, right: 0, bottom: 0, left: 0, ...padding }

  // Build panel content
  let panelContent: View

  if (Array.isArray(content)) {
    panelContent = vstack(...content)
  } else {
    panelContent = content
  }

  // Add title if provided
  if (title) {
    const titleView = styledText(
      title,
      style().foreground(Colors.brightCyan).bold()
    )
    
    if (collapsed) {
      panelContent = titleView
    } else {
      panelContent = vstack(
        titleView,
        text(""),
        panelContent
      )
    }
  }

  // Apply panel styling
  return styledBox(panelContent, {
    border,
    padding: normalizedPadding,
    style: panelStyle,
    minWidth: width,
    minHeight: height
  })
}

/**
 * Panel variant configurations
 */
const PANEL_VARIANTS = {
  header: {
    border: Borders.Double,
    style: style().foreground(Colors.brightWhite).background(Colors.blue),
    padding: 2
  },
  info: {
    border: Borders.Rounded,
    style: style().foreground(Colors.brightBlue),
    padding: 1
  },
  success: {
    border: Borders.Rounded,
    style: style().foreground(Colors.brightGreen),
    padding: 1
  },
  warning: {
    border: Borders.Rounded,
    style: style().foreground(Colors.brightYellow),
    padding: 1
  },
  error: {
    border: Borders.Rounded,
    style: style().foreground(Colors.brightRed),
    padding: 1
  }
} as const

/**
 * Panel variant factory - creates a function for a specific variant
 */
const createVariantPanel = (variant: keyof typeof PANEL_VARIANTS) => 
  (content: View | View[], title?: string): View => 
    Panel(content, { title, ...PANEL_VARIANTS[variant] })

/**
 * Pre-configured variant panels
 */
export const HeaderPanel = createVariantPanel('header')
export const InfoPanel = createVariantPanel('info')
export const SuccessPanel = createVariantPanel('success')
export const WarningPanel = createVariantPanel('warning')
export const ErrorPanel = createVariantPanel('error')

/**
 * Pre-configured specialized panels
 */
export const Card = (content: View | View[], title?: string): View => 
  Panel(content, {
    title,
    border: Borders.Normal,
    style: style().foreground(Colors.gray),
    padding: { top: 1, right: 2, bottom: 1, left: 2 }
  })

export const Sidebar = (content: View | View[], options: Omit<PanelOptions, 'width'> = {}): View => 
  Panel(content, {
    ...options,
    width: 25,
    border: Borders.Normal,
    style: style().foreground(Colors.cyan)
  })

/**
 * Status color mapping
 */
const STATUS_COLORS = {
  info: Colors.brightBlue,
  success: Colors.brightGreen,
  warning: Colors.brightYellow,
  error: Colors.brightRed
} as const

/**
 * Create a status panel (for displaying status information)
 */
export function StatusPanel(
  status: string, 
  message?: string, 
  type: keyof typeof STATUS_COLORS = 'info'
): View {
  const statusColor = STATUS_COLORS[type]

  const content = message 
    ? vstack(
        styledText(status, style().foreground(statusColor).bold()),
        text(message)
      )
    : styledText(status, style().foreground(statusColor).bold())

  return Panel(content, {
    border: Borders.Normal,
    style: style().foreground(Colors.white),
    padding: 1
  })
}

/**
 * Create a collapsible panel
 */
export function CollapsiblePanel(
  content: View | View[], 
  title: string,
  collapsed: boolean = false
): View {
  const toggleIndicator = collapsed ? "▶" : "▼"
  const fullTitle = `${toggleIndicator} ${title}`
  
  return Panel(content, {
    title: fullTitle,
    collapsible: true,
    collapsed
  })
}

export const ThemedPanel = (content: View | View[], options: PanelOptions = {}): View => 
  Panel(content, {
    ...options,
    border: Borders.Rounded,
    style: style().foreground(Colors.white)
  })

/**
 * Create a floating panel (with shadow effect)
 */
export function FloatingPanel(content: View | View[], title?: string): View {
  // Add some visual depth with padding and styling
  return Panel(
    Panel(content, {
      title,
      border: Borders.Normal,
      padding: 1
    }),
    {
      border: Borders.None,
      padding: 1,
      style: style().foreground(Colors.gray)
    }
  )
}

// Export aliases for compatibility
export const panel = Panel
export type PanelBuilder = typeof Panel