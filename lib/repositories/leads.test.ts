import { describe, it, expect, vi, beforeEach } from "vitest"

const queues = vi.hoisted(() => ({
  pipeline: vi.fn(),
  noResponse: vi.fn(),
  drip: vi.fn(),
  idle: vi.fn(),
  dormant: vi.fn(),
  dripCompleted: vi.fn(),
  lost: vi.fn(),
  won: vi.fn(),
  repliesDue: vi.fn(),
  reactivation: vi.fn(),
  sixMonth: vi.fn(),
  requalification: vi.fn(),
  calling: vi.fn(),
  dripCalls: vi.fn(),
  meetingsDue: vi.fn(),
  suggestions: vi.fn(),
  counts: vi.fn(),
}))
const detail = vi.hoisted(() => vi.fn())
vi.mock("@/lib/api/leads", () => ({ leadsApi: { queues, detail } }))

import {
  fetchPipelineLeads,
  fetchDripLeads,
  fetchNoResponseLeads,
  fetchIdleLeads,
  fetchDormantLeads,
  fetchDripCompletedLeads,
  fetchLostLeads,
  fetchWonLeads,
  fetchRepliesDueLeads,
  fetchReactivationLeads,
  fetchSixMonthLeads,
  fetchRequalificationLeads,
  fetchCallsDueLeads,
  fetchMeetingsDueLeads,
  fetchUpcomingCalls,
  fetchSuggestions,
  fetchQueueCounts,
  fetchLeadById,
} from "./leads"
import { pipelineRows, leadDetail } from "@/test-utils/fixtures"

beforeEach(() => {
  Object.values(queues).forEach((f) => f.mockReset())
  detail.mockReset()
})

describe("fetchPipelineLeads — toPipeline mapping", () => {
  it("maps a fully-populated row to the PipelineLead shape", async () => {
    queues.pipeline.mockResolvedValue([pipelineRows[0]])
    const [lead] = await fetchPipelineLeads()

    expect(lead.id).toBe("4200")
    expect(lead.name).toBe("Dr. Asha Rao")
    expect(lead.phone).toBe("9812345670")
    expect(lead.equipment).toBe("Dental Chair")
    expect(lead.source).toBe("Facebook Paid")
    expect(lead.city).toBe("Bengaluru")
    expect(lead.state).toBe("Karnataka")
    expect(lead.status).toBe("qualified")
    expect(lead.phoneVerified).toBe(true)
    expect(lead.failedAttempts).toBe(1)
    expect(lead.createdAt).toBeInstanceOf(Date)
    expect(lead.lastAttemptTime).toBeInstanceOf(Date)
    expect(lead.value).toBe("5-8L")
    expect(lead.flagged).toBe(false)
    expect(lead.dripTrack).toBe("3-month")
    expect(lead.totalMessages).toBe(19)
  })

  it("substitutes placeholders when name / phone / equipment are missing", async () => {
    queues.pipeline.mockResolvedValue([
      { ...pipelineRows[1], customer_name: null, phone: null, equipment: null, source: null, city: null },
    ])
    const [lead] = await fetchPipelineLeads()
    expect(lead.name).toBe("Lead #4201")
    expect(lead.phone).toBe("—")
    expect(lead.equipment).toBe("—")
    expect(lead.source).toBe("—")
    expect(lead.city).toBe("—")
  })

  it("maps stage 'new' → 'new' status and null drip track through", async () => {
    queues.pipeline.mockResolvedValue([pipelineRows[1]])
    const [lead] = await fetchPipelineLeads()
    expect(lead.status).toBe("new")
    expect(lead.dripTrack).toBeNull()
    expect(lead.totalMessages).toBeUndefined()
    expect(lead.lastAttemptTime).toBeUndefined()
  })

  it("leaves replied undefined when there was never an inbound reply", async () => {
    queues.pipeline.mockResolvedValue([pipelineRows[0]])
    const [lead] = await fetchPipelineLeads()
    expect(lead.replied).toBeUndefined()
  })

  it("folds inbound-reply columns into a ReplyIndicator", async () => {
    queues.pipeline.mockResolvedValue([
      {
        ...pipelineRows[0],
        has_unread_reply: 1,
        awaiting_reply: 1,
        last_inbound_at: "2026-09-06T10:00:00.000Z",
        last_inbound_body: "call me",
        last_inbound_intent: "meeting",
      },
    ])
    const [lead] = await fetchPipelineLeads()
    expect(lead.replied).toEqual({
      hasUnread: true,
      awaitingReply: true,
      body: "call me",
      intent: "meeting",
      at: "2026-09-06T10:00:00.000Z",
    })
  })
})

describe("stage → status mapping (via pipeline)", () => {
  const cases: Array<[string, string]> = [
    ["physical_meeting_scheduled", "meeting-scheduled"],
    ["zoom_meeting_done", "meeting-scheduled"],
    ["qualified", "qualified"],
    ["full_qualified", "qualified"],
    ["rapid_qualified", "qualified"],
    ["unqualified", "unqualified"],
    ["new", "new"],
    ["some_unknown_stage", "contacted"],
  ]
  it.each(cases)("maps stage %s → %s", async (stage, expected) => {
    queues.pipeline.mockResolvedValue([{ ...pipelineRows[0], stage }])
    const [lead] = await fetchPipelineLeads()
    expect(lead.status).toBe(expected)
  })
})

describe("fetchDripLeads — toDrip mapping", () => {
  it("maps track codes to front-end labels and picks the right total", async () => {
    queues.drip.mockResolvedValue([
      {
        id: 5,
        track: "1_month",
        messages_sent: 3,
        started_at: "2026-09-01T00:00:00.000Z",
        next_message_at: null,
        last_engagement: null,
        equipment: "Chair",
        customer_name: "Dr X",
        phone: "9000000000",
        city: null,
        state: null,
      },
    ])
    const [lead] = await fetchDripLeads()
    expect(lead.track).toBe("1-month")
    expect(lead.totalMessages).toBe(9)
    expect(lead.messagesSent).toBe(3)
    expect(lead.nextMessageIn).toBe(0)
    expect(lead.lastEngagement).toEqual(new Date(0))
  })

  it("maps 3_month and 6_plus_month totals", async () => {
    queues.drip.mockResolvedValue([
      { id: 1, track: "3_month", messages_sent: 0, started_at: null, next_message_at: null, last_engagement: null, equipment: null, customer_name: null, phone: null },
      { id: 2, track: "6_plus_month", messages_sent: 0, started_at: null, next_message_at: null, last_engagement: null, equipment: null, customer_name: null, phone: null },
    ])
    const leads = await fetchDripLeads()
    expect(leads[0].track).toBe("3-month")
    expect(leads[0].totalMessages).toBe(19)
    expect(leads[1].track).toBe("6-month")
    expect(leads[1].totalMessages).toBe(13)
  })

  it("computes a non-negative seconds-until-next from a future next_message_at", async () => {
    const future = new Date(Date.now() + 60_000).toISOString()
    queues.drip.mockResolvedValue([
      { id: 3, track: "1_month", messages_sent: 1, started_at: null, next_message_at: future, last_engagement: null, equipment: null, customer_name: null, phone: null },
    ])
    const [lead] = await fetchDripLeads()
    expect(lead.nextMessageIn).toBeGreaterThan(0)
    expect(lead.nextMessageIn).toBeLessThanOrEqual(60)
  })

  it("clamps a past next_message_at to 0 seconds", async () => {
    const past = new Date(Date.now() - 60_000).toISOString()
    queues.drip.mockResolvedValue([
      { id: 4, track: "1_month", messages_sent: 1, started_at: null, next_message_at: past, last_engagement: null, equipment: null, customer_name: null, phone: null },
    ])
    const [lead] = await fetchDripLeads()
    expect(lead.nextMessageIn).toBe(0)
  })
})

describe("fetchNoResponseLeads — humanAgo formatting", () => {
  it("renders 'just now' for a sub-minute last attempt", async () => {
    queues.noResponse.mockResolvedValue([
      { id: 1, equipment: "Chair", customer_name: "Dr Y", phone: "9111111111", attempts: 4, last_attempt: new Date().toISOString() },
    ])
    const [lead] = await fetchNoResponseLeads()
    expect(lead.lastAttempt).toBe("just now")
    expect(lead.attempts).toBe(4)
  })

  it("renders minutes/hours/days ago buckets", async () => {
    const mins = new Date(Date.now() - 30 * 60_000).toISOString()
    const hrs = new Date(Date.now() - 3 * 3600_000).toISOString()
    const days = new Date(Date.now() - 2 * 86_400_000).toISOString()
    queues.noResponse.mockResolvedValue([
      { id: 1, equipment: null, customer_name: null, phone: null, attempts: 4, last_attempt: mins },
      { id: 2, equipment: null, customer_name: null, phone: null, attempts: 4, last_attempt: hrs },
      { id: 3, equipment: null, customer_name: null, phone: null, attempts: 4, last_attempt: days },
    ])
    const leads = await fetchNoResponseLeads()
    expect(leads[0].lastAttempt).toBe("30 min ago")
    expect(leads[1].lastAttempt).toBe("3 hours ago")
    expect(leads[2].lastAttempt).toBe("2 days ago")
  })
})

describe("fetchIdleLeads / fetchDormantLeads / fetchDripCompletedLeads", () => {
  it("maps an idle row, passing currentTrack through raw", async () => {
    queues.idle.mockResolvedValue([
      { id: 1, equipment: "Chair", customer_name: "Dr Z", phone: "9000", idle_days: 5, last_activity: new Date().toISOString(), drip_track: "1_month" },
    ])
    const [lead] = await fetchIdleLeads()
    expect(lead.idleDays).toBe(5)
    expect(lead.currentTrack).toBe("1_month")
    expect(lead.lastActivity).toBe("just now")
  })

  it("defaults dormant reason + maps drip_track to a front label", async () => {
    queues.dormant.mockResolvedValue([
      { id: 1, customer_name: null, phone: null, equipment: null, dormant_days: 40, reason: null, drip_track: "6_plus_month" },
    ])
    const [lead] = await fetchDormantLeads()
    expect(lead.dormantDays).toBe(40)
    expect(lead.reason).toBe("no response")
    expect(lead.dripTrack).toBe("6-month")
  })

  it("defaults the drip-completed reason and keeps a null drip_track null", async () => {
    queues.dripCompleted.mockResolvedValue([
      { id: 1, customer_name: null, phone: null, equipment: null, state: null, reason: null, completed_days: 3, drip_track: null },
    ])
    const [lead] = await fetchDripCompletedLeads()
    expect(lead.reason).toBe("Drip track completed")
    expect(lead.completedDays).toBe(3)
    expect(lead.dripTrack).toBeNull()
  })
})

describe("fetchLostLeads / fetchWonLeads", () => {
  it("maps lost row fields with fallbacks", async () => {
    queues.lost.mockResolvedValue([
      {
        id: 1, customer_name: "Dr L", phone: "9000", equipment: "Chair", city: "Pune", state: "MH",
        lost_days: 7, reason: null, lost_reason: "bought elsewhere", handed_off_at: null,
        sales_person: "rakesh", meeting_count: null, last_meeting_at: null,
      },
    ])
    const [lead] = await fetchLostLeads()
    expect(lead.reason).toBe("—")
    expect(lead.lostReason).toBe("bought elsewhere")
    expect(lead.lostDaysAgo).toBe(7)
    expect(lead.salesPerson).toBe("rakesh")
    expect(lead.meetingCount).toBe(0)
  })

  it("maps won row fields", async () => {
    queues.won.mockResolvedValue([
      { id: 2, customer_name: "Dr W", phone: "9000", equipment: "Scanner", won_days: 3, installation_date: "2026-10-10", won_by: "neha" },
    ])
    const [lead] = await fetchWonLeads()
    expect(lead.wonDaysAgo).toBe(3)
    expect(lead.installationDate).toBe("2026-10-10")
    expect(lead.wonBy).toBe("neha")
  })
})

describe("fetchRepliesDueLeads / fetchReactivationLeads / fetchSixMonthLeads / fetchRequalificationLeads", () => {
  it("maps a replies-due row", async () => {
    queues.repliesDue.mockResolvedValue([
      { id: 1, customer_name: "Dr R", phone: "9000", equipment: "Chair", city: null, state: null, last_outcome: "engaged", last_outcome_at: "2026-09-05", last_outcome_by: "neha" },
    ])
    const [lead] = await fetchRepliesDueLeads()
    expect(lead.lastOutcome).toBe("engaged")
    expect(lead.lastOutcomeBy).toBe("neha")
  })

  it("maps a reactivation row with humanAgo + raw drip fields", async () => {
    queues.reactivation.mockResolvedValue([
      { id: 1, customer_name: null, phone: null, equipment: null, handed_back_at: new Date().toISOString(), handed_back_by: "sales1", reason: "stalled", drip_track: "3_month", drip_message_index: 4, drip_next_at: "2026-09-10" },
    ])
    const [lead] = await fetchReactivationLeads()
    expect(lead.handedBackAt).toBe("just now")
    expect(lead.handedBackBy).toBe("sales1")
    expect(lead.dripTrack).toBe("3_month")
    expect(lead.dripMessageIndex).toBe(4)
  })

  it("coerces the six-month retouch flag to a boolean", async () => {
    queues.sixMonth.mockResolvedValue([
      { id: 1, customer_name: null, phone: null, equipment: null, source: null, timeline: "6_plus", reactivate_by: null, reason: null, retouch: 1 },
    ])
    const [lead] = await fetchSixMonthLeads()
    expect(lead.retouch).toBe(true)
    expect(lead.reactivateBy).toBe("—")
  })

  it("maps a requalification row with humanAgo requestedAgo", async () => {
    queues.requalification.mockResolvedValue([
      { id: 1, customer_name: null, phone: null, equipment: null, reason: "timing", requalify_at: new Date().toISOString(), timeline: null },
    ])
    const [lead] = await fetchRequalificationLeads()
    expect(lead.reason).toBe("timing")
    expect(lead.timeline).toBe("—")
    expect(lead.requestedAgo).toBe("just now")
  })
})

describe("fetchCallsDueLeads — toCallsDue mapping", () => {
  it("maps enriched phone, scheduledAt Date, and nested salesUpdate", async () => {
    queues.calling.mockResolvedValue([
      {
        id: 1, reason: "post_meeting", scheduled_at: "2026-09-10T09:00:00.000Z", slot: "morning",
        status: "pending", assigned_to: "neha", equipment: "Chair", customer_name: "Dr C", phone: "9812345670",
        sales_name: "rakesh", sales_phone: "9000000001",
        sales_update: { event: "visited", notes: "went well", logged_by: "rakesh", source: "sales_app", at: "2026-09-09T10:00:00.000Z" },
      },
    ])
    const [lead] = await fetchCallsDueLeads()
    expect(lead.phone).toBe("9812345670")
    expect(lead.reason).toBe("post_meeting")
    expect(lead.scheduledAt).toBeInstanceOf(Date)
    expect(lead.salesName).toBe("rakesh")
    expect(lead.salesUpdate).toEqual({
      event: "visited",
      notes: "went well",
      loggedBy: "rakesh",
      source: "sales_app",
      at: "2026-09-09T10:00:00.000Z",
    })
  })

  it("leaves salesUpdate null when the rep has not reported", async () => {
    queues.calling.mockResolvedValue([
      { id: 2, reason: "callback", scheduled_at: "2026-09-10T09:00:00.000Z", slot: null, status: "pending", assigned_to: "neha", equipment: null, customer_name: null, phone: "9000", sales_update: null },
    ])
    const [lead] = await fetchCallsDueLeads()
    expect(lead.salesUpdate).toBeNull()
    expect(lead.name).toBe("Lead #2")
  })
})

describe("fetchMeetingsDueLeads — toMeetingsDue mapping", () => {
  it("maps meeting id, type, join url and summaryUploaded flag", async () => {
    queues.meetingsDue.mockResolvedValue([
      {
        meeting_id: 27, id: 4200, meeting_type: "zoom", meeting_at: "2026-09-10T10:00:00.000Z",
        location: null, assigned_salesperson: "rakesh", zoom_join_url: "https://zoom/x", duration_minutes: 30,
        meeting_summary_url: null, stage: "zoom_meeting_done", equipment: "Chair", customer_name: "Dr M", phone: "9000",
      },
    ])
    const [lead] = await fetchMeetingsDueLeads()
    expect(lead.meetingId).toBe("27")
    expect(lead.meetingType).toBe("zoom")
    expect(lead.meetingAt).toBeInstanceOf(Date)
    expect(lead.joinUrl).toBe("https://zoom/x")
    expect(lead.summaryUploaded).toBe(false)
  })
})

describe("fetchUpcomingCalls — toScheduledCall / toDripCall", () => {
  it("maps scheduled + drip calls, converting touch timestamps to Dates", async () => {
    queues.dripCalls.mockResolvedValue({
      scheduled: [
        { id: 1, reason: "callback", scheduled_at: "2026-09-12T09:00:00.000Z", customer_name: "Dr S", phone: "9000", whatsapp_number: null, equipment: "Chair", last_outcome: "engaged", last_outcome_at: "2026-09-01" },
      ],
      drip: [
        {
          id: 2, customer_name: "Dr D", phone: "9001", whatsapp_number: "9001", equipment: "Scanner",
          track: "1_month", messages_sent: 2, last_outcome: null,
          calls: [{ at: "2026-09-15T09:00:00.000Z", label: "Touch 3", drip_day: 15, touch_index: 3 }],
        },
      ],
    })
    const res = await fetchUpcomingCalls()
    expect(res.scheduled[0].scheduledAt).toBeInstanceOf(Date)
    expect(res.scheduled[0].reason).toBe("callback")
    expect(res.drip[0].track).toBe("1_month")
    expect(res.drip[0].calls[0].at).toBeInstanceOf(Date)
    expect(res.drip[0].calls[0].touchIndex).toBe(3)
    expect(res.drip[0].calls[0].dripDay).toBe(15)
  })

  it("tolerates missing scheduled/drip arrays", async () => {
    queues.dripCalls.mockResolvedValue({})
    const res = await fetchUpcomingCalls()
    expect(res.scheduled).toEqual([])
    expect(res.drip).toEqual([])
  })
})

describe("fetchSuggestions — toSuggestion mapping", () => {
  it("stringifies both ids and coerces the boolean overlap flags", async () => {
    queues.suggestions.mockResolvedValue([
      {
        suggestion_id: 88, id: 4200, priority: "hot", readiness: 0.9, urgency: 0.8, why_hot: "engaged",
        why_closeable: null, closing_lever: null, risk_if_delayed: null, evidence: null, suggested_action: "call",
        confidence: "high", status: "new", rank_order: 1, run_at: "2026-09-10T06:00:00.000Z",
        call_due_today: 1, meeting_due_today: 0, customer_name: "Dr Q", phone: "9000", city: null, state: null,
        equipment: "Chair", assigned_to: "neha", last_outcome: "engaged", last_outcome_at: "2026-09-09",
      },
    ])
    const [lead] = await fetchSuggestions()
    expect(lead.id).toBe("4200")
    expect(lead.suggestionId).toBe("88")
    expect(lead.priority).toBe("hot")
    expect(lead.callDueToday).toBe(true)
    expect(lead.meetingDueToday).toBe(false)
    expect(lead.confidence).toBe("high")
  })
})

describe("fetchQueueCounts — count defaults", () => {
  it("fills missing optional counts with 0 and passes present ones through", async () => {
    queues.counts.mockResolvedValue({
      pipeline: 12, drip: 5, dormant: 2, noResponse: 4, idle: 1, reactivation: 0, sixMonth: 3,
      archived: 7, requalification: 1, lost: 8, callsDue: 6, reTouch: 2,
    })
    const c = await fetchQueueCounts()
    expect(c.pipeline).toBe(12)
    expect(c.closeToday).toBe(0)
    expect(c.dripCompleted).toBe(0)
    expect(c.won).toBe(0)
    expect(c.callsDueAwaitingReply).toBe(0)
    expect(c.pipelineAwaitingReply).toBe(0)
    expect(c.neglected).toBe(0)
    expect(c.lost).toBe(8)
  })
})

describe("fetchLeadById — detail → PipelineLead synthesis", () => {
  it("maps the extension row and counts failed no_response call attempts", async () => {
    detail.mockResolvedValue(leadDetail)
    const lead = await fetchLeadById("4200")
    expect(lead).not.toBeNull()
    expect(lead!.id).toBe("4200")
    expect(lead!.name).toBe("Dr. Asha Rao")
    expect(lead!.phone).toBe("—")
    expect(lead!.equipment).toBe("Dental Chair")
    expect(lead!.status).toBe("qualified")
    expect(lead!.phoneVerified).toBe(true)
    expect(lead!.failedAttempts).toBe(1)
    expect(lead!.createdAt).toBeInstanceOf(Date)
    expect(lead!.lastAttemptTime).toBeInstanceOf(Date)
  })

  it("falls back to a placeholder name when the extension has no customer_name", async () => {
    detail.mockResolvedValue({
      ...leadDetail,
      extension: { ...leadDetail.extension, customer_name: null },
    })
    const lead = await fetchLeadById("4200")
    expect(lead!.name).toBe("Lead #4200")
  })

  it("returns null when the detail fetch throws", async () => {
    detail.mockImplementationOnce(() => Promise.reject(new Error("404")))
    const lead = await fetchLeadById("999")
    expect(lead).toBeNull()
  })
})
