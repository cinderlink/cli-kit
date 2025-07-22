import { Box, Text, Button, Modal, ProgressBar, Spinner, Badge, Card } from 'tuix/components'
import { $state, onMount } from 'tuix/runes'
import type { CommandHandler } from 'tuix/cli'

export const ShowcaseCommand: CommandHandler = ({ options }) => {
  const { interactive } = options as { interactive: boolean }
  
  const showModal = $state<boolean>(false)
  const progress = $state<number>(0)
  const loading = $state<boolean>(false)
  const counter = $state<number>(0)
  
  onMount(() => {
    // Animate progress bar
    const interval = setInterval(() => {
      progress.$update(p => (p + 5) % 105)
    }, 200)
    
    return () => clearInterval(interval)
  })
  
  const handleAsyncAction = async () => {
    loading.$set(true)
    await new Promise(resolve => setTimeout(resolve, 2000))
    loading.$set(false)
    counter.$update(c => c + 1)
  }
  
  return (
    <Box
      direction="column"
      width="100%"
      height="100%"
      padding={2}
      borderStyle="rounded"
      borderColor="rainbow"
    >
      <Text bold color="rainbow" size="large" align="center" marginBottom={1}>
        🎨 Component Showcase
      </Text>
      
      <Box borderStyle="double" marginBottom={2} />
      
      <Box direction="row" gap={2} flex={1}>
        {/* Left Column - Interactive Components */}
        <Box direction="column" flex={1} gap={2}>
          <Card title="Interactive Elements" borderColor="blue">
            <Box direction="column" gap={1}>
              <Box direction="row" gap={1}>
                <Button onClick={() => counter.$update(c => c + 1)} variant="primary">
                  Count: {counter()}
                </Button>
                <Button onClick={() => counter.$set(0)} variant="secondary">
                  Reset
                </Button>
              </Box>
              
              <Button 
                onClick={() => showModal.$set(true)} 
                variant="success"
                fullWidth
              >
                Show Modal
              </Button>
              
              <Button 
                onClick={handleAsyncAction} 
                variant="warning"
                disabled={loading()}
                fullWidth
              >
                {loading() ? <Spinner /> : 'Async Action'}
              </Button>
            </Box>
          </Card>
          
          <Card title="Progress & Status" borderColor="green">
            <Box direction="column" gap={1}>
              <ProgressBar
                value={progress()}
                max={100}
                color="green"
                width={30}
                showPercentage
              />
              
              <Box direction="row" gap={1} flexWrap>
                <Badge variant="success">Active</Badge>
                <Badge variant="warning">Pending</Badge>
                <Badge variant="error">Failed</Badge>
                <Badge variant="info">New</Badge>
              </Box>
            </Box>
          </Card>
        </Box>
        
        {/* Middle Column - Layout Examples */}
        <Box direction="column" flex={1} gap={2}>
          <Card title="Layout Patterns" borderColor="yellow">
            <Box direction="column" gap={1}>
              <Box direction="row" justify="space-between" padding={1} borderStyle="single">
                <Text>Left</Text>
                <Text>Center</Text>
                <Text>Right</Text>
              </Box>
              
              <Box direction="column" align="center" padding={1} borderStyle="dashed">
                <Text>Centered</Text>
                <Text>Content</Text>
              </Box>
              
              <Box direction="row" gap={1}>
                <Box flex={1} padding={1} borderStyle="single" align="center">
                  <Text>Flex 1</Text>
                </Box>
                <Box flex={2} padding={1} borderStyle="single" align="center">
                  <Text>Flex 2</Text>
                </Box>
              </Box>
            </Box>
          </Card>
          
          <Card title="Typography" borderColor="cyan">
            <Box direction="column" gap={0.5}>
              <Text size="large" bold>Large Bold Text</Text>
              <Text size="medium" italic>Medium Italic Text</Text>
              <Text size="small" dim>Small Dim Text</Text>
              <Text color="rainbow">Rainbow Colored Text</Text>
              <Text fontFamily="monospace">Monospace Font</Text>
            </Box>
          </Card>
        </Box>
        
        {/* Right Column - Visual Elements */}
        <Box direction="column" flex={1} gap={2}>
          <Card title="Borders & Styles" borderColor="magenta">
            <Box direction="column" gap={1}>
              <Box padding={1} borderStyle="single" borderColor="red">
                <Text>Single Red Border</Text>
              </Box>
              
              <Box padding={1} borderStyle="double" borderColor="blue">
                <Text>Double Blue Border</Text>
              </Box>
              
              <Box padding={1} borderStyle="rounded" borderColor="green">
                <Text>Rounded Green Border</Text>
              </Box>
              
              <Box padding={1} borderStyle="dashed" borderColor="yellow">
                <Text>Dashed Yellow Border</Text>
              </Box>
            </Box>
          </Card>
          
          <Card title="Colors & Effects" borderColor="red">
            <Box direction="column" gap={1}>
              <Text color="red">Red Text</Text>
              <Text color="green">Green Text</Text>
              <Text color="blue">Blue Text</Text>
              <Text color="yellow">Yellow Text</Text>
              <Text backgroundColor="cyan" color="black">Background Color</Text>
              <Text opacity={0.5}>50% Opacity</Text>
            </Box>
          </Card>
        </Box>
      </Box>
      
      {/* Modal */}
      {showModal() && (
        <Modal
          title="Example Modal"
          onClose={() => showModal.$set(false)}
          width={40}
          height={15}
        >
          <Box direction="column" gap={2} padding={2}>
            <Text>This is a modal dialog demonstrating overlay functionality.</Text>
            
            <Box direction="column" gap={1}>
              <Text bold>Features:</Text>
              <Text>• Centered positioning</Text>
              <Text>• Background overlay</Text>
              <Text>• Keyboard navigation</Text>
              <Text>• Focus management</Text>
            </Box>
            
            <Box direction="row" gap={2} justify="end">
              <Button onClick={() => showModal.$set(false)} variant="secondary">
                Cancel
              </Button>
              <Button onClick={() => showModal.$set(false)} variant="primary">
                OK
              </Button>
            </Box>
          </Box>
        </Modal>
      )}
      
      {/* Footer */}
      <Box borderStyle="single" marginY={1} />
      
      <Box direction="row" justify="space-between">
        <Text dim>
          Interactive: {interactive ? 'Enabled' : 'Disabled'}
        </Text>
        <Text dim>
          Press 'r' to refresh • 'q' to quit
        </Text>
      </Box>
    </Box>
  )
}