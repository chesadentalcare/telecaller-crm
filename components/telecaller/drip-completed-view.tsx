"use client"

import { useMemo, useState } from "react"
import { ClipboardCheck, Check, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ViewSkeleton } from "./view-skeleton"
import { LeadQueueRow } from "./lead-queue-row"
import { useDripCompletedLeads } from "@/hooks/use-leads"
import { useApproveArchive, useRejectArchive } from "@/hooks/use-lead-mutations"
import { useRole } from "@/hooks/use-role"
import type { DripTrack } from "@/lib/types/lead"

const TRACK_LABEL: Record<DripTrack, string> = { "1-month": "1-Month", "3-month": "3-Month", "6-month": "6-Month" }

export function DripCompletedView({ onOpenLead }: { onOpenLead?: (id: string) => void }) {
  const { data: leads = [], isLoading } = useDripCompletedLeads()
  const { isManagerOrAbove, isTelecaller } = useRole()
  // Drip-completed review used to be manager/admin-only; telecallers may now
  // approve (archive) or reject (send back to re-qualify) too.
  const canReview = isManagerOrAbove || isTelecaller
  const approve = useApproveArchive()
  const reject = useRejectArchive()
  const [trackFilter, setTrackFilter] = useState<"all" | DripTrack>("all")
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const trackCounts = useMemo(
    () => ({
      "1-month": leads.filter((l) => l.dripTrack === "1-month").length,
      "3-month": leads.filter((l) => l.dripTrack === "3-month").length,
      "6-month": leads.filter((l) => l.dripTrack === "6-month").length,
    }),
    [leads],
  )

  const filtered = useMemo(
    () => (trackFilter === "all" ? leads : leads.filter((l) => l.dripTrack === trackFilter)),
    [leads, trackFilter],
  )

  if (isLoading) return <ViewSkeleton />

  const busy = approve.isPending || reject.isPending
  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  const allInViewSelected = filtered.length > 0 && filtered.every((l) => selected.has(l.id))
  const toggleAllInView = () =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (allInViewSelected) filtered.forEach((l) => next.delete(l.id))
      else filtered.forEach((l) => next.add(l.id))
      return next
    })

  const runApprove = async (ids: string[]) => {
    if (!ids.length) return
    await approve.mutateAsync(ids.map(Number))
    setSelected((prev) => {
      const next = new Set(prev)
      ids.forEach((id) => next.delete(id))
      return next
    })
  }
  const runReject = async (ids: string[]) => {
    if (!ids.length) return
    await reject.mutateAsync(ids.map(Number))
    setSelected((prev) => {
      const next = new Set(prev)
      ids.forEach((id) => next.delete(id))
      return next
    })
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <ClipboardCheck className="size-4 text-muted-foreground" />Drip Completed
            </CardTitle>
            <CardDescription>
              Finished their nurture drip — awaiting {canReview ? "your" : "manager/admin"} approval before Archived
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-[10px]">{leads.length} pending</Badge>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Drip track</span>
          <Tabs value={trackFilter} onValueChange={(v) => setTrackFilter(v as "all" | DripTrack)}>
            <TabsList className="h-8 bg-muted/50">
              <TabsTrigger value="all" className="text-xs px-3 h-6">All ({leads.length})</TabsTrigger>
              <TabsTrigger value="1-month" className="text-xs px-3 h-6">1-Month ({trackCounts["1-month"]})</TabsTrigger>
              <TabsTrigger value="3-month" className="text-xs px-3 h-6">3-Month ({trackCounts["3-month"]})</TabsTrigger>
              <TabsTrigger value="6-month" className="text-xs px-3 h-6">6-Month ({trackCounts["6-month"]})</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {canReview && filtered.length > 0 && (
          <div className="mt-2 flex items-center gap-2">
            <Checkbox id="dc-all" checked={allInViewSelected} onCheckedChange={toggleAllInView} />
            <label htmlFor="dc-all" className="text-xs text-muted-foreground cursor-pointer">
              Select all shown ({filtered.length})
            </label>
          </div>
        )}
      </CardHeader>

      <CardContent className="p-0">
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-10">No drip-completed leads waiting</p>
        ) : (
          <div className="divide-y">
            {filtered.map((lead) => (
              <div key={lead.id} className="flex items-start gap-2 pl-3">
                {canReview && (
                  <Checkbox
                    className="mt-5 shrink-0"
                    checked={selected.has(lead.id)}
                    onCheckedChange={() => toggle(lead.id)}
                    aria-label={`Select ${lead.name}`}
                  />
                )}
                <div className="min-w-0 flex-1">
                  <LeadQueueRow
                    id={lead.id}
                    name={lead.name}
                    phone={lead.phone}
                    equipment={lead.equipment}
                    replied={lead.replied}
                    flagged={lead.flagged}
                    onOpen={onOpenLead}
                    meta={<span>Completed {lead.completedDays} days ago · {lead.reason}</span>}
                    badge={
                      lead.dripTrack ? (
                        <Badge variant="secondary" className="text-[10px]">{TRACK_LABEL[lead.dripTrack]}</Badge>
                      ) : undefined
                    }
                    actions={
                      canReview ? (
                        <div className="flex items-center gap-1.5">
                          <Button
                            size="sm"
                            className="h-8 gap-1.5"
                            disabled={busy}
                            onClick={() => runApprove([lead.id])}
                            title="Approve — move this lead to Archived"
                          >
                            <Check className="size-3.5" />Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 gap-1.5"
                            disabled={busy}
                            onClick={() => runReject([lead.id])}
                            title="Reject — send this lead back into the pipeline to re-qualify"
                          >
                            <X className="size-3.5" />Reject
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 px-2.5" onClick={() => onOpenLead?.(lead.id)}>
                            Open
                          </Button>
                        </div>
                      ) : (
                        <Button variant="ghost" size="sm" className="h-8 px-2.5" onClick={() => onOpenLead?.(lead.id)}>
                          Open
                        </Button>
                      )
                    }
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {canReview && selected.size > 0 && (
        <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-2 border-t bg-card/95 px-4 py-3 backdrop-blur">
          <span className="text-sm font-medium">{selected.size} selected</span>
          <div className="flex items-center gap-2">
            <Button size="sm" className="gap-1.5" disabled={busy} onClick={() => runApprove(Array.from(selected))}>
              <Check className="size-3.5" />Approve selected
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5" disabled={busy} onClick={() => runReject(Array.from(selected))}>
              <X className="size-3.5" />Reject selected
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>Clear</Button>
          </div>
        </div>
      )}
    </Card>
  )
}
