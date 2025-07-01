/**
 * List Component - Scrollable, selectable list of items
 * 
 * Inspired by bubbles/list, this component provides:
 * - Single/multi selection
 * - Keyboard navigation
 * - Item filtering
 * - Custom item rendering
 * - Pagination support
 * - Status messages
 * - Scrollable viewport
 */

import { Effect, Option, pipe } from "effect"
import type { View, Cmd, AppServices, KeyEvent } from "@/core/types.ts"
import { KeyUtils } from "@/core/keys.ts"
import { View as ViewUtils } from "@/core/index.ts"
import { style, Colors, Borders, renderStyledSync, type Style } from "@/styling/index.ts"
import {
  type UIComponent,
  type ComponentStyles,
  type Focusable,
  type Sized,
  type KeyMap,
  keyBinding,
  matchKeyBinding,
  generateComponentId,
  createDefaultStyles
} from "./base.ts"

// =============================================================================
// Types
// =============================================================================

/**
 * List item interface
 */
export interface ListItem<T = unknown> {
  readonly id: string
  readonly label: string
  readonly value: T
  readonly disabled?: boolean
}

/**
 * List model
 */
export interface ListModel<T> extends Focusable, Sized {
  readonly id: string
  readonly items: ReadonlyArray<ListItem<T>>
  readonly cursor: number
  readonly selected: Set<string>
  readonly multiSelect: boolean
  readonly filter: string
  readonly filteredIndices: ReadonlyArray<number>
  readonly viewportStart: number
  readonly viewportHeight: number
  readonly showStatusBar: boolean
  readonly showFilter: boolean
  readonly filterFocused: boolean
}

/**
 * List messages
 */
export type ListMsg =
  | { _tag: "CursorUp" }
  | { _tag: "CursorDown" }
  | { _tag: "CursorFirst" }
  | { _tag: "CursorLast" }
  | { _tag: "PageUp" }
  | { _tag: "PageDown" }
  | { _tag: "Select" }
  | { _tag: "SelectAll" }
  | { _tag: "DeselectAll" }
  | { _tag: "ToggleItem"; index: number }
  | { _tag: "SetFilter"; filter: string }
  | { _tag: "ClearFilter" }
  | { _tag: "ToggleFilter" }
  | { _tag: "Focus" }
  | { _tag: "Blur" }

/**
 * List configuration options
 */
export interface ListOptions<T> {
  readonly id?: string
  readonly items?: ReadonlyArray<ListItem<T>>
  readonly multiSelect?: boolean
  readonly height?: number
  readonly showStatusBar?: boolean
  readonly showFilter?: boolean
  readonly styles?: Partial<ListStyles>
  readonly itemRenderer?: (item: ListItem<T>, selected: boolean, focused: boolean) => string
}

/**
 * List specific styles
 */
export interface ListStyles extends ComponentStyles {
  readonly item: Style
  readonly selectedItem: Style
  readonly cursorItem: Style
  readonly disabledItem: Style
  readonly statusBar: Style
  readonly filter: Style
  readonly noItems: Style
}

// =============================================================================
// Key Bindings
// =============================================================================

const createKeyMap = (): KeyMap<ListMsg> => ({
  up: keyBinding(["up", "k", "ctrl+p"], ["↑", "Move up"], { _tag: "CursorUp" }),
  down: keyBinding(["down", "j", "ctrl+n"], ["↓", "Move down"], { _tag: "CursorDown" }),
  home: keyBinding(["home", "g"], ["Home", "Go to first"], { _tag: "CursorFirst" }),
  end: keyBinding(["end", "G"], ["End", "Go to last"], { _tag: "CursorLast" }),
  pageUp: keyBinding(["pageup", "ctrl+b"], ["PgUp", "Page up"], { _tag: "PageUp" }),
  pageDown: keyBinding(["pagedown", "ctrl+f"], ["PgDn", "Page down"], { _tag: "PageDown" }),
  select: keyBinding(["enter", " "], ["Enter", "Select item"], { _tag: "Select" }),
  selectAll: keyBinding(["ctrl+a"], ["Ctrl+A", "Select all"], { _tag: "SelectAll" }),
  deselectAll: keyBinding(["ctrl+d"], ["Ctrl+D", "Deselect all"], { _tag: "DeselectAll" }),
  filter: keyBinding(["/"], ["/", "Toggle filter"], { _tag: "ToggleFilter" }),
  clearFilter: keyBinding(["escape"], ["Esc", "Clear filter"], { _tag: "ClearFilter" })
})

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Filter items based on the filter string
 */
const filterItems = <T>(
  items: ReadonlyArray<ListItem<T>>,
  filter: string
): ReadonlyArray<number> => {
  if (!filter) {
    return items.map((_, i) => i)
  }
  
  const lowerFilter = filter.toLowerCase()
  return items
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => item.label.toLowerCase().includes(lowerFilter))
    .map(({ index }) => index)
}

/**
 * Calculate viewport bounds
 */
const calculateViewport = (
  cursor: number,
  viewportStart: number,
  viewportHeight: number,
  totalItems: number
): number => {
  if (totalItems === 0) return 0
  
  // If cursor is above viewport, scroll up
  if (cursor < viewportStart) {
    return cursor
  }
  
  // If cursor is below viewport, scroll down
  if (cursor >= viewportStart + viewportHeight) {
    return Math.max(0, cursor - viewportHeight + 1)
  }
  
  // Cursor is within viewport
  return viewportStart
}

// =============================================================================
// List Component
// =============================================================================

export class List<T> implements UIComponent<ListModel<T>, ListMsg> {
  private keyMap: KeyMap<ListMsg>
  private styles: ListStyles
  private itemRenderer?: (item: ListItem<T>, selected: boolean, focused: boolean) => string
  
  constructor(options: ListOptions<T> = {}) {
    this.keyMap = createKeyMap()
    this.styles = this.createStyles(options.styles)
    this.itemRenderer = options.itemRenderer
  }
  
  private createStyles(overrides?: Partial<ListStyles>): ListStyles {
    const base = createDefaultStyles()
    
    return {
      ...base,
      item: style(),
      selectedItem: style()
        .foreground(Colors.white)
        .background(Colors.blue),
      cursorItem: style()
        .bold(),
      disabledItem: style()
        .faint(),
      statusBar: style()
        .foreground(Colors.gray)
        .italic(),
      filter: style()
        .foreground(Colors.cyan),
      noItems: style()
        .foreground(Colors.gray)
        .italic(),
      ...overrides
    }
  }
  
  init(): Effect.Effect<[ListModel<T>, ReadonlyArray<Cmd<ListMsg>>], never, AppServices> {
    return Effect.succeed([
      {
        id: generateComponentId("list"),
        items: [],
        cursor: 0,
        selected: new Set(),
        multiSelect: false,
        filter: "",
        filteredIndices: [],
        viewportStart: 0,
        viewportHeight: 10,
        showStatusBar: true,
        showFilter: false,
        filterFocused: false,
        focused: false,
        width: 40,
        height: 10
      },
      []
    ])
  }
  
  update(msg: ListMsg, model: ListModel<T>): Effect.Effect<[ListModel<T>, ReadonlyArray<Cmd<ListMsg>>], never, AppServices> {
    return Effect.succeed((() => {
      const visibleItems = model.filteredIndices.length
      
      switch (msg._tag) {
        case "CursorUp": {
          if (visibleItems === 0) return [model, []]
          
          const newCursor = model.cursor > 0 ? model.cursor - 1 : visibleItems - 1
          const newViewportStart = calculateViewport(
            newCursor,
            model.viewportStart,
            model.viewportHeight,
            visibleItems
          )
          
          return [{
            ...model,
            cursor: newCursor,
            viewportStart: newViewportStart
          }, []]
        }
        
        case "CursorDown": {
          if (visibleItems === 0) return [model, []]
          
          const newCursor = model.cursor < visibleItems - 1 ? model.cursor + 1 : 0
          const newViewportStart = calculateViewport(
            newCursor,
            model.viewportStart,
            model.viewportHeight,
            visibleItems
          )
          
          return [{
            ...model,
            cursor: newCursor,
            viewportStart: newViewportStart
          }, []]
        }
        
        case "CursorFirst": {
          if (visibleItems === 0) return [model, []]
          
          return [{
            ...model,
            cursor: 0,
            viewportStart: 0
          }, []]
        }
        
        case "CursorLast": {
          if (visibleItems === 0) return [model, []]
          
          const lastIndex = visibleItems - 1
          const newViewportStart = calculateViewport(
            lastIndex,
            model.viewportStart,
            model.viewportHeight,
            visibleItems
          )
          
          return [{
            ...model,
            cursor: lastIndex,
            viewportStart: newViewportStart
          }, []]
        }
        
        case "PageUp": {
          if (visibleItems === 0) return [model, []]
          
          const newCursor = Math.max(0, model.cursor - model.viewportHeight)
          const newViewportStart = calculateViewport(
            newCursor,
            model.viewportStart,
            model.viewportHeight,
            visibleItems
          )
          
          return [{
            ...model,
            cursor: newCursor,
            viewportStart: newViewportStart
          }, []]
        }
        
        case "PageDown": {
          if (visibleItems === 0) return [model, []]
          
          const newCursor = Math.min(visibleItems - 1, model.cursor + model.viewportHeight)
          const newViewportStart = calculateViewport(
            newCursor,
            model.viewportStart,
            model.viewportHeight,
            visibleItems
          )
          
          return [{
            ...model,
            cursor: newCursor,
            viewportStart: newViewportStart
          }, []]
        }
        
        case "Select": {
          if (visibleItems === 0 || model.filterFocused) return [model, []]
          
          const actualIndex = model.filteredIndices[model.cursor]
          const item = model.items[actualIndex]
          if (!item || item.disabled) return [model, []]
          
          const newSelected = new Set(model.selected)
          
          if (model.multiSelect) {
            if (newSelected.has(item.id)) {
              newSelected.delete(item.id)
            } else {
              newSelected.add(item.id)
            }
          } else {
            newSelected.clear()
            newSelected.add(item.id)
          }
          
          return [{
            ...model,
            selected: newSelected
          }, []]
        }
        
        case "SelectAll": {
          if (!model.multiSelect) return [model, []]
          
          const newSelected = new Set<string>()
          for (const index of model.filteredIndices) {
            const item = model.items[index]
            if (item && !item.disabled) {
              newSelected.add(item.id)
            }
          }
          
          return [{
            ...model,
            selected: newSelected
          }, []]
        }
        
        case "DeselectAll": {
          return [{
            ...model,
            selected: new Set()
          }, []]
        }
        
        case "SetFilter": {
          const newFilteredIndices = filterItems(model.items, msg.filter)
          const newCursor = Math.min(model.cursor, Math.max(0, newFilteredIndices.length - 1))
          
          return [{
            ...model,
            filter: msg.filter,
            filteredIndices: newFilteredIndices,
            cursor: newCursor,
            viewportStart: 0
          }, []]
        }
        
        case "ClearFilter": {
          const newFilteredIndices = filterItems(model.items, "")
          
          return [{
            ...model,
            filter: "",
            filteredIndices: newFilteredIndices,
            filterFocused: false,
            cursor: 0,
            viewportStart: 0
          }, []]
        }
        
        case "ToggleFilter": {
          return [{
            ...model,
            filterFocused: !model.filterFocused
          }, []]
        }
        
        case "Focus": {
          const filteredIndices = filterItems(model.items, model.filter)
          
          return [{
            ...model,
            focused: true,
            filteredIndices
          }, []]
        }
        
        case "Blur": {
          return [{
            ...model,
            focused: false,
            filterFocused: false
          }, []]
        }
        
        default:
          return [model, []]
      }
    })())
  }
  
  view(model: ListModel<T>): View {
    const lines: string[] = []
    
    // Filter bar
    if (model.showFilter && (model.filter || model.filterFocused)) {
      const filterPrefix = model.filterFocused ? "> " : "/ "
      const filterLine = renderStyledSync(
        filterPrefix + model.filter + (model.filterFocused ? "█" : ""),
        this.styles.filter
      )
      lines.push(filterLine)
    }
    
    // No items message
    if (model.filteredIndices.length === 0) {
      const message = model.filter 
        ? `No items match "${model.filter}"`
        : "No items"
      lines.push(renderStyledSync(message, this.styles.noItems))
    } else {
      // Render visible items
      const viewportEnd = Math.min(
        model.viewportStart + model.viewportHeight,
        model.filteredIndices.length
      )
      
      for (let i = model.viewportStart; i < viewportEnd; i++) {
        const actualIndex = model.filteredIndices[i]
        const item = model.items[actualIndex]
        if (!item) continue
        
        const isSelected = model.selected.has(item.id)
        const isCursor = i === model.cursor
        const isFocused = model.focused && isCursor
        
        let itemText: string
        if (this.itemRenderer) {
          itemText = this.itemRenderer(item, isSelected, isFocused)
        } else {
          // Default rendering
          const prefix = model.multiSelect
            ? isSelected ? "[x] " : "[ ] "
            : isCursor ? "> " : "  "
          
          itemText = prefix + item.label
        }
        
        // Apply styles
        let itemStyle = this.styles.item
        if (item.disabled) {
          itemStyle = itemStyle.merge(this.styles.disabledItem)
        } else if (isSelected) {
          itemStyle = itemStyle.merge(this.styles.selectedItem)
        }
        if (isCursor) {
          itemStyle = itemStyle.merge(this.styles.cursorItem)
        }
        if (isFocused) {
          itemStyle = itemStyle.merge(this.styles.focused)
        }
        
        lines.push(renderStyledSync(itemText.padEnd(model.width), itemStyle))
      }
      
      // Fill remaining viewport
      const remainingLines = model.viewportHeight - (viewportEnd - model.viewportStart)
      for (let i = 0; i < remainingLines; i++) {
        lines.push(" ".repeat(model.width))
      }
    }
    
    // Status bar
    if (model.showStatusBar) {
      const selectedCount = model.selected.size
      const totalCount = model.items.length
      const filteredCount = model.filteredIndices.length
      
      let status = `${model.cursor + 1}/${filteredCount}`
      if (filteredCount !== totalCount) {
        status += ` (${totalCount} total)`
      }
      if (selectedCount > 0) {
        status += ` • ${selectedCount} selected`
      }
      
      lines.push(renderStyledSync(status, this.styles.statusBar))
    }
    
    return {
      render: () => Effect.succeed(lines.join("\n")),
      width: model.width,
      height: lines.length
    }
  }
  
  // UIComponent interface methods
  focus(): Effect.Effect<Cmd<ListMsg>, never, never> {
    return Effect.succeed(Effect.succeed({ _tag: "Focus" as const }))
  }
  
  blur(): Effect.Effect<Cmd<ListMsg>, never, never> {
    return Effect.succeed(Effect.succeed({ _tag: "Blur" as const }))
  }
  
  focused(model: ListModel<T>): boolean {
    return model.focused
  }
  
  setSize(width: number, height?: number): Effect.Effect<void, never, never> {
    // Size is handled in the model
    return Effect.unit
  }
  
  getSize(model: ListModel<T>): { width: number; height: number } {
    return { width: model.width, height: model.height }
  }
  
  handleKey(key: KeyEvent, model: ListModel<T>): ListMsg | null {
    // If filter is focused, handle input differently
    if (model.filterFocused) {
      if (key.key === "escape") {
        return { _tag: "ClearFilter" }
      } else if (key.key === "enter") {
        return { _tag: "ToggleFilter" }
      } else if (key.key === "backspace" && model.filter.length > 0) {
        return { _tag: "SetFilter", filter: model.filter.slice(0, -1) }
      } else if (key.runes && key.runes.length === 1 && !key.ctrl && !key.alt) {
        return { _tag: "SetFilter", filter: model.filter + key.runes }
      }
      return null
    }
    
    // Check key bindings
    return matchKeyBinding(key, this.keyMap)
  }
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create a new List component
 */
export const list = <T>(options?: ListOptions<T>): List<T> => {
  return new List(options)
}

/**
 * Create a single-select list
 */
export const singleSelectList = <T>(
  items: ReadonlyArray<ListItem<T>>,
  options?: ListOptions<T>
): List<T> => {
  return new List({
    ...options,
    items,
    multiSelect: false
  })
}

/**
 * Create a multi-select list
 */
export const multiSelectList = <T>(
  items: ReadonlyArray<ListItem<T>>,
  options?: ListOptions<T>
): List<T> => {
  return new List({
    ...options,
    items,
    multiSelect: true
  })
}