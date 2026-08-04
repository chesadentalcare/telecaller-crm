// Global lead search — hits GET /leads/search?q= on the telecaller gateway.
// Returns matches across ALL of the user's leads (every stage), so the top-bar
// search can find and open any lead by name, phone, or lead id.

import { api } from "./client"
import { endpoints } from "@/lib/api-config"

interface Envelope<T> {
  success: boolean
  message?: string
  data: T
}

export interface LeadSearchResult {
  id: number
  customer_name: string | null
  phone: string | null
  city: string | null
  equipment: string | null
  stage: string
  last_outcome: string | null
  assigned_to: string | null
}

export const searchLeadsApi = (q: string): Promise<LeadSearchResult[]> =>
  api
    .get<Envelope<LeadSearchResult[]>>(`${endpoints.leadsSearch}?q=${encodeURIComponent(q)}`)
    .then((r) => r.data)
