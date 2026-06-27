"use client"

import { CalendarClock, RefreshCw, Phone } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ViewSkeleton } from "./view-skeleton"
import { LeadQueueRow } from "./lead-queue-row"
import { useSixMonthLeads } from "@/hooks/use-leads"

interface SixMonthFunnelViewProps {
  onOpenLead: (id: string) => void
}

// Gap #11 (Track1 spec): long-cycle nurture pool — surface when reactivation
// window opens.
export function SixMonthFunnelView({ onOpenLead }: SixMonthFunnelViewProps) {
  const { data: leads = [], isLoading } = useSixMonthLeads()
  if (isLoading) return <ViewSkeleton />

  // P6.12 — the 24-month re-touch pool (already-purchased leads parked for a
  // re-touch) rides along in this funnel, badged distinctly.
  const retouchCount = leads.filter((l) => l.retouch).length

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarClock className="size-4 text-violet-500" />6+ Month Funnel
            </CardTitle>
            <CardDescription>Long-cycle leads &amp; the 24-month re-touch pool — surface when each reactivation window opens</CardDescription>
          </div>
          <div className="flex items-center gap-1.5">
            {retouchCount > 0 && (
              <Badge variant="outline" className="text-[10px] gap-1 border-sky-500/30 bg-sky-500/10 text-sky-700">
                <RefreshCw className="size-3" />{retouchCount} re-touch
              </Badge>
            )}
            <Badge variant="outline" className="text-[10px]">{leads.length} in funnel</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {leads.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-10">No long-cycle leads in the funnel right now</p>
        ) : (
        <div className="divide-y">
          {leads.map((lead) => {
            const tel = lead.phone.replace(/\D/g, "")
            return (
              <LeadQueueRow
                key={lead.id}
                id={lead.id}
                name={lead.name}
                phone={lead.phone}
                equipment={lead.equipment}
                replied={lead.replied}
                onOpen={onOpenLead}
                meta={
                  <span className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                    <span>{lead.source}</span>
                    <span>•</span>
                    <span>{lead.reason}</span>
                  </span>
                }
                badge={
                  lead.retouch ? (
                    <Badge variant="outline" className="text-[10px] gap-0.5 bg-sky-500/10 text-sky-700 border-sky-500/30">
                      <RefreshCw className="size-2.5" />Re-touch by {lead.reactivateBy}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] bg-violet-500/10 text-violet-700 border-violet-500/30">
                      Reactivate by {lead.reactivateBy}
                    </Badge>
                  )
                }
                actions={
                  <div className="flex items-center gap-1">
                    {tel.length >= 10 ? (
                      <Button asChild size="sm" className="h-8 px-2.5 gap-1.5 bg-success hover:bg-success/90 text-success-foreground">
                        <a href={`tel:${tel}`}><Phone className="size-3" />Call</a>
                      </Button>
                    ) : (
                      <Button size="sm" disabled className="h-8 px-2.5 gap-1.5"><Phone className="size-3" />Call</Button>
                    )}
                    <Button size="sm" variant="outline" className="h-8 px-2.5" onClick={() => onOpenLead(lead.id)}>Open</Button>
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
