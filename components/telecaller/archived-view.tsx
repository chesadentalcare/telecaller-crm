"use client"

import { useMemo, useState } from "react"
import { Archive, RotateCcw } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ViewSkeleton } from "./view-skeleton"
import { LeadQueueRow } from "./lead-queue-row"
import { useDormantLeads } from "@/hooks/use-leads"
import { useUnarchiveToNoResponse } from "@/hooks/use-lead-mutations"
import type { DormantLead, DripTrack } from "@/lib/types/lead"

type ReasonBucket =
  | "drip_completed" | "no_response" | "wrong_number" | "first_contact" | "not_interested" | "opted_out" | "other"

const BUCKET_LABEL: Record<ReasonBucket, string> = {
  drip_completed: "Drip completed",
  no_response: "No response",
  wrong_number: "Wrong number",
  first_contact: "First contact",
  not_interested: "Not interested",
  opted_out: "Opted out",
  other: "Other",
}
const BUCKET_ORDER: ReasonBucket[] = [
  "drip_completed", "no_response", "wrong_number", "first_contact", "not_interested", "opted_out", "other",
]
const TRACK_LABEL: Record<DripTrack, string> = { "1-month": "1-Month", "3-month": "3-Month", "6-month": "6-Month" }

function classifyArchiveReason(reason: string | null | undefined): ReasonBucket {
  const r = (reason || "").toLowerCase()
  if (r.includes("drip track completed")) return "drip_completed"
  if (r.includes("no response") || r.includes("consecutive")) return "no_response"
  if (r.includes("wrong number")) return "wrong_number"
  if (r.includes("first contact")) return "first_contact"
  if (r.includes("not interested") || r.includes("genuine no")) return "not_interested"
  if (r.includes("opted out") || r.includes("stop")) return "opted_out"
  return "other"
}

// P6.10 — Archived end-state. Filed leads (drip completed, no-response exhausted,
// not-interested, wrong-number unrecovered, opted-out). Read-only — they re-open
// automatically on any inbound message. Reason chips group leads by why they were filed.
export function ArchivedView({ onOpenLead }: { onOpenLead?: (id: string) => void }) {
  const { data: leads = [], isLoading } = useDormantLeads()
  const [reasonFilter, setReasonFilter] = useState<"all" | ReasonBucket>("all")
  const [trackFilter, setTrackFilter] = useState<"all" | DripTrack>("all")

  const bucketCounts = useMemo(() => {
    const c = {} as Record<ReasonBucket, number>
    BUCKET_ORDER.forEach((b) => { c[b] = 0 })
    leads.forEach((l) => { c[classifyArchiveReason(l.reason)] += 1 })
    return c
  }, [leads])

  const byReason = useMemo<DormantLead[]>(
    () => (reasonFilter === "all" ? leads : leads.filter((l) => classifyArchiveReason(l.reason) === reasonFilter)),
    [leads, reasonFilter],
  )

  const trackCounts = useMemo(
    () => ({
      "1-month": byReason.filter((l) => l.dripTrack === "1-month").length,
      "3-month": byReason.filter((l) => l.dripTrack === "3-month").length,
      "6-month": byReason.filter((l) => l.dripTrack === "6-month").length,
    }),
    [byReason],
  )

  const filtered = useMemo(
    () =>
      reasonFilter === "drip_completed" && trackFilter !== "all"
        ? byReason.filter((l) => l.dripTrack === trackFilter)
        : byReason,
    [byReason, reasonFilter, trackFilter],
  )

  if (isLoading) return <ViewSkeleton />

  const setReason = (v: "all" | ReasonBucket) => { setReasonFilter(v); setTrackFilter("all") }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Archive className="size-4 text-muted-foreground" />Archived
            </CardTitle>
            <CardDescription>Filed leads — re-open automatically on any inbound message</CardDescription>
          </div>
          <Badge variant="outline" className="text-[10px]">{leads.length} archived</Badge>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Reason</span>
          <Tabs value={reasonFilter} onValueChange={(v) => setReason(v as "all" | ReasonBucket)}>
            <TabsList className="h-8 flex-wrap bg-muted/50">
              <TabsTrigger value="all" className="text-xs px-3 h-6">All ({leads.length})</TabsTrigger>
              {BUCKET_ORDER.filter((b) => bucketCounts[b] > 0).map((b) => (
                <TabsTrigger key={b} value={b} className="text-xs px-3 h-6">
                  {BUCKET_LABEL[b]} ({bucketCounts[b]})
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {reasonFilter === "drip_completed" && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Drip track</span>
            <Tabs value={trackFilter} onValueChange={(v) => setTrackFilter(v as "all" | DripTrack)}>
              <TabsList className="h-8 bg-muted/50">
                <TabsTrigger value="all" className="text-xs px-3 h-6">All ({byReason.length})</TabsTrigger>
                <TabsTrigger value="1-month" className="text-xs px-3 h-6">1-Month ({trackCounts["1-month"]})</TabsTrigger>
                <TabsTrigger value="3-month" className="text-xs px-3 h-6">3-Month ({trackCounts["3-month"]})</TabsTrigger>
                <TabsTrigger value="6-month" className="text-xs px-3 h-6">6-Month ({trackCounts["6-month"]})</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        )}
      </CardHeader>
      <CardContent className="p-0">
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-10">No archived leads</p>
        ) : (
          <div className="divide-y">
            {filtered.map((lead) => (
              <LeadQueueRow
                key={lead.id}
                id={lead.id}
                name={lead.name}
                phone={lead.phone}
                equipment={lead.equipment}
                replied={lead.replied}
                onOpen={onOpenLead}
                meta={<span>Filed {lead.dormantDays} days ago · {lead.reason}</span>}
                badge={
                  lead.dripTrack && classifyArchiveReason(lead.reason) === "drip_completed" ? (
                    <Badge variant="secondary" className="text-[10px]">{TRACK_LABEL[lead.dripTrack]}</Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[10px]">Archived</Badge>
                  )
                }
                actions={<ArchivedRowActions id={lead.id} onOpen={onOpenLead} />}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// One-button revive per archived row: bring the lead back as No Response + re-qualify.
// (Kept minimal per SOP — re-qualify only; replies already surface via the reply indicator.)
function ArchivedRowActions({ id, onOpen }: { id: string; onOpen?: (id: string) => void }) {
  const { mutate: revive, isPending } = useUnarchiveToNoResponse(id)
  return (
    <div className="flex items-center gap-1.5">
      <Button
        size="sm"
        variant="outline"
        className="h-8 gap-1.5"
        onClick={() => revive()}
        disabled={isPending}
        title="Bring this lead back into the active pipeline as a No-Response lead and flag it for re-qualification"
      >
        <RotateCcw className="size-3.5" />
        {isPending ? "Reviving…" : "Bring back as No Response"}
      </Button>
      <Button variant="ghost" size="sm" className="h-8 px-2.5" onClick={() => onOpen?.(id)}>
        Open
      </Button>
    </div>
  )
}
