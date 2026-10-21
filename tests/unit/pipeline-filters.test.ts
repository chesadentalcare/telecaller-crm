import { describe, it, expect } from "vitest"
import {
  inCloseRange,
  inClosingCadence,
  applyModalFilters,
  applyTrackFilter,
  countTracks,
  type PipelineModalFilters,
} from "../../lib/pipeline/pipeline-filters"
import type { DripTrack } from "../../lib/types/lead"

type TestLead = {
  id: string
  dripTrack: DripTrack | null
  projectedClose: Date | null
  messagesSent?: number
  meetingPending?: boolean
  phoneVerified?: boolean
  flagged?: boolean
  repliedUnread?: boolean
}

const lead = (over: Partial<TestLead> = {}): TestLead => ({
  id: over.id ?? "x",
  dripTrack: over.dripTrack ?? null,
  projectedClose: over.projectedClose ?? null,
  messagesSent: over.messagesSent,
  meetingPending: over.meetingPending,
  phoneVerified: over.phoneVerified ?? true,
  flagged: over.flagged,
  repliedUnread: over.repliedUnread,
})

// Dates are built with LOCAL time (no trailing "Z") to match how the predicate
// parses the From/To inputs, so the tests are timezone-independent.
const at = (s: string) => new Date(s)

const NO_FILTERS: PipelineModalFilters = {
  repliedOnly: false,
  meetingPendingOnly: false,
  unverifiedOnly: false,
  flaggedOnly: false,
  closeFrom: "",
  closeTo: "",
  closingCadenceOnly: false,
}

const isReplied = (l: TestLead) => !!l.repliedUnread

describe("inCloseRange", () => {
  it("passes everything when no bounds are set (even a null date)", () => {
    expect(inCloseRange(null, "", "")).toBe(true)
    expect(inCloseRange(at("2026-11-02T12:00:00"), "", "")).toBe(true)
  })

  it("excludes a lead with no projected date once any bound is set", () => {
    expect(inCloseRange(null, "2026-11-01", "")).toBe(false)
    expect(inCloseRange(null, "", "2026-11-30")).toBe(false)
  })

  it("is inclusive on the lower bound (start of day)", () => {
    expect(inCloseRange(at("2026-11-02T00:00:00"), "2026-11-02", "")).toBe(true)
    expect(inCloseRange(at("2026-11-01T23:59:59"), "2026-11-02", "")).toBe(false)
  })

  it("is inclusive on the upper bound (end of day)", () => {
    expect(inCloseRange(at("2026-11-02T23:59:59"), "", "2026-11-02")).toBe(true)
    expect(inCloseRange(at("2026-11-03T00:00:00"), "", "2026-11-02")).toBe(false)
  })

  it("honours a two-sided range", () => {
    const from = "2026-11-01"
    const to = "2026-11-30"
    expect(inCloseRange(at("2026-11-15T09:00:00"), from, to)).toBe(true)
    expect(inCloseRange(at("2026-10-31T09:00:00"), from, to)).toBe(false)
    expect(inCloseRange(at("2026-12-01T09:00:00"), from, to)).toBe(false)
  })
})

describe("applyModalFilters", () => {
  const base = [
    lead({ id: "a", dripTrack: "1-month", projectedClose: at("2026-11-02T10:00:00"), phoneVerified: true }),
    lead({ id: "b", dripTrack: "3-month", projectedClose: at("2026-12-20T10:00:00"), phoneVerified: false }),
    lead({ id: "c", dripTrack: null, projectedClose: null, meetingPending: true, flagged: true, repliedUnread: true }),
  ]

  it("returns everything when no filter is active", () => {
    expect(applyModalFilters(base, NO_FILTERS, isReplied).map((l) => l.id)).toEqual(["a", "b", "c"])
  })

  it("repliedOnly keeps only replied leads", () => {
    const out = applyModalFilters(base, { ...NO_FILTERS, repliedOnly: true }, isReplied)
    expect(out.map((l) => l.id)).toEqual(["c"])
  })

  it("unverifiedOnly keeps only unverified leads", () => {
    // Only "b" has phoneVerified:false; "a" and "c" default to verified.
    const out = applyModalFilters(base, { ...NO_FILTERS, unverifiedOnly: true }, isReplied)
    expect(out.map((l) => l.id)).toEqual(["b"])
  })

  it("meetingPendingOnly and flaggedOnly narrow correctly", () => {
    expect(applyModalFilters(base, { ...NO_FILTERS, meetingPendingOnly: true }, isReplied).map((l) => l.id)).toEqual(["c"])
    expect(applyModalFilters(base, { ...NO_FILTERS, flaggedOnly: true }, isReplied).map((l) => l.id)).toEqual(["c"])
  })

  it("the closing-date range drops out-of-range and null-date leads", () => {
    const out = applyModalFilters(base, { ...NO_FILTERS, closeFrom: "2026-11-01", closeTo: "2026-11-30" }, isReplied)
    expect(out.map((l) => l.id)).toEqual(["a"])
  })
})

describe("applyTrackFilter", () => {
  const set = [
    lead({ id: "1", dripTrack: "1-month" }),
    lead({ id: "3", dripTrack: "3-month" }),
    lead({ id: "6", dripTrack: "6-month" }),
    lead({ id: "n", dripTrack: null }),
  ]

  it("'all' returns the whole set", () => {
    expect(applyTrackFilter(set, "all")).toHaveLength(4)
  })

  it("a specific track returns only that track", () => {
    expect(applyTrackFilter(set, "1-month").map((l) => l.id)).toEqual(["1"])
    expect(applyTrackFilter(set, "6-month").map((l) => l.id)).toEqual(["6"])
  })

  it("'none' returns only leads with no drip track", () => {
    expect(applyTrackFilter(set, "none").map((l) => l.id)).toEqual(["n"])
  })
})

describe("countTracks", () => {
  const set = [
    lead({ dripTrack: "1-month" }),
    lead({ dripTrack: "1-month" }),
    lead({ dripTrack: "3-month" }),
    lead({ dripTrack: "6-month" }),
    lead({ dripTrack: null }),
  ]

  it("counts each bucket", () => {
    expect(countTracks(set)).toEqual({ "1-month": 2, "3-month": 1, "6-month": 1, none: 1 })
  })

  it("the four buckets partition the list (counts sum to length)", () => {
    const c = countTracks(set)
    expect(c["1-month"] + c["3-month"] + c["6-month"] + c.none).toBe(set.length)
  })
})

// The bug this guards: the drip-track tab counts must be computed from the set
// AFTER the modal filters (incl. the closing-date range) are applied — NOT from
// the full unfiltered list. If someone re-points the counts at the raw list, the
// second assertion below fails.
describe("regression: track counts follow the closing-date filter", () => {
  const leads = [
    lead({ id: "a", dripTrack: "1-month", projectedClose: at("2026-11-05T10:00:00") }), // in range
    lead({ id: "b", dripTrack: "1-month", projectedClose: at("2027-02-01T10:00:00") }), // out of range
    lead({ id: "c", dripTrack: "3-month", projectedClose: at("2026-11-20T10:00:00") }), // in range
    lead({ id: "d", dripTrack: "3-month", projectedClose: null }),                      // no date
    lead({ id: "e", dripTrack: "6-month", projectedClose: at("2026-11-28T10:00:00") }), // in range
    lead({ id: "f", dripTrack: null, projectedClose: at("2026-11-10T10:00:00") }),      // in range, no track
  ]
  const filters: PipelineModalFilters = { ...NO_FILTERS, closeFrom: "2026-11-01", closeTo: "2026-11-30" }

  it("unfiltered counts are the full totals", () => {
    expect(countTracks(leads)).toEqual({ "1-month": 2, "3-month": 2, "6-month": 1, none: 1 })
  })

  it("counts shrink to only in-range leads after the modal filter", () => {
    const preTrack = applyModalFilters(leads, filters, isReplied)
    expect(countTracks(preTrack)).toEqual({ "1-month": 1, "3-month": 1, "6-month": 1, none: 1 })
  })

  it("the per-track list length equals that track's badge count", () => {
    const preTrack = applyModalFilters(leads, filters, isReplied)
    const counts = countTracks(preTrack)
    for (const track of ["1-month", "3-month", "6-month"] as const) {
      expect(applyTrackFilter(preTrack, track)).toHaveLength(counts[track])
    }
    expect(applyTrackFilter(preTrack, "none")).toHaveLength(counts.none)
  })
})

describe("inClosingCadence", () => {
  it("every native 1-month lead counts, at any step", () => {
    expect(inClosingCadence(lead({ dripTrack: "1-month", messagesSent: 0 }))).toBe(true)
    expect(inClosingCadence(lead({ dripTrack: "1-month", messagesSent: 8 }))).toBe(true)
  })

  it("a 3-month lead counts only from its sprint (step 13)", () => {
    expect(inClosingCadence(lead({ dripTrack: "3-month", messagesSent: 12 }))).toBe(false)
    expect(inClosingCadence(lead({ dripTrack: "3-month", messagesSent: 13 }))).toBe(true)
  })

  it("a 6-month lead counts only from its sprint (step 20)", () => {
    expect(inClosingCadence(lead({ dripTrack: "6-month", messagesSent: 19 }))).toBe(false)
    expect(inClosingCadence(lead({ dripTrack: "6-month", messagesSent: 20 }))).toBe(true)
  })

  it("a lead not in a drip never counts", () => {
    expect(inClosingCadence(lead({ dripTrack: null }))).toBe(false)
  })
})

describe("applyModalFilters — closingCadenceOnly", () => {
  const set = [
    lead({ id: "1m", dripTrack: "1-month", messagesSent: 2 }),          // in
    lead({ id: "3m-early", dripTrack: "3-month", messagesSent: 5 }),    // out (before sprint)
    lead({ id: "3m-sprint", dripTrack: "3-month", messagesSent: 15 }),  // in
    lead({ id: "6m-early", dripTrack: "6-month", messagesSent: 10 }),   // out
    lead({ id: "6m-sprint", dripTrack: "6-month", messagesSent: 22 }),  // in
    lead({ id: "nodrip", dripTrack: null }),                            // out
  ]

  it("keeps only leads in the 1-month closing cadence", () => {
    const out = applyModalFilters(set, { ...NO_FILTERS, closingCadenceOnly: true }, isReplied)
    expect(out.map((l) => l.id)).toEqual(["1m", "3m-sprint", "6m-sprint"])
  })

  it("does nothing when the toggle is off", () => {
    expect(applyModalFilters(set, NO_FILTERS, isReplied)).toHaveLength(set.length)
  })
})
