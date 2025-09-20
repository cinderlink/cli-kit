import { z } from "zod"
import type { CLIConfig } from "../types"

const semver = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z-.]+)?(?:\+[0-9A-Za-z-.]+)?$/

export function validateConfig(config: CLIConfig): void {
  if (!config.name?.trim()) {
    throw new Error("CLI config must define a non-empty name")
  }

  if (!config.version?.trim()) {
    throw new Error("CLI config must define a version")
  }

  if (!semver.test(config.version)) {
    throw new Error(`Invalid CLI version: ${config.version}`)
  }

  if (!config.commands || Object.keys(config.commands).length === 0) {
    throw new Error("CLI config must include at least one command")
  }

  Object.entries(config.commands).forEach(([name, command]) => {
    validateCommand(name, command)
  })
}

function validateCommand(name: string, command: any): void {
  if (!command) {
    throw new Error(`Command '${name}' is undefined`)
  }

  if ("commands" in command && command.commands) {
    Object.entries(command.commands).forEach(([childName, child]) => {
      validateCommand(`${name}.${childName}`, child)
    })
    return
  }

  if (typeof command.handler !== "function") {
    throw new Error(`Command '${name}' must define a handler`)
  }

  if (command.options) {
    Object.entries(command.options).forEach(([optionName, schema]) => {
      if (!z.isSchema(schema)) {
        throw new Error(`Option '${optionName}' on '${name}' must be a Zod schema`)
      }
    })
  }

  if (command.args && !z.isSchema(command.args)) {
    throw new Error(`Args for command '${name}' must be a Zod schema`)
  }
}
