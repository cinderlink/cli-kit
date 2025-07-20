/**
 * Text Component - Simple text display component
 */

import { Effect } from "effect"
import type { Component } from "@tuix/core"
import { View } from "@tuix/core"
import { style, type Style } from "@tuix/styling"

const { text, styledText } = View

export interface TextModel {
  readonly content: string
  readonly textStyle?: Style
}

export type TextMsg = 
  | { readonly _tag: "SetContent"; readonly content: string }
  | { readonly _tag: "SetStyle"; readonly textStyle: Style }

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
        return Effect.succeed([{ ...model, textStyle: msg.textStyle }, []])
      default:
        // Handle unexpected messages by returning the model unchanged
        return Effect.succeed([model, []])
    }
  },

  view: (model) => {
    if (model.textStyle) {
      return styledText(model.content, model.textStyle)
    }
    return text(model.content)
  }
}