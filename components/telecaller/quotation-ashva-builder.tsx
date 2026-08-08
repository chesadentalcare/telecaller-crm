"use client"

import { useState, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import {
  FileText, FileSpreadsheet, Plus, Trash2, Package, Search,
  ChevronDown, Send, Loader2,
} from "lucide-react"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { useProductCatalogue, type CatalogueProduct } from "@/hooks/use-products"
import {
  quotationApi,
  type QuotationLine,
  type QuotationFormat,
} from "@/lib/api/quotation"

// ── Helpers ─────────────────────────────────────────────────────────
const INCLUDED = "Included"

const isIncluded = (v: number | string): boolean =>
  typeof v === "string" && v.trim().toLowerCase() === INCLUDED.toLowerCase()

const inr = (n: number) =>
  n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// Row total: "Included" when the unit price is Included, else price × qty.
function lineTotal(unitPrice: number | string, qty: number): number | string {
  if (isIncluded(unitPrice)) return INCLUDED
  const p = Number(unitPrice)
  if (!Number.isFinite(p)) return 0
  return p * (Number(qty) || 0)
}

// Totals: subtotal (gross, ignoring "Included" lines), per-line + overall discounts,
// and the resulting grand total. Mirrors the backend computeLines so the preview,
// PDF and Excel all agree.
function computeTotals(lines: EditableLine[], overallDiscount: number) {
  let subtotal = 0
  let lineDiscount = 0
  for (const l of lines) {
    if (isIncluded(l.unitPrice)) continue
    const p = Number(l.unitPrice)
    if (!Number.isFinite(p)) continue
    const gross = p * (Number(l.qty) || 0)
    subtotal += gross
    const d = Math.min(Math.max(Number(l.discountPct) || 0, 0), 100)
    lineDiscount += gross * (d / 100)
  }
  const overall = Math.min(Math.max(overallDiscount || 0, 0), Math.max(0, subtotal - lineDiscount))
  const discountTotal = lineDiscount + overall
  return { subtotal, discountTotal, grandTotal: Math.max(0, subtotal - discountTotal) }
}

// ── Amount in words (Indian numbering) — nice-to-have preview aid ────
const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
  "Seventeen", "Eighteen", "Nineteen",
]
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"]

function twoDigit(n: number): string {
  if (n < 20) return ONES[n]
  return `${TENS[Math.floor(n / 10)]}${n % 10 ? " " + ONES[n % 10] : ""}`
}

function amountInWords(amount: number): string {
  const num = Math.floor(amount)
  if (num === 0) return "Zero Rupees Only"
  const crore = Math.floor(num / 10000000)
  const lakh = Math.floor((num % 10000000) / 100000)
  const thousand = Math.floor((num % 100000) / 1000)
  const hundred = Math.floor((num % 1000) / 100)
  const rest = num % 100
  let out = ""
  if (crore) out += `${twoDigit(crore)} Crore `
  if (lakh) out += `${twoDigit(lakh)} Lakh `
  if (thousand) out += `${twoDigit(thousand)} Thousand `
  if (hundred) out += `${ONES[hundred]} Hundred `
  if (rest) out += `${out ? "and " : ""}${twoDigit(rest)} `
  return `${out.trim()} Rupees Only`
}

// ── Editable line-item shape (unit price stays a string while typing) ─
// Each row carries a STABLE id so React keys the inputs by row identity, not by
// array index — otherwise adding/removing rows makes a controlled input (the
// price) reject edits because the value prop snaps back to the wrong row.
let _lineSeq = 0
const nextLineId = () => `ln${++_lineSeq}`

interface EditableLine {
  id: string
  spec: string
  warranty: string
  qty: number
  unitPrice: number | string
  discountPct: string
}

const emptyLine = (): EditableLine => ({ id: nextLineId(), spec: "", warranty: "", qty: 1, unitPrice: "", discountPct: "" })

// Coerce editable lines → the backend line shape (numeric price unless "Included").
function toApiLines(lines: EditableLine[]): QuotationLine[] {
  return lines.map((l) => ({
    spec: l.spec,
    warranty: l.warranty,
    qty: Number(l.qty) || 0,
    unitPrice: isIncluded(l.unitPrice) ? INCLUDED : Number(l.unitPrice) || 0,
    discountPct: Math.min(Math.max(Number(l.discountPct) || 0, 0), 100),
  }))
}

// A sensible quotation-no suggestion: AHTL/2026-27/Q<random>.
function suggestQuotationNo(): string {
  const now = new Date()
  const y = now.getFullYear()
  // Indian FY runs Apr–Mar; before April the FY started the previous year.
  const fyStart = now.getMonth() >= 3 ? y : y - 1
  const fyEnd = String((fyStart + 1) % 100).padStart(2, "0")
  const seq = Math.floor(1000 + Math.random() * 9000)
  return `AHTL/${fyStart}-${fyEnd}/Q${seq}`
}

// ── Product search popover ──────────────────────────────────────────
function ProductPicker({ onPick }: { onPick: (product: CatalogueProduct) => void }) {
  const { data: products, isLoading } = useProductCatalogue()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")

  const filtered = useMemo(() => {
    if (!search) return products
    const q = search.toLowerCase()
    return products.filter((p) => p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q))
  }, [products, search])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8">
          <Plus className="size-3.5" /> Add product
          <ChevronDown className="size-3 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="flex items-center border-b px-2.5">
          <Search className="size-3.5 shrink-0 text-muted-foreground" />
          <input
            className="flex h-9 w-full bg-transparent px-2 text-xs outline-none placeholder:text-muted-foreground"
            placeholder="Search products by name or code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="max-h-72 overflow-y-auto p-1">
          {isLoading ? (
            <p className="px-2 py-4 text-center text-xs text-muted-foreground">Loading products...</p>
          ) : filtered.length === 0 ? (
            <p className="px-2 py-4 text-center text-xs text-muted-foreground">No products found</p>
          ) : (
            filtered.map((p, i) => (
              <button
                key={p.code || `${p.id}-${i}`}
                type="button"
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-xs hover:bg-accent"
                onClick={() => { onPick(p); setOpen(false); setSearch("") }}
              >
                <Package className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate">{p.name}</span>
                <span className="shrink-0 tabular-nums text-muted-foreground">{p.mrp > 0 ? `₹${inr(p.mrp)}` : "—"}</span>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

// ── Props ───────────────────────────────────────────────────────────
interface QuotationAshvaBuilderProps {
  /** Prefill the customer name. */
  customerName?: string
  /** Prefill contact (phone / email). */
  customerContact?: string
  /** Prefill the address. */
  customerAddress?: string
  /** Lead id — forwarded to the WhatsApp send endpoint when present. */
  leadId?: number | string
  trigger?: React.ReactNode
}

// ── Ashva Quotation Builder ─────────────────────────────────────────
export function QuotationAshvaBuilder({
  customerName, customerContact, customerAddress, leadId, trigger,
}: QuotationAshvaBuilderProps) {
  const [open, setOpen] = useState(false)

  // Customer fields.
  const [to, setTo] = useState(customerName ?? "")
  const [contact, setContact] = useState(customerContact ?? "")
  const [address, setAddress] = useState(customerAddress ?? "")
  const [quotationNo, setQuotationNo] = useState(suggestQuotationNo)
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [packageTitle, setPackageTitle] = useState("")

  // Line items + a selected package.
  const [lines, setLines] = useState<EditableLine[]>([emptyLine()])
  const [selectedPackage, setSelectedPackage] = useState("")
  const [overallDiscount, setOverallDiscount] = useState("")
  // Set when a send is blocked pending manager discount approval; holds the persisted
  // quotation id so a re-send after approval is let through.
  const [approval, setApproval] = useState<{ quotationId: number; discountPct?: number; thresholdPct?: number } | null>(null)

  // Downloading / sending flags (keyed so both buttons can show spinners).
  const [busy, setBusy] = useState<null | "pdf" | "xlsx" | "send">(null)

  const { data: packages = [], isLoading: packagesLoading } = useQuery({
    queryKey: ["quotation-packages"],
    queryFn: quotationApi.getPackages,
    enabled: open,
  })

  const { subtotal, discountTotal, grandTotal: total } = computeTotals(lines, Number(overallDiscount) || 0)

  // (a) Load a curated package's lines into the editable table.
  const handlePickPackage = (key: string) => {
    const pkg = packages.find((p) => p.key === key)
    if (!pkg) return
    setSelectedPackage(key)
    setPackageTitle(pkg.packageTitle)
    setLines(
      pkg.lines.map((l) => ({
        id: nextLineId(),
        spec: l.spec,
        warranty: l.warranty,
        qty: Number(l.qty) || 1,
        unitPrice: l.unitPrice,
        discountPct: "",
      })),
    )
  }

  // (b) Add a product row (name only — user fills warranty/qty/price).
  const handleAddProduct = (product: CatalogueProduct) => {
    setLines((prev) => {
      // Drop a single leading empty row so the first pick doesn't leave a blank line.
      const base = prev.length === 1 && !prev[0].spec && prev[0].unitPrice === "" ? [] : prev
      return [...base, {
        id: nextLineId(),
        spec: product.name,
        warranty: product.warranty || "1 Year",
        qty: 1,
        unitPrice: product.mrp > 0 ? product.mrp : "",
        discountPct: "",
      }]
    })
  }

  const addBlankRow = () => setLines((prev) => [...prev, emptyLine()])
  const removeRow = (idx: number) =>
    setLines((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev))
  const updateRow = (idx: number, patch: Partial<EditableLine>) =>
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)))

  const buildBody = () => ({
    to,
    contact,
    address,
    quotationNo,
    date,
    packageTitle,
    overallDiscount: Number(overallDiscount) || 0,
    lines: toApiLines(lines),
  })

  const validate = (): boolean => {
    if (!to.trim()) { toast.error("Enter the customer name (To)"); return false }
    if (!lines.some((l) => l.spec.trim())) { toast.error("Add at least one line item"); return false }
    return true
  }

  const triggerDownload = (blob: Blob, ext: string) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${(quotationNo || "quotation").replace(/[\\/:*?"<>|]/g, "-")}.${ext}`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  const handleDownload = async (format: QuotationFormat) => {
    if (!validate()) return
    setBusy(format)
    try {
      const blob = await quotationApi.generateDocument(format, buildBody())
      triggerDownload(blob, format === "pdf" ? "pdf" : "xlsx")
      toast.success(`${format.toUpperCase()} downloaded`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Failed to generate ${format.toUpperCase()}`)
    } finally {
      setBusy(null)
    }
  }

  const handleSend = async () => {
    if (!validate()) return
    setBusy("send")
    try {
      const r = await quotationApi.send("pdf", buildBody(), leadId, approval?.quotationId)
      if (r.sent) {
        toast.success("Quotation sent on WhatsApp")
        setApproval(null)
      } else if (r.needsApproval) {
        setApproval({ quotationId: r.quotationId!, discountPct: r.discountPct, thresholdPct: r.thresholdPct })
        toast.warning(r.message || `Discount ${r.discountPct}% needs manager approval (limit ${r.thresholdPct}%).`)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send quotation")
    } finally {
      setBusy(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" className="gap-1.5">
            <FileText className="size-4" /> Ashva Quotation
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-[95vw] 2xl:max-w-[1600px] max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden">
        <div className="px-5 pt-5 pb-3 border-b">
          <DialogHeader>
            <DialogTitle className="text-base">Ashva Quotation Builder</DialogTitle>
            <DialogDescription className="text-xs">
              Pick a package or add products, edit the lines, then download or send.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto grid lg:grid-cols-2 gap-0 divide-x">
          {/* ── Editor ───────────────────────────────────────────── */}
          <div className="p-5 space-y-4">
            {/* Customer fields */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1 col-span-2">
                <Label className="text-[11px] text-muted-foreground">To (name)</Label>
                <Input value={to} onChange={(e) => setTo(e.target.value)} className="h-9 text-xs" placeholder="Customer / clinic name" />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Contact (phone / email)</Label>
                <Input value={contact} onChange={(e) => setContact(e.target.value)} className="h-9 text-xs" placeholder="9876543210" />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Date</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-9 text-xs" />
              </div>
              <div className="space-y-1 col-span-2">
                <Label className="text-[11px] text-muted-foreground">Address</Label>
                <Textarea value={address} onChange={(e) => setAddress(e.target.value)} className="text-xs min-h-14" placeholder="Full billing / delivery address" />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Quotation No</Label>
                <Input value={quotationNo} onChange={(e) => setQuotationNo(e.target.value)} className="h-9 text-xs font-mono" />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Package (optional)</Label>
                <Select value={selectedPackage} onValueChange={handlePickPackage} disabled={packagesLoading}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder={packagesLoading ? "Loading..." : "Pick a package"} />
                  </SelectTrigger>
                  <SelectContent>
                    {packages.map((p) => (
                      <SelectItem key={p.key} value={p.key} className="text-xs">{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            {/* Line-item table */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Line Items</span>
                <div className="flex items-center gap-2">
                  <ProductPicker onPick={handleAddProduct} />
                  <Button type="button" size="sm" variant="outline" onClick={addBlankRow} className="gap-1 text-xs h-8">
                    <Plus className="size-3.5" /> Add row
                  </Button>
                </div>
              </div>

              <div className="rounded-lg border overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted/50 text-[10px] uppercase tracking-wider text-muted-foreground">
                      <th className="px-2 py-1.5 text-left w-8">#</th>
                      <th className="px-2 py-1.5 text-left">Item &amp; Specifications</th>
                      <th className="px-2 py-1.5 text-left w-20">Warranty</th>
                      <th className="px-2 py-1.5 text-center w-12">Qty</th>
                      <th className="px-2 py-1.5 text-right w-24">Unit Price</th>
                      <th className="px-2 py-1.5 text-center w-16">Disc %</th>
                      <th className="px-2 py-1.5 text-right w-24">Total</th>
                      <th className="px-2 py-1.5 w-8" />
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {lines.map((line, idx) => {
                      const lt = lineTotal(line.unitPrice, line.qty)
                      return (
                        <tr key={line.id} className="align-top">
                          <td className="px-2 py-1.5 text-muted-foreground tabular-nums">{idx + 1}</td>
                          <td className="px-1 py-1.5">
                            <Textarea
                              value={line.spec}
                              onChange={(e) => updateRow(idx, { spec: e.target.value })}
                              className="text-xs min-h-9 resize-y"
                              placeholder="Item name & specifications"
                            />
                          </td>
                          <td className="px-1 py-1.5">
                            <Input
                              value={line.warranty}
                              onChange={(e) => updateRow(idx, { warranty: e.target.value })}
                              className="h-8 text-xs"
                              placeholder="e.g. 1 Year"
                            />
                          </td>
                          <td className="px-1 py-1.5">
                            <Input
                              type="number"
                              min={0}
                              value={line.qty}
                              onChange={(e) => updateRow(idx, { qty: Number(e.target.value) })}
                              className="h-8 text-xs text-center"
                            />
                          </td>
                          <td className="px-1 py-1.5">
                            <Input
                              value={String(line.unitPrice)}
                              onChange={(e) => updateRow(idx, { unitPrice: e.target.value })}
                              className="h-8 text-xs text-right"
                              placeholder='0 or "Included"'
                            />
                          </td>
                          <td className="px-1 py-1.5">
                            <Input
                              type="number"
                              min={0}
                              max={100}
                              value={line.discountPct}
                              onChange={(e) => updateRow(idx, { discountPct: e.target.value })}
                              className="h-8 text-xs text-center"
                              placeholder="0"
                              disabled={isIncluded(line.unitPrice)}
                            />
                          </td>
                          <td className="px-2 py-1.5 text-right tabular-nums font-medium">
                            {isIncluded(lt) ? (
                              <span className="text-muted-foreground">Included</span>
                            ) : (
                              `₹${inr(Number(lt))}`
                            )}
                          </td>
                          <td className="px-1 py-1.5 text-center">
                            <Button
                              type="button" variant="ghost" size="sm"
                              className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                              onClick={() => removeRow(idx)}
                              disabled={lines.length <= 1}
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-end gap-2">
                  <Label className="text-[11px] text-muted-foreground">Overall discount (₹)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={overallDiscount}
                    onChange={(e) => setOverallDiscount(e.target.value)}
                    className="h-8 w-32 text-xs text-right"
                    placeholder="0"
                  />
                </div>
                {discountTotal > 0 && (
                  <>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Subtotal</span><span className="tabular-nums">₹{inr(subtotal)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-orange-600">
                      <span>Discount</span><span className="tabular-nums">−₹{inr(discountTotal)}</span>
                    </div>
                  </>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">Grand Total</span>
                  <span className="text-base font-bold tabular-nums">₹{inr(total)}</span>
                </div>
                <p className="text-[11px] text-muted-foreground text-right">{amountInWords(total)}</p>
              </div>
            </div>
          </div>

          {/* ── Live preview ─────────────────────────────────────── */}
          <div className="p-5 bg-muted/20">
            <div className="mx-auto max-w-3xl rounded-lg border bg-white text-black shadow-sm p-6 text-xs leading-relaxed">
              <div className="text-center border-b pb-3 mb-3">
                <h2 className="text-base font-bold tracking-wide">ASHVA HEALTH TECH LIMITED</h2>
                <p className="text-[10px] text-gray-600">Quotation</p>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-3">
                <div>
                  <p><span className="font-semibold">To:</span> {to || "—"}</p>
                  <p><span className="font-semibold">Contact:</span> {contact || "—"}</p>
                  <p className="whitespace-pre-wrap"><span className="font-semibold">Address:</span> {address || "—"}</p>
                </div>
                <div className="text-right">
                  <p><span className="font-semibold">Quotation No:</span> {quotationNo || "—"}</p>
                  <p><span className="font-semibold">Date:</span> {date || "—"}</p>
                  {packageTitle && <p><span className="font-semibold">Package:</span> {packageTitle}</p>}
                </div>
              </div>

              <table className="w-full border-collapse mb-3">
                <thead>
                  <tr className="bg-gray-100 text-[9px] uppercase">
                    <th className="border border-gray-300 px-1.5 py-1 text-left w-6">S.No</th>
                    <th className="border border-gray-300 px-1.5 py-1 text-left">Item &amp; Specifications</th>
                    <th className="border border-gray-300 px-1.5 py-1 text-left w-16">Warranty</th>
                    <th className="border border-gray-300 px-1.5 py-1 text-center w-8">Qty</th>
                    <th className="border border-gray-300 px-1.5 py-1 text-right w-16">Unit Price</th>
                    <th className="border border-gray-300 px-1.5 py-1 text-right w-16">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.filter((l) => l.spec.trim()).map((line, idx) => {
                    const lt = lineTotal(line.unitPrice, line.qty)
                    return (
                      <tr key={idx}>
                        <td className="border border-gray-300 px-1.5 py-1 align-top">{idx + 1}</td>
                        <td className="border border-gray-300 px-1.5 py-1 align-top whitespace-pre-wrap">{line.spec}</td>
                        <td className="border border-gray-300 px-1.5 py-1 align-top">{line.warranty || "—"}</td>
                        <td className="border border-gray-300 px-1.5 py-1 align-top text-center">{line.qty}</td>
                        <td className="border border-gray-300 px-1.5 py-1 align-top text-right">
                          {isIncluded(line.unitPrice) ? "Included" : `₹${inr(Number(line.unitPrice) || 0)}`}
                        </td>
                        <td className="border border-gray-300 px-1.5 py-1 align-top text-right">
                          {isIncluded(lt) ? "Included" : `₹${inr(Number(lt))}`}
                        </td>
                      </tr>
                    )
                  })}
                  {!lines.some((l) => l.spec.trim()) && (
                    <tr>
                      <td colSpan={6} className="border border-gray-300 px-1.5 py-3 text-center text-gray-400">
                        No line items yet
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  {discountTotal > 0 && (
                    <>
                      <tr>
                        <td colSpan={5} className="border border-gray-300 px-1.5 py-1 text-right">Subtotal</td>
                        <td className="border border-gray-300 px-1.5 py-1 text-right">₹{inr(subtotal)}</td>
                      </tr>
                      <tr className="text-orange-700">
                        <td colSpan={5} className="border border-gray-300 px-1.5 py-1 text-right">Discount</td>
                        <td className="border border-gray-300 px-1.5 py-1 text-right">−₹{inr(discountTotal)}</td>
                      </tr>
                    </>
                  )}
                  <tr className="font-bold bg-gray-50">
                    <td colSpan={5} className="border border-gray-300 px-1.5 py-1 text-right">TOTAL</td>
                    <td className="border border-gray-300 px-1.5 py-1 text-right">₹{inr(total)}</td>
                  </tr>
                </tfoot>
              </table>

              <p className="mb-3 text-[10px] italic text-gray-600">{amountInWords(total)}</p>

              <div className="text-[10px] text-gray-700 space-y-0.5 mb-3">
                <p className="font-semibold">Terms &amp; Conditions</p>
                <p>1. Prices are subject to change without prior notice.</p>
                <p>2. Taxes extra as applicable.</p>
                <p>3. Warranty as stated against each item.</p>
              </div>

              <div className="border-t pt-2 text-[10px] text-gray-600">
                <p className="font-semibold">Bank Details</p>
                <p>Ashva Health Tech Limited — A/C, IFSC &amp; branch as per invoice.</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Actions ──────────────────────────────────────────── */}
        <div className="border-t bg-muted/30 px-5 py-3 space-y-2">
          {approval && (
            <p className="text-[11px] font-medium text-amber-600">
              Discount {approval.discountPct}% is over the {approval.thresholdPct}% limit — waiting for manager approval.
              You will be notified; click Send on WhatsApp again once approved.
            </p>
          )}
          <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="outline" className="text-[10px]">Grand Total</Badge>
            <span className="font-bold tabular-nums text-foreground">₹{inr(total)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button" variant="outline" size="sm" className="gap-1.5"
              onClick={() => handleDownload("pdf")}
              disabled={busy !== null}
            >
              {busy === "pdf" ? <Loader2 className="size-3.5 animate-spin" /> : <FileText className="size-3.5" />}
              Download PDF
            </Button>
            <Button
              type="button" variant="outline" size="sm" className="gap-1.5"
              onClick={() => handleDownload("xlsx")}
              disabled={busy !== null}
            >
              {busy === "xlsx" ? <Loader2 className="size-3.5 animate-spin" /> : <FileSpreadsheet className="size-3.5" />}
              Download Excel
            </Button>
            <Button
              type="button" size="sm" className="gap-1.5 bg-green-600 hover:bg-green-700"
              onClick={handleSend}
              disabled={busy !== null}
            >
              {busy === "send" ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
              Send on WhatsApp
            </Button>
          </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
