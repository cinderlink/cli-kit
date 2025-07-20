/**
 * Layout Showcase View
 * 
 * Demonstrates layout components and patterns.
 */

import { Box, Text, LabeledBox, Grid, Flexbox, Spacer } from '@tuix/components'

export function LayoutShowcaseView() {
  return (
    <Box vertical gap={3}>
      <Text style="title">Layout Components Showcase</Text>
      
      <LabeledBox label="Box Layout">
        <Box vertical gap={2}>
          <Box horizontal gap={2}>
            <Box style="border padding">Box 1</Box>
            <Box style="border padding">Box 2</Box>
            <Box style="border padding">Box 3</Box>
          </Box>
          
          <Box horizontal>
            <Box flex={1} style="border padding">Flex: 1</Box>
            <Box flex={2} style="border padding">Flex: 2</Box>
            <Box flex={1} style="border padding">Flex: 1</Box>
          </Box>
        </Box>
      </LabeledBox>
      
      <LabeledBox label="Grid Layout">
        <Grid columns={3} gap={2}>
          <Box style="border padding">Grid 1</Box>
          <Box style="border padding">Grid 2</Box>
          <Box style="border padding">Grid 3</Box>
          <Box style="border padding">Grid 4</Box>
          <Box style="border padding">Grid 5</Box>
          <Box style="border padding">Grid 6</Box>
        </Grid>
      </LabeledBox>
      
      <LabeledBox label="Flexbox Advanced">
        <Flexbox direction="column" gap={2}>
          <Flexbox justify="space-between">
            <Text>Left</Text>
            <Text>Center</Text>
            <Text>Right</Text>
          </Flexbox>
          
          <Flexbox align="center" gap={2}>
            <Box style="border padding" height={3}>Tall</Box>
            <Box style="border padding">Normal</Box>
            <Box style="border padding" height={3}>Tall</Box>
          </Flexbox>
          
          <Flexbox wrap="wrap" gap={1}>
            {Array.from({ length: 10 }, (_, i) => (
              <Box key={i} style="border padding">Item {i + 1}</Box>
            ))}
          </Flexbox>
        </Flexbox>
      </LabeledBox>
      
      <LabeledBox label="Spacer Component">
        <Box horizontal>
          <Text>Left content</Text>
          <Spacer />
          <Text>Right content</Text>
        </Box>
      </LabeledBox>
      
      <LabeledBox label="Responsive Layout">
        <Box vertical gap={2}>
          <Text>Container adapts to terminal width</Text>
          <Box horizontal wrap="wrap" gap={2}>
            <Box minWidth={20} style="border padding">Min width: 20</Box>
            <Box minWidth={20} style="border padding">Min width: 20</Box>
            <Box minWidth={20} style="border padding">Min width: 20</Box>
          </Box>
        </Box>
      </LabeledBox>
    </Box>
  )
}