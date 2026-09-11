"use client"

// SAP opportunity stage list, proxied by the telecaller backend from the chesa
// gateway (/sap/stage-keys → /getStageKey → SAP). Drives the single-source
// "Log an update" stage picker so a cockpit update posts the right SAP stage.
// The raw SAP stage carries SequenceNo (the StageKey); some responses also expose
// Stageno — read either.

import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api/client"
import { endpoints } from "@/lib/api-config"

export interface SapStage {
  SequenceNo?: number
  Stageno?: number
  Name: string
}

interface Envelope<T> { success: boolean; data: T }

export function useSapStages() {
  return useQuery({
    queryKey: ["sap", "stages"],
    queryFn: async () => {
      const res = await api.get<Envelope<SapStage[]>>(endpoints.sapStageKeys)
      return res.data
    },
    staleTime: 10 * 60 * 1000,
  })
}
