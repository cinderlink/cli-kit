/**
 * Styling Showcase Command Provider
 * 
 * Exports a Command component that combines schema and handler.
 */

import { Command } from '@tuix/cli'
import { stylingShowcaseSchema } from './schema'
import { StylingShowcaseHandler } from './handler'

interface StylingShowcaseCommandProps {
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

export function StylingShowcaseCommand({
  name = 'styling',
  description = 'Showcase styling capabilities (colors, borders, gradients, shadows)',
  alias = ['s', 'styles'],
  hidden = false,
  args,
  flags,
  options,
  beforeRender,
  afterRender,
  wrapper,
  ...props
}: StylingShowcaseCommandProps) {
  return (
    <Command
      name={name}
      description={description}
      alias={alias}
      hidden={hidden}
      schema={stylingShowcaseSchema}
      args={args}
      flags={flags}
      options={options}
      {...props}
    >
      {(commandProps) => {
        // Call lifecycle hooks
        beforeRender?.()
        
        const content = <StylingShowcaseHandler {...commandProps} />
        
        afterRender?.()
        
        // Apply wrapper if provided
        return wrapper ? wrapper({ children: content }) : content
      }}
    </Command>
  )
}