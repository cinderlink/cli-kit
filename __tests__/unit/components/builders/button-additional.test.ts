/**
 * Additional tests for Button builders to improve coverage
 */

import { describe, it, expect } from "bun:test"
import { Effect } from "effect"
import {
  Button,
  WarningButton,
  InfoButton,
  ButtonGroup,
  SubmitCancelButtons
} from "../../../../src/components/builders/Button"
import { text } from "../../../../src/core/view"

describe("Button Builders - Additional Coverage", () => {
  describe("WarningButton", () => {
    it("creates warning button", async () => {
      const button = WarningButton("Warning!", () => console.log("warned"))
      
      const rendered = await Effect.runPromise(button.render())
      expect(rendered).toContain("Warning!")
    })
  })

  describe("InfoButton", () => {
    it("creates info button", async () => {
      const button = InfoButton("Info", () => console.log("info"))
      
      const rendered = await Effect.runPromise(button.render())
      expect(rendered).toContain("Info")
    })
  })

  describe("Button with loading state", () => {
    it("shows loading indicator", async () => {
      const button = Button("Save", {
        onClick: () => {},
        loading: true
      })
      
      const rendered = await Effect.runPromise(button.render())
      expect(rendered).toContain("⟳ Loading...")
    })
  })

  describe("Button with icons", () => {
    it("renders icon on left", async () => {
      const button = Button("Save", {
        onClick: () => {},
        icon: "💾",
        iconPosition: 'left'
      })
      
      const rendered = await Effect.runPromise(button.render())
      expect(rendered).toContain("💾")
      expect(rendered).toContain("Save")
    })

    it("renders icon on right", async () => {
      const button = Button("Next", {
        onClick: () => {},
        icon: "→",
        iconPosition: 'right'
      })
      
      const rendered = await Effect.runPromise(button.render())
      expect(rendered).toContain("→")
      expect(rendered).toContain("Next")
    })
  })

  describe("Button sizes", () => {
    it("renders small button", async () => {
      const button = Button("Small", {
        size: 'small',
        onClick: () => {}
      })
      
      const rendered = await Effect.runPromise(button.render())
      expect(rendered).toContain("Small")
    })

    it("renders large button", async () => {
      const button = Button("Large", {
        size: 'large',
        onClick: () => {}
      })
      
      const rendered = await Effect.runPromise(button.render())
      expect(rendered).toContain("Large")
    })
  })

  describe("ButtonGroup", () => {
    it("creates button group with default spacing", async () => {
      const group = ButtonGroup([
        Button("First", { onClick: () => {} }),
        Button("Second", { onClick: () => {} }),
        Button("Third", { onClick: () => {} })
      ])
      
      const rendered = await Effect.runPromise(group.render())
      expect(rendered).toContain("First")
      expect(rendered).toContain("Second")
      expect(rendered).toContain("Third")
    })

    it("creates button group with custom spacing", async () => {
      const group = ButtonGroup([
        Button("A", { onClick: () => {} }),
        Button("B", { onClick: () => {} })
      ], 3)
      
      const rendered = await Effect.runPromise(group.render())
      expect(rendered).toContain("A")
      expect(rendered).toContain("B")
    })
  })

  describe("SubmitCancelButtons", () => {
    it("creates submit/cancel pair with handlers", async () => {
      const buttons = SubmitCancelButtons(
        () => console.log("submit"),
        () => console.log("cancel")
      )
      
      const rendered = await Effect.runPromise(buttons.render())
      expect(rendered).toContain("Submit")
      expect(rendered).toContain("Cancel")
    })

    it("creates submit/cancel pair with custom labels", async () => {
      const buttons = SubmitCancelButtons(
        () => {},
        () => {},
        "Save",
        "Discard"
      )
      
      const rendered = await Effect.runPromise(buttons.render())
      expect(rendered).toContain("Save")
      expect(rendered).toContain("Discard")
    })
  })

  describe("Button edge cases", () => {
    it("handles fullWidth option", async () => {
      const button = Button("Full Width", {
        fullWidth: true,
        onClick: () => {}
      })
      
      const rendered = await Effect.runPromise(button.render())
      expect(rendered).toContain("Full Width")
    })

    it("handles custom className", async () => {
      const button = Button("Custom", {
        className: "my-button",
        onClick: () => {}
      })
      
      const rendered = await Effect.runPromise(button.render())
      expect(rendered).toContain("Custom")
    })

    it("handles all variants", async () => {
      const variants = ['primary', 'secondary', 'success', 'danger', 'warning', 'info', 'ghost'] as const
      
      for (const variant of variants) {
        const button = Button("Test", {
          variant,
          onClick: () => {}
        })
        
        const rendered = await Effect.runPromise(button.render())
        expect(rendered).toContain("Test")
      }
    })
  })
})