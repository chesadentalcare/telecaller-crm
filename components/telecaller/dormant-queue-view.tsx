"use client"

import { Archive, Phone } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ViewSkeleton } from "./view-skeleton"
import { LeadQueueRow } from "./lead-queue-row"
import { useDormantLeads } from "@/hooks/use-leads"

export function DormantQueueView({ onOpenLead }: { onOpenLead?: (id: string) => void }) {
  const { data: leads = [], isLoading } = useDormantLeads()
  if (isLoading) return <ViewSkeleton />

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Archive className="size-4 text-muted-foreground" />Dormant Leads
            </CardTitle>
            <CardDescription>Inactive for 60+ days - consider archiving</CardDescription>
          </div>
          <Button variant="outline" size="sm" className="text-muted-foreground">Archive All</Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {leads.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-10">No dormant leads right now</p>
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
                meta={lead.reason}
                badge={
                  <Badge variant="outline" className="text-[10px]">
                    {lead.dormantDays} days
                  </Badge>
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
                    <Button variant="outline" size="sm">Revive</Button>
                    <Button variant="ghost" size="sm" className="text-muted-foreground">Archive</Button>
                    <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => onOpenLead?.(lead.id)}>Open</Button>
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
