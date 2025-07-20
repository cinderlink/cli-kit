/**
 * Dashboard Command Provider
 * 
 * Exports a Command component that combines schema and handler.
 * Allows for overrides via props and children.
 */

import { Command } from '@tuix/cli'
import { dashboardSchema } from './schema'
import { DashboardHandler } from './handler'

interface DashboardCommandProps {
  config?: any
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

export function DashboardCommand({
  config,
  name = 'dashboard',
  description = 'Show system dashboard with real-time metrics',
  alias = ['dash', 'd'],
  hidden = false,
  args,
  flags,
  options,
  beforeRender,
  afterRender,
  wrapper,
  ...props
}: DashboardCommandProps) {
  return (
    <Command
      name={name}
      description={description}
      alias={alias}
      hidden={hidden}
      schema={dashboardSchema}
      args={args}
      flags={flags}
      options={options}
      {...props}
    >
      {(commandProps) => {
        // Call lifecycle hooks
        beforeRender?.()
        
        const content = (
          <DashboardHandler 
            {...commandProps} 
            config={config}
          />
        )
        
        afterRender?.()
        
        // Apply wrapper if provided
        return wrapper ? wrapper({ children: content }) : content
      }}
    </Command>
  )
}