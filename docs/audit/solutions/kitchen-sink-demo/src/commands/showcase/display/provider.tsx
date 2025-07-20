/**
 * Display Showcase Command Provider
 * 
 * Exports a Command component that combines schema and handler.
 */

import { Command } from '@tuix/cli'
import { displayShowcaseSchema } from './schema'
import { DisplayShowcaseHandler } from './handler'

interface DisplayShowcaseCommandProps {
  // Allow overriding any Command props
  name?: string
  description?: string
  alias?: string | string[]
  hidden?: boolean
  // Allow schema overrides
  args?: any
  flags?: any
  options?: any
  // Allow handler customization
  beforeRender?: () => void
  afterRender?: () => void
  // Allow wrapper customization
  wrapper?: (props: { children: any }) => JSX.Element
}

export function DisplayShowcaseCommand({
  name = 'display',
  description = 'Showcase display components (text, tables, progress, badges)',
  alias = ['d', 'show'],
  hidden = false,
  args,
  flags,
  options,
  beforeRender,
  afterRender,
  wrapper,
  ...props
}: DisplayShowcaseCommandProps) {
  return (
    <Command
      name={name}
      description={description}
      alias={alias}
      hidden={hidden}
      schema={displayShowcaseSchema}
      args={args}
      flags={flags}
      options={options}
      {...props}
    >
      {(commandProps) => {
        // Call lifecycle hooks
        beforeRender?.()
        
        const content = <DisplayShowcaseHandler {...commandProps} />
        
        afterRender?.()
        
        // Apply wrapper if provided
        return wrapper ? wrapper({ children: content }) : content
      }}
    </Command>
  )
}