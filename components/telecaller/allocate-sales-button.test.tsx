import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderWithProviders, screen, waitFor } from "@/test-utils/render"
import { AllocateSalesButton } from "./allocate-sales-button"
import { salesUsers } from "@/test-utils/fixtures"

const useSalesUsers = vi.hoisted(() => vi.fn())
const allocate = vi.hoisted(() => vi.fn())

vi.mock("@/hooks/use-leads", () => ({
  useSalesUsers: (...args: unknown[]) => useSalesUsers(...args),
}))
vi.mock("@/hooks/use-lead-mutations", () => ({
  useAllocateSales: () => ({ mutateAsync: allocate, isPending: false }),
}))

describe("<AllocateSalesButton>", () => {
  beforeEach(() => {
    useSalesUsers.mockReset()
    useSalesUsers.mockReturnValue({ data: salesUsers, isLoading: false })
    allocate.mockReset()
    allocate.mockResolvedValue({ salesPersonName: "Rakesh Kumar", sapSynced: true })
  })

  it("labels the button 'Allocate' when no rep is assigned", () => {
    renderWithProviders(<AllocateSalesButton leadId="4200" />)
    expect(screen.getByRole("button", { name: "Allocate" })).toBeInTheDocument()
  })

  it("reflects the assigned rep name in the button label", () => {
    renderWithProviders(<AllocateSalesButton leadId="4200" assignedName="Rakesh Kumar" />)
    expect(screen.getByRole("button", { name: /Sales: Rakesh Kumar/ })).toBeInTheDocument()
  })

  it("opens the Re-allocate dialog when the button is clicked", async () => {
    const { user } = renderWithProviders(
      <AllocateSalesButton leadId="4200" assignedName="Rakesh Kumar" />,
    )
    await user.click(screen.getByRole("button", { name: /Sales: Rakesh Kumar/ }))
    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument()
    })
    expect(screen.getByText("Re-allocate to sales")).toBeInTheDocument()
    expect(screen.getByText(/Currently:/)).toBeInTheDocument()
  })

  it("opens the Allocate dialog title when unassigned", async () => {
    const { user } = renderWithProviders(<AllocateSalesButton leadId="4200" />)
    await user.click(screen.getByRole("button", { name: "Allocate" }))
    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument()
    })
    expect(screen.getByText("Allocate to sales")).toBeInTheDocument()
  })
})
