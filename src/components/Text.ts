/**
 * Text Component - Simple text display component
 */

import { Effect } from "effect"
import type { Component } from "@/core/types"
import { text } from "@/core/view"

export interface TextModel {
  readonly content: string
  readonly style?: string
}

export type TextMsg = 
  | { readonly _tag: "SetContent"; readonly content: string }
  | { readonly _tag: "SetStyle"; readonly style: string }

/**
 * Simple text display component
 */
export const Text: Component<TextModel, TextMsg> = {
  init: Effect.succeed([
    { content: "" },
    []
  ]),

  update: (msg, model) => {
    switch (msg._tag) {
      case "SetContent":
        return Effect.succeed([{ ...model, content: msg.content }, []])
      case "SetStyle":
        return Effect.succeed([{ ...model, style: msg.style }, []])
    }
  },

  view: (model) => text(model.content)
}