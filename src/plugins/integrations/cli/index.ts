/**
 * Plugins CLI Integration
 *
 * Components that integrate the plugins module with CLI functionality
 */

export { Plugin, type PluginProps } from './Plugin'
export { createCLIJSXPlugin } from './app'
export { cliPluginStore, type CLIPluginRegistration } from './stores/pluginStore'
