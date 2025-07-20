/**
 * Tuix Configuration
 * 
 * Configuration for exemplar
 */

import { defineConfig } from 'tuix/config'

export default defineConfig({
  // Application name
  name: 'exemplar',
  
  // Version
  version: '1.0.0',
  
  // Logger configuration
  logger: {
    level: 'info',
    format: 'pretty',
    showEmoji: true
  },
  
  // Process manager configuration
  processManager: {
    tuixDir: '.tuix',
    autoRestart: true,
    maxRestarts: 5
  },
  
  // CLI configuration
  cli: {
    // Default values for CLI options
    defaults: {
      verbose: false,
      quiet: false
    }
  },
  
  // Custom configuration
  custom: {
    // Add your app-specific config here
  }
})
