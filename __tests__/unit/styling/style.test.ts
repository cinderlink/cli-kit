/**
 * Style System Tests
 */

import { describe, test, expect } from "bun:test"
import { Option } from "effect"
import { 
  style,
  Colors,
  Borders,
  BorderSide,
  HorizontalAlign,
  renderStyledSync
} from "@/styling/index.ts"

describe("Style", () => {
  test("creates empty style", () => {
    const s = style()
    expect(s.has("foreground")).toBe(false)
    expect(s.has("background")).toBe(false)
  })
  
  test("chainable API", () => {
    const s = style()
      .foreground(Colors.red)
      .background(Colors.blue)
      .bold()
      .padding(2, 4)
    
    expect(s.get("foreground")).toEqual(Colors.red)
    expect(s.get("background")).toEqual(Colors.blue)
    expect(s.get("bold")).toBe(true)
    expect(s.get("padding")).toEqual({ top: 2, right: 4, bottom: 2, left: 4 })
  })
  
  test("immutability", () => {
    const s1 = style().foreground(Colors.red)
    const s2 = s1.background(Colors.blue)
    
    expect(s1.has("background")).toBe(false)
    expect(s2.has("background")).toBe(true)
    expect(s1).not.toBe(s2)
  })
  
  test("style inheritance", () => {
    const parent = style()
      .foreground(Colors.red)
      .bold()
      .padding(2)
    
    const child = style()
      .inherit(parent)
      .background(Colors.blue)
    
    // Child inherits foreground and bold from parent
    expect(child.get("foreground")).toEqual(Colors.red)
    expect(child.get("bold")).toBe(true)
    expect(child.get("background")).toEqual(Colors.blue)
    
    // Padding is not inheritable
    expect(child.get("padding")).toBeUndefined()
  })
  
  test("style merging", () => {
    const s1 = style()
      .foreground(Colors.red)
      .bold()
    
    const s2 = style()
      .foreground(Colors.blue)
      .italic()
    
    const merged = s1.merge(s2)
    
    // s2 properties override s1
    expect(merged.get("foreground")).toEqual(Colors.blue)
    expect(merged.get("bold")).toBe(true)
    expect(merged.get("italic")).toBe(true)
  })
})

describe("Colors", () => {
  test("predefined colors", () => {
    expect(Colors.red._tag).toBe("ANSI")
    if (Colors.red._tag === "ANSI") {
      expect(Colors.red.code).toBe(1)
    }
    expect(Colors.brightRed._tag).toBe("ANSI")
    if (Colors.brightRed._tag === "ANSI") {
      expect(Colors.brightRed.code).toBe(9)
    }
  })
  
  test("hex color validation", () => {
    const valid = Colors.hex("#FF0000")
    expect(Option.isSome(valid)).toBe(true)
    if (Option.isSome(valid)) {
      expect(valid.value._tag).toBe("Hex")
    }
    
    const invalid = Colors.hex("not-a-hex")
    expect(Option.isNone(invalid)).toBe(true)
  })
  
  test("rgb color validation", () => {
    const valid = Colors.rgb(255, 0, 0)
    expect(Option.isSome(valid)).toBe(true)
    if (Option.isSome(valid)) {
      expect(valid.value._tag).toBe("RGB")
    }
    
    const invalid = Colors.rgb(256, 0, 0)
    expect(Option.isNone(invalid)).toBe(true)
  })
  
  test("adaptive colors", () => {
    const adaptive = Colors.adaptive(Colors.black, Colors.white)
    expect(adaptive._tag).toBe("Adaptive")
    if (adaptive._tag === "Adaptive") {
      expect(adaptive.light).toEqual(Colors.black)
      expect(adaptive.dark).toEqual(Colors.white)
    }
  })
})

describe("Borders", () => {
  test("border styles", () => {
    expect(Borders.Normal.top).toBe("─")
    expect(Borders.Normal.topLeft).toBe("┌")
    expect(Borders.Rounded.topLeft).toBe("╭")
    expect(Borders.Double.top).toBe("═")
  })
  
  test("border side flags", () => {
    expect(BorderSide.All).toBe(15) // All bits set
    expect(BorderSide.Top | BorderSide.Bottom).toBe(5)
    expect(BorderSide.Left | BorderSide.Right).toBe(10)
  })
})

describe("Rendering", () => {
  test("simple text", () => {
    const s = style()
    const result = renderStyledSync("Hello", s)
    expect(result).toBe("Hello")
  })
  
  test("text with padding", () => {
    const s = style().padding(1, 2)
    const result = renderStyledSync("Hello", s)
    const lines = result.split("\n")
    
    expect(lines).toHaveLength(3)
    expect(lines[0]).toBe("         ") // 5 chars + 2*2 padding = 9
    expect(lines[1]).toBe("  Hello  ")
    expect(lines[2]).toBe("         ")
  })
  
  test("text with border", () => {
    const s = style().border(Borders.Normal)
    const result = renderStyledSync("Hello", s)
    const lines = result.split("\n")
    
    expect(lines).toHaveLength(3)
    expect(lines[0]).toBe("┌─────┐")
    expect(lines[1]).toBe("│Hello│")
    expect(lines[2]).toBe("└─────┘")
  })
  
  test("text alignment", () => {
    const s = style()
      .width(10)
      .align(HorizontalAlign.Center)
    
    const result = renderStyledSync("Hi", s)
    expect(result).toBe("    Hi    ")
  })
  
  test("text transformation", () => {
    const s = style().uppercase()
    const result = renderStyledSync("hello", s)
    expect(result).toBe("HELLO")
  })
})