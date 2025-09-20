/**
 * Todo CLI Application
 * 
 * A complete example showcasing all CLI framework features:
 * - Command structure with subcommands
 * - Zod-based argument validation
 * - Interactive UI components
 * - State management with $state
 * - Plugin integration
 * - Data persistence
 */

import { defineConfig } from "../../src/cli/config"
import { runCLI } from "../../src/cli/runner"
import { z } from "zod"
import { Panel, SuccessPanel, ErrorPanel, InfoPanel } from "../../src/components/builders/Panel"
import { text, vstack, hstack, styledText } from "../../src/core/view"
import { style, Colors } from "../../src/styling"
import { $state, $derived } from "../../src/components/reactivity"
import { createComponent } from "../../src/components/component"
import { List } from "../../src/components/List"
import { TextInput } from "../../src/components/TextInput"
import { Button } from "../../src/components/Button"
import * as fs from "fs/promises"
import * as path from "path"
import { homedir } from "os"

// Todo item schema
const todoSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  completed: z.boolean().default(false),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  tags: z.array(z.string()).default([]),
  createdAt: z.string(),
  completedAt: z.string().optional()
})

type Todo = z.infer<typeof todoSchema>

// Storage utilities
const todoFile = path.join(homedir(), ".tuix", "todos.json")

async function loadTodos(): Promise<Todo[]> {
  try {
    const data = await fs.readFile(todoFile, "utf-8")
    return JSON.parse(data)
  } catch {
    return []
  }
}

async function saveTodos(todos: Todo[]): Promise<void> {
  await fs.mkdir(path.dirname(todoFile), { recursive: true })
  await fs.writeFile(todoFile, JSON.stringify(todos, null, 2))
}

// Priority colors
const priorityColors = {
  low: Colors.green,
  medium: Colors.yellow, 
  high: Colors.red
}

// CLI Configuration
const config = defineConfig({
  name: "todo",
  version: "1.0.0",
  description: "A powerful todo list manager",
  
  options: {
    json: z.boolean().default(false).describe("Output in JSON format"),
    verbose: z.boolean().default(false).describe("Verbose output")
  },
  
  commands: {
    add: {
      description: "Add a new todo item",
      args: {
        title: z.string().describe("Todo title")
      },
      options: {
        description: z.string().optional().describe("Todo description"),
        priority: z.enum(["low", "medium", "high"]).default("medium").describe("Priority level"),
        tags: z.string().optional().describe("Comma-separated tags")
      },
      handler: async (args) => {
        const todos = await loadTodos()
        const newTodo: Todo = {
          id: Date.now().toString(),
          title: args.title,
          description: args.description,
          completed: false,
          priority: args.priority,
          tags: args.tags ? args.tags.split(",").map(t => t.trim()) : [],
          createdAt: new Date().toISOString()
        }
        
        todos.push(newTodo)
        await saveTodos(todos)
        
        if (args.json) {
          console.log(JSON.stringify(newTodo))
          return
        }
        
        return SuccessPanel(
          vstack(
            text(`✓ Todo added successfully`),
            text(""),
            text(`Title: ${newTodo.title}`),
            text(`Priority: ${newTodo.priority}`),
            ...(newTodo.tags.length > 0 ? [text(`Tags: ${newTodo.tags.join(", ")}`)] : [])
          ),
          "Todo Added"
        )
      }
    },
    
    list: {
      description: "List all todos",
      options: {
        completed: z.boolean().optional().describe("Show only completed/uncompleted"),
        priority: z.enum(["low", "medium", "high"]).optional().describe("Filter by priority"),
        tags: z.string().optional().describe("Filter by tags (comma-separated)"),
        sort: z.enum(["created", "priority", "title"]).default("created").describe("Sort order")
      },
      handler: async (args) => {
        let todos = await loadTodos()
        
        // Filter
        if (args.completed !== undefined) {
          todos = todos.filter(t => t.completed === args.completed)
        }
        if (args.priority) {
          todos = todos.filter(t => t.priority === args.priority)
        }
        if (args.tags) {
          const filterTags = args.tags.split(",").map(t => t.trim())
          todos = todos.filter(t => 
            filterTags.some(tag => t.tags.includes(tag))
          )
        }
        
        // Sort
        todos.sort((a, b) => {
          switch (args.sort) {
            case "priority":
              const priorities = { high: 3, medium: 2, low: 1 }
              return priorities[b.priority] - priorities[a.priority]
            case "title":
              return a.title.localeCompare(b.title)
            default:
              return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          }
        })
        
        if (args.json) {
          console.log(JSON.stringify(todos))
          return
        }
        
        if (todos.length === 0) {
          return InfoPanel(
            text("No todos found"),
            "Todo List"
          )
        }
        
        const items = todos.map(todo => 
          hstack(
            text(todo.completed ? "✓" : "○"),
            text(" "),
            styledText(`[${todo.priority.toUpperCase()}]`, style().foreground(priorityColors[todo.priority])),
            text(" "),
            text(todo.title),
            ...(todo.tags.length > 0 ? [styledText(` (${todo.tags.join(", ")})`, style().faint())] : [])
          )
        )
        
        return Panel(
          vstack(
            text(`Total: ${todos.length} todos`),
            text(""),
            ...items
          ),
          { title: "Todo List" }
        )
      }
    },
    
    complete: {
      description: "Mark a todo as completed",
      args: {
        id: z.string().describe("Todo ID or partial title match")
      },
      handler: async (args) => {
        const todos = await loadTodos()
        
        // Find by ID or title
        let todo = todos.find(t => t.id === args.id)
        if (!todo) {
          const matches = todos.filter(t => 
            t.title.toLowerCase().includes(args.id.toLowerCase()) && !t.completed
          )
          if (matches.length === 1) {
            todo = matches[0]
          } else if (matches.length > 1) {
            return ErrorPanel(
              vstack(
                text(`Multiple matches found for "${args.id}":`),
                text(""),
                ...matches.map(t => text(`- ${t.id}: ${t.title}`))
              ),
              "Ambiguous Match"
            )
          }
        }
        
        if (!todo) {
          return ErrorPanel(
            text(`Todo not found: ${args.id}`),
            "Not Found"
          )
        }
        
        if (todo.completed) {
          return InfoPanel(
            text(`Todo already completed: ${todo.title}`),
            "Already Completed"
          )
        }
        
        todo.completed = true
        todo.completedAt = new Date().toISOString()
        await saveTodos(todos)
        
        return SuccessPanel(
          vstack(
            text(`✓ Completed: ${todo.title}`),
            text(""),
            text(`Completed at: ${new Date(todo.completedAt).toLocaleString()}`)
          ),
          "Todo Completed"
        )
      }
    },
    
    delete: {
      description: "Delete a todo",
      args: {
        id: z.string().describe("Todo ID or partial title match")
      },
      options: {
        force: z.boolean().default(false).describe("Skip confirmation")
      },
      handler: async (args) => {
        const todos = await loadTodos()
        
        // Find by ID or title
        let todoIndex = todos.findIndex(t => t.id === args.id)
        if (todoIndex === -1) {
          const matches = todos.filter(t => 
            t.title.toLowerCase().includes(args.id.toLowerCase())
          )
          if (matches.length === 1) {
            todoIndex = todos.findIndex(t => t.id === matches[0].id)
          } else if (matches.length > 1) {
            return ErrorPanel(
              vstack(
                text(`Multiple matches found for "${args.id}":`),
                text(""),
                ...matches.map(t => text(`- ${t.id}: ${t.title}`))
              ),
              "Ambiguous Match"
            )
          }
        }
        
        if (todoIndex === -1) {
          return ErrorPanel(
            text(`Todo not found: ${args.id}`),
            "Not Found"
          )
        }
        
        const todo = todos[todoIndex]
        
        // TODO: Add interactive confirmation when not forced
        if (!args.force && !todo.completed) {
          console.log(`Warning: Todo "${todo.title}" is not completed. Use --force to delete anyway.`)
          return
        }
        
        todos.splice(todoIndex, 1)
        await saveTodos(todos)
        
        return SuccessPanel(
          text(`✓ Deleted: ${todo.title}`),
          "Todo Deleted"
        )
      }
    },
    
    stats: {
      description: "Show todo statistics",
      handler: async (args) => {
        const todos = await loadTodos()
        
        const stats = {
          total: todos.length,
          completed: todos.filter(t => t.completed).length,
          pending: todos.filter(t => !t.completed).length,
          byPriority: {
            high: todos.filter(t => t.priority === "high" && !t.completed).length,
            medium: todos.filter(t => t.priority === "medium" && !t.completed).length,
            low: todos.filter(t => t.priority === "low" && !t.completed).length
          }
        }
        
        if (args.json) {
          console.log(JSON.stringify(stats))
          return
        }
        
        const completionRate = stats.total > 0 
          ? Math.round((stats.completed / stats.total) * 100) 
          : 0
        
        return Panel(
          vstack(
            text("📊 Todo Statistics"),
            text(""),
            text(`Total todos: ${stats.total}`),
            text(`Completed: ${stats.completed}`),
            text(`Pending: ${stats.pending}`),
            text(""),
            text("Pending by priority:"),
            styledText(`  High: ${stats.byPriority.high}`, style().foreground(Colors.red)),
            styledText(`  Medium: ${stats.byPriority.medium}`, style().foreground(Colors.yellow)),
            styledText(`  Low: ${stats.byPriority.low}`, style().foreground(Colors.green)),
            text(""),
            text(`Completion rate: ${completionRate}%`)
          ),
          { title: "Statistics" }
        )
      }
    },
    
    interactive: {
      description: "Interactive todo manager",
      handler: async (args) => {
        // Create an interactive todo manager component
        const InteractiveTodoManager = createComponent<{}>((props) => {
          const todos = $state<Todo[]>([])
          const selectedIndex = $state(0)
          const filterCompleted = $state(false)
          const searchTerm = $state("")
          
          // Load todos on mount
          const loadData = async () => {
            const data = await loadTodos()
            todos.set(data)
          }
          
          // Filtered todos
          const filteredTodos = $derived(() => {
            let filtered = todos.value
            
            if (filterCompleted.value) {
              filtered = filtered.filter(t => !t.completed)
            }
            
            if (searchTerm.value) {
              filtered = filtered.filter(t => 
                t.title.toLowerCase().includes(searchTerm.value.toLowerCase()) ||
                t.tags.some(tag => tag.toLowerCase().includes(searchTerm.value.toLowerCase()))
              )
            }
            
            return filtered
          })
          
          // Initialize
          loadData()
          
          return {
            init: () => ({ selectedIndex: 0 }),
            
            update: (msg, model) => {
              switch (msg._tag) {
                case "KeyPress":
                  switch (msg.key.name) {
                    case "up":
                      selectedIndex.update(i => Math.max(0, i - 1))
                      break
                    case "down":
                      selectedIndex.update(i => 
                        Math.min(filteredTodos.value.length - 1, i + 1)
                      )
                      break
                    case "space":
                      // Toggle completion
                      const todo = filteredTodos.value[selectedIndex.value]
                      if (todo) {
                        todo.completed = !todo.completed
                        saveTodos(todos.value)
                      }
                      break
                    case "d":
                      // Delete todo
                      const todoToDelete = filteredTodos.value[selectedIndex.value]
                      if (todoToDelete) {
                        todos.update(list => 
                          list.filter(t => t.id !== todoToDelete.id)
                        )
                        saveTodos(todos.value)
                      }
                      break
                    case "f":
                      // Toggle filter
                      filterCompleted.update(f => !f)
                      break
                    case "q":
                      return [model, [{ _tag: "Quit" }]]
                  }
                  break
              }
              
              return [model, []]
            },
            
            view: () => Panel(
              vstack(
                text("📝 Interactive Todo Manager"),
                text(""),
                text(`Filter: ${filterCompleted.value ? "Active only" : "All"} | [f] toggle filter | [space] complete | [d] delete | [q] quit`),
                text(""),
                filteredTodos.value.length === 0 
                  ? text("No todos found")
                  : List({
                      items: filteredTodos.value.map((todo, i) => ({
                        id: todo.id,
                        label: hstack(
                          text(todo.completed ? "✓" : "○"),
                          text(" "),
                          styledText(`[${todo.priority.toUpperCase()}]`, style().foreground(priorityColors[todo.priority])),
                          text(" "),
                          text(todo.title),
                          todo.tags.length > 0 && styledText(` (${todo.tags.join(", ")})`, style().faint())
                        ).filter(Boolean)
                      })),
                      selectedIndex: selectedIndex.value,
                      height: 20
                    })
              ),
              { title: "Todo List", border: "rounded" }
            )
          }
        })
        
        return InteractiveTodoManager({})
      }
    }
  }
})

// Run if executed directly
if (typeof Bun !== 'undefined' && import.meta.path === Bun.main) {
  runCLI(config).catch(console.error)
}
