import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderWithProviders, screen } from "@/tests/helpers/render"
import { QuickLeadEntry } from "@/components/telecaller/quick-lead-entry"

const quickCreate = vi.hoisted(() => vi.fn())

vi.mock("@/hooks/use-sap-states", () => ({
  useSapStates: () => ({ data: [{ code: "KA", name: "Karnataka" }], isLoading: false }),
}))
vi.mock("@/hooks/use-sap-sources", () => ({
  useSapSources: () => ({ data: [{ description: "Facebook" }, { description: "Google Ads" }] }),
}))
vi.mock("@/hooks/use-lead-mutations", () => ({
  useQuickCreateLead: () => ({ mutateAsync: quickCreate, isPending: false }),
}))
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const prefill = {
  leadName: "Dr. Asha Rao",
  phoneNumber: "9812345670",
  whatsappNumber: "9812345670",
  email: "asha@x.in",
  state: "Karnataka",
  city: "Bengaluru",
  source: "Facebook",
}

describe("<QuickLeadEntry> prefill from an intake row", () => {
  beforeEach(() => vi.clearAllMocks())

  it("seeds the lead-detail inputs from defaultValues", () => {
    renderWithProviders(<QuickLeadEntry intakeId={7} defaultValues={prefill} />)
    expect(screen.getByDisplayValue("Dr. Asha Rao")).toBeInTheDocument()
    expect(screen.getByDisplayValue("9812345670")).toBeInTheDocument()
    expect(screen.getByDisplayValue("Bengaluru")).toBeInTheDocument()
    expect(screen.getByDisplayValue("asha@x.in")).toBeInTheDocument()
  })

  it("keeps the WhatsApp = phone checkbox on when the two match (no separate field shown)", () => {
    renderWithProviders(<QuickLeadEntry intakeId={7} defaultValues={prefill} />)
    // whatsapp === phone -> the "same as phone" box stays ticked, so the number appears once.
    expect(screen.getAllByDisplayValue("9812345670")).toHaveLength(1)
  })

  it("renders empty inputs when no defaultValues are given", () => {
    renderWithProviders(<QuickLeadEntry />)
    expect(screen.queryByDisplayValue("Dr. Asha Rao")).not.toBeInTheDocument()
  })
})
