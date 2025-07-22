import { Box, Text, Select, Checkbox, Slider, Button, Tabs, Tab, TabPanel } from 'tuix/components'
import { $state, onMount } from 'tuix/runes'
import { appStore } from '../../stores/appStore'
import type { CommandHandler } from 'tuix/cli'

interface Settings {
  theme: 'dark' | 'light' | 'matrix'
  fontSize: number
  animation: boolean
  sound: boolean
  notifications: boolean
  autoSave: boolean
  language: string
  timezone: string
}

export const SettingsCommand: CommandHandler = ({ options }) => {
  const { profile } = options as { profile: string }
  
  const settings = $state<Settings>({
    theme: 'dark',
    fontSize: 14,
    animation: true,
    sound: false,
    notifications: true,
    autoSave: true,
    language: 'en',
    timezone: 'UTC'
  })
  
  const activeTab = $state<string>('appearance')
  const hasChanges = $state<boolean>(false)
  
  const saveSettings = () => {
    // In a real app, this would save to a config file
    appStore.setTheme(settings().theme)
    appStore.addNotification({
      type: 'success',
      title: 'Settings Saved',
      message: `Settings saved to profile: ${profile}`
    })
    hasChanges.$set(false)
  }
  
  const resetSettings = () => {
    settings.$set({
      theme: 'dark',
      fontSize: 14,
      animation: true,
      sound: false,
      notifications: true,
      autoSave: true,
      language: 'en',
      timezone: 'UTC'
    })
    hasChanges.$set(true)
    
    appStore.addNotification({
      type: 'info',
      title: 'Settings Reset',
      message: 'All settings restored to defaults'
    })
  }
  
  const updateSetting = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    settings.$update(current => ({ ...current, [key]: value }))
    hasChanges.$set(true)
  }
  
  onMount(() => {
    // Load settings from profile
    settings.$update(current => ({ ...current, theme: appStore.theme() }))
  })
  
  return (
    <Box
      direction="column"
      width="100%"
      height="100%"
      padding={2}
      borderStyle="rounded"
      borderColor="magenta"
    >
      <Box direction="row" justify="space-between" marginBottom={1}>
        <Text bold color="magenta" size="large">
          Settings & Preferences
        </Text>
        <Text dim>
          Profile: {profile} {hasChanges() && '*'}
        </Text>
      </Box>
      
      <Box borderStyle="single" marginBottom={1} />
      
      <Tabs activeTab={activeTab} onTabChange={activeTab.$set}>
        <Box direction="row" marginBottom={1}>
          <Tab id="appearance">Appearance</Tab>
          <Tab id="behavior">Behavior</Tab>
          <Tab id="advanced">Advanced</Tab>
        </Box>
        
        <TabPanel id="appearance">
          <Box direction="column" gap={2}>
            <Box direction="column" gap={1}>
              <Text bold>Theme</Text>
              <Select
                value={settings().theme}
                onChange={(value) => updateSetting('theme', value as any)}
                options={[
                  { value: 'dark', label: 'Dark Theme' },
                  { value: 'light', label: 'Light Theme' },
                  { value: 'matrix', label: 'Matrix Theme' }
                ]}
                width={30}
              />
              <Text dim size="small">
                Choose your preferred color scheme
              </Text>
            </Box>
            
            <Box direction="column" gap={1}>
              <Text bold>Font Size</Text>
              <Slider
                value={settings().fontSize}
                onChange={(value) => updateSetting('fontSize', value)}
                min={10}
                max={24}
                step={1}
                width={30}
              />
              <Text dim size="small">
                Current size: {settings().fontSize}px
              </Text>
            </Box>
            
            <Box direction="column" gap={1}>
              <Checkbox
                checked={settings().animation}
                onChange={(checked) => updateSetting('animation', checked)}
              >
                Enable animations
              </Checkbox>
              <Text dim size="small" marginLeft={3}>
                Smooth transitions and visual effects
              </Text>
            </Box>
          </Box>
        </TabPanel>
        
        <TabPanel id="behavior">
          <Box direction="column" gap={2}>
            <Box direction="column" gap={1}>
              <Checkbox
                checked={settings().notifications}
                onChange={(checked) => updateSetting('notifications', checked)}
              >
                Show notifications
              </Checkbox>
              <Text dim size="small" marginLeft={3}>
                Display system and application notifications
              </Text>
            </Box>
            
            <Box direction="column" gap={1}>
              <Checkbox
                checked={settings().sound}
                onChange={(checked) => updateSetting('sound', checked)}
              >
                Enable sound effects
              </Checkbox>
              <Text dim size="small" marginLeft={3}>
                Play sounds for interactions and alerts
              </Text>
            </Box>
            
            <Box direction="column" gap={1}>
              <Checkbox
                checked={settings().autoSave}
                onChange={(checked) => updateSetting('autoSave', checked)}
              >
                Auto-save changes
              </Checkbox>
              <Text dim size="small" marginLeft={3}>
                Automatically save configuration changes
              </Text>
            </Box>
          </Box>
        </TabPanel>
        
        <TabPanel id="advanced">
          <Box direction="column" gap={2}>
            <Box direction="column" gap={1}>
              <Text bold>Language</Text>
              <Select
                value={settings().language}
                onChange={(value) => updateSetting('language', value)}
                options={[
                  { value: 'en', label: 'English' },
                  { value: 'es', label: 'Español' },
                  { value: 'fr', label: 'Français' },
                  { value: 'de', label: 'Deutsch' }
                ]}
                width={30}
              />
            </Box>
            
            <Box direction="column" gap={1}>
              <Text bold>Timezone</Text>
              <Select
                value={settings().timezone}
                onChange={(value) => updateSetting('timezone', value)}
                options={[
                  { value: 'UTC', label: 'UTC' },
                  { value: 'EST', label: 'Eastern Time' },
                  { value: 'PST', label: 'Pacific Time' },
                  { value: 'GMT', label: 'Greenwich Mean Time' }
                ]}
                width={30}
              />
            </Box>
            
            <Box direction="column" gap={1} marginTop={2}>
              <Text bold color="yellow">Danger Zone</Text>
              <Button
                onClick={resetSettings}
                variant="danger"
                width={20}
              >
                Reset All Settings
              </Button>
              <Text dim size="small">
                This will restore all settings to their default values
              </Text>
            </Box>
          </Box>
        </TabPanel>
      </Tabs>
      
      <Box borderStyle="single" marginY={2} />
      
      <Box direction="row" gap={2}>
        <Button
          onClick={saveSettings}
          variant="primary"
          disabled={!hasChanges()}
        >
          Save Changes
        </Button>
        
        <Button
          onClick={() => hasChanges.$set(false)}
          variant="secondary"
          disabled={!hasChanges()}
        >
          Discard Changes
        </Button>
        
        <Box flex={1} />
        
        <Text dim>
          {hasChanges() ? 'Unsaved changes' : 'All changes saved'}
        </Text>
      </Box>
    </Box>
  )
}