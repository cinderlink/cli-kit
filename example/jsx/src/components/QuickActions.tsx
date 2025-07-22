import { Box, Text, Button } from 'tuix/components'
import { appStore } from '../stores/appStore'

export function QuickActions() {
  const handleLogin = () => {
    if (appStore.user()) {
      appStore.logout()
      appStore.addNotification({
        type: 'info',
        title: 'Logged Out',
        message: 'You have been logged out successfully'
      })
    } else {
      appStore.login('John Doe', 'john@example.com')
    }
  }
  
  const handleThemeToggle = () => {
    const themes: Array<'dark' | 'light' | 'matrix'> = ['dark', 'light', 'matrix']
    const currentIndex = themes.indexOf(appStore.theme())
    const nextIndex = (currentIndex + 1) % themes.length
    appStore.setTheme(themes[nextIndex])
    
    appStore.addNotification({
      type: 'info',
      title: 'Theme Changed',
      message: `Switched to ${themes[nextIndex]} theme`
    })
  }
  
  const simulateError = () => {
    appStore.addNotification({
      type: 'error',
      title: 'Simulated Error',
      message: 'This is a test error notification'
    })
  }
  
  const simulateSuccess = () => {
    appStore.addNotification({
      type: 'success',
      title: 'Operation Complete',
      message: 'The simulated operation completed successfully'
    })
  }
  
  return (
    <Box
      direction="column"
      padding={1}
      borderStyle="rounded"
      borderColor="magenta"
      gap={1}
    >
      <Text bold color="magenta">Quick Actions</Text>
      
      <Box direction="column" gap={1}>
        <Button 
          onClick={handleLogin}
          variant={appStore.user() ? 'danger' : 'primary'}
          fullWidth
        >
          {appStore.user() ? 'Logout' : 'Login'}
        </Button>
        
        <Button 
          onClick={handleThemeToggle}
          variant="secondary"
          fullWidth
        >
          Toggle Theme
        </Button>
        
        <Button 
          onClick={simulateError}
          variant="danger"
          fullWidth
        >
          Simulate Error
        </Button>
        
        <Button 
          onClick={simulateSuccess}
          variant="success"
          fullWidth
        >
          Simulate Success
        </Button>
        
        {appStore.user() && (
          <Box
            direction="column"
            padding={1}
            borderStyle="single"
            borderColor="gray"
          >
            <Text bold>Current User</Text>
            <Text>{appStore.user()?.name}</Text>
            <Text dim size="small">{appStore.user()?.email}</Text>
          </Box>
        )}
      </Box>
    </Box>
  )
}