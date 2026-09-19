"use client"

import { useMemo, useState } from "react"
import { XCircle, CalendarCheck, Handshake, Users, ShieldCheck, ShieldAlert, RefreshCw } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ViewSkeleton } from "./view-skeleton"
import { LeadQueueRow } from "./lead-queue-row"
import { useLostLeads, useLostSapCheck } from "@/hooks/use-leads"
import type { LostSapCheckEntry } from "@/lib/api/leads"
import { employeeOf, groupLostByEmployee, countSapMismatches, sapStatusMeta } from "@/lib/lost-summary"

function lostLabel(reason: string, lostReason?: string | null): string {
  if (lostReason === "competitor" || /another brand|bought from/i.test(reason)) {
    return "Bought from another brand — already purchased elsewhere"
  }
  return reason || "Lost"
}

function meetingDate(iso?: string | null): string {
  if (!iso) return ""
  const d = new Date(iso)
  return isNaN(d.getTime())
    ? ""
    : d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
}

function SapBadge({ entry, loading }: { entry?: LostSapCheckEntry; loading: boolean }) {
  if (!entry) {
    return loading ? (
      <span className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-muted-foreground">
        checking SAP…
      </span>
    ) : null
  }
  const meta = sapStatusMeta(entry.sapStatus)
  const Icon = meta.ok ? ShieldCheck : ShieldAlert
  return (
    <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-bold ${meta.tone}`}>
      <Icon className="size-3" /> {meta.label}
    </span>
  )
}

export function LostView({ onOpenLead }: { onOpenLead?: (id: string) => void }) {
  const { data: leads = [], isLoading } = useLostLeads()
  const { data: sapMap, isFetching: sapLoading, refetch } = useLostSapCheck(leads.length > 0)
  const [selected, setSelected] = useState<string | null>(null)

  const byEmployee = useMemo(() => groupLostByEmployee(leads), [leads])

  const filtered = useMemo(
    () => (selected ? leads.filter((l) => employeeOf(l.salesEmployee) === selected) : leads),
    [leads, selected],
  )

  const mismatches = useMemo(() => countSapMismatches(leads, sapMap), [leads, sapMap])

  if (isLoading) return <ViewSkeleton />

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <XCircle className="size-4 text-rose-500" />Lost
            </CardTitle>
            <CardDescription>
              Leads marked Lost (already purchased or bought from another brand). Grouped by the sales
              employee who owns the territory, and cross-checked against SAP.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {sapMap && (
              mismatches > 0 ? (
                <Badge variant="outline" className="text-[10px] border-amber-400 text-amber-700">
                  {mismatches} not Lost in SAP
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] border-emerald-400 text-emerald-700">
                  All match SAP
                </Badge>
              )
            )}
            <Badge variant="outline" className="text-[10px]">{leads.length} lost</Badge>
            <Button
              variant="ghost" size="sm" className="h-7 px-2 text-xs"
              disabled={sapLoading} onClick={() => refetch()}
            >
              <RefreshCw className={`size-3 mr-1 ${sapLoading ? "animate-spin" : ""}`} />
              {sapLoading ? "Checking SAP…" : "Re-check SAP"}
            </Button>
          </div>
        </div>
      </CardHeader>

      {byEmployee.length > 0 && (
        <div className="px-6 pb-3">
          <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <Users className="size-3.5" /> Leads lost by sales employee
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelected(null)}
              className={`rounded-md border px-2.5 py-1 text-xs transition-colors ${
                selected === null ? "border-rose-400 bg-rose-500/10 font-semibold text-rose-700" : "hover:bg-muted"
              }`}
            >
              All · {leads.length}
            </button>
            {byEmployee.map(([name, count]) => (
              <button
                key={name}
                onClick={() => setSelected(name === selected ? null : name)}
                className={`rounded-md border px-2.5 py-1 text-xs transition-colors ${
                  selected === name ? "border-rose-400 bg-rose-500/10 font-semibold text-rose-700" : "hover:bg-muted"
                }`}
              >
                {name} · <span className="font-semibold">{count}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <CardContent className="p-0">
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-10">No lost leads</p>
        ) : (
          <div className="divide-y">
            {filtered.map((lead) => (
              <LeadQueueRow
                key={lead.id}
                id={lead.id}
                name={lead.name}
                phone={lead.phone}
                equipment={lead.equipment}
                location={
                  [lead.city, lead.state].filter((v) => v && v !== "—").join(", ") || undefined
                }
                replied={lead.replied}
                flagged={lead.flagged}
                onOpen={onOpenLead}
                meta={
                  <span className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                    <span className="inline-flex items-center gap-1 rounded bg-sky-500/15 px-1.5 py-0.5 font-bold text-sky-700">
                      <Users className="size-3" />
                      {employeeOf(lead.salesEmployee)}
                    </span>
                    <span className="rounded bg-rose-500/10 px-1.5 py-0.5 font-semibold text-rose-600">
                      {lostLabel(lead.reason, lead.lostReason)}
                    </span>
                    <SapBadge entry={sapMap?.[lead.id]} loading={sapLoading} />
                    {lead.handedOffAt && (
                      <span className="inline-flex items-center gap-1 rounded bg-indigo-500/15 px-1.5 py-0.5 font-bold text-indigo-700">
                        <Handshake className="size-3" />
                        Handed to sales{lead.salesPerson ? ` · ${lead.salesPerson}` : ""}
                      </span>
                    )}
                    {!!lead.meetingCount && (
                      <span className="inline-flex items-center gap-1 rounded bg-amber-500/15 px-1.5 py-0.5 font-bold text-amber-700">
                        <CalendarCheck className="size-3" />
                        Meeting given{lead.lastMeetingAt ? ` · ${meetingDate(lead.lastMeetingAt)}` : ""}
                      </span>
                    )}
                    {lead.lostDaysAgo != null && (
                      <>
                        <span>•</span>
                        <span>{lead.lostDaysAgo === 0 ? "today" : `${lead.lostDaysAgo}d ago`}</span>
                      </>
                    )}
                  </span>
                }
                badge={<Badge variant="secondary" className="text-[10px]">Lost</Badge>}
                actions={
                  <Button variant="ghost" size="sm" className="h-8 px-2.5" onClick={() => onOpenLead?.(lead.id)}>
                    Open
                  </Button>
                }
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
