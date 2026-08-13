"use client"

import { Trophy } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ViewSkeleton } from "./view-skeleton"
import { LeadQueueRow } from "./lead-queue-row"
import { useWonLeads } from "@/hooks/use-leads"

export function WonView({ onOpenLead }: { onOpenLead?: (id: string) => void }) {
  const { data: leads = [], isLoading } = useWonLeads()
  if (isLoading) return <ViewSkeleton />

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="size-4 text-emerald-500" />Won
            </CardTitle>
            <CardDescription>
              Leads that converted into a sale — closed Won (through the app or synced from SAP).
              Kept here for reference and reporting.
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-[10px]">{leads.length} won</Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {leads.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-10">No won leads yet</p>
        ) : (
          <div className="divide-y">
            {leads.map((lead) => (
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
                    <span className="font-medium text-emerald-600">Won</span>
                    {lead.wonDaysAgo != null && (
                      <>
                        <span>•</span>
                        <span>{lead.wonDaysAgo === 0 ? "today" : `${lead.wonDaysAgo}d ago`}</span>
                      </>
                    )}
                    {lead.wonBy && (
                      <>
                        <span>•</span>
                        <span>by {lead.wonBy}</span>
                      </>
                    )}
                  </span>
                }
                badge={<Badge variant="secondary" className="text-[10px]">Won</Badge>}
                actions={
                  <Button variant="ghost" size="sm" className="h-8 px-2.5" onClick={() => onOpenLead?.(lead.id)}>
                    Open
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
