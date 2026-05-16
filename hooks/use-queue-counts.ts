"use client"

import type { QueueCounts } from "@/lib/types/lead"
import { MOCK_QUEUE_COUNTS } from "@/lib/mocks/leads"
import { useQueueCountsQuery } from "@/hooks/use-leads"

// Thin wrapper kept for backwards-compat with the sidebar/bottom-tab callers.
// Returns a synchronous QueueCounts shape — falls back to the mock object
// while the query is in flight so the first paint still has badge counts.
//
// New callers should prefer `useQueueCountsQuery()` directly so they can react
// to loading / error states.
export function useQueueCounts(): QueueCounts {
  const { data } = useQueueCountsQuery()
  return data ?? MOCK_QUEUE_COUNTS
}
