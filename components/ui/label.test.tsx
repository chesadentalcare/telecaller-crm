import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { Label } from "./label"
import { Input } from "./input"

describe("Label", () => {
  it("renders its text content with the data-slot marker", () => {
    render(<Label>Email</Label>)
    const label = screen.getByText("Email")
    expect(label).toHaveAttribute("data-slot", "label")
  })

  it("associates with an input via htmlFor", () => {
    render(
      <>
        <Label htmlFor="phone">Phone</Label>
        <Input id="phone" />
      </>,
    )
    expect(screen.getByLabelText("Phone")).toHaveAttribute("id", "phone")
  })

  it("merges a caller className with the base classes", () => {
    render(<Label className="text-red-500">Name</Label>)
    const label = screen.getByText("Name")
    expect(label).toHaveClass("text-red-500")
    expect(label).toHaveClass("font-medium")
  })
})
