/**
 * Interactive Showcase Command Provider
 * 
 * Exports a Command component that combines schema and handler.
 */

import { Command } from '@tuix/cli'
import { interactiveShowcaseSchema } from './schema'
import { InteractiveShowcaseHandler } from './handler'

interface InteractiveShowcaseCommandProps {
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

export function InteractiveShowcaseCommand({
  name = 'interactive',
  description = 'Showcase interactive components (buttons, inputs, forms, modals)',
  alias = ['i', 'interact'],
  hidden = false,
  args,
  flags,
  options,
  beforeRender,
  afterRender,
  wrapper,
  ...props
}: InteractiveShowcaseCommandProps) {
  return (
    <Command
      name={name}
      description={description}
      alias={alias}
      hidden={hidden}
      schema={interactiveShowcaseSchema}
      args={args}
      flags={flags}
      options={options}
      {...props}
    >
      {(commandProps) => {
        // Call lifecycle hooks
        beforeRender?.()
        
        const content = <InteractiveShowcaseHandler {...commandProps} />
        
        afterRender?.()
        
        // Apply wrapper if provided
        return wrapper ? wrapper({ children: content }) : content
      }}
    </Command>
  )
}