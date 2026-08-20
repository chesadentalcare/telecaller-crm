"use client"

import { useState } from "react"
import { RefreshCw, Phone } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ViewSkeleton } from "./view-skeleton"
import { LeadQueueRow } from "./lead-queue-row"
import { RepliesFilterToggle, isAwaitingReply } from "./replies-filter"
import { useRequalificationLeads } from "@/hooks/use-leads"

interface RequalificationViewProps {
  onOpenLead: (id: string) => void
}

// P6.9 — re-qualification work items: a re-surfaced lead (drip reply / changed
// details / timing) needs a FRESH timeline+budget capture before re-entering a
// drip (Amendment Gap 3). "Re-qualify" opens the lead's CallsTab.
export function RequalificationView({ onOpenLead }: RequalificationViewProps) {
  const { data: leads = [], isLoading } = useRequalificationLeads()
  const [repliedOnly, setRepliedOnly] = useState(false)
  if (isLoading) return <ViewSkeleton />

  const repliedCount = leads.filter(isAwaitingReply).length
  const shown = repliedOnly ? leads.filter(isAwaitingReply) : leads

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <RefreshCw className="size-4 text-primary" />Re-qualification
            </CardTitle>
            <CardDescription>Re-surfaced leads — re-capture timeline &amp; budget before re-entering a drip</CardDescription>
          </div>
          <div className="flex items-center gap-1.5">
            <Badge variant="outline" className="text-[10px]">{leads.length} to re-qualify</Badge>
            <RepliesFilterToggle count={repliedCount} active={repliedOnly} onToggle={() => setRepliedOnly((v) => !v)} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {shown.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-10">Nothing to re-qualify right now</p>
        ) : (
          <div className="divide-y">
            {shown.map((lead) => {
              const tel = lead.phone.replace(/\D/g, "")
              return (
                <LeadQueueRow
                  key={lead.id}
                  id={lead.id}
                  name={lead.name}
                  phone={lead.phone}
                  equipment={lead.equipment}
                  replied={lead.replied}
                  flagged={lead.flagged}
                  onOpen={onOpenLead}
                  meta={<span>{lead.reason} · requested {lead.requestedAgo}</span>}
                  badge={<Badge variant="outline" className="text-[10px]">timeline: {lead.timeline}</Badge>}
                  actions={
                    <div className="flex items-center gap-1">
                      {tel.length >= 10 ? (
                        <Button asChild size="sm" className="h-8 px-2.5 gap-1.5 bg-success hover:bg-success/90 text-success-foreground">
                          <a href={`tel:${tel}`}><Phone className="size-3" />Call</a>
                        </Button>
                      ) : (
                        <Button size="sm" disabled className="h-8 px-2.5 gap-1.5"><Phone className="size-3" />Call</Button>
                      )}
                      <Button size="sm" onClick={() => onOpenLead(lead.id)}>Re-qualify</Button>
                      <Button variant="outline" size="sm" className="h-8 px-2.5" onClick={() => onOpenLead(lead.id)}>Open</Button>
                    </div>
                  }
                />
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
