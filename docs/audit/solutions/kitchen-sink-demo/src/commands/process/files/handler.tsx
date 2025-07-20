/**
 * Process Files Handler
 */

import { Box, Text, LabeledBox, ProgressBar } from '@tuix/components'
import { Transform, If, Else } from '@tuix/cli'
import { $state, $derived, $effect } from '@tuix/reactivity'
import { fileTransformer } from '../../../transforms/file-transformer'

export function ProcessFilesHandler({ args, flags }) {
  const state = $state({
    currentIndex: 0,
    processedFiles: [],
    errors: [],
    startTime: Date.now()
  })

  const progress = $derived(() => 
    (state.processedFiles.length / args.files.length) * 100
  )

  const timeElapsed = $derived(() => 
    Math.floor((Date.now() - state.startTime) / 1000)
  )

  const filesPerSecond = $derived(() => 
    state.processedFiles.length / Math.max(timeElapsed, 1)
  )

  // Simulate processing
  $effect(() => {
    if (!flags.dryRun && state.currentIndex < args.files.length) {
      const timer = setTimeout(() => {
        state.processedFiles.push(args.files[state.currentIndex])
        state.currentIndex++
      }, 500)
      
      return () => clearTimeout(timer)
    }
  })

  return (
    <Transform source={args.files} with={fileTransformer}>
      {(fileInfos) => (
        <LabeledBox label="File Processing">
          <If condition={flags.dryRun}>
            <Box>
              <Text style="warning">🔍 Dry Run Mode</Text>
              <Text>Would process {fileInfos.length} files</Text>
              {flags.output && <Text>Output: {flags.output}</Text>}
              {flags.parallel && <Text>Mode: Parallel</Text>}
            </Box>
            
            <Else>
              <Box vertical gap={2}>
                <Box horizontal justify="space-between">
                  <Text>Progress: {state.processedFiles.length}/{fileInfos.length}</Text>
                  <Text>{filesPerSecond.toFixed(1)} files/sec</Text>
                </Box>
                
                <ProgressBar value={progress} max={100} />
                
                <If condition={flags.ignore.length > 0}>
                  <Box>
                    <Text style="muted">Ignoring patterns:</Text>
                    {flags.ignore.map(pattern => (
                      <Text key={pattern}>• {pattern}</Text>
                    ))}
                  </Box>
                </If>
                
                <Box style="muted">
                  <Text>Mode: {flags.parallel ? 'Parallel' : 'Sequential'}</Text>
                  {flags.output && <Text>Output: {flags.output}</Text>}
                </Box>
                
                {state.errors.length > 0 && (
                  <Box style="error">
                    <Text>Errors: {state.errors.length}</Text>
                  </Box>
                )}
              </Box>
            </Else>
          </If>
        </LabeledBox>
      )}
    </Transform>
  )
}