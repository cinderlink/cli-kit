/**
 * Simple Flexbox Implementation
 * 
 * A simpler flexbox that properly composes views
 */

import { Effect } from "effect"
import type { View } from "@/core/types.ts"
import { joinHorizontal, joinVertical, Top, Center, Bottom, Left, Right, type Position } from "./join.ts"
import { text } from "@/core/view.ts"

export enum FlexDirection {
  Row = "row",
  Column = "column"
}

export enum JustifyContent {
  Start = "start",
  Center = "center", 
  End = "end",
  SpaceBetween = "space-between",
  SpaceAround = "space-around",
  SpaceEvenly = "space-evenly"
}

export enum AlignItems {
  Start = "start",
  Center = "center",
  End = "end",
  Stretch = "stretch"
}

export interface SimpleFlexProps {
  direction?: FlexDirection
  justifyContent?: JustifyContent
  alignItems?: AlignItems
  gap?: number
  padding?: {
    top?: number
    right?: number
    bottom?: number
    left?: number
  }
}

/**
 * Convert align items to position
 */
const alignToPosition = (align: AlignItems): Position => {
  switch (align) {
    case AlignItems.Start:
      return Top
    case AlignItems.Center:
      return Center
    case AlignItems.End:
      return Bottom
    default:
      return Top
  }
}

/**
 * Add gaps between views
 */
const addGaps = (views: View[], gap: number, direction: FlexDirection): View[] => {
  if (gap === 0 || views.length <= 1) return views
  
  const result: View[] = []
  const spacer = text(" ".repeat(gap))
  
  for (let i = 0; i < views.length; i++) {
    result.push(views[i])
    if (i < views.length - 1) {
      if (direction === FlexDirection.Row) {
        result.push(spacer)
      } else {
        result.push(text("\n".repeat(gap)))
      }
    }
  }
  
  return result
}

/**
 * Simple flexbox implementation
 */
export const simpleFlex = (
  items: View[],
  props: SimpleFlexProps = {}
): View => {
  const {
    direction = FlexDirection.Row,
    justifyContent = JustifyContent.Start,
    alignItems = AlignItems.Start,
    gap = 0,
    padding = {}
  } = props
  
  if (items.length === 0) {
    return text("")
  }
  
  // Add gaps
  const viewsWithGaps = addGaps(items, gap, direction)
  
  // Get alignment position
  const alignPos = alignToPosition(alignItems)
  
  // Join based on direction
  let content: View
  if (direction === FlexDirection.Row) {
    content = joinHorizontal(alignPos, ...viewsWithGaps)
  } else {
    content = joinVertical(alignPos, ...viewsWithGaps)
  }
  
  // Apply padding
  if (padding.top || padding.right || padding.bottom || padding.left) {
    const padTop = padding.top || 0
    const padRight = padding.right || 0
    const padBottom = padding.bottom || 0
    const padLeft = padding.left || 0
    
    return {
      render: () => Effect.gen(function* (_) {
        const rendered = yield* _(content.render())
        const lines = rendered.split('\n')
        
        // Add horizontal padding
        const paddedLines = lines.map(line => 
          " ".repeat(padLeft) + line + " ".repeat(padRight)
        )
        
        // Add vertical padding
        const width = (content.width || 0) + padLeft + padRight
        const emptyLine = " ".repeat(width)
        
        const result = [
          ...Array(padTop).fill(emptyLine),
          ...paddedLines,
          ...Array(padBottom).fill(emptyLine)
        ]
        
        return result.join('\n')
      }),
      width: (content.width || 0) + padLeft + padRight,
      height: (content.height || 0) + padTop + padBottom
    }
  }
  
  return content
}

/**
 * Create a horizontal flexbox (row)
 */
export const simpleHBox = (
  items: View[],
  props: Omit<SimpleFlexProps, 'direction'> = {}
): View => {
  return simpleFlex(items, { ...props, direction: FlexDirection.Row })
}

/**
 * Create a vertical flexbox (column)
 */
export const simpleVBox = (
  items: View[],
  props: Omit<SimpleFlexProps, 'direction'> = {}
): View => {
  return simpleFlex(items, { ...props, direction: FlexDirection.Column })
}

/**
 * Center a view both horizontally and vertically
 */
export const simpleCenter = (view: View, width?: number, height?: number): View => {
  const { place } = require("./join.ts")
  return place(width || 80, height || 24, Center, Center, view)
}