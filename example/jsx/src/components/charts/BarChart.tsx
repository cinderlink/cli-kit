import { Box, Text } from 'tuix/components'

interface BarChartProps {
  data: Array<{ label: string; value: number; color?: string }>
  width?: number
  height?: number
  maxValue?: number
}

export function BarChart({ data, width = 40, height = 10, maxValue }: BarChartProps) {
  const max = maxValue || Math.max(...data.map(d => d.value))
  const barWidth = Math.floor(width / data.length) - 1
  
  return (
    <Box direction="column" width={width}>
      <Box direction="row" height={height} alignItems="end">
        {data.map((item, index) => {
          const barHeight = Math.round((item.value / max) * height)
          const color = item.color || 'blue'
          
          return (
            <Box key={index} direction="column" width={barWidth} marginRight={1}>
              <Box direction="column" justify="end" height={height}>
                {Array.from({ length: height }).map((_, i) => (
                  <Box key={i} width={barWidth}>
                    {i < barHeight ? (
                      <Text color={color}>
                        {'█'.repeat(barWidth)}
                      </Text>
                    ) : (
                      <Text> </Text>
                    )}
                  </Box>
                )).reverse()}
              </Box>
            </Box>
          )
        })}
      </Box>
      
      <Box direction="row" marginTop={1}>
        {data.map((item, index) => (
          <Box key={index} width={barWidth} marginRight={1}>
            <Text size="small" align="center">
              {item.label}
            </Text>
          </Box>
        ))}
      </Box>
      
      <Box direction="row" marginTop={0.5}>
        {data.map((item, index) => (
          <Box key={index} width={barWidth} marginRight={1}>
            <Text size="small" align="center" dim>
              {item.value}
            </Text>
          </Box>
        ))}
      </Box>
    </Box>
  )
}