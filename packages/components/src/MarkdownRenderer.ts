/**
 * Markdown Renderer Component
 * 
 * Renders markdown content in the terminal with basic navigation support
 */

import { Effect } from "effect"
import { View as ViewUtils, Component, Cmd } from "@tuix/core"

const { text, vstack, hstack, box } = ViewUtils
import * as fs from "fs/promises"
import * as path from "path"

export interface MarkdownState {
  content: string[]
  currentFile: string
  scrollPosition: number
  maxHeight: number
}

export type MarkdownMessage = 
  | { type: "scroll"; delta: number }
  | { type: "navigate"; path: string }

export interface MarkdownProps {
  initialFile: string
  basePath?: string
  maxWidth?: number
  maxHeight?: number
}

/**
 * Parse markdown content and apply basic terminal formatting
 */
function parseMarkdown(content: string): string[] {
  const lines = content.split('\n')
  const rendered: string[] = []
  
  for (const line of lines) {
    let processedLine = line
    
    // Headers
    if (line.startsWith('# ')) {
      processedLine = `\x1b[1;36m${line.slice(2)}\x1b[0m`
    } else if (line.startsWith('## ')) {
      processedLine = `\x1b[1;35m${line.slice(3)}\x1b[0m`
    } else if (line.startsWith('### ')) {
      processedLine = `\x1b[1;33m${line.slice(4)}\x1b[0m`
    } else if (line.startsWith('#### ')) {
      processedLine = `\x1b[1;32m${line.slice(5)}\x1b[0m`
    }
    
    // Code blocks
    if (line.startsWith('```')) {
      processedLine = `\x1b[2;37m${line}\x1b[0m`
    } else if (line.startsWith('    ') || line.startsWith('\t')) {
      processedLine = `\x1b[2;37m${line}\x1b[0m`
    }
    
    // Inline code
    processedLine = processedLine.replace(/`([^`]+)`/g, '\x1b[2;36m$1\x1b[0m')
    
    // Bold text
    processedLine = processedLine.replace(/\*\*([^*]+)\*\*/g, '\x1b[1m$1\x1b[0m')
    
    // Italic text
    processedLine = processedLine.replace(/\*([^*]+)\*/g, '\x1b[3m$1\x1b[0m')
    
    // Links - just highlight them
    processedLine = processedLine.replace(/\[([^\]]+)\]\([^)]+\)/g, '\x1b[4;34m$1\x1b[0m')
    
    // Bullet points
    if (line.match(/^[\s]*[-*+]\s/)) {
      processedLine = processedLine.replace(/^(\s*)([-*+])(\s)/, '$1\x1b[33m•\x1b[0m$3')
    }
    
    // Numbered lists
    if (line.match(/^[\s]*\d+\.\s/)) {
      processedLine = processedLine.replace(/^(\s*)(\d+\.)(\s)/, '$1\x1b[33m$2\x1b[0m$3')
    }
    
    rendered.push(processedLine)
  }
  
  return rendered
}

/**
 * Load markdown file and resolve relative paths
 */
function loadMarkdownFile(filePath: string, basePath: string = "docs"): Effect.Effect<string, Error, never> {
  return Effect.gen(function* (_) {
    try {
      const fullPath = path.isAbsolute(filePath) ? filePath : path.join(basePath, filePath)
      const content = yield* _(Effect.promise(() => fs.readFile(fullPath, 'utf-8')))
      return content
    } catch (error) {
      return yield* _(Effect.fail(new Error(`Failed to load ${filePath}: ${error}`)))
    }
  })
}

export const MarkdownRenderer = (props: MarkdownProps): Component<MarkdownState, MarkdownMessage> => {
  const basePath = props.basePath || "docs"
  const maxHeight = props.maxHeight || 20
  
  return {
    init: Effect.gen(function* (_) {
      const content = yield* _(loadMarkdownFile(props.initialFile, basePath))
      const rendered = parseMarkdown(content)
      
      return [{
        content: rendered,
        currentFile: props.initialFile,
        scrollPosition: 0,
        maxHeight
      }, []] as const
    }),
    
    update: (msg, model) => Effect.gen(function* (_) {
      switch (msg.type) {
        case "scroll": {
          const maxScroll = Math.max(0, model.content.length - model.maxHeight)
          const newPosition = Math.max(0, Math.min(maxScroll, model.scrollPosition + msg.delta))
          
          return [{
            ...model,
            scrollPosition: newPosition
          }, []] as const
        }
        
        case "navigate": {
          // For now, just stay on current file
          // TODO: Implement file navigation
          return [model, []] as const
        }
        
        default:
          return [model, []] as const
      }
    }),
    
    view: (model) => {
      // Get visible lines based on scroll position
      const visibleLines = model.content.slice(
        model.scrollPosition, 
        model.scrollPosition + model.maxHeight
      )
      
      // Create status line
      const totalLines = model.content.length
      const startLine = model.scrollPosition + 1
      const endLine = Math.min(model.scrollPosition + model.maxHeight, totalLines)
      const statusLine = `📄 ${path.basename(model.currentFile)} | Lines ${startLine}-${endLine} of ${totalLines} | Use ↑↓ to scroll`
      
      return vstack(
        ...visibleLines.map(line => text(line)),
        text(""),
        text(`\x1b[2m${statusLine}\x1b[0m`)
      )
    },
    
    subscriptions: () => Effect.succeed([])
  }
}