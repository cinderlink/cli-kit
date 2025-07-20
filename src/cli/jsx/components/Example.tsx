/**
 * Example Component
 * 
 * Shows usage examples for commands
 */

import { box, text } from '../../../components'
import type { JSX } from '../../../jsx/runtime'

export interface ExampleProps {
  code: string
  description?: string
}

export function Example(props: ExampleProps): JSX.Element {
  return box(
    {
      flexDirection: 'column',
      gap: 1,
      marginY: 1
    },
    props.description ? text(props.description) : null,
    box(
      {
        paddingX: 2,
        borderStyle: 'single',
        borderColor: 'gray'
      },
      text(props.code)
    )
  )
}