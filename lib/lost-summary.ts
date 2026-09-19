import type { LostLead } from "@/lib/types/lead"
import type { LostSapCheckMap, LostSapStatus } from "@/lib/api/leads"

export const UNASSIGNED = "Unassigned"

export const employeeOf = (name?: string | null): string => (name && name.trim()) || UNASSIGNED

// Lost-lead count per sales employee, highest first — powers the "Leads lost by
// sales employee" cards at the top of the Lost tab.
export function groupLostByEmployee(leads: LostLead[]): Array<[string, number]> {
  const m = new Map<string, number>()
  for (const l of leads) {
    const key = employeeOf(l.salesEmployee)
    m.set(key, (m.get(key) ?? 0) + 1)
  }
  return [...m.entries()].sort((a, b) => b[1] - a[1])
}

// A lead marked Lost in our CRM whose SAP opportunity is NOT Lost (still open, won,
// or missing) is a reconciliation mismatch worth surfacing.
export function countSapMismatches(leads: LostLead[], sapMap?: LostSapCheckMap): number {
  if (!sapMap) return 0
  return leads.reduce((n, l) => {
    const s = sapMap[l.id]?.sapStatus
    return n + (s && s !== "lost" ? 1 : 0)
  }, 0)
}

export interface SapMeta { label: string; tone: string; ok: boolean }

export function sapStatusMeta(status: LostSapStatus): SapMeta {
  switch (status) {
    case "lost": return { label: "SAP: Lost", tone: "bg-emerald-500/15 text-emerald-700", ok: true }
    case "won": return { label: "SAP: WON — not lost!", tone: "bg-rose-500/15 text-rose-700", ok: false }
    case "open": return { label: "SAP: still Open — not lost", tone: "bg-amber-500/15 text-amber-700", ok: false }
    default: return { label: "SAP: opportunity not found", tone: "bg-slate-500/15 text-slate-600", ok: false }
  }
}
