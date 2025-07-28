/**
 * Tabs Component - Multi-view interface with tab navigation
 *
 * Features:
 * - Multiple tab views with content switching
 * - Keyboard navigation between tabs
 * - Customizable styling and layout
 * - Support for dynamic tab content
 * - Tab state management
 * - Icons and badges support
 * - Closeable tabs
 *
 * @example
 * ```tsx
 * import { Tabs, Tab } from 'tuix/components/navigation/tabs'
 *
 * function MyApp() {
 *   const activeTab = $state(0)
 *
 *   return (
 *     <Tabs activeIndex={activeTab}>
 *       <Tab label="General" icon="⚙️">
 *         <text>General settings content</text>
 *       </Tab>
 *       <Tab label="Advanced" badge="3">
 *         <text>Advanced settings content</text>
 *       </Tab>
 *       <Tab label="About">
 *         <text>About content</text>
 *       </Tab>
 *     </Tabs>
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
export interface TabProps {
  label: string
  icon?: string | JSX.Element
  badge?: string | number
  closeable?: boolean
  disabled?: boolean
  children: JSX.Element | JSX.Element[]
}

export interface TabsProps {
  children: JSX.Element | JSX.Element[]
  activeIndex?: number | StateRune<number>
  onTabChange?: (index: number) => void
  onTabClose?: (index: number) => void
  orientation?: 'horizontal' | 'vertical'
  tabPosition?: 'top' | 'bottom' | 'left' | 'right'
  tabAlign?: 'start' | 'center' | 'end' | 'stretch'
  showBorder?: boolean
  focusable?: boolean
  autoFocus?: boolean
  wrap?: boolean
  className?: string
  style?: Style
  tabStyle?: Style | ((index: number, active: boolean, focused: boolean) => Style)
  tabBarStyle?: Style
  contentStyle?: Style
}

/**
 * Tab Component (used as child of Tabs)
 */
export function Tab(props: TabProps): JSX.Element {
  // Tab is just a container for props, rendering is handled by Tabs
  return jsx('tab', props)
}

/**
 * Tabs Component
 */
export function Tabs(props: TabsProps): JSX.Element {
  // Extract tab information from children
  const tabs = $derived(() => {
    const children = Array.isArray(props.children) ? props.children : [props.children]
    return children
      .filter(child => child && child.type === 'tab')
      .map(child => child.props as TabProps)
  })

  // Internal state
  const focused = $state(props.autoFocus || false)
  const hovering = $state(false)
  const internalActiveIndex = $state(0)
  const focusedTabIndex = $state(0)

  // Active index management
  const activeIndex = $derived(() => {
    if (props.activeIndex !== undefined) {
      return isStateRune(props.activeIndex) ? props.activeIndex() : props.activeIndex
    }
    return internalActiveIndex()
  })

  // Ensure active index is valid
  // Only run effect in component context (not in tests)
  if (typeof $effect !== 'undefined') {
    try {
      $effect(() => {
        const maxIndex = tabs().length - 1
        if (activeIndex() > maxIndex) {
          setActiveIndex(maxIndex)
        } else if (activeIndex() < 0 && tabs().length > 0) {
          setActiveIndex(0)
        }
      })
    } catch (e) {
      // Ignore effect errors in test environment
      console.error(e)
    }
  }

  // Configuration
  const orientation = props.orientation || 'horizontal'
  const tabPosition = props.tabPosition || (orientation === 'horizontal' ? 'top' : 'left')
  const tabAlign = props.tabAlign || 'start'
  const showBorder = props.showBorder !== false
  const focusable = props.focusable !== false

  // Helper functions
  function setActiveIndex(index: number) {
    if (tabs()[index]?.disabled) return

    if (isStateRune(props.activeIndex)) {
      props.activeIndex.$set(index)
    } else {
      internalActiveIndex.$set(index)
    }
    props.onTabChange?.(index)
  }

  function closeTab(index: number) {
    props.onTabClose?.(index)
  }

  // Keyboard navigation
  function handleKeyPress(key: string) {
    if (!focused() || !focusable) return

    const isHorizontal = orientation === 'horizontal'
    const nextKey = isHorizontal ? 'ArrowRight' : 'ArrowDown'
    const prevKey = isHorizontal ? 'ArrowLeft' : 'ArrowUp'

    switch (key) {
      case nextKey:
      case 'l':
      case 'Tab':
        moveTabFocus(1)
        break
      case prevKey:
      case 'h':
      case 'Shift+Tab':
        moveTabFocus(-1)
        break
      case 'Home':
        focusedTabIndex.$set(0)
        break
      case 'End':
        focusedTabIndex.$set(tabs().length - 1)
        break
      case 'Enter':
      case ' ':
        setActiveIndex(focusedTabIndex())
        break
      case 'Delete':
      case 'Backspace':
        if (tabs()[focusedTabIndex()]?.closeable) {
          closeTab(focusedTabIndex())
        }
        break
    }
  }

  function moveTabFocus(delta: number) {
    const newIndex = focusedTabIndex() + delta
    const maxIndex = tabs().length - 1

    if (props.wrap) {
      focusedTabIndex.$set((newIndex + tabs().length) % tabs().length)
    } else {
      focusedTabIndex.$set(Math.max(0, Math.min(maxIndex, newIndex)))
    }

    // Skip disabled tabs
    if (tabs()[focusedTabIndex()]?.disabled) {
      moveTabFocus(delta > 0 ? 1 : -1)
    }
  }

  // Render helpers
  function renderTab(tab: TabProps, index: number): JSX.Element {
    const isActive = index === activeIndex()
    const isFocused = focused() && index === focusedTabIndex()
    const isDisabled = tab.disabled || false

    const tabStyle =
      typeof props.tabStyle === 'function'
        ? props.tabStyle(index, isActive, isFocused)
        : props.tabStyle

    const baseStyle = style({
      padding: { horizontal: 2, vertical: 0 },
      cursor: isDisabled ? 'not-allowed' : 'pointer',
      opacity: isDisabled ? 0.5 : 1,
      ...tabStyle,
    })

    const activeStyle = isActive
      ? style({
          background: Colors.blue,
          foreground: Colors.white,
          bold: true,
        })
      : style({
          background: 'transparent',
          foreground: Colors.gray,
        })

    const focusStyle =
      isFocused && !isActive
        ? style({
            background: Colors.gray,
            foreground: Colors.white,
          })
        : {}

    const content: JSX.Element[] = []

    // Icon
    if (tab.icon) {
      content.push(typeof tab.icon === 'string' ? jsx('text', { children: tab.icon }) : tab.icon)
    }

    // Label
    content.push(jsx('text', { children: tab.label }))

    // Badge
    if (tab.badge !== undefined) {
      content.push(
        jsx('text', {
          style: style()
            .background(isActive ? Colors.white : Colors.blue)
            .foreground(isActive ? Colors.blue : Colors.white)
            .padding({ horizontal: 1 })
            .borderRadius(2),
          children: String(tab.badge),
        })
      )
    }

    // Close button
    if (tab.closeable) {
      content.push(
        jsx('interactive', {
          onClick: (e: any) => {
            e.stopPropagation?.()
            closeTab(index)
          },
          children: jsx('text', {
            style: style().foreground(Colors.red).marginLeft(1),
            children: '×',
          }),
        })
      )
    }

    return jsx('interactive', {
      onClick: () => !isDisabled && setActiveIndex(index),
      onMouseEnter: () => {
        if (!isDisabled) {
          focusedTabIndex.$set(index)
        }
      },
      children: jsx('box', {
        style: style({
          ...baseStyle,
          ...activeStyle,
          ...focusStyle,
        }),
        children: jsx('hstack', {
          gap: 1,
          align: 'middle',
          children: content,
        }),
      }),
    })
  }

  function renderTabBar(): JSX.Element {
    const tabElements = tabs().map((tab, index) => renderTab(tab, index))

    const barStyle = style({
      ...props.tabBarStyle,
      justifyContent: tabAlign === 'stretch' ? 'space-between' : tabAlign,
      borderBottom: showBorder && tabPosition === 'top' ? 'single' : 'none',
      borderTop: showBorder && tabPosition === 'bottom' ? 'single' : 'none',
      borderRight: showBorder && tabPosition === 'left' ? 'single' : 'none',
      borderLeft: showBorder && tabPosition === 'right' ? 'single' : 'none',
    })

    return jsx(orientation === 'horizontal' ? 'hstack' : 'vstack', {
      style: barStyle,
      gap: 0,
      children: tabElements,
    })
  }

  function renderContent(): JSX.Element | null {
    const activeTab = tabs()[activeIndex()]
    if (!activeTab) return null

    return jsx('box', {
      style: props.contentStyle || style().padding(1),
      children: activeTab.children,
    })
  }

  // Main render
  const containerStyle = $derived(() => {
    const baseStyle = props.style || {}
    return style({
      ...baseStyle,
      border: showBorder ? 'single' : 'none',
    })
  })

  const layout = () => {
    const tabBar = renderTabBar()
    const content = renderContent()

    if (orientation === 'horizontal') {
      return tabPosition === 'top' ? [tabBar, content] : [content, tabBar]
    } else {
      return tabPosition === 'left'
        ? jsx('hstack', { children: [tabBar, content] })
        : jsx('hstack', { children: [content, tabBar] })
    }
  }

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
    focusable,
    className: props.className,
    children: jsx('vstack', {
      style: containerStyle(),
      children: layout(),
    }),
  })
}

// Preset tab styles
export function SimpleTabs(props: Omit<TabsProps, 'style'>): JSX.Element {
  return Tabs({
    showBorder: false,
    tabStyle: (_, active) =>
      style()
        .padding({ horizontal: 2, vertical: 0 })
        .foreground(active ? Colors.white : Colors.gray)
        .underline(active),
    ...props,
  })
}

export function PillTabs(props: TabsProps): JSX.Element {
  return Tabs({
    showBorder: false,
    tabStyle: (_, active, focused) =>
      style()
        .padding({ horizontal: 3, vertical: 1 })
        .background(active ? Colors.blue : focused ? Colors.gray : 'transparent')
        .foreground(active || focused ? Colors.white : Colors.gray),
    tabBarStyle: style().padding(1),
    ...props,
  })
}

export function VerticalTabs(props: Omit<TabsProps, 'orientation'>): JSX.Element {
  return Tabs({
    orientation: 'vertical',
    tabPosition: 'left',
    ...props,
  })
}
