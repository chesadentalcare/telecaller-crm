"use client"

import { Archive, RotateCcw } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ViewSkeleton } from "./view-skeleton"
import { LeadQueueRow } from "./lead-queue-row"
import { useDormantLeads } from "@/hooks/use-leads"
import { useUnarchiveToNoResponse } from "@/hooks/use-lead-mutations"

// P6.10 — Archived end-state. Filed leads (no-response exhausted, not-interested,
// wrong-number unrecovered, opted-out). Read-only — they re-open automatically on
// any inbound message.
export function ArchivedView({ onOpenLead }: { onOpenLead?: (id: string) => void }) {
  const { data: leads = [], isLoading } = useDormantLeads()
  if (isLoading) return <ViewSkeleton />

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
      </CardHeader>
      <CardContent className="p-0">
        {leads.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-10">No archived leads</p>
        ) : (
          <div className="divide-y">
            {leads.map((lead) => (
              <LeadQueueRow
                key={lead.id}
                id={lead.id}
                name={lead.name}
                phone={lead.phone}
                equipment={lead.equipment}
                replied={lead.replied}
                onOpen={onOpenLead}
                meta={<span>Filed {lead.dormantDays} days ago · {lead.reason}</span>}
                badge={<Badge variant="secondary" className="text-[10px]">Archived</Badge>}
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
