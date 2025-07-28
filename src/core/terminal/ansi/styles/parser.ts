/**
 * @file
 * This file contains utilities for parsing ANSI escape codes and styled text.
 * It provides a structured way to handle styled text segments, ensuring that
 * styles are correctly interpreted and applied.
 */

import { Effect, Chunk, Option } from 'effect'
import { AnsiStyle } from './types'

/**
 * Represents a segment of text with an associated ANSI style.
 */
export interface StyledText {
  readonly _tag: 'StyledText'
  readonly text: string
  readonly style: Option.Option<AnsiStyle>
}

/**
 * Creates a `StyledText` object.
 */
export const styledText = (
  text: string,
  style: Option.Option<AnsiStyle> = Option.none()
): StyledText => ({ _tag: 'StyledText', text, style })

/**
 * Regular expression to match ANSI escape codes.
 */
const ansiRegex = /\x1b\[[0-9;]*m/g

/**
 * Parses a string containing ANSI escape codes into a `Chunk<StyledText>`.
 * This allows for processing text with mixed styles in a structured way.
 *
 * @param text The raw string to parse.
 * @returns An `Effect` that resolves to a `Chunk` of `StyledText` segments.
 */
export const parseStyledText = (
  text: string
): Effect.Effect<never, never, Chunk.Chunk<StyledText>> =>
  Effect.sync(() => {
    if (!text.includes('\x1b')) {
      return Chunk.of(styledText(text))
    }

    const segments: StyledText[] = []
    let currentIndex = 0
    let currentStyle: Option.Option<AnsiStyle> = Option.none()

    const matches = Array.from(text.matchAll(ansiRegex))

    for (const match of matches) {
      const ansiCode = match[0]
      const matchIndex = match.index ?? 0

      // Add preceding text with the current style
      if (matchIndex > currentIndex) {
        segments.push(styledText(text.slice(currentIndex, matchIndex), currentStyle))
      }

      // Update style based on ANSI code
      if (ansiCode === '\x1b[0m') {
        currentStyle = Option.none()
      } else {
        // This is a simplified parser. A real implementation would map
        // ANSI codes to a structured `AnsiStyle` object.
        currentStyle = Option.some({ _tag: 'AnsiStyle', code: ansiCode } as AnsiStyle)
      }

      currentIndex = matchIndex + ansiCode.length
    }

    // Add any remaining text
    if (currentIndex < text.length) {
      segments.push(styledText(text.slice(currentIndex), currentStyle))
    }

    return Chunk.fromIterable(segments)
  })
