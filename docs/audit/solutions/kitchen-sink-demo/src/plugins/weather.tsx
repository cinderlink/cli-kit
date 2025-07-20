/**
 * Weather Plugin
 * 
 * Example custom plugin showing how users build plugins.
 * Demonstrates state management, API integration, and command registration.
 */

import { Plugin, Command, Arg, Flag } from '@tuix/cli'
import { $state, $effect } from '@tuix/reactivity'
import { cliStringSchema, cliBooleanSchema } from '@tuix/schema'
import { WeatherCurrentView } from '../components/weather/WeatherCurrentView'
import { WeatherForecastView } from '../components/weather/WeatherForecastView'

export function WeatherPlugin() {
  // Plugin state
  const weatherState = $state({
    cache: new Map<string, any>(),
    lastUpdate: null as Date | null,
    isLoading: false
  })

  // Cleanup effect
  $effect(() => {
    const cleanup = setInterval(() => {
      weatherState.cache.clear()
    }, 3600000) // Clear cache hourly
    
    return () => clearInterval(cleanup)
  })

  const fetchWeather = async (location: string) => {
    weatherState.isLoading = true
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      const data = {
        location,
        temperature: Math.round(Math.random() * 40 + 10),
        condition: ['Sunny', 'Cloudy', 'Rainy'][Math.floor(Math.random() * 3)]
      }
      weatherState.cache.set(location, data)
      weatherState.lastUpdate = new Date()
      return data
    } finally {
      weatherState.isLoading = false
    }
  }

  return (
    <Plugin name="weather" version="1.0.0" description="Weather information">
      <Command name="current" description="Get current weather">
        {(args, flags) => (
          <>
            <Arg name="location" schema={cliStringSchema} description="Location" />
            <Flag name="cache" schema={cliBooleanSchema} default={true} />
            
            <WeatherCurrentView 
              location={args.location}
              useCache={flags.cache}
              onFetch={fetchWeather}
              cached={weatherState.cache.get(args.location)}
              isLoading={weatherState.isLoading}
            />
          </>
        )}
      </Command>
      
      <Command name="forecast" description="Get weather forecast">
        {(args) => (
          <>
            <Arg name="location" schema={cliStringSchema} description="Location" />
            <WeatherForecastView location={args.location} />
          </>
        )}
      </Command>
    </Plugin>
  )
}