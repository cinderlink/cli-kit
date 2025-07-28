/**
 * Environment variable type definitions
 * 
 * Provides type safety for process.env and Bun.env usage
 */

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      // Development/Production
      NODE_ENV?: 'development' | 'production' | 'test'
      TUIX_ENV?: 'development' | 'production' | 'test'
      
      // Debug flags
      TUIX_DEBUG?: 'true' | 'false'
      TUIX_DEBUG_AUTO_WRAP?: 'true' | 'false'
      TUIX_TRACE_RENDERS?: 'true' | 'false'
      TUIX_LOG_LEVEL?: 'debug' | 'info' | 'warn' | 'error'
      
      // Performance
      TUIX_DISABLE_CACHE?: 'true' | 'false'
      TUIX_RENDER_THROTTLE?: string // milliseconds
      
      // Testing
      TUIX_TEST_TIMEOUT?: string // milliseconds
      TUIX_MOCK_TTY?: 'true' | 'false'
      
      // Feature flags
      TUIX_EXPERIMENTAL_FEATURES?: 'true' | 'false'
      TUIX_ENABLE_PROFILING?: 'true' | 'false'
      
      // CLI
      TUIX_CLI_WIDTH?: string
      TUIX_CLI_HEIGHT?: string
      TUIX_NO_COLOR?: 'true' | 'false'
      TUIX_FORCE_COLOR?: 'true' | 'false'
      
      // Build/Deploy
      TUIX_BUILD_TARGET?: 'bun' | 'node' | 'deno'
      TUIX_PUBLIC_API_URL?: string
      TUIX_VERSION?: string
    }
  }
  
  // Also type Bun.env for consistency
  namespace Bun {
    interface Env {
      // Development/Production
      NODE_ENV?: 'development' | 'production' | 'test'
      TUIX_ENV?: 'development' | 'production' | 'test'
      
      // Debug flags
      TUIX_DEBUG?: 'true' | 'false'
      TUIX_DEBUG_AUTO_WRAP?: 'true' | 'false'
      TUIX_TRACE_RENDERS?: 'true' | 'false'
      TUIX_LOG_LEVEL?: 'debug' | 'info' | 'warn' | 'error'
      
      // Performance
      TUIX_DISABLE_CACHE?: 'true' | 'false'
      TUIX_RENDER_THROTTLE?: string // milliseconds
      
      // Testing
      TUIX_TEST_TIMEOUT?: string // milliseconds
      TUIX_MOCK_TTY?: 'true' | 'false'
      
      // Feature flags
      TUIX_EXPERIMENTAL_FEATURES?: 'true' | 'false'
      TUIX_ENABLE_PROFILING?: 'true' | 'false'
      
      // CLI
      TUIX_CLI_WIDTH?: string
      TUIX_CLI_HEIGHT?: string
      TUIX_NO_COLOR?: 'true' | 'false'
      TUIX_FORCE_COLOR?: 'true' | 'false'
      
      // Build/Deploy
      TUIX_BUILD_TARGET?: 'bun' | 'node' | 'deno'
      TUIX_PUBLIC_API_URL?: string
      TUIX_VERSION?: string
    }
  }
}

export {}