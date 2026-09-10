import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { Badge, badgeVariants } from "./badge"

describe("Badge", () => {
  it("renders a span with its children and default variant", () => {
    render(<Badge>New</Badge>)
    const badge = screen.getByText("New")
    expect(badge.tagName).toBe("SPAN")
    expect(badge).toHaveAttribute("data-slot", "badge")
    expect(badge).toHaveClass("bg-primary")
  })

  it("applies the secondary variant", () => {
    render(<Badge variant="secondary">Draft</Badge>)
    expect(screen.getByText("Draft")).toHaveClass("bg-secondary")
  })

  it("applies the destructive variant", () => {
    render(<Badge variant="destructive">Lost</Badge>)
    expect(screen.getByText("Lost")).toHaveClass("bg-destructive")
  })

  it("applies the outline variant", () => {
    render(<Badge variant="outline">Open</Badge>)
    expect(screen.getByText("Open")).toHaveClass("text-foreground")
  })

  it("merges a caller className", () => {
    render(<Badge className="ml-2">Tag</Badge>)
    const badge = screen.getByText("Tag")
    expect(badge).toHaveClass("ml-2")
    expect(badge).toHaveClass("bg-primary")
  })

  it("renders as a child element when asChild is set", () => {
    render(
      <Badge asChild>
        <a href="/x">Link badge</a>
      </Badge>,
    )
    const link = screen.getByRole("link", { name: "Link badge" })
    expect(link.tagName).toBe("A")
    expect(link).toHaveAttribute("data-slot", "badge")
  })

  it("exposes badgeVariants that produces variant classes", () => {
    expect(badgeVariants({ variant: "secondary" })).toContain("bg-secondary")
    expect(badgeVariants()).toContain("bg-primary")
  })
})
