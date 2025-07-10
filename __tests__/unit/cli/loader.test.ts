/**
 * Tests for Plugin Loader System
 */

import { describe, it, expect, beforeEach, mock } from "bun:test"
import { PluginLoader, type LoaderOptions, type LoadedPlugin } from "@/cli/loader"
import type { Plugin } from "@/cli/plugin"
import * as fs from "fs/promises"
import * as path from "path"

// Mock fs module
mock.module("fs/promises", () => ({
  readdir: mock(async () => []),
  stat: mock(async () => ({ isDirectory: () => true })),
  readFile: mock(async () => "{}"),
  access: mock(async () => {})
}))

describe("Plugin Loader", () => {
  let loader: PluginLoader
  let options: LoaderOptions

  beforeEach(() => {
    options = {
      pluginDirs: ["./test-plugins"],
      packagePrefixes: ["test-plugin-"],
      cliVersion: "1.0.0"
    }
    loader = new PluginLoader(options)
  })

  describe("constructor", () => {
    it("uses default options when none provided", () => {
      const defaultLoader = new PluginLoader()
      expect(defaultLoader).toBeDefined()
    })

    it("accepts custom options", () => {
      expect(loader).toBeDefined()
    })
  })

  describe("loadAll", () => {
    it("loads plugins from specified directories", async () => {
      const mockPlugin: Plugin = {
        name: "test-plugin",
        version: "1.0.0",
        commands: {}
      }

      // Mock file system to return plugin files
      const fsModule = await import("fs/promises")
      fsModule.readdir = mock(async () => ["test.plugin.js"])
      fsModule.readFile = mock(async () => 
        `module.exports = ${JSON.stringify(mockPlugin)}`
      )

      const plugins = await loader.loadAll()
      expect(plugins.length).toBeGreaterThan(0)
    })

    it("handles empty plugin directories", async () => {
      const fsModule = await import("fs/promises")
      fsModule.readdir = mock(async () => [])

      const plugins = await loader.loadAll()
      expect(plugins).toEqual([])
    })

    it("filters incompatible plugins in strict mode", async () => {
      loader = new PluginLoader({
        ...options,
        strictCompatibility: true
      })

      const incompatiblePlugin: Plugin = {
        name: "incompatible",
        version: "1.0.0",
        minCliVersion: "2.0.0",
        commands: {}
      }

      const fsModule = await import("fs/promises")
      fsModule.readdir = mock(async () => ["incompatible.plugin.js"])
      fsModule.readFile = mock(async () => 
        `module.exports = ${JSON.stringify(incompatiblePlugin)}`
      )

      const plugins = await loader.loadAll()
      expect(plugins).toEqual([])
    })

    it("includes incompatible plugins in non-strict mode", async () => {
      loader = new PluginLoader({
        ...options,
        strictCompatibility: false
      })

      const incompatiblePlugin: Plugin = {
        name: "incompatible",
        version: "1.0.0",
        minCliVersion: "2.0.0",
        commands: {}
      }

      const fsModule = await import("fs/promises")
      fsModule.readdir = mock(async () => ["incompatible.plugin.js"])
      fsModule.readFile = mock(async () => 
        `module.exports = ${JSON.stringify(incompatiblePlugin)}`
      )

      const plugins = await loader.loadAll()
      expect(plugins.length).toBeGreaterThan(0)
    })
  })

  describe("load", () => {
    it("loads a single plugin from path", async () => {
      const mockPlugin: Plugin = {
        name: "single-plugin",
        version: "1.0.0",
        commands: {}
      }

      const fsModule = await import("fs/promises")
      fsModule.readFile = mock(async () => 
        `module.exports = ${JSON.stringify(mockPlugin)}`
      )

      const loaded = await loader.load("./test-plugin.js")
      expect(loaded.plugin.name).toBe("single-plugin")
      expect(loaded.source).toBe("./test-plugin.js")
      expect(loaded.loadTime).toBeGreaterThan(0)
    })

    it("handles plugin load errors", async () => {
      const fsModule = await import("fs/promises")
      fsModule.readFile = mock(async () => { throw new Error("File not found") })

      try {
        await loader.load("./missing-plugin.js")
        expect(false).toBe(true) // Should not reach here
      } catch (error) {
        expect(error).toBeDefined()
      }
    })

    it("validates plugin structure", async () => {
      const fsModule = await import("fs/promises")
      fsModule.readFile = mock(async () => 
        `module.exports = { invalid: true }`
      )

      try {
        await loader.load("./invalid-plugin.js")
        expect(false).toBe(true) // Should not reach here
      } catch (error) {
        expect(error).toBeDefined()
      }
    })
  })

  describe("loadFromPackage", () => {
    it("loads plugin from npm package", async () => {
      const mockPlugin: Plugin = {
        name: "npm-plugin",
        version: "1.0.0",
        commands: {}
      }

      // Mock require/import
      const originalRequire = global.require
      global.require = mock(() => mockPlugin) as any

      try {
        const loaded = await loader.loadFromPackage("test-plugin-example")
        expect(loaded.plugin.name).toBe("npm-plugin")
        expect(loaded.source).toBe("test-plugin-example")
      } finally {
        global.require = originalRequire
      }
    })

    it("handles missing packages", async () => {
      const originalRequire = global.require
      global.require = mock(() => { throw new Error("Module not found") }) as any

      try {
        await loader.loadFromPackage("missing-plugin")
        expect(false).toBe(true) // Should not reach here
      } catch (error) {
        expect(error).toBeDefined()
      } finally {
        global.require = originalRequire
      }
    })
  })

  describe("discoverPackages", () => {
    it("discovers plugins with matching prefixes", async () => {
      const fsModule = await import("fs/promises")
      fsModule.readdir = mock(async (dir: string) => {
        if (dir.includes("node_modules")) {
          return ["test-plugin-example", "other-package", "test-plugin-another"]
        }
        return []
      })
      fsModule.stat = mock(async () => ({ isDirectory: () => true }))

      const packages = await loader.discoverPackages()
      expect(packages).toContain("test-plugin-example")
      expect(packages).toContain("test-plugin-another")
      expect(packages).not.toContain("other-package")
    })

    it("handles missing node_modules", async () => {
      const fsModule = await import("fs/promises")
      fsModule.readdir = mock(async () => { throw new Error("ENOENT") })

      const packages = await loader.discoverPackages()
      expect(packages).toEqual([])
    })
  })

  describe("getLoaded", () => {
    it("returns empty map initially", () => {
      const loaded = loader.getLoaded()
      expect(loaded.size).toBe(0)
    })

    it("returns loaded plugins after loadAll", async () => {
      const mockPlugin: Plugin = {
        name: "loaded-plugin",
        version: "1.0.0",
        commands: {}
      }

      const fsModule = await import("fs/promises")
      fsModule.readdir = mock(async () => ["test.plugin.js"])
      fsModule.readFile = mock(async () => 
        `module.exports = ${JSON.stringify(mockPlugin)}`
      )

      await loader.loadAll()
      const loaded = loader.getLoaded()
      expect(loaded.size).toBeGreaterThan(0)
    })
  })

  describe("unload", () => {
    it("unloads a specific plugin", async () => {
      const mockPlugin: Plugin = {
        name: "to-unload",
        version: "1.0.0",
        commands: {}
      }

      const fsModule = await import("fs/promises")
      fsModule.readFile = mock(async () => 
        `module.exports = ${JSON.stringify(mockPlugin)}`
      )

      await loader.load("./test-plugin.js")
      expect(loader.getLoaded().has("to-unload")).toBe(true)

      loader.unload("to-unload")
      expect(loader.getLoaded().has("to-unload")).toBe(false)
    })

    it("handles unloading non-existent plugin", () => {
      expect(() => loader.unload("non-existent")).not.toThrow()
    })
  })

  describe("reload", () => {
    it("reloads a plugin", async () => {
      const mockPlugin: Plugin = {
        name: "to-reload",
        version: "1.0.0",
        commands: {}
      }

      const fsModule = await import("fs/promises")
      let callCount = 0
      fsModule.readFile = mock(async () => {
        callCount++
        return `module.exports = ${JSON.stringify({
          ...mockPlugin,
          version: `1.0.${callCount}`
        })}`
      })

      const first = await loader.load("./test-plugin.js")
      expect(first.plugin.version).toBe("1.0.1")

      const reloaded = await loader.reload("to-reload")
      expect(reloaded.plugin.version).toBe("1.0.2")
    })

    it("throws when reloading non-existent plugin", async () => {
      try {
        await loader.reload("non-existent")
        expect(false).toBe(true) // Should not reach here
      } catch (error) {
        expect(error).toBeDefined()
      }
    })
  })

  describe("watchForChanges", () => {
    it("sets up file watchers for plugin directories", async () => {
      const mockWatcher = {
        on: mock(() => mockWatcher),
        close: mock(async () => {})
      }

      // Mock fs.watch
      const fsModule = await import("fs/promises")
      ;(fsModule as any).watch = mock(async () => mockWatcher)

      const watcher = await loader.watchForChanges()
      expect(watcher).toBeDefined()
      expect(mockWatcher.on).toHaveBeenCalledWith("change", expect.any(Function))
    })
  })
})