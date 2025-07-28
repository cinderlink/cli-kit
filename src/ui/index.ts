/**
 * User Interface Module
 *
 * This module provides the complete UI system for building terminal applications
 * with Tuix. It includes components, patterns, themes, and utilities for creating
 * rich interactive user interfaces in the terminal.
 *
 * @example
 * ```typescript
 * import { components } from 'tuix/ui'
 *
 * const { Button, Modal, Table } = components
 * ```
 */

// Core UI Components
export * as components from './components/index.js'
export * from './components/index.js'

// Re-export commonly used components at the top level for convenience
export { Button } from './components/forms/button/index.js'
export { Modal } from './components/feedback/modal/index.js'
export { Table } from './components/data/table/index.js'
export { Text } from './components/display/text/index.js'
export { Box } from './components/layout/box/index.js'
export { Flex } from './components/layout/flex/index.js'
