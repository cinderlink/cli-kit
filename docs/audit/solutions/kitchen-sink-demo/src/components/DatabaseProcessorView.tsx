/**
 * Database Processor View Component
 * 
 * Shows database record processing with batch support.
 */

import { Box, Text, LabeledBox, ProgressBar, Table } from '@tuix/components'
import { $state, $derived } from '@tuix/reactivity'

interface DatabaseProcessorViewProps {
  records: any[]
  transformation?: string
  batchSize: number
}

export function DatabaseProcessorView({ records, transformation, batchSize }: DatabaseProcessorViewProps) {
  const state = $state({
    processed: 0,
    currentBatch: 0,
    errors: []
  })

  const totalBatches = $derived(() => Math.ceil(records.length / batchSize))
  const progress = $derived(() => (state.processed / records.length) * 100)

  return (
    <LabeledBox label="Database Processing">
      <Box vertical gap={2}>
        <Box horizontal gap={4}>
          <Text>Total Records: {records.length}</Text>
          <Text>Batch Size: {batchSize}</Text>
          <Text>Batches: {totalBatches}</Text>
        </Box>
        
        {transformation && (
          <Text>Transformation: {transformation}</Text>
        )}
        
        <Box>
          <Text>Progress: {state.processed}/{records.length}</Text>
          <ProgressBar value={progress} max={100} />
        </Box>
        
        {state.errors.length > 0 && (
          <LabeledBox label="Errors" style="error">
            <Table data={state.errors} />
          </LabeledBox>
        )}
        
        <Box style="muted">
          <Text>Current Batch: {state.currentBatch + 1}/{totalBatches}</Text>
        </Box>
      </Box>
    </LabeledBox>
  )
}