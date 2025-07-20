/**
 * Example Code Display
 * Shows code examples with syntax highlighting
 */

import { Box, Text } from '@tuix/components'
import { style } from '@tuix/styling'
import { $state } from '@tuix/reactivity'

interface ExampleCodeProps {
  code: string
  language?: string
  title?: string
  collapsible?: boolean
}

export function ExampleCode({ code, language = 'tsx', title, collapsible = false }: ExampleCodeProps) {
  const state = $state({ collapsed: collapsible })
  
  return (
    <Box 
      style={style()
        .backgroundColor('black')
        .border('single', 'muted')
        .borderRadius(1)
        .margin(1, 0)
        .build()
      }
    >
      {title && (
        <Box 
          style={style()
            .padding(1)
            .borderBottom('single', 'muted')
            .backgroundColor('gray.900')
            .build()
          }
          onClick={collapsible ? () => state.collapsed = !state.collapsed : undefined}
          cursor={collapsible ? 'pointer' : 'default'}
        >
          <Text style="muted">
            {collapsible && (state.collapsed ? '▶ ' : '▼ ')}
            {title}
            {language && ` (${language})`}
          </Text>
        </Box>
      )}
      
      {!state.collapsed && (
        <Box padding={2}>
          <Text style="code" color="green">
            {code}
          </Text>
        </Box>
      )}
    </Box>
  )
}