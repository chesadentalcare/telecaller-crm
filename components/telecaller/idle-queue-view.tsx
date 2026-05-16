"use client"

import { Clock, Plus } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ViewSkeleton } from "./view-skeleton"
import { useIdleLeads } from "@/hooks/use-leads"

export function IdleQueueView() {
  const { data: leads = [], isLoading } = useIdleLeads()
  if (isLoading) return <ViewSkeleton />

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="size-4 text-warning" />Idle Leads
            </CardTitle>
            <CardDescription>No activity in the last 7+ days</CardDescription>
          </div>
          <Button variant="outline" size="sm" className="gap-2">
            <Plus className="size-3.5" />Add to Drip
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {leads.map((lead) => (
            <div key={lead.id} className="flex flex-wrap items-center justify-between gap-3 p-4 hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-4">
                <div className="flex size-10 items-center justify-center rounded-full bg-warning/10 text-warning font-medium text-sm">
                  {lead.name.split(" ").map((n) => n[0]).join("")}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{lead.name}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{lead.phone}</span><span>•</span><span>{lead.equipment}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30 text-[10px]">
                    {lead.idleDays} days idle
                  </Badge>
                  <p className="text-[10px] text-muted-foreground mt-1">{lead.lastActivity}</p>
                </div>
                <Button variant="outline" size="sm">Follow Up</Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
