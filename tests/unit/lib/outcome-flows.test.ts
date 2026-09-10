import { describe, it, expect } from "vitest"
import {
  OUTCOME_FLOWS,
  resolveFlow,
  fillTokens,
  type OutcomeContext,
} from "@/lib/outcome-flows"
import type { CallOutcome } from "@/lib/schemas/call-attempt"

const ctx = (over: Partial<OutcomeContext> = {}): OutcomeContext => ({
  readyNow: false,
  attemptNumber: 1,
  ...over,
})

describe("resolveFlow", () => {
  it("returns null for the empty outcome", () => {
    expect(resolveFlow("", ctx())).toBeNull()
  })

  it("engaged → ready picks the physical-meeting flow, else nurture", () => {
    expect(resolveFlow("engaged", ctx({ readyNow: true }))).toBe(OUTCOME_FLOWS["engaged-ready"])
    expect(resolveFlow("engaged", ctx({ readyNow: false }))).toBe(OUTCOME_FLOWS["engaged-nurture"])
  })

  it("not_interested resolves by niReason", () => {
    expect(resolveFlow("not_interested", ctx({ niReason: "timing_budget" }))).toBe(
      OUTCOME_FLOWS["not_interested-timing_budget"],
    )
    expect(resolveFlow("not_interested", ctx({ niReason: "already_purchased" }))).toBe(
      OUTCOME_FLOWS["not_interested-already_purchased"],
    )
  })

  it("not_interested with no reason defaults to genuine_no", () => {
    expect(resolveFlow("not_interested", ctx())).toBe(OUTCOME_FLOWS["not_interested-genuine_no"])
  })

  it("not_interested with an unknown reason resolves to null", () => {
    expect(resolveFlow("not_interested", ctx({ niReason: "bogus" }))).toBeNull()
  })

  it("no_response switches to the exhausted flow on the 4th attempt", () => {
    expect(resolveFlow("no_response", ctx({ attemptNumber: 3 }))).toBe(OUTCOME_FLOWS["no_response"])
    expect(resolveFlow("no_response", ctx({ attemptNumber: 4 }))).toBe(OUTCOME_FLOWS["no_response-exhausted"])
    expect(resolveFlow("no_response", ctx({ attemptNumber: 5 }))).toBe(OUTCOME_FLOWS["no_response-exhausted"])
  })

  it("maps the direct-key outcomes", () => {
    expect(resolveFlow("call_back_requested", ctx())).toBe(OUTCOME_FLOWS["call_back_requested"])
    expect(resolveFlow("wrong_number", ctx())).toBe(OUTCOME_FLOWS["wrong_number"])
    expect(resolveFlow("replied", ctx())).toBe(OUTCOME_FLOWS["replied"])
  })
})

describe("OUTCOME_FLOWS registry integrity", () => {
  it("every entry's key matches its map key", () => {
    for (const [k, flow] of Object.entries(OUTCOME_FLOWS)) {
      expect(flow.key).toBe(k)
    }
  })

  it("every edge references a node that exists in the same flow", () => {
    for (const flow of Object.values(OUTCOME_FLOWS)) {
      const ids = new Set(flow.nodes.map((n) => n.id))
      for (const edge of flow.edges) {
        expect(ids.has(edge.from)).toBe(true)
        expect(ids.has(edge.to)).toBe(true)
      }
    }
  })

  it("only engaged flows require qualification", () => {
    const requiring = Object.values(OUTCOME_FLOWS)
      .filter((f) => f.requiresQualification)
      .map((f) => f.key)
      .sort()
    expect(requiring).toEqual(["engaged-nurture", "engaged-ready"])
  })

  it("engaged-ready is the only flow mandatory before commit", () => {
    const mandatory = Object.values(OUTCOME_FLOWS).filter((f) => f.mandatoryBeforeCommit).map((f) => f.key)
    expect(mandatory).toEqual(["engaged-ready"])
  })

  it("not-interested flows hide/soften the predicted-close, others require it", () => {
    expect(OUTCOME_FLOWS["not_interested-genuine_no"].predictedClose).toBe("hidden")
    expect(OUTCOME_FLOWS["not_interested-timing_budget"].predictedClose).toBe("optional")
    expect(OUTCOME_FLOWS["not_interested-already_purchased"].predictedClose).toBe("hidden")
    expect(OUTCOME_FLOWS["engaged-ready"].predictedClose).toBe("required")
  })

  it("each flow has a start node", () => {
    for (const flow of Object.values(OUTCOME_FLOWS)) {
      expect(flow.nodes.some((n) => n.kind === "start")).toBe(true)
    }
  })
})

describe("fillTokens", () => {
  it("interpolates {n} with the attempt number", () => {
    expect(fillTokens("No response (attempt {n}/4)", ctx({ attemptNumber: 2 }))).toBe(
      "No response (attempt 2/4)",
    )
  })

  it("interpolates {remaining} as attempts left before recovery", () => {
    expect(fillTokens("{remaining} attempt(s) left", ctx({ attemptNumber: 1 }))).toBe("3 attempt(s) left")
    expect(fillTokens("{remaining} attempt(s) left", ctx({ attemptNumber: 4 }))).toBe("0 attempt(s) left")
  })

  it("clamps remaining at zero past the 4th attempt", () => {
    expect(fillTokens("{remaining}", ctx({ attemptNumber: 6 }))).toBe("0")
  })

  it("replaces all occurrences of a token", () => {
    expect(fillTokens("{n}-{n}", ctx({ attemptNumber: 3 }))).toBe("3-3")
  })

  it("leaves text without tokens unchanged", () => {
    expect(fillTokens("no tokens here", ctx())).toBe("no tokens here")
  })
})

describe("resolveFlow ↔ outcome consistency", () => {
  const outcomes: CallOutcome[] = [
    "no_response",
    "wrong_number",
    "not_interested",
    "call_back_requested",
    "engaged",
    "replied",
  ]

  it("resolves a concrete flow for every real outcome", () => {
    for (const o of outcomes) {
      const flow = resolveFlow(o, ctx({ niReason: "genuine_no" }))
      expect(flow).not.toBeNull()
      expect(flow!.outcome).toBe(o)
    }
  })
})
