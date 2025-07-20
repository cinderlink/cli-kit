// Test JSON message handling over Unix sockets
console.log('Testing JSON IPC...')

import { $ } from 'bun'

const socketPath = '.tuix/sockets/test-json.sock'
await $`mkdir -p .tuix/sockets`.quiet()
await $`rm -f ${socketPath}`.quiet()

console.log('Creating server...')
const server = Bun.listen({
  unix: socketPath,
  socket: {
    open(socket) {
      console.log('Server: Client connected')
      // Store connection reference
      ;(socket as any)._buffer = ''
    },
    data(socket, data) {
      const text = new TextDecoder().decode(data)
      console.log('Server raw data:', text)
      
      // Accumulate data
      ;(socket as any)._buffer += text
      
      // Try to parse JSON
      try {
        const message = JSON.parse((socket as any)._buffer)
        console.log('Server parsed message:', message)
        
        // Send response
        const response = JSON.stringify({ type: 'pong', requestId: message.requestId })
        console.log('Server sending:', response)
        socket.write(response)
        
        // Clear buffer
        ;(socket as any)._buffer = ''
      } catch (e) {
        console.log('Server: Not complete JSON yet')
      }
    }
  }
})

console.log('Server listening on', socketPath)

// Test client
setTimeout(async () => {
  console.log('Connecting client...')
  const client = await Bun.connect({
    unix: socketPath,
    socket: {
      open(socket) {
        console.log('Client: Connected')
        const message = JSON.stringify({ type: 'ping', requestId: '123' })
        console.log('Client sending:', message)
        socket.write(message)
      },
      data(socket, data) {
        const text = new TextDecoder().decode(data)
        console.log('Client received raw:', text)
        try {
          const response = JSON.parse(text)
          console.log('Client parsed response:', response)
        } catch (e) {
          console.log('Client: Failed to parse response')
        }
        socket.end()
        server.stop()
        process.exit(0)
      }
    }
  })
}, 100)