import { describe, it, expect } from "vitest"
import { renderWithProviders } from "@/test-utils/render"
import { ViewSkeleton } from "./view-skeleton"

describe("<ViewSkeleton>", () => {
  it("renders four placeholder rows plus the header block", () => {
    const { container } = renderWithProviders(<ViewSkeleton />)
    const rows = container.querySelectorAll(".divide-y > div")
    expect(rows).toHaveLength(4)
  })

  it("renders skeleton placeholder elements", () => {
    const { container } = renderWithProviders(<ViewSkeleton />)
    const skeletons = container.querySelectorAll('[class*="animate-pulse"]')
    expect(skeletons.length).toBeGreaterThan(0)
  })
})
