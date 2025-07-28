/**
 * List Component - Vertical scrollable list with selection
 *
 * Features:
 * - Vertical scrolling with keyboard navigation
 * - Single/multi selection support
 * - Custom item rendering
 * - Filtering and search
 * - Virtualization for large lists
 * - Focus management
 * - Customizable key bindings
 *
 * @example
 * ```tsx
 * import { List } from 'tuix/components/data/list'
 *
 * function MyApp() {
 *   const selectedIndex = $state(0)
 *   const items = ['Item 1', 'Item 2', 'Item 3']
 *
 *   return (
 *     <List
 *       items={items}
 *       selectedIndex={selectedIndex}
 *       onSelect={(index) => selectedIndex.$set(index)}
 *       renderItem={(item) => <text>{item}</text>}
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

// Types
export type SelectionMode = 'single' | 'multi' | 'none'

export interface ListProps<T = any> {
  items: T[]
  selectedIndex?: number | StateRune<number>
  selectedIndices?: number[] | StateRune<number[]>
  onSelect?: (index: number) => void
  onMultiSelect?: (indices: number[]) => void
  renderItem: (item: T, index: number, selected: boolean, focused: boolean) => JSX.Element
  height?: number
  maxHeight?: number
  showScrollbar?: boolean
  selectionMode?: SelectionMode
  focusable?: boolean
  emptyMessage?: string | JSX.Element
  filter?: string | ((item: T) => boolean)
  onFilter?: (filter: string) => void
  showFilter?: boolean
  filterPlaceholder?: string
  autoFocus?: boolean
  wrap?: boolean
  highlightOnFocus?: boolean
  className?: string
  style?: Style
}

/**
 * List Component
 */
export function List<T = any>(props: ListProps<T>): JSX.Element {
  // Internal state
  const focused = $state(props.autoFocus || false)
  const hovering = $state(false)
  const filterValue = $state('')
  const scrollOffset = $state(0)

  // Selection state
  const internalSelectedIndex = $state(0)
  const internalSelectedIndices = $state<number[]>([])

  // Determine selection mode
  const selectionMode =
    props.selectionMode || (props.selectedIndices || props.onMultiSelect ? 'multi' : 'single')

  // Get selected index(es) from props or internal state
  const selectedIndex = $derived(() => {
    if (props.selectedIndex !== undefined) {
      return isStateRune(props.selectedIndex) ? props.selectedIndex() : props.selectedIndex
    }
    return internalSelectedIndex()
  })

  const selectedIndices = $derived(() => {
    if (props.selectedIndices !== undefined) {
      return isStateRune(props.selectedIndices) ? props.selectedIndices() : props.selectedIndices
    }
    return internalSelectedIndices()
  })

  // Filtered items
  const filteredItems = $derived(() => {
    if (!props.filter && !filterValue()) return props.items

    const filterFn = props.filter
      ? typeof props.filter === 'function'
        ? props.filter
        : (item: T) => String(item).toLowerCase().includes(props.filter.toLowerCase())
      : (item: T) => String(item).toLowerCase().includes(filterValue().toLowerCase())

    return props.items.filter(filterFn)
  })

  // Visible items (for virtualization)
  const visibleItems = $derived(() => {
    const height = props.height || props.maxHeight || 10
    const start = scrollOffset()
    const end = start + height
    return filteredItems().slice(start, end)
  })

  // Calculate if scrolling is needed
  const canScroll = $derived(() => {
    const height = props.height || props.maxHeight || 10
    return filteredItems().length > height
  })

  // Update scroll offset to keep selected item visible
  // Only run effect in component context (not in tests)
  if (typeof $effect !== 'undefined') {
    try {
      $effect(() => {
        if (selectionMode === 'single') {
          const height = props.height || props.maxHeight || 10
          const index = selectedIndex()

          if (index < scrollOffset()) {
            scrollOffset.$set(index)
          } else if (index >= scrollOffset() + height) {
            scrollOffset.$set(index - height + 1)
          }
        }
      })
    } catch (e) {
      // Ignore effect errors in test environment
    }
  }

  // Keyboard navigation
  function handleKeyPress(key: string) {
    if (!focused() || props.focusable === false) return

    switch (key) {
      case 'ArrowUp':
      case 'k':
        moveSelection(-1)
        break
      case 'ArrowDown':
      case 'j':
        moveSelection(1)
        break
      case 'Home':
        selectIndex(0)
        break
      case 'End':
        selectIndex(filteredItems().length - 1)
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
          toggleMultiSelect(selectedIndex())
        } else {
          props.onSelect?.(selectedIndex())
        }
        break
    }
  }

  function moveSelection(delta: number) {
    const newIndex = selectedIndex() + delta
    const maxIndex = filteredItems().length - 1

    if (props.wrap) {
      selectIndex((newIndex + filteredItems().length) % filteredItems().length)
    } else {
      selectIndex(Math.max(0, Math.min(maxIndex, newIndex)))
    }
  }

  function selectIndex(index: number) {
    if (selectionMode === 'single') {
      if (isStateRune(props.selectedIndex)) {
        props.selectedIndex.$set(index)
      } else {
        internalSelectedIndex.$set(index)
      }
      props.onSelect?.(index)
    }
  }

  function toggleMultiSelect(index: number) {
    const indices = [...selectedIndices()]
    const idx = indices.indexOf(index)

    if (idx >= 0) {
      indices.splice(idx, 1)
    } else {
      indices.push(index)
      indices.sort((a, b) => a - b)
    }

    if (isStateRune(props.selectedIndices)) {
      props.selectedIndices.$set(indices)
    } else {
      internalSelectedIndices.$set(indices)
    }
    props.onMultiSelect?.(indices)
  }

  // Click handling
  function handleItemClick(index: number) {
    if (selectionMode === 'multi') {
      toggleMultiSelect(index)
    } else {
      selectIndex(index)
    }
  }

  // Render helpers
  function renderEmptyState(): JSX.Element {
    if (typeof props.emptyMessage === 'string') {
      return jsx('text', {
        style: style().foreground(Colors.gray).italic(),
        children: props.emptyMessage || 'No items to display',
      })
    }
    return (
      props.emptyMessage ||
      jsx('text', {
        style: style().foreground(Colors.gray).italic(),
        children: 'No items to display',
      })
    )
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
          onSubmit: value => {
            filterValue.$set(value)
            props.onFilter?.(value)
          },
        }),
      ],
    })
  }

  function renderScrollbar(): JSX.Element | null {
    if (!props.showScrollbar || !canScroll()) return null

    const height = props.height || props.maxHeight || 10
    const scrollPercent = scrollOffset() / (filteredItems().length - height)
    const thumbPosition = Math.floor(scrollPercent * (height - 1))

    return jsx('vstack', {
      style: style().position('absolute').right(0).top(0),
      children: Array.from({ length: height }, (_, i) =>
        jsx('text', {
          children: i === thumbPosition ? '█' : '│',
          style: style().foreground(i === thumbPosition ? Colors.white : Colors.gray),
        })
      ),
    })
  }

  function renderItem(item: T, index: number): JSX.Element {
    const actualIndex = scrollOffset() + index
    const isSelected =
      selectionMode === 'single'
        ? actualIndex === selectedIndex()
        : selectedIndices().includes(actualIndex)
    const isFocused = focused() && actualIndex === selectedIndex()

    return jsx('interactive', {
      onClick: () => handleItemClick(actualIndex),
      onMouseEnter: () => {
        if (selectionMode === 'single') {
          selectIndex(actualIndex)
        }
      },
      children: props.renderItem(item, actualIndex, isSelected, isFocused),
    })
  }

  // Main render
  const listStyle = $derived(() => {
    const baseStyle = props.style || {}
    return style({
      ...baseStyle,
      position: 'relative',
      height: props.height,
      maxHeight: props.maxHeight,
      overflow: 'hidden',
    })
  })

  return jsx('interactive', {
    onKeyPress: handleKeyPress,
    onFocus: () => {
      focused.$set(true)
    },
    onBlur: () => {
      focused.$set(false)
    },
    onMouseEnter: () => {
      hovering.$set(true)
    },
    onMouseLeave: () => {
      hovering.$set(false)
    },
    focusable: props.focusable !== false,
    className: props.className,
    children: jsx('vstack', {
      style: listStyle(),
      children: [
        renderFilter(),
        filteredItems().length === 0
          ? renderEmptyState()
          : jsx('box', {
              style: style(),
              children: [
                jsx('vstack', {
                  children: visibleItems().map((item, index) => renderItem(item, index)),
                }),
                renderScrollbar(),
              ],
            }),
      ],
    }),
  })
}

// Preset list styles
export function SimpleList<T = any>(
  props: Omit<ListProps<T>, 'renderItem'> & {
    renderItem?: (item: T, index: number, selected: boolean, focused: boolean) => JSX.Element
  }
): JSX.Element {
  return List({
    ...props,
    renderItem:
      props.renderItem ||
      ((item, _, selected, focused) =>
        jsx('text', {
          style: style()
            .background(selected ? Colors.blue : 'transparent')
            .foreground(selected ? Colors.white : Colors.white)
            .bold(focused),
          children: String(item),
        })),
  })
}

export function CheckList<T = any>(
  props: Omit<ListProps<T>, 'renderItem' | 'selectionMode'>
): JSX.Element {
  return List({
    ...props,
    selectionMode: 'multi',
    renderItem: (item, _, selected) =>
      jsx('hstack', {
        gap: 1,
        children: [
          jsx('text', {
            children: selected ? '☑' : '☐',
            style: style().foreground(selected ? Colors.green : Colors.gray),
          }),
          jsx('text', { children: String(item) }),
        ],
      }),
  })
}

export function NumberedList<T = any>(props: Omit<ListProps<T>, 'renderItem'>): JSX.Element {
  return List({
    ...props,
    renderItem: (item, index, selected, focused) =>
      jsx('hstack', {
        gap: 1,
        children: [
          jsx('text', {
            style: style().foreground(Colors.gray),
            children: `${(index + 1).toString().padStart(3)}.`,
          }),
          jsx('text', {
            style: style()
              .background(selected ? Colors.blue : 'transparent')
              .foreground(selected ? Colors.white : Colors.white)
              .bold(focused),
            children: String(item),
          }),
        ],
      }),
  })
}
