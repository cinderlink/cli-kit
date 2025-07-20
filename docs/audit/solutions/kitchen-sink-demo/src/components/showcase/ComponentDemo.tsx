/**
 * Component Demo Wrapper
 * Provides consistent styling for component demonstrations
 */

import { Box, Text, LabeledBox } from '@tuix/components'
import { style } from '@tuix/styling'

interface ComponentDemoProps {
  title: string
  description?: string
  children: any
  code?: string
}

export function ComponentDemo({ title, description, children, code }: ComponentDemoProps) {
  return (
    <LabeledBox 
      label={title}
      style={style()
        .padding(2)
        .margin(1, 0)
        .border('single', 'muted')
        .build()
      }
    >
      {description && (
        <Text style="muted" marginBottom={1}>
          {description}
        </Text>
      )}
      
      <Box marginBottom={code ? 2 : 0}>
        {children}
      </Box>
      
      {code && (
        <Box 
          style={style()
            .backgroundColor('black')
            .padding(1)
            .border('single', 'muted')
            .build()
          }
        >
          <Text style="code">{code}</Text>
        </Box>
      )}
    </LabeledBox>
  )
}