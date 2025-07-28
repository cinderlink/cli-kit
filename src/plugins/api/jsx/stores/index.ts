/**
 * Plugin JSX Stores
 *
 * Reactive stores for plugin state management using Svelte 5 runes
 */

// Plugin store implementation
import { pluginStore as store, type PluginRegistration } from './pluginStore'

export { store as pluginStore, type PluginRegistration }

// Re-export commonly used functions for convenience
export const registerPlugin = (plugin: any) => store.register(plugin)
export const unregisterPlugin = (id: string) => store.unregister(id)
export const enablePlugin = (id: string) => store.enable(id)
export const disablePlugin = (id: string) => store.disable(id)
export const configurePlugin = (id: string, config: Record<string, any>) =>
  store.configure(id, config)
export const setActivePlugin = (id: string | null) => store.setActive(id)
export const getPlugin = (id: string) => store.getPlugin(id)
export const getPluginConfig = (id: string) => store.getPluginConfig(id)
export const hasPlugin = (id: string) => store.hasPlugin(id)
