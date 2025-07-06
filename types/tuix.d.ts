/**
 * Type definitions for .tuix files (Terminal UI eXtensions)
 * 
 * This module declaration allows TypeScript to recognize .tuix files
 * and treat them as modules that export TUI components.
 */

declare module "*.tuix" {
  import type { View } from "../src/core/types"
  
  // Allow default and named exports from .tuix files
  const content: any
  export default content
  export = content
}

// Global type augmentation for .tuix file support
declare namespace NodeJS {
  interface Module {
    exports: any
  }
}

// JSX namespace for .tuix files
declare global {
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any
    }
  }
}