// Test if the IPC implementation works
console.log('Testing IPC implementation...')

// Simple test to see if socket connection works
import { $ } from 'bun'

const socketPath = '.tuix/sockets/test.sock'

// Ensure directory exists
await $`mkdir -p .tuix/sockets`.quiet()

// Remove old socket if exists
await $`rm -f ${socketPath}`.quiet()

console.log('Creating server...')
const server = Bun.listen({
  unix: socketPath,
  socket: {
    open(socket) {
      console.log('Server: Client connected')
      socket.write('Hello from server')
    },
    data(socket, data) {
      console.log('Server received:', data.toString())
      socket.write('pong')
    },
    close(socket) {
      console.log('Server: Client disconnected')
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
        socket.write('ping')
      },
      data(socket, data) {
        console.log('Client received:', data.toString())
        socket.end()
        server.stop()
        process.exit(0)
      }
    }
  })
}, 100)
