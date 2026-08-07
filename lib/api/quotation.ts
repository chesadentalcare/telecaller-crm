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
  lines: QuotationLine[]
}

export type QuotationFormat = "pdf" | "xlsx"

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

  // Send the generated quote on WhatsApp. Contract owned by another agent —
  // we POST the same document body plus the format and (optional) lead id.
  // TODO: confirm the exact request shape / response once that endpoint lands.
  send: (
    format: QuotationFormat,
    body: QuotationDocumentInput,
    leadId?: number | string,
  ) =>
    api
      .post<Envelope<unknown>>(endpoints.quotationSend, {
        ...body,
        format,
        ...(leadId != null ? { leadId } : {}),
      })
      .then((res) => res.data),
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
  send: (leadId: string | number) =>
    api
      .post<Envelope<CatalogueSendResult>>(endpoints.catalogueSend(String(leadId)))
      .then((res) => res.data),
}
