"use client"

import { Briefcase, Inbox, ArrowRightLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ViewSkeleton } from "./view-skeleton"
import { useSalesPipeline } from "@/hooks/use-leads"
import type { SalesPipelineRow } from "@/lib/api/leads"

interface SalesPipelineViewProps {
  onOpenLead: (id: string) => void
}

const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(-2).map((n) => n[0]).join("").toUpperCase() || "?"

const fmtDate = (s: string | null) => {
  if (!s) return "—"
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString()
}

// Sales-track landing: leads handed over from telecalling. Role-scoped by the
// backend — a sale_staff sees only their own; coordinator/sale_head/manager/
// admin see the whole handed-over pipeline.
export function SalesPipelineView({ onOpenLead }: SalesPipelineViewProps) {
  const { data: leads = [], isLoading } = useSalesPipeline()
  if (isLoading) return <ViewSkeleton />

  return (
    <div className="space-y-4">
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-primary/15">
              <Briefcase className="size-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                {leads.length} {leads.length === 1 ? "lead" : "leads"} in your sales pipeline
              </p>
              <p className="text-xs text-muted-foreground">
                Build the quote, run follow-ups, and close — open a lead to begin.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Inbox className="size-4 text-primary" />Handed-Over Leads
          </CardTitle>
          <CardDescription>Qualified leads routed to sales for quotation &amp; closure</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {leads.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
              <ArrowRightLeft className="size-8 text-muted-foreground/40" />
              <p className="text-sm font-medium text-foreground">Nothing handed over yet</p>
              <p className="max-w-xs text-xs text-muted-foreground">
                When a telecaller hands a qualified lead to you, it lands here.
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {leads.map((lead: SalesPipelineRow) => {
                const name = lead.customer_name || `Lead #${lead.id}`
                return (
                  <div
                    key={lead.id}
                    className="flex flex-wrap items-start justify-between gap-3 p-4 transition-colors hover:bg-muted/50"
                  >
                    <div className="flex min-w-0 flex-1 items-start gap-4">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                        {initials(name)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {lead.equipment || "—"}
                          {lead.budget_range ? ` · ${lead.budget_range}` : ""}
                        </p>
                        <p className="mt-1.5 text-xs text-muted-foreground">
                          Handed over by{" "}
                          <span className="text-foreground">{lead.handoff_from || "—"}</span>
                          {" · "}
                          {fmtDate(lead.handed_off_at)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">{lead.stage}</Badge>
                      <Button size="sm" onClick={() => onOpenLead(String(lead.id))}>Open</Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
