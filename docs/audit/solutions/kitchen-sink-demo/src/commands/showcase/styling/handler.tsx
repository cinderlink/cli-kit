/**
 * Styling Showcase Command Handler
 * 
 * Demonstrates all styling capabilities with Svelte 5 runes integration.
 */

import { 
  Box, Text, LabeledBox, Button, Panel, Badge,
  Gradient, Shadow, Border, Theme
} from '@tuix/components'
import { $state, $effect, $derived } from '@tuix/reactivity'
import type { StylingShowcaseArgs, StylingShowcaseFlags, StylingShowcaseOptions } from './schema'

interface StylingShowcaseHandlerProps {
  args: StylingShowcaseArgs
  flags: StylingShowcaseFlags
  options: StylingShowcaseOptions
}

export function StylingShowcaseHandler({ args, flags, options }: StylingShowcaseHandlerProps) {
  // Reactive state for styling demos
  const state = $state({
    selectedColor: 'blue',
    borderStyle: 'single' as 'single' | 'double' | 'rounded' | 'thick',
    shadowIntensity: 'medium' as 'light' | 'medium' | 'heavy',
    gradientAngle: 45,
    animationFrame: 0,
    customHue: 180,
    customSaturation: 50,
    customLightness: 50
  })

  // Color palette based on theme
  const colorPalette = $derived(() => {
    switch (options.theme) {
      case 'neon':
        return ['#FF006E', '#FB5607', '#FFBE0B', '#8338EC', '#3A86FF']
      case 'pastel':
        return ['#FFB5E8', '#FF9CEE', '#FFCCF9', '#FCC2FF', '#F6A6FF']
      case 'monochrome':
        return ['#000000', '#333333', '#666666', '#999999', '#CCCCCC']
      case 'light':
        return ['#2E86AB', '#A23B72', '#F18F01', '#C73E1D', '#6A994E']
      default: // dark
        return ['#1E88E5', '#D32F2F', '#388E3C', '#F57C00', '#7B1FA2']
    }
  })

  // Animation effect
  $effect(() => {
    if (!flags.animated) return
    
    const timer = setInterval(() => {
      state.animationFrame = (state.animationFrame + 1) % 360
      if (flags.interactive) {
        state.gradientAngle = state.animationFrame
      }
    }, 50)
    
    return () => clearInterval(timer)
  })

  // Filter to specific category if requested
  const showAll = !args.category
  const showCategory = (name: string) => showAll || args.category === name

  // Style box component
  const StyleBox = ({ 
    style, 
    label, 
    ...props 
  }: { 
    style?: any, 
    label: string,
    [key: string]: any 
  }) => (
    <Box 
      padding={2} 
      style={style}
      {...props}
    >
      <Text>{label}</Text>
    </Box>
  )

  return (
    <Box vertical gap={3} className={`theme-${options.theme}`}>
      <Box>
        <Text style="title">Styling Showcase</Text>
        <Text style="muted">
          Theme: {options.theme} | Complexity: {options.complexity} | Animation: {flags.animated ? 'ON' : 'OFF'}
        </Text>
      </Box>
      
      {showCategory('colors') && (
        <LabeledBox label="Color Systems">
          <Box vertical gap={2}>
            <Text>Theme Colors</Text>
            <Box horizontal gap={2} wrap>
              {colorPalette.map((color, i) => (
                <Box
                  key={i}
                  width={10}
                  height={4}
                  style={{ background: color }}
                  border="single"
                >
                  <Text style="inverse">{color}</Text>
                </Box>
              ))}
            </Box>
            
            <Text>Semantic Colors</Text>
            <Box horizontal gap={2}>
              <StyleBox style="primary" label="Primary" />
              <StyleBox style="secondary" label="Secondary" />
              <StyleBox style="success" label="Success" />
              <StyleBox style="warning" label="Warning" />
              <StyleBox style="error" label="Error" />
              <StyleBox style="info" label="Info" />
            </Box>
            
            {options.complexity !== 'basic' && (
              <>
                <Text>Text Colors</Text>
                <Box vertical gap={1}>
                  <Text color="red">Red Text</Text>
                  <Text color="green">Green Text</Text>
                  <Text color="blue">Blue Text</Text>
                  <Text color="yellow">Yellow Text</Text>
                  <Text color="magenta">Magenta Text</Text>
                  <Text color="cyan">Cyan Text</Text>
                </Box>
              </>
            )}
            
            {flags.interactive && (
              <>
                <Text>Custom HSL Color</Text>
                <Box vertical gap={1}>
                  <Box horizontal gap={2}>
                    <Text>Hue: {state.customHue}</Text>
                    <Button onClick={() => state.customHue = (state.customHue + 30) % 360}>
                      Change
                    </Button>
                  </Box>
                  <Box
                    width={30}
                    height={4}
                    style={{
                      background: `hsl(${state.customHue}, ${state.customSaturation}%, ${state.customLightness}%)`
                    }}
                    border="single"
                  />
                </Box>
              </>
            )}
          </Box>
        </LabeledBox>
      )}
      
      {showCategory('borders') && (
        <LabeledBox label="Borders & Outlines">
          <Box vertical gap={2}>
            <Text>Border Styles</Text>
            <Box horizontal gap={2} wrap>
              <StyleBox border="single" label="Single" />
              <StyleBox border="double" label="Double" />
              <StyleBox border="rounded" label="Rounded" />
              <StyleBox border="thick" label="Thick" />
              <StyleBox border="dashed" label="Dashed" />
              <StyleBox border="dotted" label="Dotted" />
            </Box>
            
            {options.complexity !== 'basic' && (
              <>
                <Text>Border Colors</Text>
                <Box horizontal gap={2}>
                  <StyleBox border="single" borderColor="red" label="Red" />
                  <StyleBox border="single" borderColor="green" label="Green" />
                  <StyleBox border="single" borderColor="blue" label="Blue" />
                  <StyleBox border="single" borderColor="yellow" label="Yellow" />
                </Box>
                
                <Text>Mixed Borders</Text>
                <Box horizontal gap={2}>
                  <StyleBox 
                    borderTop="double" 
                    borderBottom="single" 
                    label="Mixed 1" 
                  />
                  <StyleBox 
                    borderLeft="thick" 
                    borderRight="thick" 
                    label="Mixed 2" 
                  />
                  <StyleBox 
                    border="rounded"
                    borderColor="gradient"
                    label="Gradient" 
                  />
                </Box>
              </>
            )}
          </Box>
        </LabeledBox>
      )}
      
      {showCategory('gradients') && flags.gradients && (
        <LabeledBox label="Gradients">
          <Box vertical gap={2}>
            <Text>Linear Gradients</Text>
            <Box horizontal gap={2} wrap>
              <Gradient
                type="linear"
                angle={0}
                colors={['red', 'yellow']}
                width={15}
                height={4}
              >
                <Text>Horizontal</Text>
              </Gradient>
              
              <Gradient
                type="linear"
                angle={90}
                colors={['blue', 'green']}
                width={15}
                height={4}
              >
                <Text>Vertical</Text>
              </Gradient>
              
              <Gradient
                type="linear"
                angle={state.gradientAngle}
                colors={['purple', 'pink']}
                width={15}
                height={4}
              >
                <Text>{state.gradientAngle}°</Text>
              </Gradient>
            </Box>
            
            {options.complexity !== 'basic' && (
              <>
                <Text>Multi-Color Gradients</Text>
                <Gradient
                  type="linear"
                  angle={45}
                  colors={colorPalette}
                  width={60}
                  height={4}
                >
                  <Text>Rainbow</Text>
                </Gradient>
                
                <Text>Radial Gradients</Text>
                <Box horizontal gap={2}>
                  <Gradient
                    type="radial"
                    colors={['white', 'black']}
                    width={20}
                    height={6}
                  >
                    <Text>Center</Text>
                  </Gradient>
                  
                  <Gradient
                    type="radial"
                    position="top-left"
                    colors={['yellow', 'orange', 'red']}
                    width={20}
                    height={6}
                  >
                    <Text>Corner</Text>
                  </Gradient>
                </Box>
              </>
            )}
          </Box>
        </LabeledBox>
      )}
      
      {showCategory('shadows') && flags.shadows && (
        <LabeledBox label="Shadows & Effects">
          <Box vertical gap={2}>
            <Text>Shadow Depths</Text>
            <Box horizontal gap={3}>
              <Shadow depth="light">
                <StyleBox label="Light" />
              </Shadow>
              
              <Shadow depth="medium">
                <StyleBox label="Medium" />
              </Shadow>
              
              <Shadow depth="heavy">
                <StyleBox label="Heavy" />
              </Shadow>
            </Box>
            
            {options.complexity !== 'basic' && (
              <>
                <Text>Colored Shadows</Text>
                <Box horizontal gap={3}>
                  <Shadow color="blue" depth="medium">
                    <StyleBox label="Blue" />
                  </Shadow>
                  
                  <Shadow color="red" depth="medium">
                    <StyleBox label="Red" />
                  </Shadow>
                  
                  <Shadow color="green" depth="medium">
                    <StyleBox label="Green" />
                  </Shadow>
                </Box>
                
                <Text>Glow Effects</Text>
                <Box horizontal gap={3}>
                  <Box glow="blue" padding={2}>
                    <Text>Blue Glow</Text>
                  </Box>
                  
                  <Box glow="red" padding={2}>
                    <Text>Red Glow</Text>
                  </Box>
                  
                  <Box glow="rainbow" padding={2}>
                    <Text>Rainbow</Text>
                  </Box>
                </Box>
              </>
            )}
          </Box>
        </LabeledBox>
      )}
      
      {showCategory('animations') && flags.animated && (
        <LabeledBox label="Animations">
          <Box vertical gap={2}>
            <Text>Animated Elements</Text>
            <Box horizontal gap={2}>
              <Box 
                padding={2}
                border="single"
                style={{
                  transform: `rotate(${state.animationFrame}deg)`
                }}
              >
                <Text>Rotating</Text>
              </Box>
              
              <Box 
                padding={2}
                border="single"
                style={{
                  opacity: Math.abs(Math.sin(state.animationFrame * 0.01))
                }}
              >
                <Text>Fading</Text>
              </Box>
              
              <Box 
                padding={2}
                border="single"
                style={{
                  transform: `scale(${1 + Math.sin(state.animationFrame * 0.02) * 0.2})`
                }}
              >
                <Text>Pulsing</Text>
              </Box>
            </Box>
            
            {options.complexity === 'advanced' && (
              <>
                <Text>Complex Animations</Text>
                <Box 
                  width={40}
                  height={8}
                  border="single"
                  position="relative"
                >
                  <Box
                    position="absolute"
                    width={4}
                    height={2}
                    style={{
                      background: 'blue',
                      left: `${20 + Math.sin(state.animationFrame * 0.05) * 15}`,
                      top: `${3 + Math.cos(state.animationFrame * 0.05) * 2}`
                    }}
                  />
                </Box>
              </>
            )}
          </Box>
        </LabeledBox>
      )}
      
      {showCategory('themes') && options.complexity !== 'basic' && (
        <LabeledBox label="Theme Variations">
          <Box vertical gap={2}>
            <Text>Component Theming</Text>
            <Box horizontal gap={2}>
              <Theme name="ocean">
                <Panel title="Ocean Theme">
                  <Text>Blue and aqua colors</Text>
                  <Button>Ocean Button</Button>
                </Panel>
              </Theme>
              
              <Theme name="forest">
                <Panel title="Forest Theme">
                  <Text>Green and brown colors</Text>
                  <Button>Forest Button</Button>
                </Panel>
              </Theme>
            </Box>
          </Box>
        </LabeledBox>
      )}
      
      {flags.interactive && (
        <LabeledBox label="Interactive Style Controls">
          <Box vertical gap={2}>
            <Box horizontal gap={2}>
              <Button onClick={() => state.borderStyle = 'single'}>Single Border</Button>
              <Button onClick={() => state.borderStyle = 'double'}>Double Border</Button>
              <Button onClick={() => state.borderStyle = 'rounded'}>Rounded Border</Button>
            </Box>
            
            <Box border={state.borderStyle} padding={2}>
              <Text>Dynamic Border Style: {state.borderStyle}</Text>
            </Box>
          </Box>
        </LabeledBox>
      )}
    </Box>
  )
}