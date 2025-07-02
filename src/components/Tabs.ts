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
import type { View, Cmd, AppServices, KeyEvent, MouseEvent } from "@/core/types.ts"
import { style, Colors, type Style } from "@/styling/index.ts"
import { text, vstack, hstack } from "@/core/view.ts"
import {
  type UIComponent,
  type ComponentStyles,
  type Focusable,
  type Sized,
  type Disableable,
  generateComponentId
} from "./base.ts"

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
 * Tab styling options
 */
export interface TabStyles extends ComponentStyles {
  readonly activeTab: Style
  readonly inactiveTab: Style
  readonly disabledTab: Style
  readonly tabSeparator: Style
  readonly content: Style
  readonly badge: Style
}

/**
 * Tabs model
 */
export interface TabsModel<T> extends Focusable, Sized, Disableable {
  readonly id: string
  readonly tabs: ReadonlyArray<Tab<T>>
  readonly activeTabId: string
  readonly tabBarVisible: boolean
  readonly styles: TabStyles
}

/**
 * Tab messages
 */
export type TabsMsg<T> = 
  | { readonly tag: "selectTab"; readonly tabId: string }
  | { readonly tag: "nextTab" }
  | { readonly tag: "prevTab" }
  | { readonly tag: "addTab"; readonly tab: Tab<T> }
  | { readonly tag: "removeTab"; readonly tabId: string }
  | { readonly tag: "updateTab"; readonly tabId: string; readonly updates: Partial<Tab<T>> }
  | { readonly tag: "focus" }
  | { readonly tag: "blur" }

// =============================================================================
// Default Styles
// =============================================================================

export const defaultTabStyles: TabStyles = {
  activeTab: style(Colors.BrightWhite).background(Colors.Blue),
  inactiveTab: style(Colors.Gray),
  disabledTab: style(Colors.DarkGray),
  tabSeparator: style(Colors.Gray),
  content: style(Colors.White),
  badge: style(Colors.Yellow)
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Find tab by ID
 */
const findTab = <T>(tabs: ReadonlyArray<Tab<T>>, tabId: string): Tab<T> | null => {
  return tabs.find(tab => tab.id === tabId) || null
}

/**
 * Get next enabled tab ID
 */
const getNextTabId = <T>(tabs: ReadonlyArray<Tab<T>>, currentId: string): string | null => {
  const currentIndex = tabs.findIndex(tab => tab.id === currentId)
  if (currentIndex === -1) return null
  
  for (let i = 1; i < tabs.length; i++) {
    const nextIndex = (currentIndex + i) % tabs.length
    const nextTab = tabs[nextIndex]
    if (!nextTab.disabled) {
      return nextTab.id
    }
  }
  
  return null
}

/**
 * Get previous enabled tab ID
 */
const getPrevTabId = <T>(tabs: ReadonlyArray<Tab<T>>, currentId: string): string | null => {
  const currentIndex = tabs.findIndex(tab => tab.id === currentId)
  if (currentIndex === -1) return null
  
  for (let i = 1; i < tabs.length; i++) {
    const prevIndex = (currentIndex - i + tabs.length) % tabs.length
    const prevTab = tabs[prevIndex]
    if (!prevTab.disabled) {
      return prevTab.id
    }
  }
  
  return null
}

/**
 * Format tab title with icon and badge
 */
const formatTabTitle = <T>(tab: Tab<T>): string => {
  let title = ""
  
  if (tab.icon) {
    title += `${tab.icon} `
  }
  
  title += tab.title
  
  if (tab.badge) {
    title += ` (${tab.badge})`
  }
  
  return title
}

// =============================================================================
// Component Implementation
// =============================================================================

/**
 * Creates a new tabs component
 */
export const tabs = <T>(options: {
  tabs: ReadonlyArray<Tab<T>>
  activeTabId?: string
  tabBarVisible?: boolean
  styles?: Partial<TabStyles>
  width?: number
  height?: number
} = {} as any): UIComponent<TabsModel<T>, TabsMsg<T>> => {
  const id = generateComponentId("tabs")
  const tabList = options.tabs || []
  const initialActiveId = options.activeTabId || (tabList.length > 0 ? tabList[0].id : "")
  const tabBarVisible = options.tabBarVisible ?? true
  const width = options.width ?? 80
  const height = options.height ?? 20
  const styles = { ...defaultTabStyles, ...options.styles }
  
  return {
    id,
    
    // Initialize tabs
    init() {
      const model: TabsModel<T> = {
        id,
        tabs: tabList,
        activeTabId: initialActiveId,
        tabBarVisible,
        styles,
        focused: false,
        disabled: false,
        width,
        height
      }
      
      return Effect.succeed([model, []])
    },
    
    // Update tabs state
    update(msg: TabsMsg<T>, model: TabsModel<T>) {
      switch (msg.tag) {
        case "selectTab": {
          const tab = findTab(model.tabs, msg.tabId)
          if (!tab || tab.disabled) {
            return Effect.succeed([model, []])
          }
          
          return Effect.succeed([{ ...model, activeTabId: msg.tabId }, []])
        }
        
        case "nextTab": {
          const nextId = getNextTabId(model.tabs, model.activeTabId)
          if (!nextId) {
            return Effect.succeed([model, []])
          }
          
          return Effect.succeed([{ ...model, activeTabId: nextId }, []])
        }
        
        case "prevTab": {
          const prevId = getPrevTabId(model.tabs, model.activeTabId)
          if (!prevId) {
            return Effect.succeed([model, []])
          }
          
          return Effect.succeed([{ ...model, activeTabId: prevId }, []])
        }
        
        case "addTab": {
          const newTabs = [...model.tabs, msg.tab]
          return Effect.succeed([{ ...model, tabs: newTabs }, []])
        }
        
        case "removeTab": {
          const newTabs = model.tabs.filter(tab => tab.id !== msg.tabId)
          
          // If removing active tab, switch to first available tab
          let newActiveId = model.activeTabId
          if (model.activeTabId === msg.tabId && newTabs.length > 0) {
            const firstEnabledTab = newTabs.find(tab => !tab.disabled)
            newActiveId = firstEnabledTab ? firstEnabledTab.id : newTabs[0].id
          }
          
          return Effect.succeed([{
            ...model,
            tabs: newTabs,
            activeTabId: newActiveId
          }, []])
        }
        
        case "updateTab": {
          const newTabs = model.tabs.map(tab =>
            tab.id === msg.tabId ? { ...tab, ...msg.updates } : tab
          )
          
          return Effect.succeed([{ ...model, tabs: newTabs }, []])
        }
        
        case "focus": {
          return Effect.succeed([{ ...model, focused: true }, []])
        }
        
        case "blur": {
          return Effect.succeed([{ ...model, focused: false }, []])
        }
      }
    },
    
    // Render tabs
    view(model: TabsModel<T>) {
      const views: View[] = []
      
      // Tab bar
      if (model.tabBarVisible && model.tabs.length > 0) {
        const tabElements = model.tabs.map(tab => {
          const isActive = tab.id === model.activeTabId
          const title = formatTabTitle(tab)
          
          let tabStyle = model.styles.inactiveTab
          if (tab.disabled) {
            tabStyle = model.styles.disabledTab
          } else if (isActive) {
            tabStyle = model.styles.activeTab
          }
          
          return text(` ${title} `, tabStyle)
        })
        
        // Add separators between tabs
        const tabBar: View[] = []
        tabElements.forEach((tabElement, index) => {
          tabBar.push(tabElement)
          if (index < tabElements.length - 1) {
            tabBar.push(text("│", model.styles.tabSeparator))
          }
        })
        
        views.push(hstack(...tabBar))
        
        // Separator line under tabs
        const separatorLine = "─".repeat(model.width)
        views.push(text(separatorLine, model.styles.tabSeparator))
      }
      
      // Active tab content
      const activeTab = findTab(model.tabs, model.activeTabId)
      if (activeTab) {
        // For now, we'll render content as string representation
        // In a real implementation, this would need to handle View rendering
        const contentText = typeof activeTab.content === 'string' 
          ? activeTab.content 
          : JSON.stringify(activeTab.content, null, 2)
        
        views.push(text(contentText, model.styles.content))
      }
      
      return vstack(...views)
    },
    
    // Focus management
    focus() {
      return Effect.succeed({ tag: "focus" as const })
    },
    
    blur() {
      return Effect.succeed({ tag: "blur" as const })
    },
    
    focused(model: TabsModel<T>) {
      return model.focused
    },
    
    // Size management
    setSize(width: number, height?: number) {
      return Effect.succeed(undefined)
    },
    
    getSize(model: TabsModel<T>) {
      const tabBarHeight = model.tabBarVisible ? 2 : 0
      const contentHeight = model.height - tabBarHeight
      return { width: model.width, height: model.height }
    },
    
    // Keyboard handling
    handleKey(key: KeyEvent, model: TabsModel<T>): TabsMsg<T> | null {
      if (model.disabled || !model.focused) return null
      
      switch (key.key) {
        case "left":
        case "shift+tab":
          return { tag: "prevTab" }
        case "right":
        case "tab":
          return { tag: "nextTab" }
        case "1":
        case "2":
        case "3":
        case "4":
        case "5":
        case "6":
        case "7":
        case "8":
        case "9":
          const tabIndex = parseInt(key.key) - 1
          if (tabIndex >= 0 && tabIndex < model.tabs.length) {
            const targetTab = model.tabs[tabIndex]
            if (!targetTab.disabled) {
              return { tag: "selectTab", tabId: targetTab.id }
            }
          }
          return null
        default:
          return null
      }
    },
    
    // Mouse handling (basic support)
    handleMouse(mouse: MouseEvent, model: TabsModel<T>): TabsMsg<T> | null {
      if (model.disabled || mouse.type !== 'press' || mouse.button !== 'left') return null
      
      // Basic click handling - would need coordinate mapping for full support
      return { tag: "focus" }
    }
  }
}

// =============================================================================
// Helper Functions for Tab Creation
// =============================================================================

/**
 * Create a simple tab
 */
export const createTab = <T>(
  id: string,
  title: string,
  content: T,
  options: Partial<Omit<Tab<T>, 'id' | 'title' | 'content'>> = {}
): Tab<T> => ({
  id,
  title,
  content,
  disabled: false,
  ...options
})

/**
 * Create tabs with string content
 */
export const stringTabs = (
  tabData: Array<{ id: string; title: string; content: string; icon?: string; badge?: string }>
) => {
  const tabList = tabData.map(data => createTab(data.id, data.title, data.content, {
    icon: data.icon,
    badge: data.badge
  }))
  
  return tabs({ tabs: tabList })
}

/**
 * Create tabs with view content (placeholder for future view system)
 */
export const viewTabs = <T>(
  tabData: Array<{ id: string; title: string; content: T; icon?: string; badge?: string }>
) => {
  const tabList = tabData.map(data => createTab(data.id, data.title, data.content, {
    icon: data.icon,
    badge: data.badge
  }))
  
  return tabs({ tabs: tabList })
}