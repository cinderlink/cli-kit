/**
 * Snippet Definitions
 * 
 * Reusable UI snippets demonstrating Svelte 5 patterns.
 * Note: Without a compiler, these are implemented as regular components.
 */

import { Box, Text, Badge, Spinner } from '@tuix/components'
import { If } from '@tuix/cli'

// Status indicator snippet
export function StatusIndicator({ status }: { status: string }) {
  const colors = {
    running: 'success',
    stopped: 'muted',
    error: 'error',
    pending: 'warning'
  }
  
  return (
    <Badge variant={colors[status] || 'default'}>
      {status}
    </Badge>
  )
}

// Loading state snippet
export function LoadingState({ isLoading, children }: { isLoading: boolean, children: any }) {
  return (
    <If condition={isLoading}>
      <Box horizontal gap={2}>
        <Spinner />
        <Text>Loading...</Text>
      </Box>
      <Else>
        {children}
      </Else>
    </If>
  )
}

// Error message snippet
export function ErrorMessage({ error }: { error: string | null }) {
  return (
    <If condition={error}>
      <Box style="background:error color:white padding:8 rounded">
        <Text>⚠️ {error}</Text>
      </Box>
    </If>
  )
}

// Empty state snippet
export function EmptyState({ message = 'No data available' }: { message?: string }) {
  return (
    <Box style="center padding:16">
      <Text style="muted">{message}</Text>
    </Box>
  )
}

// Key-value display snippet
export function KeyValue({ label, value }: { label: string, value: any }) {
  return (
    <Box horizontal gap={2}>
      <Text style="muted">{label}:</Text>
      <Text>{value}</Text>
    </Box>
  )
}

// Progress indicator snippet
export function ProgressIndicator({ label, current, total }: { label: string, current: number, total: number }) {
  const percentage = Math.round((current / total) * 100)
  
  return (
    <Box vertical gap={1}>
      <Box horizontal justify="space-between">
        <Text>{label}</Text>
        <Text>{percentage}%</Text>
      </Box>
      <ProgressBar value={current} max={total} />
    </Box>
  )
}