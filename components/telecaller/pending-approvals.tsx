"use client"

import { useState } from "react"
import { toast } from "sonner"
import { BadgeCheck, Check, Loader2, Percent, ShieldAlert, X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { ViewSkeleton } from "./view-skeleton"
import { usePendingApprovals } from "@/hooks/use-leads"
import { useApproveDiscount, useRejectDiscount } from "@/hooks/use-lead-mutations"
import type { DiscountApprovalRow } from "@/lib/api/leads"

const inr = (n: number) =>
  n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function formatRequestedAt(value: string): string {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })
}

// Manager/admin-only screen: lists discount-approval requests raised by reps from
// the quotation builder and lets a manager approve or reject each (with optional
// notes). Backend: GET /approvals/pending, PUT /approvals/:id/approve|reject.
export default function PendingApprovalsView() {
  const { data: approvals = [], isLoading, isError } = usePendingApprovals()

  if (isLoading) return <ViewSkeleton />

  if (isError) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-sm text-muted-foreground">
          Couldn&apos;t load pending approvals. Please try again.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-primary/15">
              <ShieldAlert className="size-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                {approvals.length} discount request{approvals.length === 1 ? "" : "s"} awaiting review
              </p>
              <p className="text-xs text-muted-foreground">
                Approve to unblock the quote for sending, or reject to send it back
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BadgeCheck className="size-4 text-primary" />Pending Approvals
          </CardTitle>
          <CardDescription>Discount requests above the auto-approve threshold</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {approvals.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No pending approvals — every discount request has been reviewed.
            </div>
          ) : (
            <div className="divide-y">
              {approvals.map((approval) => (
                <ApprovalRow key={approval.id} approval={approval} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function ApprovalRow({ approval }: { approval: DiscountApprovalRow }) {
  const approve = useApproveDiscount(approval.id)
  const reject = useRejectDiscount(approval.id)
  const [notes, setNotes] = useState("")

  const busy = approve.isPending || reject.isPending
  const discountPct = Number(approval.discount_pct)
  const thresholdPct = Number(approval.threshold_pct)
  const grandTotal = Number(approval.grand_total)

  const handleApprove = async () => {
    const trimmed = notes.trim()
    try {
      await approve.mutateAsync(trimmed ? { notes: trimmed } : undefined)
      toast.success(`Approved discount for ${approval.quote_number ?? `request #${approval.id}`}`)
      setNotes("")
    } catch {
      // The mutation hook already surfaces a toast.error on failure.
    }
  }

  const handleReject = async () => {
    const trimmed = notes.trim()
    try {
      await reject.mutateAsync(trimmed ? { notes: trimmed } : undefined)
      toast.success(`Rejected discount for ${approval.quote_number ?? `request #${approval.id}`}`)
      setNotes("")
    } catch {
      // The mutation hook already surfaces a toast.error on failure.
    }
  }

  return (
    <div className="flex flex-col gap-3 p-4 hover:bg-muted/50 transition-colors lg:flex-row lg:items-start lg:justify-between">
      <div className="flex items-start gap-4 min-w-0 flex-1">
        <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0">
          <Percent className="size-5" />
        </div>
        <div className="min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium text-foreground">
              {approval.customer_name ?? "Unknown customer"}
            </p>
            {approval.quote_number && (
              <Badge variant="outline" className="text-[10px] font-medium">
                {approval.quote_number}
              </Badge>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {Number.isFinite(grandTotal) && (
              <span className="font-medium text-foreground tabular-nums">₹{inr(grandTotal)}</span>
            )}
            {Number.isFinite(grandTotal) && <span>•</span>}
            <Badge
              variant="outline"
              className="bg-warning/10 text-warning border-warning/30 text-[10px] font-medium"
            >
              {Number.isFinite(discountPct) ? discountPct : approval.discount_pct}% discount
            </Badge>
            <span>
              threshold {Number.isFinite(thresholdPct) ? thresholdPct : approval.threshold_pct}%
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Requested by <span className="text-foreground">{approval.requested_by}</span>
            {" · "}{formatRequestedAt(approval.requested_at)}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2 lg:w-72 shrink-0">
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes (optional) — shared with the requester"
          rows={2}
          className="text-xs resize-none"
          disabled={busy}
        />
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-destructive hover:text-destructive"
            onClick={handleReject}
            disabled={busy}
          >
            {reject.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <X className="size-3.5" />}
            Reject
          </Button>
          <Button
            size="sm"
            className="gap-1.5"
            onClick={handleApprove}
            disabled={busy}
          >
            {approve.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
            Approve
          </Button>
        </div>
      </div>
    </div>
  )
}
