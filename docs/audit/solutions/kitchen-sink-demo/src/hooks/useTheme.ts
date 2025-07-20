/**
 * Theme Hook
 * 
 * Provides theme context and utilities.
 */

import { $context, $state } from '@tuix/reactivity'
import { style } from '@tuix/styling'

interface Theme {
  name: 'dark' | 'light'
  colors: {
    background: string
    text: string
    primary: string
    secondary: string
    accent: string
    error: string
    success: string
    warning: string
    muted: string
  }
  spacing: {
    xs: number
    sm: number
    md: number
    lg: number
    xl: number
  }
}

// Default themes
const themes = {
  dark: {
    name: 'dark' as const,
    colors: {
      background: '#1a1a1a',
      text: '#ffffff',
      primary: '#0088ff',
      secondary: '#6c757d',
      accent: '#00ff88',
      error: '#ff4444',
      success: '#44ff44',
      warning: '#ffaa00',
      muted: '#666666'
    },
    spacing: {
      xs: 2,
      sm: 4,
      md: 8,
      lg: 16,
      xl: 32
    }
  },
  light: {
    name: 'light' as const,
    colors: {
      background: '#ffffff',
      text: '#000000',
      primary: '#0066cc',
      secondary: '#6c757d',
      accent: '#00cc66',
      error: '#cc0000',
      success: '#00cc00',
      warning: '#cc8800',
      muted: '#999999'
    },
    spacing: {
      xs: 2,
      sm: 4,
      md: 8,
      lg: 16,
      xl: 32
    }
  }
}

// Theme context
const ThemeContext = $context<Theme>(themes.dark)

// Theme state for switching
const themeState = $state({
  current: 'dark' as keyof typeof themes
})

export function useTheme() {
  const theme = $context(ThemeContext)
  
  const switchTheme = (name: keyof typeof themes) => {
    themeState.current = name
    // Would update context here in real implementation
  }
  
  const themed = (styles: string) => {
    return style()
      .background(theme.colors.background)
      .color(theme.colors.text)
      .raw(styles)
  }
  
  return {
    theme,
    switchTheme,
    themed,
    currentTheme: themeState.current
  }
}