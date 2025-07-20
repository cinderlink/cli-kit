/**
 * Box Component - Simple container component
 */

import { Effect } from "effect"
import type { Component } from "@tuix/core"
import { View, stringWidth } from "@tuix/core"

const { box } = View

export interface BoxModel {
  readonly content: string
  readonly padding?: number
  readonly minWidth?: number
  readonly minHeight?: number
}

export type BoxMsg = 
  | { readonly _tag: "SetContent"; readonly content: string }
  | { readonly _tag: "SetPadding"; readonly padding: number }
  | { readonly _tag: "SetMinSize"; readonly minWidth?: number; readonly minHeight?: number }

/**
 * Simple box component for containing text
 */
export const Box: Component<BoxModel, BoxMsg> = {
  init: Effect.succeed([
    { content: "", padding: 1 },
    []
  ]),

  update: (msg, model) => {
    switch (msg._tag) {
      case "SetContent":
        return Effect.succeed([{ ...model, content: msg.content }, []])
      case "SetPadding":
        return Effect.succeed([{ ...model, padding: msg.padding }, []])
      case "SetMinSize":
        return Effect.succeed([{ ...model, minWidth: msg.minWidth, minHeight: msg.minHeight }, []])
      default:
        return Effect.succeed([model, []])
    }
  },

  view: (model) => {
    const padding = model.padding ?? 0
    const lines = model.content.split('\n')
    const contentWidth = Math.max(...lines.map(line => stringWidth(line)), 0)
    const contentHeight = lines.length
    
    const calculatedWidth = contentWidth + padding * 2
    const calculatedHeight = contentHeight + padding * 2
    
    return box({
      render: () => Effect.succeed(model.content),
      width: Math.max(calculatedWidth, model.minWidth ?? 0),
      height: Math.max(calculatedHeight, model.minHeight ?? 0)
    })
  }
}