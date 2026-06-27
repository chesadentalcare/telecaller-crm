"use client"

import { useState } from "react"
import { PhoneOff, RefreshCw, Phone, AlertTriangle } from "lucide-react"
import { toast } from "sonner"
import { useQueryClient } from "@tanstack/react-query"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { WhatsAppIcon } from "@/components/icons/whatsapp-icon"
import { LeadQueueRow } from "./lead-queue-row"
import { ViewSkeleton } from "./view-skeleton"
import { useNoResponseLeads, leadKeys } from "@/hooks/use-leads"
import { leadsApi } from "@/lib/api/leads"
import { ApiError } from "@/lib/api/client"
import type { NoResponseLead } from "@/lib/types/lead"

// Strip everything but digits so the value is safe for tel:/wa.me links.
const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, "")}`

export function NoResponseView({ onOpenLead }: { onOpenLead?: (id: string) => void }) {
  const { data: leads = [], isLoading, isError, error, refetch } = useNoResponseLeads()
  const qc = useQueryClient()
  // Tracks which lead's recovery WhatsApp is in-flight (per-row spinner state),
  // and whether a bulk run is active (disables the header buttons).
  const [sendingId, setSendingId] = useState<string | null>(null)
  const [bulkRunning, setBulkRunning] = useState(false)

  const sendRecovery = async (lead: NoResponseLead) => {
    const res = await leadsApi.recoveryWhatsapp(lead.id, {
      phone: lead.phone,
      dentistName: lead.name,
      equipmentInterest: lead.equipment,
    })
    return res
  }

  const handleSendOne = async (lead: NoResponseLead) => {
    setSendingId(lead.id)
    try {
      const res = await sendRecovery(lead)
      toast.success(
        res.dryRun
          ? `Recovery WhatsApp queued for ${lead.name} (dry-run — see backend logs)`
          : `Recovery WhatsApp sent to ${lead.name}`,
      )
      qc.invalidateQueries({ queryKey: leadKeys.noResponse() })
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : `Failed to send recovery WhatsApp to ${lead.name}`)
    } finally {
      setSendingId(null)
    }
  }

  // No batch endpoint exists, so "Bulk WhatsApp" / "Retry All" loop over the
  // visible leads firing recovery-whatsapp one-by-one with a progress toast.
  const handleBulk = async () => {
    if (leads.length === 0 || bulkRunning) return
    setBulkRunning(true)
    const progress = toast.loading(`Sending recovery WhatsApp to 0/${leads.length}…`)
    let sent = 0
    let failed = 0
    for (const lead of leads) {
      try {
        await sendRecovery(lead)
        sent += 1
      } catch {
        failed += 1
      }
      toast.loading(`Sending recovery WhatsApp to ${sent + failed}/${leads.length}…`, { id: progress })
    }
    if (failed === 0) {
      toast.success(`Recovery WhatsApp sent to ${sent} lead${sent === 1 ? "" : "s"}`, { id: progress })
    } else {
      toast.error(`Sent ${sent}, failed ${failed} of ${leads.length}`, { id: progress })
    }
    qc.invalidateQueries({ queryKey: leadKeys.noResponse() })
    setBulkRunning(false)
  }

  if (isLoading) return <ViewSkeleton />

  if (isError) {
    return (
      <Card className="border-destructive/30 bg-destructive/5">
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <div className="flex size-10 items-center justify-center rounded-full bg-destructive/20">
            <AlertTriangle className="size-5 text-destructive" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Couldn&apos;t load the recovery queue</p>
            <p className="text-xs text-muted-foreground">
              {error instanceof ApiError ? error.message : "Please try again."}
            </p>
          </div>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => refetch()}>
            <RefreshCw className="size-3.5" />
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card className="border-warning/30 bg-warning/5">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-warning/20">
              <PhoneOff className="size-5 text-warning" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">{leads.length} leads need recovery</p>
              <p className="text-xs text-muted-foreground">Send bulk WhatsApp to all or call individually</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              disabled={bulkRunning || leads.length === 0}
              onClick={handleBulk}
            >
              <RefreshCw className={`size-3.5 ${bulkRunning ? "animate-spin" : ""}`} />
              Retry All
            </Button>
            <Button
              size="sm"
              className="gap-2 bg-[#25D366] hover:bg-[#128C7E] text-white"
              disabled={bulkRunning || leads.length === 0}
              onClick={handleBulk}
            >
              <WhatsAppIcon className="size-4" />
              Bulk WhatsApp
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Failed Contact Attempts</CardTitle>
          <CardDescription>Leads with 4+ failed call attempts</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {leads.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <div className="flex size-10 items-center justify-center rounded-full bg-muted">
                <PhoneOff className="size-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground">No leads need recovery</p>
              <p className="text-xs text-muted-foreground">Leads with 4+ failed attempts will appear here.</p>
            </div>
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
                  meta={<span>Last attempt {lead.lastAttempt}</span>}
                  badge={<Badge variant="destructive" className="text-[10px]">{lead.attempts} attempts</Badge>}
                  actions={
                    <div className="flex items-center gap-1">
                      <Button asChild variant="ghost" size="icon" className="size-8" title={`Call ${lead.name}`}>
                        <a href={telHref(lead.phone)} aria-label={`Call ${lead.name}`}>
                          <Phone className="size-4 text-success" />
                        </a>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        title={`Send recovery WhatsApp to ${lead.name}`}
                        aria-label={`Send recovery WhatsApp to ${lead.name}`}
                        disabled={sendingId === lead.id || bulkRunning}
                        onClick={() => handleSendOne(lead)}
                      >
                        {sendingId === lead.id ? (
                          <RefreshCw className="size-4 text-[#25D366] animate-spin" />
                        ) : (
                          <WhatsAppIcon className="size-4 text-[#25D366]" />
                        )}
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 px-2.5" onClick={() => onOpenLead?.(lead.id)}>
                        Open
                      </Button>
                    </div>
                  }
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
