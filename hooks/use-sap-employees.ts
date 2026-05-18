"use client"

// Active sales employees pulled from SAP Ashva via our telecaller backend.
//
//   GET /api/telecaller/sap/employees
//
// Cached by TanStack for 10 minutes (the backend caches for the same window,
// so this matches without the frontend hammering the API). Restart the
// backend if a CSR activated/deactivated someone and you want it sooner.

import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api/client"
import { endpoints } from "@/lib/api-config"

export interface SapEmployee {
  employeeId: number
  salesPersonCode: number
  name: string
  jobTitle: string | null
  department: string | null
}

interface Envelope<T> { success: boolean; data: T }

export function useSapEmployees() {
  return useQuery({
    queryKey: ["sap", "employees"],
    queryFn: async () => {
      const res = await api.get<Envelope<SapEmployee[]>>(endpoints.sapEmployees)
      return res.data
    },
    staleTime: 10 * 60 * 1000,
  })
}
