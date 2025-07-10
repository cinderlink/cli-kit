/**
 * Panel Builder Functions
 * 
 * Simplified API for creating Panel components
 */

import { Colors, style } from "../../styling/index"
import { Borders } from "../../styling/borders"
import { styledBox } from "../../layout/box"
import { vstack, hstack, text, styledText } from "../../core/view"
import type { View } from "../../core/types"
import type { BorderStyle } from "../../styling/types"
import type { StyleProps } from "../../styling/types"

export interface PanelOptions {
  title?: string
  border?: BorderStyle
  padding?: number | { top?: number; right?: number; bottom?: number; left?: number }
  style?: StyleProps
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
    border = Borders.Rounded,
    padding = 1,
    style: panelStyle = style().foreground(Colors.white),
    className,
    width,
    height,
    collapsible = false,
    collapsed = false
  } = options

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
 * Create a header panel (prominent styling)
 */
export function HeaderPanel(content: View | View[], title?: string): View {
  return Panel(content, {
    title,
    border: Borders.Double,
    style: style().foreground(Colors.brightWhite).background(Colors.blue),
    padding: 2
  })
}

/**
 * Create an info panel (blue theme)
 */
export function InfoPanel(content: View | View[], title?: string): View {
  return Panel(content, {
    title,
    border: Borders.Rounded,
    style: style().foreground(Colors.brightBlue),
    padding: 1
  })
}

/**
 * Create a success panel (green theme)
 */
export function SuccessPanel(content: View | View[], title?: string): View {
  return Panel(content, {
    title,
    border: Borders.Rounded,
    style: style().foreground(Colors.brightGreen),
    padding: 1
  })
}

/**
 * Create a warning panel (yellow theme)
 */
export function WarningPanel(content: View | View[], title?: string): View {
  return Panel(content, {
    title,
    border: Borders.Rounded,
    style: style().foreground(Colors.brightYellow),
    padding: 1
  })
}

/**
 * Create an error panel (red theme)
 */
export function ErrorPanel(content: View | View[], title?: string): View {
  return Panel(content, {
    title,
    border: Borders.Rounded,
    style: style().foreground(Colors.brightRed),
    padding: 1
  })
}

/**
 * Create a card-like panel with subtle styling
 */
export function Card(content: View | View[], title?: string): View {
  return Panel(content, {
    title,
    border: Borders.Light,
    style: style().foreground(Colors.gray),
    padding: { top: 1, right: 2, bottom: 1, left: 2 }
  })
}

/**
 * Create a sidebar panel (narrow, tall)
 */
export function Sidebar(content: View | View[], options: Omit<PanelOptions, 'width'> = {}): View {
  return Panel(content, {
    ...options,
    width: 25,
    border: Borders.Light,
    style: style().foreground(Colors.cyan)
  })
}

/**
 * Create a status panel (for displaying status information)
 */
export function StatusPanel(
  status: string, 
  message?: string, 
  type: 'info' | 'success' | 'warning' | 'error' = 'info'
): View {
  const statusColor = {
    info: Colors.brightBlue,
    success: Colors.brightGreen,
    warning: Colors.brightYellow,
    error: Colors.brightRed
  }[type]

  const content = message 
    ? vstack(
        styledText(status, style().foreground(statusColor).bold()),
        text(message)
      )
    : styledText(status, style().foreground(statusColor).bold())

  return Panel(content, {
    border: Borders.Light,
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

/**
 * Create a panel with a border that matches the terminal theme
 */
export function ThemedPanel(content: View | View[], options: PanelOptions = {}): View {
  // In a real implementation, this would detect the terminal theme
  // For now, we'll use a sensible default
  return Panel(content, {
    ...options,
    border: Borders.Rounded,
    style: style().foreground(Colors.white)
  })
}

/**
 * Create a floating panel (with shadow effect)
 */
export function FloatingPanel(content: View | View[], title?: string): View {
  // Add some visual depth with padding and styling
  return Panel(
    Panel(content, {
      title,
      border: Borders.Light,
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