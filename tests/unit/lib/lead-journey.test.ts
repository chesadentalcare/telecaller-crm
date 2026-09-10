import { describe, it, expect } from "vitest"
import { buildLeadJourney } from "@/lib/lead-journey"
import type { LeadDetail } from "@/lib/api/leads"

type Ext = Record<string, unknown>

const makeDetail = (over: {
  ext?: Ext
  attempts?: unknown[]
  drip?: unknown
  inbound?: unknown[]
  whatsapp?: unknown[]
  quotations?: unknown[]
  meetings?: unknown[]
  firstContact?: unknown
} = {}): LeadDetail => {
  const ext: Ext = {
    stage: "qualified",
    first_call_route: "drip_info",
    whatsapp_opted_out: 0,
    created_at: "2026-09-01T09:00:00.000Z",
    updated_at: "2026-09-05T09:00:00.000Z",
    equipment_interest: "Dental Chair",
    source: "Facebook Paid",
    ...over.ext,
  }
  return {
    extension: ext,
    attempts: over.attempts ?? [],
    drip: over.drip ?? null,
    inbound: over.inbound ?? [],
    whatsapp: over.whatsapp ?? [],
    quotations: over.quotations ?? [],
    meetings: over.meetings ?? [],
    firstContact: over.firstContact ?? null,
    sapLive: true,
  } as unknown as LeadDetail
}

describe("buildLeadJourney — base skeleton", () => {
  it("always emits a 'created' step plus a trailing 'current' step", () => {
    const j = buildLeadJourney(makeDetail({ ext: { first_call_route: "pending", stage: "new" } }))
    expect(j.steps[0].key).toBe("created")
    expect(j.steps[0].phase).toBe("intake")
    const last = j.steps[j.steps.length - 1]
    expect(last.key).toBe("current")
    expect(last.phase).toBe("current")
    expect(j.summary.totalEvents).toBe(j.steps.length)
  })

  it("joins equipment + source into the created detail", () => {
    const j = buildLeadJourney(makeDetail())
    expect(j.steps[0].detail).toBe("Dental Chair · Facebook Paid")
  })

  it("summary reflects qualified route + non-terminal defaults", () => {
    const { summary } = buildLeadJourney(makeDetail())
    expect(summary.stage).toBe("qualified")
    expect(summary.route).toBe("drip_info")
    expect(summary.qualified).toBe(true)
    expect(summary.terminal).toBeNull()
    expect(summary.inDrip).toBe(false)
    expect(summary.optedOut).toBe(false)
  })

  it("pending route is not qualified and emits no 'qualified' step", () => {
    const j = buildLeadJourney(makeDetail({ ext: { first_call_route: "pending" } }))
    expect(j.summary.qualified).toBe(false)
    expect(j.steps.some((s) => s.key === "qualified")).toBe(false)
  })
})

describe("buildLeadJourney — attempts", () => {
  it("renders each attempt with an outcome-derived title and tone", () => {
    const j = buildLeadJourney(
      makeDetail({
        attempts: [
          { id: 1, outcome: "no_response", not_interested_reason: null, attempted_by: "neha", notes: null, attempted_at: "2026-09-02T10:00:00.000Z" },
          { id: 2, outcome: "engaged", not_interested_reason: null, attempted_by: "neha", notes: "wants a quote", attempted_at: "2026-09-03T10:00:00.000Z" },
        ],
      }),
    )
    const noResp = j.steps.find((s) => s.key === "attempt-1")!
    expect(noResp.title).toBe("Call — no response")
    expect(noResp.tone).toBe("warn")
    const engaged = j.steps.find((s) => s.key === "attempt-2")!
    expect(engaged.title).toBe("Call — engaged")
    expect(engaged.tone).toBe("good")
    expect(engaged.detail).toBe("by neha — wants a quote")
  })

  it("labels not_interested with the reason and reason-driven tone", () => {
    const j = buildLeadJourney(
      makeDetail({
        attempts: [
          { id: 3, outcome: "not_interested", not_interested_reason: "genuine_no", attempted_by: "neha", notes: null, attempted_at: "2026-09-02T10:00:00.000Z" },
        ],
      }),
    )
    const step = j.steps.find((s) => s.key === "attempt-3")!
    expect(step.title).toBe("Not interested · genuine no / wrong fit")
    expect(step.tone).toBe("bad")
  })
})

describe("buildLeadJourney — drip", () => {
  it("emits an 'Entered drip' step with track label + origin, marks summary inDrip", () => {
    const j = buildLeadJourney(
      makeDetail({
        drip: {
          track: "3_month",
          status: "active",
          started_at: "2026-09-03T10:00:00.000Z",
          exited_at: null,
          current_message_index: 4,
          origin_outcome: "engaged_nurture",
        },
      }),
    )
    const enter = j.steps.find((s) => s.key === "drip-in")!
    expect(enter.title).toBe("Entered drip · 3-month track")
    expect(enter.detail).toBe("origin: engaged_nurture")
    expect(j.summary.inDrip).toBe(true)
    expect(j.summary.dripTrack).toBe("3-month track")
    const current = j.steps[j.steps.length - 1]
    expect(current.title).toBe("Now · In drip nurture")
    expect(current.detail).toContain("touch 4")
  })

  it("emits an auto-exit step when the drip is no longer active", () => {
    const j = buildLeadJourney(
      makeDetail({
        drip: {
          track: "1_month",
          status: "exited_replied",
          started_at: "2026-09-03T10:00:00.000Z",
          exited_at: "2026-09-06T10:00:00.000Z",
          exit_reason: "customer messaged back",
          current_message_index: 2,
        },
      }),
    )
    const out = j.steps.find((s) => s.key === "drip-out")!
    expect(out.title).toBe("Auto-left drip · customer replied")
    expect(out.detail).toBe("customer messaged back")
    expect(j.summary.inDrip).toBe(false)
  })
})

describe("buildLeadJourney — terminal & current-state precedence", () => {
  it("closed_won yields a WON terminal and current step", () => {
    const j = buildLeadJourney(makeDetail({ ext: { stage: "closed_won" } }))
    expect(j.summary.terminal).toBe("won")
    const current = j.steps[j.steps.length - 1]
    expect(current.title).toBe("Now · Deal WON")
    expect(current.tone).toBe("good")
  })

  it("closed_lost yields a LOST terminal", () => {
    const j = buildLeadJourney(makeDetail({ ext: { stage: "closed_lost", archive_reason: "bought elsewhere" } }))
    expect(j.summary.terminal).toBe("lost")
    const current = j.steps[j.steps.length - 1]
    expect(current.title).toBe("Now · Deal LOST")
    expect(current.detail).toBe("bought elsewhere")
  })

  it("archived stage yields an archived terminal", () => {
    const j = buildLeadJourney(makeDetail({ ext: { stage: "archived", archive_reason: "no_response_exhausted" } }))
    expect(j.summary.terminal).toBe("archived")
    expect(j.steps[j.steps.length - 1].title).toBe("Now · Archived")
  })

  it("terminal stages suppress awaitingReply even with inbound present", () => {
    const j = buildLeadJourney(
      makeDetail({
        ext: { stage: "closed_won" },
        inbound: [{ id: 1, intent: "meeting", body: "hi", received_at: "2026-09-04T10:00:00.000Z" }],
      }),
    )
    expect(j.summary.awaitingReply).toBe(false)
  })

  it("inbound on a live lead sets awaitingReply and a 'Needs reply' current step", () => {
    const j = buildLeadJourney(
      makeDetail({
        inbound: [{ id: 1, intent: "vague", body: "tell me more", received_at: "2026-09-04T10:00:00.000Z" }],
      }),
    )
    expect(j.summary.awaitingReply).toBe(true)
    const inboundStep = j.steps.find((s) => s.key === "inbound-1")!
    expect(inboundStep.title).toBe("Customer replied · vague")
    expect(inboundStep.tone).toBe("warn")
    expect(j.steps[j.steps.length - 1].title).toBe("Now · Needs reply")
  })

  it("opt-out (STOP) wins the current step over drip nurture", () => {
    const j = buildLeadJourney(
      makeDetail({
        ext: { whatsapp_opted_out: 1 },
        drip: { track: "1_month", status: "active", started_at: "2026-09-03T10:00:00.000Z", exited_at: null, current_message_index: 1 },
      }),
    )
    expect(j.summary.optedOut).toBe(true)
    expect(j.steps.some((s) => s.key === "optout")).toBe(true)
    expect(j.steps[j.steps.length - 1].title).toBe("Now · Opted out")
  })
})

describe("buildLeadJourney — chronological ordering", () => {
  it("orders events by timestamp regardless of the source order they were pushed", () => {
    const j = buildLeadJourney(
      makeDetail({
        ext: { created_at: "2026-09-01T00:00:00.000Z", first_call_route: "pending", callback_at: "2026-09-10T00:00:00.000Z" },
        attempts: [
          { id: 1, outcome: "no_response", not_interested_reason: null, attempted_by: "neha", notes: null, attempted_at: "2026-09-05T00:00:00.000Z" },
        ],
        inbound: [{ id: 9, intent: "meeting", body: "keen", received_at: "2026-09-03T00:00:00.000Z" }],
      }),
    )
    const order = j.steps.filter((s) => s.key !== "current").map((s) => s.key)
    // created (Sep1) → inbound (Sep3) → attempt (Sep5) → callback (Sep10)
    expect(order).toEqual(["created", "inbound-9", "attempt-1", "callback"])
  })
})

describe("buildLeadJourney — whatsapp & meetings mapping", () => {
  it("maps known whatsapp message types to their phase/actor/title", () => {
    const j = buildLeadJourney(
      makeDetail({
        whatsapp: [
          { id: 1, message_type: "drip", template_name: "chesa_m1_recap", sent_at: "2026-09-04T10:00:00.000Z", payload: null },
          { id: 2, message_type: "quotation", template_name: "quote", sent_at: "2026-09-05T10:00:00.000Z", payload: { text: "Your quote" } },
        ],
      }),
    )
    const drip = j.steps.find((s) => s.key === "wa-1")!
    expect(drip.title).toBe("Drip WhatsApp")
    expect(drip.phase).toBe("drip")
    const quote = j.steps.find((s) => s.key === "wa-2")!
    expect(quote.title).toBe("Quotation sent")
    expect(quote.detail).toBe("Your quote")
  })

  it("falls back for an unknown whatsapp message type", () => {
    const j = buildLeadJourney(
      makeDetail({
        whatsapp: [
          { id: 3, message_type: "mystery", template_name: null, sent_at: "2026-09-04T10:00:00.000Z", payload: null },
        ],
      }),
    )
    expect(j.steps.find((s) => s.key === "wa-3")!.title).toBe("WhatsApp sent")
  })

  it("labels a physical meeting with location, salesperson and summary state", () => {
    const j = buildLeadJourney(
      makeDetail({
        meetings: [
          { id: 7, meeting_type: "physical", location: "Clinic", assigned_salesperson: "Rakesh", meeting_summary_url: null, meeting_at: "2026-09-06T10:00:00.000Z" },
        ],
      }),
    )
    const m = j.steps.find((s) => s.key === "meeting-7")!
    expect(m.title).toBe("Physical meeting")
    expect(m.detail).toBe("Clinic · → Rakesh · no summary")
    expect(m.tone).toBe("warn")
  })
})
