/**
 * Display Showcase Command Handler
 * 
 * Demonstrates all display components with Svelte 5 runes integration.
 */

import { Box, Text, LabeledBox, Table, ProgressBar, Spinner, Badge, LargeText } from '@tuix/components'
import { $state, $effect, $derived } from '@tuix/reactivity'
import type { DisplayShowcaseArgs, DisplayShowcaseFlags, DisplayShowcaseOptions } from './schema'

interface DisplayShowcaseHandlerProps {
  args: DisplayShowcaseArgs
  flags: DisplayShowcaseFlags
  options: DisplayShowcaseOptions
}

export function DisplayShowcaseHandler({ args, flags, options }: DisplayShowcaseHandlerProps) {
  // Reactive state with runes
  const state = $state({
    progress: 0,
    loading: true,
    selectedRow: -1,
    animationFrame: 0
  })

  // Derived animation speed
  const animationDelay = $derived(() => {
    switch (options.speed) {
      case 'slow': return 100
      case 'fast': return 20
      default: return 50
    }
  })

  // Animation effect
  $effect(() => {
    if (!flags.animated) return

    const timer = setInterval(() => {
      // Animate progress
      state.progress = (state.progress + 2) % 101
      
      // Toggle loading every 3 seconds
      if (state.animationFrame % 60 === 0) {
        state.loading = !state.loading
      }
      
      state.animationFrame++
    }, animationDelay)
    
    return () => clearInterval(timer)
  })

  // Sample table data with reactive selection
  const tableData = $state([
    { Name: 'Alice Johnson', Role: 'Senior Developer', Status: 'Active', Team: 'Frontend' },
    { Name: 'Bob Smith', Role: 'UX Designer', Status: 'Away', Team: 'Design' },
    { Name: 'Carol Williams', Role: 'Product Manager', Status: 'Active', Team: 'Product' },
    { Name: 'David Brown', Role: 'DevOps Engineer', Status: 'Busy', Team: 'Infrastructure' },
    { Name: 'Eve Davis', Role: 'QA Lead', Status: 'Active', Team: 'Quality' }
  ])

  // Filter to specific component if requested
  const showAll = !args.component
  const showComponent = (name: string) => showAll || args.component === name

  return (
    <Box vertical gap={3} className={`theme-${flags.theme}`}>
      <Box>
        <LargeText>Display Components</LargeText>
        <Text style="muted">
          Theme: {flags.theme} | Animation: {flags.animated ? 'ON' : 'OFF'} | Speed: {options.speed}
        </Text>
      </Box>
      
      {showComponent('text') && (
        <LabeledBox label="Text Components">
          <Box vertical gap={1}>
            <Text style="title">Title Text - Bold and Prominent</Text>
            <Text style="subtitle">Subtitle Text - Secondary Heading</Text>
            <Text style="body">Body text with normal styling for regular content</Text>
            <Text style="muted">Muted text for secondary information and hints</Text>
            <Text style="error">Error text for validation messages ⚠️</Text>
            <Text style="success">Success text for confirmations ✓</Text>
            <Text style="info">Info text for notifications ℹ</Text>
            <Text style="warning">Warning text for cautions ⚡</Text>
          </Box>
        </LabeledBox>
      )}
      
      {showComponent('large') && (
        <LabeledBox label="Large Text Display">
          <Box vertical gap={2}>
            <LargeText>BIG TEXT</LargeText>
            <LargeText font="script">Fancy Script</LargeText>
            <LargeText font="3d">3D Effect</LargeText>
          </Box>
        </LabeledBox>
      )}
      
      {showComponent('table') && (
        <LabeledBox label="Data Display">
          <Box vertical gap={1}>
            <Table 
              data={tableData}
              onRowClick={flags.interactive ? (row, index) => {
                state.selectedRow = index
              } : undefined}
              selectedRow={flags.interactive ? state.selectedRow : undefined}
            />
            {flags.interactive && state.selectedRow >= 0 && (
              <Text style="info">
                Selected: {tableData[state.selectedRow].Name}
              </Text>
            )}
          </Box>
        </LabeledBox>
      )}
      
      {showComponent('progress') && (
        <LabeledBox label="Progress Indicators">
          <Box vertical gap={2}>
            <Box vertical gap={1}>
              <Text>Standard Progress Bar ({state.progress}%)</Text>
              <ProgressBar value={state.progress} max={100} />
            </Box>
            
            <Box vertical gap={1}>
              <Text>Colored Progress Bars</Text>
              <ProgressBar value={75} max={100} color="green" />
              <ProgressBar value={50} max={100} color="yellow" />
              <ProgressBar value={25} max={100} color="red" />
            </Box>
            
            <Box horizontal gap={2} align="center">
              <Spinner active={state.loading} />
              <Text>{state.loading ? 'Loading...' : 'Complete'}</Text>
              <Spinner active={true} size="small" />
              <Spinner active={true} size="large" color="blue" />
            </Box>
          </Box>
        </LabeledBox>
      )}
      
      {showComponent('badge') && (
        <LabeledBox label="Badges & Labels">
          <Box vertical gap={2}>
            <Box horizontal gap={2} wrap>
              <Badge variant="primary">Primary</Badge>
              <Badge variant="success">Success</Badge>
              <Badge variant="warning">Warning</Badge>
              <Badge variant="error">Error</Badge>
              <Badge variant="info">Info</Badge>
              <Badge variant="muted">Muted</Badge>
            </Box>
            
            <Box horizontal gap={2}>
              <Badge variant="primary" size="small">Small</Badge>
              <Badge variant="success" size="medium">Medium</Badge>
              <Badge variant="info" size="large">Large</Badge>
            </Box>
            
            {flags.interactive && (
              <Box horizontal gap={2}>
                <Badge 
                  variant="primary" 
                  onClick={() => console.log('Badge clicked!')}
                  clickable
                >
                  Clickable
                </Badge>
                <Badge 
                  variant="success" 
                  count={state.animationFrame}
                >
                  Counter
                </Badge>
              </Box>
            )}
          </Box>
        </LabeledBox>
      )}
      
      {args.component && !showAll && (
        <Text style="muted">
          Showing only: {args.component} component
        </Text>
      )}
    </Box>
  )
}