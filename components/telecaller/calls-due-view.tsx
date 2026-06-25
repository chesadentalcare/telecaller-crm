"use client"

// Amendment 2 (Theme 1) — the rep's single "calls required today" COCKPIT. One
// consolidated row per lead (LeadQueueRow); expanding a lead opens the full action
// surface inline (LeadCockpitPanel): log a call + qualify, change stage/route, book a
// Zoom/physical meeting, and edit every field — all without leaving the page. "Open"
// still deep-links to the full lead detail.

import { useState } from "react"
import { PhoneCall, ChevronDown, ChevronRight, SlidersHorizontal, CalendarClock, Timer } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ViewSkeleton } from "./view-skeleton"
import { LeadQueueRow } from "./lead-queue-row"
import { LeadCockpitPanel } from "./lead-cockpit-panel"
import { useCallsDueLeads, useUpcomingDripCalls } from "@/hooks/use-leads"
import type { UpcomingDripCall } from "@/lib/types/lead"

const TRACK_LABEL: Record<string, string> = {
  "1_month": "1-month",
  "3_month": "3-month",
  "6_plus_month": "6-month",
}

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
  const { data: dripCalls = [] } = useUpcomingDripCalls()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [dripModalOpen, setDripModalOpen] = useState(false)
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
          <div className="flex items-center gap-2">
            {/* Forward look at drip leads' next CALL touch — they drop into the list
                above on their day; this shows what's coming and when. */}
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => setDripModalOpen(true)}
            >
              <Timer className="size-3.5 text-amber-500" />
              Upcoming Drip Calls
              {dripCalls.length > 0 && (
                <Badge variant="secondary" className="ml-0.5 h-4 min-w-4 px-1 text-[10px]">{dripCalls.length}</Badge>
              )}
            </Button>
            <Badge variant="outline" className="text-[10px]">{leads.length} due</Badge>
          </div>
        </div>
      </CardHeader>
      <UpcomingDripCallsDialog
        open={dripModalOpen}
        onOpenChange={setDripModalOpen}
        calls={dripCalls}
        onOpenLead={(id) => { setDripModalOpen(false); onOpenLead(id) }}
      />
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
                    meta={
                      lead.reason === "callback"
                        ? <span className="font-medium text-foreground">📞 Callback at {lead.scheduledAt.toLocaleString()}</span>
                        : <span>Scheduled {lead.scheduledAt.toLocaleString()}</span>
                    }
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

// ── Upcoming Drip Calls modal ──────────────────────────────────────────────
// Drip tracks interleave WhatsApp touches with periodic CALL anchors. The engine
// only drops the call into Calls Due on its due day; this modal shows the forward
// schedule — each active drip lead's NEXT call, its date, and which drip day — so
// the rep knows what's coming (e.g. "6-month lead · day 14 · call on <date>").
function UpcomingDripCallsDialog({
  open,
  onOpenChange,
  calls,
  onOpenLead,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  calls: UpcomingDripCall[]
  onOpenLead: (id: string) => void
}) {
  const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0)
  const isDueToday = (d: Date) => d < new Date(startOfToday.getTime() + 86_400_000)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Timer className="size-4 text-amber-500" />Upcoming Drip Calls
          </DialogTitle>
          <DialogDescription>
            Each nurturing lead&apos;s next scheduled call anchor. On its date the lead automatically appears in Calls Due above.
          </DialogDescription>
        </DialogHeader>

        {calls.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No drip calls scheduled.</p>
        ) : (
          <div className="divide-y">
            {calls.map((c) => {
              const tel = c.phone.replace(/\D/g, "")
              const due = isDueToday(c.nextCallAt)
              return (
                <div key={c.id} className="flex items-center gap-3 py-2.5">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-amber-500/10 text-amber-600">
                    <CalendarClock className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium">{c.name}</span>
                      <span className="text-[10px] text-muted-foreground">#{c.id}</span>
                      <Badge variant="outline" className="text-[10px]">{TRACK_LABEL[c.track] ?? c.track}</Badge>
                      {due && <Badge className="bg-amber-500 text-white text-[10px]">Due today</Badge>}
                    </div>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {c.dripDay != null ? `Day ${c.dripDay} · ` : ""}{c.callLabel}
                    </p>
                    <p className="text-[11px] font-medium text-foreground">
                      📞 {c.nextCallAt.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })}
                      {" · "}
                      {c.nextCallAt.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {tel.length >= 10 && (
                      <Button asChild size="sm" variant="outline" className="gap-1"><a href={`tel:${tel}`}><PhoneCall className="size-3.5" /></a></Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => onOpenLead(c.id)}>Open</Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
