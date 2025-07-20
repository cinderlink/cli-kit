/**
 * Modal/Dialog Component - Overlay dialogs with backdrop
 * 
 * Features:
 * - Modal overlay with backdrop
 * - Centered content positioning
 * - Keyboard handling (Escape to close)
 * - Focus trapping within modal
 * - Configurable backdrop and border styles
 * - Optional close button
 * - Confirmation dialogs
 */

import { Effect } from "effect"
import type { View, Cmd, AppServices, KeyEvent, MouseEvent } from "@tuix/core"
import { View as ViewUtils, stringWidth } from "@tuix/core"
import { style, Colors, Borders, type Style } from "@tuix/styling"
import { styledBox } from "@tuix/layout"

const { text, vstack, hstack, styledText } = ViewUtils

// =============================================================================
// Types
// =============================================================================

export interface ModalConfig {
  readonly title?: string
  readonly width?: number
  readonly height?: number
  readonly showCloseButton?: boolean
  readonly closeOnEscape?: boolean
  readonly closeOnBackdrop?: boolean
  readonly backdropStyle?: Style
  readonly modalStyle?: Style
  readonly titleStyle?: Style
}

export interface ModalModel {
  readonly config: ModalConfig
  readonly isOpen: boolean
  readonly content: View[]
  readonly terminalWidth: number
  readonly terminalHeight: number
  readonly focusedButton: number // For buttons within modal
}

export type ModalMsg =
  | { readonly _tag: "Open"; readonly content: View[] }
  | { readonly _tag: "Close" }
  | { readonly _tag: "SetContent"; readonly content: View[] }
  | { readonly _tag: "SetTerminalSize"; readonly width: number; readonly height: number }
  | { readonly _tag: "FocusNext" }
  | { readonly _tag: "FocusPrevious" }
  | { readonly _tag: "Activate" }
  | { readonly _tag: "BackdropClick" }

// =============================================================================
// Default Configurations
// =============================================================================

const defaultConfig: ModalConfig = {
  width: 60,
  height: 20,
  showCloseButton: true,
  closeOnEscape: true,
  closeOnBackdrop: true,
  backdropStyle: style().background(Colors.black).foreground(Colors.gray),
  modalStyle: style().background(Colors.white).foreground(Colors.black),
  titleStyle: style().foreground(Colors.blue).bold()
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Create backdrop overlay covering the terminal
 */
const createBackdrop = (
  terminalWidth: number,
  terminalHeight: number,
  backdropStyle: Style
): View[] => {
  const backdropLine = '▓'.repeat(terminalWidth)
  const lines: View[] = []
  
  for (let i = 0; i < terminalHeight; i++) {
    lines.push(styledText(backdropLine, backdropStyle))
  }
  
  return lines
}

/**
 * Calculate modal position for centering
 */
const calculateModalPosition = (
  modalWidth: number,
  modalHeight: number,
  terminalWidth: number,
  terminalHeight: number
): { x: number; y: number } => {
  const x = Math.max(0, Math.floor((terminalWidth - modalWidth) / 2))
  const y = Math.max(0, Math.floor((terminalHeight - modalHeight) / 2))
  return { x, y }
}

/**
 * Create centered content with proper spacing
 */
const createCenteredContent = (content: View, totalWidth: number): View => {
  // Calculate centering space - this is simplified for the TUI context
  const contentWidth = 15 // Approximate width of "Yes" + "No" buttons with spacing
  const leftPadding = Math.max(0, Math.floor((totalWidth - contentWidth) / 2))
  const paddingText = " ".repeat(leftPadding)
  
  return hstack(
    text(paddingText),
    content
  )
}

/**
 * Create modal content with title and close button
 */
const createModalContent = (
  model: ModalModel,
  content: View[]
): View => {
  const { config } = model
  const actualWidth = config.width ?? defaultConfig.width ?? 60
  const actualHeight = config.height ?? defaultConfig.height ?? 20
  
  const titleStyle = config.titleStyle ?? defaultConfig.titleStyle ?? style()
  const modalStyle = config.modalStyle ?? defaultConfig.modalStyle ?? style()
  
  // Create header with title and optional close button
  const header: View[] = []
  
  if (config.title) {
    if (config.showCloseButton) {
      header.push(
        hstack(
          styledText(config.title, titleStyle),
          text(" ".repeat(Math.max(0, actualWidth - stringWidth(config.title) - 3))),
          styledText("[×]", style().foreground(Colors.red).bold())
        )
      )
    } else {
      header.push(styledText(config.title, titleStyle))
    }
    header.push(text("")) // Spacing
  }
  
  // Combine header and content
  const allContent = [...header, ...content]
  
  // Create the modal box
  return styledBox(
    vstack(...allContent),
    {
      border: Borders.Rounded,
      padding: { top: 1, right: 2, bottom: 1, left: 2 },
      minWidth: actualWidth,
      minHeight: actualHeight,
      style: modalStyle
    }
  )
}

/**
 * Overlay modal on backdrop at calculated position
 */
const overlayModal = (
  backdrop: View[],
  modal: View,
  position: { x: number; y: number },
  terminalHeight: number
): View => {
  // This is a simplified overlay - in a real implementation,
  // we'd need more sophisticated positioning and clipping
  return vstack(
    ...backdrop.slice(0, position.y),
    modal,
    ...backdrop.slice(position.y + 1)
  )
}

// =============================================================================
// Component
// =============================================================================

export const modal = (config: Partial<ModalConfig> = {}): {
  init: Effect.Effect<[ModalModel, Cmd<ModalMsg>[]], never, AppServices>
  update: (msg: ModalMsg, model: ModalModel) => Effect.Effect<[ModalModel, Cmd<ModalMsg>[]], never, AppServices>
  view: (model: ModalModel) => View
  handleKey?: (key: KeyEvent, model: ModalModel) => ModalMsg | null
} => ({
  init: Effect.succeed([
    {
      config: { ...defaultConfig, ...config },
      isOpen: false,
      content: [],
      terminalWidth: 80,
      terminalHeight: 24,
      focusedButton: 0
    },
    []
  ]),
  
  update(msg: ModalMsg, model: ModalModel) {
    switch (msg._tag) {
      case "Open":
        return Effect.succeed([
          {
            ...model,
            isOpen: true,
            content: msg.content,
            focusedButton: 0
          },
          []
        ])
      
      case "Close":
        return Effect.succeed([
          {
            ...model,
            isOpen: false,
            content: [],
            focusedButton: 0
          },
          []
        ])
      
      case "SetContent":
        return Effect.succeed([
          {
            ...model,
            content: msg.content
          },
          []
        ])
      
      case "SetTerminalSize":
        return Effect.succeed([
          {
            ...model,
            terminalWidth: msg.width,
            terminalHeight: msg.height
          },
          []
        ])
      
      case "FocusNext":
        // Simple focus cycling for buttons within modal
        return Effect.succeed([
          {
            ...model,
            focusedButton: (model.focusedButton + 1) % Math.max(1, model.content.length)
          },
          []
        ])
      
      case "FocusPrevious":
        return Effect.succeed([
          {
            ...model,
            focusedButton: model.focusedButton === 0 
              ? Math.max(0, model.content.length - 1)
              : model.focusedButton - 1
          },
          []
        ])
      
      case "Activate":
        // Handle activation of focused element
        return Effect.succeed([model, []])
      
      case "BackdropClick":
        if (model.config.closeOnBackdrop) {
          return Effect.succeed([
            {
              ...model,
              isOpen: false,
              content: [],
              focusedButton: 0
            },
            []
          ])
        }
        return Effect.succeed([model, []])
    }
  },
  
  view(model: ModalModel): View {
    if (!model.isOpen) {
      return text("") // Empty view when modal is closed
    }
    
    const backdropStyle = model.config.backdropStyle ?? defaultConfig.backdropStyle ?? style()
    const modalWidth = model.config.width ?? defaultConfig.width ?? 60
    const modalHeight = model.config.height ?? defaultConfig.height ?? 20
    
    // Create backdrop
    const backdrop = createBackdrop(
      model.terminalWidth,
      model.terminalHeight,
      backdropStyle
    )
    
    // Create modal content
    const modalContent = createModalContent(model, model.content)
    
    // Calculate position
    const position = calculateModalPosition(
      modalWidth,
      modalHeight,
      model.terminalWidth,
      model.terminalHeight
    )
    
    // Overlay modal on backdrop
    return overlayModal(backdrop, modalContent, position, model.terminalHeight)
  },
  
  handleKey(key: KeyEvent, model: ModalModel): ModalMsg | null {
    if (!model.isOpen) {
      return null
    }
    
    switch (key.key) {
      case 'escape':
        if (model.config.closeOnEscape) {
          return { _tag: "Close" }
        }
        break
      case 'tab':
        if (key.shift) {
          return { _tag: "FocusPrevious" }
        } else {
          return { _tag: "FocusNext" }
        }
      case 'enter':
      case ' ':
        return { _tag: "Activate" }
    }
    
    return null
  }
})

// =============================================================================
// Helper Functions for Common Modal Types
// =============================================================================

/**
 * Create a simple information modal
 */
export const createInfoModal = (
  title: string,
  message: string,
  config?: Partial<ModalConfig>
): {
  component: ReturnType<typeof modal>
  openEffect: Effect.Effect<ModalMsg, never, never>
} => {
  const component = modal({
    title,
    width: Math.max(40, stringWidth(message) + 8),
    height: 12,
    showCloseButton: true,
    ...config
  })
  
  const content = [
    text(""),
    styledText(message, style().foreground(Colors.black)),
    text(""),
    styledText("Press Escape or click [×] to close", style().foreground(Colors.gray))
  ]
  
  const openEffect = Effect.succeed({ _tag: "Open" as const, content })
  
  return { component, openEffect }
}

/**
 * Create a confirmation modal with Yes/No buttons
 */
export const createConfirmModal = (
  title: string,
  message: string,
  onConfirm: () => void,
  onCancel?: () => void,
  config?: Partial<ModalConfig>
): {
  component: ReturnType<typeof modal>
  openEffect: Effect.Effect<ModalMsg, never, never>
} => {
  const component = modal({
    title,
    width: Math.max(50, stringWidth(message) + 8),
    height: 15,
    showCloseButton: false,
    closeOnBackdrop: false,
    ...config
  })
  
  const modalWidth = config?.width ?? 50
  
  const buttonRow = hstack(
    styledText(" Yes ", style().background(Colors.green).foreground(Colors.white).bold()),
    text("   "),
    styledText(" No ", style().background(Colors.red).foreground(Colors.white).bold())
  )
  
  const content = [
    text(""),
    styledText(message, style().foreground(Colors.black)),
    text(""),
    text(""),
    createCenteredContent(buttonRow, modalWidth),
    text(""),
    styledText("Use Tab to navigate, Enter to select", style().foreground(Colors.gray))
  ]
  
  const openEffect = Effect.succeed({ _tag: "Open" as const, content })
  
  return { component, openEffect }
}

/**
 * Create a loading modal with spinner
 */
export const createLoadingModal = (
  title: string,
  message: string,
  config?: Partial<ModalConfig>
): {
  component: ReturnType<typeof modal>
  openEffect: Effect.Effect<ModalMsg, never, never>
} => {
  const component = modal({
    title,
    width: Math.max(40, stringWidth(message) + 8),
    height: 10,
    showCloseButton: false,
    closeOnEscape: false,
    closeOnBackdrop: false,
    ...config
  })
  
  const content = [
    text(""),
    hstack(
      text("  "),
      styledText("⠋", style().foreground(Colors.blue).bold()), // Spinner character
      text(" "),
      styledText(message, style().foreground(Colors.black))
    ),
    text("")
  ]
  
  const openEffect = Effect.succeed({ _tag: "Open" as const, content })
  
  return { component, openEffect }
}

/**
 * Create an error modal
 */
export const createErrorModal = (
  title: string,
  error: string,
  config?: Partial<ModalConfig>
): {
  component: ReturnType<typeof modal>
  openEffect: Effect.Effect<ModalMsg, never, never>
} => {
  const component = modal({
    title,
    width: Math.max(50, stringWidth(error) + 8),
    height: 12,
    showCloseButton: true,
    titleStyle: style().foreground(Colors.red).bold(),
    ...config
  })
  
  const content = [
    text(""),
    styledText("⚠ " + error, style().foreground(Colors.red)),
    text(""),
    styledText("Press Escape to close", style().foreground(Colors.gray))
  ]
  
  const openEffect = Effect.succeed({ _tag: "Open" as const, content })
  
  return { component, openEffect }
}