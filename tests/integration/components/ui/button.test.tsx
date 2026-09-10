import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { Button, buttonVariants } from "@/components/ui/button"

describe("Button", () => {
  it("renders a native button with its children and default variant/size", () => {
    render(<Button>Save</Button>)
    const btn = screen.getByRole("button", { name: "Save" })
    expect(btn.tagName).toBe("BUTTON")
    expect(btn).toHaveAttribute("data-slot", "button")
    expect(btn).toHaveClass("bg-primary")
    expect(btn).toHaveClass("h-9")
  })

  it("applies destructive variant classes", () => {
    render(<Button variant="destructive">Delete</Button>)
    expect(screen.getByRole("button", { name: "Delete" })).toHaveClass(
      "bg-destructive",
    )
  })

  it("applies outline and ghost variants", () => {
    const { rerender } = render(<Button variant="outline">Edit</Button>)
    expect(screen.getByRole("button")).toHaveClass("border")
    rerender(<Button variant="ghost">Edit</Button>)
    expect(screen.getByRole("button").className).toContain("hover:bg-accent")
  })

  it("applies sm and lg sizes", () => {
    const { rerender } = render(<Button size="sm">S</Button>)
    expect(screen.getByRole("button")).toHaveClass("h-8")
    rerender(<Button size="lg">L</Button>)
    expect(screen.getByRole("button")).toHaveClass("h-10")
  })

  it("applies icon size", () => {
    render(<Button size="icon" aria-label="star">*</Button>)
    expect(screen.getByRole("button", { name: "star" })).toHaveClass("size-9")
  })

  it("merges a caller className with the variant classes", () => {
    render(<Button className="custom-x">Go</Button>)
    const btn = screen.getByRole("button")
    expect(btn).toHaveClass("custom-x")
    expect(btn).toHaveClass("bg-primary")
  })

  it("renders as a child element when asChild is set", () => {
    render(
      <Button asChild variant="link">
        <a href="/leads">Leads</a>
      </Button>,
    )
    const link = screen.getByRole("link", { name: "Leads" })
    expect(link.tagName).toBe("A")
    expect(link).toHaveAttribute("href", "/leads")
    expect(link).toHaveAttribute("data-slot", "button")
    expect(link).toHaveClass("text-primary")
    expect(screen.queryByRole("button")).toBeNull()
  })

  it("fires onClick when clicked", async () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Click</Button>)
    await userEvent.click(screen.getByRole("button"))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it("does not fire onClick when disabled", async () => {
    const onClick = vi.fn()
    render(
      <Button disabled onClick={onClick}>
        Click
      </Button>,
    )
    const btn = screen.getByRole("button")
    expect(btn).toBeDisabled()
    await userEvent.click(btn)
    expect(onClick).not.toHaveBeenCalled()
  })

  it("forwards arbitrary props like type", () => {
    render(<Button type="submit">Submit</Button>)
    expect(screen.getByRole("button")).toHaveAttribute("type", "submit")
  })

  it("exposes buttonVariants that produces variant classes", () => {
    const cls = buttonVariants({ variant: "secondary", size: "lg" })
    expect(cls).toContain("bg-secondary")
    expect(cls).toContain("h-10")
  })
})
