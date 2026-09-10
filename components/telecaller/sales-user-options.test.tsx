import { describe, it, expect } from "vitest"
import { renderWithProviders, screen } from "@/test-utils/render"
import {
  Select,
  SelectContent,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { SalesUserOptions } from "./sales-user-options"
import { salesUsers } from "@/test-utils/fixtures"
import type { SalesUserRow } from "@/lib/api/leads"

function OpenSelect({
  salesUsers: users,
  loading,
}: {
  salesUsers: SalesUserRow[]
  loading?: boolean
}) {
  return (
    <Select open>
      <SelectTrigger>
        <SelectValue placeholder="Pick" />
      </SelectTrigger>
      <SelectContent>
        <SalesUserOptions salesUsers={users} loading={loading} />
      </SelectContent>
    </Select>
  )
}

describe("<SalesUserOptions>", () => {
  it("splits territory-matched reps under a 'Suggested' header", () => {
    renderWithProviders(<OpenSelect salesUsers={salesUsers} />)
    expect(screen.getByText("Suggested for this territory")).toBeInTheDocument()
    expect(screen.getByText("All sales employees")).toBeInTheDocument()
  })

  it("renders each rep's full name and formatted role", () => {
    renderWithProviders(<OpenSelect salesUsers={salesUsers} />)
    expect(screen.getByText("Rakesh Kumar")).toBeInTheDocument()
    expect(screen.getByText("Priya Menon")).toBeInTheDocument()
    expect(screen.getByText(/sale staff/)).toBeInTheDocument()
  })

  it("shows the match label for the suggested rep", () => {
    renderWithProviders(<OpenSelect salesUsers={salesUsers} />)
    expect(screen.getByText(/State match/)).toBeInTheDocument()
  })

  it("shows a 'no SAP code' warning for reps missing a sales_person_code", () => {
    const users: SalesUserRow[] = [
      { ...salesUsers[1], sales_person_code: null as unknown as number, match_tier: 0 },
    ]
    renderWithProviders(<OpenSelect salesUsers={users} />)
    expect(screen.getByText(/no SAP code/)).toBeInTheDocument()
  })

  it("renders an empty-state message when there are no salespeople and not loading", () => {
    renderWithProviders(<OpenSelect salesUsers={[]} loading={false} />)
    expect(screen.getByText("No active salespeople found")).toBeInTheDocument()
  })

  it("hides the empty-state message while loading", () => {
    renderWithProviders(<OpenSelect salesUsers={[]} loading />)
    expect(screen.queryByText("No active salespeople found")).not.toBeInTheDocument()
  })

  it("does not render a 'Suggested' header when no rep is territory-matched", () => {
    const users: SalesUserRow[] = salesUsers.map((u) => ({ ...u, match_tier: 0, match_label: null }))
    renderWithProviders(<OpenSelect salesUsers={users} />)
    expect(screen.queryByText("Suggested for this territory")).not.toBeInTheDocument()
    expect(screen.getByText("Rakesh Kumar")).toBeInTheDocument()
  })
})
