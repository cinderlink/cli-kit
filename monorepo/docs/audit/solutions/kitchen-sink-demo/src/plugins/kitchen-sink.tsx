/**
 * Kitchen Sink Plugin
 * 
 * Main plugin that composes all features
 */

import { Plugin } from '@tuix/jsx'
import { Box } from '@tuix/components'
import { ProcessCommands } from '../commands/process'
import { LogCommands } from '../commands/logs'
import { DevCommands } from '../commands/dev'
import { DashboardCommand } from '../commands/dashboard'
import { useTheme } from '../hooks/useTheme'

export function KitchenSinkPlugin() {
  const theme = useTheme()
  
  return (
    <Box style={theme.container}>
      <Plugin 
        name="kitchen-sink" 
        version="1.0.0"
        description="TUIX Kitchen Sink - Best practices demonstration"
      >
        {/* Compose commands from separate modules */}
        <ProcessCommands />
        <LogCommands />
        <DevCommands />
        <DashboardCommand />
      </Plugin>
    </Box>
  )
}