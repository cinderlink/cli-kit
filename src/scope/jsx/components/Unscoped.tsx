/**
 * Unscoped Component
 * 
 * Wrapper that renders children outside of scope tracking.
 * Useful for content that should always render regardless of scope.
 */

import type { JSX } from '../../../jsx/runtime'

export interface UnscopedProps {
  children?: JSX.Element | JSX.Element[]
}

export function Unscoped(props: UnscopedProps): JSX.Element {
  // Simply render children without scope checks
  return <>{props.children}</>
}