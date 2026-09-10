import { describe, it, expect } from "vitest"
import { repColor } from "./rep-color"

const PALETTE = [
  "#dc2626",
  "#2563eb",
  "#16a34a",
  "#9333ea",
  "#ea580c",
  "#0891b2",
  "#db2777",
  "#4f46e5",
  "#ca8a04",
  "#0d9488",
]

describe("repColor", () => {
  it("returns the neutral slate for a missing name", () => {
    expect(repColor()).toBe("#64748b")
    expect(repColor(undefined)).toBe("#64748b")
    expect(repColor(null)).toBe("#64748b")
    expect(repColor("")).toBe("#64748b")
  })

  it("always returns a colour from the palette", () => {
    for (const name of ["neha", "Rakesh Kumar", "Priya", "x", "a very long rep name here"]) {
      expect(PALETTE).toContain(repColor(name))
    }
  })

  it("is deterministic for the same name", () => {
    expect(repColor("neha")).toBe(repColor("neha"))
    expect(repColor("Rakesh Kumar")).toBe(repColor("Rakesh Kumar"))
  })

  it("is case-sensitive (different casing can map differently)", () => {
    const lower = repColor("neha")
    const upper = repColor("NEHA")
    expect(PALETTE).toContain(lower)
    expect(PALETTE).toContain(upper)
    expect(typeof lower).toBe("string")
  })

  it("matches the hash formula for a known input", () => {
    const name = "neha"
    let hash = 0
    for (let i = 0; i < name.length; i++) {
      hash = (hash * 31 + name.charCodeAt(i)) >>> 0
    }
    expect(repColor(name)).toBe(PALETTE[hash % PALETTE.length])
  })
})
