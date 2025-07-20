/**
 * TUIX Component Library
 */

// =============================================================================
// JSX Components (Declarative)
// =============================================================================
export { Box } from './jsx/Box'
export { Text } from './jsx/Text'

// =============================================================================
// Imperative Components & Utilities
// =============================================================================
export { largeText } from './LargeText'
export { list } from './List'
export { button } from './Button'
export { textInput } from './TextInput'
export { ExitComponent as exit } from './Exit'
export { filePicker } from './FilePicker'
export { help } from './Help'
export { MarkdownRenderer } from './MarkdownRenderer'
export { modal } from './Modal'
export { spinner } from './Spinner'
export { progressBar } from './ProgressBar'
export { table } from './Table'
export { tabs } from './Tabs'
export { viewport } from './Viewport'

// Component utilities
export {
  type UIComponent,
  type ComponentStyles,
  type Focusable,
  type Sized,
  type KeyMap,
  keyBinding,
  matchKeyBinding,
  generateComponentId,
  createDefaultStyles
} from "./base"

// Reactivity integration
export * from './reactivity'

// Interactive Components
export * from './interactive'