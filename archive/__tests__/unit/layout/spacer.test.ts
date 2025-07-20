/**
 * Tests for Layout Spacer and Divider utilities
 */

import { describe, it, expect } from "bun:test"
import { Effect } from "effect"
import {
  spacer,
  hspace,
  vspace,
  flexSpacer,
  divider,
  hdivider,
  vdivider,
  dottedDivider,
  dashedDivider,
  doubleDivider,
  thickDivider,
  spaced,
  separated
} from "@/layout/spacer"
import { DividerOrientation } from "@/layout/types"
import { style } from "@/styling/index"

// Helper to render a view for testing
async function renderView(view: any): Promise<string> {
  const result = await Effect.runPromise(view.render())
  return result as string
}

describe("Layout Spacer", () => {
  describe("spacer", () => {
    it("creates spacer with default size", async () => {
      const view = spacer()
      const result = await renderView(view)
      
      expect(result).toBe(" ")
      expect(view.width).toBe(1)
      expect(view.height).toBe(1)
      expect((view as any).flex).toBe(0)
    })

    it("creates spacer with custom size", async () => {
      const view = spacer({ size: 5 })
      const result = await renderView(view)
      
      expect(result).toBe("     ")
      expect(view.width).toBe(5)
      expect(view.height).toBe(1)
    })

    it("creates spacer with flex property", async () => {
      const view = spacer({ flex: 2 })
      const result = await renderView(view)
      
      expect(result).toBe(" ")
      expect((view as any).flex).toBe(2)
    })

    it("creates spacer with both size and flex", async () => {
      const view = spacer({ size: 3, flex: 1 })
      const result = await renderView(view)
      
      expect(result).toBe("   ")
      expect(view.width).toBe(3)
      expect((view as any).flex).toBe(1)
    })
  })

  describe("hspace", () => {
    it("creates horizontal spacer", async () => {
      const view = hspace(10)
      const result = await renderView(view)
      
      expect(result).toBe("          ")
      expect(view.width).toBe(10)
      expect(view.height).toBe(1)
    })

    it("creates zero-width horizontal spacer", async () => {
      const view = hspace(0)
      const result = await renderView(view)
      
      expect(result).toBe("")
      expect(view.width).toBe(0)
    })
  })

  describe("vspace", () => {
    it("creates vertical spacer", async () => {
      const view = vspace(3)
      const result = await renderView(view)
      
      expect(result).toBe("\n\n")
      expect(view.width).toBe(1)
      expect(view.height).toBe(3)
    })

    it("creates single line vertical spacer", async () => {
      const view = vspace(1)
      const result = await renderView(view)
      
      expect(result).toBe("")
      expect(view.height).toBe(1)
    })
  })

  describe("flexSpacer", () => {
    it("creates flexible spacer with default flex", async () => {
      const view = flexSpacer()
      const result = await renderView(view)
      
      expect(result).toBe(" ")
      expect((view as any).flex).toBe(1)
    })

    it("creates flexible spacer with custom flex", async () => {
      const view = flexSpacer(3)
      const result = await renderView(view)
      
      expect(result).toBe(" ")
      expect((view as any).flex).toBe(3)
    })
  })
})

describe("Layout Divider", () => {
  describe("divider", () => {
    it("creates horizontal divider with defaults", async () => {
      const view = divider()
      const result = await renderView(view)
      
      expect(result).toContain("─")
      expect(view.width).toBe(40)
      expect(view.height).toBe(1)
    })

    it("creates horizontal divider with custom char", async () => {
      const view = divider({ char: "=" })
      const result = await renderView(view)
      
      expect(result).toContain("=")
      expect(result.length).toBeGreaterThan(30)
    })

    it("creates vertical divider", async () => {
      const view = divider({ orientation: DividerOrientation.Vertical })
      const result = await renderView(view)
      
      expect(result).toContain("│")
      expect(result.split("\n").length).toBeGreaterThan(1)
      expect(view.width).toBe(1)
      expect(view.height).toBe(10)
    })

    it("creates vertical divider with custom char", async () => {
      const view = divider({ 
        orientation: DividerOrientation.Vertical,
        char: "|"
      })
      const result = await renderView(view)
      
      expect(result).toContain("|")
    })

    it("creates divider with custom style", async () => {
      const customStyle = style().bold() // Use available method
      const view = divider({ style: customStyle })
      const result = await renderView(view)
      
      // Should render without error (style application tested in styling tests)
      expect(result).toBeDefined()
    })
  })

  describe("hdivider", () => {
    it("creates horizontal divider", async () => {
      const view = hdivider()
      const result = await renderView(view)
      
      expect(result).toContain("─")
      expect(view.height).toBe(1)
    })

    it("creates horizontal divider with custom char", async () => {
      const view = hdivider("-")
      const result = await renderView(view)
      
      expect(result).toContain("-")
    })

    it("creates horizontal divider with style", async () => {
      const customStyle = style().bold()
      const view = hdivider(undefined, customStyle)
      const result = await renderView(view)
      
      expect(result).toBeDefined()
    })
  })

  describe("vdivider", () => {
    it("creates vertical divider", async () => {
      const view = vdivider()
      const result = await renderView(view)
      
      expect(result).toContain("│")
      expect(view.width).toBe(1)
    })

    it("creates vertical divider with custom char", async () => {
      const view = vdivider("|")
      const result = await renderView(view)
      
      expect(result).toContain("|")
    })
  })

  describe("styled dividers", () => {
    it("creates dotted divider", async () => {
      const view = dottedDivider()
      const result = await renderView(view)
      
      expect(result).toContain("·")
    })

    it("creates dashed divider", async () => {
      const view = dashedDivider()
      const result = await renderView(view)
      
      expect(result).toContain("╌")
    })

    it("creates double divider", async () => {
      const view = doubleDivider()
      const result = await renderView(view)
      
      expect(result).toContain("═")
    })

    it("creates thick divider", async () => {
      const view = thickDivider()
      const result = await renderView(view)
      
      expect(result).toContain("━")
    })

    it("creates styled dividers with custom style", async () => {
      const customStyle = style().italic() // Use available method
      
      const dotted = dottedDivider(customStyle)
      const dashed = dashedDivider(customStyle)
      const double = doubleDivider(customStyle)
      const thick = thickDivider(customStyle)
      
      const results = await Promise.all([
        renderView(dotted),
        renderView(dashed),
        renderView(double),
        renderView(thick)
      ])
      
      expect(results[0]).toContain("·")
      expect(results[1]).toContain("╌")
      expect(results[2]).toContain("═")
      expect(results[3]).toContain("━")
    })
  })
})

describe("Layout Helpers", () => {
  describe("spaced", () => {
    const mockView1 = {
      render: () => Effect.succeed("view1"),
      width: 5,
      height: 1
    }
    
    const mockView2 = {
      render: () => Effect.succeed("view2"),
      width: 5,
      height: 1
    }
    
    const mockView3 = {
      render: () => Effect.succeed("view3"),
      width: 5,
      height: 1
    }

    it("returns empty array for empty input", () => {
      const result = spaced([], 1)
      expect(result).toEqual([])
    })

    it("returns single view unchanged", () => {
      const result = spaced([mockView1], 1)
      expect(result).toEqual([mockView1])
    })

    it("adds vertical spacing between views", async () => {
      const result = spaced([mockView1, mockView2], 2)
      
      expect(result).toHaveLength(3)
      expect(result[0]).toBe(mockView1)
      expect(result[2]).toBe(mockView2)
      
      // Check the spacer
      const spacerResult = await renderView(result[1])
      expect(spacerResult).toBe("\n")
      expect(result[1]?.height).toBe(2)
    })

    it("adds horizontal spacing between views", async () => {
      const result = spaced([mockView1, mockView2], 3, "horizontal")
      
      expect(result).toHaveLength(3)
      expect(result[0]).toBe(mockView1)
      expect(result[2]).toBe(mockView2)
      
      // Check the spacer
      const spacerResult = await renderView(result[1])
      expect(spacerResult).toBe("   ")
      expect(result[1]?.width).toBe(3)
    })

    it("adds spacing between multiple views", () => {
      const result = spaced([mockView1, mockView2, mockView3], 1)
      
      expect(result).toHaveLength(5)
      expect(result[0]).toBe(mockView1)
      expect(result[2]).toBe(mockView2)
      expect(result[4]).toBe(mockView3)
    })
  })

  describe("separated", () => {
    const mockView1 = {
      render: () => Effect.succeed("view1"),
      width: 5,
      height: 1
    }
    
    const mockView2 = {
      render: () => Effect.succeed("view2"),
      width: 5,
      height: 1
    }
    
    const mockView3 = {
      render: () => Effect.succeed("view3"),
      width: 5,
      height: 1
    }

    it("returns empty array for empty input", () => {
      const result = separated([])
      expect(result).toEqual([])
    })

    it("returns single view unchanged", () => {
      const result = separated([mockView1])
      expect(result).toEqual([mockView1])
    })

    it("adds default divider between views", async () => {
      const result = separated([mockView1, mockView2])
      
      expect(result).toHaveLength(3)
      expect(result[0]).toBe(mockView1)
      expect(result[2]).toBe(mockView2)
      
      // Check the divider
      const dividerResult = await renderView(result[1])
      expect(dividerResult).toContain("─")
    })

    it("adds custom divider between views", async () => {
      const customDivider = vdivider("|")
      const result = separated([mockView1, mockView2], customDivider)
      
      expect(result).toHaveLength(3)
      expect(result[0]).toBe(mockView1)
      expect(result[1]).toBe(customDivider)
      expect(result[2]).toBe(mockView2)
    })

    it("adds dividers between multiple views", () => {
      const result = separated([mockView1, mockView2, mockView3])
      
      expect(result).toHaveLength(5)
      expect(result[0]).toBe(mockView1)
      expect(result[2]).toBe(mockView2)
      expect(result[4]).toBe(mockView3)
    })
  })
})

describe("Integration scenarios", () => {
  it("creates complex spaced layout", async () => {
    const views = [
      { render: () => Effect.succeed("A"), width: 1, height: 1 },
      { render: () => Effect.succeed("B"), width: 1, height: 1 },
      { render: () => Effect.succeed("C"), width: 1, height: 1 }
    ]
    
    const spacedViews = spaced(views, 2, "horizontal")
    expect(spacedViews).toHaveLength(5)
    
    const results = await Promise.all(spacedViews.map(renderView))
    expect(results).toEqual(["A", "  ", "B", "  ", "C"])
  })

  it("creates complex separated layout", async () => {
    const views = [
      { render: () => Effect.succeed("Header"), width: 6, height: 1 },
      { render: () => Effect.succeed("Content"), width: 7, height: 1 },
      { render: () => Effect.succeed("Footer"), width: 6, height: 1 }
    ]
    
    const separatedViews = separated(views, dottedDivider())
    expect(separatedViews).toHaveLength(5)
    
    const results = await Promise.all(separatedViews.map(renderView))
    expect(results[0]).toBe("Header")
    expect(results[1]).toContain("·")
    expect(results[2]).toBe("Content")
    expect(results[3]).toContain("·")
    expect(results[4]).toBe("Footer")
  })

  it("combines spacers and dividers", async () => {
    const flexSpace = flexSpacer(2)
    const dividerView = thickDivider()
    
    expect((flexSpace as any).flex).toBe(2)
    
    const dividerResult = await renderView(dividerView)
    expect(dividerResult).toContain("━")
  })

  it("handles edge cases", () => {
    // Zero-size arrays
    expect(spaced([], 1)).toEqual([])
    expect(separated([], hdivider())).toEqual([])
    
    // Single items
    const singleView = { render: () => Effect.succeed("single"), width: 1, height: 1 }
    expect(spaced([singleView], 5)).toEqual([singleView])
    expect(separated([singleView], vdivider())).toEqual([singleView])
  })
})