"use client"

import type { QueueCounts } from "@/lib/types/lead"
import { useQueueCountsQuery } from "@/hooks/use-leads"

const EMPTY_QUEUE_COUNTS: QueueCounts = {
  pipeline: 0,
  noResponse: 0,
  drip: 0,
  idle: 0,
  dormant: 0,
  reactivation: 0,
  sixMonth: 0,
  archived: 0,
  requalification: 0,
  callsDue: 0,
  reTouch: 0,
}

// Thin wrapper kept for backwards-compat with the sidebar/bottom-tab callers.
// Returns a synchronous QueueCounts shape — falls back to zeroed counts while
// the query is in flight or on error, so the badges never show fabricated
// numbers and a failed request isn't masked by stale mock data.
//
// New callers should prefer `useQueueCountsQuery()` directly so they can react
// to loading / error states.
export function useQueueCounts(): QueueCounts {
  const { data } = useQueueCountsQuery()
  return data ?? EMPTY_QUEUE_COUNTS
}
