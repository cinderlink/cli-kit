/**
 * Process Database Command - Inline Example
 * 
 * Shows how to do everything inline for simpler commands.
 */

import { Command, Transform } from '@tuix/cli'
import { z } from 'zod'
import { DatabaseProcessorView } from '../../../components/DatabaseProcessorView'
import { idToRecordTransformer } from '../../../transforms/database-transformer'

// Inline schema
const schema = {
  args: {
    ids: z.array(z.string()).min(1)
  },
  flags: {
    batchSize: z.number().default(100),
    transform: z.string().optional()
  }
}

export function ProcessDatabaseCommand(props) {
  return (
    <Command
      name="database"
      description="Process database records by ID"
      args={schema.args}
      flags={schema.flags}
      {...props}
    >
      {({ args, flags }) => (
        <Transform source={args.ids} with={idToRecordTransformer}>
          {(records) => (
            <DatabaseProcessorView 
              records={records}
              transformation={flags.transform}
              batchSize={flags.batchSize}
            />
          )}
        </Transform>
      )}
    </Command>
  )
}

export default ProcessDatabaseCommand