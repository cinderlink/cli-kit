/**
 * Tests for JSX runtime functions
 * Covers jsx(), jsxs(), Fragment, and createElement
 */

import { test, expect, describe } from "bun:test"
import { jsx, jsxs, Fragment, createElement } from "../runtime"
import { text, vstack, hstack } from "../runtime/view-factory"
import type { JSX } from "../types"

describe("JSX Runtime", () => {
  describe("jsx() function", () => {
    test("should create text elements", () => {
      const element = jsx("text", { children: "Hello World" })
      expect(element.render()).toBe("Hello World")
    })

    test("should create span elements", () => {
      const element = jsx("span", { children: "Hello Span" })
      expect(element.render()).toBe("Hello Span")
    })

    test("should handle empty text", () => {
      const element = jsx("text", { children: "" })
      expect(element.render()).toBe("")
    })

    test("should handle null/undefined children", () => {
      const element1 = jsx("text", { children: null })
      const element2 = jsx("text", { children: undefined })
      expect(element1.render()).toBe("")
      expect(element2.render()).toBe("")
    })

    test("should handle boolean children", () => {
      const element1 = jsx("text", { children: true })
      const element2 = jsx("text", { children: false })
      expect(element1.render()).toBe("")
      expect(element2.render()).toBe("")
    })

    test("should handle number children", () => {
      const element = jsx("text", { children: 42 })
      expect(element.render()).toBe("42")
    })

    test("should handle array children", () => {
      const element = jsx("text", { children: ["Hello", " ", "World"] })
      expect(element.render()).toBe("Hello World")
    })

    test("should create vstack elements", () => {
      const child1 = text("Line 1")
      const child2 = text("Line 2")
      const element = jsx("vstack", { children: [child1, child2] })
      expect(element.render()).toBe("Line 1\nLine 2")
    })

    test("should create div elements (as vstack)", () => {
      const child1 = text("Line 1")
      const child2 = text("Line 2")
      const element = jsx("div", { children: [child1, child2] })
      expect(element.render()).toBe("Line 1\nLine 2")
    })

    test("should create hstack elements", () => {
      const child1 = text("Item 1")
      const child2 = text("Item 2")
      const element = jsx("hstack", { children: [child1, child2] })
      expect(element.render()).toBe("Item 1 Item 2")
    })

    test("should handle empty vstack", () => {
      const element = jsx("vstack", { children: [] })
      expect(element.render()).toBe("")
    })

    test("should handle empty hstack", () => {
      const element = jsx("hstack", { children: [] })
      expect(element.render()).toBe("")
    })

    test("should create styled text elements", () => {
      const boldElement = jsx("bold", { children: "Bold Text" })
      const italicElement = jsx("italic", { children: "Italic Text" })
      const underlineElement = jsx("underline", { children: "Underlined Text" })
      const faintElement = jsx("faint", { children: "Faint Text" })

      // Check that styled elements render their content
      expect(boldElement.render()).toContain("Bold Text")
      expect(italicElement.render()).toContain("Italic Text")
      expect(underlineElement.render()).toContain("Underlined Text")
      expect(faintElement.render()).toContain("Faint Text")
    })

    test("should create colored text elements", () => {
      const redElement = jsx("red", { children: "Red Text" })
      const greenElement = jsx("green", { children: "Green Text" })
      const blueElement = jsx("blue", { children: "Blue Text" })

      expect(redElement.render()).toContain("Red Text")
      expect(greenElement.render()).toContain("Green Text")
      expect(blueElement.render()).toContain("Blue Text")
    })

    test("should create semantic text elements", () => {
      const errorElement = jsx("error", { children: "Error Message" })
      const successElement = jsx("success", { children: "Success Message" })
      const warningElement = jsx("warning", { children: "Warning Message" })
      const infoElement = jsx("info", { children: "Info Message" })

      expect(errorElement.render()).toContain("Error Message")
      expect(successElement.render()).toContain("Success Message")
      expect(warningElement.render()).toContain("Warning Message")
      expect(infoElement.render()).toContain("Info Message")
    })

    test("should handle style props on text elements", () => {
      const element = jsx("text", { 
        children: "Styled Text",
        bold: true,
        italic: true,
        color: "red"
      })
      expect(element.render()).toContain("Styled Text")
    })

    test("should handle function components", () => {
      const TestComponent = (props: { message: string }) => {
        return text(props.message)
      }
      
      const element = jsx(TestComponent, { message: "Function Component" })
      expect(element.render()).toBe("Function Component")
    })

    test("should handle CLI components (invisible)", () => {
      const element = jsx("CLI", { name: "test-cli", version: "1.0.0" })
      expect(element.render()).toBe("")
    })

    test("should handle Command components (invisible)", () => {
      const element = jsx("Command", { name: "test-command" })
      expect(element.render()).toBe("")
    })

    test("should handle Plugin components (invisible)", () => {
      const element = jsx("Plugin", { name: "test-plugin" })
      expect(element.render()).toBe("")
    })

    test("should handle RegisterPlugin components (invisible)", () => {
      const mockPlugin = { name: "mock-plugin" }
      const element = jsx("RegisterPlugin", { plugin: mockPlugin })
      expect(element.render()).toBe("")
    })

    test("should handle unknown elements as text fallback", () => {
      const element = jsx("unknown-element", { children: "Fallback Text" })
      expect(element.render()).toBe("Fallback Text")
    })

    test("should handle props without children", () => {
      const element = jsx("text", {})
      expect(element.render()).toBe("")
    })

    test("should handle null props", () => {
      const element = jsx("text", null)
      expect(element.render()).toBe("")
    })
  })

  describe("jsxs() function", () => {
    test("should work the same as jsx()", () => {
      const element = jsxs("text", { children: "Hello jsxs" })
      expect(element.render()).toBe("Hello jsxs")
    })

    test("should handle multiple children", () => {
      const element = jsxs("vstack", { 
        children: [
          text("Child 1"),
          text("Child 2"),
          text("Child 3")
        ]
      })
      expect(element.render()).toBe("Child 1\nChild 2\nChild 3")
    })
  })

  describe("Fragment", () => {
    test("should create vstack from children", () => {
      const fragment = Fragment({
        children: [
          text("Fragment Line 1"),
          text("Fragment Line 2")
        ]
      })
      expect(fragment.render()).toBe("Fragment Line 1\nFragment Line 2")
    })

    test("should handle empty Fragment", () => {
      const fragment = Fragment({ children: [] })
      expect(fragment.render()).toBe("")
    })

    test("should handle Fragment without children", () => {
      const fragment = Fragment({})
      expect(fragment.render()).toBe("")
    })

    test("should handle single child in Fragment", () => {
      const fragment = Fragment({
        children: text("Single Child")
      })
      expect(fragment.render()).toBe("Single Child")
    })
  })

  describe("createElement() function", () => {
    test("should create elements like jsx()", () => {
      const element = createElement("text", { title: "Test" }, "Hello createElement")
      expect(element.render()).toBe("Hello createElement")
    })

    test("should handle multiple children", () => {
      const element = createElement(
        "vstack", 
        null,
        text("Child 1"),
        text("Child 2")
      )
      expect(element.render()).toBe("Child 1\nChild 2")
    })

    test("should handle single child", () => {
      const element = createElement("text", null, "Single Child")
      expect(element.render()).toBe("Single Child")
    })

    test("should handle no children", () => {
      const element = createElement("text", { placeholder: "empty" })
      expect(element.render()).toBe("")
    })

    test("should merge props and children", () => {
      const element = createElement(
        "text",
        { color: "red", bold: true },
        "Styled via createElement"
      )
      expect(element.render()).toContain("Styled via createElement")
    })
  })

  describe("Complex nesting", () => {
    test("should handle deeply nested structures", () => {
      const complex = jsx("vstack", {
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

      const rendered = complex.render()
      expect(rendered).toContain("Header")
      expect(rendered).toContain("Left")
      expect(rendered).toContain("Right")
      expect(rendered).toContain("Footer")
    })

    test("should handle mixed content types", () => {
      const mixed = jsx("vstack", {
        children: [
          "String child",
          42,
          jsx("text", { children: "JSX child" }),
          null,
          undefined,
          false
        ]
      })

      const rendered = mixed.render()
      expect(rendered).toContain("String child")
      expect(rendered).toContain("42")
      expect(rendered).toContain("JSX child")
    })
  })

  describe("Edge cases", () => {
    test("should handle circular references safely", () => {
      // This shouldn't cause infinite loops
      const element = jsx("text", { 
        children: jsx("text", { children: "Nested" })
      })
      expect(element.render()).toBe("Nested")
    })

    test("should handle very long content", () => {
      const longText = "A".repeat(10000)
      const element = jsx("text", { children: longText })
      expect(element.render()).toBe(longText)
    })

    test("should handle special characters", () => {
      const specialText = "Hello\nWorld\t🚀\u0000"
      const element = jsx("text", { children: specialText })
      expect(element.render()).toBe(specialText)
    })
  })
})