"use client"

import { useState } from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { toast } from "sonner"
import { Clock, Droplets, Loader2, Phone } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LeadQueueRow } from "./lead-queue-row"
import { ViewSkeleton } from "./view-skeleton"
import { useIdleLeads, leadKeys } from "@/hooks/use-leads"
import { leadsApi } from "@/lib/api/leads"
import { ApiError } from "@/lib/api/client"
import { useQueryClient } from "@tanstack/react-query"

export function IdleQueueView() {
  const { data: leads = [], isLoading } = useIdleLeads()
  const qc = useQueryClient()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Track which row is mid-flight so only its button spins. A Map keeps the
  // state per-lead — using a single boolean would disable every row at once.
  const [pendingId, setPendingId] = useState<string | null>(null)

  const openLead = (id: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("view", "lead-detail")
    params.set("leadId", id)
    router.push(`${pathname}?${params.toString()}`)
  }

  const addToDrip = async (id: string) => {
    setPendingId(id)
    try {
      // Idle leads default to the 6+ month nurture track per Track1 spec §6.1
      // (long-cycle leads with no recent activity). Telecaller can later move
      // the lead to a faster track from the Drip tab.
      await leadsApi.enterDrip(id, { track: "6_plus_month" })
      toast.success(`Lead #${id} added to the 6-month drip`)
      // Refresh everything queue-y so the lead drops out of Idle and shows up
      // in the Drip view.
      qc.invalidateQueries({ queryKey: leadKeys.all })
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to add lead to drip")
    } finally {
      setPendingId(null)
    }
  }

  if (isLoading) return <ViewSkeleton />

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="size-4 text-warning" />Idle Leads
        </CardTitle>
        <CardDescription>No activity in the last 14+ days · pick one to nurture or open</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {leads.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            Nothing idle right now — all your leads have recent activity.
          </div>
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
                  onOpen={openLead}
                  meta={<span>Last activity {lead.lastActivity}</span>}
                  badge={
                    <Badge variant="outline" className="text-[10px] text-warning border-warning/40">
                      {lead.idleDays} days idle
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
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 px-2.5 gap-1.5"
                        onClick={() => addToDrip(lead.id)}
                        disabled={pendingId === lead.id}
                      >
                        {pendingId === lead.id ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Droplets className="size-3.5" />
                        )}
                        Add to Drip
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 px-2.5" onClick={() => openLead(lead.id)}>
                        Open
                      </Button>
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
