/**
 * File Transformer
 * 
 * Transforms file paths into file objects with metadata.
 */

import { Transform } from '@tuix/cli'

export const fileTransformer: Transform<string[], FileInfo[]> = {
  name: 'fileTransformer',
  transform: async (files: string[]) => {
    return files.map(path => ({
      path,
      name: path.split('/').pop() || path,
      size: Math.floor(Math.random() * 1000000), // Simulated
      modified: new Date(),
      type: path.endsWith('.ts') ? 'typescript' : 
            path.endsWith('.tsx') ? 'tsx' :
            path.endsWith('.js') ? 'javascript' :
            path.endsWith('.json') ? 'json' :
            'unknown'
    }))
  }
}

interface FileInfo {
  path: string
  name: string
  size: number
  modified: Date
  type: string
}