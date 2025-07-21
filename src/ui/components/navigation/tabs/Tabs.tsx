/**
 * Tabs Component - Multi-view interface with tab navigation
 * 
 * Inspired by tab patterns from the Bubbletea ecosystem:
 * - Multiple tab views with content switching
 * - Keyboard navigation between tabs
 * - Customizable styling and layout
 * - Support for dynamic tab content
 * - Tab state management
 */

import { Effect, Option } from "effect"
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
 * Individual tab configuration
 */
export interface Tab<T> {
  readonly id: string
  readonly title: string
  readonly content: T
  readonly disabled?: boolean
  readonly badge?: string
  readonly icon?: string
}

/**
 * Tab props
 */
export interface TabsProps<T> {
  readonly tabs: ReadonlyArray<Tab<T>>
  readonly activeTabId?: string
  readonly tabBarVisible?: boolean
  readonly styles?: Partial<TabStyles>
  readonly orientation?: 'horizontal' | 'vertical'
  readonly onTabChange?: (tabId: string) => void
  readonly renderContent?: (content: T) => View
}

/**
 * Tab styling options
 */
export interface TabStyles extends ComponentStyles {
  readonly activeTab: Style
  readonly inactiveTab: Style
  readonly disabledTab: Style
  readonly tabSeparator: Style
  readonly content: Style
  readonly badge: Style
  readonly tabBar: Style
}

/**
 * Tabs model
 */
export interface TabsModel<T> extends Focusable, Sized, Disableable {
  readonly id: string
  readonly props: TabsProps<T>
  readonly activeTabId: string
}

/**
 * Tab messages
 */
export type TabsMsg<T> = 
  | { readonly _tag: "selectTab"; readonly tabId: string }
  | { readonly _tag: "nextTab" }
  | { readonly _tag: "prevTab" }
  | { readonly _tag: "addTab"; readonly tab: Tab<T> }
  | { readonly _tag: "removeTab"; readonly tabId: string }
  | { readonly _tag: "updateTab"; readonly tabId: string; readonly updates: Partial<Tab<T>> }
  | { readonly _tag: "focus" }
  | { readonly _tag: "blur" }

// =============================================================================
// Default Styles
// =============================================================================

export const defaultTabStyles: TabStyles = {
  focused: style().bold(),
  blurred: style(),
  disabled: style().faint(),
  activeTab: style().foreground(Colors.brightWhite).background(Colors.blue),
  inactiveTab: style().foreground(Colors.gray),
  disabledTab: style().foreground(Colors.darkGray),
  tabSeparator: style().foreground(Colors.gray),
  content: style().foreground(Colors.white),
  badge: style().foreground(Colors.yellow),
  tabBar: style()
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Find tab by ID
 */
const findTab = <T,>(tabs: ReadonlyArray<Tab<T>>, tabId: string): Tab<T> | null => {
  return tabs.find(tab => tab.id === tabId) || null
}

/**
 * Get next enabled tab ID
 */
const getNextTabId = <T,>(tabs: ReadonlyArray<Tab<T>>, currentId: string): string | null => {
  const currentIndex = tabs.findIndex(tab => tab.id === currentId)
  if (currentIndex === -1) return null
  
  for (let i = 1; i < tabs.length; i++) {
    const nextIndex = (currentIndex + i) % tabs.length
    const nextTab = tabs[nextIndex]
    if (nextTab && !nextTab.disabled) {
      return nextTab.id
    }
  }
  
  return null
}

/**
 * Get previous enabled tab ID
 */
const getPrevTabId = <T,>(tabs: ReadonlyArray<Tab<T>>, currentId: string): string | null => {
  const currentIndex = tabs.findIndex(tab => tab.id === currentId)
  if (currentIndex === -1) return null
  
  for (let i = 1; i < tabs.length; i++) {
    const prevIndex = (currentIndex - i + tabs.length) % tabs.length
    const prevTab = tabs[prevIndex]
    if (prevTab && !prevTab.disabled) {
      return prevTab.id
    }
  }
  
  return null
}

// =============================================================================
// Helper Components
// =============================================================================

const TabTitle = <T,>({ 
  tab, 
  isActive, 
  isFocused, 
  styles 
}: { 
  tab: Tab<T>
  isActive: boolean
  isFocused: boolean
  styles: TabStyles 
}) => {
  let tabStyle = styles.inactiveTab
  
  if (tab.disabled) {
    tabStyle = styles.disabledTab
  } else if (isActive) {
    tabStyle = styles.activeTab
  }
  
  if (isFocused && !tab.disabled) {
    tabStyle = tabStyle.merge(styles.focused)
  }
  
  const parts: View[] = []
  
  if (tab.icon) {
    parts.push(<Text>{tab.icon} </Text>)
  }
  
  parts.push(<Text>{tab.title}</Text>)
  
  if (tab.badge) {
    parts.push(<Text style={styles.badge}> ({tab.badge})</Text>)
  }
  
  return <Text style={tabStyle}>{h(...parts)}</Text>
}

const TabBar = <T,>({ 
  model, 
  styles,
  orientation 
}: { 
  model: TabsModel<T>
  styles: TabStyles
  orientation: 'horizontal' | 'vertical'
}) => {
  const tabs = model.props.tabs.map((tab, index) => {
    const isActive = tab.id === model.activeTabId
    const isFocused = model.focused
    
    const tabView = (
      <TabTitle 
        tab={tab} 
        isActive={isActive} 
        isFocused={isFocused && isActive}
        styles={styles}
      />
    )
    
    if (orientation === 'horizontal' && index < model.props.tabs.length - 1) {
      return h(tabView, <Text style={styles.tabSeparator}> | </Text>)
    }
    
    return tabView
  })
  
  const TabContainer = orientation === 'horizontal' ? Flex : Box
  const containerProps = orientation === 'horizontal' 
    ? { direction: 'horizontal' as const, gap: 0 }
    : {}
  
  return (
    <Box style={styles.tabBar}>
      <TabContainer {...containerProps}>
        {orientation === 'horizontal' ? hstack(...tabs) : vstack(...tabs)}
      </TabContainer>
    </Box>
  )
}

const TabContent = <T,>({ 
  content, 
  renderContent,
  style: contentStyle 
}: { 
  content: T
  renderContent?: (content: T) => View
  style: Style
}) => {
  if (renderContent) {
    return renderContent(content)
  }
  
  // Default rendering for string content
  if (typeof content === 'string') {
    return <Text style={contentStyle}>{content}</Text>
  }
  
  // For View content, return as-is
  return content as unknown as View
}

// =============================================================================
// Component Implementation
// =============================================================================

export const Tabs = <T,>(props: TabsProps<T> = { tabs: [] }): UIComponent<TabsModel<T>, TabsMsg<T>> => {
  const styles: TabStyles = { ...defaultTabStyles, ...props.styles }
  
  return {
    id: generateComponentId("tabs"),
    
    init() {
      const activeTabId = props.activeTabId || 
        (props.tabs.length > 0 ? props.tabs[0]!.id : '')
      
      const model: TabsModel<T> = {
        id: generateComponentId("tabs"),
        props,
        activeTabId,
        focused: false,
        disabled: false,
        width: 80,
        height: 24
      }
      
      return Effect.succeed([model, []])
    },
    
    update(msg: TabsMsg<T>, model: TabsModel<T>) {
      switch (msg._tag) {
        case "selectTab": {
          const tab = findTab(model.props.tabs, msg.tabId)
          if (!tab || tab.disabled) {
            return Effect.succeed([model, []])
          }
          
          if (model.props.onTabChange) {
            model.props.onTabChange(msg.tabId)
          }
          
          return Effect.succeed([
            { ...model, activeTabId: msg.tabId },
            []
          ])
        }
        
        case "nextTab": {
          const nextId = getNextTabId(model.props.tabs, model.activeTabId)
          if (!nextId) {
            return Effect.succeed([model, []])
          }
          
          if (model.props.onTabChange) {
            model.props.onTabChange(nextId)
          }
          
          return Effect.succeed([
            { ...model, activeTabId: nextId },
            []
          ])
        }
        
        case "prevTab": {
          const prevId = getPrevTabId(model.props.tabs, model.activeTabId)
          if (!prevId) {
            return Effect.succeed([model, []])
          }
          
          if (model.props.onTabChange) {
            model.props.onTabChange(prevId)
          }
          
          return Effect.succeed([
            { ...model, activeTabId: prevId },
            []
          ])
        }
        
        case "focus": {
          return Effect.succeed([
            { ...model, focused: true },
            []
          ])
        }
        
        case "blur": {
          return Effect.succeed([
            { ...model, focused: false },
            []
          ])
        }
        
        default:
          return Effect.succeed([model, []])
      }
    },
    
    view(model: TabsModel<T>): View {
      const activeTab = findTab(model.props.tabs, model.activeTabId)
      const orientation = model.props.orientation ?? 'horizontal'
      const showTabBar = model.props.tabBarVisible ?? true
      
      const views: View[] = []
      
      // Tab bar
      if (showTabBar) {
        views.push(
          <TabBar 
            model={model} 
            styles={styles}
            orientation={orientation}
          />
        )
        
        // Separator between tab bar and content
        if (orientation === 'horizontal') {
          views.push(<Text style={styles.tabSeparator}>{'─'.repeat(model.width)}</Text>)
        }
      }
      
      // Tab content
      if (activeTab) {
        views.push(
          <TabContent 
            content={activeTab.content}
            renderContent={model.props.renderContent}
            style={styles.content}
          />
        )
      }
      
      return orientation === 'horizontal' 
        ? vstack(...views)
        : <Flex direction="horizontal" gap={2}>{hstack(...views)}</Flex>
    },
    
    // Focus management
    focus() {
      return Effect.succeed({ _tag: "focus" as const })
    },
    
    blur() {
      return Effect.succeed({ _tag: "blur" as const })
    },
    
    focused(model: TabsModel<T>) {
      return model.focused
    },
    
    // Size management
    setSize(width: number, height?: number) {
      return Effect.succeed(undefined)
    },
    
    getSize(model: TabsModel<T>) {
      return { width: model.width, height: model.height }
    },
    
    // Keyboard handling
    handleKey(key: KeyEvent, model: TabsModel<T>): TabsMsg<T> | null {
      if (model.disabled || !model.focused) return null
      
      switch (key.key) {
        case "tab":
          if (key.shift) {
            return { _tag: "prevTab" }
          } else {
            return { _tag: "nextTab" }
          }
        case "left":
        case "h":
          if (model.props.orientation !== 'vertical') {
            return { _tag: "prevTab" }
          }
          break
        case "right":
        case "l":
          if (model.props.orientation !== 'vertical') {
            return { _tag: "nextTab" }
          }
          break
        case "up":
        case "k":
          if (model.props.orientation === 'vertical') {
            return { _tag: "prevTab" }
          }
          break
        case "down":
        case "j":
          if (model.props.orientation === 'vertical') {
            return { _tag: "nextTab" }
          }
          break
      }
      
      // Number keys for quick tab selection
      if (key.runes && key.runes.length === 1) {
        const num = parseInt(key.runes, 10)
        if (!isNaN(num) && num >= 1 && num <= 9 && num <= model.props.tabs.length) {
          const tab = model.props.tabs[num - 1]
          if (tab && !tab.disabled) {
            return { _tag: "selectTab", tabId: tab.id }
          }
        }
      }
      
      return null
    },
    
    // Mouse handling (basic support)
    handleMouse(mouse: MouseEvent, model: TabsModel<T>): TabsMsg<T> | null {
      if (model.disabled || mouse.type !== 'press' || mouse.button !== 'left') return null
      
      // Would need coordinate mapping to detect tab clicks
      return null
    }
  }
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create tabs with string content
 */
export const SimpleTabs = (props: {
  tabs: ReadonlyArray<{ id: string; title: string; content: string }>
} & Omit<TabsProps<string>, 'tabs'>) => {
  return Tabs<string>({
    ...props,
    tabs: props.tabs
  })
}

/**
 * Create tabs with View content
 */
export const ViewTabs = (props: {
  tabs: ReadonlyArray<{ id: string; title: string; content: View }>
} & Omit<TabsProps<View>, 'tabs'>) => {
  return Tabs<View>({
    ...props,
    tabs: props.tabs
  })
}