import { describe, it, expect } from "vitest"
import { render } from "@testing-library/react"
import { Separator } from "@/components/ui/separator"

describe("Separator", () => {
  it("renders horizontally by default and is decorative", () => {
    const { container } = render(<Separator />)
    const sep = container.querySelector('[data-slot="separator"]')
    expect(sep).toBeTruthy()
    expect(sep).toHaveAttribute("data-orientation", "horizontal")
  })

  it("renders with a vertical orientation when requested", () => {
    const { container } = render(<Separator orientation="vertical" />)
    const sep = container.querySelector('[data-slot="separator"]')
    expect(sep).toHaveAttribute("data-orientation", "vertical")
  })

  it("is decorative by default (role none, not a semantic separator)", () => {
    const { container } = render(<Separator />)
    const sep = container.querySelector('[data-slot="separator"]')
    expect(sep).not.toHaveAttribute("aria-orientation")
  })

  it("exposes the separator role when decorative is false", () => {
    const { container } = render(<Separator decorative={false} />)
    const sep = container.querySelector('[data-slot="separator"]')
    expect(sep).toHaveAttribute("role", "separator")
  })

  it("merges a caller className", () => {
    const { container } = render(<Separator className="my-4" />)
    const sep = container.querySelector('[data-slot="separator"]')
    expect(sep).toHaveClass("my-4")
    expect(sep).toHaveClass("bg-border")
  })
})
