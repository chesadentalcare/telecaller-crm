"use client"

// State options pulled from SAP Ashva's States master (OCST).
//
//   GET /api/telecaller/sap/states
//
// Ashva uses non-standard state codes (e.g. Karnataka = 'KT') and omits some
// states, so the intake dropdown is driven off this list — a telecaller can
// only ever pick a state SAP will accept. Cached by TanStack for 10 minutes.

import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api/client"
import { endpoints } from "@/lib/api-config"

export interface SapState {
  code: string
  name: string
}

interface Envelope<T> { success: boolean; data: T }

export function useSapStates() {
  return useQuery({
    queryKey: ["sap", "states"],
    queryFn: async () => {
      const res = await api.get<Envelope<SapState[]>>(endpoints.sapStates)
      return res.data
    },
    staleTime: 10 * 60 * 1000,
  })
}
