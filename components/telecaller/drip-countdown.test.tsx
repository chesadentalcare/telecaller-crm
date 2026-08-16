import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, act } from "@testing-library/react"
import { Countdown, formatCountdown } from "./drip-countdown"

// Guards F2: the drip countdown is isolated and ticks itself, instead of the
// old setInterval that re-rendered the entire list every second.
describe("formatCountdown", () => {
  it("formats seconds / minutes / hours / days", () => {
    expect(formatCountdown(45)).toBe("45s")
    expect(formatCountdown(125)).toBe("2m")
    expect(formatCountdown(3600)).toBe("1h")
    expect(formatCountdown(90000)).toBe("1d 1h")
  })
})

describe("<Countdown>", () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it("renders the initial value and ticks down each second", () => {
    const { container } = render(<Countdown seconds={125} />)
    expect(container.textContent).toContain("2m")
    act(() => {
      vi.advanceTimersByTime(6000)
    })
    expect(container.textContent).toContain("1m")
  })

  it("stops at zero and never goes negative", () => {
    const { container } = render(<Countdown seconds={2} />)
    expect(container.textContent).toContain("2s")
    act(() => {
      vi.advanceTimersByTime(10000)
    })
    expect(container.textContent).toContain("0s")
    expect(container.textContent).not.toContain("-")
  })
})
