"use client"

import { XCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ViewSkeleton } from "./view-skeleton"
import { LeadQueueRow } from "./lead-queue-row"
import { useLostLeads } from "@/hooks/use-leads"

function lostLabel(reason: string, lostReason?: string | null): string {
  if (lostReason === "competitor" || /another brand|bought from/i.test(reason)) {
    return "Bought from another brand — already purchased elsewhere"
  }
  return reason || "Lost"
}

export function LostView({ onOpenLead }: { onOpenLead?: (id: string) => void }) {
  const { data: leads = [], isLoading } = useLostLeads()
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
              Leads marked Lost because the customer said they had already purchased or bought
              from another brand. Kept here for reference and reporting — not worked further.
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-[10px]">{leads.length} lost</Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {leads.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-10">No lost leads</p>
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
                flagged={lead.flagged}
                onOpen={onOpenLead}
                meta={
                  <span className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                    <span className="font-medium text-rose-600">{lostLabel(lead.reason, lead.lostReason)}</span>
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
