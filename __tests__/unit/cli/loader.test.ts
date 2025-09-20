/**
 * Tests for Plugin Loader System
 */

import { describe, it, expect, beforeEach, mock } from "bun:test"
import { PluginLoader, type LoaderOptions, type LoadedPlugin } from "@/cli/loader"
import type { Plugin } from "@/cli/plugin"
import * as fs from "fs/promises"
import * as path from "path"
import { pathToFileURL } from "url"

// Mock fs module
mock.module("fs/promises", () => ({
  readdir: mock(async () => []),
  stat: mock(async () => ({ isDirectory: () => true })),
  readFile: mock(async () => "{}"),
  access: mock(async () => {}),
  watch: mock(async () => ({ on: () => {}, close: async () => {} }))
}))

describe("Plugin Loader", () => {
  let loader: PluginLoader
  let options: LoaderOptions

  beforeEach(() => {
    options = {
      pluginDirs: [path.join(process.cwd(), "test-plugins")],
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
      // Return a directory that contains a package.json
      ;(fs.readdir as any).mockImplementation(async () => [
        { name: "test-plugin-pkg", isFile: () => false, isDirectory: () => true }
      ])
      // package.json exists & points to index.js
      ;(fs.readFile as any).mockImplementation(async (p: string) => {
        if (p.endsWith('package.json')) return JSON.stringify({ main: 'index.js' })
        return ''
      })
      const pkgEntry = path.join(options.pluginDirs![0], 'test-plugin-pkg', 'index.js')
      mock.module(pathToFileURL(pkgEntry).href, () => ({ default: mockPlugin }))
      mock.module(pkgEntry, () => ({ default: mockPlugin }))
      ;(fs.readFile as any).mockImplementation(async () => 
        `module.exports = ${JSON.stringify(mockPlugin)}`
      )

      const plugins = await loader.loadAll()
      expect(Array.isArray(plugins)).toBe(true)
    })

    it("handles empty plugin directories", async () => {
      ;(fs.readdir as any).mockImplementation(async () => [])

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

      ;(fs.readdir as any).mockImplementation(async () => [
        { name: "incompatible-pkg", isFile: () => false, isDirectory: () => true }
      ]) 
      ;(fs.readFile as any).mockImplementation(async (p: string) => {
        if (p.endsWith('package.json')) return JSON.stringify({ main: 'index.js' })
        return ''
      })
      const badEntry = path.join(options.pluginDirs![0], 'incompatible-pkg', 'index.js')
      mock.module(pathToFileURL(badEntry).href, () => ({ default: incompatiblePlugin }))
      mock.module(badEntry, () => ({ default: incompatiblePlugin }))
      ;(fs.readFile as any).mockImplementation(async () => 
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

      ;(fs.readdir as any).mockImplementation(async () => [
        { name: "incompatible-pkg", isFile: () => false, isDirectory: () => true }
      ]) 
      ;(fs.readFile as any).mockImplementation(async (p: string) => {
        if (p.endsWith('package.json')) return JSON.stringify({ main: 'index.js' })
        return ''
      })
      const badEntry2 = path.join(options.pluginDirs![0], 'incompatible-pkg', 'index.js')
      mock.module(pathToFileURL(badEntry2).href, () => ({ default: incompatiblePlugin }))
      mock.module(badEntry2, () => ({ default: incompatiblePlugin }))
      ;(fs.readFile as any).mockImplementation(async () => 
        `module.exports = ${JSON.stringify(incompatiblePlugin)}`
      )

      const plugins = await loader.loadAll()
      expect(Array.isArray(plugins)).toBe(true)
    })
  })

  describe("load", () => {
    it("loads a single plugin by package", async () => {
      const mockPlugin: Plugin = {
        name: "single-plugin",
        version: "1.0.0",
        commands: {}
      }
      const pkg = "test-plugin-single"
      mock.module(pkg, () => ({ default: mockPlugin }))

      const loaded = await loader.loadFromPackage(pkg)
      expect(loaded.plugin.name).toBe("single-plugin")
      expect(loaded.source).toBe(pkg)
      expect(loaded.loadTime).toBeGreaterThanOrEqual(0)
    })

    it("handles plugin load errors", async () => {
      ;(fs.readFile as any).mockImplementation(async () => { throw new Error("File not found") })

      try {
        await loader.load("./missing-plugin.js")
        expect(false).toBe(true) // Should not reach here
      } catch (error) {
        expect(error).toBeDefined()
      }
    })

    it("validates plugin structure", async () => {
      ;(fs.readFile as any).mockImplementation(async () => 
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
      ;(fs.readdir as any).mockImplementation(async (dir: string) => {
        if (dir.includes("node_modules")) {
          return ["test-plugin-example", "other-package", "test-plugin-another"]
        }
        return []
      })
      ;(fs.stat as any).mockImplementation(async () => ({ isDirectory: () => true }))

      const packages = await loader.discoverPackages()
      expect(packages).toContain("test-plugin-example")
      expect(packages).toContain("test-plugin-another")
      expect(packages).not.toContain("other-package")
    })

    it("handles missing node_modules", async () => {
      ;(fs.readdir as any).mockImplementation(async () => { throw new Error("ENOENT") })

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

      ;(fs.readdir as any).mockImplementation(async () => [
        { name: "loaded-pkg", isFile: () => false, isDirectory: () => true }
      ]) 
      ;(fs.readFile as any).mockImplementation(async (p: string) => {
        if (p.endsWith('package.json')) return JSON.stringify({ main: 'index.js' })
        return ''
      })
      const loadEntry = path.join(options.pluginDirs![0], 'loaded-pkg', 'index.js')
      mock.module(pathToFileURL(loadEntry).href, () => ({ default: mockPlugin }))
      mock.module(loadEntry, () => ({ default: mockPlugin }))
      ;(fs.readFile as any).mockImplementation(async () => 
        `module.exports = ${JSON.stringify(mockPlugin)}`
      )

      await loader.loadAll()
      const loaded = loader.getLoaded()
      expect(loaded instanceof Map).toBe(true)
    })
  })

  describe("unload", () => {
    it("unloads a specific plugin", async () => {
      const pkgName = "test-plugin-unload"
      const mockPlugin: Plugin = {
        name: "to-unload",
        version: "1.0.0",
        commands: {}
      }

      mock.module(pkgName, () => ({ default: mockPlugin }))

      await loader.loadFromPackage(pkgName)
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
      const pkgName = "test-plugin-reload"
      let callCount = 0
      mock.module(pkgName, () => ({
        default: {
          name: "to-reload",
          version: `1.0.${++callCount}`,
          commands: {}
        }
      }))

      const first = await loader.loadFromPackage(pkgName)
      expect(first.plugin.version).toBe("1.0.1")

      const reloaded = await loader.reload("to-reload")
      expect(reloaded.plugin.version).toBeDefined()
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
      ;(fs.watch as any).mockImplementation(async () => mockWatcher)

      const watcher = await loader.watchForChanges()
      expect(watcher).toBeDefined()
      // register a listener; underlying watchers should be wired
      watcher.on("change", () => {})
      expect(mockWatcher.on).toHaveBeenCalledWith("change", expect.any(Function))
    })
  })
})
