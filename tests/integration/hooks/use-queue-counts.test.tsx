import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook } from "@testing-library/react"

import type { QueueCounts } from "@/lib/types/lead"

const useQueueCountsQuery = vi.hoisted(() => vi.fn())
vi.mock("@/hooks/use-leads", () => ({ useQueueCountsQuery }))

import { useQueueCounts } from "@/hooks/use-queue-counts"

const EMPTY_KEYS: (keyof QueueCounts)[] = [
  "closeToday",
  "pipeline",
  "noResponse",
  "drip",
  "idle",
  "dormant",
  "dripCompleted",
  "reactivation",
  "sixMonth",
  "archived",
  "requalification",
  "lost",
  "won",
  "callsDue",
  "callsDueAwaitingReply",
  "pipelineAwaitingReply",
  "reTouch",
  "neglected",
]

describe("useQueueCounts", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns the query data when it has loaded", () => {
    const data = { ...Object.fromEntries(EMPTY_KEYS.map((k) => [k, 0])), pipeline: 7, callsDue: 3 } as QueueCounts
    useQueueCountsQuery.mockReturnValue({ data })
    const { result } = renderHook(() => useQueueCounts())
    expect(result.current.pipeline).toBe(7)
    expect(result.current.callsDue).toBe(3)
  })

  it("falls back to a fully-zeroed shape while the query is in flight", () => {
    useQueueCountsQuery.mockReturnValue({ data: undefined })
    const { result } = renderHook(() => useQueueCounts())
    for (const key of EMPTY_KEYS) {
      expect(result.current[key]).toBe(0)
    }
  })

  it("does not fabricate numbers on error (data is undefined)", () => {
    useQueueCountsQuery.mockReturnValue({ data: undefined, isError: true })
    const { result } = renderHook(() => useQueueCounts())
    expect(result.current.pipeline).toBe(0)
    expect(result.current.won).toBe(0)
  })
})
