/**
 * Layout Showcase Command Handler
 * 
 * Demonstrates all layout patterns and components with Svelte 5 runes integration.
 */

import { 
  Box, Text, LabeledBox, Grid, Spacer, Divider,
  FlexBox, Stack, Columns, Row, Container, ScrollArea
} from '@tuix/components'
import { $state, $effect, $derived } from '@tuix/reactivity'
import type { LayoutShowcaseArgs, LayoutShowcaseFlags, LayoutShowcaseOptions } from './schema'

interface LayoutShowcaseHandlerProps {
  args: LayoutShowcaseArgs
  flags: LayoutShowcaseFlags
  options: LayoutShowcaseOptions
}

export function LayoutShowcaseHandler({ args, flags, options }: LayoutShowcaseHandlerProps) {
  // Reactive state for dynamic layouts
  const state = $state({
    containerWidth: 80,
    itemCount: 3,
    selectedLayout: 'grid',
    flexDirection: 'horizontal' as 'horizontal' | 'vertical',
    gridColumns: 3,
    alignment: 'start' as 'start' | 'center' | 'end' | 'stretch'
  })

  // Derived gap and padding values
  const gapSize = $derived(() => {
    switch (options.gap) {
      case 'none': return 0
      case 'small': return 1
      case 'large': return 4
      default: return 2
    }
  })

  const paddingSize = $derived(() => {
    switch (options.padding) {
      case 'none': return 0
      case 'small': return 1
      case 'large': return 4
      default: return 2
    }
  })

  // Helper to create demo boxes
  const DemoBox = ({ label, height = 3, width }: { label: string, height?: number, width?: number }) => (
    <Box 
      border={flags.borders ? 'single' : 'none'}
      padding={paddingSize}
      height={height}
      width={width}
      style="muted"
    >
      <Text>{flags.labels ? label : '█'}</Text>
    </Box>
  )

  // Filter to specific pattern if requested
  const showAll = !args.pattern
  const showPattern = (name: string) => showAll || args.pattern === name

  return (
    <Box vertical gap={3}>
      <Box>
        <Text style="title">Layout Patterns</Text>
        <Text style="muted">
          Gap: {options.gap} | Padding: {options.padding} | Borders: {flags.borders ? 'ON' : 'OFF'}
        </Text>
      </Box>
      
      {showPattern('box') && (
        <LabeledBox label="Box Layouts">
          <Box vertical gap={2}>
            <Text>Horizontal Box Layout</Text>
            <Box horizontal gap={gapSize}>
              <DemoBox label="Left" />
              <DemoBox label="Center" />
              <DemoBox label="Right" />
            </Box>
            
            <Text>Vertical Box Layout</Text>
            <Box vertical gap={gapSize}>
              <DemoBox label="Top" />
              <DemoBox label="Middle" />
              <DemoBox label="Bottom" />
            </Box>
            
            <Text>Nested Box Layout</Text>
            <Box horizontal gap={gapSize}>
              <Box vertical gap={1}>
                <DemoBox label="1.1" />
                <DemoBox label="1.2" />
              </Box>
              <Box vertical gap={1}>
                <DemoBox label="2.1" />
                <DemoBox label="2.2" />
                <DemoBox label="2.3" />
              </Box>
              <DemoBox label="3" height={8} />
            </Box>
          </Box>
        </LabeledBox>
      )}
      
      {showPattern('grid') && (
        <LabeledBox label="Grid Layouts">
          <Box vertical gap={2}>
            <Text>Fixed Grid ({state.gridColumns} columns)</Text>
            <Grid columns={state.gridColumns} gap={gapSize}>
              {Array.from({ length: 9 }, (_, i) => (
                <DemoBox key={i} label={`Cell ${i + 1}`} />
              ))}
            </Grid>
            
            <Text>Responsive Grid</Text>
            <Grid columns="auto" minItemWidth={15} gap={gapSize}>
              {Array.from({ length: 6 }, (_, i) => (
                <DemoBox key={i} label={`Item ${i + 1}`} />
              ))}
            </Grid>
            
            {flags.responsive && (
              <>
                <Text>Dynamic Grid Controls</Text>
                <Box horizontal gap={2}>
                  <Button onClick={() => state.gridColumns = Math.max(1, state.gridColumns - 1)}>
                    - Column
                  </Button>
                  <Text>Columns: {state.gridColumns}</Text>
                  <Button onClick={() => state.gridColumns = Math.min(6, state.gridColumns + 1)}>
                    + Column
                  </Button>
                </Box>
              </>
            )}
          </Box>
        </LabeledBox>
      )}
      
      {showPattern('flex') && (
        <LabeledBox label="Flexbox Layouts">
          <Box vertical gap={2}>
            <Text>Flex with Different Alignments</Text>
            
            <Box>
              <Text style="muted">align: start</Text>
              <FlexBox direction="horizontal" align="start" gap={gapSize}>
                <DemoBox label="Short" height={2} />
                <DemoBox label="Medium" height={4} />
                <DemoBox label="Tall" height={6} />
              </FlexBox>
            </Box>
            
            <Box>
              <Text style="muted">align: center</Text>
              <FlexBox direction="horizontal" align="center" gap={gapSize}>
                <DemoBox label="Short" height={2} />
                <DemoBox label="Medium" height={4} />
                <DemoBox label="Tall" height={6} />
              </FlexBox>
            </Box>
            
            <Box>
              <Text style="muted">align: end</Text>
              <FlexBox direction="horizontal" align="end" gap={gapSize}>
                <DemoBox label="Short" height={2} />
                <DemoBox label="Medium" height={4} />
                <DemoBox label="Tall" height={6} />
              </FlexBox>
            </Box>
            
            <Text>Flex with Grow</Text>
            <FlexBox direction="horizontal" gap={gapSize}>
              <Box flex={1}><DemoBox label="Flex: 1" /></Box>
              <Box flex={2}><DemoBox label="Flex: 2" /></Box>
              <Box flex={1}><DemoBox label="Flex: 1" /></Box>
            </FlexBox>
          </Box>
        </LabeledBox>
      )}
      
      {showPattern('stack') && (
        <LabeledBox label="Stack & Layers">
          <Box vertical gap={2}>
            <Text>Vertical Stack</Text>
            <Stack gap={gapSize}>
              <DemoBox label="First" />
              <DemoBox label="Second" />
              <DemoBox label="Third" />
            </Stack>
            
            <Text>Horizontal Stack with Separator</Text>
            <Stack direction="horizontal" gap={gapSize} separator>
              <DemoBox label="A" />
              <DemoBox label="B" />
              <DemoBox label="C" />
              <DemoBox label="D" />
            </Stack>
            
            <Text>Z-Index Stacking</Text>
            <Box relative height={8}>
              <Box absolute top={0} left={0} zIndex={1}>
                <DemoBox label="Back" />
              </Box>
              <Box absolute top={2} left={4} zIndex={2}>
                <DemoBox label="Middle" />
              </Box>
              <Box absolute top={4} left={8} zIndex={3}>
                <DemoBox label="Front" />
              </Box>
            </Box>
          </Box>
        </LabeledBox>
      )}
      
      {showPattern('spacer') && (
        <LabeledBox label="Spacers & Dividers">
          <Box vertical gap={2}>
            <Text>Spacer Example</Text>
            <Box horizontal>
              <DemoBox label="Left" />
              <Spacer />
              <DemoBox label="Right" />
            </Box>
            
            <Text>Multiple Items with Spacer</Text>
            <Box horizontal>
              <DemoBox label="1" />
              <DemoBox label="2" />
              <Spacer />
              <DemoBox label="3" />
              <DemoBox label="4" />
            </Box>
            
            <Text>Dividers</Text>
            <Box vertical gap={1}>
              <Text>Horizontal Divider</Text>
              <Divider />
              <Text>Content Below</Text>
            </Box>
            
            <Box horizontal gap={2}>
              <Text>Left</Text>
              <Divider vertical />
              <Text>Center</Text>
              <Divider vertical />
              <Text>Right</Text>
            </Box>
          </Box>
        </LabeledBox>
      )}
      
      {showPattern('columns') && (
        <LabeledBox label="Column Layouts">
          <Box vertical gap={2}>
            <Text>Equal Columns</Text>
            <Columns count={3} gap={gapSize}>
              <DemoBox label="Column 1" height={5} />
              <DemoBox label="Column 2" height={5} />
              <DemoBox label="Column 3" height={5} />
            </Columns>
            
            <Text>Proportional Columns</Text>
            <Columns widths={[1, 2, 1]} gap={gapSize}>
              <DemoBox label="25%" height={4} />
              <DemoBox label="50%" height={4} />
              <DemoBox label="25%" height={4} />
            </Columns>
            
            <Text>Mixed Content Columns</Text>
            <Columns count={2} gap={gapSize}>
              <Box vertical gap={1}>
                <DemoBox label="Left Top" />
                <DemoBox label="Left Middle" />
                <DemoBox label="Left Bottom" />
              </Box>
              <Box vertical gap={1}>
                <DemoBox label="Right Content" height={9} />
              </Box>
            </Columns>
          </Box>
        </LabeledBox>
      )}
      
      {showPattern('container') && (
        <LabeledBox label="Container & Constraints">
          <Box vertical gap={2}>
            <Text>Fixed Width Container</Text>
            <Container maxWidth={50}>
              <DemoBox label="Max width: 50" />
            </Container>
            
            <Text>Centered Container</Text>
            <Container maxWidth={40} center>
              <DemoBox label="Centered" />
            </Container>
            
            <Text>Scrollable Area</Text>
            <ScrollArea height={6}>
              {Array.from({ length: 10 }, (_, i) => (
                <DemoBox key={i} label={`Scrollable Item ${i + 1}`} />
              ))}
            </ScrollArea>
            
            <Text>Horizontal Scroll</Text>
            <ScrollArea horizontal width={40}>
              <Box horizontal gap={2}>
                {Array.from({ length: 10 }, (_, i) => (
                  <DemoBox key={i} label={`H-${i + 1}`} width={15} />
                ))}
              </Box>
            </ScrollArea>
          </Box>
        </LabeledBox>
      )}
      
      {showPattern('responsive') && flags.responsive && (
        <LabeledBox label="Responsive Layouts">
          <Box vertical gap={2}>
            <Text>Adaptive Layout (changes based on width)</Text>
            <Box horizontal gap={2}>
              <Button onClick={() => state.containerWidth = Math.max(40, state.containerWidth - 10)}>
                Narrower
              </Button>
              <Text>Width: {state.containerWidth}</Text>
              <Button onClick={() => state.containerWidth = Math.min(120, state.containerWidth + 10)}>
                Wider
              </Button>
            </Box>
            
            <Container width={state.containerWidth}>
              <Box 
                horizontal={state.containerWidth > 60}
                vertical={state.containerWidth <= 60}
                gap={gapSize}
              >
                <DemoBox label="Responsive 1" />
                <DemoBox label="Responsive 2" />
                <DemoBox label="Responsive 3" />
              </Box>
            </Container>
          </Box>
        </LabeledBox>
      )}
      
      {flags.debug && (
        <LabeledBox label="Layout Debug Info">
          <Box vertical gap={1}>
            <Text>Gap Size: {gapSize}</Text>
            <Text>Padding Size: {paddingSize}</Text>
            <Text>Container Width: {state.containerWidth}</Text>
            <Text>Grid Columns: {state.gridColumns}</Text>
          </Box>
        </LabeledBox>
      )}
    </Box>
  )
}