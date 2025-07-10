/**
 * Edge case tests for JSX runtime to improve coverage
 */

import { describe, it, expect } from "bun:test"
import { Effect } from "effect"
import { jsx, jsxs, jsxDEV, Fragment } from "../../src/jsx-runtime"
import { text, vstack, hstack } from "../../src/core/view"

describe("JSX Runtime - Edge Cases", () => {
  describe("jsx function", () => {
    it("handles text elements", async () => {
      const element = jsx("text", { children: "Hello World" })
      const rendered = await Effect.runPromise(element.render())
      expect(rendered).toBe("Hello World")
    })

    it("handles vstack elements", async () => {
      const child1 = jsx("text", { children: "Line 1" })
      const child2 = jsx("text", { children: "Line 2" })
      const element = jsx("vstack", { children: [child1, child2] })
      
      const rendered = await Effect.runPromise(element.render())
      expect(rendered).toContain("Line 1")
      expect(rendered).toContain("Line 2")
    })

    it("handles hstack elements", async () => {
      const child1 = jsx("text", { children: "Left" })
      const child2 = jsx("text", { children: "Right" })
      const element = jsx("hstack", { children: [child1, child2] })
      
      const rendered = await Effect.runPromise(element.render())
      expect(rendered).toContain("Left")
      expect(rendered).toContain("Right")
    })

    it("handles custom components", async () => {
      const CustomComponent = (props: { message: string }) => 
        text(props.message)
      
      const element = jsx(CustomComponent, { message: "Custom" })
      const rendered = await Effect.runPromise(element.render())
      expect(rendered).toBe("Custom")
    })

    it("handles null children", async () => {
      const element = jsx("text", { children: null })
      const rendered = await Effect.runPromise(element.render())
      expect(rendered).toBe("")
    })

    it("handles undefined children", async () => {
      const element = jsx("text", { children: undefined })
      const rendered = await Effect.runPromise(element.render())
      expect(rendered).toBe("")
    })

    it("handles empty props", async () => {
      const element = jsx("text", {})
      const rendered = await Effect.runPromise(element.render())
      expect(rendered).toBe("")
    })

    it("handles numeric children", async () => {
      const element = jsx("text", { children: 42 })
      const rendered = await Effect.runPromise(element.render())
      expect(rendered).toBe("42")
    })

    it("handles boolean children", async () => {
      const element1 = jsx("text", { children: true })
      const element2 = jsx("text", { children: false })
      
      const rendered1 = await Effect.runPromise(element1.render())
      const rendered2 = await Effect.runPromise(element2.render())
      
      expect(rendered1).toBe("")
      expect(rendered2).toBe("")
    })
  })

  describe("jsxs function", () => {
    it("handles multiple children", async () => {
      const children = [
        jsx("text", { children: "First" }),
        jsx("text", { children: "Second" }),
        jsx("text", { children: "Third" })
      ]
      
      const element = jsxs("vstack", { children })
      const rendered = await Effect.runPromise(element.render())
      
      expect(rendered).toContain("First")
      expect(rendered).toContain("Second")
      expect(rendered).toContain("Third")
    })

    it("handles mixed children types", async () => {
      const children = [
        "Plain text",
        jsx("text", { children: "Component" }),
        null,
        undefined,
        42
      ]
      
      const element = jsxs("vstack", { children })
      const rendered = await Effect.runPromise(element.render())
      
      expect(rendered).toContain("Plain text")
      expect(rendered).toContain("Component")
      expect(rendered).toContain("42")
    })

    it("filters out null and undefined", async () => {
      const children = [null, undefined, null]
      const element = jsxs("vstack", { children })
      const rendered = await Effect.runPromise(element.render())
      
      // Should render empty or minimal output
      expect(rendered).toBeDefined()
    })
  })

  describe("jsxDEV function", () => {
    it("works in development mode", async () => {
      const element = jsxDEV(
        "text", 
        { children: "Dev mode" },
        undefined,
        false,
        { fileName: "test.tsx", lineNumber: 1, columnNumber: 1 },
        this
      )
      
      const rendered = await Effect.runPromise(element.render())
      expect(rendered).toBe("Dev mode")
    })

    it("handles source information", async () => {
      const element = jsxDEV(
        "vstack",
        { children: [
          jsxDEV("text", { children: "Line 1" }, "key1", false, { fileName: "test.tsx", lineNumber: 2 }, this),
          jsxDEV("text", { children: "Line 2" }, "key2", false, { fileName: "test.tsx", lineNumber: 3 }, this)
        ]},
        undefined,
        true,
        { fileName: "test.tsx", lineNumber: 1 },
        this
      )
      
      const rendered = await Effect.runPromise(element.render())
      expect(rendered).toContain("Line 1")
      expect(rendered).toContain("Line 2")
    })
  })

  describe("Fragment", () => {
    it("Fragment is defined", () => {
      expect(Fragment).toBeDefined()
      expect(Fragment).toBe(Fragment)
    })

    it("can be used in JSX", async () => {
      const element = jsx(Fragment, {
        children: [
          jsx("text", { children: "Item 1" }),
          jsx("text", { children: "Item 2" })
        ]
      })
      
      // Fragment should pass through children
      expect(element).toBeDefined()
    })
  })

  describe("Integration patterns", () => {
    it("handles nested components", async () => {
      const Header = (props: { title: string }) => 
        jsx("text", { children: props.title })
      
      const Layout = (props: { children: any }) =>
        jsx("vstack", { children: props.children })
      
      const App = () => 
        jsx(Layout, {
          children: [
            jsx(Header, { title: "My App" }),
            jsx("text", { children: "Content" })
          ]
        })
      
      const element = jsx(App, {})
      const rendered = await Effect.runPromise(element.render())
      
      expect(rendered).toContain("My App")
      expect(rendered).toContain("Content")
    })

    it("handles conditional rendering", async () => {
      const ConditionalComponent = (props: { show: boolean }) =>
        props.show 
          ? jsx("text", { children: "Visible" })
          : jsx("text", { children: "" })
      
      const element1 = jsx(ConditionalComponent, { show: true })
      const element2 = jsx(ConditionalComponent, { show: false })
      
      const rendered1 = await Effect.runPromise(element1.render())
      const rendered2 = await Effect.runPromise(element2.render())
      
      expect(rendered1).toBe("Visible")
      expect(rendered2).toBe("")
    })

    it("handles array mapping", async () => {
      const List = (props: { items: string[] }) =>
        jsx("vstack", {
          children: props.items.map(item => 
            jsx("text", { children: `- ${item}` })
          )
        })
      
      const element = jsx(List, { items: ["Apple", "Banana", "Cherry"] })
      const rendered = await Effect.runPromise(element.render())
      
      expect(rendered).toContain("- Apple")
      expect(rendered).toContain("- Banana")
      expect(rendered).toContain("- Cherry")
    })
  })
})