"use client"

import { useRef, useState } from "react"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Upload, FileDown, Phone, Trash2, MapPin, Loader2 } from "lucide-react"
import { useIntakeQueue } from "@/hooks/use-leads"
import { useUploadIntake, useDiscardIntake } from "@/hooks/use-lead-mutations"
import { QuickLeadEntry } from "./quick-lead-entry"
import { apiUrl, endpoints } from "@/lib/api-config"
import { tokenStorage } from "@/lib/auth/token"
import type { IntakeRow } from "@/lib/api/leads"

export function UploadQueueView({ onOpenLead }: { onOpenLead?: (leadId: string, action?: string) => void }) {
  const { data, isLoading } = useIntakeQueue()
  const { mutateAsync: uploadIntake, isPending: uploading } = useUploadIntake()
  const { mutateAsync: discardIntake } = useDiscardIntake()
  const fileRef = useRef<HTMLInputElement>(null)
  const [selected, setSelected] = useState<IntakeRow | null>(null)
  const [lastUpload, setLastUpload] = useState<{ inserted: number; skipped: { row: number; reason: string }[] } | null>(null)

  const rows = data?.rows ?? []

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = "" // allow re-selecting the same file
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

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div>
            <CardTitle>Upload leads</CardTitle>
            <CardDescription>
              Upload an Excel of new leads — they wait in the queue until you call and log the first attempt.
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
          <CardTitle className="flex items-center gap-2">
            To call <Badge variant="secondary">{rows.length}</Badge>
          </CardTitle>
          <CardDescription>
            Click a lead → the entry form opens pre-filled → log the call to create the lead.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {isLoading ? (
            [0, 1, 2].map((i) => <Skeleton key={i} className="h-16 w-full" />)
          ) : rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nothing waiting. Upload an Excel to add leads to call.
            </p>
          ) : (
            rows.map((row) => (
              <div key={row.id} className="flex items-center gap-3 rounded-lg border p-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{row.customer_name}</p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Phone className="size-3" />{row.phone}</span>
                    {row.city && (
                      <span className="flex items-center gap-1">
                        <MapPin className="size-3" />{row.city}{row.state ? `, ${row.state}` : ""}
                      </span>
                    )}
                    {row.source && <Badge variant="outline" className="text-[10px]">{row.source}</Badge>}
                  </div>
                </div>
                <Button size="sm" onClick={() => setSelected(row)}>
                  <Phone className="size-4 mr-1.5" /> Call &amp; enter
                </Button>
                <Button size="icon" variant="ghost" onClick={() => discard(row)} aria-label="Discard">
                  <Trash2 className="size-4 text-muted-foreground" />
                </Button>
              </div>
            ))
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
