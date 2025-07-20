/**
 * Stat Card Component
 * 
 * Reusable card for displaying statistics.
 */

import { Box, Text } from '@tuix/components'

interface StatCardProps {
  label: string
  value: string | number
  variant?: 'default' | 'success' | 'warning' | 'error'
}

export function StatCard({ label, value, variant = 'default' }: StatCardProps) {
  return (
    <Box style={`border padding:8 ${variant}`} minWidth={20}>
      <Text style="muted">{label}</Text>
      <Text style="title">{value}</Text>
    </Box>
  )
}