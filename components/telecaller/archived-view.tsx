"use client"

import { Archive } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ViewSkeleton } from "./view-skeleton"
import { LeadQueueRow } from "./lead-queue-row"
import { useDormantLeads } from "@/hooks/use-leads"

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
