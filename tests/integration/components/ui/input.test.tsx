import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { Input } from "@/components/ui/input"

describe("Input", () => {
  it("renders a textbox with the data-slot marker", () => {
    render(<Input placeholder="Search leads" />)
    const input = screen.getByPlaceholderText("Search leads")
    expect(input.tagName).toBe("INPUT")
    expect(input).toHaveAttribute("data-slot", "input")
  })

  it("forwards the type attribute", () => {
    render(<Input type="email" aria-label="email" />)
    expect(screen.getByLabelText("email")).toHaveAttribute("type", "email")
  })

  it("accepts typed input and calls onChange", async () => {
    const onChange = vi.fn()
    render(<Input aria-label="name" onChange={onChange} />)
    const input = screen.getByLabelText("name")
    await userEvent.type(input, "Neha")
    expect((input as HTMLInputElement).value).toBe("Neha")
    expect(onChange).toHaveBeenCalled()
  })

  it("does not accept input when disabled", async () => {
    render(<Input aria-label="disabled-field" disabled />)
    const input = screen.getByLabelText("disabled-field")
    expect(input).toBeDisabled()
    await userEvent.type(input, "x")
    expect((input as HTMLInputElement).value).toBe("")
  })

  it("merges a caller className with the base classes", () => {
    render(<Input aria-label="styled" className="border-red-500" />)
    const input = screen.getByLabelText("styled")
    expect(input).toHaveClass("border-red-500")
    expect(input).toHaveClass("w-full")
  })

  it("reflects a controlled value", () => {
    render(<Input aria-label="controlled" value="fixed" readOnly />)
    expect((screen.getByLabelText("controlled") as HTMLInputElement).value).toBe(
      "fixed",
    )
  })
})
