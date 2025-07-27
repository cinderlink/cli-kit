/**
 * Table Component - Tabular data display with advanced features
 * 
 * Features:
 * - Dynamic column configuration
 * - Row selection (single/multi)
 * - Sorting and filtering
 * - Pagination support
 * - Keyboard navigation
 * - Custom cell rendering
 * - Responsive column widths
 * 
 * @example
 * ```tsx
 * import { Table } from 'tuix/components/data/table'
 * 
 * function MyApp() {
 *   const data = [
 *     { id: 1, name: 'John', age: 30 },
 *     { id: 2, name: 'Jane', age: 25 }
 *   ]
 *   
 *   const columns = [
 *     { key: 'id', label: 'ID', width: 10 },
 *     { key: 'name', label: 'Name', width: 20 },
 *     { key: 'age', label: 'Age', width: 10 }
 *   ]
 *   
 *   return (
 *     <Table
 *       data={data}
 *       columns={columns}
 *       onSelect={(row) => console.log('Selected:', row)}
 *     />
 *   )
 * }
 * ```
 */

import { jsx } from '../../../../jsx/runtime/index.js'
import { $state, $derived, $effect } from '../../../../core/update/reactivity/runes.js'
import type { StateRune } from '../../../../core/update/reactivity/runes.js'
import { isStateRune } from '../../../../core/update/reactivity/runes.js'
import { style, Colors } from '../../../../core/terminal/ansi/styles/index.js'
import type { Style } from '../../../../core/terminal/ansi/styles/types.js'
import { stringWidth } from '../../../../core/terminal/output/string/width.js'

// Types
export interface Column<T = any> {
  key: string
  label: string
  width?: number
  minWidth?: number
  maxWidth?: number
  align?: 'left' | 'center' | 'right'
  sortable?: boolean
  filterable?: boolean
  render?: (value: any, row: T, rowIndex: number) => JSX.Element | string
  format?: (value: any) => string
  style?: Style | ((value: any, row: T) => Style)
}

export interface TableProps<T = any> {
  data: T[]
  columns: Column<T>[]
  selectedIndex?: number | StateRune<number>
  selectedIndices?: number[] | StateRune<number[]>
  onSelect?: (row: T, index: number) => void
  onMultiSelect?: (rows: T[], indices: number[]) => void
  height?: number
  maxHeight?: number
  showHeader?: boolean
  showBorder?: boolean
  showRowNumbers?: boolean
  showScrollbar?: boolean
  selectionMode?: 'single' | 'multi' | 'none'
  sortColumn?: string | StateRune<string | null>
  sortDirection?: 'asc' | 'desc' | StateRune<'asc' | 'desc'>
  onSort?: (column: string, direction: 'asc' | 'desc') => void
  filter?: string | ((row: T) => boolean)
  onFilter?: (filter: string) => void
  showFilter?: boolean
  filterPlaceholder?: string
  emptyMessage?: string | JSX.Element
  focusable?: boolean
  autoFocus?: boolean
  wrap?: boolean
  highlightOnFocus?: boolean
  className?: string
  style?: Style
  headerStyle?: Style
  rowStyle?: Style | ((row: T, index: number, selected: boolean) => Style)
  cellStyle?: Style | ((value: any, row: T, column: Column<T>) => Style)
}

/**
 * Table Component
 */
export function Table<T = any>(props: TableProps<T>): JSX.Element {
  // Default props
  const showHeader = props.showHeader !== false
  const showBorder = props.showBorder !== false
  const showRowNumbers = props.showRowNumbers || false
  const focusable = props.focusable !== false
  
  // Internal state
  const focused = $state(props.autoFocus || false)
  const hovering = $state(false)
  const filterValue = $state('')
  const scrollOffset = $state(0)
  const internalSelectedIndex = $state(0)
  const internalSelectedIndices = $state<number[]>([])
  const internalSortColumn = $state<string | null>(null)
  const internalSortDirection = $state<'asc' | 'desc'>('asc')
  
  // Selection mode
  const selectionMode = props.selectionMode || 
    (props.selectedIndices || props.onMultiSelect ? 'multi' : 'single')
  
  // Selected index management
  const selectedIndex = $derived(() => {
    if (props.selectedIndex !== undefined) {
      return isStateRune(props.selectedIndex) 
        ? props.selectedIndex.value 
        : props.selectedIndex
    }
    return internalSelectedIndex.value
  })
  
  const selectedIndices = $derived(() => {
    if (props.selectedIndices !== undefined) {
      return isStateRune(props.selectedIndices)
        ? props.selectedIndices.value
        : props.selectedIndices
    }
    return internalSelectedIndices.value
  })
  
  // Sort column management
  const sortColumn = $derived(() => {
    if (props.sortColumn !== undefined) {
      return isStateRune(props.sortColumn)
        ? props.sortColumn.value
        : props.sortColumn
    }
    return internalSortColumn.value
  })
  
  const sortDirection = $derived(() => {
    if (props.sortDirection !== undefined) {
      return isStateRune(props.sortDirection)
        ? props.sortDirection.value
        : props.sortDirection
    }
    return internalSortDirection.value
  })
  
  // Calculate column widths
  const columnWidths = $derived(() => {
    return props.columns.map(col => {
      if (col.width) return col.width
      
      // Auto-calculate based on content
      const headerWidth = stringWidth(col.label) + 2
      const maxContentWidth = Math.max(
        headerWidth,
        ...props.data.map(row => {
          const value = row[col.key as keyof T]
          const formatted = col.format ? col.format(value) : String(value)
          return stringWidth(formatted) + 2
        })
      )
      
      return Math.min(
        Math.max(col.minWidth || 5, maxContentWidth),
        col.maxWidth || 30
      )
    })
  })
  
  // Filter data
  const filteredData = $derived(() => {
    if (!props.filter && !filterValue.value) return props.data
    
    const filterFn = props.filter
      ? typeof props.filter === 'function'
        ? props.filter
        : (row: T) => {
            return Object.values(row).some(value => 
              String(value).toLowerCase().includes(props.filter.toLowerCase())
            )
          }
      : (row: T) => {
          return Object.values(row).some(value => 
            String(value).toLowerCase().includes(filterValue.value.toLowerCase())
          )
        }
    
    return props.data.filter(filterFn)
  })
  
  // Sort data
  const sortedData = $derived(() => {
    if (!sortColumn.value) return filteredData.value
    
    const column = props.columns.find(col => col.key === sortColumn.value)
    if (!column || !column.sortable) return filteredData.value
    
    return [...filteredData.value].sort((a, b) => {
      const aVal = a[column.key as keyof T]
      const bVal = b[column.key as keyof T]
      
      let result = 0
      if (aVal < bVal) result = -1
      else if (aVal > bVal) result = 1
      
      return sortDirection.value === 'asc' ? result : -result
    })
  })
  
  // Visible rows (for virtualization)
  const visibleRows = $derived(() => {
    const height = props.height || props.maxHeight || 10
    const start = scrollOffset.value
    const end = start + height
    return sortedData.value.slice(start, end)
  })
  
  // Calculate if scrolling is needed
  const canScroll = $derived(() => {
    const height = props.height || props.maxHeight || 10
    return sortedData.value.length > height
  })
  
  // Update scroll offset to keep selected row visible
  // Only run effect in component context (not in tests)
  if (typeof $effect !== 'undefined') {
    try {
      $effect(() => {
        if (selectionMode === 'single') {
          const height = props.height || props.maxHeight || 10
          const index = selectedIndex.value
          
          if (index < scrollOffset.value) {
            scrollOffset.value = index
          } else if (index >= scrollOffset.value + height) {
            scrollOffset.value = index - height + 1
          }
        }
      })
    } catch (e) {
      // Ignore effect errors in test environment
    }
  }
  
  // Keyboard navigation
  function handleKeyPress(key: string) {
    if (!focused.value || !focusable) return
    
    switch (key) {
      case 'ArrowUp':
      case 'k':
        moveSelection(-1)
        break
      case 'ArrowDown':
      case 'j':
        moveSelection(1)
        break
      case 'ArrowLeft':
      case 'h':
        // Horizontal scrolling if needed
        break
      case 'ArrowRight':
      case 'l':
        // Horizontal scrolling if needed
        break
      case 'Home':
        selectIndex(0)
        break
      case 'End':
        selectIndex(sortedData.value.length - 1)
        break
      case 'PageUp':
        moveSelection(-(props.height || 10))
        break
      case 'PageDown':
        moveSelection(props.height || 10)
        break
      case 'Enter':
      case ' ':
        if (selectionMode === 'multi') {
          toggleMultiSelect(selectedIndex.value)
        } else if (selectionMode === 'single') {
          const row = sortedData.value[selectedIndex.value]
          props.onSelect?.(row, selectedIndex.value)
        }
        break
    }
  }
  
  function moveSelection(delta: number) {
    const newIndex = selectedIndex.value + delta
    const maxIndex = sortedData.value.length - 1
    
    if (props.wrap) {
      selectIndex((newIndex + sortedData.value.length) % sortedData.value.length)
    } else {
      selectIndex(Math.max(0, Math.min(maxIndex, newIndex)))
    }
  }
  
  function selectIndex(index: number) {
    if (selectionMode === 'single') {
      if (isStateRune(props.selectedIndex)) {
        props.selectedIndex.value = index
      } else {
        internalSelectedIndex.value = index
      }
    }
  }
  
  function toggleMultiSelect(index: number) {
    const indices = [...selectedIndices.value]
    const idx = indices.indexOf(index)
    
    if (idx >= 0) {
      indices.splice(idx, 1)
    } else {
      indices.push(index)
      indices.sort((a, b) => a - b)
    }
    
    if (isStateRune(props.selectedIndices)) {
      props.selectedIndices.value = indices
    } else {
      internalSelectedIndices.value = indices
    }
    
    const rows = indices.map(i => sortedData.value[i])
    props.onMultiSelect?.(rows, indices)
  }
  
  // Sort handling
  function handleSort(column: Column<T>) {
    if (!column.sortable) return
    
    const newDirection = sortColumn.value === column.key && sortDirection.value === 'asc' 
      ? 'desc' 
      : 'asc'
    
    if (isStateRune(props.sortColumn)) {
      props.sortColumn.value = column.key
    } else {
      internalSortColumn.value = column.key
    }
    
    if (isStateRune(props.sortDirection)) {
      props.sortDirection.value = newDirection
    } else {
      internalSortDirection.value = newDirection
    }
    
    props.onSort?.(column.key, newDirection)
  }
  
  // Render helpers
  function renderHeader(): JSX.Element | null {
    if (!showHeader) return null
    
    const headerCells = props.columns.map((col, index) => {
      const width = columnWidths.value[index]
      const isSorting = sortColumn.value === col.key
      
      return jsx('interactive', {
        onClick: () => handleSort(col),
        children: jsx('text', {
          style: style()
            .width(width)
            .foreground(col.sortable ? Colors.cyan : Colors.white)
            .bold(isSorting)
            .textAlign(col.align || 'left'),
          children: col.label + (isSorting ? (sortDirection.value === 'asc' ? ' ▲' : ' ▼') : '')
        })
      })
    })
    
    if (showRowNumbers) {
      headerCells.unshift(
        jsx('text', {
          style: style().width(5).foreground(Colors.gray),
          children: '#'
        })
      )
    }
    
    return jsx('hstack', {
      gap: 1,
      style: props.headerStyle || style().borderBottom('single').marginBottom(1),
      children: headerCells
    })
  }
  
  function renderRow(row: T, index: number): JSX.Element {
    const actualIndex = scrollOffset.value + index
    const isSelected = selectionMode === 'single' 
      ? actualIndex === selectedIndex.value
      : selectedIndices.value.includes(actualIndex)
    const isFocused = focused.value && actualIndex === selectedIndex.value
    
    const cells = props.columns.map((col, colIndex) => {
      const value = row[col.key as keyof T]
      const width = columnWidths.value[colIndex]
      
      let content: JSX.Element | string
      if (col.render) {
        content = col.render(value, row, actualIndex)
      } else if (col.format) {
        content = col.format(value)
      } else {
        content = String(value)
      }
      
      const cellStyle = typeof props.cellStyle === 'function'
        ? props.cellStyle(value, row, col)
        : props.cellStyle
      
      const colStyle = typeof col.style === 'function'
        ? col.style(value, row)
        : col.style
      
      return jsx('text', {
        style: style({
          ...cellStyle,
          ...colStyle,
          width,
          textAlign: col.align || 'left'
        }),
        children: content
      })
    })
    
    if (showRowNumbers) {
      cells.unshift(
        jsx('text', {
          style: style().width(5).foreground(Colors.gray),
          children: (actualIndex + 1).toString()
        })
      )
    }
    
    const rowStyle = typeof props.rowStyle === 'function'
      ? props.rowStyle(row, actualIndex, isSelected)
      : props.rowStyle
    
    return jsx('interactive', {
      onClick: () => {
        selectIndex(actualIndex)
        if (selectionMode === 'single') {
          props.onSelect?.(row, actualIndex)
        } else if (selectionMode === 'multi') {
          toggleMultiSelect(actualIndex)
        }
      },
      onMouseEnter: () => {
        if (selectionMode === 'single') {
          selectIndex(actualIndex)
        }
      },
      children: jsx('hstack', {
        gap: 1,
        style: style({
          ...rowStyle,
          background: isSelected ? Colors.blue : 'transparent',
          foreground: isSelected ? Colors.white : Colors.white,
          bold: isFocused
        }),
        children: cells
      })
    })
  }
  
  function renderEmptyState(): JSX.Element {
    if (typeof props.emptyMessage === 'string') {
      return jsx('text', {
        style: style().foreground(Colors.gray).italic(),
        children: props.emptyMessage || 'No data to display'
      })
    }
    return props.emptyMessage || jsx('text', {
      style: style().foreground(Colors.gray).italic(),
      children: 'No data to display'
    })
  }
  
  function renderFilter(): JSX.Element | null {
    if (!props.showFilter) return null
    
    return jsx('hstack', {
      gap: 1,
      style: style().marginBottom(1),
      children: [
        jsx('text', { children: '🔍' }),
        jsx('text-input', {
          value: filterValue,
          placeholder: props.filterPlaceholder || 'Filter...',
          onSubmit: (value) => {
            filterValue.value = value
            props.onFilter?.(value)
          }
        })
      ]
    })
  }
  
  function renderScrollbar(): JSX.Element | null {
    if (!props.showScrollbar || !canScroll.value) return null
    
    const height = props.height || props.maxHeight || 10
    const scrollPercent = scrollOffset.value / (sortedData.value.length - height)
    const thumbPosition = Math.floor(scrollPercent * (height - 1))
    
    return jsx('vstack', {
      style: style().position('absolute').right(0).top(0),
      children: Array.from({ length: height }, (_, i) => 
        jsx('text', {
          children: i === thumbPosition ? '█' : '│',
          style: style().foreground(i === thumbPosition ? Colors.white : Colors.gray)
        })
      )
    })
  }
  
  // Main render
  const tableStyle = $derived(() => {
    const baseStyle = props.style || {}
    return style({
      ...baseStyle,
      position: 'relative',
      height: props.height,
      maxHeight: props.maxHeight,
      overflow: 'hidden',
      border: showBorder ? 'single' : 'none',
      padding: showBorder ? 1 : 0
    })
  })
  
  return jsx('interactive', {
    onKeyPress: handleKeyPress,
    onFocus: () => { focused.value = true },
    onBlur: () => { focused.value = false },
    onMouseEnter: () => { hovering.value = true },
    onMouseLeave: () => { hovering.value = false },
    focusable,
    className: props.className,
    children: jsx('vstack', {
      style: tableStyle.value,
      children: [
        renderFilter(),
        renderHeader(),
        sortedData.value.length === 0
          ? renderEmptyState()
          : jsx('box', {
              style: style().position('relative'),
              children: [
                jsx('vstack', {
                  children: visibleRows.value.map((row, index) => 
                    renderRow(row, index)
                  )
                }),
                renderScrollbar()
              ]
            })
      ]
    })
  })
}

// Preset table styles
export function DataTable<T = any>(props: TableProps<T>): JSX.Element {
  return Table({
    showBorder: true,
    showHeader: true,
    showScrollbar: true,
    highlightOnFocus: true,
    ...props
  })
}

export function CompactTable<T = any>(props: TableProps<T>): JSX.Element {
  return Table({
    showBorder: false,
    showHeader: true,
    showScrollbar: false,
    ...props,
    headerStyle: style().foreground(Colors.gray).marginBottom(0),
    rowStyle: (_, __, selected) => style()
      .background(selected ? Colors.blue : 'transparent')
      .foreground(selected ? Colors.white : Colors.white)
  })
}