/**
 * Git Status CLI
 * 
 * Enhanced git status viewer showcasing:
 * - Git repository information
 * - Branch visualization
 * - File change categorization
 * - Commit history
 * - Plugin usage
 */

import { defineConfig } from "../../src/cli/config"
import { runCLI } from "../../src/cli/runner"
import { z } from "zod"
import { Panel, InfoPanel, SuccessPanel, ErrorPanel } from "../../src/components/builders/Panel"
import { text, vstack, hstack, styledText } from "../../src/core/view"
import { style, Colors } from "../../src/styling"
import { exec } from "child_process"
import { promisify } from "util"
import * as path from "path"

const execAsync = promisify(exec)

// Git info types
interface GitInfo {
  branch: string
  remote?: string
  ahead: number
  behind: number
  staged: string[]
  modified: string[]
  untracked: string[]
  conflicted: string[]
  lastCommit?: {
    hash: string
    author: string
    date: string
    message: string
  }
}

// Execute git command
async function git(args: string, cwd = process.cwd()): Promise<string> {
  try {
    const { stdout } = await execAsync(`git ${args}`, { cwd })
    return stdout.trim()
  } catch (error: any) {
    if (error.code === 128) {
      throw new Error("Not a git repository")
    }
    throw error
  }
}

// Get git status info
async function getGitInfo(cwd: string): Promise<GitInfo> {
  // Get current branch
  const branch = await git("branch --show-current", cwd)
  
  // Get remote tracking branch
  let remote: string | undefined
  let ahead = 0
  let behind = 0
  
  try {
    remote = await git(`rev-parse --abbrev-ref ${branch}@{upstream}`, cwd)
    const revList = await git(`rev-list --left-right --count ${branch}...${remote}`, cwd)
    const [a, b] = revList.split('\t').map(n => parseInt(n))
    ahead = a
    behind = b
  } catch {
    // No upstream branch
  }
  
  // Get file status
  const status = await git("status --porcelain", cwd)
  const lines = status.split('\n').filter(line => line.trim())
  
  const staged: string[] = []
  const modified: string[] = []
  const untracked: string[] = []
  const conflicted: string[] = []
  
  for (const line of lines) {
    const statusCode = line.substring(0, 2)
    const filename = line.substring(3)
    
    if (statusCode === "??") {
      untracked.push(filename)
    } else if (statusCode === "UU" || statusCode === "AA" || statusCode === "DD") {
      conflicted.push(filename)
    } else if (statusCode[0] !== " " && statusCode[0] !== "?") {
      staged.push(filename)
    } else if (statusCode[1] !== " " && statusCode[1] !== "?") {
      modified.push(filename)
    }
  }
  
  // Get last commit
  let lastCommit: GitInfo['lastCommit']
  try {
    const log = await git("log -1 --pretty=format:%H|%an|%ad|%s --date=relative", cwd)
    const [hash, author, date, message] = log.split('|')
    lastCommit = { hash: hash.substring(0, 7), author, date, message }
  } catch {
    // No commits yet
  }
  
  return {
    branch,
    remote,
    ahead,
    behind,
    staged,
    modified,
    untracked,
    conflicted,
    lastCommit
  }
}

// Get recent commits
async function getRecentCommits(cwd: string, count = 10): Promise<string[]> {
  try {
    const log = await git(`log -${count} --oneline --graph --decorate`, cwd)
    return log.split('\n').filter(line => line.trim())
  } catch {
    return []
  }
}

// Format file list
function formatFileList(files: string[], title: string, color: keyof typeof Colors): any[] {
  if (files.length === 0) return []
  
  return [
    text(""),
    styledText(`${title} (${files.length})`, style().foreground(Colors[color]).bold()),
    ...files.slice(0, 10).map(file => 
      hstack(
        text("  "),
        styledText(file, style().foreground(Colors[color]))
      )
    ),
    files.length > 10 && text(`  ... and ${files.length - 10} more`)
  ].filter(Boolean)
}

// CLI Configuration
const config = defineConfig({
  name: "git-status",
  version: "1.0.0",
  description: "Enhanced git status viewer",
  
  options: {
    path: z.string().default(process.cwd()).describe("Repository path"),
    json: z.boolean().default(false).describe("Output as JSON")
  },
  
  commands: {
    status: {
      description: "Show repository status",
      aliases: ["s"],
      options: {
        fetch: z.boolean().default(false).describe("Fetch before showing status")
      },
      handler: async (args) => {
        try {
          // Fetch if requested
          if (args.fetch) {
            await git("fetch", args.path)
          }
          
          const info = await getGitInfo(args.path)
          
          if (args.json) {
            console.log(JSON.stringify(info, null, 2))
            return
          }
          
          // Build status display
          const elements: any[] = []
          
          // Branch info
          elements.push(
            hstack(
              text("Branch: "),
              styledText(info.branch, style().foreground(Colors.cyan).bold())
            )
          )
          
          if (info.remote) {
            const syncStatus = []
            if (info.ahead > 0) {
              syncStatus.push(styledText(`↑${info.ahead}`, style().foreground(Colors.green)))
            }
            if (info.behind > 0) {
              syncStatus.push(styledText(`↓${info.behind}`, style().foreground(Colors.red)))
            }
            
            elements.push(
              hstack(
                text("Remote: "),
                text(info.remote),
                ...(syncStatus.length > 0 ? [text(" ("), ...syncStatus, text(")")] : [])
              )
            )
          }
          
          // Last commit
          if (info.lastCommit) {
            elements.push(
              text(""),
              text("Last commit:"),
              hstack(
                text("  "),
                styledText(info.lastCommit.hash, style().foreground(Colors.yellow)),
                text(" - "),
                text(info.lastCommit.message)
              ),
              hstack(
                text("  by "),
                text(info.lastCommit.author),
                text(" "),
                styledText(info.lastCommit.date, style().faint())
              )
            )
          }
          
          // File changes
          elements.push(...formatFileList(info.staged, "Staged", "green"))
          elements.push(...formatFileList(info.modified, "Modified", "yellow"))
          elements.push(...formatFileList(info.untracked, "Untracked", "gray"))
          elements.push(...formatFileList(info.conflicted, "Conflicted", "red"))
          
          // Summary
          const totalChanges = info.staged.length + info.modified.length + 
                              info.untracked.length + info.conflicted.length
          
          if (totalChanges === 0) {
            elements.push(
              text(""),
              styledText("✓ Working tree clean", style().foreground(Colors.green))
            )
          }
          
          return Panel(
            vstack(...elements),
            { title: "Git Status" }
          )
        } catch (error: any) {
          return ErrorPanel(
            text(error.message),
            "Git Error"
          )
        }
      }
    },
    
    log: {
      description: "Show commit history",
      aliases: ["l"],
      options: {
        count: z.number().default(20).describe("Number of commits to show"),
        graph: z.boolean().default(true).describe("Show branch graph")
      },
      handler: async (args) => {
        try {
          const commits = await getRecentCommits(args.path, args.count)
          
          if (args.json) {
            console.log(JSON.stringify({ commits }))
            return
          }
          
          return Panel(
            vstack(
              text("Recent commits:"),
              text(""),
              ...commits.map(commit => text(commit))
            ),
            { title: "Git Log" }
          )
        } catch (error: any) {
          return ErrorPanel(
            text(error.message),
            "Git Error"
          )
        }
      }
    },
    
    branch: {
      description: "Branch operations",
      commands: {
        list: {
          description: "List all branches",
          aliases: ["ls"],
          options: {
            all: z.boolean().default(false).describe("Show remote branches too")
          },
          handler: async (args) => {
            try {
              const branchArgs = args.all ? "-a" : ""
              const output = await git(`branch ${branchArgs}`, args.path)
              const branches = output.split('\n').filter(line => line.trim())
              
              if (args.json) {
                console.log(JSON.stringify({ 
                  branches: branches.map(b => ({
                    name: b.substring(2).trim(),
                    current: b.startsWith('*')
                  }))
                }))
                return
              }
              
              return Panel(
                vstack(
                  text("Branches:"),
                  text(""),
                  ...branches.map(branch => {
                    const isCurrent = branch.startsWith('*')
                    const name = branch.substring(2).trim()
                    
                    return styledText(
                      `${isCurrent ? '→' : ' '} ${name}`,
                      isCurrent 
                        ? style().foreground(Colors.green).bold()
                        : style()
                    )
                  })
                ),
                { title: "Git Branches" }
              )
            } catch (error: any) {
              return ErrorPanel(
                text(error.message),
                "Git Error"
              )
            }
          }
        },
        
        create: {
          description: "Create a new branch",
          args: {
            name: z.string().describe("Branch name")
          },
          options: {
            checkout: z.boolean().default(true).describe("Switch to new branch")
          },
          handler: async (args) => {
            try {
              const cmd = args.checkout ? "checkout -b" : "branch"
              await git(`${cmd} ${args.name}`, args.path)
              
              return SuccessPanel(
                vstack(
                  text(`✓ Branch '${args.name}' created`),
                  args.checkout && text("✓ Switched to new branch")
                ).filter(Boolean),
                "Branch Created"
              )
            } catch (error: any) {
              return ErrorPanel(
                text(error.message),
                "Git Error"
              )
            }
          }
        }
      }
    }
  }
})

// Run if executed directly
if (typeof Bun !== 'undefined' && import.meta.path === Bun.main) {
  // Default to status command if no command provided
  const args = process.argv.slice(2)
  if (args.length === 0 || (args[0] && args[0].startsWith('--'))) {
    args.unshift('status')
  }
  
  runCLI(config, args).catch(console.error)
}