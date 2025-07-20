/**
 * Theme Hook
 * 
 * Demonstrates styling patterns
 */

import { style, theme as defaultTheme } from '@tuix/styling'
import { $context } from '@tuix/reactivity'

// Define theme shape
interface Theme {
  container: ReturnType<typeof style>
  primary: string
  secondary: string
  background: string
  text: string
  error: string
  success: string
}

// Create theme context
const ThemeContext = $context<Theme>({
  container: style()
    .padding(2)
    .background(defaultTheme.background),
  primary: '#0088ff',
  secondary: '#00ff88',
  background: defaultTheme.background,
  text: defaultTheme.text,
  error: '#ff4444',
  success: '#44ff44'
})

// Hook to use theme
export function useTheme() {
  return $context(ThemeContext)
}