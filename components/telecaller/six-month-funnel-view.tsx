"use client"

import { CalendarClock, RefreshCw } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ViewSkeleton } from "./view-skeleton"
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
        <div className="divide-y">
          {leads.map((lead) => (
            <div key={lead.id} className="flex flex-wrap items-center justify-between gap-3 p-4 hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-4 min-w-0">
                <div className="flex size-10 items-center justify-center rounded-full bg-violet-500/10 text-violet-600 font-medium text-sm shrink-0">
                  {lead.name.split(" ").slice(-2).map((n) => n[0]).join("")}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate flex items-center gap-1.5">
                    {lead.name}
                    {lead.retouch && (
                      <Badge variant="outline" className="text-[9px] gap-0.5 border-sky-500/30 bg-sky-500/10 text-sky-700">
                        <RefreshCw className="size-2.5" />24-mo re-touch
                      </Badge>
                    )}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                    <span>{lead.phone}</span><span>•</span><span>{lead.source}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <Badge variant="outline" className={lead.retouch
                    ? "bg-sky-500/10 text-sky-700 border-sky-500/30 text-[10px]"
                    : "bg-violet-500/10 text-violet-700 border-violet-500/30 text-[10px]"}>
                    {lead.retouch ? "Re-touch by" : "Reactivate by"} {lead.reactivateBy}
                  </Badge>
                  <p className="text-[10px] text-muted-foreground mt-1">{lead.reason}</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => onOpenLead(lead.id)}>Open</Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
