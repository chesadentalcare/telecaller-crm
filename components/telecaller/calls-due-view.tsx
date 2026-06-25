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
import { useCallsDueLeads, useUpcomingCalls } from "@/hooks/use-leads"
import type { UpcomingCalls } from "@/lib/types/lead"

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
  const { data: upcoming } = useUpcomingCalls()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [upcomingOpen, setUpcomingOpen] = useState(false)
  if (isLoading) return <ViewSkeleton />

  const toggle = (id: string) => setExpandedId((cur) => (cur === id ? null : id))
  const upcomingCount = (upcoming?.scheduled.length ?? 0) + (upcoming?.drip.length ?? 0)

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <PhoneCall className="size-4 text-primary" />Calls Due — Today
            </CardTitle>
            <CardDescription>Calls due today (or overdue) — first contacts, callbacks &amp; drip anchors, oldest first. Future-dated calls live under “Upcoming Calls” until their day. Expand a lead to log, qualify, book a meeting, or edit it inline.</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {/* Forward look — future-dated calls (callbacks + drip anchors) that drop
                into the list above automatically on their scheduled day. */}
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => setUpcomingOpen(true)}
            >
              <Timer className="size-3.5 text-amber-500" />
              Upcoming Calls
              {upcomingCount > 0 && (
                <Badge variant="secondary" className="ml-0.5 h-4 min-w-4 px-1 text-[10px]">{upcomingCount}</Badge>
              )}
            </Button>
            <Badge variant="outline" className="text-[10px]">{leads.length} due</Badge>
          </div>
        </div>
      </CardHeader>
      <UpcomingCallsDialog
        open={upcomingOpen}
        onOpenChange={setUpcomingOpen}
        upcoming={upcoming}
        onOpenLead={(id) => { setUpcomingOpen(false); onOpenLead(id) }}
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

// ── Upcoming Calls modal ───────────────────────────────────────────────────
// Everything scheduled for a FUTURE day — real scheduled calls (callbacks etc.) and
// the projected forward drip-call timeline. On its scheduled day each automatically
// drops into "Calls Due — Today" and leaves this list.
function UpcomingCallsDialog({
  open,
  onOpenChange,
  upcoming,
  onOpenLead,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  upcoming?: UpcomingCalls
  onOpenLead: (id: string) => void
}) {
  const scheduled = upcoming?.scheduled ?? []
  const drip = upcoming?.drip ?? []
  const empty = scheduled.length === 0 && drip.length === 0
  const fmtDateTime = (d: Date) =>
    `${d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })} · ${d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Timer className="size-4 text-amber-500" />Upcoming Calls
          </DialogTitle>
          <DialogDescription>
            Calls scheduled for a future day. Each one automatically moves into Calls Due — Today on its date.
          </DialogDescription>
        </DialogHeader>

        {empty ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nothing scheduled ahead.</p>
        ) : (
          <div className="space-y-5">
            {/* Scheduled calls — real future call_nudges (callbacks, re-qual, first-contact) */}
            {scheduled.length > 0 && (
              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Scheduled calls</p>
                <div className="divide-y rounded-lg border">
                  {scheduled.map((c) => {
                    const tel = c.phone.replace(/\D/g, "")
                    return (
                      <div key={`${c.id}-${c.reason}-${c.scheduledAt.getTime()}`} className="flex items-center gap-3 px-3 py-2.5">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-amber-500/10 text-amber-600">
                          <CalendarClock className="size-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="truncate text-sm font-medium">{c.name}</span>
                            <span className="text-[10px] text-muted-foreground">#{c.id}</span>
                            <Badge variant="outline" className="text-[10px]">{REASON_LABEL[c.reason] ?? c.reason}</Badge>
                          </div>
                          <p className="text-[11px] font-medium text-foreground">📞 {fmtDateTime(c.scheduledAt)}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          {tel.length >= 10 && (
                            <Button asChild size="sm" variant="outline" className="gap-1 h-7"><a href={`tel:${tel}`}><PhoneCall className="size-3.5" /></a></Button>
                          )}
                          <Button size="sm" variant="ghost" className="h-7" onClick={() => onOpenLead(c.id)}>Open</Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Drip call schedule — projected forward call anchors per nurturing lead */}
            {drip.length > 0 && (
              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Drip call schedule</p>
                <div className="space-y-4">
                  {drip.map((lead) => {
                    const tel = lead.phone.replace(/\D/g, "")
                    return (
                      <div key={lead.id} className="rounded-lg border p-3">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-medium">{lead.name}</span>
                          <span className="text-[10px] text-muted-foreground">#{lead.id}</span>
                          <Badge variant="outline" className="text-[10px]">{TRACK_LABEL[lead.track] ?? lead.track}</Badge>
                          <div className="ml-auto flex items-center gap-1.5">
                            {tel.length >= 10 && (
                              <Button asChild size="sm" variant="outline" className="gap-1 h-7"><a href={`tel:${tel}`}><PhoneCall className="size-3.5" /></a></Button>
                            )}
                            <Button size="sm" variant="ghost" className="h-7" onClick={() => onOpenLead(lead.id)}>Open</Button>
                          </div>
                        </div>
                        <ol className="mt-2.5 space-y-2 border-l border-dashed border-muted-foreground/30 pl-4">
                          {lead.calls.map((c) => (
                            <li key={c.touchIndex} className="relative">
                              <span className="absolute -left-[1.3rem] top-0.5 flex size-4 items-center justify-center rounded-full border border-muted-foreground/40 bg-background">
                                <CalendarClock className="size-2.5" />
                              </span>
                              <div className="flex flex-wrap items-baseline gap-x-2">
                                <span className="text-[11px] font-medium text-foreground">
                                  {c.dripDay != null ? `Day ${c.dripDay}` : `Call ${c.touchIndex + 1}`}
                                </span>
                                <span className="text-[11px] text-muted-foreground">{fmtDateTime(c.at)}</span>
                              </div>
                              <p className="truncate text-[11px] text-muted-foreground">{c.label}</p>
                            </li>
                          ))}
                        </ol>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
