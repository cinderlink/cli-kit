import { Box, Text } from 'tuix/components'
import { $state, $derived, onMount } from 'tuix/runes'
import { BarChart } from '../../components/charts/BarChart'
import { LineChart } from '../../components/charts/LineChart'
import type { CommandHandler } from 'tuix/cli'

interface DataPoint {
  label: string
  value: number
  color?: string
}

export const VisualizationCommand: CommandHandler = ({ args, options }) => {
  const { dataset } = args as { dataset: string }
  const { type } = options as { type: string }
  
  // Sample datasets
  const barData = $state<DataPoint[]>([
    { label: 'Jan', value: 65, color: 'blue' },
    { label: 'Feb', value: 75, color: 'cyan' },
    { label: 'Mar', value: 85, color: 'green' },
    { label: 'Apr', value: 72, color: 'yellow' },
    { label: 'May', value: 90, color: 'magenta' },
    { label: 'Jun', value: 88, color: 'red' },
  ])
  
  const lineData = $state<Array<{ x: Date; y: number }>>([])
  
  // Generate time series data
  onMount(() => {
    const now = new Date()
    const points: Array<{ x: Date; y: number }> = []
    
    for (let i = 0; i < 24; i++) {
      points.push({
        x: new Date(now.getTime() - (23 - i) * 3600000),
        y: Math.sin(i / 4) * 50 + 50 + Math.random() * 20
      })
    }
    
    lineData.$set(points)
    
    // Animate bar chart
    const interval = setInterval(() => {
      barData.$update(data => 
        data.map(d => ({
          ...d,
          value: Math.max(20, Math.min(100, d.value + (Math.random() - 0.5) * 10))
        }))
      )
    }, 2000)
    
    return () => clearInterval(interval)
  })
  
  const totalValue = $derived(() => 
    barData().reduce((sum, d) => sum + d.value, 0)
  )
  
  const maxValue = $derived(() => 
    Math.max(...barData().map(d => d.value))
  )
  
  const avgLineValue = $derived(() => {
    const values = lineData().map(d => d.y)
    return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0
  })
  
  const renderChart = () => {
    switch (type) {
      case 'bar':
        return (
          <Box direction="column" gap={1}>
            <Text bold color="cyan">Bar Chart - Monthly Sales</Text>
            <BarChart
              data={barData()}
              width={50}
              height={15}
            />
            <Box direction="row" gap={2} marginTop={1}>
              <Text>Total: {totalValue().toFixed(0)}</Text>
              <Text>Max: {maxValue().toFixed(0)}</Text>
              <Text>Avg: {(totalValue() / barData().length).toFixed(1)}</Text>
            </Box>
          </Box>
        )
        
      case 'line':
        return (
          <Box direction="column" gap={1}>
            <Text bold color="green">Line Chart - 24h Metrics</Text>
            <LineChart
              data={lineData()}
              width={60}
              height={15}
              color="green"
            />
            <Box marginTop={1}>
              <Text dim>Average: {avgLineValue().toFixed(1)} | Points: {lineData().length}</Text>
            </Box>
          </Box>
        )
        
      case 'pie':
        return (
          <Box direction="column" gap={1}>
            <Text bold color="yellow">Pie Chart - Device Distribution</Text>
            <Box direction="column" gap={0.5} marginTop={1}>
              <PieChartSimple data={[
                { label: 'Desktop', value: 45, color: 'blue' },
                { label: 'Mobile', value: 30, color: 'green' },
                { label: 'Tablet', value: 15, color: 'yellow' },
                { label: 'Other', value: 10, color: 'red' },
              ]} />
            </Box>
          </Box>
        )
        
      case 'scatter':
        return (
          <Box direction="column" gap={1}>
            <Text bold color="magenta">Scatter Plot - Distribution</Text>
            <ScatterPlotSimple width={50} height={15} />
          </Box>
        )
        
      default:
        return <Text color="red">Unknown chart type: {type}</Text>
    }
  }
  
  return (
    <Box
      direction="column"
      width="100%"
      height="100%"
      padding={2}
      borderStyle="rounded"
      borderColor="white"
    >
      <Box direction="row" justify="space-between" marginBottom={1}>
        <Text bold size="large">
          Data Visualization Demo
        </Text>
        <Text dim>
          Dataset: {dataset} | Type: {type}
        </Text>
      </Box>
      
      <Box borderStyle="single" marginBottom={1} />
      
      <Box flex={1}>
        {renderChart()}
      </Box>
      
      <Box borderStyle="single" marginY={1} />
      
      <Box direction="row" gap={2}>
        <Text dim>Live data updates every 2 seconds</Text>
        <Text dim>Press 'q' to quit</Text>
      </Box>
    </Box>
  )
}

// Simple pie chart implementation
function PieChartSimple({ data }: { data: DataPoint[] }) {
  const total = data.reduce((sum, d) => sum + d.value, 0)
  
  return (
    <Box direction="column" gap={0.5}>
      {data.map(item => {
        const percentage = (item.value / total) * 100
        const barLength = Math.round(percentage / 2)
        
        return (
          <Box key={item.label} direction="row" gap={1}>
            <Box width={10}>
              <Text color={item.color || 'white'}>{item.label}</Text>
            </Box>
            <Text color={item.color || 'white'}>
              {'█'.repeat(barLength)}
            </Text>
            <Text>{percentage.toFixed(1)}%</Text>
          </Box>
        )
      })}
    </Box>
  )
}

// Simple scatter plot
function ScatterPlotSimple({ width = 50, height = 15 }: { width?: number; height?: number }) {
  const points = $state<Array<{ x: number; y: number }>>([])
  
  onMount(() => {
    const newPoints = []
    for (let i = 0; i < 30; i++) {
      newPoints.push({
        x: Math.random() * width,
        y: Math.random() * height
      })
    }
    points.$set(newPoints)
  })
  
  // Create grid
  const grid: string[][] = Array(height).fill(null).map(() => 
    Array(width).fill('·')
  )
  
  // Plot points
  points().forEach(point => {
    const x = Math.floor(point.x)
    const y = Math.floor(point.y)
    if (x >= 0 && x < width && y >= 0 && y < height) {
      grid[height - 1 - y][x] = '●'
    }
  })
  
  return (
    <Box direction="column">
      {grid.map((row, i) => (
        <Text key={i} color="magenta">
          {row.join('')}
        </Text>
      ))}
      <Text dim marginTop={1}>Points: {points().length}</Text>
    </Box>
  )
}