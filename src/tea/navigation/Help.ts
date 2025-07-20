/**
 * Help Component - Display keybindings and help information
 * 
 * Features:
 * - Keyboard shortcut display with descriptions
 * - Organized sections (General, Navigation, etc.)
 * - Modal overlay or inline display modes
 * - Customizable styling and layout
 * - Search/filter functionality
 * - Contextual help based on current mode
 */

import { Effect } from "effect"
import type { View, Cmd, AppServices, KeyEvent } from "../../core/types"
import { text, vstack, hstack, styledText } from "../../core/view"
import { style, Colors, Borders, type Style } from "../../styling/index"
import { styledBox } from "../../layout/box"
import { stringWidth } from "../../utils/string-width"

// =============================================================================
// Types
// =============================================================================

export interface KeyBinding {
  readonly key: string
  readonly description: string
  readonly category?: string
  readonly context?: string
}

export interface HelpSection {
  readonly title: string
  readonly bindings: KeyBinding[]
  readonly description?: string
}

export interface HelpConfig {
  readonly title?: string
  readonly width?: number
  readonly height?: number
  readonly showAsModal?: boolean
  readonly showCategories?: boolean
  readonly showSearch?: boolean
  readonly maxKeyWidth?: number
  readonly style?: Style
  readonly headerStyle?: Style
  readonly keyStyle?: Style
  readonly descriptionStyle?: Style
  readonly categoryStyle?: Style
}

export interface HelpModel {
  readonly config: HelpConfig
  readonly sections: HelpSection[]
  readonly isOpen: boolean
  readonly searchQuery: string
  readonly filteredSections: HelpSection[]
  readonly selectedIndex: number
  readonly showSearch: boolean
  readonly terminalWidth: number
  readonly terminalHeight: number
}

export type HelpMsg =
  | { readonly _tag: "Open" }
  | { readonly _tag: "Close" }
  | { readonly _tag: "ToggleSearch" }
  | { readonly _tag: "SetSearchQuery"; readonly query: string }
  | { readonly _tag: "ClearSearch" }
  | { readonly _tag: "NavigateUp" }
  | { readonly _tag: "NavigateDown" }
  | { readonly _tag: "NavigatePageUp" }
  | { readonly _tag: "NavigatePageDown" }
  | { readonly _tag: "SetSections"; readonly sections: HelpSection[] }
  | { readonly _tag: "SetTerminalSize"; readonly width: number; readonly height: number }

// =============================================================================
// Default Configuration
// =============================================================================

const defaultConfig: HelpConfig = {
  title: "Help & Keyboard Shortcuts",
  width: 70,
  height: 25,
  showAsModal: true,
  showCategories: true,
  showSearch: true,
  maxKeyWidth: 15,
  style: style().background(Colors.black).foreground(Colors.white),
  headerStyle: style().foreground(Colors.brightBlue).bold(),
  keyStyle: style().foreground(Colors.yellow).bold(),
  descriptionStyle: style().foreground(Colors.white),
  categoryStyle: style().foreground(Colors.brightCyan).bold()
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Calculate total number of bindings in filtered sections
 */
const getTotalBindings = (sections: HelpSection[]): number => {
  return sections.reduce((sum, section) => sum + section.bindings.length, 0)
}

/**
 * Calculate page size based on height config
 */
const getPageSize = (height?: number): number => {
  return Math.floor((height ?? defaultConfig.height ?? 25) / 4)
}

/**
 * Clamp index within valid range
 */
const clampIndex = (index: number, max: number): number => {
  return Math.max(0, Math.min(index, max - 1))
}

/**
 * Filter sections based on search query
 */
const filterSections = (sections: HelpSection[], query: string): HelpSection[] => {
  if (!query.trim()) {
    return sections
  }
  
  const lowerQuery = query.toLowerCase()
  
  return sections
    .map(section => ({
      ...section,
      bindings: section.bindings.filter(binding =>
        binding.key.toLowerCase().includes(lowerQuery) ||
        binding.description.toLowerCase().includes(lowerQuery) ||
        (binding.category && binding.category.toLowerCase().includes(lowerQuery))
      )
    }))
    .filter(section => section.bindings.length > 0)
}

/**
 * Format a key binding for display
 */
const formatKeyBinding = (
  binding: KeyBinding,
  maxKeyWidth: number,
  keyStyle: Style,
  descriptionStyle: Style
): View => {
  const keyPart = binding.key.padEnd(maxKeyWidth)
  const separator = " • "
  
  return hstack(
    styledText(keyPart, keyStyle),
    styledText(separator, style().foreground(Colors.gray)),
    styledText(binding.description, descriptionStyle)
  )
}

/**
 * Create section header
 */
const createSectionHeader = (
  title: string,
  description: string | undefined,
  categoryStyle: Style
): View[] => {
  const views: View[] = [
    text(""),
    styledText(`▶ ${title}`, categoryStyle)
  ]
  
  if (description) {
    views.push(styledText(`  ${description}`, style().foreground(Colors.gray)))
  }
  
  views.push(text(""))
  
  return views
}

/**
 * Create search input display
 */
const createSearchInput = (
  query: string,
  width: number,
  active: boolean
): View => {
  const prefix = "Search: "
  const maxQueryWidth = width - stringWidth(prefix) - 4
  
  let displayQuery = query
  if (stringWidth(query) > maxQueryWidth) {
    displayQuery = query.substring(query.length - maxQueryWidth)
  }
  
  const cursor = active ? "│" : ""
  const searchStyle = active 
    ? style().background(Colors.blue).foreground(Colors.white)
    : style().foreground(Colors.gray)
    
  return styledBox(
    hstack(
      styledText(prefix, style().foreground(Colors.yellow)),
      styledText(displayQuery + cursor, searchStyle)
    ),
    {
      border: Borders.Rounded,
      padding: { top: 0, right: 1, bottom: 0, left: 1 },
      style: style().foreground(Colors.gray)
    }
  )
}

/**
 * Get commonly used keybindings for default help
 */
export const getDefaultKeybindings = (): HelpSection[] => [
  {
    title: "General",
    description: "Basic application controls",
    bindings: [
      { key: "q", description: "Quit application", category: "general" },
      { key: "Ctrl+C", description: "Force quit", category: "general" },
      { key: "Escape", description: "Close dialog/cancel", category: "general" },
      { key: "?", description: "Show/hide help", category: "general" },
      { key: "F1", description: "Show help", category: "general" }
    ]
  },
  {
    title: "Navigation",
    description: "Moving around the interface",
    bindings: [
      { key: "↑/k", description: "Move up", category: "navigation" },
      { key: "↓/j", description: "Move down", category: "navigation" },
      { key: "←/h", description: "Move left", category: "navigation" },
      { key: "→/l", description: "Move right", category: "navigation" },
      { key: "Home", description: "Go to first item", category: "navigation" },
      { key: "End", description: "Go to last item", category: "navigation" },
      { key: "Page Up", description: "Page up", category: "navigation" },
      { key: "Page Down", description: "Page down", category: "navigation" }
    ]
  },
  {
    title: "Selection",
    description: "Selecting and activating items",
    bindings: [
      { key: "Enter", description: "Select/activate item", category: "selection" },
      { key: "Space", description: "Toggle selection", category: "selection" },
      { key: "Tab", description: "Next selectable item", category: "selection" },
      { key: "Shift+Tab", description: "Previous selectable item", category: "selection" },
      { key: "Ctrl+A", description: "Select all", category: "selection" }
    ]
  },
  {
    title: "Editing",
    description: "Text editing and manipulation",
    bindings: [
      { key: "Ctrl+C", description: "Copy", category: "editing" },
      { key: "Ctrl+V", description: "Paste", category: "editing" },
      { key: "Ctrl+X", description: "Cut", category: "editing" },
      { key: "Ctrl+Z", description: "Undo", category: "editing" },
      { key: "Ctrl+Y", description: "Redo", category: "editing" },
      { key: "Delete", description: "Delete character", category: "editing" },
      { key: "Backspace", description: "Delete previous character", category: "editing" }
    ]
  }
]

// =============================================================================
// Component
// =============================================================================

export const help = (config: Partial<HelpConfig> = {}, sections?: HelpSection[]): {
  init: Effect.Effect<[HelpModel, Cmd<HelpMsg>[]], never, AppServices>
  update: (msg: HelpMsg, model: HelpModel) => Effect.Effect<[HelpModel, Cmd<HelpMsg>[]], never, AppServices>
  view: (model: HelpModel) => View
  handleKey?: (key: KeyEvent, model: HelpModel) => HelpMsg | null
} => {
  const finalConfig = { ...defaultConfig, ...config }
  const defaultSections = sections ?? getDefaultKeybindings()
  
  return {
    init: Effect.succeed([
      {
        config: finalConfig,
        sections: defaultSections,
        isOpen: false,
        searchQuery: "",
        filteredSections: defaultSections,
        selectedIndex: 0,
        showSearch: false,
        terminalWidth: 80,
        terminalHeight: 24
      },
      []
    ]),
    
    update(msg: HelpMsg, model: HelpModel) {
      switch (msg._tag) {
        case "Open":
          return Effect.succeed([
            {
              ...model,
              isOpen: true,
              filteredSections: filterSections(model.sections, model.searchQuery)
            },
            []
          ])
        
        case "Close":
          return Effect.succeed([
            {
              ...model,
              isOpen: false,
              showSearch: false,
              searchQuery: "",
              filteredSections: model.sections
            },
            []
          ])
        
        case "ToggleSearch":
          const newShowSearch = !model.showSearch
          return Effect.succeed([
            {
              ...model,
              showSearch: newShowSearch,
              searchQuery: newShowSearch ? model.searchQuery : "",
              filteredSections: newShowSearch 
                ? filterSections(model.sections, model.searchQuery)
                : model.sections
            },
            []
          ])
        
        case "SetSearchQuery":
          const filtered = filterSections(model.sections, msg.query)
          return Effect.succeed([
            {
              ...model,
              searchQuery: msg.query,
              filteredSections: filtered,
              selectedIndex: 0
            },
            []
          ])
        
        case "ClearSearch":
          return Effect.succeed([
            {
              ...model,
              searchQuery: "",
              filteredSections: model.sections,
              selectedIndex: 0
            },
            []
          ])
        
        case "NavigateUp":
          return Effect.succeed([
            {
              ...model,
              selectedIndex: Math.max(0, model.selectedIndex - 1)
            },
            []
          ])
        
        case "NavigateDown":
          const totalBindings = getTotalBindings(model.filteredSections)
          return Effect.succeed([
            {
              ...model,
              selectedIndex: clampIndex(model.selectedIndex + 1, totalBindings)
            },
            []
          ])
        
        case "NavigatePageUp":
          const pageSize = getPageSize(model.config.height)
          return Effect.succeed([
            {
              ...model,
              selectedIndex: Math.max(0, model.selectedIndex - pageSize)
            },
            []
          ])
        
        case "NavigatePageDown":
          const totalBindingsDown = getTotalBindings(model.filteredSections)
          const pageSizeDown = getPageSize(model.config.height)
          return Effect.succeed([
            {
              ...model,
              selectedIndex: clampIndex(model.selectedIndex + pageSizeDown, totalBindingsDown)
            },
            []
          ])
        
        case "SetSections":
          const newFiltered = filterSections(msg.sections, model.searchQuery)
          const newTotal = getTotalBindings(newFiltered)
          return Effect.succeed([
            {
              ...model,
              sections: msg.sections,
              filteredSections: newFiltered,
              selectedIndex: clampIndex(model.selectedIndex, newTotal)
            },
            []
          ])
        
        case "SetTerminalSize":
          return Effect.succeed([
            {
              ...model,
              terminalWidth: msg.width,
              terminalHeight: msg.height
            },
            []
          ])
      }
    },
    
    view(model: HelpModel): View {
      if (!model.isOpen) {
        return text("") // Empty view when help is closed
      }
      
      const { config } = model
      const width = config.width ?? defaultConfig.width ?? 70
      const height = config.height ?? defaultConfig.height ?? 25
      const maxKeyWidth = config.maxKeyWidth ?? defaultConfig.maxKeyWidth ?? 15
      
      const headerStyle = config.headerStyle ?? defaultConfig.headerStyle ?? style()
      const keyStyle = config.keyStyle ?? defaultConfig.keyStyle ?? style()
      const descriptionStyle = config.descriptionStyle ?? defaultConfig.descriptionStyle ?? style()
      const categoryStyle = config.categoryStyle ?? defaultConfig.categoryStyle ?? style()
      const mainStyle = config.style ?? defaultConfig.style ?? style()
      
      const content: View[] = []
      
      // Title
      if (config.title) {
        content.push(styledText(config.title, headerStyle))
        content.push(text(""))
      }
      
      // Search input
      if (config.showSearch && model.showSearch) {
        content.push(createSearchInput(model.searchQuery, width - 4, true))
        content.push(text(""))
      }
      
      // Help sections
      for (const section of model.filteredSections) {
        if (config.showCategories) {
          content.push(...createSectionHeader(section.title, section.description, categoryStyle))
        }
        
        for (const binding of section.bindings) {
          content.push(
            hstack(
              text("  "), // Indentation
              formatKeyBinding(binding, maxKeyWidth, keyStyle, descriptionStyle)
            )
          )
        }
      }
      
      // Help instructions
      content.push(text(""))
      content.push(text(""))
      content.push(styledText("Controls:", style().foreground(Colors.yellow).bold()))
      content.push(styledText("  ↑↓: Navigate • /: Search • Escape: Close", style().foreground(Colors.gray)))
      
      if (config.showAsModal) {
        return styledBox(
          vstack(...content),
          {
            border: Borders.Rounded,
            padding: { top: 1, right: 2, bottom: 1, left: 2 },
            minWidth: width,
            minHeight: height,
            style: mainStyle
          }
        )
      } else {
        return vstack(...content)
      }
    },
    
    handleKey(key: KeyEvent, model: HelpModel): HelpMsg | null {
      if (!model.isOpen) {
        return null
      }
      
      if (model.showSearch) {
        // Search mode key handling
        switch (key.key) {
          case 'escape':
            return { _tag: "ToggleSearch" }
          case 'enter':
            return { _tag: "ToggleSearch" }
          case 'backspace':
            if (model.searchQuery.length > 0) {
              return { _tag: "SetSearchQuery", query: model.searchQuery.slice(0, -1) }
            }
            break
          default:
            if (key.key.length === 1 && !key.ctrl && !key.alt) {
              return { _tag: "SetSearchQuery", query: model.searchQuery + key.key }
            }
        }
      } else {
        // Navigation mode key handling
        switch (key.key) {
          case 'escape':
            return { _tag: "Close" }
          case 'up':
          case 'k':
            return { _tag: "NavigateUp" }
          case 'down':
          case 'j':
            return { _tag: "NavigateDown" }
          case 'pageup':
            return { _tag: "NavigatePageUp" }
          case 'pagedown':
            return { _tag: "NavigatePageDown" }
          case '/':
            if (model.config.showSearch) {
              return { _tag: "ToggleSearch" }
            }
            break
          case 'c':
            if (key.ctrl) {
              return { _tag: "ClearSearch" }
            }
            break
        }
      }
      
      return null
    }
  }
}

// =============================================================================
// Helper Functions for Common Use Cases
// =============================================================================

/**
 * Create a modal help dialog with default keybindings
 */
export const createHelpModal = (
  title?: string,
  customSections?: HelpSection[]
): {
  component: ReturnType<typeof help>
  openEffect: Effect.Effect<HelpMsg, never, never>
} => {
  const component = help(
    {
      title: title ?? "Help & Keyboard Shortcuts",
      showAsModal: true,
      showSearch: true,
      width: 75,
      height: 30
    },
    customSections
  )
  
  const openEffect = Effect.succeed({ _tag: "Open" as const })
  
  return { component, openEffect }
}

/**
 * Create an inline help panel (non-modal)
 */
export const createHelpPanel = (
  sections?: HelpSection[],
  config?: Partial<HelpConfig>
): ReturnType<typeof help> => {
  return help(
    {
      showAsModal: false,
      showCategories: true,
      showSearch: false,
      ...config
    },
    sections
  )
}

/**
 * Create context-sensitive help for specific components
 */
export const createContextHelp = (
  context: string,
  bindings: KeyBinding[]
): HelpSection => {
  return {
    title: `${context} Controls`,
    description: `Keyboard shortcuts for ${context.toLowerCase()}`,
    bindings: bindings.map(binding => ({ ...binding, context }))
  }
}