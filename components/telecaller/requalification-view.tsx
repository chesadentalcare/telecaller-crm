"use client"

import { RefreshCw } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ViewSkeleton } from "./view-skeleton"
import { useRequalificationLeads } from "@/hooks/use-leads"

interface RequalificationViewProps {
  onOpenLead: (id: string) => void
}

// P6.9 — re-qualification work items: a re-surfaced lead (drip reply / changed
// details / timing) needs a FRESH timeline+budget capture before re-entering a
// drip (Amendment Gap 3). "Re-qualify" opens the lead's CallsTab.
export function RequalificationView({ onOpenLead }: RequalificationViewProps) {
  const { data: leads = [], isLoading } = useRequalificationLeads()
  if (isLoading) return <ViewSkeleton />

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
          <Badge variant="outline" className="text-[10px]">{leads.length} to re-qualify</Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {leads.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-10">Nothing to re-qualify right now</p>
        ) : (
          <div className="divide-y">
            {leads.map((lead) => (
              <div key={lead.id} className="flex flex-wrap items-center justify-between gap-3 p-4 hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary font-medium text-sm shrink-0">
                    {lead.name.split(" ").slice(-2).map((n) => n[0]).join("")}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{lead.name}</p>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                      <span className="truncate">{lead.reason}</span><span>•</span><span>{lead.requestedAgo}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="bg-primary/5 text-[10px]">timeline: {lead.timeline}</Badge>
                  <Button size="sm" onClick={() => onOpenLead(lead.id)}>Re-qualify</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
