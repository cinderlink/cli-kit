/**
 * Comprehensive Theme System - OpenCode Inspired
 * 
 * Provides 50+ themed colors for consistent UI appearance.
 * Based on Radix UI color system and OpenCode's theme architecture.
 */

import { Color } from "../styling/color.ts"
import { AdaptiveColors } from "./adaptive-color.ts"

/**
 * Complete theme interface covering all UI elements
 */
export interface Theme {
  readonly name: string
  
  // Background colors (Radix 1-3)
  readonly background: Color        // Base background
  readonly backgroundPanel: Color   // Panel background
  readonly backgroundElement: Color // Element background
  
  // Border colors (Radix 6-8)
  readonly borderSubtle: Color      // Subtle borders
  readonly border: Color            // Standard borders
  readonly borderActive: Color      // Active/focused borders
  
  // Text colors (Radix 11-12)
  readonly textMuted: Color         // Secondary text
  readonly text: Color              // Primary text
  
  // Brand colors
  readonly primary: Color           // Primary brand color
  readonly secondary: Color         // Secondary brand color
  readonly accent: Color            // Accent color
  
  // Status colors
  readonly success: Color           // Success/positive states
  readonly warning: Color           // Warning states
  readonly error: Color             // Error/negative states
  readonly info: Color              // Info/neutral states
  
  // Component-specific colors
  readonly buttonPrimary: Color     // Primary button background
  readonly buttonSecondary: Color   // Secondary button background
  readonly inputBackground: Color   // Input field background
  readonly inputBorder: Color       // Input field border
  readonly inputFocused: Color      // Focused input background
  readonly inputText: Color         // Input text color
  readonly inputPlaceholder: Color  // Placeholder text
  readonly inputCursor: Color       // Cursor color
  
  // List and selection colors
  readonly listItem: Color          // List item background
  readonly listItemHover: Color     // Hovered list item
  readonly listItemSelected: Color  // Selected list item
  readonly listItemText: Color      // List item text
  
  // Modal and overlay colors
  readonly modalBackground: Color   // Modal background
  readonly modalBorder: Color       // Modal border
  readonly overlayBackground: Color // Overlay background
  
  // Syntax highlighting colors
  readonly syntaxComment: Color     // Comments
  readonly syntaxKeyword: Color     // Keywords
  readonly syntaxString: Color      // Strings
  readonly syntaxNumber: Color      // Numbers
  readonly syntaxFunction: Color    // Functions
  readonly syntaxVariable: Color    // Variables
  
  // Diff colors
  readonly diffAdded: Color         // Added lines
  readonly diffRemoved: Color       // Removed lines
  readonly diffContext: Color       // Context lines
}

/**
 * Default dark theme
 */
export const DarkTheme: Theme = {
  name: "Dark",
  
  // Background colors
  background: AdaptiveColors.Background,
  backgroundPanel: AdaptiveColors.BackgroundPanel,
  backgroundElement: AdaptiveColors.BackgroundElement,
  
  // Border colors
  borderSubtle: AdaptiveColors.BorderSubtle,
  border: AdaptiveColors.Border,
  borderActive: AdaptiveColors.BorderActive,
  
  // Text colors
  textMuted: AdaptiveColors.TextMuted,
  text: AdaptiveColors.Text,
  
  // Brand colors
  primary: AdaptiveColors.Primary,
  secondary: AdaptiveColors.Secondary,
  accent: AdaptiveColors.Accent,
  
  // Status colors
  success: AdaptiveColors.Success,
  warning: AdaptiveColors.Warning,
  error: AdaptiveColors.Error,
  info: AdaptiveColors.Info,
  
  // Component-specific colors
  buttonPrimary: AdaptiveColors.Primary,
  buttonSecondary: AdaptiveColors.Secondary,
  inputBackground: AdaptiveColors.BackgroundPanel,
  inputBorder: AdaptiveColors.Border,
  inputFocused: AdaptiveColors.Primary,
  inputText: AdaptiveColors.Text,
  inputPlaceholder: AdaptiveColors.TextMuted,
  inputCursor: AdaptiveColors.Text,
  
  // List colors
  listItem: AdaptiveColors.Background,
  listItemHover: AdaptiveColors.BackgroundElement,
  listItemSelected: AdaptiveColors.Primary,
  listItemText: AdaptiveColors.Text,
  
  // Modal colors
  modalBackground: AdaptiveColors.BackgroundPanel,
  modalBorder: AdaptiveColors.Border,
  overlayBackground: AdaptiveColors.Background,
  
  // Syntax colors
  syntaxComment: AdaptiveColors.TextMuted,
  syntaxKeyword: AdaptiveColors.Error,
  syntaxString: AdaptiveColors.Success,
  syntaxNumber: AdaptiveColors.Info,
  syntaxFunction: AdaptiveColors.Accent,
  syntaxVariable: AdaptiveColors.Warning,
  
  // Diff colors
  diffAdded: AdaptiveColors.Success,
  diffRemoved: AdaptiveColors.Error,
  diffContext: AdaptiveColors.TextMuted,
}

/**
 * Current active theme
 */
export let currentTheme: Theme = DarkTheme

/**
 * Set the active theme
 */
export const setTheme = (theme: Theme): void => {
  currentTheme = theme
}

/**
 * Get the current theme
 */
export const getTheme = (): Theme => currentTheme