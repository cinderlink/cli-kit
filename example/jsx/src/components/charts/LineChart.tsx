import { Box, Text } from 'tuix/components'

interface LineChartProps {
  data: Array<{ x: number | Date; y: number }>
  width?: number
  height?: number
  color?: string
}

export function LineChart({ data, width = 50, height = 10, color = 'green' }: LineChartProps) {
  if (data.length === 0) return <Text>No data</Text>
  
  const minY = Math.min(...data.map(d => d.y))
  const maxY = Math.max(...data.map(d => d.y))
  const range = maxY - minY || 1
  
  // Create ASCII representation
  const chart: string[][] = Array(height).fill(null).map(() => 
    Array(width).fill(' ')
  )
  
  // Plot points
  data.forEach((point, index) => {
    const x = Math.floor((index / (data.length - 1)) * (width - 1))
    const y = Math.floor(((point.y - minY) / range) * (height - 1))
    const adjustedY = height - 1 - y // Flip Y axis
    
    if (x >= 0 && x < width && adjustedY >= 0 && adjustedY < height) {
      chart[adjustedY][x] = '●'
      
      // Draw line to next point
      if (index < data.length - 1) {
        const nextX = Math.floor(((index + 1) / (data.length - 1)) * (width - 1))
        const nextY = Math.floor(((data[index + 1].y - minY) / range) * (height - 1))
        const nextAdjustedY = height - 1 - nextY
        
        // Simple line interpolation
        const steps = Math.max(Math.abs(nextX - x), Math.abs(nextAdjustedY - adjustedY))
        for (let step = 1; step < steps; step++) {
          const interpX = Math.round(x + (nextX - x) * (step / steps))
          const interpY = Math.round(adjustedY + (nextAdjustedY - adjustedY) * (step / steps))
          
          if (interpX >= 0 && interpX < width && interpY >= 0 && interpY < height) {
            if (chart[interpY][interpX] === ' ') {
              chart[interpY][interpX] = '─'
            }
          }
        }
      }
    }
  })
  
  return (
    <Box direction="column">
      <Box direction="row">
        <Box direction="column" marginRight={1}>
          <Text size="small" dim>{maxY.toFixed(0)}</Text>
          <Box height={height - 2} />
          <Text size="small" dim>{minY.toFixed(0)}</Text>
        </Box>
        
        <Box direction="column">
          {chart.map((row, i) => (
            <Text key={i} color={color}>
              {row.join('')}
            </Text>
          ))}
          
          <Box direction="row" marginTop={0.5}>
            <Text size="small" dim>
              {data[0].x instanceof Date ? 
                data[0].x.toLocaleTimeString() : 
                data[0].x.toString()}
            </Text>
            <Box flex={1} />
            <Text size="small" dim>
              {data[data.length - 1].x instanceof Date ? 
                data[data.length - 1].x.toLocaleTimeString() : 
                data[data.length - 1].x.toString()}
            </Text>
          </Box>
        </Box>
      </Box>
    </Box>
  )
}