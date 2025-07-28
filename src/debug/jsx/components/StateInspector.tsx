/**
 * State Inspector Component
 *
 * Displays application state
 */

import { box, text } from '@core/view'

export function StateInspector() {
  return box({
    children: text({
      style: { color: 'gray' },
      children: 'State inspector not implemented yet',
    }),
  })
}
