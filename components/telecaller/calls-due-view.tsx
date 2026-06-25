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
      <DialogContent className="w-full max-w-md gap-0 overflow-hidden p-0 sm:max-w-md">
        <DialogHeader className="space-y-1 border-b px-5 py-4">
          <DialogTitle className="flex items-center gap-2 text-base">
            <span className="flex size-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
              <Timer className="size-4" />
            </span>
            Upcoming Calls
            {scheduled.length + drip.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">{scheduled.length + drip.length}</Badge>
            )}
          </DialogTitle>
          <DialogDescription className="text-xs leading-relaxed">
            Calls scheduled for a future day. Each one moves into <span className="font-medium text-foreground">Calls Due — Today</span> automatically on its date.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto overflow-x-hidden px-3 py-3">
          {empty ? (
            <div className="py-12 text-center">
              <CalendarClock className="mx-auto mb-2 size-6 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">Nothing scheduled ahead.</p>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Scheduled calls — real future call_nudges (callbacks, re-qual, first-contact) */}
              {scheduled.length > 0 && (
                <section>
                  <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Scheduled calls</p>
                  <div className="space-y-1">
                    {scheduled.map((c) => {
                      const tel = c.phone.replace(/\D/g, "")
                      return (
                        <div
                          key={`${c.id}-${c.reason}-${c.scheduledAt.getTime()}`}
                          role="button"
                          tabIndex={0}
                          onClick={() => onOpenLead(c.id)}
                          onKeyDown={(e) => { if (e.key === "Enter") onOpenLead(c.id) }}
                          className="group flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-accent"
                        >
                          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
                            <CalendarClock className="size-4" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex min-w-0 items-center gap-1.5">
                              <span className="min-w-0 truncate text-sm font-medium">{c.name}</span>
                              <Badge variant="secondary" className="shrink-0 px-1.5 text-[9px] font-medium">{REASON_LABEL[c.reason] ?? c.reason}</Badge>
                            </div>
                            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                              <span className="text-muted-foreground/70">#{c.id}</span>
                              {" · "}
                              <span className="font-medium text-foreground">{fmtDateTime(c.scheduledAt)}</span>
                            </p>
                          </div>
                          {tel.length >= 10 && (
                            <a
                              href={`tel:${tel}`}
                              onClick={(e) => e.stopPropagation()}
                              className="flex size-8 shrink-0 items-center justify-center rounded-md border text-muted-foreground transition-colors hover:bg-success hover:text-success-foreground"
                              title="Call"
                            >
                              <PhoneCall className="size-3.5" />
                            </a>
                          )}
                          <ChevronRight className="size-4 shrink-0 text-muted-foreground/40 transition-colors group-hover:text-foreground" />
                        </div>
                      )
                    })}
                  </div>
                </section>
              )}

              {/* Drip call schedule — projected forward call anchors per nurturing lead */}
              {drip.length > 0 && (
                <section>
                  <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Drip call schedule</p>
                  <div className="space-y-2">
                    {drip.map((lead) => {
                      const tel = lead.phone.replace(/\D/g, "")
                      return (
                        <div key={lead.id} className="rounded-xl border bg-card/50 p-3">
                          <div className="flex items-center gap-2">
                            <span className="min-w-0 flex-1 truncate text-sm font-medium">{lead.name}</span>
                            <Badge variant="outline" className="shrink-0 text-[9px]">{TRACK_LABEL[lead.track] ?? lead.track}</Badge>
                            {tel.length >= 10 && (
                              <a
                                href={`tel:${tel}`}
                                className="flex size-7 shrink-0 items-center justify-center rounded-md border text-muted-foreground transition-colors hover:bg-success hover:text-success-foreground"
                                title="Call"
                              >
                                <PhoneCall className="size-3" />
                              </a>
                            )}
                            <button
                              onClick={() => onOpenLead(lead.id)}
                              className="shrink-0 rounded-md px-2 py-1 text-[11px] font-medium text-primary transition-colors hover:bg-primary/10"
                            >
                              Open
                            </button>
                          </div>
                          <ol className="mt-2.5 space-y-2 border-l border-dashed border-muted-foreground/25 pl-4">
                            {lead.calls.map((c) => (
                              <li key={c.touchIndex} className="relative">
                                <span className="absolute -left-[1.32rem] top-0.5 flex size-4 items-center justify-center rounded-full border border-muted-foreground/30 bg-background">
                                  <CalendarClock className="size-2.5 text-muted-foreground" />
                                </span>
                                <div className="flex min-w-0 flex-wrap items-baseline gap-x-2">
                                  <span className="text-[11px] font-semibold text-foreground">
                                    {c.dripDay != null ? `Day ${c.dripDay}` : `Call ${c.touchIndex + 1}`}
                                  </span>
                                  <span className="text-[11px] text-muted-foreground">{fmtDateTime(c.at)}</span>
                                </div>
                                <p className="truncate text-[11px] text-muted-foreground/80">{c.label}</p>
                              </li>
                            ))}
                          </ol>
                        </div>
                      )
                    })}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
