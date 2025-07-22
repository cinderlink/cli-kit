/**
 * Exit Component
 * 
 * Handles graceful CLI exit
 */

import { Effect } from 'effect'
import { onMount } from '@core/update/reactivity/jsxLifecycle'
import { text } from '@core/view/primitives/view'
import type { JSX } from '@jsx/runtime'

export interface ExitProps {
  code?: number
  message?: string
}

export function Exit(props: ExitProps): JSX.Element {
  onMount(() => {
    // Exit the process after the component mounts
    process.exit(props.code ?? 0)
  })
  
  // Display message if provided
  return props.message ? text(props.message) : null
}