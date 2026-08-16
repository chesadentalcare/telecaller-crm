import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { PendingButton } from "./pending-button"

// Guards F5: the shared action button disables + shows a spinner while pending,
// so a rep can't fire a mutation twice.
describe("PendingButton", () => {
  it("disables and shows a spinner while pending", () => {
    const { container } = render(<PendingButton pending>Save</PendingButton>)
    expect(screen.getByRole("button")).toBeDisabled()
    expect(container.querySelector(".animate-spin")).toBeTruthy()
  })

  it("is enabled and spinner-free when idle", () => {
    const { container } = render(<PendingButton>Save</PendingButton>)
    expect(screen.getByRole("button")).toBeEnabled()
    expect(container.querySelector(".animate-spin")).toBeNull()
  })

  it("stays disabled when disabled even if not pending", () => {
    render(<PendingButton disabled>Save</PendingButton>)
    expect(screen.getByRole("button")).toBeDisabled()
  })
})
