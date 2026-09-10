import { describe, it, expect } from "vitest"
import { cn } from "./utils"

describe("cn", () => {
  it("joins plain class names", () => {
    expect(cn("a", "b", "c")).toBe("a b c")
  })

  it("drops falsy values", () => {
    expect(cn("a", false, null, undefined, "", "b")).toBe("a b")
  })

  it("resolves conditional objects and arrays (clsx)", () => {
    expect(cn({ a: true, b: false }, ["c", "d"])).toBe("a c d")
  })

  it("merges conflicting tailwind utilities keeping the last (twMerge)", () => {
    expect(cn("px-2", "px-4")).toBe("px-4")
    expect(cn("p-2", "p-4")).toBe("p-4")
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500")
  })

  it("keeps non-conflicting tailwind utilities", () => {
    expect(cn("px-2", "py-4")).toBe("px-2 py-4")
  })

  it("combines conditionals with conflict resolution", () => {
    expect(cn("px-2", { "px-4": true })).toBe("px-4")
    expect(cn("px-2", { "px-4": false })).toBe("px-2")
  })

  it("returns an empty string for no input", () => {
    expect(cn()).toBe("")
  })
})
