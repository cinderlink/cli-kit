/**
 * String Width Calculation Tests
 * 
 * Critical tests for ensuring proper terminal width calculations
 * with various Unicode characters, emojis, and complex sequences.
 */

import { describe, test, expect } from "bun:test"
import { stringWidth, truncateString, padString } from "@/utils/string-width.ts"
import { formatCell } from "@/components/Table"

describe("String Width Calculations", () => {
  describe("stringWidth utility validation", () => {
    test("ASCII characters", () => {
      expect(stringWidth("Hello")).toBe(5)
      expect(stringWidth("Test123")).toBe(7)
      expect(stringWidth("")).toBe(0)
    })
    
    test("Common emojis", () => {
      expect(stringWidth("🔧")).toBe(2)  // Wrench
      expect(stringWidth("📁")).toBe(2)  // Folder
      expect(stringWidth("✅")).toBe(2)  // Checkmark
      expect(stringWidth("📋")).toBe(2)  // Clipboard
      expect(stringWidth("📚")).toBe(2)  // Books
      expect(stringWidth("🟡")).toBe(2)  // Yellow circle
      expect(stringWidth("🔴")).toBe(2)  // Red circle
      expect(stringWidth("🟢")).toBe(2)  // Green circle
      expect(stringWidth("❓")).toBe(2)  // Question mark
      expect(stringWidth("❌")).toBe(2)  // X mark
    })
    
    test("Emoji sequences", () => {
      expect(stringWidth("👨‍👩‍👧‍👦")).toBe(2)  // Family emoji (ZWJ sequence)
      expect(stringWidth("👨‍💻")).toBe(2)  // Man technologist
      expect(stringWidth("🏳️‍🌈")).toBe(2)  // Rainbow flag
      expect(stringWidth("👍🏻")).toBe(2)  // Thumbs up with skin tone
    })
    
    test("Mixed content", () => {
      expect(stringWidth("Git Dashboard 🔧")).toBe(16)
      expect(stringWidth("📁 Working Directory")).toBe(20)
      expect(stringWidth("✅ S")).toBe(4)
      expect(stringWidth("Status: 🟢 OK")).toBe(13)
    })
    
    test("Wide characters (CJK)", () => {
      expect(stringWidth("你好")).toBe(4)  // Chinese
      expect(stringWidth("こんにちは")).toBe(10)  // Japanese
      expect(stringWidth("안녕하세요")).toBe(10)  // Korean
    })
    
    test("Zero-width characters", () => {
      expect(stringWidth("e\u0301")).toBe(1)  // e with combining accent
      expect(stringWidth("\u200B")).toBe(0)  // Zero-width space
      expect(stringWidth("test\u200Bword")).toBe(8)  // Word with zero-width space
    })
    
    test("Control characters", () => {
      expect(stringWidth("\n")).toBe(0)
      expect(stringWidth("\t")).toBe(0)
      expect(stringWidth("\r")).toBe(0)
      expect(stringWidth("\x1b[31m")).toBe(0)  // ANSI escape sequence
    })
  })
  
  describe("formatCell function", () => {
    test("Basic alignment with ASCII", () => {
      expect(formatCell("test", 10, "left")).toBe("test      ")
      expect(formatCell("test", 10, "right")).toBe("      test")
      expect(formatCell("test", 10, "center")).toBe("   test   ")
    })
    
    test("Alignment with emojis", () => {
      expect(formatCell("✅", 5, "left")).toBe("✅   ")
      expect(formatCell("✅", 5, "right")).toBe("   ✅")
      expect(formatCell("✅", 6, "center")).toBe("  ✅  ")
    })
    
    test("Truncation with ASCII", () => {
      expect(formatCell("verylongtext", 5, "left")).toBe("very…")
      expect(formatCell("abcdefghij", 8, "left")).toBe("abcdefg…")
    })
    
    test("Truncation with emojis", () => {
      // Should not split emoji in half
      expect(formatCell("📁📁📁", 5, "left")).toBe("📁📁…")
      expect(formatCell("Test🔧More", 6, "left")).toBe("Test…")
      expect(formatCell("🔧🔧🔧", 3, "left")).toBe("🔧…")
    })
    
    test("Mixed content formatting", () => {
      expect(formatCell("Git 🔧", 10, "left")).toBe("Git 🔧    ")
      expect(formatCell("📁 Files", 12, "center")).toBe("  📁 Files  ")
      expect(formatCell("Status: ✅", 15, "right")).toBe("     Status: ✅")
    })
    
    test("Edge cases", () => {
      expect(formatCell("", 5, "left")).toBe("     ")
      expect(formatCell("x", 1, "left")).toBe("…")
      expect(formatCell("🔧", 1, "left")).toBe("…")  // Emoji doesn't fit
      expect(formatCell("test", 4, "left")).toBe("tes…")
      expect(formatCell("test", 3, "left")).toBe("te…")
    })
  })
  
  describe("Table rendering with Unicode", () => {
    test("Column width calculations", () => {
      const headers = ["Status", "📁 Files", "Size 📊"]
      const expectedWidths = [6, 8, 7]  // 📁 and 📊 are 2 chars wide each
      
      headers.forEach((header, i) => {
        expect(stringWidth(header)).toBe(expectedWidths[i] ?? 0)
      })
    })
    
    test("Row alignment with emojis", () => {
      const cells = [
        formatCell("✅", 8, "center"),    // "   ✅   "
        formatCell("file.ts", 15, "left"), // "file.ts        "
        formatCell("1.2KB", 7, "right")    // "  1.2KB"
      ]
      
      expect(cells[0]).toBe("   ✅   ")
      expect(cells[1]).toBe("file.ts        ")
      expect(cells[2]).toBe("  1.2KB")
      
      // All cells should render to their specified widths
      expect(stringWidth(cells[0] ?? "")).toBe(8)
      expect(stringWidth(cells[1] ?? "")).toBe(15)
      expect(stringWidth(cells[2] ?? "")).toBe(7)
    })
  })
  
  describe("Border calculations", () => {
    test("Box borders with emoji titles", () => {
      const title = "Git Dashboard 🔧"
      const titleWidth = stringWidth(title)
      const borderChar = "─"
      
      // Border should account for emoji width
      const minBorderWidth = titleWidth + 4  // 2 chars padding each side
      expect(minBorderWidth).toBe(20)
      
      // Creating a top border
      const topBorder = "┌" + borderChar.repeat(minBorderWidth) + "┐"
      expect(stringWidth(topBorder)).toBe(minBorderWidth + 2)
    })
  })
  
  describe("truncateString function", () => {
    test("Basic truncation", () => {
      expect(truncateString("Hello World", 10)).toBe("Hello Wor…")
      expect(truncateString("Hello", 10)).toBe("Hello")
      expect(truncateString("Very long text", 5)).toBe("Very…")
    })
    
    test("Truncation with emojis", () => {
      expect(truncateString("Hello 🔧 World", 8)).toBe("Hello …")
      expect(truncateString("🔧🔧🔧🔧", 5)).toBe("🔧🔧…")
      expect(truncateString("Text 📁📁", 7)).toBe("Text …")
    })
    
    test("Custom suffix", () => {
      expect(truncateString("Hello World", 8, "...")).toBe("Hello...")
      expect(truncateString("Long text", 7, "→")).toBe("Long t→")
    })
    
    test("Edge cases", () => {
      expect(truncateString("", 5)).toBe("")
      expect(truncateString("x", 1)).toBe("x")
      expect(truncateString("test", 1)).toBe("…")
      expect(truncateString("test", 0)).toBe("")
    })
  })
  
  describe("padString function", () => {
    test("Left padding", () => {
      expect(padString("test", 10, "left")).toBe("test      ")
      expect(padString("hi", 5, "left")).toBe("hi   ")
    })
    
    test("Right padding", () => {
      expect(padString("test", 10, "right")).toBe("      test")
      expect(padString("hi", 5, "right")).toBe("   hi")
    })
    
    test("Center padding", () => {
      expect(padString("test", 10, "center")).toBe("   test   ")
      expect(padString("hi", 6, "center")).toBe("  hi  ")
      expect(padString("hi", 5, "center")).toBe(" hi  ")
    })
    
    test("Padding with emojis", () => {
      expect(padString("🔧", 5, "left")).toBe("🔧   ")
      expect(padString("🔧", 5, "right")).toBe("   🔧")
      expect(padString("🔧", 6, "center")).toBe("  🔧  ")
    })
    
    test("No padding needed", () => {
      expect(padString("test", 4)).toBe("test")
      expect(padString("test", 3)).toBe("test")
      expect(padString("🔧🔧", 4)).toBe("🔧🔧")
    })
  })
})

// Export for use in other tests if needed
export { formatCell }