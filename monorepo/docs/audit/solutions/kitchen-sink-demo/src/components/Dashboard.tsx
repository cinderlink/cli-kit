/**
 * Main Dashboard Component
 * 
 * Demonstrates tabs, layout, and composition
 */

import { Box, Text, Tabs, Tab } from '@tuix/components'
import { OverviewTab } from './tabs/OverviewTab'
import { ProcessesTab } from './tabs/ProcessesTab'
import { LogsTab } from './tabs/LogsTab'
import { MetricsTab } from './tabs/MetricsTab'
import { useAppState } from '../hooks/useAppState'
import { gradient, style } from '@tuix/styling'

export function Dashboard() {
  const { activeTab, setActiveTab } = useAppState()
  
  return (
    <Box border="rounded" padding={1}>
      <Header />
      
      <Tabs 
        activeTab={activeTab} 
        onTabChange={setActiveTab}
        style={style().marginTop(2)}
      >
        <Tab title="📊 Overview" icon="chart">
          <OverviewTab />
        </Tab>
        
        <Tab title="🔄 Processes" icon="refresh">
          <ProcessesTab />
        </Tab>
        
        <Tab title="📝 Logs" icon="file-text">
          <LogsTab />
        </Tab>
        
        <Tab title="📈 Metrics" icon="trending-up">
          <MetricsTab />
        </Tab>
      </Tabs>
    </Box>
  )
}

function Header() {
  return (
    <Text 
      gradient={gradient('linear', '45deg', ['#00ff88', '#0088ff'])}
      size="large"
      bold
      center
    >
      🚀 TUIX Kitchen Sink Demo
    </Text>
  )
}