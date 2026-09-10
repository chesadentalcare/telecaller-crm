import { describe, it, expect } from "vitest"
import { cn } from "@/lib/utils"

// Guards F3: DialogContent's base ends with `sm:max-w-lg` (512px). tailwind-merge
// only lets a caller override it when the caller ALSO uses the `sm:` prefix.
// A bare `max-w-2xl` does NOT win at >=640px — that was the silent-clamp bug.
// These tests document why every wide dialog must pass an `sm:`-prefixed width.
const DIALOG_BASE = "w-full max-w-[calc(100%-2rem)] sm:max-w-lg"

describe("DialogContent width override semantics", () => {
  it("an sm:-prefixed caller width overrides the base (correct usage)", () => {
    const cls = cn(DIALOG_BASE, "sm:max-w-2xl")
    expect(cls).toContain("sm:max-w-2xl")
    expect(cls).not.toContain("sm:max-w-lg")
  })

  it("a bare (unprefixed) caller width does NOT override — reproduces the clamp bug", () => {
    const cls = cn(DIALOG_BASE, "max-w-2xl")
    // Both survive: base sm:max-w-lg still wins at >=640px, clamping to 512px.
    expect(cls).toContain("sm:max-w-lg")
    expect(cls).toContain("max-w-2xl")
  })

  it("sm:max-w-md narrows correctly (the mis-sized zoom dialog fix)", () => {
    const cls = cn(DIALOG_BASE, "sm:max-w-md")
    expect(cls).toContain("sm:max-w-md")
    expect(cls).not.toContain("sm:max-w-lg")
  })
})
