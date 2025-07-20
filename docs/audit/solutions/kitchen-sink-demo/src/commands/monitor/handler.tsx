/**
 * Monitor Command Handler
 */

import { Stream, Transform } from '@tuix/cli'
import { SystemMonitorView } from '../../components/SystemMonitorView'
import { statsTransformer } from '../../transforms/stats-transformer'

export function MonitorHandler({ args, flags }) {
  return (
    <Stream 
      source={`system-stats-${args.resource}`} 
      interval={flags.interval}
    >
      {(data) => (
        <Transform source={data} with={statsTransformer}>
          {(stats) => (
            <SystemMonitorView 
              stats={stats} 
              format={flags.format}
              resource={args.resource}
            />
          )}
        </Transform>
      )}
    </Stream>
  )
}