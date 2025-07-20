/**
 * System Plugins Module
 * 
 * This module exports all system-level plugins including process management,
 * monitoring, and system service plugins.
 * 
 * @module plugins/system
 */

export { ProcessManagerPlugin } from "./process-manager"
export { BasePlugin } from "./base-plugin"

// Export types
export type * from "./types"

// Export adapters
export { MockProcessAdapter } from "./adapters/mock-adapter"