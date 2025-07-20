/**
 * Help Component
 * 
 * Provides help text and documentation for commands
 */

import { text } from '../../../components'
import type { JSX } from '../../../jsx/runtime'

export interface HelpProps {
  content: string
}

export function Help(props: HelpProps): JSX.Element {
  // Help is a simple display component that shows help text
  return text(props.content)
}