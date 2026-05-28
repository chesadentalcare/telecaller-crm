"use client"

import { useState, useRef } from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  Trophy, XCircle, Upload, Calendar, Shield, AlertTriangle, RotateCcw,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { ApiError } from "@/lib/api/client"
import { useClosureRecord } from "@/hooks/use-leads"
import { useCloseLead } from "@/hooks/use-lead-mutations"
import {
  closureWonSchema, closureLostSchema,
  LOST_REASONS, PRICE_GAP_RANGES,
  type ClosureWonValues, type ClosureLostValues,
} from "@/lib/schemas/closure"
import type { ClosureRecordRow } from "@/lib/api/leads"

// ── Closure Card ─────────────────────────────────────────────────────
export function ClosureCard({ opportunityDocEntry }: { opportunityDocEntry: number }) {
  const { data: closure, isLoading } = useClosureRecord(opportunityDocEntry)
  const [dialogOpen, setDialogOpen] = useState(false)

  if (isLoading) return null

  // Already closed — show record
  if (closure) {
    return <ClosureRecordDisplay record={closure} />
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Shield className="size-4" />
          Close Lead
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground mb-3">
          Close this deal as WON or LOST. This action cannot be undone.
        </p>
        <Button size="sm" onClick={() => setDialogOpen(true)} className="gap-1.5">
          <Shield className="size-3.5" />
          Close Lead
        </Button>
        <ClosureDialog
          opportunityDocEntry={opportunityDocEntry}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
        />
      </CardContent>
    </Card>
  )
}

// ── Closure Record Display ───────────────────────────────────────────
function ClosureRecordDisplay({ record: r }: { record: ClosureRecordRow }) {
  const isWon = r.outcome === "won"

  return (
    <Card className={isWon ? "border-green-200 dark:border-green-900" : "border-red-200 dark:border-red-900"}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          {isWon ? <Trophy className="size-4 text-green-600" /> : <XCircle className="size-4 text-red-600" />}
          Closed — {isWon ? "WON" : "LOST"}
          <Badge className={isWon ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
            {r.outcome.toUpperCase()}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-xs">
        <div className="flex items-center gap-3 text-muted-foreground">
          <span>Closed by: {r.closed_by}</span>
          <span>On: {new Date(r.closed_at).toLocaleDateString("en-IN")}</span>
        </div>
        {isWon && (
          <div className="space-y-1">
            {r.dispatch_date && <p>Dispatch: {new Date(r.dispatch_date).toLocaleDateString("en-IN")}</p>}
            {r.installation_date && <p>Installation: {new Date(r.installation_date).toLocaleDateString("en-IN")}</p>}
            {r.sap_order_doc_entry && <p className="text-green-600">SAP Sales Order #{r.sap_order_doc_entry}</p>}
          </div>
        )}
        {!isWon && (
          <div className="space-y-1">
            {r.lost_reason && <p>Reason: <span className="capitalize">{r.lost_reason.replace(/_/g, " ")}</span></p>}
            {r.competitor_name && <p>Competitor: {r.competitor_name}</p>}
            {r.price_gap_range && <p>Price gap: {r.price_gap_range}</p>}
            {r.reactivation_flag ? (
              <p className="flex items-center gap-1 text-blue-600">
                <RotateCcw className="size-3" /> Moved to 6-month reactivation funnel
              </p>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ── Closure Dialog ───────────────────────────────────────────────────
function ClosureDialog({
  opportunityDocEntry,
  open,
  onOpenChange,
}: {
  opportunityDocEntry: number
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [outcomeTab, setOutcomeTab] = useState<"won" | "lost">("won")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">Close Lead #{opportunityDocEntry}</DialogTitle>
          <DialogDescription className="text-xs">
            Select outcome and fill required fields. This action is permanent.
          </DialogDescription>
        </DialogHeader>

        {/* Outcome toggle */}
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant={outcomeTab === "won" ? "default" : "outline"}
            className={`flex-1 gap-1.5 ${outcomeTab === "won" ? "bg-green-600 hover:bg-green-700" : ""}`}
            onClick={() => setOutcomeTab("won")}
          >
            <Trophy className="size-3.5" /> WON
          </Button>
          <Button
            type="button"
            size="sm"
            variant={outcomeTab === "lost" ? "default" : "outline"}
            className={`flex-1 gap-1.5 ${outcomeTab === "lost" ? "bg-red-600 hover:bg-red-700" : ""}`}
            onClick={() => setOutcomeTab("lost")}
          >
            <XCircle className="size-3.5" /> LOST
          </Button>
        </div>

        <Separator />

        {outcomeTab === "won" ? (
          <WonForm opportunityDocEntry={opportunityDocEntry} onClose={() => onOpenChange(false)} />
        ) : (
          <LostForm opportunityDocEntry={opportunityDocEntry} onClose={() => onOpenChange(false)} />
        )}
      </DialogContent>
    </Dialog>
  )
}

// ── WON Form ─────────────────────────────────────────────────────────
function WonForm({ opportunityDocEntry, onClose }: { opportunityDocEntry: number; onClose: () => void }) {
  const { mutateAsync: close, isPending } = useCloseLead(opportunityDocEntry)
  const signedQuoteRef = useRef<HTMLInputElement>(null)
  const paymentProofRef = useRef<HTMLInputElement>(null)

  const {
    control, handleSubmit,
    formState: { errors },
  } = useForm<ClosureWonValues>({
    resolver: zodResolver(closureWonSchema),
    defaultValues: { outcome: "won", dispatchDate: "", installationDate: "" },
  })

  const onSubmit = async (values: ClosureWonValues) => {
    const sqFile = signedQuoteRef.current?.files?.[0]
    const ppFile = paymentProofRef.current?.files?.[0]
    if (!sqFile) return toast.error("Upload the signed quotation")
    if (!ppFile) return toast.error("Upload the advance payment proof")

    const fd = new FormData()
    fd.append("outcome", "won")
    fd.append("dispatchDate", values.dispatchDate)
    fd.append("installationDate", values.installationDate)
    fd.append("signedQuote", sqFile)
    fd.append("advancePaymentProof", ppFile)

    try {
      const r = await close(fd)
      toast.success(`Lead closed — WON${r.sapOrderDocEntry ? ` (SAP Order #${r.sapOrderDocEntry})` : ""}`)
      onClose()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to close lead")
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <Label className="text-xs flex items-center gap-1.5"><Upload className="size-3" /> Signed Quotation *</Label>
        <Input type="file" accept=".pdf,.jpg,.png" ref={signedQuoteRef} className="text-xs h-9" />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs flex items-center gap-1.5"><Upload className="size-3" /> Advance Payment Proof *</Label>
        <Input type="file" accept=".pdf,.jpg,.png" ref={paymentProofRef} className="text-xs h-9" />
      </div>
      <Controller
        control={control}
        name="dispatchDate"
        render={({ field }) => (
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1.5"><Calendar className="size-3" /> Dispatch Date *</Label>
            <Input type="date" {...field} className="text-xs" />
            {errors.dispatchDate && <p className="text-[11px] text-destructive">{errors.dispatchDate.message}</p>}
          </div>
        )}
      />
      <Controller
        control={control}
        name="installationDate"
        render={({ field }) => (
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1.5"><Calendar className="size-3" /> Installation Date *</Label>
            <Input type="date" {...field} className="text-xs" />
            {errors.installationDate && <p className="text-[11px] text-destructive">{errors.installationDate.message}</p>}
          </div>
        )}
      />
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" size="sm" onClick={onClose}>Cancel</Button>
        <Button type="submit" size="sm" disabled={isPending} className="gap-1.5 bg-green-600 hover:bg-green-700">
          <Trophy className="size-3.5" /> {isPending ? "Closing..." : "Close as WON"}
        </Button>
      </div>
    </form>
  )
}

// ── LOST Form ────────────────────────────────────────────────────────
function LostForm({ opportunityDocEntry, onClose }: { opportunityDocEntry: number; onClose: () => void }) {
  const { mutateAsync: close, isPending } = useCloseLead(opportunityDocEntry)

  const {
    control, handleSubmit, watch,
    formState: { errors },
  } = useForm<ClosureLostValues>({
    resolver: zodResolver(closureLostSchema),
    defaultValues: {
      outcome: "lost",
      lostReason: undefined,
      competitorName: "",
      priceGapRange: undefined,
      reactivationFlag: false,
    },
  })

  const reason = watch("lostReason")

  const onSubmit = async (values: ClosureLostValues) => {
    const fd = new FormData()
    fd.append("outcome", "lost")
    fd.append("lostReason", values.lostReason)
    if (values.competitorName) fd.append("competitorName", values.competitorName)
    if (values.priceGapRange) fd.append("priceGapRange", values.priceGapRange)
    fd.append("reactivationFlag", String(values.reactivationFlag))

    try {
      const r = await close(fd)
      toast.success(
        r.reactivationFlag
          ? "Lead closed — LOST (moved to reactivation funnel)"
          : "Lead closed — LOST",
      )
      onClose()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to close lead")
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Controller
        control={control}
        name="lostReason"
        render={({ field }) => (
          <div className="space-y-1.5">
            <Label className="text-xs">Lost Reason *</Label>
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger className="text-xs"><SelectValue placeholder="Select reason..." /></SelectTrigger>
              <SelectContent>
                {LOST_REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value} className="text-xs">{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.lostReason && <p className="text-[11px] text-destructive">{errors.lostReason.message}</p>}
          </div>
        )}
      />

      {(reason === "competitor" || reason === "price") && (
        <>
          <Controller
            control={control}
            name="competitorName"
            render={({ field }) => (
              <div className="space-y-1.5">
                <Label className="text-xs">Competitor Name</Label>
                <Input {...field} placeholder="e.g. Confident, Gnatus" className="text-xs" />
              </div>
            )}
          />
          <Controller
            control={control}
            name="priceGapRange"
            render={({ field }) => (
              <div className="space-y-1.5">
                <Label className="text-xs">Price Gap</Label>
                <Select value={field.value || ""} onValueChange={field.onChange}>
                  <SelectTrigger className="text-xs"><SelectValue placeholder="How much cheaper?" /></SelectTrigger>
                  <SelectContent>
                    {PRICE_GAP_RANGES.map((r) => (
                      <SelectItem key={r.value} value={r.value} className="text-xs">{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          />
        </>
      )}

      <Controller
        control={control}
        name="reactivationFlag"
        render={({ field }) => (
          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <p className="text-xs font-medium flex items-center gap-1.5">
                <RotateCcw className="size-3 text-blue-600" /> Reactivation Funnel
              </p>
              <p className="text-[11px] text-muted-foreground">
                Move to 6-month funnel for future re-engagement
              </p>
            </div>
            <Switch checked={field.value} onCheckedChange={field.onChange} />
          </div>
        )}
      />

      <div className="bg-amber-50 dark:bg-amber-950 rounded-md p-2.5 flex items-start gap-2">
        <AlertTriangle className="size-3.5 text-amber-600 mt-0.5 shrink-0" />
        <p className="text-[11px] text-amber-800 dark:text-amber-200">
          Closing as LOST is permanent. The lead stage will be updated and SAP opportunity status changed.
        </p>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" size="sm" onClick={onClose}>Cancel</Button>
        <Button type="submit" size="sm" disabled={isPending} className="gap-1.5 bg-red-600 hover:bg-red-700">
          <XCircle className="size-3.5" /> {isPending ? "Closing..." : "Close as LOST"}
        </Button>
      </div>
    </form>
  )
}
