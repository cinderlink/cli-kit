/**
 * Components Module - Pre-built UI components for CLI-Kit
 * 
 * This module exports ready-to-use components that follow the
 * Bubbletea-inspired patterns and integrate with the styling system.
 */

// Base component types and utilities
export {
  type UIComponent,
  type ComponentStyles,
  type Focusable,
  type Sized,
  type Disableable,
  type KeyBinding,
  type KeyMap,
  type CommonMsg,
  type ComponentOptions,
  keyBinding,
  matchKeyBinding,
  generateComponentId,
  createDefaultStyles
} from "./base.ts"

// TextInput component
export {
  type TextInputModel,
  type TextInputMsg,
  type TextInputOptions,
  type TextInputStyles,
  TextInput,
  EchoMode,
  textInput,
  emailInput,
  passwordInput
} from "./TextInput-clean.ts"

// Button component
export {
  type ButtonModel,
  type ButtonMsg,
  type ButtonOptions,
  type ButtonStyles,
  Button,
  ButtonVariant,
  button,
  primaryButton,
  secondaryButton,
  successButton,
  dangerButton,
  warningButton,
  ghostButton
} from "./button.ts"

// List component
export {
  type ListItem,
  type ListModel,
  type ListMsg,
  type ListOptions,
  type ListStyles,
  List,
  list,
  singleSelectList,
  multiSelectList
} from "./list.ts"

// Spinner component
export {
  type SpinnerModel,
  type SpinnerMsg,
  SpinnerStyle,
  spinner,
  loadingSpinner,
  processingSpinner,
  savingSpinner,
  errorSpinner
} from "./Spinner.ts"

// ProgressBar component
export {
  type ProgressBarModel,
  type ProgressBarMsg,
  type ProgressBarStyle,
  progressBar,
  simpleProgressBar,
  fancyProgressBar,
  asciiProgressBar,
  loadingBar,
  setProgress,
  defaultProgressBarStyle,
  fancyProgressBarStyle,
  asciiProgressBarStyle
} from "./ProgressBar.ts"

// Table component
export {
  type TableModel,
  type TableMsg,
  type TableColumn,
  type TableRow,
  type TableSort,
  type TableFilter,
  TableSelectionMode,
  table,
  createColumn,
  createRow,
  simpleTable
} from "./Table.ts"

// Tabs component
export {
  type Tab,
  type TabStyles,
  type TabsModel,
  type TabsMsg,
  tabs,
  createTab,
  stringTabs,
  viewTabs,
  defaultTabStyles
} from "./Tabs.ts"