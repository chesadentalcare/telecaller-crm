"use client"

import { Archive } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ViewSkeleton } from "./view-skeleton"
import { useDormantLeads } from "@/hooks/use-leads"

export function DormantQueueView() {
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
        <div className="divide-y">
          {leads.map((lead) => (
            <div key={lead.id} className="flex flex-wrap items-center justify-between gap-3 p-4 hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-4">
                <div className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground font-medium text-sm">
                  {lead.name.split(" ").map((n) => n[0]).join("")}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{lead.name}</p>
                  <p className="text-xs text-muted-foreground">{lead.phone}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <Badge variant="outline" className="bg-muted text-muted-foreground text-[10px]">
                    {lead.dormantDays} days
                  </Badge>
                  <p className="text-[10px] text-muted-foreground mt-1">{lead.reason}</p>
                </div>
                <div className="flex gap-1">
                  <Button variant="outline" size="sm">Revive</Button>
                  <Button variant="ghost" size="sm" className="text-muted-foreground">Archive</Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
