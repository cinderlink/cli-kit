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
import type { View, Cmd, AppServices, KeyEvent } from "../../../core/types"
import { KeyUtils } from "../../../core/keys"
import { View as ViewUtils } from "../../../core/index"
import { style, Colors, Borders, type Style } from "../../../styling/index"
import { vstack, hstack } from "../../../core/view"
import { Text } from "../../display/text/Text"
import { Box } from "../../layout/box/Box"
import { Flex } from "../../layout/flex/Flex"
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
} from "../../../tea/base"
import { stringWidth } from "../../../utils/string-width"

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
 * List props
 */
export interface ListProps<T> {
  readonly items?: ReadonlyArray<ListItem<T>>
  readonly multiSelect?: boolean
  readonly height?: number
  readonly width?: number
  readonly showStatusBar?: boolean
  readonly showFilter?: boolean
  readonly styles?: Partial<ListStyles>
  readonly itemRenderer?: (item: ListItem<T>, selected: boolean, focused: boolean) => View
  readonly onSelect?: (items: ReadonlyArray<ListItem<T>>) => void
  readonly onSelectionChange?: (selectedIds: ReadonlyArray<string>) => void
}

/**
 * List model
 */
export interface ListModel<T> extends Focusable, Sized {
  readonly id: string
  readonly props: ListProps<T>
  readonly items: ReadonlyArray<ListItem<T>>
  readonly cursor: number
  readonly selected: Set<string>
  readonly filter: string
  readonly filteredIndices: ReadonlyArray<number>
  readonly viewportStart: number
  readonly viewportHeight: number
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
  readonly container: Style
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
const filterItems = <T,>(
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

/**
 * Helper to update cursor and viewport together
 */
const updateCursorAndViewport = <T,>(
  model: ListModel<T>,
  newCursor: number,
  visibleItems: number
): [ListModel<T>, ReadonlyArray<Cmd<ListMsg>>] => {
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

/**
 * Notify selection change if callback is provided
 */
const notifySelectionChange = <T,>(model: ListModel<T>, newSelected: Set<string>): void => {
  if (model.props.onSelectionChange) {
    model.props.onSelectionChange(Array.from(newSelected))
  }
  
  if (model.props.onSelect) {
    const selectedItems = model.items.filter(item => newSelected.has(item.id))
    model.props.onSelect(selectedItems)
  }
}

// =============================================================================
// Default Styles
// =============================================================================

const createListStyles = (overrides?: Partial<ListStyles>): ListStyles => {
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
    container: style(),
    ...overrides
  }
}

// =============================================================================
// Helper Components
// =============================================================================

const FilterBar = ({ filter, focused, style: filterStyle }: { filter: string, focused: boolean, style: Style }) => {
  const prefix = focused ? "> " : "/ "
  const cursor = focused ? "█" : ""
  
  return (
    <Text style={filterStyle}>
      {prefix}{filter}{cursor}
    </Text>
  )
}

const StatusBar = <T,>({ model, style: statusStyle }: { model: ListModel<T>, style: Style }) => {
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
  
  return <Text style={statusStyle}>{status}</Text>
}

const DefaultItemRenderer = <T,>({ 
  item, 
  isSelected, 
  isCursor,
  multiSelect 
}: { 
  item: ListItem<T>, 
  isSelected: boolean, 
  isCursor: boolean,
  multiSelect: boolean
}) => {
  const prefix = multiSelect
    ? isSelected ? "[x] " : "[ ] "
    : isCursor ? "> " : "  "
  
  return <Text>{prefix}{item.label}</Text>
}

// =============================================================================
// List Component
// =============================================================================

export const List = <T,>(props: ListProps<T> = {}): UIComponent<ListModel<T>, ListMsg> => {
  const keyMap = createKeyMap()
  const styles = createListStyles(props.styles)
  const items = props.items || []
  
  return {
    id: generateComponentId("list"),
    
    init(): Effect.Effect<[ListModel<T>, ReadonlyArray<Cmd<ListMsg>>], never, AppServices> {
      const filteredIndices = filterItems(items, "")
      
      return Effect.succeed([
        {
          id: generateComponentId("list"),
          props,
          items,
          cursor: 0,
          selected: new Set(),
          filter: "",
          filteredIndices,
          viewportStart: 0,
          viewportHeight: props.height ?? 10,
          filterFocused: false,
          focused: false,
          width: props.width ?? 40,
          height: props.height ?? 10
        },
        []
      ])
    },
    
    update(msg: ListMsg, model: ListModel<T>): Effect.Effect<[ListModel<T>, ReadonlyArray<Cmd<ListMsg>>], never, AppServices> {
      return Effect.succeed((() => {
        const visibleItems = model.filteredIndices.length
        
        switch (msg._tag) {
          case "CursorUp": {
            if (visibleItems === 0) return [model, []]
            
            const newCursor = model.cursor > 0 ? model.cursor - 1 : visibleItems - 1
            return updateCursorAndViewport(model, newCursor, visibleItems)
          }
          
          case "CursorDown": {
            if (visibleItems === 0) return [model, []]
            
            const newCursor = model.cursor < visibleItems - 1 ? model.cursor + 1 : 0
            return updateCursorAndViewport(model, newCursor, visibleItems)
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
            return updateCursorAndViewport(model, lastIndex, visibleItems)
          }
          
          case "PageUp": {
            if (visibleItems === 0) return [model, []]
            
            const newCursor = Math.max(0, model.cursor - model.viewportHeight)
            return updateCursorAndViewport(model, newCursor, visibleItems)
          }
          
          case "PageDown": {
            if (visibleItems === 0) return [model, []]
            
            const newCursor = Math.min(visibleItems - 1, model.cursor + model.viewportHeight)
            return updateCursorAndViewport(model, newCursor, visibleItems)
          }
          
          case "Select": {
            if (visibleItems === 0 || model.filterFocused) return [model, []]
            
            const actualIndex = model.filteredIndices[model.cursor]
            const item = model.items[actualIndex]
            if (!item || item.disabled) return [model, []]
            
            const newSelected = new Set(model.selected)
            
            if (model.props.multiSelect) {
              if (newSelected.has(item.id)) {
                newSelected.delete(item.id)
              } else {
                newSelected.add(item.id)
              }
            } else {
              newSelected.clear()
              newSelected.add(item.id)
            }
            
            notifySelectionChange(model, newSelected)
            
            return [{
              ...model,
              selected: newSelected
            }, []]
          }
          
          case "SelectAll": {
            if (!model.props.multiSelect) return [model, []]
            
            const newSelected = new Set<string>()
            for (const index of model.filteredIndices) {
              const item = model.items[index]
              if (item && !item.disabled) {
                newSelected.add(item.id)
              }
            }
            
            notifySelectionChange(model, newSelected)
            
            return [{
              ...model,
              selected: newSelected
            }, []]
          }
          
          case "DeselectAll": {
            notifySelectionChange(model, new Set())
            
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
    },
    
    view(model: ListModel<T>): View {
      const lines: View[] = []
      
      // Filter bar
      if ((model.props.showFilter ?? false) && (model.filter || model.filterFocused)) {
        lines.push(<FilterBar 
          filter={model.filter} 
          focused={model.filterFocused} 
          style={styles.filter} 
        />)
      }
      
      // No items message
      if (model.filteredIndices.length === 0) {
        const message = model.filter 
          ? `No items match "${model.filter}"`
          : "No items"
        lines.push(<Text style={styles.noItems}>{message}</Text>)
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
          
          let itemView: View
          if (model.props.itemRenderer) {
            itemView = model.props.itemRenderer(item, isSelected, isFocused)
          } else {
            itemView = <DefaultItemRenderer 
              item={item} 
              isSelected={isSelected} 
              isCursor={isCursor}
              multiSelect={model.props.multiSelect ?? false}
            />
          }
          
          // Apply styles
          let itemStyle = styles.item
          if (item.disabled) {
            itemStyle = itemStyle.merge(styles.disabledItem)
          } else if (isSelected) {
            itemStyle = itemStyle.merge(styles.selectedItem)
          }
          if (isCursor) {
            itemStyle = itemStyle.merge(styles.cursorItem)
          }
          if (isFocused) {
            itemStyle = itemStyle.merge(styles.focused)
          }
          
          lines.push(
            <Box width={model.width} style={itemStyle}>
              {itemView}
            </Box>
          )
        }
        
        // Fill remaining viewport
        const remainingLines = model.viewportHeight - (viewportEnd - model.viewportStart)
        for (let i = 0; i < remainingLines; i++) {
          lines.push(<Text>{" ".repeat(model.width)}</Text>)
        }
      }
      
      // Status bar
      if (model.props.showStatusBar ?? true) {
        lines.push(<StatusBar model={model} style={styles.statusBar} />)
      }
      
      return <Box style={styles.container}>{vstack(...lines)}</Box>
    },
    
    // UIComponent interface methods
    focus(): Effect.Effect<Cmd<ListMsg>, never, never> {
      return Effect.succeed(Effect.succeed({ _tag: "Focus" as const }))
    },
    
    blur(): Effect.Effect<Cmd<ListMsg>, never, never> {
      return Effect.succeed(Effect.succeed({ _tag: "Blur" as const }))
    },
    
    focused(model: ListModel<T>): boolean {
      return model.focused
    },
    
    setSize(width: number, height?: number): Effect.Effect<void, never, never> {
      // Size is handled in the model
      return Effect.void
    },
    
    getSize(model: ListModel<T>): { width: number; height: number } {
      return { width: model.width, height: model.height }
    },
    
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
      return matchKeyBinding(key, keyMap)
    }
  }
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create a single-select list
 */
export const SingleSelectList = <T,>({
  items,
  ...props
}: {
  items: ReadonlyArray<ListItem<T>>
} & Omit<ListProps<T>, 'items' | 'multiSelect'>): UIComponent<ListModel<T>, ListMsg> => {
  return List({
    ...props,
    items,
    multiSelect: false
  })
}

/**
 * Create a multi-select list
 */
export const MultiSelectList = <T,>({
  items,
  ...props
}: {
  items: ReadonlyArray<ListItem<T>>
} & Omit<ListProps<T>, 'items' | 'multiSelect'>): UIComponent<ListModel<T>, ListMsg> => {
  return List({
    ...props,
    items,
    multiSelect: true
  })
}