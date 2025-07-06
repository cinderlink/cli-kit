/**
 * Tests for core/types.ts - Core framework types and interfaces
 */

import { describe, it, expect } from "bun:test"
import { Effect, Stream, Data } from "effect"
import {
  type View,
  type Component,
  type Cmd,
  type Sub,
  type SystemMsg,
  type ComponentMsg,
  type MouseEvent,
  type WindowSize,
  type AppOptions,
  type Viewport,
  type TerminalCapabilities,
  type Program,
  type RuntimeState,
  type ModelOf,
  type MsgOf,
  TerminalError,
  InputError,
  RenderError,
  StorageError,
  type AppError,
  type TerminalService,
  type InputService,
  type RendererService,
  type StorageService,
  type AppServices
} from "@/core/types"

describe("Core Types", () => {
  describe("View Interface", () => {
    it("creates a valid view with render function", () => {
      const view: View = {
        render: () => Effect.succeed("test"),
        width: 10,
        height: 2
      }
      
      expect(view.width).toBe(10)
      expect(view.height).toBe(2)
      expect(typeof view.render).toBe("function")
    })

    it("creates view with only render function", () => {
      const view: View = {
        render: () => Effect.succeed("minimal")
      }
      
      expect(view.width).toBeUndefined()
      expect(view.height).toBeUndefined()
      expect(typeof view.render).toBe("function")
    })

    it("view render returns Effect", async () => {
      const view: View = {
        render: () => Effect.succeed("rendered content")
      }
      
      const result = await Effect.runPromise(view.render())
      expect(result).toBe("rendered content")
    })
  })

  describe("Component Interface", () => {
    type TestModel = { count: number }
    type TestMsg = { type: 'increment' } | { type: 'decrement' }

    const testComponent: Component<TestModel, TestMsg> = {
      init: Effect.succeed([{ count: 0 }, []]),
      
      update: (msg, model) => {
        switch (msg.type) {
          case 'increment':
            return Effect.succeed([{ count: model.count + 1 }, []])
          case 'decrement':
            return Effect.succeed([{ count: model.count - 1 }, []])
        }
      },
      
      view: (model) => ({
        render: () => Effect.succeed(`Count: ${model.count}`)
      })
    }

    it("has required component methods", () => {
      expect(typeof testComponent.init).toBe("object") // Effect is an object
      expect(typeof testComponent.update).toBe("function")
      expect(typeof testComponent.view).toBe("function")
    })

    it("init returns model and commands", async () => {
      const [model, commands] = await Effect.runPromise(testComponent.init)
      expect(model.count).toBe(0)
      expect(commands).toHaveLength(0)
    })

    it("update processes messages correctly", async () => {
      const initialModel = { count: 5 }
      const [updatedModel, commands] = await Effect.runPromise(
        testComponent.update({ type: 'increment' }, initialModel)
      )
      
      expect(updatedModel.count).toBe(6)
      expect(commands).toHaveLength(0)
    })

    it("view renders model", async () => {
      const model = { count: 42 }
      const view = testComponent.view(model)
      const result = await Effect.runPromise(view.render())
      
      expect(result).toBe("Count: 42")
    })

    it("handles component with subscriptions", () => {
      const componentWithSubs: Component<TestModel, TestMsg> = {
        ...testComponent,
        subscriptions: () => Effect.succeed(Stream.empty)
      }
      
      expect(typeof componentWithSubs.subscriptions).toBe("function")
    })
  })

  describe("System Messages", () => {
    it("creates KeyPress system message", () => {
      const msg: SystemMsg = {
        _tag: 'KeyPress',
        key: {
          type: 'char',
          value: 'a',
          ctrl: false,
          alt: false,
          shift: false
        }
      }
      
      expect(msg._tag).toBe('KeyPress')
      expect(msg.key.value).toBe('a')
    })

    it("creates MouseEvent system message", () => {
      const mouseEvent: MouseEvent = {
        type: 'press',
        button: 'left',
        x: 10,
        y: 20,
        ctrl: false,
        alt: false,
        shift: false
      }
      
      const msg: SystemMsg = {
        _tag: 'MouseEvent',
        mouse: mouseEvent
      }
      
      expect(msg._tag).toBe('MouseEvent')
      expect(msg.mouse.x).toBe(10)
      expect(msg.mouse.y).toBe(20)
    })

    it("creates WindowResize system message", () => {
      const size: WindowSize = {
        width: 80,
        height: 24
      }
      
      const msg: SystemMsg = {
        _tag: 'WindowResize',
        size
      }
      
      expect(msg._tag).toBe('WindowResize')
      expect(msg.size.width).toBe(80)
      expect(msg.size.height).toBe(24)
    })

    it("creates other system messages", () => {
      const quitMsg: SystemMsg = { _tag: 'Quit' }
      const interruptMsg: SystemMsg = { _tag: 'Interrupt' }
      const suspendMsg: SystemMsg = { _tag: 'Suspend' }
      const focusMsg: SystemMsg = { _tag: 'Focus', componentId: 'test' }
      const blurMsg: SystemMsg = { _tag: 'Blur' }
      
      expect(quitMsg._tag).toBe('Quit')
      expect(interruptMsg._tag).toBe('Interrupt')
      expect(suspendMsg._tag).toBe('Suspend')
      expect(focusMsg._tag).toBe('Focus')
      expect(focusMsg.componentId).toBe('test')
      expect(blurMsg._tag).toBe('Blur')
    })
  })

  describe("Component Messages", () => {
    type CustomMsg = { type: 'custom'; data: string }

    it("combines system and custom messages", () => {
      const systemMsg: ComponentMsg<CustomMsg> = { _tag: 'Quit' }
      const customMsg: ComponentMsg<CustomMsg> = { type: 'custom', data: 'test' }
      
      expect(systemMsg._tag).toBe('Quit')
      expect(customMsg.type).toBe('custom')
      expect(customMsg.data).toBe('test')
    })
  })

  describe("Input Events", () => {
    it("creates MouseEvent", () => {
      const mouseEvent: MouseEvent = {
        type: 'wheel',
        button: 'wheel-up',
        x: 50,
        y: 30,
        ctrl: true,
        alt: false,
        shift: true
      }
      
      expect(mouseEvent.type).toBe('wheel')
      expect(mouseEvent.button).toBe('wheel-up')
      expect(mouseEvent.ctrl).toBe(true)
      expect(mouseEvent.shift).toBe(true)
    })

    it("creates WindowSize", () => {
      const size: WindowSize = {
        width: 120,
        height: 40
      }
      
      expect(size.width).toBe(120)
      expect(size.height).toBe(40)
    })
  })

  describe("Application Configuration", () => {
    it("creates AppOptions with all properties", () => {
      const options: AppOptions = {
        alternateScreen: true,
        mouse: true,
        fps: 60,
        exitKeys: ['q', 'esc'],
        debug: true
      }
      
      expect(options.alternateScreen).toBe(true)
      expect(options.mouse).toBe(true)
      expect(options.fps).toBe(60)
      expect(options.exitKeys).toHaveLength(2)
      expect(options.debug).toBe(true)
    })

    it("creates minimal AppOptions", () => {
      const options: AppOptions = {}
      
      expect(options.alternateScreen).toBeUndefined()
      expect(options.mouse).toBeUndefined()
    })

    it("creates Viewport", () => {
      const viewport: Viewport = {
        x: 10,
        y: 5,
        width: 80,
        height: 20
      }
      
      expect(viewport.x).toBe(10)
      expect(viewport.y).toBe(5)
      expect(viewport.width).toBe(80)
      expect(viewport.height).toBe(20)
    })

    it("creates TerminalCapabilities", () => {
      const capabilities: TerminalCapabilities = {
        colors: 'truecolor',
        unicode: true,
        mouse: true,
        alternateScreen: true,
        cursorShapes: false
      }
      
      expect(capabilities.colors).toBe('truecolor')
      expect(capabilities.unicode).toBe(true)
      expect(capabilities.cursorShapes).toBe(false)
    })
  })

  describe("Error Types", () => {
    it("creates TerminalError", () => {
      const error = new TerminalError({
        operation: "clear",
        cause: new Error("Terminal not available")
      })
      
      expect(error._tag).toBe("TerminalError")
      expect(error.operation).toBe("clear")
      expect(error.cause).toBeInstanceOf(Error)
      expect(error.stack).toBeDefined()
    })

    it("creates TerminalError without cause", () => {
      const error = new TerminalError({
        operation: "resize"
      })
      
      expect(error._tag).toBe("TerminalError")
      expect(error.operation).toBe("resize")
      expect(error.cause).toBeUndefined()
    })

    it("creates InputError with all device types", () => {
      const keyboardError = new InputError({
        device: "keyboard",
        cause: new Error("Keyboard not ready")
      })
      
      const mouseError = new InputError({
        device: "mouse"
      })
      
      const terminalError = new InputError({
        device: "terminal",
        cause: "Terminal disconnected"
      })
      
      expect(keyboardError._tag).toBe("InputError")
      expect(keyboardError.device).toBe("keyboard")
      expect(keyboardError.cause).toBeInstanceOf(Error)
      
      expect(mouseError._tag).toBe("InputError")
      expect(mouseError.device).toBe("mouse")
      expect(mouseError.cause).toBeUndefined()
      
      expect(terminalError._tag).toBe("InputError")
      expect(terminalError.device).toBe("terminal")
      expect(terminalError.cause).toBe("Terminal disconnected")
    })

    it("creates RenderError with all phases", () => {
      const renderError = new RenderError({
        component: "TestComponent",
        phase: "render",
        cause: new Error("Render failed")
      })
      
      const layoutError = new RenderError({
        phase: "layout"
      })
      
      const paintError = new RenderError({
        component: "PaintComponent",
        phase: "paint",
        cause: "Paint operation failed"
      })
      
      expect(renderError._tag).toBe("RenderError")
      expect(renderError.component).toBe("TestComponent")
      expect(renderError.phase).toBe("render")
      expect(renderError.cause).toBeInstanceOf(Error)
      
      expect(layoutError._tag).toBe("RenderError")
      expect(layoutError.phase).toBe("layout")
      expect(layoutError.component).toBeUndefined()
      
      expect(paintError._tag).toBe("RenderError")
      expect(paintError.component).toBe("PaintComponent")
      expect(paintError.phase).toBe("paint")
      expect(paintError.cause).toBe("Paint operation failed")
    })

    it("creates StorageError with all operations", () => {
      const readError = new StorageError({
        operation: "read",
        path: "/config/app.json",
        cause: new Error("File not found")
      })
      
      const writeError = new StorageError({
        operation: "write",
        path: "/tmp/state.json"
      })
      
      const deleteError = new StorageError({
        operation: "delete",
        cause: "Permission denied"
      })
      
      expect(readError._tag).toBe("StorageError")
      expect(readError.operation).toBe("read")
      expect(readError.path).toBe("/config/app.json")
      expect(readError.cause).toBeInstanceOf(Error)
      
      expect(writeError._tag).toBe("StorageError")
      expect(writeError.operation).toBe("write")
      expect(writeError.path).toBe("/tmp/state.json")
      expect(writeError.cause).toBeUndefined()
      
      expect(deleteError._tag).toBe("StorageError")
      expect(deleteError.operation).toBe("delete")
      expect(deleteError.path).toBeUndefined()
      expect(deleteError.cause).toBe("Permission denied")
    })

    it("error types can be used in union", () => {
      const errors: AppError[] = [
        new TerminalError({ operation: "init" }),
        new InputError({ device: "mouse" }),
        new RenderError({ phase: "layout" }),
        new StorageError({ operation: "read" })
      ]
      
      expect(errors).toHaveLength(4)
      expect(errors[0]!._tag).toBe("TerminalError")
      expect(errors[1]!._tag).toBe("InputError")
      expect(errors[2]!._tag).toBe("RenderError")
      expect(errors[3]!._tag).toBe("StorageError")
    })

    it("errors inherit from Error class", () => {
      const terminalError = new TerminalError({ operation: "test" })
      const inputError = new InputError({ device: "keyboard" })
      const renderError = new RenderError({ phase: "render" })
      const storageError = new StorageError({ operation: "read" })
      
      expect(terminalError).toBeInstanceOf(Error)
      expect(inputError).toBeInstanceOf(Error)
      expect(renderError).toBeInstanceOf(Error)
      expect(storageError).toBeInstanceOf(Error)
    })

    it("errors can be thrown and caught", () => {
      expect(() => {
        throw new TerminalError({ operation: "failed" })
      }).toThrow()
      
      try {
        throw new InputError({ device: "keyboard", cause: "test error" })
      } catch (error) {
        expect(error).toBeInstanceOf(InputError)
        if (error instanceof InputError) {
          expect(error.device).toBe("keyboard")
          expect(error.cause).toBe("test error")
        }
      }
    })
  })

  describe("Utility Types", () => {
    type TestModel = { value: string }
    type TestMsg = { type: 'test' }
    
    const testComponent: Component<TestModel, TestMsg> = {
      init: Effect.succeed([{ value: "test" }, []]),
      update: (msg, model) => Effect.succeed([model, []]),
      view: (model) => ({ render: () => Effect.succeed(model.value) })
    }

    it("extracts model type", () => {
      type ExtractedModel = ModelOf<typeof testComponent>
      const model: ExtractedModel = { value: "extracted" }
      
      expect(model.value).toBe("extracted")
    })

    it("extracts message type", () => {
      type ExtractedMsg = MsgOf<typeof testComponent>
      const msg: ExtractedMsg = { type: 'test' }
      
      expect(msg.type).toBe('test')
    })

    it("creates Program", () => {
      const program: Program<TestModel, TestMsg> = {
        ...testComponent,
        options: {
          fps: 30,
          debug: true
        }
      }
      
      expect(program.options?.fps).toBe(30)
      expect(program.options?.debug).toBe(true)
    })

    it("creates RuntimeState", () => {
      const runtime: RuntimeState<TestModel> = {
        model: { value: "runtime" },
        running: true,
        viewport: { x: 0, y: 0, width: 80, height: 24 },
        capabilities: {
          colors: '256',
          unicode: true,
          mouse: false,
          alternateScreen: true,
          cursorShapes: true
        }
      }
      
      expect(runtime.model.value).toBe("runtime")
      expect(runtime.running).toBe(true)
      expect(runtime.viewport.width).toBe(80)
      expect(runtime.capabilities.colors).toBe('256')
    })
  })

  describe("Effect and Stream Types", () => {
    it("creates Cmd type", () => {
      const cmd: Cmd<string> = Effect.succeed("command result")
      
      expect(typeof cmd).toBe("object") // Effect is an object
    })

    it("creates Sub type", () => {
      const sub: Sub<number> = Stream.empty
      
      expect(typeof sub).toBe("object") // Stream is an object
    })

    it("runs command effect", async () => {
      const cmd: Cmd<string> = Effect.succeed("test message")
      const result = await Effect.runPromise(cmd)
      
      expect(result).toBe("test message")
    })
  })

  describe("Type Guards and Validation", () => {
    it("validates View structure", () => {
      const validView: View = {
        render: () => Effect.succeed("test")
      }
      
      expect(typeof validView.render).toBe("function")
      expect(validView.width).toBeUndefined()
      expect(validView.height).toBeUndefined()
    })

    it("validates Component structure", () => {
      type Model = { count: number }
      type Msg = { type: 'test' }
      
      const component: Component<Model, Msg> = {
        init: Effect.succeed([{ count: 0 }, []]),
        update: (msg, model) => Effect.succeed([model, []]),
        view: (model) => ({ render: () => Effect.succeed(`${model.count}`) })
      }
      
      expect(typeof component.init).toBe("object")
      expect(typeof component.update).toBe("function")
      expect(typeof component.view).toBe("function")
    })
  })

  describe("Complex Component Scenarios", () => {
    type ComplexModel = {
      items: string[]
      selected: number
      loading: boolean
    }
    
    type ComplexMsg = 
      | { type: 'addItem'; item: string }
      | { type: 'selectItem'; index: number }
      | { type: 'startLoading' }
      | { type: 'stopLoading' }

    const complexComponent: Component<ComplexModel, ComplexMsg> = {
      init: Effect.succeed([
        { items: [], selected: -1, loading: false },
        []
      ]),
      
      update: (msg, model) => {
        switch (msg.type) {
          case 'addItem':
            return Effect.succeed([
              { ...model, items: [...model.items, msg.item] },
              []
            ])
          case 'selectItem':
            return Effect.succeed([
              { ...model, selected: msg.index },
              []
            ])
          case 'startLoading':
            return Effect.succeed([
              { ...model, loading: true },
              []
            ])
          case 'stopLoading':
            return Effect.succeed([
              { ...model, loading: false },
              []
            ])
        }
      },
      
      view: (model) => ({
        render: () => Effect.succeed(
          model.loading 
            ? "Loading..." 
            : `Items: ${model.items.length}, Selected: ${model.selected}`
        )
      }),
      
      subscriptions: () => Effect.succeed(Stream.empty)
    }

    it("handles complex state updates", async () => {
      const [initialModel] = await Effect.runPromise(complexComponent.init)
      
      const [modelAfterAdd] = await Effect.runPromise(
        complexComponent.update({ type: 'addItem', item: 'first' }, initialModel)
      )
      expect(modelAfterAdd.items).toHaveLength(1)
      expect(modelAfterAdd.items[0]).toBe('first')
      
      const [modelAfterSelect] = await Effect.runPromise(
        complexComponent.update({ type: 'selectItem', index: 0 }, modelAfterAdd)
      )
      expect(modelAfterSelect.selected).toBe(0)
      
      const [modelAfterLoading] = await Effect.runPromise(
        complexComponent.update({ type: 'startLoading' }, modelAfterSelect)
      )
      expect(modelAfterLoading.loading).toBe(true)
    })

    it("renders complex state correctly", async () => {
      const model: ComplexModel = {
        items: ['a', 'b', 'c'],
        selected: 1,
        loading: false
      }
      
      const view = complexComponent.view(model)
      const result = await Effect.runPromise(view.render())
      
      expect(result).toBe("Items: 3, Selected: 1")
    })

    it("renders loading state", async () => {
      const model: ComplexModel = {
        items: [],
        selected: -1,
        loading: true
      }
      
      const view = complexComponent.view(model)
      const result = await Effect.runPromise(view.render())
      
      expect(result).toBe("Loading...")
    })
  })
})