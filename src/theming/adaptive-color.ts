/**
 * Adaptive Color System - Terminal-aware color management
 * 
 * Integrates with existing Color system using proper Color discriminated unions.
 * Provides colors that adapt to terminal background (light/dark).
 */

import { Color, Colors } from "../styling/color.ts"

/**
 * Get the appropriate color for the current terminal
 * Currently defaults to dark terminal (most common).
 * Future enhancement: Auto-detect terminal background color.
 */
export const getAdaptiveColor = (adaptiveColor: Color): Color => {
  if (adaptiveColor._tag === "Adaptive") {
    // For now, assume dark terminal and return dark variant
    return adaptiveColor.dark
  }
  // If not adaptive, return as-is
  return adaptiveColor
}

/**
 * Common adaptive color patterns using existing Color system
 */
export const AdaptiveColors = {
  // Transparent/none color
  None: Color.NoColor(),
  
  // High contrast text
  Text: Colors.adaptive(Colors.black, Colors.white),
  TextMuted: Colors.adaptive(Colors.gray, Colors.brightBlack),
  
  // Backgrounds  
  Background: Colors.adaptive(Colors.white, Colors.black),
  BackgroundPanel: Colors.adaptive(Color.Hex("#f8f9fa"), Color.Hex("#111111")),
  BackgroundElement: Colors.adaptive(Color.Hex("#f1f3f4"), Color.Hex("#1a1a1a")),
  
  // Borders
  BorderSubtle: Colors.adaptive(Color.Hex("#e1e5e9"), Color.Hex("#333333")),
  Border: Colors.adaptive(Color.Hex("#c1c7cd"), Color.Hex("#444444")),
  BorderActive: Colors.adaptive(Color.Hex("#8c92ac"), Color.Hex("#666666")),
  
  // Brand colors
  Primary: Colors.adaptive(Color.Hex("#0066cc"), Colors.blue),
  Secondary: Colors.adaptive(Colors.gray, Colors.brightBlack),
  Accent: Colors.adaptive(Color.Hex("#6f42c1"), Colors.magenta),
  
  // Status colors
  Success: Colors.adaptive(Colors.green, Colors.brightGreen),
  Warning: Colors.adaptive(Colors.yellow, Colors.brightYellow),
  Error: Colors.adaptive(Colors.red, Colors.brightRed),
  Info: Colors.adaptive(Colors.cyan, Colors.brightCyan),
} as const