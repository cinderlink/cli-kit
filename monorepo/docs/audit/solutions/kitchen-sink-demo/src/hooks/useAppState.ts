/**
 * Application State Hook
 * 
 * Demonstrates $state and $context patterns
 */

import { $state, $context, $derived } from '@tuix/reactivity'

// Define app state shape
interface AppState {
  activeTab: number
  selectedProcess: any | null
  processes: any[]
  logs: any[]
  isModalOpen: boolean
}

// Create context for global state
const AppStateContext = $context<{
  state: AppState
  setActiveTab: (tab: number) => void
  setSelectedProcess: (process: any) => void
  // ... other setters
}>()

// Create the state provider
export function createAppState() {
  const state = $state<AppState>({
    activeTab: 0,
    selectedProcess: null,
    processes: [],
    logs: [],
    isModalOpen: false
  })
  
  // Derived states
  const runningProcesses = $derived(() => 
    state.processes.filter(p => p.status === 'running')
  )
  
  const errorLogs = $derived(() =>
    state.logs.filter(log => log.level === 'error')
  )
  
  // Actions
  const setActiveTab = (tab: number) => {
    state.activeTab = tab
  }
  
  const setSelectedProcess = (process: any) => {
    state.selectedProcess = process
    state.isModalOpen = true
  }
  
  return {
    state,
    runningProcesses,
    errorLogs,
    setActiveTab,
    setSelectedProcess
  }
}

// Hook to use app state
export function useAppState() {
  return $context(AppStateContext)
}