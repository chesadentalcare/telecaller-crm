"use client"

import { Inbox, Phone, RotateCcw } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LeadQueueRow } from "./lead-queue-row"
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
          {leads.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">No leads returned from sales right now</p>
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
                    <span>
                      <span className="text-muted-foreground">From {lead.handedBackBy} · {lead.handedBackAt}: </span>
                      <span className="text-foreground">{lead.reason}</span>
                    </span>
                  }
                  badge={<Badge variant="secondary" className="text-[10px]">Returned</Badge>}
                  actions={
                    <div className="flex items-center gap-1">
                      {tel.length >= 10 ? (
                        <Button asChild size="sm" className="h-8 px-2.5 gap-1.5 bg-success hover:bg-success/90 text-success-foreground">
                          <a href={`tel:${tel}`}><Phone className="size-3" />Call</a>
                        </Button>
                      ) : (
                        <Button size="sm" disabled className="h-8 px-2.5 gap-1.5"><Phone className="size-3" />Call</Button>
                      )}
                      <Button size="sm">Assume Ownership</Button>
                      <Button size="sm" variant="outline" onClick={() => onOpenLead(lead.id)}>Open</Button>
                    </div>
                  }
                />
              )
            })}
          </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
