/**
 * JSX Runtime Tests
 */

import { test, describe, expect } from "bun:test"
import { jsx, jsxs, Fragment, createElement } from "../../../src/jsx-runtime"
import { Effect } from "effect"
import { style } from "../../../src/styling"

describe("JSX Runtime", () => {
  describe("jsx function", () => {
    test("creates text element", () => {
      const element = jsx("text", { children: "Hello World" })
      expect(element).toBeDefined()
      expect(typeof element.render).toBe("function")
    })

    test("creates span element", () => {
      const element = jsx("span", { children: "Hello World" })
      expect(element).toBeDefined()
      expect(typeof element.render).toBe("function")
    })

    test("creates styled elements", () => {
      const boldElement = jsx("bold", { children: "Bold text" })
      const italicElement = jsx("italic", { children: "Italic text" })
      const underlineElement = jsx("underline", { children: "Underlined text" })
      
      expect(boldElement).toBeDefined()
      expect(italicElement).toBeDefined()
      expect(underlineElement).toBeDefined()
    })

    test("creates color elements", () => {
      const redElement = jsx("red", { children: "Red text" })
      const greenElement = jsx("green", { children: "Green text" })
      const blueElement = jsx("blue", { children: "Blue text" })
      
      expect(redElement).toBeDefined()
      expect(greenElement).toBeDefined()
      expect(blueElement).toBeDefined()
    })

    test("creates semantic elements", () => {
      const errorElement = jsx("error", { children: "Error message" })
      const successElement = jsx("success", { children: "Success message" })
      const warningElement = jsx("warning", { children: "Warning message" })
      const infoElement = jsx("info", { children: "Info message" })
      
      expect(errorElement).toBeDefined()
      expect(successElement).toBeDefined()
      expect(warningElement).toBeDefined()
      expect(infoElement).toBeDefined()
    })

    test("creates layout elements", () => {
      const vstackElement = jsx("vstack", { 
        children: [
          jsx("text", { children: "Line 1" }),
          jsx("text", { children: "Line 2" })
        ]
      })
      
      const hstackElement = jsx("hstack", {
        children: [
          jsx("text", { children: "Left" }),
          jsx("text", { children: "Right" })
        ]
      })
      
      expect(vstackElement).toBeDefined()
      expect(hstackElement).toBeDefined()
    })

    test("creates panel element", () => {
      const panelElement = jsx("panel", {
        title: "Test Panel",
        children: jsx("text", { children: "Panel content" })
      })
      
      expect(panelElement).toBeDefined()
    })

    test("handles string children", () => {
      const element = jsx("text", { children: "Simple string" })
      expect(element).toBeDefined()
    })

    test("handles array children", () => {
      const element = jsx("vstack", {
        children: [
          jsx("text", { children: "Item 1" }),
          jsx("text", { children: "Item 2" }),
          jsx("text", { children: "Item 3" })
        ]
      })
      
      expect(element).toBeDefined()
    })

    test("handles nested elements", () => {
      const element = jsx("vstack", {
        children: [
          jsx("text", { children: "Header" }),
          jsx("hstack", {
            children: [
              jsx("text", { children: "Left" }),
              jsx("text", { children: "Right" })
            ]
          }),
          jsx("text", { children: "Footer" })
        ]
      })
      
      expect(element).toBeDefined()
    })

    test("handles empty children", () => {
      const element = jsx("vstack", { children: [] })
      expect(element).toBeDefined()
    })

    test("handles null children", () => {
      const element = jsx("text", { children: null })
      expect(element).toBeDefined()
    })

    test("handles undefined children", () => {
      const element = jsx("text", { children: undefined })
      expect(element).toBeDefined()
    })
  })

  describe("jsxs function", () => {
    test("creates elements with multiple children", () => {
      const element = jsxs("vstack", {
        children: [
          jsx("text", { children: "First" }),
          jsx("text", { children: "Second" }),
          jsx("text", { children: "Third" })
        ]
      })
      
      expect(element).toBeDefined()
    })

    test("behaves same as jsx for single child", () => {
      const jsxElement = jsx("text", { children: "Hello" })
      const jsxsElement = jsxs("text", { children: "Hello" })
      
      // Both should create valid elements
      expect(jsxElement).toBeDefined()
      expect(jsxsElement).toBeDefined()
    })
  })

  describe("Fragment", () => {
    test("creates fragment element", () => {
      const fragment = jsx(Fragment, {
        children: [
          jsx("text", { children: "First" }),
          jsx("text", { children: "Second" })
        ]
      })
      
      expect(fragment).toBeDefined()
    })

    test("handles empty fragment", () => {
      const fragment = jsx(Fragment, { children: [] })
      expect(fragment).toBeDefined()
    })
  })

  describe("element rendering", () => {
    test("renders text elements", async () => {
      const element = jsx("text", { children: "Hello World" })
      const result = await Effect.runPromise(element.render())
      expect(result).toBe("Hello World")
    })

    test("renders styled text", async () => {
      const element = jsx("bold", { children: "Bold text" })
      const result = await Effect.runPromise(element.render())
      expect(result).toContain("Bold text")
      expect(result).toMatch(/\x1b\[1m.*\x1b\[0m/) // Should contain bold ANSI codes
    })

    test("renders color text", async () => {
      const element = jsx("red", { children: "Red text" })
      const result = await Effect.runPromise(element.render())
      expect(result).toContain("Red text")
      expect(result).toMatch(/\x1b\[31m.*\x1b\[0m/) // Should contain red ANSI codes
    })

    test("renders vstack", async () => {
      const element = jsx("vstack", {
        children: [
          jsx("text", { children: "Line 1" }),
          jsx("text", { children: "Line 2" })
        ]
      })
      
      const result = await Effect.runPromise(element.render())
      expect(result).toContain("Line 1")
      expect(result).toContain("Line 2")
      expect(result).toContain("\n") // Should have newline
    })

    test("renders hstack", async () => {
      const element = jsx("hstack", {
        children: [
          jsx("text", { children: "Left" }),
          jsx("text", { children: "Right" })
        ]
      })
      
      const result = await Effect.runPromise(element.render())
      expect(result).toContain("Left")
      expect(result).toContain("Right")
      expect(result).toBe("LeftRight") // Should be joined
    })

    test("renders nested structures", async () => {
      const element = jsx("vstack", {
        children: [
          jsx("text", { children: "Header" }),
          jsx("hstack", {
            children: [
              jsx("bold", { children: "Bold" }),
              jsx("text", { children: " " }),
              jsx("italic", { children: "Italic" })
            ]
          }),
          jsx("text", { children: "Footer" })
        ]
      })
      
      const result = await Effect.runPromise(element.render())
      expect(result).toContain("Header")
      expect(result).toContain("Bold")
      expect(result).toContain("Italic")
      expect(result).toContain("Footer")
    })

    test("renders panel with title", async () => {
      const element = jsx("panel", {
        title: "Test Panel",
        children: jsx("text", { children: "Content" })
      })
      
      const result = await Effect.runPromise(element.render())
      expect(result).toContain("Test Panel")
      expect(result).toContain("Content")
    })
  })

  describe("error handling", () => {
    test("handles unknown element types gracefully", () => {
      // Should not throw, should log warning and return fallback
      const originalWarn = console.warn
      const warnings: string[] = []
      console.warn = (msg: string) => warnings.push(msg)
      
      const element = jsx("unknownelement" as any, { children: "test" })
      expect(element).toBeDefined()
      expect(warnings.length).toBeGreaterThan(0)
      
      console.warn = originalWarn
    })

    test("handles invalid props", () => {
      expect(() => {
        jsx("text", { invalidProp: "value", children: "test" } as any)
      }).not.toThrow()
    })
  })

  describe("props and styling", () => {
    test("handles style props on text elements", async () => {
      const textStyle = style().bold().italic()
      const element = jsx("text", { 
        children: "Styled text",
        style: textStyle
      })
      
      const result = await Effect.runPromise(element.render())
      expect(result).toContain("Styled text")
      expect(result).toMatch(/\x1b\[1m/) // Bold
      expect(result).toMatch(/\x1b\[3m/) // Italic
    })

    test("handles color prop on text elements", async () => {
      const element = jsx("text", { 
        children: "Colored text",
        color: "red"
      })
      
      const result = await Effect.runPromise(element.render())
      expect(result).toContain("Colored text")
      expect(result).toMatch(/\x1b\[31m/) // Red color
    })

    test("handles boolean style props", async () => {
      const element = jsx("text", { 
        children: "Multi-styled",
        bold: true,
        italic: true,
        underline: true,
        faint: true
      })
      
      const result = await Effect.runPromise(element.render())
      expect(result).toContain("Multi-styled")
      expect(result).toMatch(/\x1b\[1m/) // Bold
      expect(result).toMatch(/\x1b\[3m/) // Italic
      expect(result).toMatch(/\x1b\[4m/) // Underline
      expect(result).toMatch(/\x1b\[2m/) // Faint
    })

    test("handles number children", async () => {
      const element = jsx("text", { children: 42 })
      const result = await Effect.runPromise(element.render())
      expect(result).toBe("42")
    })

    test("handles boolean children", async () => {
      const element = jsx("text", { children: true })
      const result = await Effect.runPromise(element.render())
      expect(result).toBe("true")
    })
  })

  describe("additional styled elements", () => {
    test("creates faint element", async () => {
      const element = jsx("faint", { children: "Faint text" })
      const result = await Effect.runPromise(element.render())
      expect(result).toContain("Faint text")
      expect(result).toMatch(/\x1b\[2m.*\x1b\[0m/) // Faint ANSI codes
    })

    test("creates all color elements", async () => {
      const colors = ['red', 'green', 'blue', 'yellow', 'cyan', 'magenta', 'white', 'gray']
      
      for (const color of colors) {
        const element = jsx(color as any, { children: `${color} text` })
        const result = await Effect.runPromise(element.render())
        expect(result).toContain(`${color} text`)
      }
    })

    test("creates all semantic elements with correct colors", async () => {
      const semanticTests = [
        { type: 'error', text: 'Error message', code: '31' }, // red
        { type: 'success', text: 'Success message', code: '32' }, // green  
        { type: 'warning', text: 'Warning message', code: '33' }, // yellow
        { type: 'info', text: 'Info message', code: '34' } // blue
      ]
      
      for (const test of semanticTests) {
        const element = jsx(test.type as any, { children: test.text })
        const result = await Effect.runPromise(element.render())
        expect(result).toContain(test.text)
        expect(result).toMatch(new RegExp(`\\x1b\\[${test.code}m`)) // Correct color
        expect(result).toMatch(/\x1b\[1m/) // Bold
      }
    })
  })

  describe("layout elements edge cases", () => {
    test("handles div element (alias for vstack)", async () => {
      const element = jsx("div", {
        children: [
          jsx("text", { children: "First" }),
          jsx("text", { children: "Second" })
        ]
      })
      
      const result = await Effect.runPromise(element.render())
      expect(result).toBe("First\nSecond")
    })

    test("handles empty vstack", async () => {
      const element = jsx("vstack", { children: [] })
      const result = await Effect.runPromise(element.render())
      expect(result).toBe("")
    })

    test("handles empty hstack", async () => {
      const element = jsx("hstack", { children: [] })
      const result = await Effect.runPromise(element.render())
      expect(result).toBe("")
    })

    test("normalizes falsy children", async () => {
      const element = jsx("vstack", {
        children: [
          jsx("text", { children: "Visible" }),
          null,
          undefined,
          false,
          jsx("text", { children: "Also visible" })
        ]
      })
      
      const result = await Effect.runPromise(element.render())
      expect(result).toContain("Visible")
      expect(result).toContain("Also visible")
      expect(result).toBe("Visible\nAlso visible")
    })

    test("handles nested arrays in children", async () => {
      const element = jsx("vstack", {
        children: [
          jsx("text", { children: "First" }),
          [
            jsx("text", { children: "Nested1" }),
            jsx("text", { children: "Nested2" })
          ],
          jsx("text", { children: "Last" })
        ]
      })
      
      const result = await Effect.runPromise(element.render())
      expect(result).toContain("First")
      expect(result).toContain("Nested1")
      expect(result).toContain("Nested2")
      expect(result).toContain("Last")
    })
  })

  describe("component elements", () => {
    test("creates button with variants", async () => {
      const variants = ['primary', 'secondary', 'success', 'danger']
      
      for (const variant of variants) {
        const element = jsx("button", { 
          children: `${variant} button`,
          variant: variant as any
        })
        expect(element).toBeDefined()
        // Note: Button component rendering depends on implementation
      }
    })

    test("creates default button", () => {
      const element = jsx("button", { 
        children: "Default button"
      })
      expect(element).toBeDefined()
    })
  })

  describe("function components", () => {
    test("calls function components with props", () => {
      const MyComponent = (props: any) => {
        return jsx("text", { children: `Hello ${props.name}` })
      }
      
      const element = jsx(MyComponent, { name: "World" })
      expect(element).toBeDefined()
    })

    test("handles function components with no props", () => {
      const SimpleComponent = () => {
        return jsx("text", { children: "Simple" })
      }
      
      const element = jsx(SimpleComponent, null)
      expect(element).toBeDefined()
    })
  })

  describe("bind props processing", () => {
    test("handles bind props with mock runes", () => {
      // This test just verifies that bind props don't crash the jsx function
      // Even with non-rune values, it should still work
      const element = jsx("text", { 
        children: "test",
        'bind:value': 'some value'
      })
      expect(element).toBeDefined()
    })

    test("handles regular bind props", () => {
      const element = jsx("text", { 
        children: "test",
        'bind:value': 'regular value'
      })
      expect(element).toBeDefined()
    })
  })

  describe("createElement (classic JSX)", () => {
    test("creates elements with createElement", async () => {
      const element = createElement("text", null, "Hello from createElement")
      const result = await Effect.runPromise(element.render())
      expect(result).toBe("Hello from createElement")
    })

    test("handles multiple children in createElement", async () => {
      const element = createElement(
        "vstack",
        null,
        createElement("text", null, "First"),
        createElement("text", null, "Second")
      )
      
      const result = await Effect.runPromise(element.render())
      expect(result).toContain("First")
      expect(result).toContain("Second")
    })

    test("handles props in createElement", async () => {
      const element = createElement("text", { color: "red" }, "Red text")
      const result = await Effect.runPromise(element.render())
      expect(result).toContain("Red text")
      expect(result).toMatch(/\x1b\[31m/) // Red color
    })
  })

  describe("Fragment edge cases", () => {
    test("Fragment with null children", async () => {
      const fragment = Fragment({ children: null })
      const result = await Effect.runPromise(fragment.render())
      expect(result).toBe("")
    })

    test("Fragment with undefined children", async () => {
      const fragment = Fragment({ children: undefined })
      const result = await Effect.runPromise(fragment.render())
      expect(result).toBe("")
    })

    test("Fragment with mixed children", async () => {
      const fragment = Fragment({
        children: [
          jsx("text", { children: "Text" }),
          "String",
          42,
          null,
          jsx("bold", { children: "Bold" })
        ]
      })
      
      const result = await Effect.runPromise(fragment.render())
      expect(result).toContain("Text")
      expect(result).toContain("String")
      expect(result).toContain("42")
      expect(result).toContain("Bold")
    })
  })

  describe("TypeScript support", () => {
    test("element types are properly typed", () => {
      // These should not cause TypeScript errors
      const textElement = jsx("text", { children: "text" })
      const boldElement = jsx("bold", { children: "bold" })
      const vstackElement = jsx("vstack", { children: [] })
      const panelElement = jsx("panel", { title: "title", children: "content" })
      
      expect(textElement).toBeDefined()
      expect(boldElement).toBeDefined()
      expect(vstackElement).toBeDefined()
      expect(panelElement).toBeDefined()
    })
  })
})