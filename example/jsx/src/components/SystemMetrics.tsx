import { Box, Text, ProgressBar } from 'tuix/components'
import { $state, $derived, $effect } from 'tuix/runes'
import { onMount } from 'tuix/runes'

interface Metrics {
  cpu: number
  memory: number
  disk: number
  network: number
}

export function SystemMetrics() {
  const metrics = $state<Metrics>({
    cpu: 45,
    memory: 62,
    disk: 78,
    network: 23
  })
  
  onMount(() => {
    const interval = setInterval(() => {
      metrics.$update(m => ({
        cpu: Math.max(0, Math.min(100, m.cpu + (Math.random() - 0.5) * 20)),
        memory: Math.max(0, Math.min(100, m.memory + (Math.random() - 0.5) * 10)),
        disk: Math.max(0, Math.min(100, m.disk + (Math.random() - 0.5) * 5)),
        network: Math.max(0, Math.min(100, m.network + (Math.random() - 0.5) * 30))
      }))
    }, 2000)
    
    return () => clearInterval(interval)
  })
  
  const cpuColor = $derived(() => {
    const cpu = metrics().cpu
    return cpu > 80 ? 'red' : cpu > 60 ? 'yellow' : 'green'
  })
  
  const memoryColor = $derived(() => {
    const memory = metrics().memory
    return memory > 80 ? 'red' : memory > 60 ? 'yellow' : 'green'
  })
  
  return (
    <Box
      direction="column"
      padding={1}
      borderStyle="rounded"
      borderColor="blue"
      gap={1}
    >
      <Text bold color="white">System Metrics</Text>
      
      <Box direction="column" gap={1}>
        <Box direction="column">
          <Box direction="row" justify="space-between">
            <Text>CPU Usage</Text>
            <Text color={cpuColor()}>{metrics().cpu.toFixed(0)}%</Text>
          </Box>
          <ProgressBar 
            value={metrics().cpu} 
            max={100} 
            color={cpuColor()}
            width={30}
          />
        </Box>
        
        <Box direction="column">
          <Box direction="row" justify="space-between">
            <Text>Memory</Text>
            <Text color={memoryColor()}>{metrics().memory.toFixed(0)}%</Text>
          </Box>
          <ProgressBar 
            value={metrics().memory} 
            max={100} 
            color={memoryColor()}
            width={30}
          />
        </Box>
        
        <Box direction="column">
          <Box direction="row" justify="space-between">
            <Text>Disk Space</Text>
            <Text color={metrics().disk > 90 ? 'red' : 'cyan'}>{metrics().disk.toFixed(0)}%</Text>
          </Box>
          <ProgressBar 
            value={metrics().disk} 
            max={100} 
            color={metrics().disk > 90 ? 'red' : 'cyan'}
            width={30}
          />
        </Box>
        
        <Box direction="column">
          <Box direction="row" justify="space-between">
            <Text>Network I/O</Text>
            <Text color="blue">{metrics().network.toFixed(0)}%</Text>
          </Box>
          <ProgressBar 
            value={metrics().network} 
            max={100} 
            color="blue"
            width={30}
          />
        </Box>
      </Box>
    </Box>
  )
}