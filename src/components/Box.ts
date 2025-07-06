/**
 * Box Component - Simple container component
 */

import { Effect } from "effect"
import type { Component } from "@/core/types"
import { box } from "@/core/view"

export interface BoxModel {
  readonly content: string
  readonly padding?: number
}

export type BoxMsg = 
  | { readonly _tag: "SetContent"; readonly content: string }

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
      default:
        return Effect.succeed([model, []])
    }
  },

  view: (model) => box({
    render: () => Effect.succeed(model.content),
    width: model.content.length + (model.padding || 0) * 2,
    height: 1 + (model.padding || 0) * 2
  })
}