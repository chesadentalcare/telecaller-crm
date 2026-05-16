"use client"

import { Inbox, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ViewSkeleton } from "./view-skeleton"
import { useReactivationLeads } from "@/hooks/use-leads"

interface ReactivationViewProps {
  onOpenLead: (id: string) => void
}

// Gap #8 (Track1 spec): leads handed back from sales for telecaller follow-up.
export function ReactivationView({ onOpenLead }: ReactivationViewProps) {
  const { data: leads = [], isLoading } = useReactivationLeads()
  if (isLoading) return <ViewSkeleton />

  return (
    <div className="space-y-4">
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-primary/15">
              <RotateCcw className="size-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">{leads.length} leads returned from sales</p>
              <p className="text-xs text-muted-foreground">Re-assume ownership and decide next step</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Inbox className="size-4 text-primary" />Reactivation Inbox
              </CardTitle>
              <CardDescription>Leads bounced back from sales for telecaller follow-up</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {leads.map((lead) => (
              <div key={lead.id} className="flex flex-wrap items-start justify-between gap-3 p-4 hover:bg-muted/50 transition-colors">
                <div className="flex items-start gap-4 min-w-0 flex-1">
                  <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary font-medium text-sm shrink-0">
                    {lead.name.split(" ").slice(-2).map((n) => n[0]).join("")}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{lead.name}</p>
                    <p className="text-xs text-muted-foreground">{lead.phone}</p>
                    <p className="mt-1.5 text-xs">
                      <span className="text-muted-foreground">From {lead.handedBackBy} · {lead.handedBackAt}: </span>
                      <span className="text-foreground">{lead.reason}</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => onOpenLead(lead.id)}>Open</Button>
                  <Button size="sm">Assume Ownership</Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
