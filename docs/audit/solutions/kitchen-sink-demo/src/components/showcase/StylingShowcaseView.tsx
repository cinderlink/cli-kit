/**
 * Styling Showcase View
 * 
 * Demonstrates styling system, themes, and animations.
 */

import { Box, Text, LabeledBox, Button } from '@tuix/components'
import { style } from '@tuix/styling'
import { $state, $derived } from '@tuix/reactivity'

export function StylingShowcaseView() {
  const state = $state({
    theme: 'dark',
    animationActive: false
  })

  // Dynamic styles based on theme
  const themeColors = $derived(() => ({
    dark: { bg: '#1a1a1a', text: '#ffffff', accent: '#00ff88' },
    light: { bg: '#ffffff', text: '#000000', accent: '#0088ff' }
  }[state.theme]))

  // Style composition examples
  const gradientStyle = style()
    .background('linear-gradient(45deg, #ff6b6b, #4ecdc4)')
    .padding(16)
    .borderRadius(8)
    .color('#ffffff')

  const animatedStyle = style()
    .transition('all 0.3s ease')
    .transform(state.animationActive ? 'scale(1.1)' : 'scale(1)')
    .background(themeColors.accent)
    .padding(12)
    .borderRadius(4)

  const shadowStyle = style()
    .boxShadow('0 4px 6px rgba(0,0,0,0.1)')
    .border('1px solid #e0e0e0')
    .padding(16)
    .background('#ffffff')

  return (
    <Box vertical gap={3}>
      <Text style="title">Styling System Showcase</Text>
      
      <LabeledBox label="Theme Switching">
        <Box horizontal gap={2}>
          <Button 
            variant={state.theme === 'dark' ? 'primary' : 'secondary'}
            onClick={() => state.theme = 'dark'}
          >
            Dark Theme
          </Button>
          <Button 
            variant={state.theme === 'light' ? 'primary' : 'secondary'}
            onClick={() => state.theme = 'light'}
          >
            Light Theme
          </Button>
        </Box>
        <Box style={`background:${themeColors.bg} color:${themeColors.text} padding:8`}>
          <Text>Themed content</Text>
        </Box>
      </LabeledBox>
      
      <LabeledBox label="Style Composition">
        <Box vertical gap={2}>
          <Box style={gradientStyle}>
            <Text>Gradient Background</Text>
          </Box>
          
          <Box 
            style={animatedStyle}
            onMouseEnter={() => state.animationActive = true}
            onMouseLeave={() => state.animationActive = false}
          >
            <Text>Hover for animation</Text>
          </Box>
          
          <Box style={shadowStyle}>
            <Text style="dark">Shadow and border</Text>
          </Box>
        </Box>
      </LabeledBox>
      
      <LabeledBox label="Utility Classes">
        <Box vertical gap={2}>
          <Box style="border padding margin">
            <Text>Border + Padding + Margin</Text>
          </Box>
          
          <Box style="background:primary color:white padding rounded">
            <Text>Primary background with rounded corners</Text>
          </Box>
          
          <Box style="gradient padding shadow">
            <Text>Gradient + Shadow</Text>
          </Box>
        </Box>
      </LabeledBox>
      
      <LabeledBox label="Colors">
        <Grid columns={4} gap={2}>
          <Box style="background:primary color:white padding:4 center">Primary</Box>
          <Box style="background:secondary color:white padding:4 center">Secondary</Box>
          <Box style="background:success color:white padding:4 center">Success</Box>
          <Box style="background:error color:white padding:4 center">Error</Box>
          <Box style="background:warning color:black padding:4 center">Warning</Box>
          <Box style="background:info color:white padding:4 center">Info</Box>
          <Box style="background:muted color:white padding:4 center">Muted</Box>
          <Box style="background:accent color:black padding:4 center">Accent</Box>
        </Grid>
      </LabeledBox>
      
      <LabeledBox label="Typography">
        <Box vertical gap={1}>
          <Text style="h1">Heading 1</Text>
          <Text style="h2">Heading 2</Text>
          <Text style="h3">Heading 3</Text>
          <Text style="bold">Bold text</Text>
          <Text style="italic">Italic text</Text>
          <Text style="underline">Underlined text</Text>
          <Text style="strike">Strikethrough text</Text>
        </Box>
      </LabeledBox>
    </Box>
  )
}