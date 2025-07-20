/**
 * Tuix Components - Complete UI Component Library
 * 
 * Organized by category for easy discovery and use:
 * 
 * ## Forms
 * - TextInput: Text input with validation and echo modes
 * - Button: Interactive buttons with variants
 * 
 * ## Layout
 * - Box: Flexible container with borders and padding
 * - Flex: Flexbox-like layouts (Row, Column, etc.)
 * 
 * ## Display
 * - Text: Rich text with colors and styles
 * - LargeText: ASCII art text with gradients
 * - MarkdownRenderer: Render markdown content
 * 
 * ## Feedback
 * - Spinner: Loading indicators
 * - ProgressBar: Progress indicators
 * - Modal: Dialog boxes
 * 
 * ## Navigation
 * - Tabs: Tabbed interfaces
 * - Help: Context-aware help
 * 
 * ## Data
 * - Table: Data tables with sorting
 * - List: Selectable lists
 * 
 * ## Containers
 * - Viewport: Scrollable content areas
 * - Panel: Various panel types
 * 
 * @example
 * ```tsx
 * import { Button, TextInput, Box, Text } from 'tuix/components'
 * 
 * function MyApp() {
 *   const name = $state('')
 *   
 *   return (
 *     <Box padding={2} border="rounded">
 *       <Text bold>Enter your name:</Text>
 *       <TextInput bind:value={name} />
 *       <Button onClick={() => console.log(name.value)}>
 *         Submit
 *       </Button>
 *     </Box>
 *   )
 * }
 * ```
 */

// Forms
export * from './forms'

// Layout
export * from './layout'

// Display
export * from './display'

// Feedback
export * from './feedback'

// Data
export * from './data'

// Navigation
export * from './navigation'

// Containers
export * from './containers'

// System
export * from './system'

// JSX CLI Components (for JSX transform)
export { CLI, Plugin, Command, Arg, Flag, Help, Example, LoadPlugin } from '../jsx/app'

// Re-export legacy TEA components for backward compatibility
// These are now in src/tea/ but re-exported here for compatibility
export * from '../tea/base'
export * from '../tea/component'
export * from '../tea/reactivity'
export * from '../tea/mouse-aware'

// Builder components - removed (duplicates)

// Stream components
export * from './streams'

// CLI components (re-exported for convenience)
export * from '../cli/jsx/components'

// Convenience re-exports for common components
export { 
  // Forms
  TextInput, 
  Button, 
  ButtonGroup,
  FilePicker
} from './forms'

export {
  // Layout
  Box, 
  Flex, 
  Row, 
  Column, 
  Stack,
  Grid,
  Spacer
} from './layout'

export {
  // Display
  Text,
  Heading,
  Code,
  Link,
  Success,
  Error,
  Warning,
  Info
} from './display'

export {
  // Feedback
  Spinner,
  Modal,
  InfoModal,
  ConfirmModal,
  LoadingModal,
  ErrorModal,
  progressBar,
  simpleProgressBar,
  fancyProgressBar
} from './feedback'

export {
  // Data
  Table,
  SimpleTable,
  List,
  SingleSelectList,
  MultiSelectList,
  FilterBox,
  FilterableContent,
  LOG_FILTER_PRESETS,
  PROCESS_FILTER_PRESETS
} from './data'

export {
  // Navigation
  Tabs,
  SimpleTabs,
  ViewTabs,
  help
} from './navigation'

export {
  // Containers
  Viewport,
  viewport,
  ScrollableBox,
  ScrollableLogBox,
  ScrollableProcessList
} from './containers'

export {
  // System
  Exit
} from './system'