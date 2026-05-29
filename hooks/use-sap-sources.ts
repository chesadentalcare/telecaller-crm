"use client"

// Lead source options pulled from SAP Ashva SalesOpportunitySourcesSetup.
//
//   GET /api/telecaller/sap/sources
//
// Cached by TanStack for 10 minutes. Falls back to an empty array while
// loading — the form disables the source dropdown until data arrives.

import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api/client"
import { endpoints } from "@/lib/api-config"

export interface SapSource {
  sequenceNo: number
  description: string
}

interface Envelope<T> { success: boolean; data: T }

export function useSapSources() {
  return useQuery({
    queryKey: ["sap", "sources"],
    queryFn: async () => {
      const res = await api.get<Envelope<SapSource[]>>(endpoints.sapSources)
      return res.data
    },
    staleTime: 10 * 60 * 1000,
  })
}
