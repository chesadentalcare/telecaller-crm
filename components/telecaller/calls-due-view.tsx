"use client"

import { PhoneCall } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ViewSkeleton } from "./view-skeleton"
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

// P6.8 — the rep's call worklist over call_nudges: first-contact calls, scheduled
// callbacks, drip call-anchors and re-qual calls, oldest-due first.
export function CallsDueView({ onOpenLead }: CallsDueViewProps) {
  const { data: leads = [], isLoading } = useCallsDueLeads()
  if (isLoading) return <ViewSkeleton />

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <PhoneCall className="size-4 text-primary" />Calls Due
            </CardTitle>
            <CardDescription>Your call worklist — first contacts, callbacks &amp; drip anchors, oldest first</CardDescription>
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
              return (
                <div key={`${lead.id}-${lead.reason}-${lead.scheduledAt.getTime()}`} className="flex flex-wrap items-center justify-between gap-3 p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary font-medium text-sm shrink-0">
                      {lead.name.split(" ").slice(-2).map((n) => n[0]).join("")}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{lead.name}</p>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                        <span className="truncate">{lead.equipment}</span><span>•</span><span>{lead.scheduledAt.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">{REASON_LABEL[lead.reason] ?? lead.reason}</Badge>
                    {tel.length >= 10 ? (
                      <Button asChild size="sm" className="gap-1.5"><a href={`tel:${tel}`}><PhoneCall className="size-3.5" />Call</a></Button>
                    ) : (
                      <Button size="sm" disabled className="gap-1.5"><PhoneCall className="size-3.5" />No number</Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => onOpenLead(lead.id)}>Open</Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
