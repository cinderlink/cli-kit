/**
 * Display Showcase View
 * 
 * Demonstrates all display components.
 */

import { Box, Text, LabeledBox, Table, ProgressBar, Spinner, Badge } from '@tuix/components'
import { $state } from '@tuix/reactivity'

export function DisplayShowcaseView() {
  const state = $state({
    progress: 65,
    loading: true
  })

  const tableData = [
    { Name: 'Alice', Role: 'Developer', Status: 'Active' },
    { Name: 'Bob', Role: 'Designer', Status: 'Away' },
    { Name: 'Carol', Role: 'Manager', Status: 'Active' }
  ]

  return (
    <Box vertical gap={3}>
      <Text style="title">Display Components Showcase</Text>
      
      <LabeledBox label="Text Components">
        <Box vertical gap={1}>
          <Text style="title">Title Text</Text>
          <Text style="subtitle">Subtitle Text</Text>
          <Text style="body">Body text with normal styling</Text>
          <Text style="muted">Muted text for secondary info</Text>
          <Text style="error">Error text ⚠️</Text>
          <Text style="success">Success text ✓</Text>
          <Text style="info">Info text ℹ</Text>
        </Box>
      </LabeledBox>
      
      <LabeledBox label="Data Display">
        <Table data={tableData} />
      </LabeledBox>
      
      <LabeledBox label="Progress Indicators">
        <Box vertical gap={2}>
          <Box>
            <Text>Progress Bar ({state.progress}%)</Text>
            <ProgressBar value={state.progress} max={100} />
          </Box>
          
          <Box horizontal gap={2}>
            <Spinner active={state.loading} />
            <Text>Loading spinner</Text>
          </Box>
        </Box>
      </LabeledBox>
      
      <LabeledBox label="Badges">
        <Box horizontal gap={2}>
          <Badge variant="primary">Primary</Badge>
          <Badge variant="success">Success</Badge>
          <Badge variant="warning">Warning</Badge>
          <Badge variant="error">Error</Badge>
          <Badge variant="info">Info</Badge>
        </Box>
      </LabeledBox>
    </Box>
  )
}