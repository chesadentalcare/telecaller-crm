// Repository layer — the only place that knows where lead data comes from.
//
// Today: returns the mock fixtures with a small artificial latency so the UI
// experiences a real loading state.
//
// Tomorrow: each function swaps to `fetch(apiUrl(endpoints.X))`. Call sites
// (the useLeads hooks) never know about the change.
//
// Why this layer exists at all when hooks could just call fetch directly:
//   - Isolates URL/transport concerns from React (testable in isolation).
//   - Same function is reusable from server components, scripts, tests.
//   - Stops 7 components from each owning a different lead shape.

import type {
  PipelineLead,
  DripLead,
  NoResponseLead,
  IdleLead,
  DormantLead,
  ReactivationLead,
  SixMonthLead,
  QueueCounts,
} from "@/lib/types/lead"
import {
  getMockPipelineLeads,
  getMockDripLeads,
  MOCK_NO_RESPONSE_LEADS,
  MOCK_IDLE_LEADS,
  MOCK_DORMANT_LEADS,
  MOCK_REACTIVATION_LEADS,
  MOCK_SIX_MONTH_LEADS,
  MOCK_QUEUE_COUNTS,
} from "@/lib/mocks/leads"

// Simulated network delay so skeletons get a moment to render. Keep this
// short (250–500ms). When real fetches go in, delete the wrapper entirely.
const FAKE_LATENCY_MS = 350
const delay = <T,>(value: T): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(value), FAKE_LATENCY_MS))

export const fetchPipelineLeads = (): Promise<PipelineLead[]> =>
  delay(getMockPipelineLeads())

export const fetchDripLeads = (): Promise<DripLead[]> =>
  delay(getMockDripLeads())

export const fetchNoResponseLeads = (): Promise<NoResponseLead[]> =>
  delay(MOCK_NO_RESPONSE_LEADS)

export const fetchIdleLeads = (): Promise<IdleLead[]> =>
  delay(MOCK_IDLE_LEADS)

export const fetchDormantLeads = (): Promise<DormantLead[]> =>
  delay(MOCK_DORMANT_LEADS)

export const fetchReactivationLeads = (): Promise<ReactivationLead[]> =>
  delay(MOCK_REACTIVATION_LEADS)

export const fetchSixMonthLeads = (): Promise<SixMonthLead[]> =>
  delay(MOCK_SIX_MONTH_LEADS)

export const fetchQueueCounts = (): Promise<QueueCounts> =>
  delay(MOCK_QUEUE_COUNTS)

// Looks up a single lead by id across all mock buckets. Real impl will be a
// dedicated /api/leads/:id endpoint with proper auth scoping.
export async function fetchLeadById(id: string): Promise<PipelineLead | null> {
  const all = await fetchPipelineLeads()
  return all.find((l) => l.id === id) ?? null
}
