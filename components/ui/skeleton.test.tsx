import { describe, it, expect } from "vitest"
import { render } from "@testing-library/react"
import { Skeleton } from "./skeleton"

describe("Skeleton", () => {
  it("renders a div with the animate-pulse placeholder classes", () => {
    const { container } = render(<Skeleton />)
    const el = container.querySelector('[data-slot="skeleton"]')
    expect(el).toBeTruthy()
    expect(el?.tagName).toBe("DIV")
    expect(el).toHaveClass("animate-pulse")
    expect(el).toHaveClass("rounded-md")
  })

  it("merges a caller className (sizing)", () => {
    const { container } = render(<Skeleton className="h-4 w-24" />)
    const el = container.querySelector('[data-slot="skeleton"]')
    expect(el).toHaveClass("h-4")
    expect(el).toHaveClass("w-24")
    expect(el).toHaveClass("animate-pulse")
  })

  it("forwards arbitrary props such as data attributes", () => {
    const { container } = render(<Skeleton data-testid="loading-row" />)
    expect(container.querySelector('[data-testid="loading-row"]')).toBeTruthy()
  })
})
