/**
 * Style System - Immutable, chainable styling API inspired by Lipgloss
 *
 * This module provides the core styling system for TUIX, featuring an immutable,
 * chainable API that makes it easy to build complex styles declaratively.
 *
 * ## Key Features:
 *
 * ### Immutable Design
 * - All style operations return new Style instances
 * - No side effects or shared state
 * - Safe for concurrent use and caching
 *
 * ### Chainable API
 * - Fluent interface for building styles
 * - Method chaining for complex configurations
 * - Readable and expressive syntax
 *
 * ### Comprehensive Properties
 * - Colors: foreground, background with full color space support
 * - Typography: bold, italic, underline, and other text decorations
 * - Layout: padding, margin, borders, dimensions
 * - Alignment: horizontal and vertical positioning
 * - Transforms: text transformation and custom functions
 *
 * ### Style Inheritance
 * - Parent-child style relationships
 * - Automatic property inheritance for appropriate styles
 * - Override and composition patterns
 *
 * ### Performance Optimization
 * - Built-in caching for expensive operations
 * - Efficient style resolution and merging
 * - Minimal object allocations
 *
 * @example
 * ```typescript
 * import { style, Colors, Borders } from './styling'
 *
 * // Basic styling
 * const basicStyle = style()
 *   .foreground(Colors.blue)
 *   .bold()
 *
 * // Complex styling with layout
 * const complexStyle = style()
 *   .foreground(Colors.white)
 *   .background(Colors.blue)
 *   .padding(2, 4)
 *   .border(Borders.Rounded)
 *   .align('center')
 *
 * // Style composition
 * const inheritedStyle = complexStyle
 *   .inherit()
 *   .foreground(Colors.yellow)
 * ```
 *
 * @module
 */

// Re-export everything from the style module
export * from './style/index'
