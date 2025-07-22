/**
 * Logs View Component
 * 
 * Displays intercepted console logs in a scrollable view
 */

import { box, vstack, text } from '@core/view'

interface LogsViewProps {
  logs: string[]
}

export function LogsView({ logs }: LogsViewProps) {
  if (logs.length === 0) {
    return text({ 
      style: { color: 'gray' }, 
      children: 'No logs captured. Console output will appear here.' 
    })
  }
  
  // Show last 20 logs
  const recentLogs = logs.slice(-20)
  
  return vstack({
    children: [
      text({ 
        style: { color: 'yellow', bold: true }, 
        children: `Console Logs (${logs.length} total)` 
      }),
      box({ 
        style: { marginTop: 1 },
        children: vstack({
          children: recentLogs.map((log, i) => {
            let color = 'white'
            if (log.startsWith('[ERROR]')) color = 'red'
            else if (log.startsWith('[WARN]')) color = 'yellow'
            else if (log.startsWith('[INFO]')) color = 'cyan'
            
            return text({ 
              key: i,
              style: { color }, 
              children: log 
            })
          })
        })
      })
    ]
  })
}