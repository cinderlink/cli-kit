/**
 * Dashboard Command
 * 
 * Default interactive dashboard
 */

import { Command } from '@tuix/jsx'
import { Dashboard } from '../components/Dashboard'

export function DashboardCommand() {
  return (
    <Command 
      name="dashboard" 
      description="Interactive system dashboard"
      interactive={true}
      default={true}
      handler={() => <Dashboard />}
    />
  )
}