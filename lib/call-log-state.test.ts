import { describe, it, expect } from "vitest"
import { callLogState, firstEditConflict } from "./call-log-state"
import { CALL_OUTCOMES } from "@/lib/schemas/call-attempt"

describe("callLogState", () => {
  it("allows every outcome with no prior attempts", () => {
    const state = callLogState([])
    expect(state.locked).toBe(false)
    expect(state.lockReason).toBeNull()
    expect(state.allowed).toEqual([...CALL_OUTCOMES])
  })

  it("still offers wrong_number after only no_response attempts", () => {
    const state = callLogState(["no_response", "no_response"])
    expect(state.locked).toBe(false)
    expect(state.allowed).toContain("wrong_number")
  })

  it("locks calling once wrong_number is logged", () => {
    const state = callLogState(["wrong_number"])
    expect(state.locked).toBe(true)
    expect(state.lockReason).toMatch(/Wrong number/)
    expect(state.allowed).toEqual([])
  })

  it("wrong_number lock wins even when the lead was also reached", () => {
    const state = callLogState(["engaged", "wrong_number"])
    expect(state.locked).toBe(true)
    expect(state.allowed).toEqual([])
  })

  it.each(["engaged", "replied", "call_back_requested", "not_interested"] as const)(
    "drops wrong_number from options once reached via %s",
    (outcome) => {
      const state = callLogState([outcome])
      expect(state.locked).toBe(false)
      expect(state.lockReason).toBeNull()
      expect(state.allowed).not.toContain("wrong_number")
      expect(state.allowed).toEqual(CALL_OUTCOMES.filter((o) => o !== "wrong_number"))
    },
  )
})

describe("firstEditConflict", () => {
  it("returns null when the edited chain stays legal", () => {
    expect(firstEditConflict("no_response", ["engaged", "replied"])).toBeNull()
  })

  it("returns null for a single-attempt chain", () => {
    expect(firstEditConflict("engaged", [])).toBeNull()
  })

  it("flags a later wrong_number after the edit makes the lead reached", () => {
    const conflict = firstEditConflict("engaged", ["wrong_number"])
    expect(conflict).toEqual({ conflictAttempt: 2, conflictOutcome: "wrong_number" })
  })

  it("flags any attempt logged after a wrong_number in attempt #1", () => {
    const conflict = firstEditConflict("wrong_number", ["engaged"])
    expect(conflict).toEqual({ conflictAttempt: 2, conflictOutcome: "engaged" })
  })

  it("reports the FIRST conflicting attempt (1-based) in a longer chain", () => {
    const conflict = firstEditConflict("engaged", ["no_response", "wrong_number", "replied"])
    expect(conflict).toEqual({ conflictAttempt: 3, conflictOutcome: "wrong_number" })
  })

  it("allows a legal reached-then-more-reached chain after edit", () => {
    expect(firstEditConflict("engaged", ["replied", "call_back_requested"])).toBeNull()
  })
})
