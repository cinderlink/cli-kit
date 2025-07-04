#!/usr/bin/env bun

import { Effect, Stream, Schedule } from "effect"
import { 
  runApp,
  View,
  type Component,
  type Cmd,
  type AppOptions,
  type AppServices,
  type AppEvent,
  type KeyEvent,
  type MouseEvent
} from "../src/index.ts"
import { LiveServices } from "../src/services/impl/index.ts"
import { style, Colors, Borders } from "../src/styling/index.ts"
import { viewport, createTextContent, createGridContent, createNumberedContent } from "../src/components/Viewport.ts"
import type { ViewportModel, ViewportMsg } from "../src/components/Viewport.ts"

// Model containing multiple viewport examples
interface AppModel {
  // Different viewport examples
  textViewer: ViewportModel
  logViewer: ViewportModel
  codeViewer: ViewportModel
  tableViewer: ViewportModel
  activeViewport: 'text' | 'log' | 'code' | 'table'
}

type AppMsg = 
  | { _tag: "ViewportMsg"; viewport: 'text' | 'log' | 'code' | 'table'; msg: ViewportMsg }
  | { _tag: "SwitchViewport"; viewport: 'text' | 'log' | 'code' | 'table' }
  | { _tag: "LoadMoreLogs" }
  | { _tag: "Quit" }

// Create the viewports
const textViewport = viewport({ width: 60, height: 15 })
const logViewport = viewport({ width: 80, height: 12, showScrollbars: true })
const codeViewport = viewport({ width: 70, height: 20, showScrollbars: true })
const tableViewport = viewport({ width: 90, height: 15, showScrollbars: true })

// Sample content
const sampleText = `Welcome to the Viewport Component Demo!

This viewport demonstrates scrollable text content with various features:

• Vertical and horizontal scrolling
• Keyboard navigation (arrow keys, page up/down)
• Mouse wheel support (when implemented)
• Scroll indicators showing position
• Smooth scrolling behavior

You can navigate using:
- Arrow keys or hjkl for directional scrolling
- Page Up/Page Down for larger jumps
- Home/End to jump to top/bottom

This text is intentionally long to demonstrate the scrolling functionality. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.

Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.

And here's some more text to make the content even longer and test the vertical scrolling more thoroughly. You should see scrollbars indicating your current position within the content.`

const sampleCode = `import { Effect, pipe } from "effect"
import type { Component, View, Model } from "@/core/types.ts"
import { text, styledText, vstack, hstack } from "@/core/view.ts"
import { style, Colors } from "@/styling/index.ts"

export interface ButtonConfig {
  readonly label: string
  readonly onClick: () => void
  readonly variant?: 'primary' | 'secondary' | 'danger'
  readonly disabled?: boolean
}

export interface ButtonModel {
  readonly config: ButtonConfig
  readonly isPressed: boolean
  readonly isFocused: boolean
}

export type ButtonMsg =
  | { readonly _tag: "Press" }
  | { readonly _tag: "Release" }
  | { readonly _tag: "Focus" }
  | { readonly _tag: "Blur" }

export const button = (config: ButtonConfig): Component<ButtonModel, ButtonMsg> => ({
  init: Effect.succeed([
    {
      config,
      isPressed: false,
      isFocused: false
    },
    []
  ]),
  
  update(msg: ButtonMsg, model: ButtonModel) {
    switch (msg._tag) {
      case "Press":
        if (!model.config.disabled) {
          model.config.onClick()
          return Effect.succeed([{ ...model, isPressed: true }, []])
        }
        return Effect.succeed([model, []])
        
      case "Release":
        return Effect.succeed([{ ...model, isPressed: false }, []])
        
      case "Focus":
        return Effect.succeed([{ ...model, isFocused: true }, []])
        
      case "Blur":
        return Effect.succeed([{ ...model, isFocused: false }, []])
    }
  },
  
  view(model: ButtonModel): View {
    const { config, isPressed, isFocused } = model
    
    let bgColor = Colors.blue
    let fgColor = Colors.white
    
    if (config.variant === 'danger') {
      bgColor = Colors.red
    } else if (config.variant === 'secondary') {
      bgColor = Colors.gray
    }
    
    if (config.disabled) {
      bgColor = Colors.gray
      fgColor = Colors.gray
    } else if (isPressed) {
      bgColor = Colors.black
    }
    
    const buttonStyle = style().foreground(fgColor).background(bgColor)
    const content = text(\` \${config.label} \`, buttonStyle)
    
    if (isFocused && !config.disabled) {
      return box(content, { 
        border: Borders.Heavy,
        style: style().foreground(Colors.brightBlue)
      })
    }
    
    return content
  }
})`

// Generate sample log data
const generateLogs = (count: number): string[] => {
  const levels = ['INFO', 'WARN', 'ERROR', 'DEBUG']
  const messages = [
    'Server started on port 3000',
    'Connected to database',
    'User authentication successful',
    'Cache miss for key: user_123',
    'Request timeout after 30s',
    'Memory usage above threshold',
    'Scheduled job completed',
    'WebSocket connection established',
    'Rate limit exceeded for IP',
    'Background task failed'
  ]
  
  const logs: string[] = []
  const now = Date.now()
  
  for (let i = 0; i < count; i++) {
    const timestamp = new Date(now - (count - i) * 1000).toISOString()
    const level = levels[Math.floor(Math.random() * levels.length)]
    const message = messages[Math.floor(Math.random() * messages.length)]
    logs.push(`[${timestamp}] [${level}] ${message}`)
  }
  
  return logs
}

// Generate sample table data
const generateTableData = (): string[][] => {
  const headers = ['ID', 'Name', 'Status', 'CPU %', 'Memory', 'Uptime', 'Port']
  const data: string[][] = [headers]
  
  const services = [
    { name: 'api-gateway', status: 'running', cpu: 23.4, mem: '256MB', uptime: '2d 14h', port: 8080 },
    { name: 'auth-service', status: 'running', cpu: 12.1, mem: '128MB', uptime: '2d 14h', port: 8081 },
    { name: 'user-service', status: 'running', cpu: 45.7, mem: '512MB', uptime: '1d 22h', port: 8082 },
    { name: 'payment-service', status: 'stopped', cpu: 0.0, mem: '0MB', uptime: '-', port: 8083 },
    { name: 'notification-service', status: 'running', cpu: 8.3, mem: '64MB', uptime: '2d 14h', port: 8084 },
    { name: 'analytics-service', status: 'running', cpu: 67.2, mem: '1.2GB', uptime: '14h 32m', port: 8085 },
    { name: 'cache-service', status: 'running', cpu: 34.5, mem: '2GB', uptime: '2d 14h', port: 6379 },
    { name: 'search-service', status: 'starting', cpu: 89.1, mem: '768MB', uptime: '2m 14s', port: 9200 },
  ]
  
  services.forEach((service, index) => {
    data.push([
      (index + 1).toString(),
      service.name,
      service.status,
      service.cpu.toFixed(1) + '%',
      service.mem,
      service.uptime,
      service.port.toString()
    ])
  })
  
  return data
}

const viewportDemo: Component<AppModel, AppMsg> = {
  init: Effect.gen(function* () {
    // Initialize content for each viewport
    const textContent = createTextContent(sampleText, 58)
    const logContent = generateLogs(100)
    const codeContent = createNumberedContent(sampleCode.split('\n'))
    const tableContent = createGridContent(generateTableData(), [4, 24, 10, 8, 10, 10, 6])
    
    // Initialize all viewports
    const [textModel] = yield* textViewport.init
    const [logModel] = yield* logViewport.init
    const [codeModel] = yield* codeViewport.init
    const [tableModel] = yield* tableViewport.init
    
    // Set content and focus the text viewport
    const [textWithContent] = yield* textViewport.update(
      { _tag: "SetContent", content: textContent },
      textModel
    )
    const [textFocused] = yield* textViewport.update(
      { _tag: "Focus" },
      textWithContent
    )
    
    const [logWithContent] = yield* logViewport.update(
      { _tag: "SetContent", content: logContent },
      logModel
    )
    
    const [codeWithContent] = yield* codeViewport.update(
      { _tag: "SetContent", content: codeContent },
      codeModel
    )
    
    const [tableWithContent] = yield* tableViewport.update(
      { _tag: "SetContent", content: tableContent },
      tableModel
    )
    
    return [{
      textViewer: textFocused,
      logViewer: logWithContent,
      codeViewer: codeWithContent,
      tableViewer: tableWithContent,
      activeViewport: 'text' as const
    }, []]
  }),

  update: (msg: AppMsg, model: AppModel) => {
    switch (msg._tag) {
      case "ViewportMsg": {
        const viewport = msg.viewport
        const viewportMsg = msg.msg
        
        return Effect.gen(function* () {
          let newModel = { ...model }
          
          switch (viewport) {
            case 'text': {
              const [updated] = yield* textViewport.update(viewportMsg, model.textViewer)
              newModel.textViewer = updated
              break
            }
            case 'log': {
              const [updated] = yield* logViewport.update(viewportMsg, model.logViewer)
              newModel.logViewer = updated
              break
            }
            case 'code': {
              const [updated] = yield* codeViewport.update(viewportMsg, model.codeViewer)
              newModel.codeViewer = updated
              break
            }
            case 'table': {
              const [updated] = yield* tableViewport.update(viewportMsg, model.tableViewer)
              newModel.tableViewer = updated
              break
            }
          }
          
          return [newModel, []] as [AppModel, Cmd<AppMsg>[]]
        })
      }
      
      case "SwitchViewport": {
        return Effect.gen(function* () {
          let newModel = { ...model }
          
          // Blur current viewport
          const currentViewport = model.activeViewport
          switch (currentViewport) {
            case 'text': {
              const [blurred] = yield* textViewport.update({ _tag: "Blur" }, model.textViewer)
              newModel.textViewer = blurred
              break
            }
            case 'log': {
              const [blurred] = yield* logViewport.update({ _tag: "Blur" }, model.logViewer)
              newModel.logViewer = blurred
              break
            }
            case 'code': {
              const [blurred] = yield* codeViewport.update({ _tag: "Blur" }, model.codeViewer)
              newModel.codeViewer = blurred
              break
            }
            case 'table': {
              const [blurred] = yield* tableViewport.update({ _tag: "Blur" }, model.tableViewer)
              newModel.tableViewer = blurred
              break
            }
          }
          
          // Focus new viewport
          switch (msg.viewport) {
            case 'text': {
              const [focused] = yield* textViewport.update({ _tag: "Focus" }, newModel.textViewer)
              newModel.textViewer = focused
              break
            }
            case 'log': {
              const [focused] = yield* logViewport.update({ _tag: "Focus" }, newModel.logViewer)
              newModel.logViewer = focused
              break
            }
            case 'code': {
              const [focused] = yield* codeViewport.update({ _tag: "Focus" }, newModel.codeViewer)
              newModel.codeViewer = focused
              break
            }
            case 'table': {
              const [focused] = yield* tableViewport.update({ _tag: "Focus" }, newModel.tableViewer)
              newModel.tableViewer = focused
              break
            }
          }
          
          newModel.activeViewport = msg.viewport
          return [newModel, []] as [AppModel, Cmd<AppMsg>[]]
        })
      }
      
      case "LoadMoreLogs": {
        return Effect.gen(function* () {
          const newLogs = generateLogs(50)
          const currentContent = model.logViewer.content
          const allContent = [...currentContent, ...newLogs]
          
          const [updated] = yield* logViewport.update(
            { _tag: "SetContent", content: allContent },
            model.logViewer
          )
          
          return [{ ...model, logViewer: updated }, []] as [AppModel, Cmd<AppMsg>[]]
        })
      }
      
      case "Quit": {
        return Effect.succeed([model, [{ _tag: "Exit" as const }]] as [AppModel, Cmd<AppMsg>[]])
      }
    }
  },

  view: (model: AppModel) => {
    const { text, styledText, vstack, hstack } = View
    
    const titleStyle = style().foreground(Colors.brightBlue).bold()
    const helpStyle = style().foreground(Colors.gray)
    const activeStyle = style().foreground(Colors.brightGreen).bold()
    const inactiveStyle = style().foreground(Colors.gray)
    
    return vstack(
      text("📜 Viewport Component Demo", titleStyle),
      text(""),
      
      // Tab bar
      hstack(
        text("[1] Text ", model.activeViewport === 'text' ? activeStyle : inactiveStyle),
        text("[2] Logs ", model.activeViewport === 'log' ? activeStyle : inactiveStyle),
        text("[3] Code ", model.activeViewport === 'code' ? activeStyle : inactiveStyle),
        text("[4] Table ", model.activeViewport === 'table' ? activeStyle : inactiveStyle)
      ),
      text(""),
      
      // Active viewport
      (() => {
        switch (model.activeViewport) {
          case 'text':
            return vstack(
              styledText("📄 Text Viewer", style().foreground(Colors.blue).bold()),
              textViewport.view(model.textViewer)
            )
          case 'log':
            return vstack(
              styledText("📋 Log Viewer (Press 'a' to add more logs)", style().foreground(Colors.yellow).bold()),
              logViewport.view(model.logViewer)
            )
          case 'code':
            return vstack(
              styledText("💻 Code Viewer", style().foreground(Colors.green).bold()),
              codeViewport.view(model.codeViewer)
            )
          case 'table':
            return vstack(
              styledText("📊 Table Viewer", style().foreground(Colors.magenta).bold()),
              tableViewport.view(model.tableViewer)
            )
        }
      })(),
      
      text(""),
      text("Controls:", helpStyle),
      text("• Arrow keys / hjkl: Scroll content", helpStyle),
      text("• Page Up/Down: Scroll by page", helpStyle),
      text("• Home/End: Jump to top/bottom", helpStyle),
      text("• 1-4: Switch between viewports", helpStyle),
      text("• q: Quit", helpStyle)
    )
  },

  subscriptions: (model: AppModel) => {
    // Auto-scroll logs every 2 seconds when viewing logs
    if (model.activeViewport === 'log') {
      return Stream.make({ _tag: "LoadMoreLogs" as const }).pipe(
        Stream.repeat(Schedule.spaced("2 seconds")),
        Stream.map(msg => ({ tag: "App" as const, msg }))
      )
    }
    return Stream.empty
  },

  handleKeyPress: (key: KeyEvent, model: AppModel) => {
    // Switch viewports with number keys
    if (key.key === '1') return Effect.succeed({ _tag: "SwitchViewport", viewport: 'text' })
    if (key.key === '2') return Effect.succeed({ _tag: "SwitchViewport", viewport: 'log' })
    if (key.key === '3') return Effect.succeed({ _tag: "SwitchViewport", viewport: 'code' })
    if (key.key === '4') return Effect.succeed({ _tag: "SwitchViewport", viewport: 'table' })
    
    // Add more logs when viewing log viewport
    if (key.key === 'a' && model.activeViewport === 'log') {
      return Effect.succeed({ _tag: "LoadMoreLogs" })
    }
    
    // Quit
    if (key.key === 'q') {
      return Effect.succeed({ _tag: "Quit" })
    }
    
    // Forward key events to active viewport
    const activeViewport = model.activeViewport
    let viewportModel: ViewportModel
    let viewportComponent: typeof textViewport
    
    switch (activeViewport) {
      case 'text':
        viewportModel = model.textViewer
        viewportComponent = textViewport
        break
      case 'log':
        viewportModel = model.logViewer
        viewportComponent = logViewport
        break
      case 'code':
        viewportModel = model.codeViewer
        viewportComponent = codeViewport
        break
      case 'table':
        viewportModel = model.tableViewer
        viewportComponent = tableViewport
        break
    }
    
    const viewportMsg = viewportComponent.handleKey?.(key, viewportModel)
    if (viewportMsg) {
      return Effect.succeed({ _tag: "ViewportMsg", viewport: activeViewport, msg: viewportMsg })
    }
    
    return Effect.succeed(null)
  }
}

const config: AppOptions = {
  fps: 30,
  debug: false,
  mouse: false,
  alternateScreen: true
}

console.log("Starting Viewport Demo...")
console.log("This example demonstrates scrollable content areas with keyboard navigation")

const program = runApp(viewportDemo, config).pipe(
  Effect.provide(LiveServices)
)

Effect.runPromise(program)
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error(error)
    process.exit(1)
  })