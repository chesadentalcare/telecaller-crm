"use client"

import { Archive } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ViewSkeleton } from "./view-skeleton"
import { useDormantLeads } from "@/hooks/use-leads"

// P6.10 — Archived end-state. Filed leads (no-response exhausted, not-interested,
// wrong-number unrecovered, opted-out). Read-only — they re-open automatically on
// any inbound message.
export function ArchivedView({ onOpenLead }: { onOpenLead?: (id: string) => void }) {
  const { data: leads = [], isLoading } = useDormantLeads()
  if (isLoading) return <ViewSkeleton />

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Archive className="size-4 text-muted-foreground" />Archived
            </CardTitle>
            <CardDescription>Filed leads — re-open automatically on any inbound message</CardDescription>
          </div>
          <Badge variant="outline" className="text-[10px]">{leads.length} archived</Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {leads.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-10">No archived leads</p>
        ) : (
          <div className="divide-y">
            {leads.map((lead) => (
              <div
                key={lead.id}
                role="button"
                tabIndex={0}
                onClick={() => onOpenLead?.(lead.id)}
                onKeyDown={(e) => { if (e.key === "Enter") onOpenLead?.(lead.id) }}
                className="flex flex-wrap items-center justify-between gap-3 p-4 hover:bg-muted/50 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground font-medium text-sm">
                    {lead.name.split(" ").map((n) => n[0]).join("")}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{lead.name}</p>
                    <p className="text-xs text-muted-foreground"><span className="font-mono text-primary">#{lead.id}</span> · {lead.phone}</p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant="outline" className="border-muted-foreground/40 text-muted-foreground text-[10px]">Archived</Badge>
                  <p className="text-[10px] text-muted-foreground mt-1">{lead.reason}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
