"use client"

// Issue 2 — the rep's single "calls required today" page. One consolidated row per
// lead (LeadQueueRow); clicking a lead expands its call history inline (lazy-loaded
// from the lead-detail endpoint) so the rep can see the full dial-by-dial record
// without leaving the page. An "Open" action still routes to the full lead detail.

import { useState } from "react"
import { PhoneCall, ChevronDown, ChevronRight, History } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { ViewSkeleton } from "./view-skeleton"
import { LeadQueueRow } from "./lead-queue-row"
import { useCallsDueLeads, useLeadFullDetail } from "@/hooks/use-leads"

const REASON_LABEL: Record<string, string> = {
  first_contact: "First contact",
  callback: "Callback",
  drip_anchor: "Drip call",
  requalification: "Re-qualify",
}

const OUTCOME_LABEL: Record<string, { label: string; className: string }> = {
  no_response:        { label: "No response",   className: "text-warning" },
  wrong_number:       { label: "Wrong number",  className: "text-destructive" },
  not_interested:     { label: "Not interested", className: "text-destructive" },
  call_back_requested:{ label: "Callback",      className: "text-chart-2" },
  engaged:            { label: "Engaged",       className: "text-success" },
  replied:            { label: "Replied",       className: "text-success" },
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
            <CardDescription>Your full call worklist — first contacts, callbacks &amp; drip anchors, oldest first. Click a lead to see its call history.</CardDescription>
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
                        <Button size="sm" variant="outline" onClick={() => toggle(lead.id)} className="gap-1" title="Call history">
                          {expanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}History
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => onOpenLead(lead.id)}>Open</Button>
                      </div>
                    }
                  />
                  {expanded && <CallHistoryPanel leadId={lead.id} />}
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Inline call-history accordion body — lazy-loads the lead detail and lists its
// attempts (newest first), so the rep sees the dial record without navigating away.
function CallHistoryPanel({ leadId }: { leadId: string }) {
  const { data, isLoading } = useLeadFullDetail(leadId)
  const attempts = data?.attempts ?? []

  return (
    <div className="bg-muted/30 px-4 pb-4 pt-1 pl-16">
      <p className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1 mb-2">
        <History className="size-3" />Call history
      </p>
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-4 w-64" />)}
        </div>
      ) : attempts.length === 0 ? (
        <p className="text-xs text-muted-foreground">No calls logged yet.</p>
      ) : (
        <ol className="space-y-1.5">
          {attempts.map((a) => {
            const cfg = OUTCOME_LABEL[a.outcome] ?? { label: a.outcome, className: "text-foreground" }
            return (
              <li key={a.id} className="text-xs flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <span className="font-mono text-muted-foreground">#{a.attempt_number}</span>
                <span className={`font-medium ${cfg.className}`}>{cfg.label}</span>
                <span className="text-muted-foreground">· {new Date(a.attempted_at).toLocaleString()}</span>
                <span className="text-muted-foreground">· {a.attempted_by}</span>
                {a.notes && <span className="text-foreground/70 italic w-full pl-6">“{a.notes}”</span>}
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}
