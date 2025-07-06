/**
 * Comprehensive Tests for Style System
 */

import { describe, it, expect, test } from "bun:test"
import { Option } from "effect"
import {
  Style,
  style,
  styleFrom,
  Styles,
  type StyleProps
} from "@/styling/style"
import { Color, Colors } from "@/styling/color"
import { Borders, BorderSide } from "@/styling/borders"
import { HorizontalAlign, VerticalAlign } from "@/styling/types"

describe("Style System", () => {
  describe("Style Creation", () => {
    it("creates empty style", () => {
      const s = style()
      expect(s.props).toEqual({})
      expect(Option.isNone(s.parent)).toBe(true)
    })
    
    it("creates style from properties", () => {
      const props: StyleProps = {
        foreground: Colors.red,
        background: Colors.blue,
        bold: true
      }
      const s = styleFrom(props)
      
      expect(s.props).toEqual(props)
      expect(s.get("foreground")).toEqual(Colors.red)
      expect(s.get("background")).toEqual(Colors.blue)
      expect(s.get("bold")).toBe(true)
    })
  })
  
  describe("Color Methods", () => {
    it("sets foreground color", () => {
      const s = style().foreground(Colors.red)
      expect(s.get("foreground")).toEqual(Colors.red)
      expect(s.has("foreground")).toBe(true)
    })
    
    it("sets background color", () => {
      const s = style().background(Colors.blue)
      expect(s.get("background")).toEqual(Colors.blue)
      expect(s.has("background")).toBe(true)
    })
  })
  
  describe("Border Methods", () => {
    it("sets border with default sides", () => {
      const s = style().border(Borders.Normal)
      expect(s.get("border")).toEqual(Borders.Normal)
      expect(s.get("borderSides")).toBe(BorderSide.All)
    })
    
    it("sets border with specific sides", () => {
      const s = style().border(Borders.Normal, BorderSide.Top | BorderSide.Bottom)
      expect(s.get("border")).toEqual(Borders.Normal)
      expect(s.get("borderSides")).toBe(BorderSide.Top | BorderSide.Bottom)
    })
    
    it("sets border sides independently", () => {
      const s = style().borderSides(BorderSide.Left | BorderSide.Right)
      expect(s.get("borderSides")).toBe(BorderSide.Left | BorderSide.Right)
    })
    
    it("enables/disables individual border sides", () => {
      let s = style().border(Borders.Normal, BorderSide.All)
      
      // Disable top
      s = s.borderTop(false)
      expect(s.get("borderSides")).toBe(BorderSide.Right | BorderSide.Bottom | BorderSide.Left)
      
      // Re-enable top
      s = s.borderTop(true)
      expect(s.get("borderSides")).toBe(BorderSide.All)
      
      // Test other sides
      s = s.borderRight(false)
      expect(s.get("borderSides")).toBe(BorderSide.Top | BorderSide.Bottom | BorderSide.Left)
      
      s = s.borderBottom(false)
      expect(s.get("borderSides")).toBe(BorderSide.Top | BorderSide.Left)
      
      s = s.borderLeft(false)
      expect(s.get("borderSides")).toBe(BorderSide.Top)
    })
    
    it("sets border colors", () => {
      const s = style()
        .borderForeground(Colors.red)
        .borderBackground(Colors.blue)
      
      expect(s.get("borderForeground")).toEqual(Colors.red)
      expect(s.get("borderBackground")).toEqual(Colors.blue)
    })
  })
  
  describe("Spacing Methods", () => {
    describe("padding", () => {
      it("sets all sides with single value", () => {
        const s = style().padding(10)
        expect(s.get("padding")).toEqual({ top: 10, right: 10, bottom: 10, left: 10 })
      })
      
      it("sets vertical/horizontal with two values", () => {
        const s = style().padding(10, 20)
        expect(s.get("padding")).toEqual({ top: 10, right: 20, bottom: 10, left: 20 })
      })
      
      it("sets top/horizontal/bottom with three values", () => {
        const s = style().padding(10, 20, 30)
        expect(s.get("padding")).toEqual({ top: 10, right: 20, bottom: 30, left: 20 })
      })
      
      it("sets all four sides individually", () => {
        const s = style().padding(10, 20, 30, 40)
        expect(s.get("padding")).toEqual({ top: 10, right: 20, bottom: 30, left: 40 })
      })
      
      it("sets individual padding sides", () => {
        const s = style()
          .paddingTop(10)
          .paddingRight(20)
          .paddingBottom(30)
          .paddingLeft(40)
        
        expect(s.get("padding")).toEqual({ top: 10, right: 20, bottom: 30, left: 40 })
      })
      
      it("sets padding with explicit sides", () => {
        const s = style().paddingSides({ top: 5, left: 15 })
        const padding = s.get("padding")
        expect(padding?.top).toBe(5)
        expect(padding?.left).toBe(15)
        expect(padding?.right).toBe(0)
        expect(padding?.bottom).toBe(0)
      })
    })
    
    describe("margin", () => {
      it("sets all sides with single value", () => {
        const s = style().margin(10)
        expect(s.get("margin")).toEqual({ top: 10, right: 10, bottom: 10, left: 10 })
      })
      
      it("sets vertical/horizontal with two values", () => {
        const s = style().margin(10, 20)
        expect(s.get("margin")).toEqual({ top: 10, right: 20, bottom: 10, left: 20 })
      })
      
      it("sets top/horizontal/bottom with three values", () => {
        const s = style().margin(10, 20, 30)
        expect(s.get("margin")).toEqual({ top: 10, right: 20, bottom: 30, left: 20 })
      })
      
      it("sets all four sides individually", () => {
        const s = style().margin(10, 20, 30, 40)
        expect(s.get("margin")).toEqual({ top: 10, right: 20, bottom: 30, left: 40 })
      })
      
      it("sets individual margin sides", () => {
        const s = style()
          .marginTop(10)
          .marginRight(20)
          .marginBottom(30)
          .marginLeft(40)
        
        expect(s.get("margin")).toEqual({ top: 10, right: 20, bottom: 30, left: 40 })
      })
      
      it("sets margin with explicit sides", () => {
        const s = style().marginSides({ bottom: 5, right: 15 })
        const margin = s.get("margin")
        expect(margin?.bottom).toBe(5)
        expect(margin?.right).toBe(15)
        expect(margin?.top).toBe(0)
        expect(margin?.left).toBe(0)
      })
    })
  })
  
  describe("Text Decoration Methods", () => {
    it("sets bold", () => {
      const s = style().bold()
      expect(s.get("bold")).toBe(true)
      
      const s2 = style().bold(false)
      expect(s2.get("bold")).toBe(false)
    })
    
    it("sets italic", () => {
      const s = style().italic()
      expect(s.get("italic")).toBe(true)
    })
    
    it("sets underline", () => {
      const s = style().underline()
      expect(s.get("underline")).toBe(true)
    })
    
    it("sets strikethrough", () => {
      const s = style().strikethrough()
      expect(s.get("strikethrough")).toBe(true)
    })
    
    it("sets inverse/reverse", () => {
      const s = style().inverse()
      expect(s.get("inverse")).toBe(true)
      
      const s2 = style().reverse()
      expect(s2.get("inverse")).toBe(true)
    })
    
    it("sets blink", () => {
      const s = style().blink()
      expect(s.get("blink")).toBe(true)
    })
    
    it("sets faint/dim", () => {
      const s = style().faint()
      expect(s.get("faint")).toBe(true)
      
      const s2 = style().dim()
      expect(s2.get("faint")).toBe(true)
    })
    
    it("sets hidden", () => {
      const s = style().hidden()
      expect(s.get("hidden")).toBe(true)
    })
    
    it("sets inline", () => {
      const s = style().inline()
      expect(s.get("inline")).toBe(true)
    })
  })
  
  describe("Dimension Methods", () => {
    it("sets width", () => {
      const s = style().width(100)
      expect(s.get("width")).toBe(100)
    })
    
    it("sets height", () => {
      const s = style().height(50)
      expect(s.get("height")).toBe(50)
    })
    
    it("sets minimum dimensions", () => {
      const s = style().minWidth(10).minHeight(20)
      expect(s.get("minWidth")).toBe(10)
      expect(s.get("minHeight")).toBe(20)
    })
    
    it("sets maximum dimensions", () => {
      const s = style().maxWidth(200).maxHeight(100)
      expect(s.get("maxWidth")).toBe(200)
      expect(s.get("maxHeight")).toBe(100)
    })
  })
  
  describe("Alignment Methods", () => {
    it("sets horizontal alignment", () => {
      const s = style().align(HorizontalAlign.Center)
      expect(s.get("horizontalAlign")).toBe(HorizontalAlign.Center)
    })
    
    it("sets vertical alignment", () => {
      const s = style().valign(VerticalAlign.Middle)
      expect(s.get("verticalAlign")).toBe(VerticalAlign.Middle)
      
      const s2 = style().verticalAlign(VerticalAlign.Bottom)
      expect(s2.get("verticalAlign")).toBe(VerticalAlign.Bottom)
    })
    
    it("centers content", () => {
      const s = style().center()
      expect(s.get("horizontalAlign")).toBe(HorizontalAlign.Center)
    })
    
    it("middles content", () => {
      const s = style().middle()
      expect(s.get("verticalAlign")).toBe(VerticalAlign.Middle)
    })
  })
  
  describe("Transform Methods", () => {
    it("sets text transform", () => {
      const s = style().transform({ _tag: "uppercase" })
      expect(s.get("transform")).toEqual({ _tag: "uppercase" })
    })
    
    it("sets uppercase transform", () => {
      const s = style().uppercase()
      expect(s.get("transform")).toEqual({ _tag: "uppercase" })
    })
    
    it("sets lowercase transform", () => {
      const s = style().lowercase()
      expect(s.get("transform")).toEqual({ _tag: "lowercase" })
    })
    
    it("sets capitalize transform", () => {
      const s = style().capitalize()
      expect(s.get("transform")).toEqual({ _tag: "capitalize" })
    })
    
    it("sets text transform with string", () => {
      const s = style().textTransform("uppercase")
      expect(s.get("transform")?._tag).toBe("uppercase")
    })
  })
  
  describe("Overflow Methods", () => {
    it("sets overflow", () => {
      const s = style().overflow("hidden")
      expect(s.get("overflow")).toBe("hidden")
    })
    
    it("sets word break", () => {
      const s = style().wordBreak("break-all")
      expect(s.get("wordBreak")).toBe("break-all")
    })
    
    it("enables word wrap", () => {
      const s = style().wordWrap()
      expect(s.get("overflow")).toBe("wrap")
      
      const s2 = style().wordWrap(false)
      expect(s2.get("overflow")).toBe("visible")
    })
    
    it("sets position", () => {
      const s = style().position("absolute", 10, 20)
      // Position is stored as a transform for compatibility
      expect(s.has("transform")).toBe(true)
    })
  })
  
  describe("Composition Methods", () => {
    it("inherits from parent style", () => {
      const parent = style()
        .foreground(Colors.red)
        .bold()
        .padding(10)
      
      const child = style()
        .inherit(parent)
        .background(Colors.blue)
      
      // Child inherits inheritable properties
      expect(child.get("foreground")).toEqual(Colors.red)
      expect(child.get("bold")).toBe(true)
      expect(child.get("background")).toEqual(Colors.blue)
      
      // Non-inheritable properties are not inherited
      expect(child.get("padding")).toBeUndefined()
    })
    
    it("merges styles", () => {
      const s1 = style()
        .foreground(Colors.red)
        .bold()
        .padding(10)
      
      const s2 = style()
        .foreground(Colors.blue)
        .italic()
        .margin(20)
      
      const merged = s1.merge(s2)
      
      // s2 overrides s1
      expect(merged.get("foreground")).toEqual(Colors.blue)
      expect(merged.get("bold")).toBe(true)
      expect(merged.get("italic")).toBe(true)
      expect(merged.get("padding")).toEqual({ top: 10, right: 10, bottom: 10, left: 10 })
      expect(merged.get("margin")).toEqual({ top: 20, right: 20, bottom: 20, left: 20 })
    })
    
    it("copies style", () => {
      const s1 = style()
        .foreground(Colors.red)
        .bold()
      
      const s2 = s1.copy()
      
      expect(s2).not.toBe(s1)
      expect(s2.get("foreground")).toEqual(Colors.red)
      expect(s2.get("bold")).toBe(true)
    })
    
    it("resets style", () => {
      const s = style()
        .foreground(Colors.red)
        .bold()
        .reset()
      
      expect(s.props).toEqual({})
      expect(Option.isNone(s.parent)).toBe(true)
    })
  })
  
  describe("Property Access", () => {
    it("checks if property exists", () => {
      const s = style().foreground(Colors.red)
      
      expect(s.has("foreground")).toBe(true)
      expect(s.has("background")).toBe(false)
    })
    
    it("gets property value", () => {
      const s = style().foreground(Colors.red).bold()
      
      expect(s.get("foreground")).toEqual(Colors.red)
      expect(s.get("bold")).toBe(true)
      expect(s.get("italic")).toBeUndefined()
    })
    
    it("converts to JSON", () => {
      const parent = style().foreground(Colors.red)
      const child = style().inherit(parent).bold()
      
      const json = child.toJSON()
      
      expect(json.props).toEqual({ bold: true })
      expect(json.parent).not.toBeNull()
      expect(json.parent.props).toEqual({ foreground: Colors.red })
    })
  })
  
  describe("Style Immutability", () => {
    it("maintains immutability", () => {
      const s1 = style().foreground(Colors.red)
      const s2 = s1.background(Colors.blue)
      const s3 = s2.bold()
      
      expect(s1.has("background")).toBe(false)
      expect(s1.has("bold")).toBe(false)
      
      expect(s2.has("foreground")).toBe(true)
      expect(s2.has("background")).toBe(true)
      expect(s2.has("bold")).toBe(false)
      
      expect(s3.has("foreground")).toBe(true)
      expect(s3.has("background")).toBe(true)
      expect(s3.has("bold")).toBe(true)
    })
  })
  
  describe("Predefined Styles", () => {
    it("provides base style", () => {
      expect(Styles.Base.props).toEqual({})
    })
    
    it("provides text decoration styles", () => {
      expect(Styles.Bold.get("bold")).toBe(true)
      expect(Styles.Italic.get("italic")).toBe(true)
      expect(Styles.Underline.get("underline")).toBe(true)
      expect(Styles.Strikethrough.get("strikethrough")).toBe(true)
      expect(Styles.Faint.get("faint")).toBe(true)
    })
    
    it("provides centered style", () => {
      expect(Styles.Center.get("horizontalAlign")).toBe(HorizontalAlign.Center)
      expect(Styles.Center.get("verticalAlign")).toBe(VerticalAlign.Middle)
    })
    
    it("provides hidden style", () => {
      expect(Styles.Hidden.get("hidden")).toBe(true)
    })
  })
  
  describe("Complex Scenarios", () => {
    it("handles deep inheritance chain", () => {
      const grandparent = style().foreground(Colors.red).bold()
      const parent = style().inherit(grandparent).italic()
      const child = style().inherit(parent).underline()
      
      expect(child.get("foreground")).toEqual(Colors.red)
      expect(child.get("bold")).toBe(true)
      expect(child.get("italic")).toBe(true)
      expect(child.get("underline")).toBe(true)
    })
    
    it("handles complex border configuration", () => {
      const s = style()
        .border(Borders.Normal, BorderSide.All)
        .borderTop(false)
        .borderBottom(false)
        .borderForeground(Colors.red)
      
      expect(s.get("border")).toEqual(Borders.Normal)
      expect(s.get("borderSides")).toBe(BorderSide.Left | BorderSide.Right)
      expect(s.get("borderForeground")).toEqual(Colors.red)
    })
    
    it("chains multiple style operations", () => {
      const s = style()
        .foreground(Colors.red)
        .background(Colors.blue)
        .bold()
        .italic()
        .underline()
        .padding(10, 20)
        .margin(5)
        .border(Borders.Normal)
        .align(HorizontalAlign.Center)
        .valign(VerticalAlign.Middle)
        .width(100)
        .height(50)
      
      expect(s.get("foreground")).toEqual(Colors.red)
      expect(s.get("background")).toEqual(Colors.blue)
      expect(s.get("bold")).toBe(true)
      expect(s.get("italic")).toBe(true)
      expect(s.get("underline")).toBe(true)
      expect(s.get("padding")).toEqual({ top: 10, right: 20, bottom: 10, left: 20 })
      expect(s.get("margin")).toEqual({ top: 5, right: 5, bottom: 5, left: 5 })
      expect(s.get("border")).toEqual(Borders.Normal)
      expect(s.get("horizontalAlign")).toBe(HorizontalAlign.Center)
      expect(s.get("verticalAlign")).toBe(VerticalAlign.Middle)
      expect(s.get("width")).toBe(100)
      expect(s.get("height")).toBe(50)
    })
  })
})