import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { Switch } from "@/components/ui/switch"

describe("Switch", () => {
  it("renders a switch role that is unchecked by default", () => {
    render(<Switch aria-label="notifications" />)
    const sw = screen.getByRole("switch", { name: "notifications" })
    expect(sw).toHaveAttribute("data-slot", "switch")
    expect(sw).toHaveAttribute("data-state", "unchecked")
    expect(sw).not.toBeChecked()
  })

  it("reflects a controlled checked state", () => {
    render(<Switch aria-label="on" checked readOnly />)
    const sw = screen.getByRole("switch", { name: "on" })
    expect(sw).toHaveAttribute("data-state", "checked")
    expect(sw).toBeChecked()
  })

  it("toggles and calls onCheckedChange when clicked", async () => {
    const onCheckedChange = vi.fn()
    render(<Switch aria-label="toggle" onCheckedChange={onCheckedChange} />)
    const sw = screen.getByRole("switch", { name: "toggle" })
    await userEvent.click(sw)
    expect(onCheckedChange).toHaveBeenCalledWith(true)
    expect(sw).toHaveAttribute("data-state", "checked")
  })

  it("does not toggle when disabled", async () => {
    const onCheckedChange = vi.fn()
    render(
      <Switch aria-label="locked" disabled onCheckedChange={onCheckedChange} />,
    )
    const sw = screen.getByRole("switch", { name: "locked" })
    expect(sw).toBeDisabled()
    await userEvent.click(sw)
    expect(onCheckedChange).not.toHaveBeenCalled()
  })

  it("merges a caller className", () => {
    render(<Switch aria-label="styled" className="ml-2" />)
    const sw = screen.getByRole("switch", { name: "styled" })
    expect(sw).toHaveClass("ml-2")
    expect(sw).toHaveClass("peer")
  })
})
