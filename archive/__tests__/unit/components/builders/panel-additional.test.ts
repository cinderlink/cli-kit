/**
 * Additional tests for Panel builders to improve coverage
 */

import { describe, it, expect } from "bun:test"
import { Effect } from "effect"
import {
  Panel,
  Card,
  Sidebar,
  StatusPanel,
  CollapsiblePanel,
  ThemedPanel,
  FloatingPanel
} from "../../../../src/components/builders/Panel"
import { text } from "../../../../src/core/view"

describe("Panel Builders - Additional Coverage", () => {
  describe("Card", () => {
    it("creates card with title", async () => {
      const card = Card(text("Card content"), "Card Title")
      
      const rendered = await Effect.runPromise(card.render())
      expect(rendered).toContain("Card Title")
      expect(rendered).toContain("Card content")
    })

    it("creates card without title", async () => {
      const card = Card(text("Just content"))
      
      const rendered = await Effect.runPromise(card.render())
      expect(rendered).toContain("Just content")
    })
  })

  describe("Sidebar", () => {
    it("creates sidebar", async () => {
      const sidebar = Sidebar([
        text("Item 1"),
        text("Item 2"),
        text("Item 3")
      ])
      
      const rendered = await Effect.runPromise(sidebar.render())
      expect(rendered).toContain("Item 1")
      expect(rendered).toContain("Item 2")
      expect(rendered).toContain("Item 3")
    })
  })

  describe("StatusPanel", () => {
    it("creates info status panel", async () => {
      const panel = StatusPanel("Processing", "Please wait...", "info")
      
      const rendered = await Effect.runPromise(panel.render())
      // StatusPanel doesn't include icons in the current implementation
      expect(rendered).toContain("Processing")
      expect(rendered).toContain("Please wait...")
    })

    it("creates success status panel", async () => {
      const panel = StatusPanel("Complete", "All done!", "success")
      
      const rendered = await Effect.runPromise(panel.render())
      // StatusPanel doesn't include icons in the current implementation
      expect(rendered).toContain("Complete")
      expect(rendered).toContain("All done!")
    })

    it("creates warning status panel", async () => {
      const panel = StatusPanel("Warning", "Be careful", "warning")
      
      const rendered = await Effect.runPromise(panel.render())
      // StatusPanel doesn't include icons in the current implementation
      expect(rendered).toContain("Warning")
      expect(rendered).toContain("Be careful")
    })

    it("creates error status panel", async () => {
      const panel = StatusPanel("Error", "Something went wrong", "error")
      
      const rendered = await Effect.runPromise(panel.render())
      // StatusPanel doesn't include icons in the current implementation
      expect(rendered).toContain("Error")
      expect(rendered).toContain("Something went wrong")
    })

    it("handles unknown status type", async () => {
      const panel = StatusPanel("Unknown", "Status", "other" as any)
      
      const rendered = await Effect.runPromise(panel.render())
      // StatusPanel doesn't include icons in the current implementation
      expect(rendered).toContain("Unknown")
    })
  })

  describe("CollapsiblePanel", () => {
    it("shows content when not collapsed", async () => {
      const panel = CollapsiblePanel(
        text("Collapsible content"),
        "Click to toggle",
        false
      )
      
      const rendered = await Effect.runPromise(panel.render())
      expect(rendered).toContain("Click to toggle")
      expect(rendered).toContain("Collapsible content")
    })

    it("hides content when collapsed", async () => {
      const panel = CollapsiblePanel(
        text("Hidden content"),
        "Click to expand",
        true
      )
      
      const rendered = await Effect.runPromise(panel.render())
      expect(rendered).toContain("Click to expand")
      expect(rendered).not.toContain("Hidden content")
    })
  })

  describe("ThemedPanel", () => {
    it("creates themed panel with default options", async () => {
      const panel = ThemedPanel(text("Themed content"))
      
      const rendered = await Effect.runPromise(panel.render())
      expect(rendered).toContain("Themed content")
    })

    it("creates themed panel with custom options", async () => {
      const panel = ThemedPanel(text("Custom themed"), {
        title: "Themed Panel"
      })
      
      const rendered = await Effect.runPromise(panel.render())
      expect(rendered).toContain("Themed Panel")
      expect(rendered).toContain("Custom themed")
    })
  })

  describe("FloatingPanel", () => {
    it("creates floating panel", async () => {
      const panel = FloatingPanel(
        text("Floating content"),
        "Floating Panel"
      )
      
      const rendered = await Effect.runPromise(panel.render())
      expect(rendered).toContain("Floating Panel")
      expect(rendered).toContain("Floating content")
    })

    it("creates floating panel without title", async () => {
      const panel = FloatingPanel(text("Just floating"))
      
      const rendered = await Effect.runPromise(panel.render())
      expect(rendered).toContain("Just floating")
    })
  })

  describe("Panel with array content", () => {
    it("handles array of views", async () => {
      const panel = Panel([
        text("First line"),
        text("Second line"),
        text("Third line")
      ], {
        title: "Multi-line Panel"
      })
      
      const rendered = await Effect.runPromise(panel.render())
      expect(rendered).toContain("Multi-line Panel")
      expect(rendered).toContain("First line")
      expect(rendered).toContain("Second line")
      expect(rendered).toContain("Third line")
    })
  })

  describe("Panel with custom borders", () => {
    it("uses custom border style", async () => {
      const panel = Panel(text("Custom border"), {
        border: {
          topLeft: '+',
          topRight: '+',
          bottomLeft: '+',
          bottomRight: '+',
          top: '-',
          bottom: '-',
          left: '|',
          right: '|'
        }
      })
      
      const rendered = await Effect.runPromise(panel.render())
      expect(rendered).toContain("Custom border")
    })
  })

  describe("Panel edge cases", () => {
    it("handles height option", async () => {
      const panel = Panel(text("Fixed height"), {
        height: 10
      })
      
      const rendered = await Effect.runPromise(panel.render())
      expect(rendered).toContain("Fixed height")
    })

    it("handles different padding values", async () => {
      const panel = Panel(text("Custom padding"), {
        padding: {
          top: 2,
          right: 3,
          bottom: 2,
          left: 3
        }
      })
      
      const rendered = await Effect.runPromise(panel.render())
      expect(rendered).toContain("Custom padding")
    })
  })
})