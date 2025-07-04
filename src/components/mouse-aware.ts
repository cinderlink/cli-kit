/**
 * Mouse-Aware Component Wrapper
 * 
 * This module provides utilities to make components mouse-aware by automatically
 * registering their bounds and handling mouse events.
 */

import { Effect, Option, pipe } from "effect"
import type { Component, View, Cmd, AppServices, MouseEvent } from "@/core/types.ts"
import { MouseRouterService } from "@/services/mouse-router.ts"
import { type ComponentBounds, createBounds } from "@/services/hit-test.ts"
import { text, vstack } from "@/core/view.ts"
import { style } from "@/styling/index.ts"

// =============================================================================
// Types
// =============================================================================

/**
 * Mouse-aware component configuration
 */
export interface MouseAwareConfig<Model, Msg> {
  readonly componentId: string
  readonly getBounds: (model: Model) => { x: number; y: number; width: number; height: number }
  readonly handleMouse: (event: MouseEvent, localX: number, localY: number, model: Model) => Msg | null
  readonly zIndex?: number
}

/**
 * Enhanced model that tracks mouse state
 */
export interface MouseAwareModel<Model> {
  readonly inner: Model
  readonly mouseState: {
    readonly isHovered: boolean
    readonly isPressed: boolean
    readonly lastX: number
    readonly lastY: number
  }
}

/**
 * Mouse-aware messages
 */
export type MouseAwareMsg<Msg> =
  | { readonly _tag: "InnerMsg"; readonly msg: Msg }
  | { readonly _tag: "MouseEnter" }
  | { readonly _tag: "MouseLeave" }
  | { readonly _tag: "MousePress"; readonly x: number; readonly y: number }
  | { readonly _tag: "MouseRelease"; readonly x: number; readonly y: number }
  | { readonly _tag: "MouseMove"; readonly x: number; readonly y: number }

// =============================================================================
// Mouse-Aware Component Wrapper
// =============================================================================

/**
 * Create a mouse-aware component from a regular component
 */
export const makeMouseAware = <Model, Msg>(
  component: Component<Model, Msg>,
  config: MouseAwareConfig<Model, Msg>
): Component<MouseAwareModel<Model>, MouseAwareMsg<Msg>> => ({
  init: Effect.gen(function* (_) {
    const [innerModel, innerCmds] = yield* _(component.init)
    
    const model: MouseAwareModel<Model> = {
      inner: innerModel,
      mouseState: {
        isHovered: false,
        isPressed: false,
        lastX: 0,
        lastY: 0
      }
    }
    
    // Register component bounds
    const mouseRouter = yield* _(MouseRouterService)
    const bounds = config.getBounds(innerModel)
    yield* _(mouseRouter.registerComponent(
      config.componentId,
      createBounds(
        config.componentId,
        bounds.x,
        bounds.y,
        bounds.width,
        bounds.height,
        config.zIndex || 0
      ),
      (event, localX, localY) => {
        // Convert mouse events to our messages
        switch (event.type) {
          case 'press':
            return { _tag: "MousePress", x: localX, y: localY } as MouseAwareMsg<Msg>
          case 'release':
            return { _tag: "MouseRelease", x: localX, y: localY } as MouseAwareMsg<Msg>
          case 'motion':
            // Check if entering/leaving
            const wasHovered = model.mouseState.isHovered
            const isNowHovered = localX >= 0 && localY >= 0 && 
                               localX < bounds.width && localY < bounds.height
            
            if (!wasHovered && isNowHovered) {
              return { _tag: "MouseEnter" } as MouseAwareMsg<Msg>
            } else if (wasHovered && !isNowHovered) {
              return { _tag: "MouseLeave" } as MouseAwareMsg<Msg>
            } else {
              return { _tag: "MouseMove", x: localX, y: localY } as MouseAwareMsg<Msg>
            }
          default:
            return null
        }
      }
    ))
    
    // Wrap inner commands
    const wrappedCmds = innerCmds.map(cmd =>
      cmd.pipe(Effect.map(msg => ({ _tag: "InnerMsg" as const, msg })))
    )
    
    return [model, wrappedCmds]
  }),
  
  update(msg: MouseAwareMsg<Msg>, model: MouseAwareModel<Model>) {
    switch (msg._tag) {
      case "InnerMsg": {
        return Effect.gen(function* (_) {
          const [newInner, innerCmds] = yield* _(component.update(msg.msg, model.inner))
          
          // Update bounds if model changed
          const mouseRouter = yield* _(MouseRouterService)
          const newBounds = config.getBounds(newInner)
          yield* _(mouseRouter.updateComponentBounds(
            config.componentId,
            createBounds(
              config.componentId,
              newBounds.x,
              newBounds.y,
              newBounds.width,
              newBounds.height,
              config.zIndex || 0
            )
          ))
          
          const wrappedCmds = innerCmds.map(cmd =>
            cmd.pipe(Effect.map(innerMsg => ({ _tag: "InnerMsg" as const, msg: innerMsg })))
          )
          
          return [{ ...model, inner: newInner }, wrappedCmds]
        })
      }
      
      case "MouseEnter": {
        const newModel = {
          ...model,
          mouseState: { ...model.mouseState, isHovered: true }
        }
        
        // Check if inner component wants this event
        const innerMsg = config.handleMouse(
          { type: 'motion', button: 'none', x: 0, y: 0, ctrl: false, alt: false, shift: false },
          model.mouseState.lastX,
          model.mouseState.lastY,
          model.inner
        )
        
        if (innerMsg) {
          return Effect.map(
            component.update(innerMsg, model.inner),
            ([newInner, cmds]) => [
              { ...newModel, inner: newInner },
              cmds.map(cmd => cmd.pipe(Effect.map(msg => ({ _tag: "InnerMsg" as const, msg }))))
            ]
          )
        }
        
        return Effect.succeed([newModel, []])
      }
      
      case "MouseLeave": {
        return Effect.succeed([
          {
            ...model,
            mouseState: { ...model.mouseState, isHovered: false, isPressed: false }
          },
          []
        ])
      }
      
      case "MousePress": {
        const newModel = {
          ...model,
          mouseState: {
            ...model.mouseState,
            isPressed: true,
            lastX: msg.x,
            lastY: msg.y
          }
        }
        
        const innerMsg = config.handleMouse(
          { type: 'press', button: 'left', x: msg.x, y: msg.y, ctrl: false, alt: false, shift: false },
          msg.x,
          msg.y,
          model.inner
        )
        
        if (innerMsg) {
          return Effect.map(
            component.update(innerMsg, model.inner),
            ([newInner, cmds]) => [
              { ...newModel, inner: newInner },
              cmds.map(cmd => cmd.pipe(Effect.map(msg => ({ _tag: "InnerMsg" as const, msg }))))
            ]
          )
        }
        
        return Effect.succeed([newModel, []])
      }
      
      case "MouseRelease": {
        const newModel = {
          ...model,
          mouseState: {
            ...model.mouseState,
            isPressed: false,
            lastX: msg.x,
            lastY: msg.y
          }
        }
        
        const innerMsg = config.handleMouse(
          { type: 'release', button: 'left', x: msg.x, y: msg.y, ctrl: false, alt: false, shift: false },
          msg.x,
          msg.y,
          model.inner
        )
        
        if (innerMsg) {
          return Effect.map(
            component.update(innerMsg, model.inner),
            ([newInner, cmds]) => [
              { ...newModel, inner: newInner },
              cmds.map(cmd => cmd.pipe(Effect.map(msg => ({ _tag: "InnerMsg" as const, msg }))))
            ]
          )
        }
        
        return Effect.succeed([newModel, []])
      }
      
      case "MouseMove": {
        const newModel = {
          ...model,
          mouseState: {
            ...model.mouseState,
            lastX: msg.x,
            lastY: msg.y
          }
        }
        
        const innerMsg = config.handleMouse(
          { type: 'motion', button: 'none', x: msg.x, y: msg.y, ctrl: false, alt: false, shift: false },
          msg.x,
          msg.y,
          model.inner
        )
        
        if (innerMsg) {
          return Effect.map(
            component.update(innerMsg, model.inner),
            ([newInner, cmds]) => [
              { ...newModel, inner: newInner },
              cmds.map(cmd => cmd.pipe(Effect.map(msg => ({ _tag: "InnerMsg" as const, msg }))))
            ]
          )
        }
        
        return Effect.succeed([newModel, []])
      }
    }
  },
  
  view(model: MouseAwareModel<Model>): View {
    // Get the inner view
    const innerView = component.view(model.inner)
    
    // Optionally add debug overlay
    if (process.env.DEBUG_MOUSE) {
      const debugInfo = vstack(
        text(`Hover: ${model.mouseState.isHovered}`, style()),
        text(`Press: ${model.mouseState.isPressed}`, style()),
        text(`Pos: ${model.mouseState.lastX},${model.mouseState.lastY}`, style())
      )
      
      return vstack(innerView, debugInfo)
    }
    
    return innerView
  },
  
  subscriptions: component.subscriptions 
    ? (model: MouseAwareModel<Model>) =>
        Effect.map(
          component.subscriptions!(model.inner),
          stream => stream.pipe(
            // Wrap inner messages
            stream.map(msg => ({ _tag: "InnerMsg" as const, msg }))
          )
        )
    : undefined
})

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Simple button handler that triggers on click
 */
export const clickableHandler = <Msg>(onClick: () => Msg) =>
  (event: MouseEvent, localX: number, localY: number): Msg | null => {
    if (event.type === 'release' && event.button === 'left') {
      return onClick()
    }
    return null
  }

/**
 * Hover handler that triggers on enter/leave
 */
export const hoverHandler = <Msg>(onEnter: () => Msg, onLeave: () => Msg) =>
  (event: MouseEvent, localX: number, localY: number, wasHovered: boolean): Msg | null => {
    if (event.type === 'motion') {
      const isNowHovered = localX >= 0 && localY >= 0
      if (!wasHovered && isNowHovered) return onEnter()
      if (wasHovered && !isNowHovered) return onLeave()
    }
    return null
  }

/**
 * Drag handler
 */
export const dragHandler = <Msg>(
  onDragStart: (x: number, y: number) => Msg,
  onDragMove: (x: number, y: number) => Msg,
  onDragEnd: (x: number, y: number) => Msg
) => {
  let isDragging = false
  
  return (event: MouseEvent, localX: number, localY: number): Msg | null => {
    switch (event.type) {
      case 'press':
        if (event.button === 'left') {
          isDragging = true
          return onDragStart(localX, localY)
        }
        break
      case 'motion':
        if (isDragging) {
          return onDragMove(localX, localY)
        }
        break
      case 'release':
        if (isDragging && event.button === 'left') {
          isDragging = false
          return onDragEnd(localX, localY)
        }
        break
    }
    return null
  }
}