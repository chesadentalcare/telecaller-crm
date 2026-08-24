"use client"

import { useState } from "react"
import { useSearchParams, usePathname } from "next/navigation"
import { toast } from "sonner"
import { Clock, Droplets, Loader2, Phone } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { LeadQueueRow } from "./lead-queue-row"
import { RepliesFilterToggle, isAwaitingReply } from "./replies-filter"
import { ViewSkeleton } from "./view-skeleton"
import { useIdleLeads, leadKeys } from "@/hooks/use-leads"
import { leadsApi } from "@/lib/api/leads"
import { ApiError } from "@/lib/api/client"
import type { IdleLead } from "@/lib/types/lead"
import { useQueryClient } from "@tanstack/react-query"

type DripTrackKey = "1_month" | "3_month" | "6_plus_month"

const TRACK_OPTIONS: { key: DripTrackKey; label: string; blurb: string }[] = [
  { key: "1_month", label: "1-Month · Hot", blurb: "9 WhatsApp touches over ~17 days — near-term buyers." },
  { key: "3_month", label: "3-Month · Warm", blurb: "Steady touches over ~90 days — mid-cycle interest." },
  { key: "6_plus_month", label: "6-Month · Long / Cold", blurb: "Slow nurture over ~168 days — gone-quiet leads." },
]

const TRACK_LABEL: Record<DripTrackKey, string> = {
  "1_month": "1-month",
  "3_month": "3-month",
  "6_plus_month": "6-month",
}

export function IdleQueueView() {
  const { data: leads = [], isLoading } = useIdleLeads()
  const qc = useQueryClient()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [repliedOnly, setRepliedOnly] = useState(false)
  // The lead whose track picker is open (null = dialog closed), the chosen track,
  // and whether the confirm call is mid-flight.
  const [dialogLead, setDialogLead] = useState<IdleLead | null>(null)
  const [selectedTrack, setSelectedTrack] = useState<DripTrackKey>("6_plus_month")
  const [saving, setSaving] = useState(false)

  const repliedCount = leads.filter(isAwaitingReply).length
  const shown = repliedOnly ? leads.filter(isAwaitingReply) : leads

  const openLead = (id: string) => {
    const params = new URLSearchParams(searchParams.toString())
    const currentView = params.get("view") ?? "idle"
    if (currentView !== "lead-detail") params.set("from", currentView)
    params.set("view", "lead-detail")
    params.set("leadId", id)
    window.history.pushState(null, "", `${pathname}?${params.toString()}`)
  }

  // Open the picker pre-selected to the track the lead is already on; when it's on
  // no drip, fall back to the 6-month long-cycle track (the historical default).
  const openTrackPicker = (lead: IdleLead) => {
    setDialogLead(lead)
    setSelectedTrack((lead.currentTrack as DripTrackKey) ?? "6_plus_month")
  }

  const confirmAddToDrip = async () => {
    if (!dialogLead) return
    setSaving(true)
    try {
      await leadsApi.enterDrip(dialogLead.id, { track: selectedTrack })
      toast.success(`Lead #${dialogLead.id} added to the ${TRACK_LABEL[selectedTrack]} drip`)
      qc.invalidateQueries({ queryKey: leadKeys.all })
      setDialogLead(null)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to add lead to drip")
    } finally {
      setSaving(false)
    }
  }

  if (isLoading) return <ViewSkeleton />

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="size-4 text-warning" />Idle Leads
            </CardTitle>
            <CardDescription>No activity in the last 14+ days · pick one to nurture or open</CardDescription>
          </div>
          <RepliesFilterToggle count={repliedCount} active={repliedOnly} onToggle={() => setRepliedOnly((v) => !v)} />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {shown.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            Nothing idle right now — all your leads have recent activity.
          </div>
        ) : (
          <div className="divide-y">
            {shown.map((lead) => {
              const tel = lead.phone.replace(/\D/g, "")
              return (
                <LeadQueueRow
                  key={lead.id}
                  id={lead.id}
                  name={lead.name}
                  phone={lead.phone}
                  equipment={lead.equipment}
                  replied={lead.replied}
                  flagged={lead.flagged}
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
                        onClick={() => openTrackPicker(lead)}
                      >
                        <Droplets className="size-3.5" />
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

      <Dialog open={!!dialogLead} onOpenChange={(open) => !open && !saving && setDialogLead(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add to nurture drip</DialogTitle>
            <DialogDescription>
              {dialogLead ? `${dialogLead.name} · #${dialogLead.id}` : ""} — choose which cadence to run.
            </DialogDescription>
          </DialogHeader>

          <RadioGroup value={selectedTrack} onValueChange={(v) => setSelectedTrack(v as DripTrackKey)} className="gap-2">
            {TRACK_OPTIONS.map((opt) => {
              const isCurrent = dialogLead?.currentTrack === opt.key
              return (
                <Label
                  key={opt.key}
                  htmlFor={`track-${opt.key}`}
                  className="flex items-start gap-3 rounded-md border p-3 cursor-pointer hover:bg-muted/50 has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                >
                  <RadioGroupItem id={`track-${opt.key}`} value={opt.key} className="mt-0.5" />
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      {opt.label}
                      {isCurrent && (
                        <Badge variant="secondary" className="text-[10px] font-normal">Currently on this</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{opt.blurb}</p>
                  </div>
                </Label>
              )
            })}
          </RadioGroup>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogLead(null)} disabled={saving}>Cancel</Button>
            <Button onClick={confirmAddToDrip} disabled={saving} className="gap-1.5">
              {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Droplets className="size-3.5" />}
              Add to {TRACK_LABEL[selectedTrack]} drip
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
