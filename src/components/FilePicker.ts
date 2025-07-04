/**
 * FilePicker Component - Directory navigation and file selection
 * 
 * Features:
 * - Directory tree navigation
 * - File and folder listing
 * - Keyboard navigation (arrow keys, Enter, backspace)
 * - File filtering by extension
 * - Path breadcrumbs
 * - Selection modes (file, directory, or both)
 * - File metadata display (size, date modified)
 * - Hidden file toggle
 */

import { Effect } from "effect"
import type { View, Cmd, AppServices, KeyEvent } from "../core/types.ts"
import { text, vstack, hstack, styledText } from "../core/view.ts"
import { style, Colors, Borders } from "../styling/index.ts"
import { styledBox } from "../layout/box.ts"
import { stringWidth } from "../utils/string-width.ts"

// =============================================================================
// Types
// =============================================================================

export interface FileItem {
  readonly name: string
  readonly path: string
  readonly isDirectory: boolean
  readonly size?: number
  readonly lastModified?: Date
  readonly permissions?: string
  readonly hidden: boolean
}

export interface FilePickerConfig {
  readonly startPath?: string
  readonly width?: number
  readonly height?: number
  readonly showHidden?: boolean
  readonly allowedExtensions?: string[] // ['.ts', '.js', etc.]
  readonly selectionMode?: 'file' | 'directory' | 'both'
  readonly showFileInfo?: boolean
  readonly showPath?: boolean
  readonly multiSelect?: boolean
}

export interface FilePickerModel {
  readonly config: FilePickerConfig
  readonly currentPath: string
  readonly items: FileItem[]
  readonly selectedIndex: number
  readonly selectedItems: Set<string> // For multi-select
  readonly loading: boolean
  readonly error?: string
  readonly showHidden: boolean
}

export type FilePickerMsg =
  | { readonly _tag: "NavigateUp" }
  | { readonly _tag: "NavigateDown" }
  | { readonly _tag: "NavigatePageUp" }
  | { readonly _tag: "NavigatePageDown" }
  | { readonly _tag: "SelectItem" }
  | { readonly _tag: "ToggleSelection" } // For multi-select
  | { readonly _tag: "GoBack" } // Navigate to parent directory
  | { readonly _tag: "GoHome" } // Navigate to home directory
  | { readonly _tag: "EnterDirectory" }
  | { readonly _tag: "RefreshDirectory" }
  | { readonly _tag: "ToggleHidden" }
  | { readonly _tag: "SetPath"; readonly path: string }
  | { readonly _tag: "LoadDirectory"; readonly path: string }
  | { readonly _tag: "DirectoryLoaded"; readonly items: FileItem[] }
  | { readonly _tag: "LoadError"; readonly error: string }
  | { readonly _tag: "FilterChanged"; readonly filter: string }

// =============================================================================
// Default Configuration
// =============================================================================

const defaultConfig: FilePickerConfig = {
  startPath: ".",
  width: 80,
  height: 20,
  showHidden: false,
  selectionMode: 'file',
  showFileInfo: true,
  showPath: true,
  multiSelect: false
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get file extension
 */
const getFileExtension = (filename: string): string => {
  const lastDot = filename.lastIndexOf('.')
  return lastDot > 0 ? filename.substring(lastDot) : ''
}

/**
 * Check if file should be shown based on filters
 */
const shouldShowFile = (item: FileItem, config: FilePickerConfig, showHidden: boolean): boolean => {
  // Hidden files
  if (item.hidden && !showHidden) {
    return false
  }
  
  // Extension filter
  if (config.allowedExtensions && !item.isDirectory) {
    const ext = getFileExtension(item.name)
    if (!config.allowedExtensions.includes(ext)) {
      return false
    }
  }
  
  return true
}

/**
 * Filter and sort items
 */
const processItems = (items: FileItem[], config: FilePickerConfig, showHidden: boolean): FileItem[] => {
  return items
    .filter(item => shouldShowFile(item, config, showHidden))
    .sort((a, b) => {
      // Directories first
      if (a.isDirectory && !b.isDirectory) return -1
      if (!a.isDirectory && b.isDirectory) return 1
      
      // Then alphabetical
      return a.name.toLowerCase().localeCompare(b.name.toLowerCase())
    })
}

/**
 * Format file size for display
 */
const formatFileSize = (bytes?: number): string => {
  if (!bytes) return '-'
  
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let size = bytes
  let unitIndex = 0
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }
  
  return `${size.toFixed(unitIndex === 0 ? 0 : 1)}${units[unitIndex]}`
}

/**
 * Format date for display
 */
const formatDate = (date?: Date): string => {
  if (!date) return '-'
  
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } else if (diffDays < 7) {
    return `${diffDays}d ago`
  } else {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }
}

/**
 * Get file icon based on type
 */
const getFileIcon = (item: FileItem): string => {
  if (item.isDirectory) {
    return item.name.startsWith('.') ? '📁' : '📂'
  }
  
  const ext = getFileExtension(item.name).toLowerCase()
  
  switch (ext) {
    case '.ts':
    case '.js':
    case '.tsx':
    case '.jsx':
      return '📜'
    case '.json':
      return '📋'
    case '.md':
    case '.txt':
      return '📄'
    case '.png':
    case '.jpg':
    case '.gif':
    case '.svg':
      return '🖼️'
    case '.zip':
    case '.tar':
    case '.gz':
      return '📦'
    case '.exe':
    case '.app':
      return '⚙️'
    default:
      return '📄'
  }
}

/**
 * Create breadcrumb path display
 */
const createBreadcrumbs = (currentPath: string, maxWidth: number): View => {
  const parts = currentPath.split('/').filter(Boolean)
  let breadcrumb = '/'
  
  if (parts.length > 0) {
    const totalLength = parts.join('/').length + 1
    if (totalLength > maxWidth - 10) {
      // Truncate path if too long
      breadcrumb = '/.../' + parts.slice(-2).join('/')
    } else {
      breadcrumb = '/' + parts.join('/')
    }
  }
  
  return styledText(`📍 ${breadcrumb}`, style().foreground(Colors.blue).bold())
}

/**
 * Mock directory loading (in real implementation, this would use file system APIs)
 */
const loadDirectoryItems = (path: string): Effect.Effect<FileItem[], never, never> => {
  // Mock file system data
  const mockItems: FileItem[] = [
    {
      name: '..',
      path: '../',
      isDirectory: true,
      hidden: false
    },
    {
      name: 'src',
      path: 'src/',
      isDirectory: true,
      size: 0,
      lastModified: new Date('2024-01-15'),
      hidden: false
    },
    {
      name: 'examples',
      path: 'examples/',
      isDirectory: true,
      size: 0,
      lastModified: new Date('2024-01-16'),
      hidden: false
    },
    {
      name: 'package.json',
      path: 'package.json',
      isDirectory: false,
      size: 1024,
      lastModified: new Date('2024-01-14'),
      hidden: false
    },
    {
      name: 'README.md',
      path: 'README.md',
      isDirectory: false,
      size: 2048,
      lastModified: new Date('2024-01-13'),
      hidden: false
    },
    {
      name: '.gitignore',
      path: '.gitignore',
      isDirectory: false,
      size: 512,
      lastModified: new Date('2024-01-12'),
      hidden: true
    },
    {
      name: '.env',
      path: '.env',
      isDirectory: false,
      size: 256,
      lastModified: new Date('2024-01-11'),
      hidden: true
    }
  ]
  
  return Effect.succeed(mockItems)
}

// =============================================================================
// Component
// =============================================================================

export const filePicker = (config: Partial<FilePickerConfig> = {}): {
  init: Effect.Effect<[FilePickerModel, Cmd<FilePickerMsg>[]], never, AppServices>
  update: (msg: FilePickerMsg, model: FilePickerModel) => Effect.Effect<[FilePickerModel, Cmd<FilePickerMsg>[]], never, AppServices>
  view: (model: FilePickerModel) => View
  handleKey?: (key: KeyEvent, model: FilePickerModel) => FilePickerMsg | null
} => {
  const finalConfig = { ...defaultConfig, ...config }
  
  return {
    init: Effect.gen(function* () {
      const startPath = finalConfig.startPath ?? '.'
      
      // Load initial directory
      const items = yield* loadDirectoryItems(startPath)
      
      const initialModel = {
        config: finalConfig,
        currentPath: startPath,
        items: processItems(items, finalConfig, finalConfig.showHidden ?? false),
        selectedIndex: 0,
        selectedItems: new Set(),
        loading: false,
        showHidden: finalConfig.showHidden ?? false
      }
      
      return [initialModel, []]
    }),
    
    update(msg: FilePickerMsg, model: FilePickerModel) {
      switch (msg._tag) {
        case "NavigateUp":
          return Effect.succeed([
            {
              ...model,
              selectedIndex: Math.max(0, model.selectedIndex - 1)
            },
            []
          ])
        
        case "NavigateDown":
          return Effect.succeed([
            {
              ...model,
              selectedIndex: Math.min(model.items.length - 1, model.selectedIndex + 1)
            },
            []
          ])
        
        case "NavigatePageUp":
          const pageSize = Math.floor((model.config.height ?? defaultConfig.height!) / 2)
          return Effect.succeed([
            {
              ...model,
              selectedIndex: Math.max(0, model.selectedIndex - pageSize)
            },
            []
          ])
        
        case "NavigatePageDown":
          const pageSizeDown = Math.floor((model.config.height ?? defaultConfig.height!) / 2)
          return Effect.succeed([
            {
              ...model,
              selectedIndex: Math.min(model.items.length - 1, model.selectedIndex + pageSizeDown)
            },
            []
          ])
        
        case "SelectItem":
          const selectedItem = model.items[model.selectedIndex]
          if (!selectedItem) {
            return Effect.succeed([model, []])
          }
          
          if (selectedItem.isDirectory) {
            return Effect.succeed([model, [Effect.succeed({ _tag: "EnterDirectory" })] as Cmd<FilePickerMsg>[]])
          } else {
            // File selected - in real implementation, this would emit selection event
            return Effect.succeed([model, []])
          }
        
        case "ToggleSelection":
          if (!model.config.multiSelect) {
            return Effect.succeed([model, []])
          }
          
          const item = model.items[model.selectedIndex]
          if (!item) {
            return Effect.succeed([model, []])
          }
          
          const newSelected = new Set(model.selectedItems)
          if (newSelected.has(item.path)) {
            newSelected.delete(item.path)
          } else {
            newSelected.add(item.path)
          }
          
          return Effect.succeed([
            { ...model, selectedItems: newSelected },
            []
          ])
        
        case "GoBack":
          if (model.currentPath === '/' || model.currentPath === '.') {
            return Effect.succeed([model, []])
          }
          
          const parentPath = model.currentPath.split('/').slice(0, -1).join('/') || '/'
          
          const loadCmd: Cmd<FilePickerMsg> = Effect.gen(function* () {
            const items = yield* loadDirectoryItems(parentPath)
            return { _tag: "DirectoryLoaded", items } as FilePickerMsg
          })
          
          return Effect.succeed([
            {
              ...model,
              currentPath: parentPath,
              loading: true,
              selectedIndex: 0
            },
            [loadCmd]
          ])
        
        case "GoHome":
          const homeLoadCmd: Cmd<FilePickerMsg> = Effect.gen(function* () {
            const items = yield* loadDirectoryItems('~')
            return { _tag: "DirectoryLoaded", items } as FilePickerMsg
          })
          
          return Effect.succeed([
            {
              ...model,
              currentPath: '~',
              loading: true,
              selectedIndex: 0
            },
            [homeLoadCmd]
          ])
        
        case "EnterDirectory":
          const selectedDir = model.items[model.selectedIndex]
          if (!selectedDir || !selectedDir.isDirectory) {
            return Effect.succeed([model, []])
          }
          
          let newPath: string
          if (selectedDir.name === '..') {
            newPath = model.currentPath.split('/').slice(0, -1).join('/') || '/'
          } else {
            newPath = model.currentPath === '/' 
              ? `/${selectedDir.name}`
              : `${model.currentPath}/${selectedDir.name}`
          }
          
          const enterLoadCmd: Cmd<FilePickerMsg> = Effect.gen(function* () {
            const items = yield* loadDirectoryItems(newPath)
            return { _tag: "DirectoryLoaded", items } as FilePickerMsg
          })
          
          return Effect.succeed([
            {
              ...model,
              currentPath: newPath,
              loading: true,
              selectedIndex: 0
            },
            [enterLoadCmd]
          ])
        
        case "RefreshDirectory":
          const refreshCmd: Cmd<FilePickerMsg> = Effect.gen(function* () {
            const items = yield* loadDirectoryItems(model.currentPath)
            return { _tag: "DirectoryLoaded", items } as FilePickerMsg
          })
          
          return Effect.succeed([
            { ...model, loading: true },
            [refreshCmd]
          ])
        
        case "ToggleHidden":
          return Effect.succeed([
            { ...model, showHidden: !model.showHidden },
            []
          ])
        
        case "LoadDirectory":
          const directoryLoadCmd: Cmd<FilePickerMsg> = Effect.gen(function* () {
            const items = yield* loadDirectoryItems(msg.path)
            return { _tag: "DirectoryLoaded", items } as FilePickerMsg
          })
          
          return Effect.succeed([
            {
              ...model,
              currentPath: msg.path,
              loading: true,
              selectedIndex: 0
            },
            [directoryLoadCmd]
          ])
        
        case "DirectoryLoaded":
          const processedItems = processItems(msg.items, model.config, model.showHidden)
          
          return Effect.succeed([
            {
              ...model,
              items: processedItems,
              loading: false,
              error: undefined,
              selectedIndex: Math.min(model.selectedIndex, processedItems.length - 1)
            },
            []
          ])
        
        case "LoadError":
          return Effect.succeed([
            {
              ...model,
              loading: false,
              error: msg.error
            },
            []
          ])
        
        case "SetPath":
          return Effect.succeed([model, [Effect.succeed({ _tag: "LoadDirectory", path: msg.path })] as Cmd<FilePickerMsg>[]])
        
        case "FilterChanged":
          // In real implementation, this would update file filters
          return Effect.succeed([model, []])
      }
    },
    
    view(model: FilePickerModel): View {
      const width = model.config.width ?? defaultConfig.width!
      const height = model.config.height ?? defaultConfig.height!
      
      if (model.loading) {
        return styledBox(
          vstack(
            text(""),
            hstack(
              text("  "),
              styledText("⠋", style().foreground(Colors.blue).bold()),
              text(" "),
              styledText("Loading directory...", style().foreground(Colors.gray))
            ),
            text("")
          ),
          {
            border: Borders.Rounded,
            minWidth: width,
            minHeight: height,
            style: style().background(Colors.black).foreground(Colors.white)
          }
        )
      }
      
      if (model.error) {
        return styledBox(
          vstack(
            text(""),
            styledText(`❌ Error: ${model.error}`, style().foreground(Colors.red)),
            text(""),
            styledText("Press 'r' to retry", style().foreground(Colors.gray))
          ),
          {
            border: Borders.Rounded,
            minWidth: width,
            minHeight: height,
            style: style().background(Colors.black).foreground(Colors.white)
          }
        )
      }
      
      const content: View[] = []
      
      // Path breadcrumbs
      if (model.config.showPath) {
        content.push(createBreadcrumbs(model.currentPath, width - 4))
        content.push(text(""))
      }
      
      // File list
      const maxItems = height - (model.config.showPath ? 6 : 4)
      const startIndex = Math.max(0, model.selectedIndex - Math.floor(maxItems / 2))
      const endIndex = Math.min(model.items.length, startIndex + maxItems)
      
      for (let i = startIndex; i < endIndex; i++) {
        const item = model.items[i]
        if (!item) continue
        
        const isSelected = i === model.selectedIndex
        const isMultiSelected = model.selectedItems.has(item.path)
        
        let itemStyle = style().foreground(Colors.white)
        let prefix = "  "
        
        if (isSelected) {
          itemStyle = style().background(Colors.blue).foreground(Colors.white).bold()
          prefix = "► "
        } else if (item.isDirectory) {
          itemStyle = style().foreground(Colors.brightBlue)
        }
        
        if (isMultiSelected) {
          prefix = "✓ "
        }
        
        const icon = getFileIcon(item)
        let displayName = `${prefix}${icon} ${item.name}`
        
        if (model.config.showFileInfo && !item.isDirectory) {
          const size = formatFileSize(item.size)
          const date = formatDate(item.lastModified)
          const maxNameWidth = width - 20 // Reserve space for size and date
          
          if (stringWidth(displayName) > maxNameWidth) {
            displayName = displayName.substring(0, maxNameWidth - 3) + "..."
          }
          
          const padding = " ".repeat(Math.max(0, maxNameWidth - stringWidth(displayName)))
          displayName = `${displayName}${padding} ${size.padStart(6)} ${date}`
        }
        
        content.push(styledText(displayName, itemStyle))
      }
      
      // Status bar
      content.push(text(""))
      const statusParts: string[] = []
      statusParts.push(`${model.items.length} items`)
      
      if (model.config.multiSelect && model.selectedItems.size > 0) {
        statusParts.push(`${model.selectedItems.size} selected`)
      }
      
      if (model.showHidden) {
        statusParts.push("hidden shown")
      }
      
      content.push(styledText(statusParts.join(" • "), style().foreground(Colors.gray)))
      
      // Help text
      content.push(text(""))
      content.push(styledText("↑↓: Navigate • Enter: Select • Backspace: Up • h: Toggle hidden • r: Refresh", 
        style().foreground(Colors.gray)))
      
      return styledBox(
        vstack(...content),
        {
          border: Borders.Rounded,
          padding: { top: 1, right: 2, bottom: 1, left: 2 },
          minWidth: width,
          minHeight: height,
          style: style().background(Colors.black).foreground(Colors.white)
        }
      )
    },
    
    handleKey(key: KeyEvent, model: FilePickerModel): FilePickerMsg | null {
      switch (key.key) {
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
        case 'enter':
        case ' ':
          return { _tag: "SelectItem" }
        case 'tab':
          if (model.config.multiSelect) {
            return { _tag: "ToggleSelection" }
          }
          break
        case 'backspace':
        case 'left':
          return { _tag: "GoBack" }
        case 'home':
          return { _tag: "GoHome" }
        case 'r':
          return { _tag: "RefreshDirectory" }
        case 'h':
          return { _tag: "ToggleHidden" }
      }
      
      return null
    }
  }
}