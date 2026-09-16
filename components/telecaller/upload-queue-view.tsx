"use client"

import { useRef, useState } from "react"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  Upload, FileDown, Phone, Trash2, MapPin, Loader2, RefreshCw, CalendarDays,
  AlertTriangle, CheckCircle2, Wallet, Clock, RotateCcw, MapPinned,
} from "lucide-react"
import { useIntakeQueue, useSheetSyncStatus } from "@/hooks/use-leads"
import { useUploadIntake, useDiscardIntake, useSyncSheet, useRestoreIntake } from "@/hooks/use-lead-mutations"
import { QuickLeadEntry } from "./quick-lead-entry"
import { apiUrl, endpoints } from "@/lib/api-config"
import { tokenStorage } from "@/lib/auth/token"
import type { IntakeRow } from "@/lib/api/leads"

const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`

const ago = (iso: string | null) => {
  if (!iso) return "never"
  const diff = Date.now() - new Date(iso).getTime()
  if (Number.isNaN(diff)) return "unknown"
  const m = Math.floor(diff / 60000)
  if (m < 1) return "just now"
  if (m < 60) return `${m} min ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export function UploadQueueView({ onOpenLead }: { onOpenLead?: (leadId: string, action?: string) => void }) {
  const [day, setDay] = useState<string>("")
  const [tab, setTab] = useState<"call" | "discarded">("call")
  const { data: callData, isLoading } = useIntakeQueue({ status: "pending", ...(day ? { from: day, to: day } : {}) })
  const { data: discardedData } = useIntakeQueue({ status: "discarded" })
  const { data: sheet } = useSheetSyncStatus()
  const { mutateAsync: syncSheet, isPending: syncing } = useSyncSheet()
  const { mutateAsync: uploadIntake, isPending: uploading } = useUploadIntake()
  const { mutateAsync: discardIntake } = useDiscardIntake()
  const { mutateAsync: restoreIntake } = useRestoreIntake()
  const fileRef = useRef<HTMLInputElement>(null)
  const [selected, setSelected] = useState<IntakeRow | null>(null)
  const [lastUpload, setLastUpload] = useState<{ inserted: number; skipped: { row: number; reason: string }[] } | null>(null)

  const callRows = callData?.rows ?? []
  const discardedRows = discardedData?.rows ?? []
  const rows = tab === "call" ? callRows : discardedRows
  const today = ymd(new Date())
  const yesterday = ymd(new Date(Date.now() - 86400000))

  const onSync = async () => {
    try {
      const res = await syncSheet()
      toast.success(res.newCount ? `${res.newCount} new lead${res.newCount === 1 ? "" : "s"} added to the queue` : "Up to date — no new leads")
    } catch {
      /* mutation toasts the error */
    }
  }

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    try {
      const res = await uploadIntake(file)
      setLastUpload({ inserted: res.inserted, skipped: res.skipped })
      toast.success(
        `${res.inserted} lead${res.inserted === 1 ? "" : "s"} queued` +
          (res.skipped.length ? ` · ${res.skipped.length} skipped` : ""),
      )
    } catch {
      /* mutation already toasts the error */
    }
  }

  const downloadTemplate = async () => {
    try {
      const token = tokenStorage.get()
      const res = await fetch(apiUrl(endpoints.intakeTemplate), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!res.ok) throw new Error("download failed")
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "lead-upload-template.xlsx"
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error("Could not download the template")
    }
  }

  const discard = async (row: IntakeRow) => {
    try {
      await discardIntake(row.id)
      toast.success("Removed from the queue")
    } catch {
      /* mutation toasts */
    }
  }

  const restore = async (row: IntakeRow) => {
    try {
      await restoreIntake(row.id)
      toast.success("Back in the to-call queue")
    } catch {
      /* mutation toasts */
    }
  }

  const renderRow = (row: IntakeRow) => {
    const callable = row.is_callable !== 0
    return (
      <div key={row.id} className="flex items-center gap-3 rounded-lg border p-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium truncate">{row.customer_name}</p>
            {row.source_type === "google_sheet" && (
              <Badge variant="outline" className="border-blue-500/40 text-[10px] text-blue-600">Ads sheet</Badge>
            )}
            {!callable && (
              <Badge variant="outline" className="border-amber-500/50 text-[10px] text-amber-600">
                <AlertTriangle className="mr-1 size-2.5" /> Needs valid phone
              </Badge>
            )}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Phone className="size-3" />{row.phone || "—"}</span>
            {row.city && (
              <span className="flex items-center gap-1">
                <MapPin className="size-3" />{row.city}{row.state ? `, ${row.state}` : ""}
              </span>
            )}
            {(row.lead_date || row.raw_date) && (
              <span className="flex items-center gap-1"><CalendarDays className="size-3" />{row.lead_date || row.raw_date}</span>
            )}
            {row.source && <Badge variant="outline" className="text-[10px]">{row.source}</Badge>}
            {typeof row.sheet_row === "number" && <span className="text-[10px]">row {row.sheet_row}</span>}
          </div>
          {(row.budget || row.timeline || row.best_time) && (
            <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              {row.budget && <span className="flex items-center gap-1"><Wallet className="size-3" />{row.budget}</span>}
              {row.timeline && <span className="flex items-center gap-1"><Clock className="size-3" />{row.timeline}</span>}
              {row.best_time && <span>Call: {row.best_time}</span>}
            </div>
          )}
        </div>
        {tab === "call" ? (
          <>
            <Button size="sm" onClick={() => setSelected(row)} disabled={!callable} title={callable ? undefined : "This lead has no valid phone number"}>
              <Phone className="size-4 mr-1.5" /> Call &amp; enter
            </Button>
            <Button size="icon" variant="ghost" onClick={() => discard(row)} aria-label="Discard">
              <Trash2 className="size-4 text-muted-foreground" />
            </Button>
          </>
        ) : (
          <Button size="sm" variant="outline" onClick={() => restore(row)}>
            <RotateCcw className="size-4 mr-1.5" /> Restore
          </Button>
        )}
      </div>
    )
  }

  const up = sheet?.syncedUpTo

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle>Live ads leads (Google Sheet)</CardTitle>
            <CardDescription>
              Leads from your ads sheet come into the queue when you press “Sync now” — auto-pull is off.
              Each sync pulls anything newer than the last one (the last few days on the first run).
            </CardDescription>
          </div>
          <Button size="sm" variant="outline" className="shrink-0" onClick={onSync} disabled={syncing}>
            {syncing ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : <RefreshCw className="size-4 mr-1.5" />}
            Sync now
          </Button>
        </CardHeader>
        {sheet && (
          <CardContent className="pt-0 space-y-2">
            {sheet.lastOk === false ? (
              <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                <AlertTriangle className="size-4 mt-0.5 shrink-0" />
                <div>
                  <span className="font-medium">Sync problem — not importing.</span> {sheet.lastError || "Could not read the sheet."}
                  <div className="mt-0.5 text-xs opacity-80">Last tried {ago(sheet.lastRunAt)}. Fix the sheet sharing/columns and press “Sync now”.</div>
                </div>
              </div>
            ) : !sheet.baselineSet ? (
              <div className="rounded-md bg-muted/50 p-3 text-sm text-muted-foreground">
                Not started yet. Press <span className="font-medium text-foreground">“Sync now”</span> — it pulls the last few days
                of leads (skipping anyone already in your CRM), then keeps only newer ones after that.
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-md bg-muted/50 p-3 text-sm">
                <span className="flex items-center gap-1.5 text-success">
                  <CheckCircle2 className="size-4" /> {sheet.enabled ? "Auto-syncing" : "Manual sync"} · last synced {ago(sheet.lastRunAt)}
                </span>
                {sheet.lastNewCount > 0 && (
                  <span className="text-muted-foreground">{sheet.lastNewCount} new last run{sheet.lastSkippedCount ? ` (${sheet.lastSkippedCount} need valid phone)` : ""}</span>
                )}
                {!sheet.enabled && <span className="text-xs text-muted-foreground">auto-poll off — using the button</span>}
              </div>
            )}
            {up && (
              <div className="flex items-start gap-1.5 rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground">
                <MapPinned className="size-3.5 mt-0.5 shrink-0" />
                <span>
                  Synced up to <span className="font-medium text-foreground">{up.name}</span>
                  {up.phone ? ` · ${up.phone}` : ""}
                  {up.rawDate || up.leadDate ? ` · dated ${up.rawDate || up.leadDate}` : ""}
                  {typeof up.sheetRow === "number" ? ` · sheet row ${up.sheetRow}` : ""}
                  {` · id ${up.id}`}.
                  {" "}Next “Sync now” pulls any leads newer than this (last few days), skipping anyone already in the CRM.
                </span>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div>
            <CardTitle>Upload leads (Excel)</CardTitle>
            <CardDescription>
              Upload an Excel of leads — they wait in the queue until you call and log the first attempt.
              Nothing is created in the system on upload.
            </CardDescription>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button variant="outline" size="sm" onClick={downloadTemplate}>
              <FileDown className="size-4 mr-1.5" /> Template
            </Button>
            <Button size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
              {uploading ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : <Upload className="size-4 mr-1.5" />}
              Upload Excel
            </Button>
            <input ref={fileRef} type="file" accept=".xlsx" className="hidden" onChange={onPickFile} />
          </div>
        </CardHeader>
        {lastUpload && (
          <CardContent className="pt-0">
            <div className="rounded-md bg-muted/50 p-3 text-sm">
              <span className="font-medium text-success">{lastUpload.inserted} added to the queue</span>
              {lastUpload.skipped.length > 0 && (
                <>
                  {" · "}
                  <span className="text-amber-600">{lastUpload.skipped.length} skipped</span>
                  <ul className="mt-1.5 list-disc pl-5 text-xs text-muted-foreground">
                    {lastUpload.skipped.slice(0, 8).map((s) => (
                      <li key={s.row}>Row {s.row}: {s.reason}</li>
                    ))}
                    {lastUpload.skipped.length > 8 && <li>…and {lastUpload.skipped.length - 8} more</li>}
                  </ul>
                </>
              )}
            </div>
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant={tab === "call" ? "default" : "outline"} onClick={() => setTab("call")}>
              To call <Badge variant="secondary" className="ml-1.5">{callRows.length}</Badge>
            </Button>
            <Button size="sm" variant={tab === "discarded" ? "default" : "outline"} onClick={() => setTab("discarded")}>
              Discarded <Badge variant="secondary" className="ml-1.5">{discardedRows.length}</Badge>
            </Button>
          </div>
          <CardDescription className="mt-1">
            {tab === "call"
              ? "Oldest lead first. Click a lead → the entry form opens pre-filled → log the call to create the lead."
              : "Leads you removed from the queue. Click Restore to bring one back if it was discarded by mistake."}
          </CardDescription>
          {tab === "call" && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <CalendarDays className="size-4 text-muted-foreground" />
              <Button size="sm" variant={day === "" ? "default" : "outline"} onClick={() => setDay("")}>All days</Button>
              <Button size="sm" variant={day === today ? "default" : "outline"} onClick={() => setDay(today)}>Today</Button>
              <Button size="sm" variant={day === yesterday ? "default" : "outline"} onClick={() => setDay(yesterday)}>Yesterday</Button>
              <input
                type="date"
                value={day}
                onChange={(e) => setDay(e.target.value)}
                className="h-9 rounded-md border bg-background px-2 text-sm"
                aria-label="Filter by lead day"
              />
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-2">
          {tab === "call" && isLoading ? (
            [0, 1, 2].map((i) => <Skeleton key={i} className="h-16 w-full" />)
          ) : rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {tab === "discarded"
                ? "Nothing discarded."
                : day
                  ? "No leads for this day."
                  : "Nothing waiting. Sync the sheet or upload an Excel to add leads to call."}
            </p>
          ) : (
            rows.map(renderRow)
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Call &amp; enter lead</DialogTitle>
          </DialogHeader>
          {selected && (
            <QuickLeadEntry
              key={selected.id}
              onOpenLead={onOpenLead}
              intakeId={selected.id}
              onDone={() => setSelected(null)}
              defaultValues={{
                leadName: selected.customer_name,
                phoneNumber: selected.phone,
                whatsappNumber: selected.whatsapp_number ?? undefined,
                email: selected.email ?? undefined,
                state: selected.state ?? undefined,
                city: selected.city ?? undefined,
                source: selected.source ?? undefined,
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
