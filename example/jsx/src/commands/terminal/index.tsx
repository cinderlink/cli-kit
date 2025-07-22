import { Box, Text, TextInput } from 'tuix/components'
import { $state, $derived, onMount } from 'tuix/runes'
import type { CommandHandler } from 'tuix/cli'

interface TerminalLine {
  id: string
  type: 'command' | 'output' | 'error'
  content: string
  timestamp: Date
}

export const TerminalCommand: CommandHandler = ({ options }) => {
  const { shell, history } = options as { shell: string; history: number }
  
  const lines = $state<TerminalLine[]>([])
  const currentCommand = $state<string>('')
  const commandHistory = $state<string[]>([])
  const historyIndex = $state<number>(-1)
  const workingDirectory = $state<string>('~')
  
  const promptText = $derived(() => 
    `${workingDirectory()} $ `
  )
  
  const addLine = (type: TerminalLine['type'], content: string) => {
    const newLine: TerminalLine = {
      id: Date.now().toString(),
      type,
      content,
      timestamp: new Date()
    }
    
    lines.$update(currentLines => {
      const updated = [...currentLines, newLine]
      return updated.slice(-history) // Keep only last N lines
    })
  }
  
  const executeCommand = (cmd: string) => {
    if (!cmd.trim()) return
    
    // Add command to history
    commandHistory.$update(hist => [...hist, cmd].slice(-50))
    addLine('command', `${promptText()}${cmd}`)
    
    // Simple command simulation
    const parts = cmd.trim().split(' ')
    const command = parts[0].toLowerCase()
    const args = parts.slice(1)
    
    switch (command) {
      case 'ls':
        addLine('output', 'Documents  Downloads  Pictures  README.md  package.json')
        break
        
      case 'pwd':
        addLine('output', workingDirectory())
        break
        
      case 'cd':
        const newDir = args[0] || '~'
        workingDirectory.$set(newDir === '..' ? '~' : newDir)
        break
        
      case 'echo':
        addLine('output', args.join(' '))
        break
        
      case 'date':
        addLine('output', new Date().toString())
        break
        
      case 'whoami':
        addLine('output', 'exemplar-user')
        break
        
      case 'clear':
        lines.$set([])
        break
        
      case 'help':
        addLine('output', 'Available commands: ls, pwd, cd, echo, date, whoami, clear, help, exit')
        break
        
      case 'exit':
        addLine('output', 'Terminal session ended')
        break
        
      case 'cat':
        if (args[0]) {
          if (args[0] === 'package.json') {
            addLine('output', '{\n  "name": "exemplar-app",\n  "version": "1.0.0"\n}')
          } else {
            addLine('output', `File contents of ${args[0]}...`)
          }
        } else {
          addLine('error', 'cat: missing file operand')
        }
        break
        
      case 'ps':
        addLine('output', 'PID  COMMAND\n1234 exemplar-terminal\n5678 node-process\n9012 system-daemon')
        break
        
      case 'uname':
        if (args[0] === '-a') {
          addLine('output', 'Exemplar OS 1.0.0 terminal simulator')
        } else {
          addLine('output', 'Exemplar')
        }
        break
        
      default:
        addLine('error', `Command not found: ${command}`)
        addLine('output', 'Type "help" for available commands')
    }
    
    currentCommand.$set('')
    historyIndex.$set(-1)
  }
  
  const handleKeyDown = (key: string) => {
    switch (key) {
      case 'Enter':
        executeCommand(currentCommand())
        break
        
      case 'ArrowUp':
        if (commandHistory().length > 0) {
          const newIndex = Math.min(historyIndex() + 1, commandHistory().length - 1)
          historyIndex.$set(newIndex)
          const cmd = commandHistory()[commandHistory().length - 1 - newIndex]
          currentCommand.$set(cmd || '')
        }
        break
        
      case 'ArrowDown':
        if (historyIndex() > 0) {
          const newIndex = historyIndex() - 1
          historyIndex.$set(newIndex)
          const cmd = commandHistory()[commandHistory().length - 1 - newIndex]
          currentCommand.$set(cmd || '')
        } else {
          historyIndex.$set(-1)
          currentCommand.$set('')
        }
        break
        
      case 'Tab':
        // Simple autocomplete
        const partial = currentCommand()
        const commands = ['ls', 'pwd', 'cd', 'echo', 'date', 'whoami', 'clear', 'help', 'exit', 'cat', 'ps', 'uname']
        const matches = commands.filter(cmd => cmd.startsWith(partial))
        
        if (matches.length === 1) {
          currentCommand.$set(matches[0] + ' ')
        } else if (matches.length > 1) {
          addLine('output', matches.join('  '))
        }
        break
    }
  }
  
  onMount(() => {
    addLine('output', `Welcome to Exemplar Terminal Emulator`)
    addLine('output', `Shell: ${shell}`)
    addLine('output', `History buffer: ${history} lines`)
    addLine('output', `Type "help" for available commands`)
    addLine('output', '')
  })
  
  return (
    <Box
      direction="column"
      width="100%"
      height="100%"
      padding={1}
      borderStyle="rounded"
      borderColor="green"
      backgroundColor="black"
    >
      <Box direction="row" justify="space-between" marginBottom={1}>
        <Text bold color="green">
          Terminal Emulator
        </Text>
        <Text dim color="green">
          {shell} | History: {commandHistory().length}/{history}
        </Text>
      </Box>
      
      <Box borderStyle="single" color="green" marginBottom={1} />
      
      <Box direction="column" flex={1} overflow="auto">
        {lines().map(line => {
          const color = line.type === 'error' ? 'red' : 
                      line.type === 'command' ? 'cyan' : 'white'
          
          return (
            <Text key={line.id} color={color} fontFamily="monospace">
              {line.content}
            </Text>
          )
        })}
        
        <Box direction="row">
          <Text color="cyan" fontFamily="monospace">
            {promptText()}
          </Text>
          <TextInput
            value={currentCommand}
            placeholder=""
            backgroundColor="transparent"
            color="white"
            border="none"
            flex={1}
            onKeyDown={handleKeyDown}
            autoFocus
          />
        </Box>
      </Box>
      
      <Box borderStyle="single" color="green" marginY={1} />
      
      <Box direction="row" gap={2}>
        <Text dim color="green">↑↓ History</Text>
        <Text dim color="green">Tab: Autocomplete</Text>
        <Text dim color="green">Ctrl+C: Interrupt</Text>
        <Text dim color="green">Q: Quit</Text>
      </Box>
    </Box>
  )
}