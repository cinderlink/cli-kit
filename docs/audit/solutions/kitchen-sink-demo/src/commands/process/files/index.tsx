/**
 * Process Files Command
 */

import { Command } from '@tuix/cli'
import { processFilesSchema } from './schema'
import { ProcessFilesHandler } from './handler'

export function ProcessFilesCommand(props) {
  return (
    <Command
      name="files"
      description="Process multiple files with patterns and transforms"
      schema={processFilesSchema}
      {...props}
    >
      {ProcessFilesHandler}
    </Command>
  )
}

export default ProcessFilesCommand