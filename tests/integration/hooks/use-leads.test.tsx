import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"
import { QueryClientProvider } from "@tanstack/react-query"
import React from "react"

import { makeTestQueryClient } from "@/tests/helpers/render"

const fetchRepliesDueLeads = vi.hoisted(() => vi.fn())
const fetchCallsDueLeads = vi.hoisted(() => vi.fn())
const fetchSuggestions = vi.hoisted(() => vi.fn())
const fetchPipelineLeads = vi.hoisted(() => vi.fn())

vi.mock("@/lib/repositories/leads", () => ({
  fetchPipelineLeads,
  fetchDripLeads: vi.fn(),
  fetchNoResponseLeads: vi.fn(),
  fetchIdleLeads: vi.fn(),
  fetchDormantLeads: vi.fn(),
  fetchDripCompletedLeads: vi.fn(),
  fetchLostLeads: vi.fn(),
  fetchSuggestions,
  fetchWonLeads: vi.fn(),
  fetchRepliesDueLeads,
  fetchReactivationLeads: vi.fn(),
  fetchSixMonthLeads: vi.fn(),
  fetchRequalificationLeads: vi.fn(),
  fetchCallsDueLeads,
  fetchMeetingsDueLeads: vi.fn(),
  fetchUpcomingCalls: vi.fn(),
  fetchQueueCounts: vi.fn(),
  fetchLeadById: vi.fn(),
}))

vi.mock("@/lib/api/leads", () => ({ leadsApi: {} }))

import {
  leadKeys,
  useRepliesDueLeads,
  useCallsDueLeads,
  useSuggestions,
  usePipelineLeads,
} from "@/hooks/use-leads"

function makeWrapper() {
  const qc = makeTestQueryClient()
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  )
  return { wrapper, qc }
}

describe("leadKeys query-key builder", () => {
  it("roots every key under the `leads` group", () => {
    expect(leadKeys.all).toEqual(["leads"])
  })

  it("builds the flat queue keys", () => {
    expect(leadKeys.pipeline()).toEqual(["leads", "pipeline"])
    expect(leadKeys.drip()).toEqual(["leads", "drip"])
    expect(leadKeys.noResponse()).toEqual(["leads", "no-response"])
    expect(leadKeys.repliesDue()).toEqual(["leads", "replies-due"])
    expect(leadKeys.callsDue()).toEqual(["leads", "calls-due"])
    expect(leadKeys.queueCounts()).toEqual(["leads", "queue-counts"])
    expect(leadKeys.suggestions()).toEqual(["leads", "suggestions"])
  })

  it("builds the parametrised detail keys with the id in the tail", () => {
    expect(leadKeys.detail("42")).toEqual(["leads", "detail", "42"])
    expect(leadKeys.fullDetail("42")).toEqual(["leads", "full-detail", "42"])
    expect(leadKeys.quotation("7")).toEqual(["leads", "quotation", "7"])
    expect(leadKeys.leadFollowUps("7")).toEqual(["leads", "lead-follow-ups", "7"])
    expect(leadKeys.closureRecord("7")).toEqual(["leads", "closure", "7"])
  })

  it("builds the notification keys", () => {
    expect(leadKeys.notifications()).toEqual(["leads", "notifications"])
    expect(leadKeys.notificationCount()).toEqual(["leads", "notification-count"])
  })
})

describe("use-leads query hooks", () => {
  beforeEach(() => vi.clearAllMocks())

  it("useRepliesDueLeads returns the repository data", async () => {
    const rows = [{ id: "1" }, { id: "2" }]
    fetchRepliesDueLeads.mockResolvedValue(rows)
    const { wrapper } = makeWrapper()

    const { result } = renderHook(() => useRepliesDueLeads(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(rows)
    expect(fetchRepliesDueLeads).toHaveBeenCalledTimes(1)
  })

  it("useCallsDueLeads returns the repository data", async () => {
    const rows = [{ id: "9" }]
    fetchCallsDueLeads.mockResolvedValue(rows)
    const { wrapper } = makeWrapper()

    const { result } = renderHook(() => useCallsDueLeads(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(rows)
  })

  it("useSuggestions returns the repository data", async () => {
    const rows = [{ id: "s1" }]
    fetchSuggestions.mockResolvedValue(rows)
    const { wrapper } = makeWrapper()

    const { result } = renderHook(() => useSuggestions(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(rows)
  })

  it("usePipelineLeads passes the (empty default) range + filters to the fetcher", async () => {
    const rows = [{ id: "p1" }]
    fetchPipelineLeads.mockResolvedValue(rows)
    const { wrapper } = makeWrapper()

    const { result } = renderHook(() => usePipelineLeads(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(rows)
    expect(fetchPipelineLeads).toHaveBeenCalledWith({}, { state: "", flagged: false, salesPerson: "" })
  })
})
