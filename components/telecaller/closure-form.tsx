"use client"

import { useState } from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  Trophy, XCircle, Shield, AlertTriangle, RotateCcw,
  Search, Loader2, PackageCheck, CheckCircle2,
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
import { API_BASE_URL } from "@/lib/api-config"
import { useClosureRecord, useLeadSapOrder } from "@/hooks/use-leads"
import { useCloseLead, useLookupSapOrder, useMarkWon } from "@/hooks/use-lead-mutations"
import { DialogFooter } from "@/components/ui/dialog"
import {
  closureLostSchema,
  LOST_REASONS, PRICE_GAP_RANGES,
  type ClosureLostValues,
} from "@/lib/schemas/closure"
import type { ClosureRecordRow, SapOrderLine, SapOrderLookup } from "@/lib/api/leads"

// ── Closure Card ─────────────────────────────────────────────────────
export function ClosureCard({ opportunityDocEntry }: { opportunityDocEntry: number }) {
  const { data: closure, isLoading } = useClosureRecord(opportunityDocEntry)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [markWonOpen, setMarkWonOpen] = useState(false)

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
          Close as WON or LOST (linking the SAP order), or mark WON now without an order —
          the sales order links automatically once posted. This action cannot be undone.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => setDialogOpen(true)} className="gap-1.5">
            <Shield className="size-3.5" />
            Close Lead
          </Button>
          <Button size="sm" variant="outline" onClick={() => setMarkWonOpen(true)} className="gap-1.5">
            <Trophy className="size-3.5 text-green-600" />
            Mark Won (no order)
          </Button>
        </div>
        <ClosureDialog
          opportunityDocEntry={opportunityDocEntry}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
        />
        <MarkWonDialog
          opportunityDocEntry={opportunityDocEntry}
          open={markWonOpen}
          onOpenChange={setMarkWonOpen}
        />
      </CardContent>
    </Card>
  )
}

function MarkWonDialog({
  opportunityDocEntry,
  open,
  onOpenChange,
}: {
  opportunityDocEntry: number
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  const { data: order, isLoading } = useLeadSapOrder(opportunityDocEntry, open)
  const { mutateAsync: markWon, isPending } = useMarkWon(opportunityDocEntry)

  const submit = async () => {
    try {
      await markWon()
      toast.success("Marked WON — calls and drip stopped")
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to mark won")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle className="text-base flex items-center gap-2">
            <Trophy className="size-4 text-green-600" />Mark Won #{opportunityDocEntry}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Mark this lead Won from your conversation — no sales order needed. Calls and drip stop immediately.
          </DialogDescription>
        </DialogHeader>
        <div className="py-1 text-xs">
          {isLoading ? (
            <p className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" />Checking SAP for a sales order…
            </p>
          ) : order ? (
            <div className="space-y-0.5 rounded-md border border-green-300 bg-green-50 p-2.5 dark:bg-green-950">
              <p className="flex items-center gap-1.5 font-medium text-green-800 dark:text-green-200">
                <PackageCheck className="size-3.5" />A sales order already exists — it will be linked.
              </p>
              <p className="text-green-700 dark:text-green-300">
                SO {order.orderNumber}
                {order.amount != null ? ` · ₹${Number(order.amount).toLocaleString("en-IN")}` : ""}
                {order.postingDate ? ` · ${order.postingDate}` : ""}
                {order.salesEmployee ? ` · ${order.salesEmployee}` : ""}
              </p>
            </div>
          ) : (
            <p className="flex items-start gap-1.5 rounded-md border border-amber-300 bg-amber-50 p-2.5 text-amber-800 dark:bg-amber-950 dark:text-amber-200">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />No sales order found in SAP yet — it will link automatically once posted.
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button size="sm" onClick={submit} disabled={isPending} className="gap-1.5 bg-green-600 hover:bg-green-700">
            <Trophy className="size-3.5" />{isPending ? "Marking…" : "Mark Won"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Proof URLs are stored relative to the gateway origin (e.g. "/uploads/proofs/x").
// API_BASE_URL includes the "/api/telecaller" mount, so derive just the origin.
function proofHref(url: string): string {
  if (/^https?:\/\//i.test(url)) return url
  try {
    return `${new URL(API_BASE_URL).origin}${url.startsWith("/") ? "" : "/"}${url}`
  } catch {
    return url
  }
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
            {r.sap_order_doc_entry && (
              <p className="text-green-600">
                SAP Sales Order #{r.sap_order_doc_num ?? r.sap_order_doc_entry}
                {r.sap_order_source === "linked" ? " (linked)" : r.sap_order_source === "created" ? " (created)" : ""}
              </p>
            )}
            {r.signed_quote_url && (
              <p>
                <a href={proofHref(r.signed_quote_url)} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                  View signed quotation
                </a>
              </p>
            )}
            {r.advance_payment_proof_url && (
              <p>
                <a href={proofHref(r.advance_payment_proof_url)} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                  View advance payment proof
                </a>
              </p>
            )}
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

const inr = (n: number | null | undefined) =>
  n == null ? "—" : `₹${Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`

function LineItemsTable({ lines }: { lines: SapOrderLine[] }) {
  if (!lines.length) return <p className="text-[11px] text-muted-foreground">No line items.</p>
  return (
    <div className="rounded-md border overflow-hidden">
      <table className="w-full text-[11px]">
        <thead className="bg-muted/50 text-muted-foreground">
          <tr>
            <th className="text-left font-medium px-2 py-1">Item</th>
            <th className="text-right font-medium px-2 py-1">Qty</th>
            <th className="text-right font-medium px-2 py-1">Unit</th>
            <th className="text-right font-medium px-2 py-1">Total</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((l, i) => (
            <tr key={`${l.itemCode}-${i}`} className="border-t">
              <td className="px-2 py-1">
                <span className="font-mono">{l.itemCode}</span>
                {l.description ? <span className="text-muted-foreground"> · {l.description}</span> : null}
              </td>
              <td className="px-2 py-1 text-right">{l.quantity}</td>
              <td className="px-2 py-1 text-right">{inr(l.unitPrice)}</td>
              <td className="px-2 py-1 text-right">{inr(l.lineTotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function WonForm({ opportunityDocEntry, onClose }: { opportunityDocEntry: number; onClose: () => void }) {
  const { mutateAsync: close, isPending } = useCloseLead(opportunityDocEntry)
  const { mutateAsync: lookup, isPending: looking } = useLookupSapOrder(opportunityDocEntry)

  const [docNumInput, setDocNumInput] = useState("")
  const [linkedOrder, setLinkedOrder] = useState<SapOrderLookup | null>(null)
  const [linkAnyway, setLinkAnyway] = useState(false)

  const runLookup = async (docNum: string) => {
    const n = docNum.trim()
    if (!n) return toast.error("Enter the SAP order number")
    setLinkedOrder(null)
    setLinkAnyway(false)
    try {
      setLinkedOrder(await lookup(n))
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not find that SAP order")
    }
  }

  const mismatch = Boolean(linkedOrder && !linkedOrder.cardCodeMatches && linkedOrder.leadCardCode)
  const alreadyLinked = linkedOrder?.alreadyLinked ?? null

  const onSubmit = async () => {
    if (!linkedOrder) return toast.error("Fetch the SAP order first")
    if (alreadyLinked) return toast.error(`That SAP order is already linked to lead #${alreadyLinked.leadId}`)
    if (mismatch && !linkAnyway) return toast.error("That order is for a different customer — tick “Link anyway” to proceed")

    const fd = new FormData()
    fd.append("outcome", "won")
    fd.append("orderMode", "link")
    fd.append("sapOrderDocEntry", String(linkedOrder.order.docEntry))

    try {
      const r = await close(fd)
      const orderRef = r.sapOrderDocNum ?? r.sapOrderDocEntry
      toast.success(`Lead closed — WON${orderRef ? ` (SAP Order #${orderRef})` : ""}`)
      onClose()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to close lead")
    }
  }

  return (
    <div className="space-y-3">
      <Label className="text-xs font-medium flex items-center gap-1.5">
        <Search className="size-3.5" /> Enter the SAP sales order number, fetch it, then confirm to close Won.
      </Label>
      <div className="flex gap-2">
        <Input
          value={docNumInput}
          onChange={(e) => setDocNumInput(e.target.value)}
          placeholder="e.g. 26200207"
          inputMode="numeric"
          className="text-xs h-9"
          onKeyDown={(e) => { if (e.key === "Enter") runLookup(docNumInput) }}
        />
        <Button type="button" size="sm" variant="secondary" disabled={looking} className="gap-1.5" onClick={() => runLookup(docNumInput)}>
          {looking ? <Loader2 className="size-3.5 animate-spin" /> : <Search className="size-3.5" />} Fetch
        </Button>
      </div>

      {linkedOrder && (
        <div className="space-y-2 rounded-md border p-3">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-medium flex items-center gap-1.5">
              <CheckCircle2 className="size-3.5 text-green-600" /> Order #{linkedOrder.order.docNum} — {linkedOrder.order.cardName || "—"}
            </span>
            <span className="text-muted-foreground">{inr(linkedOrder.order.docTotal)}</span>
          </div>
          <LineItemsTable lines={linkedOrder.order.lines} />
          {alreadyLinked && (
            <p className="text-[11px] text-destructive flex items-center gap-1.5">
              <AlertTriangle className="size-3 shrink-0" /> Already linked to lead #{alreadyLinked.leadId} — pick a different order.
            </p>
          )}
          {mismatch && !alreadyLinked && (
            <label className="flex items-start gap-2 text-[11px] text-amber-700 dark:text-amber-300">
              <input type="checkbox" checked={linkAnyway} onChange={(e) => setLinkAnyway(e.target.checked)} className="mt-0.5" />
              <span>
                This order's customer ({linkedOrder.order.cardCode}) differs from the lead's ({linkedOrder.leadCardCode}). Link anyway.
              </span>
            </label>
          )}
        </div>
      )}

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="outline" size="sm" onClick={onClose}>Cancel</Button>
        <Button type="button" size="sm" disabled={isPending || !linkedOrder} onClick={onSubmit} className="gap-1.5 bg-green-600 hover:bg-green-700">
          <Trophy className="size-3.5" /> {isPending ? "Closing..." : "Confirm & Close WON"}
        </Button>
      </div>
    </div>
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
                <Label className="text-xs">Competitor Name *</Label>
                <Input {...field} placeholder="e.g. Confident, Gnatus" className="text-xs" />
                {errors.competitorName && <p className="text-[11px] text-destructive">{errors.competitorName.message}</p>}
              </div>
            )}
          />
          <Controller
            control={control}
            name="priceGapRange"
            render={({ field }) => (
              <div className="space-y-1.5">
                <Label className="text-xs">Price Gap *</Label>
                <Select value={field.value || ""} onValueChange={field.onChange}>
                  <SelectTrigger className="text-xs"><SelectValue placeholder="How much cheaper?" /></SelectTrigger>
                  <SelectContent>
                    {PRICE_GAP_RANGES.map((r) => (
                      <SelectItem key={r.value} value={r.value} className="text-xs">{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.priceGapRange && <p className="text-[11px] text-destructive">{errors.priceGapRange.message}</p>}
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
