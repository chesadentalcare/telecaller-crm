"use client"

import { useQuery } from "@tanstack/react-query"
import {
  fetchPipelineLeads,
  fetchDripLeads,
  fetchNoResponseLeads,
  fetchIdleLeads,
  fetchDormantLeads,
  fetchReactivationLeads,
  fetchSixMonthLeads,
  fetchQueueCounts,
  fetchLeadById,
} from "@/lib/repositories/leads"

// Single source of truth for query keys. Group prefix `leads` lets us
// invalidate everything with `queryClient.invalidateQueries({ queryKey: ['leads'] })`.
// Pattern lifted from TanStack docs / kentcdodds query-key-factory.
export const leadKeys = {
  all: ["leads"] as const,
  pipeline: () => [...leadKeys.all, "pipeline"] as const,
  drip: () => [...leadKeys.all, "drip"] as const,
  noResponse: () => [...leadKeys.all, "no-response"] as const,
  idle: () => [...leadKeys.all, "idle"] as const,
  dormant: () => [...leadKeys.all, "dormant"] as const,
  reactivation: () => [...leadKeys.all, "reactivation"] as const,
  sixMonth: () => [...leadKeys.all, "six-month"] as const,
  detail: (id: string) => [...leadKeys.all, "detail", id] as const,
  queueCounts: () => [...leadKeys.all, "queue-counts"] as const,
}

export function usePipelineLeads() {
  return useQuery({ queryKey: leadKeys.pipeline(),    queryFn: fetchPipelineLeads })
}
export function useDripLeads() {
  return useQuery({ queryKey: leadKeys.drip(),        queryFn: fetchDripLeads })
}
export function useNoResponseLeads() {
  return useQuery({ queryKey: leadKeys.noResponse(),  queryFn: fetchNoResponseLeads })
}
export function useIdleLeads() {
  return useQuery({ queryKey: leadKeys.idle(),        queryFn: fetchIdleLeads })
}
export function useDormantLeads() {
  return useQuery({ queryKey: leadKeys.dormant(),     queryFn: fetchDormantLeads })
}
export function useReactivationLeads() {
  return useQuery({ queryKey: leadKeys.reactivation(), queryFn: fetchReactivationLeads })
}
export function useSixMonthLeads() {
  return useQuery({ queryKey: leadKeys.sixMonth(),    queryFn: fetchSixMonthLeads })
}
export function useLeadById(id: string | undefined) {
  return useQuery({
    queryKey: leadKeys.detail(id ?? "__noop__"),
    queryFn: () => fetchLeadById(id!),
    enabled: Boolean(id),
  })
}
export function useQueueCountsQuery() {
  return useQuery({
    queryKey: leadKeys.queueCounts(),
    queryFn: fetchQueueCounts,
    // Badges update more often than reference data — let stale go after 30s.
    staleTime: 30_000,
  })
}
