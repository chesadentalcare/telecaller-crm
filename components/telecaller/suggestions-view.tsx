"use client"

import { Flame, AlertTriangle, Target, ShieldAlert, Clock, Phone, CalendarClock } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ViewSkeleton } from "./view-skeleton"
import { LeadQueueRow } from "./lead-queue-row"
import { useSuggestions } from "@/hooks/use-leads"

function asOf(iso?: string | null): string {
  if (!iso) return ""
  const d = new Date(iso)
  return isNaN(d.getTime())
    ? ""
    : d.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })
}

export function SuggestionsView({ onOpenLead }: { onOpenLead?: (id: string) => void }) {
  const { data: leads = [], isLoading } = useSuggestions()

  if (isLoading) return <ViewSkeleton />

  const runAt = leads[0]?.runAt

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Flame className="size-4 text-rose-500" />Close Today
            </CardTitle>
            <CardDescription>
              The daily shortlist of leads that look ready to close — with the reason and the
              exact push to make today. Work each the normal way: Open it, call, and log the
              call. A lead clears from this list once you&apos;ve logged that call — nothing extra
              to fill in, and the agent learns from your call note.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {runAt && (
              <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                <Clock className="size-3" />as of {asOf(runAt)}
              </span>
            )}
            <Badge variant="outline" className="text-[10px]">{leads.length} to push</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {leads.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-10">
            All caught up. New picks appear on the next Close Today run.
          </p>
        ) : (
          <div className="divide-y">
            {leads.map((lead) => (
              <LeadQueueRow
                key={lead.suggestionId}
                id={lead.id}
                name={lead.name}
                phone={lead.phone}
                equipment={lead.equipment}
                location={[lead.city, lead.state].filter((v) => v && v !== "—").join(", ") || undefined}
                replied={lead.replied}
                flagged={lead.flagged}
                urgent={lead.priority === "at_risk" ? { label: "At risk" } : undefined}
                onOpen={onOpenLead}
                meta={
                  <span className="flex flex-col gap-1">
                    {lead.whyCloseable && (
                      <span className="font-semibold text-emerald-700">{lead.whyCloseable}</span>
                    )}
                    <span className="flex flex-wrap items-center gap-1.5">
                      {lead.closingLever && (
                        <span className="inline-flex items-center gap-1 rounded bg-indigo-500/15 px-1.5 py-0.5 font-semibold text-indigo-700">
                          <Target className="size-3" />{lead.closingLever}
                        </span>
                      )}
                      {lead.riskIfDelayed && (
                        <span className="inline-flex items-center gap-1 rounded bg-amber-500/15 px-1.5 py-0.5 font-medium text-amber-700">
                          <ShieldAlert className="size-3" />{lead.riskIfDelayed}
                        </span>
                      )}
                      {lead.callDueToday && (
                        <span className="inline-flex items-center gap-1 rounded bg-sky-500/15 px-1.5 py-0.5 font-medium text-sky-700">
                          <Phone className="size-3" />Also in Calls Due
                        </span>
                      )}
                      {lead.meetingDueToday && (
                        <span className="inline-flex items-center gap-1 rounded bg-violet-500/15 px-1.5 py-0.5 font-medium text-violet-700">
                          <CalendarClock className="size-3" />Meeting today
                        </span>
                      )}
                    </span>
                    {lead.whyHot && <span className="text-muted-foreground">{lead.whyHot}</span>}
                    {lead.suggestedAction && (
                      <span className="text-muted-foreground">Today: {lead.suggestedAction}</span>
                    )}
                    {(lead.readiness != null || lead.urgency != null) && (
                      <span className="text-[11px] text-muted-foreground">
                        {lead.readiness != null && `Ready ${lead.readiness}/5`}
                        {lead.readiness != null && lead.urgency != null && " · "}
                        {lead.urgency != null && `Urgency ${lead.urgency}/5`}
                      </span>
                    )}
                  </span>
                }
                badge={
                  <span className="flex flex-col items-end gap-1">
                    {lead.priority === "at_risk" ? (
                      <Badge className="bg-amber-500 text-white text-[10px]">
                        <AlertTriangle className="size-3 mr-0.5" />At risk
                      </Badge>
                    ) : (
                      <Badge className="bg-rose-500 text-white text-[10px]">
                        <Flame className="size-3 mr-0.5" />Hot
                      </Badge>
                    )}
                    {lead.confidence && (
                      <span className="text-[10px] text-muted-foreground">{lead.confidence} confidence</span>
                    )}
                  </span>
                }
                actions={
                  <Button
                    variant="outline" size="sm" className="h-8 gap-1"
                    onClick={() => onOpenLead?.(lead.id)}
                  >
                    <Phone className="size-3.5" />Open &amp; call
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
