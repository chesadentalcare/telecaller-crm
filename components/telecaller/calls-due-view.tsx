"use client"

// Amendment 2 (Theme 1) — the rep's single "calls required today" COCKPIT. One
// consolidated row per lead (LeadQueueRow); expanding a lead opens the full action
// surface inline (LeadCockpitPanel): log a call + qualify, change stage/route, book a
// Zoom/physical meeting, and edit every field — all without leaving the page. "Open"
// still deep-links to the full lead detail.

import { useState } from "react"
import { PhoneCall, ChevronDown, ChevronRight, SlidersHorizontal } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ViewSkeleton } from "./view-skeleton"
import { LeadQueueRow } from "./lead-queue-row"
import { LeadCockpitPanel } from "./lead-cockpit-panel"
import { useCallsDueLeads } from "@/hooks/use-leads"

const REASON_LABEL: Record<string, string> = {
  first_contact: "First contact",
  callback: "Callback",
  drip_anchor: "Drip call",
  requalification: "Re-qualify",
}

interface CallsDueViewProps {
  onOpenLead: (id: string) => void
}

export function CallsDueView({ onOpenLead }: CallsDueViewProps) {
  const { data: leads = [], isLoading } = useCallsDueLeads()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  if (isLoading) return <ViewSkeleton />

  const toggle = (id: string) => setExpandedId((cur) => (cur === id ? null : id))

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <PhoneCall className="size-4 text-primary" />Calls Due — Today
            </CardTitle>
            <CardDescription>Your full call worklist — first contacts, callbacks &amp; drip anchors, oldest first. Expand a lead to log, qualify, book a meeting, or edit it inline.</CardDescription>
          </div>
          <Badge variant="outline" className="text-[10px]">{leads.length} due</Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {leads.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-10">No calls due right now</p>
        ) : (
          <div className="divide-y">
            {leads.map((lead) => {
              const tel = lead.phone.replace(/\D/g, "")
              const expanded = expandedId === lead.id
              return (
                <div key={`${lead.id}-${lead.reason}-${lead.scheduledAt.getTime()}`}>
                  <LeadQueueRow
                    id={lead.id}
                    name={lead.name}
                    phone={lead.phone}
                    equipment={lead.equipment}
                    replied={lead.replied}
                    onOpen={() => toggle(lead.id)}
                    meta={<span>Scheduled {lead.scheduledAt.toLocaleString()}</span>}
                    badge={<Badge variant="outline" className="text-[10px]">{REASON_LABEL[lead.reason] ?? lead.reason}</Badge>}
                    actions={
                      <div className="flex items-center gap-1.5">
                        {tel.length >= 10 ? (
                          <Button asChild size="sm" className="gap-1.5"><a href={`tel:${tel}`}><PhoneCall className="size-3.5" />Call</a></Button>
                        ) : (
                          <Button size="sm" disabled className="gap-1.5"><PhoneCall className="size-3.5" />No number</Button>
                        )}
                        <Button size="sm" variant="outline" onClick={() => toggle(lead.id)} className="gap-1" title="Open cockpit">
                          {expanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
                          <SlidersHorizontal className="size-3.5" />Cockpit
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => onOpenLead(lead.id)}>Open</Button>
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
