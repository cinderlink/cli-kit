import { onMount } from 'tuix/runes'
import { Box, Text } from 'tuix/components'
import { appStore } from '../../stores/appStore'
import { SystemMetrics } from '../../components/SystemMetrics'
import { NotificationPanel } from '../../components/NotificationPanel'
import { ActivityFeed } from '../../components/ActivityFeed'
import { QuickActions } from '../../components/QuickActions'
import { $effect } from 'tuix/runes'
import type { CommandHandler } from 'tuix/cli'

export const DashboardCommand: CommandHandler = ({ options }) => {
  const { refresh, theme } = options as { refresh: number; theme: string }
  
  onMount(() => {
    appStore.setTheme(theme as any)
    appStore.setActiveRoute('dashboard')
    
    appStore.addNotification({
      type: 'info',
      title: 'Dashboard Loaded',
      message: `Refreshing every ${refresh} seconds`
    })
    
    const interval = setInterval(() => {
      generateRandomActivity()
    }, refresh * 1000)
    
    return () => clearInterval(interval)
  })
  
  return (
    <Box
      direction="column"
      width="100%"
      height="100%"
      padding={1}
      borderStyle="rounded"
      borderColor={() => appStore.theme() === 'matrix' ? 'green' : 'blue'}
    >
      <Box direction="row" justify="space-between" padding={1}>
        <Text bold color="cyan">
          📊 Exemplar Dashboard
        </Text>
        <Text color="yellow">
          🔔 {appStore.unreadCount()} unread
        </Text>
      </Box>
      
      <Box borderStyle="single" />
      
      <Box direction="row" flex={1} gap={1}>
        <Box direction="column" flex={2} gap={1}>
          <SystemMetrics />
          <ActivityFeed />
        </Box>
        
        <Box direction="column" flex={1} gap={1}>
          <NotificationPanel />
          <QuickActions />
        </Box>
      </Box>
      
      <Box borderStyle="single" />
      
      <Box direction="row" justify="space-between" padding={1}>
        <Text dim>
          Theme: {appStore.theme()} | Refresh: {refresh}s
        </Text>
        <Text dim>
          Press 'q' to quit, 'r' to refresh
        </Text>
      </Box>
    </Box>
  )
}

function generateRandomActivity() {
  const activities = [
    { type: 'info', title: 'System Update', message: 'CPU usage at optimal levels' },
    { type: 'success', title: 'Build Complete', message: 'All tests passing' },
    { type: 'warning', title: 'Memory Alert', message: 'Memory usage above 80%' },
    { type: 'info', title: 'Network Activity', message: 'Incoming requests stable' },
  ]
  
  const activity = activities[Math.floor(Math.random() * activities.length)]
  appStore.addNotification(activity as any)
}