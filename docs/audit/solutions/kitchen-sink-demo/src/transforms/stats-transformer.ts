/**
 * Stats Transformer
 * 
 * Transforms raw system stats into display format.
 */

import { Transform } from '@tuix/cli'

export const statsTransformer: Transform<any, SystemStats> = {
  name: 'statsTransformer',
  transform: async (raw: any) => {
    return {
      cpu: Math.round(Math.random() * 100),
      memory: Math.round(Math.random() * 100),
      disk: Math.round(Math.random() * 100),
      network: Math.round(Math.random() * 100),
      history: Array.from({ length: 20 }, () => Math.random() * 100)
    }
  }
}

interface SystemStats {
  cpu: number
  memory: number
  disk: number
  network: number
  history: number[]
}