"use client"

import { useState } from "react"
import { Inbox, Phone, RotateCcw, Loader2, Droplets } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog"
import { LeadQueueRow } from "./lead-queue-row"
import { RepliesFilterToggle, isAwaitingReply } from "./replies-filter"
import { ViewSkeleton } from "./view-skeleton"
import { useReactivationLeads } from "@/hooks/use-leads"
import { useAssumeOwnership } from "@/hooks/use-lead-mutations"
import type { ReactivationLead } from "@/lib/types/lead"

interface ReactivationViewProps {
  onOpenLead: (id: string) => void
}

const formatTrack = (t?: string | null) => {
  if (t === "1_month") return "1-Month"
  if (t === "3_month") return "3-Month"
  if (t === "6_plus_month") return "6+ Month"
  return t || "drip"
}

function AssumeOwnershipButton({ lead }: { lead: ReactivationLead }) {
  const [open, setOpen] = useState(false)
  const { mutateAsync, isPending } = useAssumeOwnership(lead.id)
  const hasDrip = !!lead.dripTrack

  const onConfirm = async () => {
    try {
      await mutateAsync()
      setOpen(false)
    } catch {
      // toast handled by the mutation
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">Assume Ownership</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="size-4" /> Assume ownership — {lead.name}
          </DialogTitle>
          <DialogDescription>
            You&apos;ll take this lead back from sales
            {hasDrip ? " and it resumes its nurture drip in the exact spot it left off." : "."}
          </DialogDescription>
        </DialogHeader>

        {hasDrip ? (
          <div className="space-y-1.5 rounded-md border bg-muted/40 p-3 text-sm">
            <p className="flex items-center gap-1.5 font-medium">
              <Droplets className="size-3.5 text-primary" /> It will go back to exactly where it was:
            </p>
            <p>• Drip track: <span className="font-semibold">{formatTrack(lead.dripTrack)}</span></p>
            <p>• Resumes at message <span className="font-semibold">#{lead.dripMessageIndex ?? 0}</span></p>
            {lead.dripNextAt && (
              <p>• Next message: <span className="font-semibold">{new Date(lead.dripNextAt).toLocaleString()}</span></p>
            )}
          </div>
        ) : (
          <div className="rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">
            This lead had no active drip — it comes back as an active lead for you to work.
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={isPending}>Cancel</Button>
          <Button onClick={onConfirm} disabled={isPending} className="gap-1.5">
            {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <RotateCcw className="size-3.5" />}
            {hasDrip ? "Confirm — resume here" : "Confirm"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Gap #8 (Track1 spec): leads handed back from sales for telecaller follow-up.
export function ReactivationView({ onOpenLead }: ReactivationViewProps) {
  const { data: leads = [], isLoading } = useReactivationLeads()
  const [repliedOnly, setRepliedOnly] = useState(false)
  if (isLoading) return <ViewSkeleton />

  const repliedCount = leads.filter(isAwaitingReply).length
  const shown = repliedOnly ? leads.filter(isAwaitingReply) : leads

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
            <RepliesFilterToggle count={repliedCount} active={repliedOnly} onToggle={() => setRepliedOnly((v) => !v)} />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {shown.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">No leads returned from sales right now</p>
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
                      <AssumeOwnershipButton lead={lead} />
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
