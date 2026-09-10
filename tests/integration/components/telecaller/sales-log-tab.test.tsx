import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderWithProviders, screen, waitFor } from "@/tests/helpers/render"
import { SalesLogTab, type SalesUpdateEntry } from "@/components/telecaller/sales-log-tab"

const addSalesUpdate = vi.hoisted(() => vi.fn())
const toastError = vi.hoisted(() => vi.fn())

vi.mock("@/hooks/use-lead-mutations", () => ({
  useAddSalesUpdate: () => ({ mutateAsync: addSalesUpdate, isPending: false }),
}))
vi.mock("sonner", () => ({ toast: { error: toastError, success: vi.fn() } }))

describe("<SalesLogTab>", () => {
  beforeEach(() => {
    addSalesUpdate.mockReset()
    addSalesUpdate.mockResolvedValue({})
    toastError.mockReset()
  })

  it("renders the composer with the rep name", () => {
    renderWithProviders(<SalesLogTab leadId="4200" salesName="Rakesh Kumar" />)
    expect(screen.getByText("Log a sales update")).toBeInTheDocument()
    expect(screen.getByText(/rep: Rakesh Kumar/)).toBeInTheDocument()
  })

  it("shows the empty-state when there is no history", () => {
    renderWithProviders(<SalesLogTab leadId="4200" updates={[]} />)
    expect(screen.getByText(/No sales updates yet/)).toBeInTheDocument()
  })

  it("blocks submission and toasts when notes are empty", async () => {
    const { user } = renderWithProviders(<SalesLogTab leadId="4200" />)
    await user.click(screen.getByRole("button", { name: /Log update/ }))
    expect(toastError).toHaveBeenCalledWith("Add a note on what the rep reported")
    expect(addSalesUpdate).not.toHaveBeenCalled()
  })

  it("submits the note via the mutation and clears the field", async () => {
    const { user } = renderWithProviders(<SalesLogTab leadId="4200" />)
    const notes = screen.getByPlaceholderText(/Called Sudhir/)
    await user.type(notes, "Visited the doctor today")
    await user.click(screen.getByRole("button", { name: /Log update/ }))

    await waitFor(() => {
      expect(addSalesUpdate).toHaveBeenCalledTimes(1)
    })
    expect(addSalesUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ notes: "Visited the doctor today" }),
    )
    await waitFor(() => {
      expect((notes as HTMLTextAreaElement).value).toBe("")
    })
  })

  it("toasts on a mutation failure", async () => {
    addSalesUpdate.mockRejectedValueOnce(new Error("boom"))
    const { user } = renderWithProviders(<SalesLogTab leadId="4200" />)
    await user.type(screen.getByPlaceholderText(/Called Sudhir/), "Some note")
    await user.click(screen.getByRole("button", { name: /Log update/ }))
    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith("Failed to log the sales update")
    })
  })

  it("renders the passed-in update history (label, amount, source, notes, author)", () => {
    const updates: SalesUpdateEntry[] = [
      {
        id: 1,
        event: "won",
        notes: "Order placed for 2 chairs",
        logged_by: "rakesh",
        source: "dashboard",
        logged_at: "2026-09-08T10:00:00.000Z",
        amount: 450000,
      },
    ]
    renderWithProviders(<SalesLogTab leadId="4200" updates={updates} />)
    expect(screen.getByText("Won — order placed")).toBeInTheDocument()
    expect(screen.getByText("₹4,50,000")).toBeInTheDocument()
    expect(screen.getByText("Sales app")).toBeInTheDocument()
    expect(screen.getByText("Order placed for 2 chairs")).toBeInTheDocument()
    expect(screen.getByText("by rakesh")).toBeInTheDocument()
  })

  it("sorts history with the newest update first", () => {
    const updates: SalesUpdateEntry[] = [
      {
        id: 1,
        event: "visited",
        notes: "Older update",
        logged_by: "a",
        source: "call",
        logged_at: "2026-09-01T10:00:00.000Z",
      },
      {
        id: 2,
        event: "won",
        notes: "Newer update",
        logged_by: "b",
        source: "dashboard",
        logged_at: "2026-09-08T10:00:00.000Z",
      },
    ]
    renderWithProviders(<SalesLogTab leadId="4200" updates={updates} />)
    const items = screen.getAllByRole("listitem")
    expect(items[0]).toHaveTextContent("Newer update")
    expect(items[1]).toHaveTextContent("Older update")
  })
})
