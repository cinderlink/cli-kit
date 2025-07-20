/**
 * Table Component - Data table with sorting, filtering, and selection
 * 
 * Inspired by table patterns from the Bubbletea ecosystem:
 * - Column-based data display
 * - Sortable columns (ascending/descending)
 * - Row selection and navigation
 * - Filtering capabilities
 * - Customizable styling
 * - Keyboard navigation
 */

import { Effect, Option } from "effect"
import { stringWidth } from "../../../utils/string-width"
import type { View, Cmd, AppServices, KeyEvent, MouseEvent } from "../../../core/types"
import { style, Colors, type Style } from "../../../styling/index"
import { vstack, hstack } from "../../../core/view"
import { Text } from "../../display/text/Text"
import { Box } from "../../layout/box/Box"
import { Flex } from "../../layout/flex/Flex"
import {
  type UIComponent,
  type ComponentStyles,
  type Focusable,
  type Sized,
  type Disableable,
  generateComponentId
} from "../../../tea/base"

// =============================================================================
// Types
// =============================================================================

/**
 * Table column definition
 */
export interface TableColumn<T> {
  readonly key: string
  readonly title: string
  readonly width?: number
  readonly minWidth?: number
  readonly maxWidth?: number
  readonly sortable?: boolean
  readonly filterable?: boolean
  readonly render?: (value: unknown, row: T, rowIndex: number) => string
  readonly align?: 'left' | 'center' | 'right'
}

/**
 * Table row data
 */
export interface TableRow<T> {
  readonly id: string
  readonly data: T
  readonly selectable?: boolean
  readonly disabled?: boolean
}

/**
 * Sort configuration
 */
export interface TableSort {
  readonly column: string
  readonly direction: 'asc' | 'desc'
}

/**
 * Filter configuration
 */
export interface TableFilter {
  readonly column: string
  readonly value: string
  readonly type: 'contains' | 'equals' | 'startsWith' | 'endsWith'
}

/**
 * Table selection mode
 */
export enum TableSelectionMode {
  None = "none",
  Single = "single", 
  Multiple = "multiple"
}

/**
 * Table props
 */
export interface TableProps<T> {
  readonly columns: ReadonlyArray<TableColumn<T>>
  readonly rows?: ReadonlyArray<TableRow<T>>
  readonly selectionMode?: TableSelectionMode
  readonly showHeader?: boolean
  readonly showRowNumbers?: boolean
  readonly showStatusLine?: boolean
  readonly width?: number
  readonly pageSize?: number
  readonly initialSort?: TableSort
  readonly initialFilters?: ReadonlyArray<TableFilter>
  readonly headerStyle?: Style
  readonly rowStyle?: Style
  readonly selectedRowStyle?: Style
  readonly currentRowStyle?: Style
  readonly disabledRowStyle?: Style
  readonly statusLineStyle?: Style
  readonly borderStyle?: Style
  readonly onRowSelect?: (rowId: string) => void
  readonly onSort?: (sort: TableSort | null) => void
  readonly onFilter?: (filters: ReadonlyArray<TableFilter>) => void
}

/**
 * Table model
 */
export interface TableModel<T> extends Focusable, Sized, Disableable {
  readonly id: string
  readonly props: TableProps<T>
  readonly rows: ReadonlyArray<TableRow<T>>
  readonly filteredRows: ReadonlyArray<TableRow<T>>
  readonly selectedRowIds: ReadonlyArray<string>
  readonly currentRowIndex: number
  readonly sort: TableSort | null
  readonly filters: ReadonlyArray<TableFilter>
  readonly scrollOffset: number
}

/**
 * Table messages
 */
export type TableMsg<T> = 
  | { readonly _tag: "selectRow"; readonly rowId: string }
  | { readonly _tag: "toggleRowSelection"; readonly rowId: string }
  | { readonly _tag: "selectAll" }
  | { readonly _tag: "clearSelection" }
  | { readonly _tag: "sortColumn"; readonly column: string }
  | { readonly _tag: "addFilter"; readonly filter: TableFilter }
  | { readonly _tag: "removeFilter"; readonly column: string }
  | { readonly _tag: "clearFilters" }
  | { readonly _tag: "navigateUp" }
  | { readonly _tag: "navigateDown" }
  | { readonly _tag: "navigatePageUp" }
  | { readonly _tag: "navigatePageDown" }
  | { readonly _tag: "navigateHome" }
  | { readonly _tag: "navigateEnd" }
  | { readonly _tag: "focus" }
  | { readonly _tag: "blur" }

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Update table navigation with bounds checking
 */
const updateNavigation = <T,>(
  model: TableModel<T>, 
  newIndex: number, 
  newScrollOffset?: number
): [TableModel<T>, Cmd<TableMsg<T>>[]] => {
  const maxIndex = model.filteredRows.length - 1
  const clampedIndex = Math.max(0, Math.min(maxIndex, newIndex))
  const pageSize = model.props.pageSize ?? 10
  const calculatedScrollOffset = newScrollOffset ?? model.scrollOffset
  const clampedScrollOffset = Math.max(0, Math.min(maxIndex - pageSize + 1, calculatedScrollOffset))
  
  return [{
    ...model,
    currentRowIndex: clampedIndex,
    scrollOffset: clampedScrollOffset
  }, []]
}

/**
 * Apply filters to rows
 */
const applyFilters = <T,>(rows: ReadonlyArray<TableRow<T>>, filters: ReadonlyArray<TableFilter>): ReadonlyArray<TableRow<T>> => {
  if (filters.length === 0) return rows
  
  return rows.filter(row => {
    return filters.every(filter => {
      const value = String((row.data as Record<string, unknown>)[filter.column] || '').toLowerCase()
      const filterValue = filter.value.toLowerCase()
      
      switch (filter.type) {
        case 'contains':
          return value.includes(filterValue)
        case 'equals':
          return value === filterValue
        case 'startsWith':
          return value.startsWith(filterValue)
        case 'endsWith':
          return value.endsWith(filterValue)
        default:
          return true
      }
    })
  })
}

/**
 * Apply sorting to rows
 */
const applySorting = <T,>(rows: ReadonlyArray<TableRow<T>>, sort: TableSort | null): ReadonlyArray<TableRow<T>> => {
  if (!sort) return rows
  
  return [...rows].sort((a, b) => {
    const aValue = (a.data as Record<string, unknown>)[sort.column]
    const bValue = (b.data as Record<string, unknown>)[sort.column]
    
    let comparison = 0
    if (aValue < bValue) comparison = -1
    else if (aValue > bValue) comparison = 1
    
    return sort.direction === 'desc' ? -comparison : comparison
  })
}

/**
 * Get cell content for rendering
 */
const getCellContent = <T,>(column: TableColumn<T>, row: TableRow<T>, rowIndex: number): string => {
  const value = (row.data as Record<string, unknown>)[column.key]
  
  if (column.render) {
    return column.render(value, row.data, rowIndex)
  }
  
  return String(value || '')
}

/**
 * Format cell content with alignment and width
 */
const formatCell = (content: string, width: number, align: 'left' | 'center' | 'right' = 'left'): string => {
  const contentWidth = stringWidth(content)
  
  if (contentWidth >= width) {
    // Truncate content to fit, accounting for wide characters
    let truncated = ''
    let currentWidth = 0
    
    // Use grapheme segmenter to properly handle multi-byte characters
    const segmenter = new Intl.Segmenter()
    const segments = [...segmenter.segment(content)]
    
    for (const { segment } of segments) {
      const segmentWidth = stringWidth(segment)
      
      if (currentWidth + segmentWidth > width - 1) {
        break
      }
      
      truncated += segment
      currentWidth += segmentWidth
    }
    
    return truncated + '…'
  }
  
  const padding = width - contentWidth
  
  switch (align) {
    case 'center':
      const leftPad = Math.floor(padding / 2)
      const rightPad = padding - leftPad
      return ' '.repeat(leftPad) + content + ' '.repeat(rightPad)
    case 'right':
      return ' '.repeat(padding) + content
    case 'left':
    default:
      return content + ' '.repeat(padding)
  }
}

// =============================================================================
// Helper Components
// =============================================================================

const TableHeader = <T,>({ model, columnWidths }: { model: TableModel<T>, columnWidths: number[] }) => {
  const headerStyle = model.props.headerStyle ?? style().foreground(Colors.brightWhite)
  const borderStyle = model.props.borderStyle ?? style().foreground(Colors.gray)
  
  const headerCells = model.props.columns.map((col, index) => {
    const width = columnWidths[index]!
    let title = col.title
    
    // Add sort indicator
    if (model.sort && model.sort.column === col.key) {
      title += model.sort.direction === 'asc' ? ' ↑' : ' ↓'
    }
    
    return formatCell(title, width, col.align)
  })
  
  if (model.props.showRowNumbers) {
    headerCells.unshift(formatCell('#', 4, 'right'))
  }
  
  const separator = columnWidths.map(width => '─'.repeat(width))
  if (model.props.showRowNumbers) {
    separator.unshift('─'.repeat(4))
  }
  
  return vstack(
    <Text style={headerStyle}>{headerCells.join('│')}</Text>,
    <Text style={borderStyle}>{separator.join('┼')}</Text>
  )
}

const TableStatusLine = <T,>({ model }: { model: TableModel<T> }) => {
  const statusStyle = model.props.statusLineStyle ?? style().foreground(Colors.gray)
  
  const statusParts = []
  if (model.filteredRows.length !== model.rows.length) {
    statusParts.push(`${model.filteredRows.length}/${model.rows.length} rows`)
  } else {
    statusParts.push(`${model.rows.length} rows`)
  }
  
  if (model.selectedRowIds.length > 0) {
    statusParts.push(`${model.selectedRowIds.length} selected`)
  }
  
  if (model.sort) {
    statusParts.push(`sorted by ${model.sort.column} ${model.sort.direction}`)
  }
  
  if (model.filters.length > 0) {
    statusParts.push(`${model.filters.length} filters`)
  }
  
  return (
    <Text style={statusStyle}>{statusParts.join(' • ')}</Text>
  )
}

// =============================================================================
// Component Implementation
// =============================================================================

/**
 * Creates a new table component
 */
export const Table = <T,>(props: TableProps<T>): UIComponent<TableModel<T>, TableMsg<T>> => {
  const id = generateComponentId("table")
  const rows = props.rows || []
  const initialSort = props.initialSort ?? null
  const initialFilters = props.initialFilters ?? []
  
  return {
    id,
    
    // Initialize the table
    init() {
      const filteredRows = applySorting(applyFilters(rows, initialFilters), initialSort)
      
      const model: TableModel<T> = {
        id,
        props,
        rows,
        filteredRows,
        selectedRowIds: [],
        currentRowIndex: 0,
        sort: initialSort,
        filters: initialFilters,
        scrollOffset: 0,
        focused: false,
        disabled: false,
        width: props.width ?? 80
      }
      
      return Effect.succeed([model, []])
    },
    
    // Update table state
    update(msg: TableMsg<T>, model: TableModel<T>) {
      switch (msg._tag) {
        case "selectRow": {
          if (model.props.selectionMode === TableSelectionMode.None) {
            return Effect.succeed([model, []])
          }
          
          const newSelectedIds = model.props.selectionMode === TableSelectionMode.Multiple
            ? [...model.selectedRowIds, msg.rowId]
            : [msg.rowId]
          
          if (model.props.onRowSelect) {
            model.props.onRowSelect(msg.rowId)
          }
          
          return Effect.succeed([{ ...model, selectedRowIds: newSelectedIds }, []])
        }
        
        case "toggleRowSelection": {
          if (model.props.selectionMode === TableSelectionMode.None) {
            return Effect.succeed([model, []])
          }
          
          const isSelected = model.selectedRowIds.includes(msg.rowId)
          const newSelectedIds = isSelected
            ? model.selectedRowIds.filter(id => id !== msg.rowId)
            : model.props.selectionMode === TableSelectionMode.Multiple
              ? [...model.selectedRowIds, msg.rowId]
              : [msg.rowId]
          
          if (!isSelected && model.props.onRowSelect) {
            model.props.onRowSelect(msg.rowId)
          }
          
          return Effect.succeed([{ ...model, selectedRowIds: newSelectedIds }, []])
        }
        
        case "selectAll": {
          if (model.props.selectionMode !== TableSelectionMode.Multiple) {
            return Effect.succeed([model, []])
          }
          
          const allRowIds = model.filteredRows.map(row => row.id)
          return Effect.succeed([{ ...model, selectedRowIds: allRowIds }, []])
        }
        
        case "clearSelection": {
          return Effect.succeed([{ ...model, selectedRowIds: [] }, []])
        }
        
        case "sortColumn": {
          const currentSort = model.sort
          let newSort: TableSort | null = null
          
          if (!currentSort || currentSort.column !== msg.column) {
            newSort = { column: msg.column, direction: 'asc' }
          } else if (currentSort.direction === 'asc') {
            newSort = { column: msg.column, direction: 'desc' }
          } else {
            newSort = null // Remove sorting
          }
          
          const newFilteredRows = applySorting(applyFilters(model.rows, model.filters), newSort)
          
          if (model.props.onSort) {
            model.props.onSort(newSort)
          }
          
          return Effect.succeed([{
            ...model,
            sort: newSort,
            filteredRows: newFilteredRows,
            currentRowIndex: 0,
            scrollOffset: 0
          }, []])
        }
        
        case "addFilter": {
          const newFilters = [...model.filters.filter(f => f.column !== msg.filter.column), msg.filter]
          const newFilteredRows = applySorting(applyFilters(model.rows, newFilters), model.sort)
          
          if (model.props.onFilter) {
            model.props.onFilter(newFilters)
          }
          
          return Effect.succeed([{
            ...model,
            filters: newFilters,
            filteredRows: newFilteredRows,
            currentRowIndex: 0,
            scrollOffset: 0
          }, []])
        }
        
        case "removeFilter": {
          const newFilters = model.filters.filter(f => f.column !== msg.column)
          const newFilteredRows = applySorting(applyFilters(model.rows, newFilters), model.sort)
          
          if (model.props.onFilter) {
            model.props.onFilter(newFilters)
          }
          
          return Effect.succeed([{
            ...model,
            filters: newFilters,
            filteredRows: newFilteredRows,
            currentRowIndex: 0,
            scrollOffset: 0
          }, []])
        }
        
        case "clearFilters": {
          const newFilteredRows = applySorting(model.rows, model.sort)
          
          if (model.props.onFilter) {
            model.props.onFilter([])
          }
          
          return Effect.succeed([{
            ...model,
            filters: [],
            filteredRows: newFilteredRows,
            currentRowIndex: 0,
            scrollOffset: 0
          }, []])
        }
        
        case "navigateUp": {
          const newIndex = model.currentRowIndex - 1
          const pageSize = model.props.pageSize ?? 10
          const newScrollOffset = newIndex < model.scrollOffset ? newIndex : model.scrollOffset
          return Effect.succeed(updateNavigation(model, newIndex, newScrollOffset))
        }
        
        case "navigateDown": {
          const newIndex = model.currentRowIndex + 1
          const pageSize = model.props.pageSize ?? 10
          const newScrollOffset = newIndex >= model.scrollOffset + pageSize
            ? newIndex - pageSize + 1 
            : model.scrollOffset
          return Effect.succeed(updateNavigation(model, newIndex, newScrollOffset))
        }
        
        case "navigatePageUp": {
          const pageSize = model.props.pageSize ?? 10
          const newIndex = model.currentRowIndex - pageSize
          const newScrollOffset = model.scrollOffset - pageSize
          return Effect.succeed(updateNavigation(model, newIndex, newScrollOffset))
        }
        
        case "navigatePageDown": {
          const pageSize = model.props.pageSize ?? 10
          const newIndex = model.currentRowIndex + pageSize
          const newScrollOffset = model.scrollOffset + pageSize
          return Effect.succeed(updateNavigation(model, newIndex, newScrollOffset))
        }
        
        case "navigateHome": {
          return Effect.succeed(updateNavigation(model, 0, 0))
        }
        
        case "navigateEnd": {
          const pageSize = model.props.pageSize ?? 10
          const maxIndex = model.filteredRows.length - 1
          const newScrollOffset = maxIndex - pageSize + 1
          return Effect.succeed(updateNavigation(model, maxIndex, newScrollOffset))
        }
        
        case "focus": {
          return Effect.succeed([{ ...model, focused: true }, []])
        }
        
        case "blur": {
          return Effect.succeed([{ ...model, focused: false }, []])
        }
      }
    },
    
    // Render the table
    view(model: TableModel<T>) {
      const columnWidths = model.props.columns.map(col => 
        col.width ?? Math.min(col.maxWidth ?? 20, Math.max(col.minWidth ?? 8, stringWidth(col.title) + 2))
      )
      
      const rows: View[] = []
      
      // Header row
      if (model.props.showHeader ?? true) {
        rows.push(<TableHeader model={model} columnWidths={columnWidths} />)
      }
      
      // Data rows
      const pageSize = model.props.pageSize ?? 10
      const visibleRows = model.filteredRows.slice(
        model.scrollOffset,
        model.scrollOffset + pageSize
      )
      
      visibleRows.forEach((row, index) => {
        const absoluteIndex = model.scrollOffset + index
        const isSelected = model.selectedRowIds.includes(row.id)
        const isCurrent = absoluteIndex === model.currentRowIndex
        const isDisabled = row.disabled || model.disabled
        
        const cells = model.props.columns.map((col, colIndex) => {
          const content = getCellContent(col, row, absoluteIndex)
          const width = columnWidths[colIndex]!
          return formatCell(content, width, col.align)
        })
        
        if (model.props.showRowNumbers) {
          cells.unshift(formatCell(String(absoluteIndex + 1), 4, 'right'))
        }
        
        let cellStyle = model.props.rowStyle ?? style()
        if (isDisabled) {
          cellStyle = model.props.disabledRowStyle ?? style().foreground(Colors.gray)
        } else if (isCurrent && model.focused) {
          cellStyle = model.props.currentRowStyle ?? style().background(Colors.blue).foreground(Colors.white)
        } else if (isSelected) {
          cellStyle = model.props.selectedRowStyle ?? style().background(Colors.cyan).foreground(Colors.black)
        }
        
        rows.push(<Text style={cellStyle}>{cells.join('│')}</Text>)
      })
      
      // Status line
      if (model.props.showStatusLine ?? true) {
        rows.push(<Text>{""}</Text>)
        rows.push(<TableStatusLine model={model} />)
      }
      
      return vstack(...rows)
    },
    
    // Focus management
    focus() {
      return Effect.succeed({ _tag: "focus" as const })
    },
    
    blur() {
      return Effect.succeed({ _tag: "blur" as const })
    },
    
    focused(model: TableModel<T>) {
      return model.focused
    },
    
    // Size management
    setSize(width: number, height?: number) {
      return Effect.succeed(undefined)
    },
    
    getSize(model: TableModel<T>) {
      const pageSize = model.props.pageSize ?? 10
      const headerHeight = (model.props.showHeader ?? true) ? 2 : 0
      const dataHeight = Math.min(pageSize, model.filteredRows.length)
      const statusHeight = (model.props.showStatusLine ?? true) ? 2 : 0
      const totalHeight = headerHeight + dataHeight + statusHeight
      
      return { width: model.width, height: totalHeight }
    },
    
    // Keyboard handling
    handleKey(key: KeyEvent, model: TableModel<T>): TableMsg<T> | null {
      if (model.disabled || !model.focused) return null
      
      switch (key.key) {
        case "up":
        case "k":
          return { _tag: "navigateUp" }
        case "down":
        case "j":
          return { _tag: "navigateDown" }
        case "pageup":
          return { _tag: "navigatePageUp" }
        case "pagedown":
          return { _tag: "navigatePageDown" }
        case "home":
          return { _tag: "navigateHome" }
        case "end":
          return { _tag: "navigateEnd" }
        case "enter":
        case " ":
          if (model.filteredRows[model.currentRowIndex]) {
            const currentRow = model.filteredRows[model.currentRowIndex]
            if (currentRow) {
              return { _tag: "toggleRowSelection", rowId: currentRow.id }
            }
          }
          return null
        case "ctrl+a":
          return { _tag: "selectAll" }
        case "escape":
          return { _tag: "clearSelection" }
        default:
          return null
      }
    },
    
    // Mouse handling (basic support)
    handleMouse(mouse: MouseEvent, model: TableModel<T>): TableMsg<T> | null {
      if (model.disabled || mouse.type !== 'press' || mouse.button !== 'left') return null
      
      // Basic click handling - would need coordinate mapping for full support
      return { _tag: "focus" }
    }
  }
}

// =============================================================================
// Helper Functions for Table Creation
// =============================================================================

/**
 * Create a simple table column
 */
export const createColumn = <T,>(
  key: string,
  title: string,
  options: Partial<TableColumn<T>> = {}
): TableColumn<T> => ({
  key,
  title,
  sortable: true,
  filterable: true,
  align: 'left',
  ...options
})

/**
 * Create table row
 */
export const createRow = <T,>(id: string, data: T, options: Partial<Omit<TableRow<T>, 'id' | 'data'>> = {}): TableRow<T> => ({
  id,
  data,
  selectable: true,
  disabled: false,
  ...options
})

/**
 * Create a simple data table
 */
export const SimpleTable = <T extends Record<string, unknown>,>({ 
  data, 
  columnKeys,
  ...props 
}: { 
  data: Array<T>, 
  columnKeys?: Array<keyof T> 
} & Partial<TableProps<T>>) => {
  const keys = columnKeys && columnKeys.length > 0 ? columnKeys : Object.keys(data[0] || {})
  
  const columns = keys.map(key => 
    createColumn(String(key), String(key).toUpperCase())
  )
  
  const rows = data.map((item, index) => 
    createRow(`row-${index}`, item)
  )
  
  return Table({ columns, rows, ...props })
}

/**
 * Export formatCell for testing purposes
 */
export { formatCell }