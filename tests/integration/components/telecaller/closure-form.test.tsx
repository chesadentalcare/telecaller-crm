import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderWithProviders, screen, waitFor } from "@/tests/helpers/render"
import { ClosureCard } from "@/components/telecaller/closure-form"
import type { ClosureRecordRow } from "@/lib/api/leads"

const useClosureRecord = vi.hoisted(() => vi.fn())

vi.mock("@/hooks/use-leads", () => ({
  useClosureRecord: (...args: unknown[]) => useClosureRecord(...args),
  useClosureOrderContext: () => ({ data: undefined, isLoading: false }),
  useLeadSapOrder: () => ({ data: undefined, isLoading: false }),
}))
vi.mock("@/hooks/use-lead-mutations", () => ({
  useCloseLead: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useLookupSapOrder: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useMarkWon: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))
vi.mock("@/lib/api-config", () => ({ API_BASE_URL: "https://api.example.com/api/telecaller" }))

const wonRecord: ClosureRecordRow = {
  id: 1,
  opportunity_doc_entry: 4200,
  outcome: "won",
  signed_quote_url: "/uploads/proofs/quote.pdf",
  advance_payment_proof_url: null,
  dispatch_date: "2026-10-01",
  installation_date: "2026-10-15",
  lost_reason: null,
  competitor_name: null,
  price_gap_range: null,
  reactivation_flag: 0,
  sap_order_doc_entry: 555,
  sap_order_source: "linked",
  sap_order_doc_num: 10234,
  closed_by: "neha",
  closed_at: "2026-09-08T10:00:00.000Z",
}

const lostRecord: ClosureRecordRow = {
  ...wonRecord,
  outcome: "lost",
  signed_quote_url: null,
  dispatch_date: null,
  installation_date: null,
  lost_reason: "competitor",
  competitor_name: "Confident",
  price_gap_range: "10-20%",
  reactivation_flag: 1,
  sap_order_doc_entry: null,
  sap_order_source: null,
  sap_order_doc_num: null,
}

describe("<ClosureCard>", () => {
  beforeEach(() => {
    useClosureRecord.mockReset()
  })

  it("renders nothing while the closure record is loading", () => {
    useClosureRecord.mockReturnValue({ data: undefined, isLoading: true })
    const { container } = renderWithProviders(<ClosureCard opportunityDocEntry={4200} />)
    expect(container).toBeEmptyDOMElement()
  })

  it("shows the Close Lead card when there is no closure record yet", () => {
    useClosureRecord.mockReturnValue({ data: null, isLoading: false })
    renderWithProviders(<ClosureCard opportunityDocEntry={4200} />)
    expect(screen.getByRole("button", { name: /Close Lead/ })).toBeInTheDocument()
    expect(screen.getByText(/cannot be undone/)).toBeInTheDocument()
  })

  it("opens the closure dialog when the Close Lead button is clicked", async () => {
    useClosureRecord.mockReturnValue({ data: null, isLoading: false })
    const { user } = renderWithProviders(<ClosureCard opportunityDocEntry={4200} />)
    await user.click(screen.getByRole("button", { name: /Close Lead/ }))
    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument()
    })
    expect(screen.getByText("Close Lead #4200")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /^WON$/ })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /^LOST$/ })).toBeInTheDocument()
  })

  it("renders a WON closure record with order and dispatch details", () => {
    useClosureRecord.mockReturnValue({ data: wonRecord, isLoading: false })
    renderWithProviders(<ClosureCard opportunityDocEntry={4200} />)
    expect(screen.getByText(/Closed — WON/)).toBeInTheDocument()
    expect(screen.getByText(/Closed by: neha/)).toBeInTheDocument()
    expect(screen.getByText(/SAP Sales Order #10234/)).toBeInTheDocument()
    expect(screen.getByText(/\(linked\)/)).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /View signed quotation/ })).toHaveAttribute(
      "href",
      "https://api.example.com/uploads/proofs/quote.pdf",
    )
  })

  it("renders a LOST closure record with reason, competitor, and reactivation", () => {
    useClosureRecord.mockReturnValue({ data: lostRecord, isLoading: false })
    renderWithProviders(<ClosureCard opportunityDocEntry={4200} />)
    expect(screen.getByText(/Closed — LOST/)).toBeInTheDocument()
    expect(screen.getByText(/competitor/)).toBeInTheDocument()
    expect(screen.getByText(/Confident/)).toBeInTheDocument()
    expect(screen.getByText(/reactivation funnel/i)).toBeInTheDocument()
  })
})
