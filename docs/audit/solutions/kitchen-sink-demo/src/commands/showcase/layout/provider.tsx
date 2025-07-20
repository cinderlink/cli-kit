/**
 * Layout Showcase Command Provider
 * 
 * Exports a Command component that combines schema and handler.
 */

import { Command } from '@tuix/cli'
import { layoutShowcaseSchema } from './schema'
import { LayoutShowcaseHandler } from './handler'

interface LayoutShowcaseCommandProps {
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

export function LayoutShowcaseCommand({
  name = 'layout',
  description = 'Showcase layout patterns (grid, flex, stack, columns)',
  alias = ['l', 'layouts'],
  hidden = false,
  args,
  flags,
  options,
  beforeRender,
  afterRender,
  wrapper,
  ...props
}: LayoutShowcaseCommandProps) {
  return (
    <Command
      name={name}
      description={description}
      alias={alias}
      hidden={hidden}
      schema={layoutShowcaseSchema}
      args={args}
      flags={flags}
      options={options}
      {...props}
    >
      {(commandProps) => {
        // Call lifecycle hooks
        beforeRender?.()
        
        const content = <LayoutShowcaseHandler {...commandProps} />
        
        afterRender?.()
        
        // Apply wrapper if provided
        return wrapper ? wrapper({ children: content }) : content
      }}
    </Command>
  )
}