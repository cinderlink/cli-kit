/**
 * Coverage tests for Panel builders
 */

import { describe, it, expect } from "bun:test"
import { Effect } from "effect"
import {
  Panel,
  HeaderPanel,
  InfoPanel,
  SuccessPanel,
  WarningPanel,
  ErrorPanel
} from "../../../../src/components/builders/Panel"
import { Colors } from "../../../../src/styling/color"
import { text } from "../../../../src/core/view"

describe("Panel Builders - Coverage", () => {
  describe("Panel", () => {
    it("creates basic panel", async () => {
      const panel = Panel(text("Test content"), { title: "Test Panel" })
      
      expect(panel).toBeDefined()
      expect(panel.render).toBeDefined()
      
      const rendered = await Effect.runPromise(panel.render())
      expect(rendered).toContain("Test Panel")
      expect(rendered).toContain("Test content")
    })

    it("handles optional properties", async () => {
      const panel = Panel(text("Just content"))
      
      const rendered = await Effect.runPromise(panel.render())
      expect(rendered).toContain("Just content")
    })

    it("supports custom width", async () => {
      const panel = Panel(text("Content"), { 
        title: "Wide Panel",
        width: 50 
      })
      
      expect(panel).toBeDefined()
      // Width is passed as minWidth to styledBox
    })

    it("supports multiline content", async () => {
      const panel = Panel([
        text("Line 1"), 
        text("Line 2"), 
        text("Line 3")
      ], { 
        title: "Multi"
      })
      
      const rendered = await Effect.runPromise(panel.render())
      expect(rendered).toContain("Line 1")
      expect(rendered).toContain("Line 2")
      expect(rendered).toContain("Line 3")
    })
  })

  describe("HeaderPanel", () => {
    it("creates header panel with default style", async () => {
      const panel = HeaderPanel(text("Important info"), "Header")
      
      const rendered = await Effect.runPromise(panel.render())
      expect(rendered).toContain("Header")
      expect(rendered).toContain("Important info")
    })

    it("accepts custom options", async () => {
      const panel = HeaderPanel(text("Content"), "Custom Header")
      
      const rendered = await Effect.runPromise(panel.render())
      expect(rendered).toContain("Custom Header")
    })
  })

  describe("InfoPanel", () => {
    it("creates info panel", async () => {
      const panel = InfoPanel(text("This is informational"), "Information")
      
      const rendered = await Effect.runPromise(panel.render())
      expect(rendered).toContain("Information")
      expect(rendered).toContain("This is informational")
    })

    it("handles array content", async () => {
      const panel = InfoPanel([
        text("Info 1"), 
        text("Info 2")
      ])
      
      const rendered = await Effect.runPromise(panel.render())
      expect(rendered).toContain("Info 1")
      expect(rendered).toContain("Info 2")
    })
  })

  describe("SuccessPanel", () => {
    it("creates success panel", async () => {
      const panel = SuccessPanel(text("Operation completed"), "Success!")
      
      const rendered = await Effect.runPromise(panel.render())
      expect(rendered).toContain("Success!")
      expect(rendered).toContain("Operation completed")
    })

    it("works without title", async () => {
      const panel = SuccessPanel(text("All good!"))
      
      const rendered = await Effect.runPromise(panel.render())
      expect(rendered).toContain("All good!")
    })
  })

  describe("WarningPanel", () => {
    it("creates warning panel", async () => {
      const panel = WarningPanel(text("Be careful!"), "Warning")
      
      const rendered = await Effect.runPromise(panel.render())
      expect(rendered).toContain("Warning")
      expect(rendered).toContain("Be careful!")
    })

    it("supports custom width", async () => {
      const panel = WarningPanel(text("Wide warning"))
      
      expect(panel).toBeDefined()
    })
  })

  describe("ErrorPanel", () => {
    it("creates error panel", async () => {
      const panel = ErrorPanel(text("Something went wrong"), "Error")
      
      const rendered = await Effect.runPromise(panel.render())
      expect(rendered).toContain("Error")
      expect(rendered).toContain("Something went wrong")
    })

    it("handles multiline error messages", async () => {
      const panel = ErrorPanel([
        text("Error 1: File not found"),
        text("Error 2: Permission denied"),
        text("Error 3: Network timeout")
      ], "Multiple Errors")
      
      const rendered = await Effect.runPromise(panel.render())
      expect(rendered).toContain("Error 1")
      expect(rendered).toContain("Error 2")
      expect(rendered).toContain("Error 3")
    })
  })

  describe("Panel edge cases", () => {
    it("handles empty content", async () => {
      const panel = Panel(text(""))
      const rendered = await Effect.runPromise(panel.render())
      expect(rendered).toBeDefined()
    })

    it("handles very long titles", async () => {
      const panel = Panel(text("Content"), {
        title: "This is a very long title that might need to be truncated or wrapped"
      })
      
      const rendered = await Effect.runPromise(panel.render())
      expect(rendered).toBeDefined()
    })

    it("handles special characters", async () => {
      const panel = Panel(text("Content with emoji 🎉"), {
        title: "Special: <>&\"'"
      })
      
      const rendered = await Effect.runPromise(panel.render())
      expect(rendered).toContain("Special")
      expect(rendered).toContain("🎉")
    })
  })
})