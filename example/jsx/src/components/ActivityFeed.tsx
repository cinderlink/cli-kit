import { Box, Text, ScrollArea } from 'tuix/components'
import { $state } from 'tuix/runes'
import { onMount } from 'tuix/runes'

interface Activity {
  id: string
  type: 'build' | 'deploy' | 'commit' | 'test' | 'error'
  message: string
  timestamp: Date
  user: string
}

export function ActivityFeed() {
  const activities = $state<Activity[]>([])
  
  onMount(() => {
    activities.$set([
      {
        id: '1',
        type: 'commit',
        message: 'Initial commit',
        timestamp: new Date(Date.now() - 3600000),
        user: 'system'
      },
      {
        id: '2',
        type: 'build',
        message: 'Build started',
        timestamp: new Date(Date.now() - 1800000),
        user: 'ci-bot'
      }
    ])
    
    const interval = setInterval(() => {
      const newActivity = generateActivity()
      activities.$update(acts => [...acts, newActivity].slice(-20))
    }, 5000)
    
    return () => clearInterval(interval)
  })
  
  return (
    <Box
      direction="column"
      padding={1}
      borderStyle="rounded"
      borderColor="cyan"
      flex={1}
    >
      <Text bold color="cyan" marginBottom={1}>
        Activity Feed
      </Text>
      
      <ScrollArea height={15}>
        <Box direction="column" gap={1}>
          {activities().slice().reverse().map(activity => (
            <Box
              key={activity.id}
              direction="row"
              gap={1}
              padding={0.5}
              borderStyle="none"
            >
              <Text color={getActivityColor(activity.type)}>
                {getActivityIcon(activity.type)}
              </Text>
              <Box direction="column" flex={1}>
                <Text>{activity.message}</Text>
                <Box direction="row" justify="space-between">
                  <Text dim size="small">@{activity.user}</Text>
                  <Text dim size="small">{formatTime(activity.timestamp)}</Text>
                </Box>
              </Box>
            </Box>
          ))}
        </Box>
      </ScrollArea>
    </Box>
  )
}

function generateActivity(): Activity {
  const types: Activity['type'][] = ['build', 'deploy', 'commit', 'test', 'error']
  const users = ['alice', 'bob', 'ci-bot', 'deploy-bot', 'system']
  const messages = {
    build: ['Build completed successfully', 'Build failed', 'Building application...'],
    deploy: ['Deployed to production', 'Deploy to staging', 'Rolling back deployment'],
    commit: ['Merged PR #123', 'Fixed critical bug', 'Added new feature'],
    test: ['All tests passing', '3 tests failed', 'Running integration tests'],
    error: ['API timeout error', 'Database connection lost', 'Memory leak detected']
  }
  
  const type = types[Math.floor(Math.random() * types.length)]
  const typeMessages = messages[type]
  const message = typeMessages[Math.floor(Math.random() * typeMessages.length)]
  const user = users[Math.floor(Math.random() * users.length)]
  
  return {
    id: Date.now().toString(),
    type,
    message,
    timestamp: new Date(),
    user
  }
}

function getActivityColor(type: Activity['type']): string {
  switch (type) {
    case 'build': return 'blue'
    case 'deploy': return 'green'
    case 'commit': return 'yellow'
    case 'test': return 'cyan'
    case 'error': return 'red'
  }
}

function getActivityIcon(type: Activity['type']): string {
  switch (type) {
    case 'build': return '🔨'
    case 'deploy': return '🚀'
    case 'commit': return '📝'
    case 'test': return '🧪'
    case 'error': return '❌'
  }
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString()
}