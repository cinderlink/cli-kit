/**
 * Weather Forecast View
 * 
 * Displays weather forecast data.
 */

import { Box, Text, LabeledBox, Table } from '@tuix/components'

interface WeatherForecastViewProps {
  location: string
}

export function WeatherForecastView({ location }: WeatherForecastViewProps) {
  // Simulated forecast data
  const forecast = [
    { Day: 'Mon', High: '25°C', Low: '15°C', Condition: 'Sunny' },
    { Day: 'Tue', High: '23°C', Low: '14°C', Condition: 'Cloudy' },
    { Day: 'Wed', High: '20°C', Low: '12°C', Condition: 'Rainy' },
    { Day: 'Thu', High: '22°C', Low: '13°C', Condition: 'Partly Cloudy' },
    { Day: 'Fri', High: '24°C', Low: '15°C', Condition: 'Sunny' }
  ]

  return (
    <LabeledBox label={`5-Day Forecast - ${location}`}>
      <Table data={forecast} />
    </LabeledBox>
  )
}