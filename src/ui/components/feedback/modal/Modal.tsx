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
import type { View, Cmd, AppServices, KeyEvent, MouseEvent } from "../../../core/types"
import { style, Colors, Borders, type Style } from "../../../styling/index"
import { stringWidth } from "../../../utils/string-width"
import { Box, BoxProps } from "../../layout/box/Box"
import { Text } from "../../display/text/Text"
import { Button } from "../../forms/button/Button"
import { Flex } from "../../layout/flex/Flex"
import { Spinner } from "../spinner/Spinner"
import { vstack, hstack } from "../../../core/view"

// =============================================================================
// Types
// =============================================================================

export interface ModalProps {
  readonly title?: string
  readonly width?: number
  readonly height?: number
  readonly showCloseButton?: boolean
  readonly closeOnEscape?: boolean
  readonly closeOnBackdrop?: boolean
  readonly backdropStyle?: Style
  readonly modalStyle?: Style
  readonly titleStyle?: Style
  readonly isOpen?: boolean
  readonly onClose?: () => void
  readonly onConfirm?: () => void
  readonly onCancel?: () => void
  readonly children?: View[]
}

export interface ModalModel {
  readonly props: ModalProps
  readonly terminalWidth: number
  readonly terminalHeight: number
  readonly focusedButton: number
}

export type ModalMsg =
  | { readonly _tag: "SetTerminalSize"; readonly width: number; readonly height: number }
  | { readonly _tag: "FocusNext" }
  | { readonly _tag: "FocusPrevious" }
  | { readonly _tag: "Activate" }
  | { readonly _tag: "BackdropClick" }
  | { readonly _tag: "Close" }

// =============================================================================
// Default Configurations
// =============================================================================

const defaultProps: Partial<ModalProps> = {
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
// Helper Components
// =============================================================================

const Backdrop = ({ width, height, style: backdropStyle }: { width: number, height: number, style: Style }) => {
  const backdropLine = '▓'.repeat(width)
  const lines: View[] = []
  
  for (let i = 0; i < height; i++) {
    lines.push(<Text style={backdropStyle}>{backdropLine}</Text>)
  }
  
  return vstack(...lines)
}

const ModalContent = ({ 
  model, 
  children 
}: { 
  model: ModalModel, 
  children: View[] 
}) => {
  const { props } = model
  const actualWidth = props.width ?? defaultProps.width ?? 60
  const actualHeight = props.height ?? defaultProps.height ?? 20
  
  const titleStyle = props.titleStyle ?? defaultProps.titleStyle ?? style()
  const modalStyle = props.modalStyle ?? defaultProps.modalStyle ?? style()
  
  // Create header with title and optional close button
  const header: View[] = []
  
  if (props.title) {
    if (props.showCloseButton) {
      const spacerWidth = Math.max(0, actualWidth - stringWidth(props.title) - 3)
      header.push(
        <Flex direction="horizontal">
          <Text style={titleStyle}>{props.title}</Text>
          <Text>{" ".repeat(spacerWidth)}</Text>
          <Text style={style().foreground(Colors.red).bold()}>[×]</Text>
        </Flex>
      )
    } else {
      header.push(<Text style={titleStyle}>{props.title}</Text>)
    }
    header.push(<Text>{""}</Text>) // Spacing
  }
  
  // Combine header and content
  const allContent = [...header, ...children]
  
  // Create the modal box
  const boxProps: BoxProps = {
    border: Borders.Rounded,
    padding: { top: 1, right: 2, bottom: 1, left: 2 },
    width: actualWidth,
    height: actualHeight,
    style: modalStyle
  }
  
  return (
    <Box {...boxProps}>
      {vstack(...allContent)}
    </Box>
  )
}

// =============================================================================
// Component
// =============================================================================

export const Modal = (props: ModalProps = {}): {
  init: Effect.Effect<[ModalModel, Cmd<ModalMsg>[]], never, AppServices>
  update: (msg: ModalMsg, model: ModalModel) => Effect.Effect<[ModalModel, Cmd<ModalMsg>[]], never, AppServices>
  view: (model: ModalModel) => View
  handleKey?: (key: KeyEvent, model: ModalModel) => ModalMsg | null
} => ({
  init: Effect.succeed([
    {
      props: { ...defaultProps, ...props },
      terminalWidth: 80,
      terminalHeight: 24,
      focusedButton: 0
    },
    []
  ]),
  
  update(msg: ModalMsg, model: ModalModel) {
    switch (msg._tag) {
      case "Close":
        if (model.props.onClose) {
          model.props.onClose()
        }
        return Effect.succeed([model, []])
      
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
            focusedButton: (model.focusedButton + 1) % 2 // Assuming max 2 buttons
          },
          []
        ])
      
      case "FocusPrevious":
        return Effect.succeed([
          {
            ...model,
            focusedButton: model.focusedButton === 0 ? 1 : 0
          },
          []
        ])
      
      case "Activate":
        // Handle activation of focused element
        if (model.props.onConfirm && model.focusedButton === 0) {
          model.props.onConfirm()
        } else if (model.props.onCancel && model.focusedButton === 1) {
          model.props.onCancel()
        }
        return Effect.succeed([model, []])
      
      case "BackdropClick":
        if (model.props.closeOnBackdrop && model.props.onClose) {
          model.props.onClose()
        }
        return Effect.succeed([model, []])
    }
  },
  
  view(model: ModalModel): View {
    if (!model.props.isOpen) {
      return <Text>{""}</Text> // Empty view when modal is closed
    }
    
    const backdropStyle = model.props.backdropStyle ?? defaultProps.backdropStyle ?? style()
    const modalWidth = model.props.width ?? defaultProps.width ?? 60
    const modalHeight = model.props.height ?? defaultProps.height ?? 20
    
    // Calculate position
    const x = Math.max(0, Math.floor((model.terminalWidth - modalWidth) / 2))
    const y = Math.max(0, Math.floor((model.terminalHeight - modalHeight) / 2))
    
    // Create backdrop
    const backdrop = <Backdrop 
      width={model.terminalWidth} 
      height={model.terminalHeight} 
      style={backdropStyle} 
    />
    
    // Create modal content
    const modalContent = (
      <ModalContent model={model}>
        {model.props.children || []}
      </ModalContent>
    )
    
    // For now, we'll render the modal without true overlay positioning
    // In a real implementation, we'd need absolute positioning support
    return vstack(
      backdrop,
      modalContent
    )
  },
  
  handleKey(key: KeyEvent, model: ModalModel): ModalMsg | null {
    if (!model.props.isOpen) {
      return null
    }
    
    switch (key.key) {
      case 'escape':
        if (model.props.closeOnEscape) {
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
// Modal Presets
// =============================================================================

export const InfoModal = ({ 
  title, 
  message,
  ...props 
}: { 
  title: string
  message: string 
} & Partial<ModalProps>) => {
  const width = Math.max(40, stringWidth(message) + 8)
  
  return Modal({
    title,
    width,
    height: 12,
    showCloseButton: true,
    ...props,
    children: [
      <Text>{""}</Text>,
      <Text style={style().foreground(Colors.black)}>{message}</Text>,
      <Text>{""}</Text>,
      <Text style={style().foreground(Colors.gray)}>Press Escape or click [×] to close</Text>
    ]
  })
}

export const ConfirmModal = ({ 
  title, 
  message,
  onConfirm,
  onCancel,
  ...props 
}: { 
  title: string
  message: string
  onConfirm: () => void
  onCancel?: () => void
} & Partial<ModalProps>) => {
  const width = Math.max(50, stringWidth(message) + 8)
  
  const buttonRow = (
    <Flex direction="horizontal" gap={3} justify="center">
      <Button 
        label="Yes" 
        style={style().background(Colors.green).foreground(Colors.white).bold()}
        onPress={onConfirm}
      />
      <Button 
        label="No" 
        style={style().background(Colors.red).foreground(Colors.white).bold()}
        onPress={onCancel || (() => {})}
      />
    </Flex>
  )
  
  return Modal({
    title,
    width,
    height: 15,
    showCloseButton: false,
    closeOnBackdrop: false,
    ...props,
    children: [
      <Text>{""}</Text>,
      <Text style={style().foreground(Colors.black)}>{message}</Text>,
      <Text>{""}</Text>,
      <Text>{""}</Text>,
      buttonRow,
      <Text>{""}</Text>,
      <Text style={style().foreground(Colors.gray)}>Use Tab to navigate, Enter to select</Text>
    ]
  })
}

export const LoadingModal = ({ 
  title, 
  message,
  ...props 
}: { 
  title: string
  message: string
} & Partial<ModalProps>) => {
  const width = Math.max(40, stringWidth(message) + 8)
  
  return Modal({
    title,
    width,
    height: 10,
    showCloseButton: false,
    closeOnEscape: false,
    closeOnBackdrop: false,
    ...props,
    children: [
      <Text>{""}</Text>,
      <Flex direction="horizontal" gap={1}>
        <Text>{"  "}</Text>
        <Spinner size="small" style={style().foreground(Colors.blue).bold()} />
        <Text>{" "}</Text>
        <Text style={style().foreground(Colors.black)}>{message}</Text>
      </Flex>,
      <Text>{""}</Text>
    ]
  })
}

export const ErrorModal = ({ 
  title, 
  error,
  ...props 
}: { 
  title: string
  error: string
} & Partial<ModalProps>) => {
  const width = Math.max(50, stringWidth(error) + 8)
  
  return Modal({
    title,
    width,
    height: 12,
    showCloseButton: true,
    titleStyle: style().foreground(Colors.red).bold(),
    ...props,
    children: [
      <Text>{""}</Text>,
      <Text style={style().foreground(Colors.red)}>⚠ {error}</Text>,
      <Text>{""}</Text>,
      <Text style={style().foreground(Colors.gray)}>Press Escape to close</Text>
    ]
  })
}