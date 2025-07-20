/**
 * Process Starter Component
 * 
 * Demonstrates Spawn component and streaming output
 */

import { Box, Text, Button } from '@tuix/components'
import { Spawn, StreamBox } from '@tuix/components/streams'
import { useProcessManager } from '@tuix/plugin-process-manager'
import { useLogger } from '@tuix/plugin-logger'
import { $state } from '@tuix/reactivity'
import { style } from '@tuix/styling'

interface Props {
  command: string
  watch?: boolean
  envFile?: string
}

export function ProcessStarter({ command, watch, envFile }: Props) {
  const pm = useProcessManager()
  const logger = useLogger()
  const [processId, setProcessId] = $state<string | null>(null)
  
  return (
    <Box>
      <Text bold marginBottom={2}>Starting process: {command}</Text>
      
      <Spawn 
        command={command}
        env={envFile}
        restart={watch}
        onStart={(pid) => {
          setProcessId(pid)
          logger.info(`Process started with PID ${pid}`)
        }}
        onExit={(code) => {
          logger[code === 0 ? 'info' : 'error'](
            `Process exited with code ${code}`
          )
          setProcessId(null)
        }}
      >
        {({ stdout, stderr, status }) => (
          <Box>
            <StatusIndicator status={status} />
            
            <StreamBox 
              title="Output" 
              stream={stdout}
              maxHeight={20}
              theme="monokai"
            />
            
            {stderr && (
              <StreamBox 
                title="Errors" 
                stream={stderr}
                style={style().color('red')}
                maxHeight={10}
              />
            )}
          </Box>
        )}
      </Spawn>
      
      <ProcessControls 
        processId={processId}
        onRestart={() => pm.restart(processId!)}
        onStop={() => pm.stop(processId!)}
      />
    </Box>
  )
}

// Sub-components for cleaner code
function StatusIndicator({ status }: { status: string }) {
  return (
    <Box border="single" padding={1} marginBottom={1}>
      <Text color="gray">Status: </Text>
      <Text color={status === 'running' ? 'green' : 'yellow'}>
        {status}
      </Text>
    </Box>
  )
}

function ProcessControls({ processId, onRestart, onStop }: any) {
  if (!processId) return null
  
  return (
    <Box marginTop={2} style={style().display('flex').gap(1)}>
      <Button variant="primary" onClick={onRestart}>
        Restart
      </Button>
      <Button variant="danger" onClick={onStop}>
        Stop
      </Button>
    </Box>
  )
}