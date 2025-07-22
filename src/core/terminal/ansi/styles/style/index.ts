/**
 * Style System
 * 
 * Immutable, chainable styling API for terminal UI
 */

// Re-export all style functionality
export * from "./types"
export { Style } from "./builder"
export { style, styleFrom, Styles } from "./factory"