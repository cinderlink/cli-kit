/**
 * Components Module - Pre-built UI components for CLI-Kit
 * 
 * This module exports ready-to-use components that follow the
 * Bubbletea-inspired patterns and integrate with the styling system.
 * 
 * Also includes simplified component builders for easier usage.
 */

// Simplified Component API (Svelte 5-inspired)
export {
  // Component creation
  createComponent,
  wrapComponent,
  functional,
  reactive,
  
  // Reactivity primitives
  $state,
  $derived,
  $effect,
  $memo,
  $debounced,
  $throttled,
  createStore,
  batch,
  
  // Lifecycle hooks
  onMount,
  onDestroy,
  beforeUpdate,
  afterUpdate,
  useInterval,
  useTimeout,
  useAsyncEffect,
  usePrevious,
  tick,
  
  // Simplified component builders
  Panel,
  HeaderPanel,
  InfoPanel,
  SuccessPanel,
  WarningPanel,
  ErrorPanel,
  Card,
  Sidebar,
  StatusPanel,
  CollapsiblePanel,
  ThemedPanel,
  FloatingPanel,
  
  // Button builders (aliased to avoid conflict with Button component)
  Button as SimpleButton,
  PrimaryButton,
  SecondaryButton,
  SuccessButton,
  DangerButton,
  WarningButton,
  InfoButton,
  GhostButton,
  IconButton,
  SmallButton,
  LargeButton,
  DisabledButton,
  LoadingButton,
  FullWidthButton,
  ButtonGroup,
  SubmitCancelButtons,
  YesNoButtons
} from "./builders/index"

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
} from "./base"

// Box component
export {
  type BoxModel,
  type BoxMsg,
  Box
} from "./Box.ts"

// Text component  
export {
  type TextModel,
  type TextMsg,
  Text
} from "./Text.ts"

// TextInput component - unified with rune support
export {
  type TextInputModel,
  type TextInputMsg,
  type TextInputOptions,
  type TextInputStyles,
  TextInput,
  TextInputComponent,
  EchoMode,
  CursorStyle,
  textInput,
  emailInput,
  passwordInput,
  numberInput
} from "./TextInput.ts"

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
} from "./Button"

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
} from "./List"

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

// Modal component
export {
  type ModalConfig,
  type ModalModel,
  type ModalMsg,
  modal,
  createInfoModal,
  createConfirmModal,
  createErrorModal,
  createLoadingModal
} from "./Modal.ts"

// Viewport component  
export {
  type ViewportConfig,
  type ViewportModel,
  type ViewportMsg,
  viewport,
  createTextContent,
  createGridContent,
  createNumberedContent
} from "./Viewport.ts"

// FilePicker component
export {
  type FileItem,
  type FilePickerConfig,
  type FilePickerModel,
  type FilePickerMsg,
  filePicker
} from "./FilePicker.ts"

// Help component
export {
  type KeyBinding as HelpKeyBinding, // Aliased to avoid conflict with base.ts
  type HelpSection,
  type HelpConfig,
  type HelpModel,
  type HelpMsg,
  help,
  getDefaultKeybindings,
  createHelpModal,
  createHelpPanel,
  createContextHelp
} from "./Help.ts"

// LargeText components
export {
  type LargeTextOptions,
  type LargeGradientTextOptions,
  type LargeAnimatedGradientTextOptions,
  type LargeTextGradientConfig,
  largeText,
  largeGradientText,
  largeAnimatedGradientText,
  gradientPresets
} from "./LargeText.ts"
