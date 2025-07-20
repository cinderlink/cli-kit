/**
 * Clear Screen Component
 */

import { Box, Text } from '@tuix/components'
import { $effect } from '@tuix/reactivity'

export function ClearScreen() {
  $effect(() => {
    // Would clear terminal in real implementation
    console.clear()
  })
  
  return (
    <Box>
      <Text>Screen cleared!</Text>
    </Box>
  )
}