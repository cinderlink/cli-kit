/**
 * Plugin System for CLI Framework
 *
 * This module re-exports the complete plugin architecture for extending CLI applications
 * built with the TUIX framework. The system supports command registration, middleware,
 * lifecycle hooks, dependency management, and service provision.
 *
 * ## Key Features:
 *
 * ### Plugin Architecture
 * - Modular command registration and extension
 * - Handler wrapping for cross-cutting concerns
 * - Lifecycle management (install, activate, deactivate)
 * - Configuration schema validation
 *
 * ### Middleware System
 * - Before/after command execution hooks
 * - Argument and result transformation
 * - Error handling and recovery
 * - Validation and preprocessing
 *
 * ### Dependency Management
 * - Plugin dependency resolution
 * - Version compatibility checking
 * - Circular dependency detection
 * - Load order optimization
 *
 * ### Service Provision
 * - Plugin-provided services
 * - Service injection and discovery
 * - Cross-plugin communication
 * - Resource sharing
 *
 * @example
 * ```typescript
 * import { definePlugin, PluginBuilder } from './plugin'
 *
 * // Simple plugin definition
 * const myPlugin = definePlugin({
 *   metadata: {
 *     name: 'my-plugin',
 *     version: '1.0.0',
 *     description: 'Adds useful commands'
 *   },
 *   commands: {
 *     greet: {
 *       description: 'Greet someone',
 *       options: {
 *         name: z.string().default('World')
 *       },
 *       handler: async ({ options }) => {
 *         console.log(`Hello, ${options.name}!`)
 *       }
 *     }
 *   }
 * })
 *
 * // Using the builder pattern
 * const builderPlugin = new PluginBuilder()
 *   .metadata({
 *     name: 'advanced-plugin',
 *     version: '2.0.0'
 *   })
 *   .command('deploy', {
 *     description: 'Deploy application',
 *     handler: async () => { ... }
 *   })
 *   .wrapper(async (ctx, next) => {
 *     console.log('Before command')
 *     await next()
 *     console.log('After command')
 *   })
 *   .build()
 * ```
 *
 * @module
 */

// Re-export everything from the plugin module
export * from './plugin/index'
