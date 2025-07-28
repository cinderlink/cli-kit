/**
 * Output View Component
 *
 * Displays intercepted stdout/stderr output
 */

import { box, vstack, text } from '@core/view'

interface OutputViewProps {
  output: string[]
}

export function OutputView({ output }: OutputViewProps) {
  if (output.length === 0) {
    return text({
      style: { color: 'gray' },
      children: 'No output captured. Process stdout/stderr will appear here.',
    })
  }

  // Join output lines and show last portion
  const fullOutput = output.join('')
  const lines = fullOutput.split('\n')
  const recentLines = lines.slice(-20)

  return vstack({
    children: [
      text({
        style: { color: 'green', bold: true },
        children: `Process Output (${lines.length} lines)`,
      }),
      box({
        style: { marginTop: 1 },
        children: vstack({
          children: recentLines.map((line, i) => {
            const color = line.includes('[STDERR]') ? 'red' : 'white'

            return text({
              key: i,
              style: { color },
              children: line,
            })
          }),
        }),
      }),
    ],
  })
}
