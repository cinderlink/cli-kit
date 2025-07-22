import { Box, Text, List, Button } from 'tuix/components'
import { $state, $derived, onMount } from 'tuix/runes'
import type { CommandHandler } from 'tuix/cli'

interface FileSystemItem {
  name: string
  type: 'file' | 'directory'
  size?: number
  modified?: Date
  permissions?: string
}

export const FileExplorerCommand: CommandHandler = ({ args, options }) => {
  const { path } = args as { path: string }
  const { showHidden } = options as { showHidden: boolean }
  
  const currentPath = $state<string>(path || '.')
  const items = $state<FileSystemItem[]>([])
  const selectedIndex = $state<number>(0)
  const loading = $state<boolean>(false)
  
  // Simulated file system - in real app this would use fs
  const mockFileSystem: Record<string, FileSystemItem[]> = {
    '.': [
      { name: '..', type: 'directory' },
      { name: 'Documents', type: 'directory', modified: new Date('2024-01-15') },
      { name: 'Downloads', type: 'directory', modified: new Date('2024-01-20') },
      { name: 'Pictures', type: 'directory', modified: new Date('2024-01-18') },
      { name: '.hidden', type: 'directory', modified: new Date('2024-01-10') },
      { name: 'README.md', type: 'file', size: 1024, modified: new Date('2024-01-21') },
      { name: 'package.json', type: 'file', size: 512, modified: new Date('2024-01-22') },
      { name: '.env', type: 'file', size: 256, modified: new Date('2024-01-19') },
    ],
    'Documents': [
      { name: '..', type: 'directory' },
      { name: 'Projects', type: 'directory', modified: new Date('2024-01-16') },
      { name: 'Notes', type: 'directory', modified: new Date('2024-01-14') },
      { name: 'report.pdf', type: 'file', size: 1048576, modified: new Date('2024-01-17') },
      { name: 'todo.txt', type: 'file', size: 128, modified: new Date('2024-01-23') },
    ],
    'Downloads': [
      { name: '..', type: 'directory' },
      { name: 'installer.dmg', type: 'file', size: 104857600, modified: new Date('2024-01-20') },
      { name: 'archive.zip', type: 'file', size: 2097152, modified: new Date('2024-01-19') },
      { name: 'image.png', type: 'file', size: 524288, modified: new Date('2024-01-18') },
    ],
    'Pictures': [
      { name: '..', type: 'directory' },
      { name: 'Screenshots', type: 'directory', modified: new Date('2024-01-15') },
      { name: 'photo1.jpg', type: 'file', size: 1572864, modified: new Date('2024-01-18') },
      { name: 'photo2.jpg', type: 'file', size: 2097152, modified: new Date('2024-01-17') },
      { name: 'vacation.mov', type: 'file', size: 52428800, modified: new Date('2024-01-16') },
    ]
  }
  
  const filteredItems = $derived(() => {
    const allItems = items()
    if (showHidden) return allItems
    return allItems.filter(item => !item.name.startsWith('.') || item.name === '..')
  })
  
  const selectedItem = $derived(() => filteredItems()[selectedIndex()])
  
  const loadDirectory = async (dirPath: string) => {
    loading.$set(true)
    
    // Simulate loading delay
    await new Promise(resolve => setTimeout(resolve, 300))
    
    const dirItems = mockFileSystem[dirPath] || []
    items.$set(dirItems)
    selectedIndex.$set(0)
    currentPath.$set(dirPath)
    
    loading.$set(false)
  }
  
  const handleEnter = () => {
    const item = selectedItem()
    if (!item) return
    
    if (item.type === 'directory') {
      if (item.name === '..') {
        // Navigate to parent - simplified logic
        if (currentPath() !== '.') {
          loadDirectory('.')
        }
      } else {
        loadDirectory(item.name)
      }
    } else {
      // "Open" file - just show info
      console.log(`Opening file: ${item.name}`)
    }
  }
  
  const handleUp = () => {
    selectedIndex.$update(i => Math.max(0, i - 1))
  }
  
  const handleDown = () => {
    selectedIndex.$update(i => Math.min(filteredItems().length - 1, i + 1))
  }
  
  const formatSize = (bytes?: number): string => {
    if (!bytes) return ''
    
    const units = ['B', 'KB', 'MB', 'GB']
    let size = bytes
    let unitIndex = 0
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024
      unitIndex++
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`
  }
  
  const formatDate = (date?: Date): string => {
    if (!date) return ''
    return date.toLocaleDateString()
  }
  
  const getFileIcon = (item: FileSystemItem): string => {
    if (item.type === 'directory') {
      return item.name === '..' ? '↩️' : '📁'
    }
    
    const ext = item.name.split('.').pop()?.toLowerCase()
    switch (ext) {
      case 'jpg':
      case 'png':
      case 'gif':
        return '🖼️'
      case 'pdf':
        return '📄'
      case 'zip':
      case 'tar':
      case 'gz':
        return '📦'
      case 'js':
      case 'ts':
      case 'tsx':
        return '⚙️'
      case 'md':
        return '📝'
      case 'json':
        return '⚙️'
      default:
        return '📄'
    }
  }
  
  onMount(() => {
    loadDirectory(currentPath())
  })
  
  if (loading()) {
    return (
      <Box
        direction="column"
        width="100%"
        height="100%"
        padding={2}
        align="center"
        justify="center"
      >
        <Text bold>Loading directory...</Text>
      </Box>
    )
  }
  
  return (
    <Box
      direction="column"
      width="100%"
      height="100%"
      padding={1}
      borderStyle="rounded"
      borderColor="green"
    >
      <Box direction="row" justify="space-between" marginBottom={1}>
        <Text bold color="green">
          File Explorer
        </Text>
        <Text dim>
          Path: {currentPath()} | Items: {filteredItems().length}
        </Text>
      </Box>
      
      <Box borderStyle="single" marginBottom={1} />
      
      <Box direction="row" flex={1} gap={1}>
        <Box direction="column" flex={2}>
          <Box direction="row" marginBottom={1}>
            <Box width={3}>
              <Text bold>Icon</Text>
            </Box>
            <Box width={20}>
              <Text bold>Name</Text>
            </Box>
            <Box width={10}>
              <Text bold>Size</Text>
            </Box>
            <Box width={10}>
              <Text bold>Modified</Text>
            </Box>
          </Box>
          
          <Box direction="column" gap={0}>
            {filteredItems().map((item, index) => (
              <Box
                key={item.name}
                direction="row"
                padding={0.5}
                backgroundColor={index === selectedIndex() ? 'blue' : 'transparent'}
                color={index === selectedIndex() ? 'white' : undefined}
              >
                <Box width={3}>
                  <Text>{getFileIcon(item)}</Text>
                </Box>
                <Box width={20}>
                  <Text
                    bold={item.type === 'directory'}
                    color={item.name.startsWith('.') ? 'gray' : undefined}
                  >
                    {item.name}
                  </Text>
                </Box>
                <Box width={10}>
                  <Text dim>{formatSize(item.size)}</Text>
                </Box>
                <Box width={10}>
                  <Text dim>{formatDate(item.modified)}</Text>
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
        
        <Box direction="column" width={25} gap={1}>
          <Text bold color="yellow">Details</Text>
          
          {selectedItem() && (
            <Box direction="column" gap={0.5}>
              <Text bold>{selectedItem().name}</Text>
              <Text>Type: {selectedItem().type}</Text>
              {selectedItem().size && (
                <Text>Size: {formatSize(selectedItem().size)}</Text>
              )}
              {selectedItem().modified && (
                <Text>Modified: {formatDate(selectedItem().modified)}</Text>
              )}
            </Box>
          )}
          
          <Box borderStyle="single" marginY={1} />
          
          <Box direction="column" gap={1}>
            <Button onClick={handleEnter} fullWidth>
              {selectedItem()?.type === 'directory' ? 'Open' : 'View'}
            </Button>
            
            <Button onClick={() => loadDirectory('.')} variant="secondary" fullWidth>
              Go Home
            </Button>
          </Box>
        </Box>
      </Box>
      
      <Box borderStyle="single" marginY={1} />
      
      <Box direction="row" gap={2}>
        <Text dim>↑↓ Navigate</Text>
        <Text dim>Enter: Open</Text>
        <Text dim>H: Toggle hidden</Text>
        <Text dim>Q: Quit</Text>
      </Box>
    </Box>
  )
}