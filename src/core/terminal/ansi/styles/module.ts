/**
 * Styling Module - Domain module for terminal UI styling
 *
 * Manages style computation, theme application, layout management,
 * and responsive design for terminal components.
 */

import { Effect } from 'effect'
import { ModuleBase, ModuleError } from '../../../runtime/module/base'
import type { EventBus, BaseEvent } from '../../../model/events/event-bus'
import type {
  StyleEvent,
  ThemeEvent,
  LayoutEvent,
  AnimationEvent,
  ComputedStyles,
  ThemeConfig,
  LayoutInfo,
} from './events'
import { StylingEventChannels } from './events'
import type { TerminalEvent } from '../../../services/events'
import type { JSXRenderEvent } from '../../../../jsx/events'

/**
 * Style definition
 */
export interface StyleDef {
  readonly selector?: string
  readonly styles: Partial<ComputedStyles>
  readonly responsive?: {
    readonly small?: Partial<ComputedStyles>
    readonly medium?: Partial<ComputedStyles>
    readonly large?: Partial<ComputedStyles>
  }
}

/**
 * Styled element
 */
export interface StyledElement {
  readonly element: JSX.Element
  readonly computedStyles: ComputedStyles
  readonly layout?: LayoutInfo
}

/**
 * Theme error
 */
export class ThemeError {
  readonly _tag = 'ThemeError'
  constructor(
    readonly message: string,
    readonly themeName?: string,
    readonly cause?: unknown
  ) {}
}

/**
 * Layout error
 */
export class LayoutError {
  readonly _tag = 'LayoutError'
  constructor(
    readonly message: string,
    readonly component?: string,
    readonly cause?: unknown
  ) {}
}

/**
 * Styling Module implementation
 */
export class StylingModule extends ModuleBase {
  private themes = new Map<string, ThemeConfig>()
  private currentTheme: string = 'default'
  private styles = new Map<string, StyleDef>()
  private layouts = new Map<string, LayoutInfo>()
  private terminalSize = { width: 80, height: 24 }

  constructor(eventBus: EventBus) {
    super(eventBus, 'styling')

    // Initialize default theme
    this.themes.set('default', this.createDefaultTheme())
  }

  /**
   * Initialize the styling module
   */
  initialize(): Effect<void, ModuleError> {
    return Effect.gen(
      function* () {
        this.state = 'initializing'

        // Subscribe to relevant events
        yield* this.subscribeToEvents()

        // Mark as ready
        yield* this.setReady()
      }.bind(this)
    )
  }

  /**
   * Subscribe to events from other modules
   */
  private subscribeToEvents(): Effect<void, never> {
    return this.subscribeMany([
      {
        channel: 'jsx-render',
        handler: event => this.handleJSXRender(event as JSXRenderEvent),
      },
      {
        channel: 'terminal-events',
        handler: event => this.handleTerminalEvent(event as TerminalEvent),
      },
      {
        channel: 'config-events',
        handler: event => this.handleConfigEvent(event),
      },
    ])
  }

  /**
   * Handle JSX render events
   */
  private handleJSXRender(event: JSXRenderEvent): Effect<void, never> {
    return Effect.gen(
      function* () {
        if (event.type === 'jsx-render-start' && event.component) {
          // Apply styles before rendering
          yield* this.applyComponentStyles(event.component)
        }
      }.bind(this)
    )
  }

  /**
   * Handle terminal events
   */
  private handleTerminalEvent(event: TerminalEvent): Effect<void, never> {
    return Effect.gen(
      function* () {
        if (event.type === 'terminal-resize' && event.dimensions) {
          this.terminalSize = event.dimensions
          // Recompute all layouts
          yield* this.recomputeLayouts(event.dimensions)
        }
      }.bind(this)
    )
  }

  /**
   * Handle config events
   */
  private handleConfigEvent(event: BaseEvent): Effect<void, never> {
    return Effect.gen(
      function* () {
        if (event.type === 'config-updated' && 'section' in event) {
          const configEvent = event as BaseEvent & { section?: string; value?: unknown }
          if (configEvent.section === 'theme' && typeof configEvent.value === 'string') {
            yield* this.setTheme(configEvent.value)
          }
        }
      }.bind(this)
    )
  }

  /**
   * Apply styles to component
   */
  applyComponentStyles(element: JSX.Element): Effect<StyledElement, never> {
    return Effect.gen(
      function* () {
        const componentName = this.getComponentName(element)
        const styleDef = this.styles.get(componentName)
        const theme = this.themes.get(this.currentTheme)!

        // Compute styles based on theme and definitions
        const computedStyles = this.computeStyles(styleDef, theme)

        // Apply responsive styles based on terminal size
        const responsiveStyles = this.applyResponsiveStyles(styleDef, this.terminalSize)

        const finalStyles = { ...computedStyles, ...responsiveStyles }

        yield* this.emitStyleApplied(componentName, finalStyles)

        return {
          element,
          computedStyles: finalStyles,
        }
      }.bind(this)
    )
  }

  /**
   * Register styles
   */
  registerStyles(styleDef: StyleDef): Effect<void, never> {
    return Effect.gen(
      function* () {
        const selector = styleDef.selector || 'default'
        this.styles.set(selector, styleDef)
      }.bind(this)
    )
  }

  /**
   * Set theme
   */
  setTheme(themeName: string): Effect<void, ThemeError> {
    return Effect.gen(
      function* () {
        const theme = this.themes.get(themeName)
        if (!theme) {
          return yield* Effect.fail(new ThemeError(`Theme not found: ${themeName}`, themeName))
        }

        const previousTheme = this.currentTheme
        this.currentTheme = themeName

        yield* this.emitThemeChanged(themeName, theme, previousTheme)

        // Recompute all styles with new theme
        yield* this.recomputeAllStyles()
      }.bind(this)
    )
  }

  /**
   * Register theme
   */
  registerTheme(name: string, config: ThemeConfig): Effect<void, never> {
    return Effect.gen(
      function* () {
        this.themes.set(name, config)
        yield* this.emitThemeLoaded(name, config)
      }.bind(this)
    )
  }

  /**
   * Compute layout
   */
  computeLayout(element: StyledElement): Effect<LayoutInfo, LayoutError> {
    return Effect.gen(
      function* () {
        const componentName = this.getComponentName(element.element)

        // Simple layout computation
        const layout: LayoutInfo = {
          x: 0,
          y: 0,
          width: this.terminalSize.width,
          height: 1,
          visible: true,
          zIndex: 0,
        }

        // Apply padding and margin
        if (element.computedStyles.padding) {
          layout.width -= element.computedStyles.padding * 2
        }
        if (element.computedStyles.margin) {
          layout.x += element.computedStyles.margin
          layout.y += element.computedStyles.margin
          layout.width -= element.computedStyles.margin * 2
        }

        this.layouts.set(componentName, layout)

        yield* this.emitLayoutComputed(componentName, layout)

        return layout
      }.bind(this)
    )
  }

  /**
   * Recompute all layouts
   */
  private recomputeLayouts(dimensions: { width: number; height: number }): Effect<void, never> {
    return Effect.gen(
      function* () {
        // Invalidate all layouts
        for (const [component] of this.layouts) {
          yield* this.emitLayoutInvalidated(component, 'resize')
        }

        // Clear layout cache
        this.layouts.clear()
      }.bind(this)
    )
  }

  /**
   * Recompute all styles
   */
  private recomputeAllStyles(): Effect<void, never> {
    return Effect.gen(
      function* () {
        // Theme changed, need to recompute everything
        yield* this.emitThemeChanged(this.currentTheme, this.themes.get(this.currentTheme)!)
      }.bind(this)
    )
  }

  /**
   * Create default theme
   */
  private createDefaultTheme(): ThemeConfig {
    return {
      name: 'default',
      colors: {
        primary: '#007acc',
        secondary: '#6c757d',
        background: '#000000',
        foreground: '#ffffff',
        error: '#dc3545',
        warning: '#ffc107',
        success: '#28a745',
        info: '#17a2b8',
      },
    }
  }

  /**
   * Get component name from element
   */
  private getComponentName(element: JSX.Element): string {
    // Simplified - in real implementation would extract from element type
    return 'component'
  }

  /**
   * Compute styles from definition and theme
   */
  private computeStyles(styleDef: StyleDef | undefined, theme: ThemeConfig): ComputedStyles {
    const baseStyles: ComputedStyles = {
      foreground: theme.colors.foreground,
      background: theme.colors.background,
    }

    if (styleDef) {
      return { ...baseStyles, ...styleDef.styles }
    }

    return baseStyles
  }

  /**
   * Apply responsive styles
   */
  private applyResponsiveStyles(
    styleDef: StyleDef | undefined,
    size: { width: number; height: number }
  ): Partial<ComputedStyles> {
    if (!styleDef?.responsive) return {}

    if (size.width < 40 && styleDef.responsive.small) {
      return styleDef.responsive.small
    } else if (size.width < 80 && styleDef.responsive.medium) {
      return styleDef.responsive.medium
    } else if (styleDef.responsive.large) {
      return styleDef.responsive.large
    }

    return {}
  }

  // Event emission helpers

  emitStyleApplied(component: string, styles: ComputedStyles): Effect<void, never> {
    return this.emitEvent<StyleEvent>(StylingEventChannels.STYLE, {
      type: 'style-applied',
      component,
      styles,
    })
  }

  emitThemeChanged(
    themeName: string,
    themeConfig: ThemeConfig,
    previousTheme?: string
  ): Effect<void, never> {
    return this.emitEvent<ThemeEvent>(StylingEventChannels.THEME, {
      type: 'theme-switched',
      themeName,
      themeConfig,
      previousTheme,
    })
  }

  emitThemeLoaded(themeName: string, themeConfig: ThemeConfig): Effect<void, never> {
    return this.emitEvent<ThemeEvent>(StylingEventChannels.THEME, {
      type: 'theme-loaded',
      themeName,
      themeConfig,
    })
  }

  emitLayoutComputed(component: string, layout: LayoutInfo): Effect<void, never> {
    return this.emitEvent<StyleEvent>(StylingEventChannels.STYLE, {
      type: 'layout-computed',
      component,
      layout,
    })
  }

  emitLayoutInvalidated(
    component: string,
    reason: 'resize' | 'style-change' | 'hierarchy-change'
  ): Effect<void, never> {
    return this.emitEvent<LayoutEvent>(StylingEventChannels.LAYOUT, {
      type: 'layout-invalidated',
      component,
      reason,
    })
  }
}
