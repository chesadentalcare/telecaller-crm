"use client"

import { useState, useMemo, useCallback } from "react"
import { useForm, useFieldArray, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  Plus, Trash2, FileText, Upload, History, Package, IndianRupee,
  ChevronDown, Search, Send, CheckCircle2, Eye, RefreshCw, AlertCircle, ExternalLink,
} from "lucide-react"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { ApiError } from "@/lib/api/client"
import { useSapItems, useLeadQuotations, useQuotationVersions, useApprovalStatus } from "@/hooks/use-leads"
import { useCreateQuotation, useSyncQuotationToSap, useSendQuotationWhatsapp, useRetryQuotationSend, usePreviewQuotationPdf, useRequestApproval } from "@/hooks/use-lead-mutations"
import {
  quotationSchema, quotationDefaults, emptyLineItem,
  type QuotationValues,
} from "@/lib/schemas/quotation"
import type { QuotationRow, SapItemRow } from "@/lib/api/leads"

// ── Constants ───────────────────────────────────────────────────────
const TAX_GROUPS = [
  { value: "NONE", label: "No Tax", rate: 0 },
  { value: "GST5", label: "5%", rate: 0.05 },
  { value: "GST12", label: "12%", rate: 0.12 },
  { value: "GST18", label: "18%", rate: 0.18 },
  { value: "GST28", label: "28%", rate: 0.28 },
]
const TAX_RATES: Record<string, number> = Object.fromEntries(TAX_GROUPS.map((t) => [t.value, t.rate]))

const PAYMENT_TERMS = [
  { value: "advance", label: "100% Advance" },
  { value: "50_50", label: "50% Advance + 50% Delivery" },
  { value: "net_30", label: "Net 30 Days" },
  { value: "net_60", label: "Net 60 Days" },
  { value: "custom", label: "Custom" },
]

const inr = (n: number) => n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// ── Searchable Item Picker ──────────────────────────────────────────
function ItemPicker({
  items,
  loading,
  value,
  onSelect,
}: {
  items: SapItemRow[]
  loading: boolean
  value: string
  onSelect: (item: SapItemRow) => void
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")

  const filtered = useMemo(() => {
    if (!search) return items
    const q = search.toLowerCase()
    return items.filter(
      (i) => i.itemCode.toLowerCase().includes(q) || i.itemName.toLowerCase().includes(q),
    )
  }, [items, search])

  const selected = items.find((i) => i.itemCode === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-9 text-xs font-normal"
        >
          <span className="truncate">
            {selected
              ? <><span className="font-mono text-muted-foreground">{selected.itemCode}</span>{" "}<span>{selected.itemName}</span></>
              : <span className="text-muted-foreground">{loading ? "Loading SAP items..." : "Search & select item..."}</span>
            }
          </span>
          <ChevronDown className="ml-1 size-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <div className="flex items-center border-b px-2.5">
          <Search className="size-3.5 shrink-0 text-muted-foreground" />
          <input
            className="flex h-9 w-full bg-transparent px-2 text-xs outline-none placeholder:text-muted-foreground"
            placeholder="Search by code or name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="max-h-56 overflow-y-auto p-1">
          {loading ? (
            <p className="px-2 py-4 text-center text-xs text-muted-foreground">Loading items from SAP...</p>
          ) : filtered.length === 0 ? (
            <p className="px-2 py-4 text-center text-xs text-muted-foreground">No items found</p>
          ) : (
            filtered.map((item) => (
              <button
                key={item.itemCode}
                type="button"
                className={cn(
                  "flex w-full items-start gap-2 rounded-sm px-2 py-1.5 text-left text-xs hover:bg-accent",
                  value === item.itemCode && "bg-accent",
                )}
                onClick={() => { onSelect(item); setOpen(false); setSearch("") }}
              >
                <Package className="size-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{item.itemName}</p>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <span className="font-mono">{item.itemCode}</span>
                    {item.price > 0 && <span>₹{inr(item.price)}</span>}
                    {item.stock > 0 && <span>Stock: {item.stock}</span>}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

// ── Quotation Builder Dialog ────────────────────────────────────────
interface QuotationBuilderProps {
  opportunityDocEntry: number
  customerCardCode: string
  customerName?: string
  meetingId?: number
  trigger?: React.ReactNode
}

export function QuotationBuilder({
  opportunityDocEntry, customerCardCode, customerName, meetingId, trigger,
}: QuotationBuilderProps) {
  const [open, setOpen] = useState(false)
  const { data: sapItems = [], isLoading: itemsLoading } = useSapItems()
  const { mutateAsync: create, isPending } = useCreateQuotation()

  const defaultValues = useMemo<QuotationValues>(() => ({
    ...quotationDefaults,
    opportunityDocEntry,
    customerCardCode,
    customerName: customerName || "",
    meetingId,
    validityDate: new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10),
  }), [opportunityDocEntry, customerCardCode, customerName, meetingId])

  const {
    control, handleSubmit, watch, setValue, reset,
    formState: { errors },
  } = useForm<QuotationValues>({ resolver: zodResolver(quotationSchema), defaultValues })

  const { fields, append, remove } = useFieldArray({ control, name: "lineItems" })
  const watchedItems = watch("lineItems")
  const watchedDiscount = watch("discountPct")

  const recalcTax = useCallback((idx: number, taxGroup: string, price: number, qty: number) => {
    const rate = TAX_RATES[taxGroup] || 0
    setValue(`lineItems.${idx}.taxAmount`, Math.round(price * qty * rate * 100) / 100)
  }, [setValue])

  const handleItemPick = useCallback((idx: number, item: SapItemRow) => {
    setValue(`lineItems.${idx}.itemCode`, item.itemCode)
    setValue(`lineItems.${idx}.description`, item.itemName)
    if (item.price > 0) {
      setValue(`lineItems.${idx}.unitPrice`, item.price)
      const taxGroup = watchedItems?.[idx]?.taxGroup || "NONE"
      const qty = Number(watchedItems?.[idx]?.quantity) || 1
      recalcTax(idx, taxGroup, item.price, qty)
    }
  }, [setValue, watchedItems, recalcTax])

  // Compute totals directly — no useMemo, because RHF watch() returns the
  // same array reference for field-array updates which prevents memo invalidation.
  let _sub = 0, _tax = 0
  for (const it of watchedItems || []) {
    _sub += (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0)
    _tax += Number(it.taxAmount) || 0
  }
  const _dp = Number(watchedDiscount) || 0
  const _disc = Math.round(_sub * _dp / 100 * 100) / 100
  const totals = { sub: _sub, tax: _tax, disc: _disc, total: Math.round((_sub - _disc + _tax) * 100) / 100 }

  const onSubmit = async (values: QuotationValues) => {
    try {
      const result = await create(values)
      toast.success(`Quotation ${result.quoteNumber} created`)
      setOpen(false)
      reset(defaultValues)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to create quotation")
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm" className="gap-1.5">
            <FileText className="size-4" /> Create Quotation
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden">
        {/* Fixed header */}
        <div className="px-5 pt-5 pb-3">
          <DialogHeader>
            <DialogTitle className="text-base">New Quotation</DialogTitle>
            <DialogDescription className="text-xs">
              Lead #{opportunityDocEntry} &mdash; {customerName || customerCardCode || "Unknown"}
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Scrollable body */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto px-5 space-y-4 pb-4">
            {/* ── Header row ─────────────────────────────────── */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Customer</Label>
                <div className="h-9 flex items-center rounded-md border bg-muted/50 px-3 text-xs font-medium truncate">
                  {customerName || customerCardCode || "—"}
                </div>
              </div>
              <Controller
                control={control}
                name="validityDate"
                render={({ field }) => (
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">Valid Until</Label>
                    <Input type="date" {...field} className="text-xs h-9" />
                  </div>
                )}
              />
            </div>
            <Controller
              control={control}
              name="paymentTerms"
              render={({ field }) => (
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Payment Terms</Label>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="text-xs h-9"><SelectValue placeholder="Select terms" /></SelectTrigger>
                    <SelectContent>
                      {PAYMENT_TERMS.map((t) => <SelectItem key={t.value} value={t.value} className="text-xs">{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {errors.paymentTerms && <p className="text-[11px] text-destructive">{errors.paymentTerms.message}</p>}
                </div>
              )}
            />

            <Separator />

            {/* ── Line Items ──────────────────────────────────── */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Line Items</span>
                <Button type="button" size="sm" variant="outline" onClick={() => append({ ...emptyLineItem })} className="gap-1 text-xs h-7">
                  <Plus className="size-3" /> Add Item
                </Button>
              </div>
              {errors.lineItems?.message && <p className="text-[11px] text-destructive">{errors.lineItems.message}</p>}

              {fields.map((field, idx) => {
                const qty = Number(watchedItems?.[idx]?.quantity) || 0
                const price = Number(watchedItems?.[idx]?.unitPrice) || 0
                const tax = Number(watchedItems?.[idx]?.taxAmount) || 0
                const lineTotal = qty * price + tax
                const selectedItem = sapItems.find((i) => i.itemCode === watchedItems?.[idx]?.itemCode)

                return (
                  <div key={field.id} className="rounded-lg border bg-card shadow-sm overflow-hidden">
                    {/* Item header bar */}
                    <div className="flex items-center justify-between bg-muted/40 px-3 py-1.5">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        #{idx + 1}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold tabular-nums">₹{inr(lineTotal)}</span>
                        <Button
                          type="button" variant="ghost" size="sm"
                          className="h-5 w-5 p-0 text-muted-foreground hover:text-destructive"
                          onClick={() => fields.length > 1 && remove(idx)}
                          disabled={fields.length <= 1}
                        >
                          <Trash2 className="size-3" />
                        </Button>
                      </div>
                    </div>

                    <div className="p-3 space-y-2.5">
                      {/* SAP Item picker — full width */}
                      <Controller
                        control={control}
                        name={`lineItems.${idx}.itemCode`}
                        render={({ field: f }) => (
                          <ItemPicker
                            items={sapItems}
                            loading={itemsLoading}
                            value={f.value}
                            onSelect={(item) => handleItemPick(idx, item)}
                          />
                        )}
                      />

                      {/* Selected item info chip */}
                      {selectedItem && (
                        <div className="flex items-center gap-2 rounded-md bg-muted/50 px-2.5 py-1.5 text-[11px]">
                          <Package className="size-3 text-muted-foreground shrink-0" />
                          <span className="truncate flex-1 text-muted-foreground">{selectedItem.itemName}</span>
                          {selectedItem.price > 0 && (
                            <span className="shrink-0 font-medium">₹{inr(selectedItem.price)}</span>
                          )}
                        </div>
                      )}

                      {/* Numbers row */}
                      <div className="grid grid-cols-3 gap-2">
                        <Controller
                          control={control}
                          name={`lineItems.${idx}.quantity`}
                          render={({ field: f }) => (
                            <div className="space-y-0.5">
                              <Label className="text-[10px] text-muted-foreground">Qty</Label>
                              <Input
                                type="number" min={1} {...f} className="text-xs h-8 text-center"
                                onChange={(e) => {
                                  f.onChange(e)
                                  recalcTax(idx, watchedItems?.[idx]?.taxGroup || "NONE", price, Number(e.target.value) || 1)
                                }}
                              />
                            </div>
                          )}
                        />
                        <Controller
                          control={control}
                          name={`lineItems.${idx}.unitPrice`}
                          render={({ field: f }) => (
                            <div className="space-y-0.5">
                              <Label className="text-[10px] text-muted-foreground">Unit Price (₹)</Label>
                              <Input
                                type="number" min={0} step="0.01" {...f} className="text-xs h-8 text-right"
                                onChange={(e) => {
                                  f.onChange(e)
                                  recalcTax(idx, watchedItems?.[idx]?.taxGroup || "NONE", Number(e.target.value) || 0, qty)
                                }}
                              />
                            </div>
                          )}
                        />
                        <Controller
                          control={control}
                          name={`lineItems.${idx}.taxGroup`}
                          render={({ field: f }) => (
                            <div className="space-y-0.5">
                              <Label className="text-[10px] text-muted-foreground">GST</Label>
                              <Select value={f.value || "NONE"} onValueChange={(val) => { f.onChange(val); recalcTax(idx, val, price, qty) }}>
                                <SelectTrigger className="text-xs h-8"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {TAX_GROUPS.map((t) => <SelectItem key={t.value} value={t.value} className="text-xs">{t.label}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* ── Fixed footer: Totals + actions ──────────────── */}
          <div className="border-t bg-muted/30 px-5 py-3 space-y-2">
            <div className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-0.5 text-xs">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="text-right tabular-nums">{inr(totals.sub)}</span>

              <span className="text-muted-foreground">Discount</span>
              <div className="flex items-center justify-end gap-1.5">
                <Controller
                  control={control}
                  name="discountPct"
                  render={({ field }) => (
                    <Input
                      type="number" min={0} max={100} step="0.1" {...field}
                      className="text-xs h-6 w-14 text-right px-1.5"
                    />
                  )}
                />
                <span className="text-[10px] text-muted-foreground">%</span>
                <span className="text-destructive tabular-nums ml-1">-{inr(totals.disc)}</span>
              </div>

              <span className="text-muted-foreground">Tax</span>
              <span className="text-right tabular-nums">{inr(totals.tax)}</span>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <span className="text-sm font-bold">Grand Total</span>
              <span className="text-base font-bold tabular-nums flex items-center gap-0.5">
                <IndianRupee className="size-3.5" />{inr(totals.total)}
              </span>
            </div>

            {/* Show form validation errors */}
            {Object.keys(errors).length > 0 && (
              <p className="text-[11px] text-destructive">
                {errors.lineItems?.message
                  || errors.paymentTerms?.message
                  || errors.validityDate?.message
                  || "Please fix the errors above"}
              </p>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" size="sm" disabled={isPending} className="gap-1.5">
                <FileText className="size-3.5" />
                {isPending ? "Creating..." : "Create Quotation"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Quotation List Card ─────────────────────────────────────────────
interface QuotationListProps {
  opportunityDocEntry: number
  customerCardCode: string
  customerName?: string
  customerPhone?: string
  meetingId?: number
}

export function QuotationListCard({ opportunityDocEntry, customerCardCode, customerName, customerPhone, meetingId }: QuotationListProps) {
  const { data: quotations, isLoading } = useLeadQuotations(opportunityDocEntry)

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <FileText className="size-4" />
            Quotations
          </CardTitle>
          <QuotationBuilder
            opportunityDocEntry={opportunityDocEntry}
            customerCardCode={customerCardCode}
            customerName={customerName}
            meetingId={meetingId}
          />
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-xs text-muted-foreground">Loading quotations...</p>
        ) : !quotations?.length ? (
          <p className="text-xs text-muted-foreground">No quotations yet. Create one to continue.</p>
        ) : (
          <div className="space-y-2">
            {quotations.map((q) => (
              <QuotationCard
                key={q.id}
                quotation={q}
                customerName={customerName}
                customerPhone={customerPhone}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function QuotationCard({
  quotation: q,
  customerName,
  customerPhone,
}: {
  quotation: QuotationRow
  customerName?: string
  customerPhone?: string
}) {
  const [showVersions, setShowVersions] = useState(false)
  const [phoneInput, setPhoneInput] = useState(customerPhone || "")
  const { data: versions } = useQuotationVersions(showVersions ? q.id : undefined)
  const { data: approvalData } = useApprovalStatus(q.status === "draft" ? q.id : undefined)
  const { mutateAsync: syncSap, isPending: syncing } = useSyncQuotationToSap(q.id)
  const { mutateAsync: sendWa, isPending: sending } = useSendQuotationWhatsapp(q.id)
  const { mutateAsync: retrySend, isPending: retrying } = useRetryQuotationSend(q.id)
  const { mutateAsync: previewPdf, isPending: previewing } = usePreviewQuotationPdf(q.id)
  const { mutateAsync: reqApproval, isPending: requesting } = useRequestApproval(q.id)

  const handlePreview = async () => {
    try {
      const r = await previewPdf()
      window.open(r.pdfUrl, "_blank", "noopener,noreferrer")
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to generate PDF preview")
    }
  }

  const statusColor: Record<string, string> = {
    draft: "bg-muted text-muted-foreground",
    sent: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    delivered: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
    read: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
    accepted: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    rejected: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    expired: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
    failed: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  }

  const handleRetry = async () => {
    if (!phoneInput.trim()) {
      toast.error("Enter a phone number to retry")
      return
    }
    try {
      const r = await retrySend({ phone: phoneInput.trim(), customerName })
      toast.success(r.dryRun ? "Quotation resent (dry-run)" : "Quotation resent via WhatsApp")
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Retry failed")
    }
  }

  const handleSendWhatsApp = async () => {
    if (!phoneInput.trim()) {
      toast.error("Enter a phone number to send")
      return
    }
    try {
      const r = await sendWa({ phone: phoneInput.trim(), customerName })
      toast.success(r.dryRun ? "Quotation sent (dry-run)" : "Quotation sent via WhatsApp")
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to send quotation")
    }
  }

  return (
    <div className="rounded-md border p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-medium truncate">{q.quote_number}</span>
          <Badge variant="outline" className="text-[10px]">v{q.version}</Badge>
          <Badge className={`text-[10px] ${statusColor[q.status] || ""}`}>{q.status}</Badge>
        </div>
        <span className="text-sm font-bold tabular-nums shrink-0">₹{Number(q.grand_total).toLocaleString("en-IN")}</span>
      </div>

      {/* Delivery tracking timestamps */}
      {q.status !== "draft" && (
        <div className="flex items-center gap-3 text-[11px]">
          {q.sent_at && (
            <span className="flex items-center gap-1 text-blue-600">
              <Send className="size-3" /> Sent {new Date(q.sent_at).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}
            </span>
          )}
          {q.delivered_at && (
            <span className="flex items-center gap-1 text-emerald-600">
              <CheckCircle2 className="size-3" /> Delivered {new Date(q.delivered_at).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}
            </span>
          )}
          {q.read_at && (
            <span className="flex items-center gap-1 text-amber-600">
              <Eye className="size-3" /> Read {new Date(q.read_at).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}
            </span>
          )}
        </div>
      )}

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span>Valid: {new Date(q.validity_date).toLocaleDateString("en-IN")}</span>
        <span>Terms: {q.payment_terms}</span>
        {q.sap_doc_entry && <span className="text-green-600">SAP #{q.sap_doc_entry}</span>}
        {q.pdf_url && <a href={q.pdf_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">PDF</a>}
      </div>

      {/* Failed delivery — show retry UI */}
      {q.status === "failed" && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-2.5 space-y-2">
          <div className="flex items-center gap-1.5">
            <AlertCircle className="size-3.5 text-destructive shrink-0" />
            <p className="text-[11px] font-medium text-destructive">
              WhatsApp delivery failed — the message was not delivered to the recipient
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="tel"
              placeholder="Phone (e.g. 919876543210)"
              value={phoneInput}
              onChange={(e) => setPhoneInput(e.target.value)}
              className="text-xs h-7 flex-1 max-w-48"
            />
            <Button
              size="sm"
              variant="destructive"
              className="text-xs h-7 gap-1"
              onClick={handleRetry}
              disabled={retrying}
            >
              <RefreshCw className={cn("size-3", retrying && "animate-spin")} />
              {retrying ? "Retrying..." : "Retry Send"}
            </Button>
          </div>
        </div>
      )}

      {/* Discount approval gate + WhatsApp send — only for draft quotes */}
      {q.status === "draft" && approvalData && approvalData.needsApproval && !approvalData.canSend && (
        <div className="rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-950 dark:border-amber-800 p-2.5 space-y-1.5">
          <p className="text-[11px] font-medium text-amber-800 dark:text-amber-200">
            Discount {approvalData.discountPct}% exceeds {approvalData.thresholdPct}% threshold — manager approval required
          </p>
          {approvalData.approval?.status === "pending" ? (
            <Badge className="bg-amber-100 text-amber-800 text-[10px]">Approval Pending</Badge>
          ) : approvalData.approval?.status === "rejected" ? (
            <Badge variant="destructive" className="text-[10px]">Approval Rejected{approvalData.approval.review_notes ? `: ${approvalData.approval.review_notes}` : ""}</Badge>
          ) : (
            <Button
              size="sm" variant="outline" className="text-xs h-7 gap-1"
              onClick={async () => {
                try { await reqApproval(); toast.success("Approval requested") }
                catch (err) { toast.error(err instanceof ApiError ? err.message : "Failed to request approval") }
              }}
              disabled={requesting}
            >
              {requesting ? "Requesting..." : "Request Manager Approval"}
            </Button>
          )}
        </div>
      )}
      {approvalData?.canSend && approvalData.needsApproval && (
        <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-[10px]">
          Discount Approved by {approvalData.approval?.reviewed_by}
        </Badge>
      )}
      {q.status === "draft" && (!approvalData?.needsApproval || approvalData?.canSend) && (
        <div className="flex items-center gap-2 pt-1">
          <Input
            type="tel"
            placeholder="Phone (e.g. 919876543210)"
            value={phoneInput}
            onChange={(e) => setPhoneInput(e.target.value)}
            className="text-xs h-7 flex-1 max-w-48"
          />
          <Button
            size="sm" className="text-xs h-7 gap-1 bg-green-600 hover:bg-green-700"
            onClick={handleSendWhatsApp}
            disabled={sending}
          >
            <Send className="size-3" /> {sending ? "Sending..." : "Send via WhatsApp"}
          </Button>
        </div>
      )}

      <div className="flex items-center gap-1.5 pt-1">
        <Button
          size="sm" variant="outline" className="text-xs h-7 gap-1"
          onClick={handlePreview}
          disabled={previewing}
        >
          <ExternalLink className={cn("size-3", previewing && "animate-pulse")} />
          {previewing ? "Generating..." : "Preview PDF"}
        </Button>
        {!q.sap_doc_entry && (
          <Button size="sm" variant="outline" className="text-xs h-7 gap-1" onClick={async () => {
            try { const r = await syncSap(); toast.success(`Synced to SAP (DocEntry: ${r.sapDocEntry})`) }
            catch (err) { toast.error(err instanceof ApiError ? err.message : "SAP sync failed") }
          }} disabled={syncing}>
            <Upload className="size-3" /> {syncing ? "Syncing..." : "Sync to SAP"}
          </Button>
        )}
        <Button size="sm" variant="ghost" className="text-xs h-7 gap-1" onClick={() => setShowVersions(!showVersions)}>
          <History className="size-3" /> Versions
        </Button>
      </div>
      {showVersions && versions && (
        <div className="pt-2 border-t space-y-1">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Version History</p>
          {versions.map((v) => (
            <div key={v.id} className="flex items-center justify-between text-xs">
              <span className={v.is_latest ? "font-medium" : "text-muted-foreground"}>v{v.version}{v.is_latest ? " (current)" : ""}</span>
              <span className="tabular-nums">₹{Number(v.grand_total).toLocaleString("en-IN")}</span>
              <span className="text-muted-foreground">{new Date(v.created_at).toLocaleDateString("en-IN")}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
