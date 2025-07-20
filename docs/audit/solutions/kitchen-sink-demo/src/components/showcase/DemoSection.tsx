/**
 * Demo Section Component
 * Groups related demos together
 */

import { Box, Text, Divider } from '@tuix/components'
import { style } from '@tuix/styling'

interface DemoSectionProps {
  title: string
  children: any
}

export function DemoSection({ title, children }: DemoSectionProps) {
  return (
    <Box marginY={2}>
      <Text 
        style={style()
          .color('primary')
          .fontSize('large')
          .fontWeight('bold')
          .build()
        }
        marginBottom={1}
      >
        {title}
      </Text>
      
      <Divider style="double" color="primary" marginBottom={2} />
      
      {children}
    </Box>
  )
}