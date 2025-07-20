/**
 * Built-in Components - Essential UI components demonstrating the component system
 * 
 * @module components/builtin
 */

import { Effect } from "effect"
import { BaseComponent } from "../base/index"
import type { ComponentError } from "../base/errors"

/**
 * Text component props
 */
export interface TextProps {
  children?: string
  style?: string
}

/**
 * Text component state
 */
export interface TextState {
  content: string
}

/**
 * Text component for displaying text content
 */
export class Text extends BaseComponent<TextProps, TextState> {
  init(props: TextProps): Effect.Effect<TextState, ComponentError, never> {
    return Effect.succeed({
      content: props.children || ''
    })
  }

  render(props: TextProps, state: TextState): JSX.Element {
    return { type: 'span', props: { className: props.style, children: state.content } } as JSX.Element
  }
}

/**
 * Box component props
 */
export interface BoxProps {
  children?: JSX.Element | JSX.Element[]
  style?: string
  minWidth?: number
  vertical?: boolean
  horizontal?: boolean
  gap?: number
}

/**
 * Box component state
 */
export interface BoxState {
  width: number
  height: number
}

/**
 * Box component for layout and container functionality
 */
export class Box extends BaseComponent<BoxProps, BoxState> {
  init(props: BoxProps): Effect.Effect<BoxState, ComponentError, never> {
    return Effect.succeed({
      width: props.minWidth || 0,
      height: 0
    })
  }

  render(props: BoxProps, state: BoxState): JSX.Element {
    const className = [
      props.style,
      props.vertical ? 'vertical' : '',
      props.horizontal ? 'horizontal' : ''
    ].filter(Boolean).join(' ')

    return {
      type: 'div',
      props: {
        className,
        style: { minWidth: props.minWidth, gap: props.gap },
        children: props.children
      }
    } as JSX.Element
  }
}

/**
 * Button component props
 */
export interface ButtonProps {
  label: string
  onClick?: () => void
  disabled?: boolean
  variant?: 'default' | 'primary' | 'secondary'
}

/**
 * Button component state
 */
export interface ButtonState {
  pressed: boolean
  focused: boolean
}

/**
 * Button component for interactive actions
 */
export class Button extends BaseComponent<ButtonProps, ButtonState> {
  init(props: ButtonProps): Effect.Effect<ButtonState, ComponentError, never> {
    return Effect.succeed({
      pressed: false,
      focused: false
    })
  }

  render(props: ButtonProps, state: ButtonState): JSX.Element {
    const className = [
      'button',
      props.variant || 'default',
      state.focused ? 'focused' : '',
      state.pressed ? 'pressed' : '',
      props.disabled ? 'disabled' : ''
    ].filter(Boolean).join(' ')

    return {
      type: 'button',
      props: {
        className,
        onClick: props.onClick,
        disabled: props.disabled,
        children: props.label
      }
    } as JSX.Element
  }
}

/**
 * Export all built-in components
 */
export const BuiltinComponents = {
  Text,
  Box,
  Button
}

/**
 * Register all built-in components
 */
export function registerBuiltinComponents(registry: any): void {
  registry.register({
    name: 'Text',
    component: Text,
    metadata: {
      description: 'Text display component',
      version: '1.0.0'
    }
  })

  registry.register({
    name: 'Box',
    component: Box,
    metadata: {
      description: 'Layout container component',
      version: '1.0.0'
    }
  })

  registry.register({
    name: 'Button',
    component: Button,
    metadata: {
      description: 'Interactive button component',
      version: '1.0.0'
    }
  })
}