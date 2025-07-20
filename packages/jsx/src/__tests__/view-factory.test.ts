/**
 * Tests for view factory functions
 * Covers view creation, styling, and rendering
 */

import { test, expect, describe } from "bun:test"
import { text, vstack, hstack, styledText, style } from "../runtime/view-factory"

describe("View Factory", () => {
  describe("Style creation", () => {
    test("should create style with background color", () => {
      const bgStyle = style().background("blue")
      const styles = bgStyle.getStyles()
      
      expect(styles.backgroundColor).toBe("blue")
    })

    test("should chain style methods", () => {
      const complexStyle = style()
        .bold()
        .italic()
        .foreground("red")
        .background("white")
        .underline()
        .faint()
      
      const styles = complexStyle.getStyles()
      
      expect(styles.fontWeight).toBe("bold")
      expect(styles.fontStyle).toBe("italic")
      expect(styles.color).toBe("red")
      expect(styles.backgroundColor).toBe("white")
      expect(styles.textDecoration).toBe("underline")
      expect(styles.opacity).toBe(0.6)
    })

    test("should create independent style instances", () => {
      const style1 = style().bold().foreground("red")
      const style2 = style().italic().foreground("blue")
      
      const styles1 = style1.getStyles()
      const styles2 = style2.getStyles()
      
      expect(styles1.fontWeight).toBe("bold")
      expect(styles1.color).toBe("red")
      expect(styles1.fontStyle).toBeUndefined()
      
      expect(styles2.fontStyle).toBe("italic")
      expect(styles2.color).toBe("blue")
      expect(styles2.fontWeight).toBeUndefined()
    })
  })

  describe("Styled text rendering", () => {
    test("should apply background style to text", () => {
      const bgStyle = style().background("yellow")
      const styledView = styledText("Highlighted text", bgStyle)
      
      const rendered = styledView.render()
      expect(rendered).toContain("Highlighted text")
    })

    test("should apply multiple styles to text", () => {
      const multiStyle = style()
        .bold()
        .foreground("green")
        .background("black")
      
      const styledView = styledText("Multi-styled", multiStyle)
      
      const rendered = styledView.render()
      expect(rendered).toContain("Multi-styled")
    })
  })

  describe("View rendering edge cases", () => {
    test("should handle empty vstack", () => {
      const emptyStack = vstack()
      expect(emptyStack.render()).toBe("")
    })

    test("should handle empty hstack", () => {
      const emptyStack = hstack()
      expect(emptyStack.render()).toBe("")
    })

    test("should handle vstack with single item", () => {
      const singleStack = vstack(text("Single"))
      expect(singleStack.render()).toBe("Single")
    })

    test("should handle hstack with single item", () => {
      const singleStack = hstack(text("Single"))
      expect(singleStack.render()).toBe("Single")
    })

    test("should handle mixed view types in stacks", () => {
      const plain = text("Plain")
      const styled = styledText("Styled", style().bold())
      
      const mixed = vstack(plain, styled)
      const rendered = mixed.render()
      
      expect(rendered).toContain("Plain")
      expect(rendered).toContain("Styled")
      expect(rendered).toContain("\n") // vstack separator
    })
  })
})