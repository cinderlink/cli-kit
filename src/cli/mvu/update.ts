/**
 * Unified CLI Update Function
 *
 * Handles all state updates for the CLI application
 */

import { Effect } from 'effect'
import type { AppModel, AppMsg, Cmd } from './model'
import { scopeManager } from '@core/model/scope/manager'

// Helper functions for plugin management
const validatePluginDependencies = (
  pluginName: string,
  dependencies: string[],
  registry: Map<string, any>
): boolean => {
  return dependencies.every(dep => registry.has(dep))
}

const updateDependents = (
  pluginName: string,
  registry: Map<string, any>,
  action: 'add' | 'remove'
): void => {
  registry.forEach((registered, name) => {
    if (name !== pluginName) {
      if (action === 'add' && registered.dependencies.includes(pluginName)) {
        registered.dependents.push(pluginName)
      } else if (action === 'remove') {
        registered.dependents = registered.dependents.filter((d: string) => d !== pluginName)
      }
    }
  })
}

// Update function
export const update = (msg: AppMsg, model: AppModel): [AppModel, Cmd[]] => {
  switch (msg.type) {
    // CLI Messages
    case 'SetCLIConfig':
      return [
        {
          ...model,
          cli: {
            ...model.cli,
            config: { ...model.cli.config, ...msg.config },
          },
        },
        [],
      ]

    case 'StartCLI':
      return [
        {
          ...model,
          cli: {
            ...model.cli,
            isRunning: true,
            exitCode: null,
          },
        },
        [],
      ]

    case 'StopCLI':
      return [
        {
          ...model,
          cli: {
            ...model.cli,
            isRunning: false,
            exitCode: msg.exitCode,
          },
        },
        [],
      ]

    case 'ResetCLI':
      return [
        {
          ...model,
          cli: {
            config: {},
            isRunning: false,
            exitCode: null,
          },
        },
        [],
      ]

    // Command Messages
    case 'SetCommandPath':
      return [
        {
          ...model,
          commands: {
            ...model.commands,
            activePath: msg.path,
          },
        },
        [
          // Effect to activate the scope
          Effect.gen(function* () {
            const allScopes = scopeManager.getAllScopes()
            const scope = allScopes.find(
              s =>
                s.path.length === msg.path.length &&
                s.path.every((segment, i) => segment === msg.path[i])
            )

            if (scope) {
              yield* scopeManager.activateScope(scope.id)
            }

            // No message to return
            return null as any
          }).pipe(Effect.catchAll(() => Effect.succeed(null as any))),
        ],
      ]

    case 'ExecuteCommand':
      return [
        {
          ...model,
          commands: {
            activePath: msg.path,
            context: msg.context,
          },
        },
        [
          // Effect to execute the command
          Effect.gen(function* () {
            const allScopes = scopeManager.getAllScopes()
            const scope = allScopes.find(
              s =>
                s.path.length === msg.path.length &&
                s.path.every((segment, i) => segment === msg.path[i])
            )

            if (scope?.handler) {
              yield* Effect.promise(() => Promise.resolve(scope.handler!(msg.context)))
            }

            // Reset context after execution
            return { type: 'ResetCommandContext' } as AppMsg
          }).pipe(Effect.catchAll(() => Effect.succeed({ type: 'ResetCommandContext' } as AppMsg))),
        ],
      ]

    case 'ResetCommandContext':
      return [
        {
          ...model,
          commands: {
            ...model.commands,
            context: null,
          },
        },
        [],
      ]

    // Plugin Messages
    case 'RegisterPlugin':
      const { plugin, config } = msg
      const name = plugin.metadata.name

      // Check if already registered
      if (model.plugins.plugins.has(name)) {
        console.warn(`Plugin '${name}' is already registered`)
        return [model, []]
      }

      // Extract dependencies
      const dependencies = plugin.metadata.dependencies || []

      // Validate dependencies if required
      if (model.plugins.validateDependencies) {
        if (!validatePluginDependencies(name, dependencies, model.plugins.plugins)) {
          console.error(`Plugin '${name}' has unmet dependencies: ${dependencies.join(', ')}`)
          return [model, []]
        }
      }

      // Create new registry with the plugin
      const newPlugins = new Map(model.plugins.plugins)
      newPlugins.set(name, {
        plugin,
        enabled: model.plugins.autoEnable,
        loadTime: new Date(),
        dependencies,
        dependents: [],
        config,
      })

      // Update dependents
      updateDependents(name, newPlugins, 'add')

      return [
        {
          ...model,
          plugins: {
            ...model.plugins,
            plugins: newPlugins,
          },
        },
        [],
      ]

    case 'EnablePlugin':
      const enablePlugins = new Map(model.plugins.plugins)
      const pluginToEnable = enablePlugins.get(msg.name)

      if (pluginToEnable) {
        pluginToEnable.enabled = true
        enablePlugins.set(msg.name, { ...pluginToEnable })
      }

      return [
        {
          ...model,
          plugins: {
            ...model.plugins,
            plugins: enablePlugins,
          },
        },
        [],
      ]

    case 'DisablePlugin':
      const disablePlugins = new Map(model.plugins.plugins)
      const pluginToDisable = disablePlugins.get(msg.name)

      if (pluginToDisable) {
        pluginToDisable.enabled = false
        disablePlugins.set(msg.name, { ...pluginToDisable })
      }

      return [
        {
          ...model,
          plugins: {
            ...model.plugins,
            plugins: disablePlugins,
          },
        },
        [],
      ]

    case 'ConfigurePlugin':
      const configPlugins = new Map(model.plugins.plugins)
      const pluginToConfigure = configPlugins.get(msg.name)

      if (pluginToConfigure) {
        pluginToConfigure.config = { ...pluginToConfigure.config, ...msg.config }
        configPlugins.set(msg.name, { ...pluginToConfigure })
      }

      return [
        {
          ...model,
          plugins: {
            ...model.plugins,
            plugins: configPlugins,
          },
        },
        [],
      ]

    case 'UnregisterPlugin':
      const unregisterPlugins = new Map(model.plugins.plugins)
      const pluginToRemove = unregisterPlugins.get(msg.name)

      if (pluginToRemove) {
        // Check dependents
        if (pluginToRemove.dependents.length > 0) {
          console.error(
            `Cannot unregister '${msg.name}': required by ${pluginToRemove.dependents.join(', ')}`
          )
          return [model, []]
        }

        // Remove plugin
        unregisterPlugins.delete(msg.name)

        // Update dependents
        updateDependents(msg.name, unregisterPlugins, 'remove')
      }

      return [
        {
          ...model,
          plugins: {
            ...model.plugins,
            plugins: unregisterPlugins,
          },
        },
        [],
      ]

    // Debug Messages
    case 'UpdateDebugTab':
      return [
        {
          ...model,
          debug: {
            ...model.debug,
            activeTab: msg.tab,
          },
        },
        [],
      ]

    case 'ToggleDebugVisibility':
      return [
        {
          ...model,
          debug: {
            ...model.debug,
            isVisible: !model.debug.isVisible,
          },
        },
        [],
      ]

    case 'AddDebugLog':
      return [
        {
          ...model,
          debug: {
            ...model.debug,
            logs: [...model.debug.logs, msg.message].slice(-100),
          },
        },
        [],
      ]

    case 'AddDebugOutput':
      return [
        {
          ...model,
          debug: {
            ...model.debug,
            output: [...model.debug.output, msg.content].slice(-100),
          },
        },
        [],
      ]

    case 'RecordDebugEvent':
      return [
        {
          ...model,
          debug: {
            ...model.debug,
            events: [
              ...model.debug.events,
              {
                timestamp: Date.now(),
                type: msg.event,
                data: msg.data,
              },
            ].slice(-50),
          },
        },
        [],
      ]

    case 'UpdateDebugPerformance':
      const { renderCount, avgRenderTime } = model.debug.performance
      const newAvg = (avgRenderTime * renderCount + msg.renderTime) / (renderCount + 1)

      return [
        {
          ...model,
          debug: {
            ...model.debug,
            performance: {
              renderCount: renderCount + 1,
              lastRenderTime: msg.renderTime,
              avgRenderTime: newAvg,
            },
          },
        },
        [],
      ]

    default:
      // Exhaustive check
      const _exhaustive: never = msg
      return [model, []]
  }
}
