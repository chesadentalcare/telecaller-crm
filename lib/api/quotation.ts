// Ashva quotation builder API — packages + document generation + WhatsApp send.
//
// The document endpoint returns a BINARY file (PDF / xlsx), so it can't go
// through lib/api/client.ts (which parses every response as JSON/text). We use
// a raw fetch here and attach the same Bearer token the client injects, then
// read the response as a Blob.

import { api } from "./client"
import { apiUrl, endpoints } from "@/lib/api-config"
import { tokenStorage } from "@/lib/auth/token"

// ─── Shared envelope (same as lib/api/leads.ts) ─────────────────────────
interface Envelope<T> {
  success: boolean
  message?: string
  data: T
}

// A line item as the backend expects it in the document body / package payload.
export interface QuotationLine {
  spec: string
  warranty: string
  qty: number
  // A rupee amount, or the literal string "Included".
  unitPrice: number | string
  // Per-line discount as a percentage (0–100). Optional; defaults to 0.
  discountPct?: number
}

export interface QuotationPackage {
  key: string
  label: string
  packageTitle: string
  lines: QuotationLine[]
}

// Body accepted by POST /quotation/document and /quotation/send.
export interface QuotationDocumentInput {
  to: string
  contact: string
  address: string
  quotationNo: string
  date: string
  packageTitle: string
  // Flat rupee discount applied to the subtotal (after per-line discounts).
  overallDiscount?: number
  lines: QuotationLine[]
}

export type QuotationFormat = "pdf" | "xlsx"

// Result of a send attempt. `needsApproval` = the discount exceeds the limit and a
// manager approval request was raised (or is still pending); the caller keeps the
// returned quotationId and re-sends once approved.
export interface QuotationSendResult {
  sent: boolean
  needsApproval?: boolean
  pending?: boolean
  quotationId?: number
  approvalId?: number
  discountPct?: number
  thresholdPct?: number
  message?: string
}

export const quotationApi = {
  // Curated Ashva packages (jwala / ninja / vayu / o2).
  getPackages: () =>
    api
      .get<Envelope<QuotationPackage[]>>(endpoints.quotationPackages)
      .then((res) => res.data),

  // Generate the quote as a downloadable file. Returns the raw Blob so the
  // caller can create an object URL and trigger a browser download.
  generateDocument: async (
    format: QuotationFormat,
    body: QuotationDocumentInput,
  ): Promise<Blob> => {
    const token = tokenStorage.get()
    const res = await fetch(
      `${apiUrl(endpoints.quotationDocument)}?format=${format}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      },
    )
    if (!res.ok) {
      // The error body is JSON even though the success body is binary.
      const msg = await res
        .json()
        .then((j: { message?: string }) => j?.message)
        .catch(() => null)
      throw new Error(msg || `Quotation document failed: ${res.status}`)
    }
    return res.blob()
  },

  // Send the generated quote on WhatsApp. Raw fetch (not lib/api/client) so we can
  // read the 409 discount-approval payload instead of just throwing. Pass quotationId
  // on a re-send after approval so the backend lets it through.
  send: async (
    format: QuotationFormat,
    body: QuotationDocumentInput,
    leadId?: number | string,
    quotationId?: number,
    recipient?: "customer" | "sales",
  ): Promise<QuotationSendResult> => {
    const token = tokenStorage.get()
    const res = await fetch(apiUrl(endpoints.quotationSend), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        ...body,
        format,
        ...(leadId != null ? { leadId } : {}),
        ...(quotationId != null ? { quotationId } : {}),
        ...(recipient ? { recipient } : {}),
      }),
    })
    const json = (await res.json().catch(() => ({}))) as {
      code?: string; message?: string; quotationId?: number; approvalId?: number
      discountPct?: number; thresholdPct?: number
    }
    if (res.ok) return { sent: true, message: json.message }
    if (res.status === 409 && (json.code === "DISCOUNT_APPROVAL_REQUIRED" || json.code === "DISCOUNT_APPROVAL_PENDING")) {
      return {
        sent: false, needsApproval: true, pending: json.code === "DISCOUNT_APPROVAL_PENDING",
        quotationId: json.quotationId, approvalId: json.approvalId,
        discountPct: json.discountPct, thresholdPct: json.thresholdPct, message: json.message,
      }
    }
    throw new Error(json.message || `Failed to send quotation: ${res.status}`)
  },
}

// ─── Catalogue / brochure ────────────────────────────────────────────────
// The approved Ashva catalogue is a single hosted PDF sent via an approved
// WhatsApp template (same one the drip uses), so it delivers at any stage.

export interface CatalogueInfo {
  url: string
  filename: string
  label: string
}

export interface CatalogueSendResult {
  messageId: string | null
  dryRun: boolean
  url: string
}

export const catalogueApi = {
  // Hosted PDF metadata — used to render the "Preview PDF" link before sending.
  info: () =>
    api
      .get<Envelope<CatalogueInfo>>(endpoints.catalogueInfo)
      .then((res) => res.data),

  // Send the approved catalogue to the lead's WhatsApp number.
  send: (leadId: string | number): Promise<CatalogueSendResult> =>
    api
      .post<{ success?: boolean; dryRun?: boolean; messageId?: string | null; url?: string }>(
        endpoints.catalogueSend(String(leadId)),
      )
      .then((res) => ({
        messageId: res?.messageId ?? null,
        dryRun: !!res?.dryRun,
        url: res?.url ?? "",
      })),
}
