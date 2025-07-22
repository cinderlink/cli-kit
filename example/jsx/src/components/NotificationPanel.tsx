import { Box, Text, ScrollArea, Button } from 'tuix/components'
import { appStore } from '../stores/appStore'
import { $derived } from 'tuix/runes'

export function NotificationPanel() {
  const sortedNotifications = $derived(() => 
    [...appStore.notifications()].reverse().slice(0, 5)
  )
  
  const handleMarkRead = (id: string) => {
    appStore.markNotificationRead(id)
  }
  
  const handleClearAll = () => {
    appStore.clearNotifications()
  }
  
  return (
    <Box
      direction="column"
      padding={1}
      borderStyle="rounded"
      borderColor="yellow"
      minHeight={15}
    >
      <Box direction="row" justify="space-between" marginBottom={1}>
        <Text bold color="yellow">
          Notifications ({appStore.unreadCount()})
        </Text>
        {appStore.notifications().length > 0 && (
          <Button size="small" onClick={handleClearAll}>
            Clear All
          </Button>
        )}
      </Box>
      
      <ScrollArea height={10}>
        {sortedNotifications().length === 0 ? (
          <Text dim align="center">No notifications</Text>
        ) : (
          <Box direction="column" gap={1}>
            {sortedNotifications().map(notification => (
              <Box
                key={notification.id}
                direction="column"
                padding={1}
                borderStyle="single"
                borderColor={notification.read ? 'gray' : getNotificationColor(notification.type)}
                opacity={notification.read ? 0.6 : 1}
              >
                <Box direction="row" justify="space-between">
                  <Text 
                    bold 
                    color={getNotificationColor(notification.type)}
                  >
                    {getNotificationIcon(notification.type)} {notification.title}
                  </Text>
                  {!notification.read && (
                    <Button 
                      size="small" 
                      onClick={() => handleMarkRead(notification.id)}
                    >
                      ✓
                    </Button>
                  )}
                </Box>
                <Text dim>{notification.message}</Text>
                <Text dim size="small">
                  {formatTime(notification.timestamp)}
                </Text>
              </Box>
            ))}
          </Box>
        )}
      </ScrollArea>
    </Box>
  )
}

function getNotificationColor(type: string): string {
  switch (type) {
    case 'error': return 'red'
    case 'warning': return 'yellow'
    case 'success': return 'green'
    default: return 'blue'
  }
}

function getNotificationIcon(type: string): string {
  switch (type) {
    case 'error': return '❌'
    case 'warning': return '⚠️'
    case 'success': return '✅'
    default: return 'ℹ️'
  }
}

function formatTime(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const seconds = Math.floor(diff / 1000)
  
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return date.toLocaleDateString()
}