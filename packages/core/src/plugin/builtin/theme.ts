/**
 * Theme Plugin - Built-in plugin for theme management
 * 
 * This plugin provides comprehensive theme management capabilities including
 * theme switching, customization, and persistence.
 * 
 * @module core/plugin/builtin/theme
 */

import { Effect, Ref, Context } from "effect"
import { z } from "zod"
import { createPlugin } from "../types"
import type { Plugin } from "../types"
import { StandardSignals } from "../signals"
import { createBeforeHook, createAfterHook, HOOK_NAMES } from "../hooks"

// =============================================================================
// Theme Types
// =============================================================================

/**
 * Color palette interface
 */
export interface ColorPalette {
  readonly primary: string
  readonly secondary: string
  readonly accent: string
  readonly background: string
  readonly surface: string
  readonly text: string
  readonly textSecondary: string
  readonly border: string
  readonly success: string
  readonly warning: string
  readonly error: string
  readonly info: string
}

/**
 * Theme interface
 */
export interface Theme {
  readonly name: string
  readonly version: string
  readonly description?: string
  readonly author?: string
  readonly colors: ColorPalette
  readonly fonts: {
    readonly primary: string
    readonly secondary: string
    readonly monospace: string
  }
  readonly spacing: {
    readonly xs: number
    readonly sm: number
    readonly md: number
    readonly lg: number
    readonly xl: number
  }
  readonly borderRadius: {
    readonly sm: number
    readonly md: number
    readonly lg: number
  }
  readonly shadows: {
    readonly sm: string
    readonly md: string
    readonly lg: string
  }
  readonly breakpoints: {
    readonly mobile: number
    readonly tablet: number
    readonly desktop: number
  }
}

/**
 * Theme configuration schema
 */
const ThemeConfigSchema = z.object({
  defaultTheme: z.string().default('default'),
  allowCustomThemes: z.boolean().default(true),
  persistTheme: z.boolean().default(true),
  storageKey: z.string().default('tuix-theme'),
  autoDetectSystemTheme: z.boolean().default(true),
  enableTransitions: z.boolean().default(true),
  transitionDuration: z.number().default(200),
})

export type ThemeConfig = z.infer<typeof ThemeConfigSchema>

// =============================================================================
// Default Themes
// =============================================================================

/**
 * Default light theme
 */
export const defaultLightTheme: Theme = {
  name: 'default-light',
  version: '1.0.0',
  description: 'Default light theme for TUIX',
  author: 'TUIX Team',
  colors: {
    primary: '#007acc',
    secondary: '#6c757d',
    accent: '#17a2b8',
    background: '#ffffff',
    surface: '#f8f9fa',
    text: '#212529',
    textSecondary: '#6c757d',
    border: '#dee2e6',
    success: '#28a745',
    warning: '#ffc107',
    error: '#dc3545',
    info: '#17a2b8',
  },
  fonts: {
    primary: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    secondary: 'Georgia, "Times New Roman", serif',
    monospace: 'SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 16,
  },
  shadows: {
    sm: '0 1px 3px rgba(0, 0, 0, 0.1)',
    md: '0 4px 6px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px rgba(0, 0, 0, 0.1)',
  },
  breakpoints: {
    mobile: 768,
    tablet: 1024,
    desktop: 1200,
  },
}

/**
 * Default dark theme
 */
export const defaultDarkTheme: Theme = {
  ...defaultLightTheme,
  name: 'default-dark',
  description: 'Default dark theme for TUIX',
  colors: {
    primary: '#0d7377',
    secondary: '#6c757d',
    accent: '#17a2b8',
    background: '#1a1a1a',
    surface: '#2d2d2d',
    text: '#ffffff',
    textSecondary: '#adb5bd',
    border: '#495057',
    success: '#28a745',
    warning: '#ffc107',
    error: '#dc3545',
    info: '#17a2b8',
  },
}

/**
 * High contrast theme
 */
export const highContrastTheme: Theme = {
  ...defaultLightTheme,
  name: 'high-contrast',
  description: 'High contrast theme for accessibility',
  colors: {
    primary: '#0000ff',
    secondary: '#808080',
    accent: '#ff00ff',
    background: '#ffffff',
    surface: '#f0f0f0',
    text: '#000000',
    textSecondary: '#404040',
    border: '#000000',
    success: '#008000',
    warning: '#ff8000',
    error: '#ff0000',
    info: '#0000ff',
  },
}

// =============================================================================
// Theme Service
// =============================================================================

/**
 * Theme service interface
 */
export interface ThemeService {
  readonly getCurrentTheme: () => Effect.Effect<Theme, never, never>
  readonly setTheme: (themeName: string) => Effect.Effect<void, Error, never>
  readonly getAvailableThemes: () => Effect.Effect<Theme[], never, never>
  readonly registerTheme: (theme: Theme) => Effect.Effect<void, Error, never>
  readonly unregisterTheme: (themeName: string) => Effect.Effect<void, Error, never>
  readonly createCustomTheme: (baseTheme: string, overrides: Partial<Theme>) => Effect.Effect<Theme, Error, never>
  readonly getThemeVariable: (variable: string) => Effect.Effect<string, Error, never>
  readonly applyTheme: (theme: Theme) => Effect.Effect<void, never, never>
  readonly resetToDefault: () => Effect.Effect<void, never, never>
}

/**
 * Create theme service
 */
function createThemeService(config: ThemeConfig): Effect.Effect<ThemeService, never, never> {
  return Effect.gen(function* () {
    const themesRef = yield* Ref.make<Map<string, Theme>>(new Map([
      [defaultLightTheme.name, defaultLightTheme],
      [defaultDarkTheme.name, defaultDarkTheme],
      [highContrastTheme.name, highContrastTheme],
    ]))
    
    const currentThemeRef = yield* Ref.make<Theme>(defaultLightTheme)

    // Initialize with default theme
    const initialTheme = yield* loadPersistedTheme(config)
    yield* Ref.set(currentThemeRef, initialTheme)

    const getCurrentTheme = (): Effect.Effect<Theme, never, never> =>
      Ref.get(currentThemeRef)

    const setTheme = (themeName: string): Effect.Effect<void, Error, never> =>
      Effect.gen(function* () {
        const themes = yield* Ref.get(themesRef)
        const theme = themes.get(themeName)
        
        if (!theme) {
          return yield* Effect.fail(new Error(`Theme ${themeName} not found`))
        }

        const previousTheme = yield* Ref.get(currentThemeRef)
        yield* Ref.set(currentThemeRef, theme)
        yield* applyTheme(theme)
        
        if (config.persistTheme) {
          yield* persistTheme(theme, config)
        }

        // Emit theme change signal
        yield* Effect.succeed(undefined) // Would emit signal here
      })

    const getAvailableThemes = (): Effect.Effect<Theme[], never, never> =>
      Effect.gen(function* () {
        const themes = yield* Ref.get(themesRef)
        return Array.from(themes.values())
      })

    const registerTheme = (theme: Theme): Effect.Effect<void, Error, never> =>
      Effect.gen(function* () {
        const themes = yield* Ref.get(themesRef)
        
        if (themes.has(theme.name)) {
          return yield* Effect.fail(new Error(`Theme ${theme.name} already exists`))
        }

        yield* Ref.update(themesRef, themes => 
          new Map(themes.set(theme.name, theme))
        )
      })

    const unregisterTheme = (themeName: string): Effect.Effect<void, Error, never> =>
      Effect.gen(function* () {
        const themes = yield* Ref.get(themesRef)
        
        if (!themes.has(themeName)) {
          return yield* Effect.fail(new Error(`Theme ${themeName} not found`))
        }

        if (themeName === defaultLightTheme.name || themeName === defaultDarkTheme.name) {
          return yield* Effect.fail(new Error(`Cannot unregister default theme ${themeName}`))
        }

        yield* Ref.update(themesRef, themes => {
          const newThemes = new Map(themes)
          newThemes.delete(themeName)
          return newThemes
        })

        // Switch to default theme if current theme is being removed
        const currentTheme = yield* Ref.get(currentThemeRef)
        if (currentTheme.name === themeName) {
          yield* setTheme(defaultLightTheme.name)
        }
      })

    const createCustomTheme = (baseTheme: string, overrides: Partial<Theme>): Effect.Effect<Theme, Error, never> =>
      Effect.gen(function* () {
        const themes = yield* Ref.get(themesRef)
        const base = themes.get(baseTheme)
        
        if (!base) {
          return yield* Effect.fail(new Error(`Base theme ${baseTheme} not found`))
        }

        const customTheme: Theme = {
          ...base,
          ...overrides,
          name: overrides.name || `${base.name}-custom`,
          colors: {
            ...base.colors,
            ...overrides.colors,
          },
          fonts: {
            ...base.fonts,
            ...overrides.fonts,
          },
          spacing: {
            ...base.spacing,
            ...overrides.spacing,
          },
          borderRadius: {
            ...base.borderRadius,
            ...overrides.borderRadius,
          },
          shadows: {
            ...base.shadows,
            ...overrides.shadows,
          },
          breakpoints: {
            ...base.breakpoints,
            ...overrides.breakpoints,
          },
        }

        return customTheme
      })

    const getThemeVariable = (variable: string): Effect.Effect<string, Error, never> =>
      Effect.gen(function* () {
        const theme = yield* Ref.get(currentThemeRef)
        
        // Parse variable path (e.g., 'colors.primary', 'spacing.md')
        const parts = variable.split('.')
        let value: any = theme
        
        for (const part of parts) {
          if (value && typeof value === 'object' && part in value) {
            value = value[part]
          } else {
            return yield* Effect.fail(new Error(`Theme variable ${variable} not found`))
          }
        }

        return String(value)
      })

    const applyTheme = (theme: Theme): Effect.Effect<void, never, never> =>
      Effect.gen(function* () {
        // In a real implementation, this would apply CSS variables or update styling
        // For now, we'll just log the theme application
        console.log(`Applying theme: ${theme.name}`)
        
        // Apply CSS custom properties
        if (typeof document !== 'undefined') {
          const root = document.documentElement
          
          // Apply color variables
          Object.entries(theme.colors).forEach(([key, value]) => {
            root.style.setProperty(`--tuix-color-${key}`, value)
          })
          
          // Apply spacing variables
          Object.entries(theme.spacing).forEach(([key, value]) => {
            root.style.setProperty(`--tuix-spacing-${key}`, `${value}px`)
          })
          
          // Apply border radius variables
          Object.entries(theme.borderRadius).forEach(([key, value]) => {
            root.style.setProperty(`--tuix-border-radius-${key}`, `${value}px`)
          })
          
          // Apply font variables
          Object.entries(theme.fonts).forEach(([key, value]) => {
            root.style.setProperty(`--tuix-font-${key}`, value)
          })
          
          // Apply shadow variables
          Object.entries(theme.shadows).forEach(([key, value]) => {
            root.style.setProperty(`--tuix-shadow-${key}`, value)
          })
        }
      })

    const resetToDefault = (): Effect.Effect<void, never, never> =>
      Effect.gen(function* () {
        yield* setTheme(defaultLightTheme.name)
      })

    return {
      getCurrentTheme,
      setTheme,
      getAvailableThemes,
      registerTheme,
      unregisterTheme,
      createCustomTheme,
      getThemeVariable,
      applyTheme,
      resetToDefault,
    }
  })
}

/**
 * Load persisted theme
 */
function loadPersistedTheme(config: ThemeConfig): Effect.Effect<Theme, never, never> {
  return Effect.gen(function* () {
    if (!config.persistTheme) {
      return defaultLightTheme
    }

    try {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem(config.storageKey)
        if (stored) {
          const parsed = JSON.parse(stored)
          return parsed as Theme
        }
      }
    } catch (error) {
      console.warn('Failed to load persisted theme:', error)
    }

    return defaultLightTheme
  })
}

/**
 * Persist theme
 */
function persistTheme(theme: Theme, config: ThemeConfig): Effect.Effect<void, never, never> {
  return Effect.gen(function* () {
    if (!config.persistTheme) {
      return
    }

    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(config.storageKey, JSON.stringify(theme))
      }
    } catch (error) {
      console.warn('Failed to persist theme:', error)
    }
  })
}

// =============================================================================
// Theme Plugin
// =============================================================================

/**
 * Create theme plugin
 */
export function createThemePlugin(config: Partial<ThemeConfig> = {}): Effect.Effect<Plugin, never, never> {
  return Effect.gen(function* () {
    const finalConfig = { ...ThemeConfigSchema.parse({}), ...config }
    const service = yield* createThemeService(finalConfig)

    return createPlugin({
      name: 'theme',
      version: '1.0.0',
      description: 'Theme management plugin for TUIX',
      author: 'TUIX Team',
      
      hooks: {
        [HOOK_NAMES.APP_INIT]: createAfterHook(
          Effect.gen(function* () {
            // Apply initial theme
            const theme = yield* service.getCurrentTheme()
            yield* service.applyTheme(theme)
          })
        ),
        
        [HOOK_NAMES.COMPONENT_RENDER]: createBeforeHook(
          Effect.gen(function* () {
            // Ensure theme is applied before rendering
            const theme = yield* service.getCurrentTheme()
            yield* service.applyTheme(theme)
          })
        ),
      },
      
      signals: {
        [StandardSignals.THEME_CHANGED.name]: StandardSignals.THEME_CHANGED,
      },
      
      services: {
        theme: service,
      },
      
      config: ThemeConfigSchema,
      
      defaultConfig: finalConfig,
    })
  })
}

/**
 * Theme plugin instance
 */
export const themePlugin = Effect.runSync(createThemePlugin())

// =============================================================================
// Theme Utilities
// =============================================================================

/**
 * Theme utility functions
 */
export const ThemeUtils = {
  /**
   * Create a theme variant
   */
  createVariant: (baseTheme: Theme, name: string, colorOverrides: Partial<ColorPalette>): Theme => ({
    ...baseTheme,
    name,
    colors: {
      ...baseTheme.colors,
      ...colorOverrides,
    },
  }),
  
  /**
   * Convert theme to CSS variables
   */
  toCSSVariables: (theme: Theme): Record<string, string> => {
    const variables: Record<string, string> = {}
    
    // Color variables
    Object.entries(theme.colors).forEach(([key, value]) => {
      variables[`--tuix-color-${key}`] = value
    })
    
    // Spacing variables
    Object.entries(theme.spacing).forEach(([key, value]) => {
      variables[`--tuix-spacing-${key}`] = `${value}px`
    })
    
    // Border radius variables
    Object.entries(theme.borderRadius).forEach(([key, value]) => {
      variables[`--tuix-border-radius-${key}`] = `${value}px`
    })
    
    // Font variables
    Object.entries(theme.fonts).forEach(([key, value]) => {
      variables[`--tuix-font-${key}`] = value
    })
    
    // Shadow variables
    Object.entries(theme.shadows).forEach(([key, value]) => {
      variables[`--tuix-shadow-${key}`] = value
    })
    
    return variables
  },
  
  /**
   * Generate color palette from primary color
   */
  generatePalette: (primaryColor: string): Partial<ColorPalette> => {
    // Simple color generation - in a real implementation, this would use
    // color theory to generate harmonious colors
    return {
      primary: primaryColor,
      secondary: adjustColor(primaryColor, -20),
      accent: adjustColor(primaryColor, 60),
      success: '#28a745',
      warning: '#ffc107',
      error: '#dc3545',
      info: '#17a2b8',
    }
  },
  
  /**
   * Validate theme structure
   */
  validateTheme: (theme: unknown): Theme => {
    // Simple validation - in a real implementation, this would use Zod
    const t = theme as Theme
    if (!t.name || !t.colors || !t.fonts || !t.spacing) {
      throw new Error('Invalid theme structure')
    }
    return t
  },
  
  /**
   * Get theme contrast ratio
   */
  getContrastRatio: (theme: Theme): number => {
    // Simple contrast calculation - in a real implementation, this would
    // calculate actual color contrast ratios
    const isLight = theme.colors.background === '#ffffff'
    return isLight ? 4.5 : 7.0
  },
}

/**
 * Adjust color brightness
 */
function adjustColor(color: string, percent: number): string {
  // Simple color adjustment - in a real implementation, this would use
  // proper color space calculations
  const hex = color.replace('#', '')
  const num = parseInt(hex, 16)
  const amt = Math.round(2.55 * percent)
  const R = (num >> 16) + amt
  const G = (num >> 8 & 0x00FF) + amt
  const B = (num & 0x0000FF) + amt
  
  return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
    (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
    (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1)
}

// =============================================================================
// Export Types
// =============================================================================

export type { ThemeConfig, Theme, ColorPalette, ThemeService }