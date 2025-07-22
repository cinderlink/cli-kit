import { test, expect, describe } from "bun:test"
import { update } from "./update"
import { initAppModel } from "./model"
import type { AppModel, AppMsg } from "./model"

describe("CLI MVU Update", () => {
  describe("CLI State Updates", () => {
    test("SetCLIConfig updates config", () => {
      const model = initAppModel()
      const msg: AppMsg = {
        type: "SetCLIConfig",
        config: { name: "test-cli", version: "1.0.0" }
      }
      
      const [newModel] = update(msg, model)
      
      expect(newModel.cli.config.name).toBe("test-cli")
      expect(newModel.cli.config.version).toBe("1.0.0")
    })

    test("StartCLI sets running state", () => {
      const model = initAppModel()
      const msg: AppMsg = { type: "StartCLI" }
      
      const [newModel] = update(msg, model)
      
      expect(newModel.cli.isRunning).toBe(true)
      expect(newModel.cli.exitCode).toBe(null)
    })

    test("StopCLI sets exit code", () => {
      const model = { ...initAppModel(), cli: { ...initAppModel().cli, isRunning: true } }
      const msg: AppMsg = { type: "StopCLI", exitCode: 0 }
      
      const [newModel] = update(msg, model)
      
      expect(newModel.cli.isRunning).toBe(false)
      expect(newModel.cli.exitCode).toBe(0)
    })

    test("ResetCLI clears all state", () => {
      const model: AppModel = {
        ...initAppModel(),
        cli: {
          config: { name: "test", version: "1.0.0" },
          isRunning: true,
          exitCode: 1
        }
      }
      const msg: AppMsg = { type: "ResetCLI" }
      
      const [newModel] = update(msg, model)
      
      expect(newModel.cli.config).toEqual({})
      expect(newModel.cli.isRunning).toBe(false)
      expect(newModel.cli.exitCode).toBe(null)
    })
  })

  describe("Command State Updates", () => {
    test("SetCommandPath updates active path", () => {
      const model = initAppModel()
      const msg: AppMsg = {
        type: "SetCommandPath",
        path: ["dev", "start"]
      }
      
      const [newModel, cmds] = update(msg, model)
      
      expect(newModel.commands.activePath).toEqual(["dev", "start"])
      expect(cmds.length).toBe(1) // Should have scope activation effect
    })

    test("ExecuteCommand sets context", () => {
      const model = initAppModel()
      const context = {
        args: { port: 3000 },
        flags: { verbose: true },
        path: ["dev", "start"]
      }
      const msg: AppMsg = {
        type: "ExecuteCommand",
        path: ["dev", "start"],
        context
      }
      
      const [newModel, cmds] = update(msg, model)
      
      expect(newModel.commands.activePath).toEqual(["dev", "start"])
      expect(newModel.commands.context).toEqual(context)
      expect(cmds.length).toBe(1) // Should have execution effect
    })

    test("ResetCommandContext clears context", () => {
      const model: AppModel = {
        ...initAppModel(),
        commands: {
          activePath: ["test"],
          context: { args: {}, flags: {}, path: ["test"] }
        }
      }
      const msg: AppMsg = { type: "ResetCommandContext" }
      
      const [newModel] = update(msg, model)
      
      expect(newModel.commands.context).toBe(null)
      expect(newModel.commands.activePath).toEqual(["test"]) // Path remains
    })
  })

  describe("Plugin State Updates", () => {
    test("RegisterPlugin adds new plugin", () => {
      const model = initAppModel()
      const plugin = {
        metadata: {
          name: "test-plugin",
          version: "1.0.0",
          dependencies: []
        }
      }
      const msg: AppMsg = {
        type: "RegisterPlugin",
        plugin: plugin as any,
        config: { enabled: true }
      }
      
      const [newModel] = update(msg, model)
      
      expect(newModel.plugins.plugins.has("test-plugin")).toBe(true)
      const registered = newModel.plugins.plugins.get("test-plugin")
      expect(registered?.plugin).toBe(plugin)
      expect(registered?.enabled).toBe(true)
      expect(registered?.config).toEqual({ enabled: true })
    })

    test("EnablePlugin sets enabled flag", () => {
      const model = initAppModel()
      // First register
      model.plugins.plugins.set("test-plugin", {
        plugin: {} as any,
        enabled: false,
        loadTime: new Date(),
        dependencies: [],
        dependents: []
      })
      
      const msg: AppMsg = {
        type: "EnablePlugin",
        name: "test-plugin"
      }
      
      const [newModel] = update(msg, model)
      
      const plugin = newModel.plugins.plugins.get("test-plugin")
      expect(plugin?.enabled).toBe(true)
    })

    test("DisablePlugin clears enabled flag", () => {
      const model = initAppModel()
      // First register
      model.plugins.plugins.set("test-plugin", {
        plugin: {} as any,
        enabled: true,
        loadTime: new Date(),
        dependencies: [],
        dependents: []
      })
      
      const msg: AppMsg = {
        type: "DisablePlugin",
        name: "test-plugin"
      }
      
      const [newModel] = update(msg, model)
      
      const plugin = newModel.plugins.plugins.get("test-plugin")
      expect(plugin?.enabled).toBe(false)
    })

    test("UnregisterPlugin removes plugin", () => {
      const model = initAppModel()
      // First register
      model.plugins.plugins.set("test-plugin", {
        plugin: {} as any,
        enabled: true,
        loadTime: new Date(),
        dependencies: [],
        dependents: []
      })
      
      const msg: AppMsg = {
        type: "UnregisterPlugin",
        name: "test-plugin"
      }
      
      const [newModel] = update(msg, model)
      
      expect(newModel.plugins.plugins.has("test-plugin")).toBe(false)
    })
  })

  describe("Debug State Updates", () => {
    test("UpdateDebugTab changes active tab", () => {
      const model = initAppModel()
      const msg: AppMsg = {
        type: "UpdateDebugTab",
        tab: "logs"
      }
      
      const [newModel] = update(msg, model)
      
      expect(newModel.debug.activeTab).toBe("logs")
    })

    test("ToggleDebugVisibility toggles visibility", () => {
      const model = initAppModel()
      const msg: AppMsg = { type: "ToggleDebugVisibility" }
      
      const [newModel] = update(msg, model)
      
      expect(newModel.debug.isVisible).toBe(true) // Was false initially
    })

    test("AddDebugLog adds log with limit", () => {
      const model = initAppModel()
      
      // Add 105 logs
      let currentModel = model
      for (let i = 0; i < 105; i++) {
        const msg: AppMsg = {
          type: "AddDebugLog",
          message: `Log ${i}`
        }
        const [newModel] = update(msg, currentModel)
        currentModel = newModel
      }
      
      // Should only keep last 100
      expect(currentModel.debug.logs.length).toBe(100)
      expect(currentModel.debug.logs[0]).toBe("Log 5")
      expect(currentModel.debug.logs[99]).toBe("Log 104")
    })

    test("UpdateDebugPerformance calculates average", () => {
      const model = initAppModel()
      
      // Add some render times
      const [model1] = update({ type: "UpdateDebugPerformance", renderTime: 10 }, model)
      const [model2] = update({ type: "UpdateDebugPerformance", renderTime: 20 }, model1)
      const [model3] = update({ type: "UpdateDebugPerformance", renderTime: 30 }, model2)
      
      expect(model3.debug.performance.renderCount).toBe(3)
      expect(model3.debug.performance.lastRenderTime).toBe(30)
      expect(model3.debug.performance.avgRenderTime).toBe(20) // (10 + 20 + 30) / 3
    })
  })
})