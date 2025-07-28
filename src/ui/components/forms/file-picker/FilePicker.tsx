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

import { Effect } from 'effect'
import type { View, Cmd, AppServices, KeyEvent } from '@core/types'
import { vstack, hstack } from '@core/view'
import { style, Colors, Borders } from '@core/terminal/ansi/styles/index'
import { stringWidth } from '@core/terminal/output/string-width'
import { Box } from '@ui/components/layout/box/Box'
import { Text } from '@ui/components/display/text/Text'
import { Flex } from '@ui/components/layout/flex/Flex'
import { List, type ListItem } from '@ui/components/data/list/List'
import { Spinner } from '@ui/components/feedback/spinner/Spinner'

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

export interface FilePickerProps {
  readonly startPath?: string
  readonly width?: number
  readonly height?: number
  readonly showHidden?: boolean
  readonly allowedExtensions?: string[] // ['.ts', '.js', etc.]
  readonly selectionMode?: 'file' | 'directory' | 'both'
  readonly showFileInfo?: boolean
  readonly showPath?: boolean
  readonly multiSelect?: boolean
  readonly onSelect?: (items: FileItem[]) => void
  readonly onPathChange?: (path: string) => void
  readonly fileSystemService?: FileSystemService
}

export interface FilePickerModel {
  readonly props: FilePickerProps
  readonly currentPath: string
  readonly items: FileItem[]
  readonly selectedItems: Set<string> // For multi-select
  readonly loading: boolean
  readonly error?: string
  readonly showHidden: boolean
}

export type FilePickerMsg =
  | { readonly _tag: 'SelectItem'; readonly item: FileItem }
  | { readonly _tag: 'ToggleSelection'; readonly item: FileItem } // For multi-select
  | { readonly _tag: 'GoBack' } // Navigate to parent directory
  | { readonly _tag: 'GoHome' } // Navigate to home directory
  | { readonly _tag: 'EnterDirectory'; readonly path: string }
  | { readonly _tag: 'RefreshDirectory' }
  | { readonly _tag: 'ToggleHidden' }
  | { readonly _tag: 'SetPath'; readonly path: string }
  | { readonly _tag: 'LoadDirectory'; readonly path: string }
  | { readonly _tag: 'DirectoryLoaded'; readonly items: FileItem[] }
  | { readonly _tag: 'LoadError'; readonly error: string }
  | { readonly _tag: 'FilterChanged'; readonly filter: string }

// =============================================================================
// Default Configuration
// =============================================================================

const defaultProps: Partial<FilePickerProps> = {
  startPath: '.',
  width: 80,
  height: 20,
  showHidden: false,
  selectionMode: 'file',
  showFileInfo: true,
  showPath: true,
  multiSelect: false,
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Path utilities for safer path manipulation
 */
const PathUtils = {
  /**
   * Get file extension
   */
  getExtension: (filename: string): string => {
    const lastDot = filename.lastIndexOf('.')
    return lastDot > 0 ? filename.substring(lastDot) : ''
  },

  /**
   * Join path components safely
   */
  join: (...parts: string[]): string => {
    return (
      parts
        .filter(Boolean)
        .join('/')
        .replace(/\/+/g, '/') // Remove duplicate slashes
        .replace(/\/$/, '') || '/'
    ) // Remove trailing slash except for root
  },

  /**
   * Get parent directory path
   */
  getParent: (path: string): string => {
    if (path === '/' || path === '.') return path
    const parts = path.split('/').filter(Boolean)
    return parts.length <= 1 ? '/' : '/' + parts.slice(0, -1).join('/')
  },

  /**
   * Normalize path for consistent handling
   */
  normalize: (path: string): string => {
    return path.replace(/\/+/g, '/').replace(/\/$/, '') || '/'
  },
}

/**
 * Check if file should be shown based on filters
 */
const shouldShowFile = (item: FileItem, props: FilePickerProps, showHidden: boolean): boolean => {
  // Hidden files
  if (item.hidden && !showHidden) {
    return false
  }

  // Extension filter
  if (props.allowedExtensions && !item.isDirectory) {
    const ext = PathUtils.getExtension(item.name)
    if (!props.allowedExtensions.includes(ext)) {
      return false
    }
  }

  return true
}

/**
 * Filter and sort items
 */
const processItems = (
  items: FileItem[],
  props: FilePickerProps,
  showHidden: boolean
): FileItem[] => {
  return items
    .filter(item => shouldShowFile(item, props, showHidden))
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

  const ext = PathUtils.getExtension(item.name).toLowerCase()

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
 * File system service interface for dependency injection
 */
export interface FileSystemService {
  readDirectory: (path: string) => Effect.Effect<FileItem[], Error, never>
}

/**
 * Default file system service implementation
 * In a real application, this would be injected as a service
 */
const createDefaultFileSystemService = (): FileSystemService => ({
  readDirectory: (path: string): Effect.Effect<FileItem[], Error, never> => {
    // Simplified mock implementation for demonstration
    // In production, this would interface with actual file system APIs
    const baseItems: FileItem[] = [
      {
        name: '..',
        path: PathUtils.join(path, '..'),
        isDirectory: true,
        hidden: false,
      },
    ]

    // Generate some common files based on the path
    const commonFiles: Omit<FileItem, 'path'>[] = [
      { name: 'src', isDirectory: true, size: 0, lastModified: new Date(), hidden: false },
      {
        name: 'package.json',
        isDirectory: false,
        size: 1024,
        lastModified: new Date(),
        hidden: false,
      },
      {
        name: 'README.md',
        isDirectory: false,
        size: 2048,
        lastModified: new Date(),
        hidden: false,
      },
      { name: '.gitignore', isDirectory: false, size: 512, lastModified: new Date(), hidden: true },
    ]

    const items = [
      ...baseItems,
      ...commonFiles.map(item => ({
        ...item,
        path: PathUtils.join(path, item.name),
      })),
    ]

    return Effect.succeed(items)
  },
})

// =============================================================================
// Helper Components
// =============================================================================

const Breadcrumbs = ({ path, width }: { path: string; width: number }) => {
  const normalizedPath = PathUtils.normalize(path)
  const parts = normalizedPath === '/' ? [] : normalizedPath.split('/').filter(Boolean)
  let breadcrumb = '/'

  if (parts.length > 0) {
    const fullPath = '/' + parts.join('/')
    if (fullPath.length > width - 10) {
      // Truncate path if too long
      breadcrumb = '/.../' + parts.slice(-2).join('/')
    } else {
      breadcrumb = fullPath
    }
  }

  return <Text style={style().foreground(Colors.blue).bold()}>📍 {breadcrumb}</Text>
}

const FileItemRenderer = ({
  item,
  selected,
  focused,
  showFileInfo,
}: {
  item: FileItem
  selected: boolean
  focused: boolean
  showFileInfo: boolean
}) => {
  const icon = getFileIcon(item)
  const name = item.name
  const size = showFileInfo && !item.isDirectory ? formatFileSize(item.size) : ''
  const date = showFileInfo ? formatDate(item.lastModified) : ''

  return (
    <Flex direction="row" gap={2}>
      <Text>{icon}</Text>
      <Text style={focused ? style().bold() : style()}>{name}</Text>
      {showFileInfo && (
        <>
          <Flex flex={1} />
          <Text style={style().foreground(Colors.gray)}>{size}</Text>
          <Text style={style().foreground(Colors.gray)}>{date}</Text>
        </>
      )}
    </Flex>
  )
}

const ErrorMessage = ({ error }: { error: string }) => (
  <Box
    border={Borders.Rounded}
    padding={{ vertical: 1, horizontal: 2 }}
    style={style().background(Colors.red).foreground(Colors.white)}
  >
    <Text>⚠️ Error: {error}</Text>
  </Box>
)

const LoadingIndicator = () => (
  <Flex direction="row" gap={1} justify="center" align="center">
    <Spinner size="small" />
    <Text>Loading directory...</Text>
  </Flex>
)

// =============================================================================
// Component Implementation
// =============================================================================

export const FilePicker = (props: FilePickerProps = {}) => {
  const finalProps = { ...defaultProps, ...props }
  const fileSystemService = props.fileSystemService ?? createDefaultFileSystemService()

  // Convert FileItems to ListItems for the List component
  const convertToListItems = (items: FileItem[]): ListItem<FileItem>[] => {
    return items.map(item => ({
      id: item.path,
      label: item.name,
      value: item,
    }))
  }

  return {
    init: Effect.gen(function* () {
      const startPath = finalProps.startPath ?? '.'

      // Load initial directory
      const items = yield* fileSystemService.readDirectory(startPath)

      const initialModel: FilePickerModel = {
        props: finalProps,
        currentPath: startPath,
        items: processItems(items, finalProps, finalProps.showHidden ?? false),
        selectedItems: new Set<string>(),
        loading: false,
        showHidden: finalProps.showHidden ?? false,
      }

      return [initialModel, []]
    }),

    update(
      msg: FilePickerMsg,
      model: FilePickerModel
    ): Effect.Effect<[FilePickerModel, Cmd<FilePickerMsg>[]], never, AppServices> {
      switch (msg._tag) {
        case 'SelectItem': {
          if (msg.item.isDirectory) {
            return Effect.succeed([
              { ...model, loading: true },
              [Effect.succeed({ _tag: 'EnterDirectory' as const, path: msg.item.path })],
            ])
          }

          // File selection
          if (model.props.selectionMode === 'file' || model.props.selectionMode === 'both') {
            const selectedItems = model.props.multiSelect
              ? new Set(model.selectedItems).add(msg.item.path)
              : new Set([msg.item.path])

            if (model.props.onSelect) {
              const selected = model.items.filter(item => selectedItems.has(item.path))
              model.props.onSelect(selected)
            }

            return Effect.succeed([{ ...model, selectedItems }, []])
          }

          return Effect.succeed([model, []])
        }

        case 'EnterDirectory': {
          return Effect.gen(function* () {
            try {
              const items = yield* fileSystemService.readDirectory(msg.path)
              const processedItems = processItems(items, model.props, model.showHidden)

              if (model.props.onPathChange) {
                model.props.onPathChange(msg.path)
              }

              return [
                {
                  ...model,
                  currentPath: msg.path,
                  items: processedItems,
                  selectedItems: new Set(),
                  loading: false,
                  error: undefined,
                },
                [],
              ]
            } catch (error) {
              return [
                {
                  ...model,
                  loading: false,
                  error: String(error),
                },
                [],
              ]
            }
          })
        }

        case 'GoBack': {
          const parentPath = PathUtils.getParent(model.currentPath)
          return Effect.succeed([
            { ...model, loading: true },
            [Effect.succeed({ _tag: 'EnterDirectory' as const, path: parentPath })],
          ])
        }

        case 'GoHome': {
          const homePath = process.env.HOME || '/'
          return Effect.succeed([
            { ...model, loading: true },
            [Effect.succeed({ _tag: 'EnterDirectory' as const, path: homePath })],
          ])
        }

        case 'ToggleHidden': {
          const newShowHidden = !model.showHidden
          const processedItems = processItems(model.items, model.props, newShowHidden)

          return Effect.succeed([
            {
              ...model,
              showHidden: newShowHidden,
              items: processedItems,
            },
            [],
          ])
        }

        case 'RefreshDirectory': {
          return Effect.succeed([
            { ...model, loading: true },
            [Effect.succeed({ _tag: 'LoadDirectory' as const, path: model.currentPath })],
          ])
        }

        case 'DirectoryLoaded': {
          const processedItems = processItems(msg.items, model.props, model.showHidden)

          return Effect.succeed([
            {
              ...model,
              items: processedItems,
              loading: false,
              error: undefined,
            },
            [],
          ])
        }

        case 'LoadError': {
          return Effect.succeed([
            {
              ...model,
              loading: false,
              error: msg.error,
            },
            [],
          ])
        }

        default:
          return Effect.succeed([model, []])
      }
    },

    view(model: FilePickerModel): View {
      const lines: View[] = []

      // Path breadcrumbs
      if (model.props.showPath) {
        lines.push(<Breadcrumbs path={model.currentPath} width={model.props.width ?? 80} />)
        lines.push(<Text>{''}</Text>) // Spacer
      }

      // Error display
      if (model.error) {
        lines.push(<ErrorMessage error={model.error} />)
        return vstack(...lines)
      }

      // Loading indicator
      if (model.loading) {
        lines.push(<LoadingIndicator />)
        return vstack(...lines)
      }

      // File list
      const listItems = convertToListItems(model.items)
      const fileList = List<FileItem>({
        items: listItems,
        multiSelect: model.props.multiSelect,
        height: (model.props.height ?? 20) - (model.props.showPath ? 3 : 1),
        width: model.props.width,
        showStatusBar: true,
        itemRenderer: (item, selected, focused) => (
          <FileItemRenderer
            item={item.value}
            selected={selected}
            focused={focused}
            showFileInfo={model.props.showFileInfo ?? true}
          />
        ),
        onSelect: items => {
          if (items.length > 0 && model.props.onSelect) {
            model.props.onSelect(items.map(item => item.value))
          }
        },
      })

      // Hidden files toggle hint
      const hiddenHint = model.showHidden ? (
        <Text style={style().foreground(Colors.gray)}>Press H to hide hidden files</Text>
      ) : (
        <Text style={style().foreground(Colors.gray)}>Press H to show hidden files</Text>
      )

      return (
        <Box
          width={model.props.width}
          height={model.props.height}
          border={Borders.Rounded}
          padding={1}
        >
          {vstack(...lines, fileList.view(model), hiddenHint)}
        </Box>
      )
    },

    handleKey(key: KeyEvent, model: FilePickerModel): FilePickerMsg | null {
      switch (key.key) {
        case 'backspace':
        case 'delete':
          return { _tag: 'GoBack' }
        case 'h':
          if (key.ctrl) {
            return { _tag: 'GoHome' }
          } else {
            return { _tag: 'ToggleHidden' }
          }
        case 'r':
          if (key.ctrl) {
            return { _tag: 'RefreshDirectory' }
          }
          break
      }

      return null
    },
  }
}
