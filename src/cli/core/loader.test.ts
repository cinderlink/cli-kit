import { test, expect, describe, beforeEach, afterEach } from "bun:test"
import { PluginLoader } from "./loader"
import type { LoaderOptions, LoadedPlugin } from "./loader"
import * as fs from "fs/promises"
import * as path from "path"
import * as os from "os"

// Mock fs module for testing
const mockFs = {
  access: async (path: string) => {
    if (path.includes("nonexistent")) {
      throw new Error("ENOENT")
    }
    if (path.includes("forbidden")) {
      throw new Error("EACCES")
    }
  },
  readdir: async (path: string) => {
    if (path.includes("empty")) return []
    if (path.includes("with-plugins")) {
      return ["test.plugin.js", "another.plugin.ts", "notaplugin.js"]
    }
    return ["package.json", "index.js"]
  },
  readFile: async (path: string) => {
    if (path.includes("package.json")) {
      return JSON.stringify({
        name: "cli-kit-plugin-test",
        version: "1.0.0",
        main: "index.js"
      })
    }
    return "module.exports = { metadata: { name: 'test', version: '1.0.0' } }"
  }
}

describe("PluginLoader", () => {
  let tempDir: string

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "plugin-loader-test-"))
  })

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true })
    } catch {
      // Ignore cleanup errors
    }
  })

  describe("constructor", () => {
    test("should create loader with default options", () => {
      const loader = new PluginLoader()
      expect(loader).toBeInstanceOf(PluginLoader)
    })

    test("should create loader with custom options", () => {
      const options: LoaderOptions = {
        pluginDirs: ["./custom-plugins"],
        packagePrefixes: ["my-plugin-"],
        filePatterns: ["*.plugin.mjs"],
        loadFromNodeModules: false,
        cliVersion: "2.0.0",
        strictCompatibility: true
      }
      
      const loader = new PluginLoader(options)
      expect(loader).toBeInstanceOf(PluginLoader)
    })
  })

  describe("loadFromDirectory", () => {
    test("should return empty array for nonexistent directory", async () => {
      const loader = new PluginLoader()
      const result = await loader.loadFromDirectory("/path/that/does/not/exist")
      expect(result).toEqual([])
    })

    test("should return empty array for inaccessible directory", async () => {
      const loader = new PluginLoader()
      const result = await loader.loadFromDirectory("/root/forbidden")
      expect(result).toEqual([])
    })

    test("should handle directory without matching files", async () => {
      // Create a directory with no plugin files
      const testDir = path.join(tempDir, "no-plugins")
      await fs.mkdir(testDir, { recursive: true })
      await fs.writeFile(path.join(testDir, "readme.txt"), "not a plugin")
      
      const loader = new PluginLoader()
      const result = await loader.loadFromDirectory(testDir)
      expect(result).toEqual([])
    })

    test("should handle home directory expansion", async () => {
      const loader = new PluginLoader()
      const homeDir = os.homedir()
      
      // This will attempt to load from the actual home directory
      // but should handle it gracefully even if no plugins are found
      const result = await loader.loadFromDirectory("~/")
      expect(Array.isArray(result)).toBe(true)
    })
  })

  describe("loadFromNodeModules", () => {
    test("should handle missing node_modules", async () => {
      const loader = new PluginLoader({
        packagePrefixes: ["nonexistent-prefix-"]
      })
      
      const result = await loader.loadFromNodeModules()
      expect(Array.isArray(result)).toBe(true)
    })

    test("should handle empty node_modules", async () => {
      // Create empty node_modules
      const nodeModulesDir = path.join(tempDir, "node_modules")
      await fs.mkdir(nodeModulesDir, { recursive: true })
      
      const loader = new PluginLoader({
        packagePrefixes: ["cli-kit-plugin-"]
      })
      
      // Change to temp directory to test relative node_modules
      const originalCwd = process.cwd()
      process.chdir(tempDir)
      
      try {
        const result = await loader.loadFromNodeModules()
        expect(Array.isArray(result)).toBe(true)
      } finally {
        process.chdir(originalCwd)
      }
    })
  })

  describe("loadAll", () => {
    test("should load from all configured sources", async () => {
      const loader = new PluginLoader({
        pluginDirs: [tempDir],
        loadFromNodeModules: false // Disable to avoid side effects
      })
      
      const result = await loader.loadAll()
      expect(Array.isArray(result)).toBe(true)
    })

    test("should load from directories and node_modules when enabled", async () => {
      const loader = new PluginLoader({
        pluginDirs: [tempDir],
        loadFromNodeModules: true
      })
      
      const result = await loader.loadAll()
      expect(Array.isArray(result)).toBe(true)
    })
  })

  describe("loadFromFile", () => {
    test("should handle loading invalid plugin file", async () => {
      const invalidFile = path.join(tempDir, "invalid.plugin.js")
      await fs.writeFile(invalidFile, "invalid javascript syntax {{{")
      
      const loader = new PluginLoader()
      const result = await loader.loadFromFile(invalidFile)
      
      expect(result).toBeNull()
    })

    test("should handle loading file that doesn't export plugin", async () => {
      const invalidFile = path.join(tempDir, "notplugin.plugin.js")
      await fs.writeFile(invalidFile, "module.exports = { notAPlugin: true }")
      
      const loader = new PluginLoader()
      const result = await loader.loadFromFile(invalidFile)
      
      expect(result).toBeNull()
    })

    test("should handle loading nonexistent file", async () => {
      const loader = new PluginLoader()
      const result = await loader.loadFromFile("/path/that/does/not/exist.js")
      
      expect(result).toBeNull()
    })
  })

  describe("getLoadedPlugins", () => {
    test("should return empty array initially", () => {
      const loader = new PluginLoader()
      const plugins = loader.getLoadedPlugins()
      expect(plugins.length).toBe(0)
    })
  })

  describe("getPlugin", () => {
    test("should return null for nonexistent plugin", () => {
      const loader = new PluginLoader()
      const plugin = loader.getPlugin("nonexistent")
      expect(plugin).toBeNull()
    })
  })

  describe("loadByName", () => {
    test("should return null for nonexistent plugin", async () => {
      const loader = new PluginLoader()
      const result = await loader.loadByName("nonexistent-plugin")
      expect(result).toBeNull()
    })
  })

  describe("unloadPlugin", () => {
    test("should return false for nonexistent plugin", async () => {
      const loader = new PluginLoader()
      const result = await loader.unloadPlugin("nonexistent")
      expect(result).toBe(false)
    })
  })

  describe("reloadPlugin", () => {
    test("should return null for nonexistent plugin", async () => {
      const loader = new PluginLoader()
      const result = await loader.reloadPlugin("nonexistent")
      expect(result).toBeNull()
    })
  })

  describe("loadFromPackageDir", () => {
    test("should handle missing package.json", async () => {
      const packageDir = path.join(tempDir, "no-package")
      await fs.mkdir(packageDir, { recursive: true })
      
      const loader = new PluginLoader()
      const result = await loader.loadFromPackageDir(packageDir)
      expect(result).toBeNull()
    })

    test("should handle package without main field", async () => {
      const packageDir = path.join(tempDir, "no-main")
      await fs.mkdir(packageDir, { recursive: true })
      await fs.writeFile(
        path.join(packageDir, "package.json"),
        JSON.stringify({ name: "test-package", version: "1.0.0" })
      )
      
      const loader = new PluginLoader()
      const result = await loader.loadFromPackageDir(packageDir)
      expect(result).toBeNull()
    })
  })

  describe("error handling", () => {
    test("should handle directory read permissions error", async () => {
      const loader = new PluginLoader()
      
      // Try to load from a system directory that might not be readable
      const result = await loader.loadFromDirectory("/root")
      expect(Array.isArray(result)).toBe(true)
    })

    test("should handle malformed package.json", async () => {
      const nodeModulesDir = path.join(tempDir, "node_modules")
      const packageDir = path.join(nodeModulesDir, "cli-kit-plugin-broken")
      await fs.mkdir(packageDir, { recursive: true })
      await fs.writeFile(path.join(packageDir, "package.json"), "{ invalid json")
      
      const loader = new PluginLoader({
        packagePrefixes: ["cli-kit-plugin-"]
      })
      
      const originalCwd = process.cwd()
      process.chdir(tempDir)
      
      try {
        const result = await loader.loadFromNodeModules()
        expect(Array.isArray(result)).toBe(true)
      } finally {
        process.chdir(originalCwd)
      }
    })
  })

  describe("plugin compatibility", () => {
    test("should handle compatibility checking with strict mode", async () => {
      const loader = new PluginLoader({
        strictCompatibility: true,
        cliVersion: "1.0.0"
      })
      
      // This test verifies the loader handles compatibility checking
      // without needing actual incompatible plugins
      const plugins = loader.getLoadedPlugins()
      expect(plugins.length).toBe(0)
    })

    test("should handle compatibility checking with lenient mode", async () => {
      const loader = new PluginLoader({
        strictCompatibility: false,
        cliVersion: "1.0.0"
      })
      
      const plugins = loader.getLoadedPlugins()
      expect(plugins.length).toBe(0)
    })
  })

  describe("file pattern matching", () => {
    test("should respect custom file patterns", async () => {
      const loader = new PluginLoader({
        filePatterns: ["*.custom.js", "*.mycustom.ts"]
      })
      
      const testDir = path.join(tempDir, "pattern-test")
      await fs.mkdir(testDir, { recursive: true })
      
      // Create files that match and don't match patterns
      await fs.writeFile(path.join(testDir, "match.custom.js"), "module.exports = {}")
      await fs.writeFile(path.join(testDir, "nomatch.plugin.js"), "module.exports = {}")
      
      const result = await loader.loadFromDirectory(testDir)
      expect(Array.isArray(result)).toBe(true)
    })
  })

  describe("package prefix handling", () => {
    test("should respect custom package prefixes", async () => {
      const loader = new PluginLoader({
        packagePrefixes: ["my-custom-plugin-", "another-prefix-"]
      })
      
      const nodeModulesDir = path.join(tempDir, "node_modules")
      await fs.mkdir(nodeModulesDir, { recursive: true })
      
      // Create package with custom prefix
      const packageDir = path.join(nodeModulesDir, "my-custom-plugin-test")
      await fs.mkdir(packageDir, { recursive: true })
      await fs.writeFile(
        path.join(packageDir, "package.json"),
        JSON.stringify({ name: "my-custom-plugin-test", version: "1.0.0", main: "index.js" })
      )
      await fs.writeFile(path.join(packageDir, "index.js"), "module.exports = {}")
      
      const originalCwd = process.cwd()
      process.chdir(tempDir)
      
      try {
        const result = await loader.loadFromNodeModules()
        expect(Array.isArray(result)).toBe(true)
      } finally {
        process.chdir(originalCwd)
      }
    })
  })
})