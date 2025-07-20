/**
 * Process Files View Component
 * 
 * Displays file processing UI with progress.
 */

import { Box, Text, LabeledBox, ProgressBar } from '@tuix/components'
import { $state } from '@tuix/reactivity'
import { If } from '@tuix/cli'

interface ProcessFilesViewProps {
  files: any[]
  ignorePatterns?: string[]
  outputDir?: string
  parallel?: boolean
}

export function ProcessFilesView({ files, ignorePatterns, outputDir, parallel }: ProcessFilesViewProps) {
  const state = $state({
    currentFile: 0,
    progress: 0
  })

  return (
    <LabeledBox label="File Processing">
      <Box vertical>
        <Text>Processing {files.length} files{parallel ? ' in parallel' : ' sequentially'}</Text>
        
        <If condition={outputDir}>
          <Text>Output: {outputDir}</Text>
        </If>
        
        <If condition={ignorePatterns?.length > 0}>
          <Box>
            <Text style="subtitle">Ignored Patterns:</Text>
            {ignorePatterns.map(pattern => (
              <Text key={pattern}>• {pattern}</Text>
            ))}
          </Box>
        </If>
        
        <Box>
          <Text>Progress:</Text>
          <ProgressBar value={state.progress} max={100} />
        </Box>
        
        <Box>
          <Text style="subtitle">Files:</Text>
          {files.map((file, i) => (
            <Text key={i} style={i === state.currentFile ? 'highlight' : 'normal'}>
              • {file.path}
            </Text>
          ))}
        </Box>
      </Box>
    </LabeledBox>
  )
}