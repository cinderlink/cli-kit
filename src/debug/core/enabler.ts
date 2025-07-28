/**
 * Debug Mode Enabler
 */

import { applyDebugPatches } from './patcher'
import { debug } from './store'
import { DEBUG_DEFAULTS } from '../constants'

let debugEnabled = false

export function enableDebugMode() {
  if (debugEnabled) return
  debugEnabled = true

  debug.system('Debug mode enabled')

  // Apply all patches
  applyDebugPatches({
    patchScope: true,
    patchJSX: true,
    patchRender: true,
    patchLogger: DEBUG_DEFAULTS.CAPTURE_LOGGER,
  })
}

export function isDebugEnabled(): boolean {
  return debugEnabled || process.env.TUIX_DEBUG === 'true'
}
