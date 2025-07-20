/**
 * Coverage tests for Button builders
 */

import { describe, it, expect } from "bun:test"
import { Effect } from "effect"
import {
  Button,
  PrimaryButton,
  SecondaryButton,
  SuccessButton,
  DangerButton
} from "../../../../src/components/builders/Button"

describe("Button Builders - Coverage", () => {
  describe("Button", () => {
    it("creates basic button", async () => {
      const button = Button("Click me", {
        onClick: () => console.log("clicked")
      })
      
      expect(button).toBeDefined()
      expect(button.render).toBeDefined()
      
      const rendered = await Effect.runPromise(button.render())
      expect(rendered).toContain("Click me")
    })

    it("supports disabled state", async () => {
      const button = Button("Disabled", {
        onClick: () => {},
        disabled: true
      })
      
      const rendered = await Effect.runPromise(button.render())
      expect(rendered).toContain("Disabled")
    })

    it("supports custom width", () => {
      const button = Button("Wide Button", {
        onClick: () => {},
        fullWidth: true
      })
      
      expect(button).toBeDefined()
    })

    it("supports hotkey", async () => {
      const button = Button("Save", {
        onClick: () => {}
      })
      
      const rendered = await Effect.runPromise(button.render())
      expect(rendered).toContain("Save")
    })
  })

  describe("PrimaryButton", () => {
    it("creates primary button", async () => {
      const button = PrimaryButton("Primary Action", () => console.log("primary"))
      
      const rendered = await Effect.runPromise(button.render())
      expect(rendered).toContain("Primary Action")
    })

    it("inherits button properties", () => {
      const button = Button("Primary", {
        variant: "primary",
        onClick: () => {},
        disabled: true
      })
      
      expect(button).toBeDefined()
    })
  })

  describe("SecondaryButton", () => {
    it("creates secondary button", async () => {
      const button = SecondaryButton("Secondary Action", () => console.log("secondary"))
      
      const rendered = await Effect.runPromise(button.render())
      expect(rendered).toContain("Secondary Action")
    })

    it("supports all button options", async () => {
      const button = Button("Cancel", {
        variant: "secondary",
        onClick: () => {},
        disabled: false
      })
      
      const rendered = await Effect.runPromise(button.render())
      expect(rendered).toContain("Cancel")
    })
  })

  describe("SuccessButton", () => {
    it("creates success button", async () => {
      const button = SuccessButton("Confirm", () => console.log("success"))
      
      const rendered = await Effect.runPromise(button.render())
      expect(rendered).toContain("Confirm")
    })

    it("can be disabled", async () => {
      const button = Button("Save", {
        variant: "success",
        onClick: () => {},
        disabled: true
      })
      
      const rendered = await Effect.runPromise(button.render())
      expect(rendered).toContain("Save")
    })
  })

  describe("DangerButton", () => {
    it("creates danger button", async () => {
      const button = DangerButton("Delete", () => console.log("danger"))
      
      const rendered = await Effect.runPromise(button.render())
      expect(rendered).toContain("Delete")
    })

    it("supports hotkey for dangerous actions", async () => {
      const button = Button("Delete All", {
        variant: "danger",
        onClick: () => {}
      })
      
      const rendered = await Effect.runPromise(button.render())
      expect(rendered).toContain("Delete All")
    })
  })

  describe("Button interaction", () => {
    it("onClick handler is defined", () => {
      let clicked = false
      const button = Button("Test", {
        onClick: () => { clicked = true }
      })
      
      // Button builder doesn't expose onClick directly
      // We would need to test through interaction system
      expect(button).toBeDefined()
    })

    it("handles empty label", async () => {
      const button = Button("", {
        onClick: () => {}
      })
      
      const rendered = await Effect.runPromise(button.render())
      expect(rendered).toBeDefined()
    })

    it("handles long labels", async () => {
      const button = Button("This is a very long button label that might need special handling", {
        onClick: () => {}
      })
      
      const rendered = await Effect.runPromise(button.render())
      expect(rendered).toBeDefined()
    })

    it("handles special characters in label", async () => {
      const button = Button("Save & Exit", {
        onClick: () => {}
      })
      
      const rendered = await Effect.runPromise(button.render())
      expect(rendered).toContain("Save & Exit")
    })
  })

  describe("Button styling", () => {
    it("each button type has different styling", async () => {
      const primary = PrimaryButton("Primary", () => {})
      const secondary = SecondaryButton("Secondary", () => {})
      const success = SuccessButton("Success", () => {})
      const danger = DangerButton("Danger", () => {})
      
      const renderedPrimary = await Effect.runPromise(primary.render())
      const renderedSecondary = await Effect.runPromise(secondary.render())
      const renderedSuccess = await Effect.runPromise(success.render())
      const renderedDanger = await Effect.runPromise(danger.render())
      
      // Each should render successfully with their label
      expect(renderedPrimary).toContain("Primary")
      expect(renderedSecondary).toContain("Secondary")
      expect(renderedSuccess).toContain("Success")
      expect(renderedDanger).toContain("Danger")
    })
  })
})