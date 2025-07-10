/**
 * Comprehensive tests for style module to improve coverage
 */

import { describe, it, expect } from "bun:test"
import { Style, style, styleFrom, Styles } from "@/styling/style"

describe("Style Module Coverage", () => {
  describe("Style class", () => {
    it("creates empty style", () => {
      const s = new Style()
      expect(s).toBeDefined()
      expect(s.get("color")).toBeUndefined()
    })

    it("sets and gets properties", () => {
      const s = new Style()
      s.set("color", "red")
      expect(s.get("color")).toBe("red")
    })

    it("checks if property exists", () => {
      const s = new Style()
      s.set("width", 100)
      expect(s.has("width")).toBe(true)
      expect(s.has("height")).toBe(false)
    })

    it("deletes properties", () => {
      const s = new Style()
      s.set("margin", 10)
      expect(s.has("margin")).toBe(true)
      s.delete("margin")
      expect(s.has("margin")).toBe(false)
    })

    it("clears all properties", () => {
      const s = new Style()
      s.set("color", "blue")
      s.set("fontSize", 16)
      s.clear()
      expect(s.has("color")).toBe(false)
      expect(s.has("fontSize")).toBe(false)
    })

    it("gets all keys", () => {
      const s = new Style()
      s.set("color", "red")
      s.set("width", 100)
      const keys = Array.from(s.keys())
      expect(keys).toContain("color")
      expect(keys).toContain("width")
      expect(keys).toHaveLength(2)
    })

    it("gets all values", () => {
      const s = new Style()
      s.set("color", "green")
      s.set("height", 50)
      const values = Array.from(s.values())
      expect(values).toContain("green")
      expect(values).toContain(50)
    })

    it("iterates entries", () => {
      const s = new Style()
      s.set("padding", 5)
      s.set("border", "1px solid")
      const entries = Array.from(s.entries())
      expect(entries).toHaveLength(2)
      expect(entries[0]).toEqual(["padding", 5])
      expect(entries[1]).toEqual(["border", "1px solid"])
    })

    it("reports size", () => {
      const s = new Style()
      expect(s.size).toBe(0)
      s.set("margin", 10)
      expect(s.size).toBe(1)
      s.set("color", "blue")
      expect(s.size).toBe(2)
    })

    it("is iterable", () => {
      const s = new Style()
      s.set("fontSize", 14)
      s.set("fontFamily", "Arial")
      
      const entries = []
      for (const entry of s) {
        entries.push(entry)
      }
      expect(entries).toHaveLength(2)
    })

    it("supports forEach", () => {
      const s = new Style()
      s.set("color", "red")
      s.set("background", "white")
      
      const collected: Array<[string, any]> = []
      s.forEach((value, key) => {
        collected.push([key, value])
      })
      expect(collected).toHaveLength(2)
    })
  })

  describe("style factory function", () => {
    it("creates new style instance", () => {
      const s = style()
      expect(s).toBeInstanceOf(Style)
    })

    it("creates style with initial properties", () => {
      const s = style({ color: "blue", width: 200 })
      expect(s.get("color")).toBe("blue")
      expect(s.get("width")).toBe(200)
    })

    it("supports method chaining", () => {
      const s = style()
        .set("color", "red")
        .set("fontSize", 16)
        .set("margin", 10)
      
      expect(s.get("color")).toBe("red")
      expect(s.get("fontSize")).toBe(16)
      expect(s.get("margin")).toBe(10)
    })
  })

  describe("style helper methods", () => {
    it("sets color", () => {
      const s = style().color("purple")
      expect(s.get("color")).toBe("purple")
    })

    it("sets background color", () => {
      const s = style().bg("yellow")
      expect(s.get("backgroundColor")).toBe("yellow")
    })

    it("sets width", () => {
      const s = style().width(300)
      expect(s.get("width")).toBe(300)
    })

    it("sets height", () => {
      const s = style().height(150)
      expect(s.get("height")).toBe(150)
    })

    it("sets margin", () => {
      const s = style().margin(20)
      expect(s.get("margin")).toBe(20)
    })

    it("sets padding", () => {
      const s = style().padding(15)
      expect(s.get("padding")).toBe(15)
    })

    it("sets border", () => {
      const s = style().border("2px solid black")
      expect(s.get("border")).toBe("2px solid black")
    })

    it("sets font size", () => {
      const s = style().fontSize(18)
      expect(s.get("fontSize")).toBe(18)
    })

    it("sets font family", () => {
      const s = style().fontFamily("Helvetica")
      expect(s.get("fontFamily")).toBe("Helvetica")
    })

    it("sets font weight", () => {
      const s = style().fontWeight("bold")
      expect(s.get("fontWeight")).toBe("bold")
    })

    it("sets text decoration", () => {
      const s = style().textDecoration("underline")
      expect(s.get("textDecoration")).toBe("underline")
    })

    it("sets text align", () => {
      const s = style().textAlign("center")
      expect(s.get("textAlign")).toBe("center")
    })

    it("sets display", () => {
      const s = style().display("flex")
      expect(s.get("display")).toBe("flex")
    })

    it("sets position", () => {
      const s = style().position("absolute")
      expect(s.get("position")).toBe("absolute")
    })

    it("sets top", () => {
      const s = style().top(10)
      expect(s.get("top")).toBe(10)
    })

    it("sets right", () => {
      const s = style().right(20)
      expect(s.get("right")).toBe(20)
    })

    it("sets bottom", () => {
      const s = style().bottom(30)
      expect(s.get("bottom")).toBe(30)
    })

    it("sets left", () => {
      const s = style().left(40)
      expect(s.get("left")).toBe(40)
    })

    it("sets z-index", () => {
      const s = style().zIndex(100)
      expect(s.get("zIndex")).toBe(100)
    })

    it("sets opacity", () => {
      const s = style().opacity(0.8)
      expect(s.get("opacity")).toBe(0.8)
    })

    it("sets overflow", () => {
      const s = style().overflow("hidden")
      expect(s.get("overflow")).toBe("hidden")
    })

    it("sets cursor", () => {
      const s = style().cursor("pointer")
      expect(s.get("cursor")).toBe("pointer")
    })

    it("supports boolean flags", () => {
      const s = style()
      expect(s.bold).toBeInstanceOf(Style)
      expect(s.italic).toBeInstanceOf(Style)
      expect(s.underline).toBeInstanceOf(Style)
      expect(s.strikethrough).toBeInstanceOf(Style)
      expect(s.dim).toBeInstanceOf(Style)
      expect(s.blink).toBeInstanceOf(Style)
      expect(s.reverse).toBeInstanceOf(Style)
      expect(s.hidden).toBeInstanceOf(Style)
    })

    it("chains multiple styles", () => {
      const s = style()
        .color("red")
        .bg("white")
        .width(100)
        .height(50)
        .margin(10)
        .padding(5)
        .bold
        .italic
      
      expect(s.get("color")).toBe("red")
      expect(s.get("backgroundColor")).toBe("white")
      expect(s.get("width")).toBe(100)
      expect(s.get("height")).toBe(50)
      expect(s.get("margin")).toBe(10)
      expect(s.get("padding")).toBe(5)
      expect(s.get("bold")).toBe(true)
      expect(s.get("italic")).toBe(true)
    })
  })

  describe("styleFrom function", () => {
    it("creates style from object", () => {
      const obj = { color: "green", fontSize: 14, margin: 8 }
      const s = styleFrom(obj)
      expect(s.get("color")).toBe("green")
      expect(s.get("fontSize")).toBe(14)
      expect(s.get("margin")).toBe(8)
    })

    it("handles empty object", () => {
      const s = styleFrom({})
      expect(s.size).toBe(0)
    })

    it("creates style from another style", () => {
      const original = style().color("blue").width(200)
      const copied = styleFrom(original)
      expect(copied.get("color")).toBe("blue")
      expect(copied.get("width")).toBe(200)
    })

    it("creates style from Map", () => {
      const map = new Map([
        ["color", "orange"],
        ["height", 100]
      ])
      const s = styleFrom(map)
      expect(s.get("color")).toBe("orange")
      expect(s.get("height")).toBe(100)
    })
  })

  describe("Styles utility", () => {
    it("provides common color constants", () => {
      expect(Styles.red).toBeInstanceOf(Style)
      expect(Styles.green).toBeInstanceOf(Style)
      expect(Styles.blue).toBeInstanceOf(Style)
      expect(Styles.yellow).toBeInstanceOf(Style)
      expect(Styles.cyan).toBeInstanceOf(Style)
      expect(Styles.magenta).toBeInstanceOf(Style)
      expect(Styles.white).toBeInstanceOf(Style)
      expect(Styles.black).toBeInstanceOf(Style)
    })

    it("provides text styling constants", () => {
      expect(Styles.bold).toBeInstanceOf(Style)
      expect(Styles.italic).toBeInstanceOf(Style)
      expect(Styles.underline).toBeInstanceOf(Style)
      expect(Styles.strikethrough).toBeInstanceOf(Style)
      expect(Styles.dim).toBeInstanceOf(Style)
    })

    it("provides size constants", () => {
      expect(Styles.small).toBeInstanceOf(Style)
      expect(Styles.medium).toBeInstanceOf(Style)
      expect(Styles.large).toBeInstanceOf(Style)
    })

    it("provides layout constants", () => {
      expect(Styles.block).toBeInstanceOf(Style)
      expect(Styles.inline).toBeInstanceOf(Style)
      expect(Styles.flex).toBeInstanceOf(Style)
      expect(Styles.hidden).toBeInstanceOf(Style)
    })

    it("provides margin/padding utilities", () => {
      expect(Styles.m1).toBeInstanceOf(Style)
      expect(Styles.m2).toBeInstanceOf(Style)
      expect(Styles.m3).toBeInstanceOf(Style)
      expect(Styles.m4).toBeInstanceOf(Style)
      expect(Styles.p1).toBeInstanceOf(Style)
      expect(Styles.p2).toBeInstanceOf(Style)
      expect(Styles.p3).toBeInstanceOf(Style)
      expect(Styles.p4).toBeInstanceOf(Style)
    })

    it("provides width utilities", () => {
      expect(Styles.w25).toBeInstanceOf(Style)
      expect(Styles.w50).toBeInstanceOf(Style)
      expect(Styles.w75).toBeInstanceOf(Style)
      expect(Styles.w100).toBeInstanceOf(Style)
      expect(Styles.wFull).toBeInstanceOf(Style)
    })

    it("provides height utilities", () => {
      expect(Styles.h25).toBeInstanceOf(Style)
      expect(Styles.h50).toBeInstanceOf(Style)
      expect(Styles.h75).toBeInstanceOf(Style)
      expect(Styles.h100).toBeInstanceOf(Style)
      expect(Styles.hFull).toBeInstanceOf(Style)
    })
  })

  describe("style merging and composition", () => {
    it("merges styles", () => {
      const s1 = style().color("red").width(100)
      const s2 = style().bg("blue").height(50)
      
      const merged = style()
      for (const [key, value] of s1) {
        merged.set(key, value)
      }
      for (const [key, value] of s2) {
        merged.set(key, value)
      }
      
      expect(merged.get("color")).toBe("red")
      expect(merged.get("backgroundColor")).toBe("blue")
      expect(merged.get("width")).toBe(100)
      expect(merged.get("height")).toBe(50)
    })

    it("handles style overrides", () => {
      const base = style().color("red").fontSize(16)
      const override = style().color("blue").margin(10)
      
      const combined = style()
      for (const [key, value] of base) {
        combined.set(key, value)
      }
      for (const [key, value] of override) {
        combined.set(key, value)
      }
      
      expect(combined.get("color")).toBe("blue") // Overridden
      expect(combined.get("fontSize")).toBe(16) // Preserved
      expect(combined.get("margin")).toBe(10) // Added
    })
  })

  describe("edge cases", () => {
    it("handles null and undefined values", () => {
      const s = style()
      s.set("color", null)
      s.set("width", undefined)
      expect(s.get("color")).toBeNull()
      expect(s.get("width")).toBeUndefined()
    })

    it("handles numeric string values", () => {
      const s = style()
      s.set("width", "100")
      s.set("opacity", "0.5")
      expect(s.get("width")).toBe("100")
      expect(s.get("opacity")).toBe("0.5")
    })

    it("handles complex objects as values", () => {
      const s = style()
      const complexValue = { nested: { value: 42 } }
      s.set("transform", complexValue)
      expect(s.get("transform")).toEqual(complexValue)
    })

    it("preserves insertion order", () => {
      const s = style()
      s.set("z", 1)
      s.set("a", 2)
      s.set("m", 3)
      
      const keys = Array.from(s.keys())
      expect(keys).toEqual(["z", "a", "m"])
    })
  })
})