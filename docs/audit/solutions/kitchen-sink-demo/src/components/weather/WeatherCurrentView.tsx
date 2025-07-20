/**
 * Weather Current View
 * 
 * Displays current weather information.
 */

import { Box, Text, LabeledBox, Spinner } from '@tuix/components'
import { If } from '@tuix/cli'
import { $effect } from '@tuix/reactivity'

interface WeatherCurrentViewProps {
  location: string
  useCache: boolean
  onFetch: (location: string) => Promise<any>
  cached: any
  isLoading: boolean
}

export function WeatherCurrentView({ location, useCache, onFetch, cached, isLoading }: WeatherCurrentViewProps) {
  let weather = cached

  $effect(async () => {
    if (!weather || !useCache) {
      weather = await onFetch(location)
    }
  })

  return (
    <LabeledBox label={`Current Weather - ${location}`}>
      <If condition={isLoading}>
        <Box horizontal gap={2}>
          <Spinner />
          <Text>Fetching weather data...</Text>
        </Box>
      </If>
      
      <If condition={!isLoading && weather}>
        <Box vertical gap={1}>
          <Text style="title">{weather.temperature}°C</Text>
          <Text>{weather.condition}</Text>
          {cached && useCache && (
            <Text style="muted">From cache</Text>
          )}
        </Box>
      </If>
      
      <If condition={!isLoading && !weather}>
        <Text style="error">No weather data available</Text>
      </If>
    </LabeledBox>
  )
}