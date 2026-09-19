import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderWithProviders, screen } from "@/tests/helpers/render"
import { LostView } from "@/components/telecaller/lost-view"
import type { LostLead } from "@/lib/types/lead"
import type { LostSapCheckMap } from "@/lib/api/leads"

const useLostLeads = vi.hoisted(() => vi.fn())
const useLostSapCheck = vi.hoisted(() => vi.fn())

vi.mock("@/hooks/use-leads", () => ({
  useLostLeads: () => useLostLeads(),
  useLostSapCheck: (...a: unknown[]) => useLostSapCheck(...a),
}))
// Stub the row so the test asserts the meta (employee chip + SAP badge) the view builds.
vi.mock("@/components/telecaller/lead-queue-row", () => ({
  LeadQueueRow: (p: { id: string; name: string; meta?: React.ReactNode }) => (
    <div data-testid="row" data-id={p.id}>
      <span>{p.name}</span>
      <div>{p.meta}</div>
    </div>
  ),
}))

const lead = (id: string, salesEmployee?: string | null): LostLead =>
  ({ id, name: `Dr ${id}`, phone: "9", equipment: "chair", reason: "already purchased", salesEmployee } as unknown as LostLead)

const leads = [lead("1", "Sudhir Pujar"), lead("2", "Sudhir Pujar"), lead("3", "Sadul Singh")]
const sapMap: LostSapCheckMap = {
  "1": { sapStatus: "lost", sapStatusRaw: "sos_Missed", sapSalesPerson: 6 },
  "2": { sapStatus: "won", sapStatusRaw: "sos_Sold", sapSalesPerson: 6 },
  "3": { sapStatus: "lost", sapStatusRaw: "sos_Missed", sapSalesPerson: 14 },
}

describe("<LostView>", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useLostSapCheck.mockReturnValue({ data: sapMap, isFetching: false, refetch: vi.fn() })
  })

  it("renders a per-sales-employee card with lost counts", () => {
    useLostLeads.mockReturnValue({ data: leads, isLoading: false })
    renderWithProviders(<LostView />)
    expect(screen.getByRole("button", { name: /Sudhir Pujar · 2/ })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Sadul Singh · 1/ })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /All · 3/ })).toBeInTheDocument()
  })

  it("flags SAP mismatches in the header and on the row", () => {
    useLostLeads.mockReturnValue({ data: leads, isLoading: false })
    renderWithProviders(<LostView />)
    expect(screen.getByText(/1 not Lost in SAP/i)).toBeInTheDocument()
    expect(screen.getByText(/SAP: WON — not lost!/)).toBeInTheDocument()
  })

  it("clicking an employee card filters the list to that employee", async () => {
    useLostLeads.mockReturnValue({ data: leads, isLoading: false })
    const { user } = renderWithProviders(<LostView />)
    expect(screen.getAllByTestId("row")).toHaveLength(3)
    await user.click(screen.getByRole("button", { name: /Sadul Singh · 1/ }))
    const rows = screen.getAllByTestId("row")
    expect(rows).toHaveLength(1)
    expect(rows[0]).toHaveAttribute("data-id", "3")
  })

  it("shows the empty state when there are no lost leads", () => {
    useLostLeads.mockReturnValue({ data: [], isLoading: false })
    useLostSapCheck.mockReturnValue({ data: undefined, isFetching: false, refetch: vi.fn() })
    renderWithProviders(<LostView />)
    expect(screen.getByText(/No lost leads/i)).toBeInTheDocument()
  })
})
