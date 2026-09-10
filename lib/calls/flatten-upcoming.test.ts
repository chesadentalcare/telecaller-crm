import { describe, it, expect } from "vitest"
import {
  lastOutcomeLabel,
  distinctKinds,
  dayKey,
  parseDayKey,
  flattenUpcoming,
  flattenCallsDue,
  buildByDay,
  pickDefaultDay,
  type CallEntry,
} from "@/lib/calls/flatten-upcoming"
import type { CallsDueLead, UpcomingCalls } from "@/lib/types/lead"

const at = (iso: string) => new Date(iso)

const entry = (over: Partial<CallEntry> = {}): CallEntry => ({
  leadId: "1",
  name: "Dr. Rao",
  phone: "9812345670",
  at: at("2026-09-10T10:00:00.000Z"),
  kind: "callback",
  label: "Callback",
  ...over,
})

describe("lastOutcomeLabel", () => {
  it("prefixes a known outcome with its human label", () => {
    expect(lastOutcomeLabel("no_response")).toBe("Last: No response")
    expect(lastOutcomeLabel("engaged")).toBe("Last: Engaged")
  })

  it("returns 'Fresh call' when never called (null / undefined)", () => {
    expect(lastOutcomeLabel(null)).toBe("Fresh call")
    expect(lastOutcomeLabel(undefined)).toBe("Fresh call")
  })
})

describe("distinctKinds", () => {
  it("returns present kinds in stable legend order regardless of input order", () => {
    const entries = [
      entry({ kind: "drip" }),
      entry({ kind: "callback" }),
      entry({ kind: "drip" }),
      entry({ kind: "requalification" }),
    ]
    expect(distinctKinds(entries)).toEqual(["callback", "requalification", "drip"])
  })

  it("returns an empty array for no entries", () => {
    expect(distinctKinds([])).toEqual([])
  })
})

describe("dayKey / parseDayKey", () => {
  it("keys by LOCAL calendar day, not UTC", () => {
    const d = new Date(2026, 8, 10, 21, 30) // local Sept 10, evening
    expect(dayKey(d)).toBe("2026-09-10")
  })

  it("zero-pads month and day", () => {
    expect(dayKey(new Date(2026, 0, 5))).toBe("2026-01-05")
  })

  it("round-trips through parseDayKey to local midnight", () => {
    const d = parseDayKey("2026-03-07")
    expect(d.getFullYear()).toBe(2026)
    expect(d.getMonth()).toBe(2)
    expect(d.getDate()).toBe(7)
    expect(dayKey(d)).toBe("2026-03-07")
  })
})

describe("flattenUpcoming", () => {
  it("returns an empty array for undefined input", () => {
    expect(flattenUpcoming(undefined)).toEqual([])
  })

  it("maps scheduled calls, resolving reason → kind and label", () => {
    const up: UpcomingCalls = {
      scheduled: [
        {
          id: "10",
          name: "Dr. A",
          phone: "111",
          reason: "callback",
          scheduledAt: at("2026-09-11T05:00:00.000Z"),
          equipment: "Dental Chair",
          lastOutcome: "engaged",
        },
        {
          id: "11",
          name: "Dr. B",
          phone: "222",
          reason: "drip_anchor",
          scheduledAt: at("2026-09-12T05:00:00.000Z"),
          equipment: "Scanner",
        },
      ],
      drip: [],
    }
    const out = flattenUpcoming(up)
    expect(out).toHaveLength(2)
    expect(out[0]).toMatchObject({
      leadId: "10",
      kind: "callback",
      label: "Callback",
      equipment: "Dental Chair",
      lastOutcome: "engaged",
    })
    // drip_anchor maps to the "drip" kind but keeps its own REASON_LABEL
    expect(out[1]).toMatchObject({ kind: "drip", label: "Drip call", lastOutcome: null })
  })

  it("falls back to the raw reason string when unlabeled", () => {
    const up = {
      scheduled: [
        { id: "1", name: "X", phone: "1", reason: "unknown_reason", scheduledAt: at("2026-09-11T05:00:00.000Z"), equipment: "" },
      ],
      drip: [],
    } as unknown as UpcomingCalls
    const out = flattenUpcoming(up)
    expect(out[0].kind).toBe("drip") // unknown reason falls through to drip
    expect(out[0].label).toBe("unknown_reason")
  })

  it("expands each drip lead's touches, labeling by dripDay / label / touchIndex", () => {
    const up: UpcomingCalls = {
      scheduled: [],
      drip: [
        {
          id: "20",
          name: "Dr. Drip",
          phone: "333",
          equipment: "Chair",
          track: "3_month",
          messagesSent: 1,
          lastOutcome: "no_response",
          calls: [
            { at: at("2026-09-13T05:00:00.000Z"), label: "", dripDay: 3, touchIndex: 0 },
            { at: at("2026-09-20T05:00:00.000Z"), label: "Proof", dripDay: null, touchIndex: 4 },
            { at: at("2026-09-27T05:00:00.000Z"), label: "", dripDay: null, touchIndex: 6 },
          ],
        },
      ],
    }
    const out = flattenUpcoming(up)
    expect(out).toHaveLength(3)
    expect(out.map((e) => e.label)).toEqual(["Day 3", "Proof", "Call 7"])
    // per-lead metadata inherited by every touch
    expect(out.every((e) => e.kind === "drip" && e.track === "3_month" && e.lastOutcome === "no_response")).toBe(true)
  })
})

describe("flattenCallsDue", () => {
  it("maps worklist leads and tags them fromWorklist", () => {
    const leads: CallsDueLead[] = [
      {
        id: "5",
        name: "Dr. Due",
        phone: "444",
        reason: "post_meeting",
        scheduledAt: at("2026-09-10T05:00:00.000Z"),
        slot: null,
        equipment: "Chair",
        lastOutcome: "engaged",
      },
    ]
    const out = flattenCallsDue(leads)
    expect(out[0]).toMatchObject({
      leadId: "5",
      kind: "drip", // post_meeting is not a named kind → drip fallback
      label: "Post-meeting follow-up",
      fromWorklist: true,
      lastOutcome: "engaged",
    })
  })

  it("defaults lastOutcome to null when absent", () => {
    const leads = [
      { id: "6", name: "Y", phone: "5", reason: "first_contact", scheduledAt: at("2026-09-10T05:00:00.000Z"), slot: null, equipment: "" },
    ] as unknown as CallsDueLead[]
    const out = flattenCallsDue(leads)
    expect(out[0].kind).toBe("first_contact")
    expect(out[0].lastOutcome).toBeNull()
  })
})

describe("buildByDay", () => {
  it("buckets entries by local day and sorts each day chronologically", () => {
    const entries = [
      entry({ leadId: "b", at: new Date(2026, 8, 10, 15) }),
      entry({ leadId: "a", at: new Date(2026, 8, 10, 9) }),
      entry({ leadId: "c", at: new Date(2026, 8, 11, 9) }),
    ]
    const byDay = buildByDay(entries)
    expect([...byDay.keys()].sort()).toEqual(["2026-09-10", "2026-09-11"])
    expect(byDay.get("2026-09-10")!.map((e) => e.leadId)).toEqual(["a", "b"])
    expect(byDay.get("2026-09-11")!.map((e) => e.leadId)).toEqual(["c"])
  })

  it("returns an empty map for no entries", () => {
    expect(buildByDay([]).size).toBe(0)
  })
})

describe("pickDefaultDay", () => {
  const now = new Date(2026, 8, 10, 12)

  it("returns null when there are no days", () => {
    expect(pickDefaultDay(new Map(), now)).toBeNull()
  })

  it("prefers today when today has calls", () => {
    const byDay = buildByDay([
      entry({ at: new Date(2026, 8, 8, 9) }),
      entry({ at: new Date(2026, 8, 10, 9) }),
      entry({ at: new Date(2026, 8, 14, 9) }),
    ])
    expect(dayKey(pickDefaultDay(byDay, now)!)).toBe("2026-09-10")
  })

  it("falls back to the soonest FUTURE day when today is empty", () => {
    const byDay = buildByDay([
      entry({ at: new Date(2026, 8, 8, 9) }),
      entry({ at: new Date(2026, 8, 13, 9) }),
      entry({ at: new Date(2026, 8, 20, 9) }),
    ])
    expect(dayKey(pickDefaultDay(byDay, now)!)).toBe("2026-09-13")
  })

  it("falls back to the most recent PAST day when nothing today or future", () => {
    const byDay = buildByDay([
      entry({ at: new Date(2026, 8, 5, 9) }),
      entry({ at: new Date(2026, 8, 8, 9) }),
    ])
    expect(dayKey(pickDefaultDay(byDay, now)!)).toBe("2026-09-08")
  })
})
