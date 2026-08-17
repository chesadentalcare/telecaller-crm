"use client"

import { useState } from "react"
import { MessageSquare, ChevronDown, ChevronRight, SlidersHorizontal } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ViewSkeleton } from "./view-skeleton"
import { LeadQueueRow } from "./lead-queue-row"
import { LeadCockpitPanel } from "./lead-cockpit-panel"
import { useRepliesDueLeads } from "@/hooks/use-leads"
import { lastOutcomeLabel } from "@/lib/calls/flatten-upcoming"
import { repColor } from "@/lib/rep-color"

export function RepliesDueView({ onOpenLead }: { onOpenLead: (id: string, action?: string) => void }) {
  const { data: leads = [], isLoading } = useRepliesDueLeads()
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  if (isLoading) return <ViewSkeleton />

  const toggle = (id: string) =>
    setExpandedIds((cur) => {
      const next = new Set(cur)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="size-4 text-chart-1" /> WhatsApp Replies awaiting a response
            </CardTitle>
            <CardDescription>
              Customers who replied on WhatsApp and are waiting for you. A lead leaves this list the moment you
              reply, send the catalogue, or log an engaged call — same as the Replies filter.
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-[10px]">{leads.length} awaiting</Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {leads.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-10">No customers awaiting a reply right now 🎉</p>
        ) : (
          <div className="divide-y">
            {leads.map((lead) => {
              const expanded = expandedIds.has(lead.id)
              return (
                <div key={lead.id}>
                  <LeadQueueRow
                    id={lead.id}
                    name={lead.name}
                    phone={lead.phone}
                    equipment={lead.equipment}
                    location={[lead.city, lead.state].filter((v) => v && v !== "—").join(", ") || undefined}
                    replied={lead.replied}
                    onOpen={() => toggle(lead.id)}
                    meta={
                      <span className="flex flex-wrap items-center gap-1.5">
                        {lead.replied?.body && (
                          <span className="max-w-[32ch] truncate italic text-foreground/80">&ldquo;{lead.replied.body}&rdquo;</span>
                        )}
                        {lead.replied?.at && (
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(lead.replied.at).toLocaleString(undefined, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                          </span>
                        )}
                        {lead.lastOutcome && (
                          <span className="inline-flex items-center rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                            {lastOutcomeLabel(lead.lastOutcome)}
                            {lead.lastOutcomeBy ? (
                              <> · <span className="font-bold" style={{ color: repColor(lead.lastOutcomeBy) }}>{lead.lastOutcomeBy}</span></>
                            ) : null}
                          </span>
                        )}
                      </span>
                    }
                    badge={<Badge className="gap-1 border-amber-500/30 bg-amber-500/15 text-[10px] text-amber-600">Needs reply</Badge>}
                    actions={
                      <div className="flex items-center gap-1.5">
                        <Button size="sm" variant="outline" onClick={() => toggle(lead.id)} className="gap-1" title="Open cockpit">
                          {expanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
                          <SlidersHorizontal className="size-3.5" />Cockpit
                        </Button>
                        <Button size="sm" onClick={() => onOpenLead(lead.id, "replies")}>Open &amp; reply</Button>
                      </div>
                    }
                  />
                  {expanded && <LeadCockpitPanel leadId={lead.id} onOpenFull={onOpenLead} />}
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
