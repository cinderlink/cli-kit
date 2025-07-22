/**
 * Config Manager Module
 * 
 * Handles loading and creating Tuix configuration
 */

import { loadConfig } from "tuix/config"
import { createConfig, type TuixConfig } from "tuix/config"

export class ConfigManager {
  /**
   * Load Tuix configuration
   */
  async loadTuixConfig(): Promise<TuixConfig | undefined> {
    try {
      return await loadConfig()
    } catch (error) {
      // Config not found or invalid, that's okay - we'll run without it
      if (process.env.CLI_VERBOSE === 'true') {
        console.warn('No tuix config found, running without config:', error)
      }
      return undefined
    }
  }
  
  /**
   * Create default config if none exists
   */
  async ensureConfig(appName?: string): Promise<TuixConfig> {
    try {
      return await loadConfig()
    } catch (error) {
      // Config doesn't exist, create one
      const configName = appName || 'tuix'
      const defaultConfig = createConfig()
      
      // Save the config
      const configPath = `${configName}.config.ts`
      const configContent = this.generateConfigContent()
      
      await Bun.write(configPath, configContent)
      console.log(`✅ Created default config at ${configPath}`)
      
      return defaultConfig
    }
  }
  
  /**
   * Generate default config file content
   */
  private generateConfigContent(): string {
    return `import { createConfig } from 'tuix'

export default createConfig({
  // Process manager services
  processManager: {
    services: {
      // Add your services here
      // Example:
      // 'my-service': {
      //   command: 'npm run dev',
      //   cwd: '.',
      //   env: {},
      //   autoRestart: true
      // }
    }
  },
  
  // Logger configuration
  logger: {
    level: 'info',
    format: 'json',
    outputs: ['console']
  }
})
`
  }
}