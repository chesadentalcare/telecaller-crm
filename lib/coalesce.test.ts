import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { createCoalescer } from "./coalesce"

// Guards F6: the SSE stream folds a burst of "conversation" events into ONE
// refresh so the app stops re-fetching itself repeatedly mid-action.
describe("createCoalescer", () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it("folds a burst of schedule() calls into a single fire", () => {
    const fn = vi.fn()
    const c = createCoalescer(fn, 500)
    c.schedule()
    c.schedule()
    c.schedule()
    c.schedule()
    c.schedule()
    expect(fn).not.toHaveBeenCalled()
    expect(c.pending).toBe(true)
    vi.advanceTimersByTime(500)
    expect(fn).toHaveBeenCalledTimes(1)
    expect(c.pending).toBe(false)
  })

  it("fires again for a fresh burst after the window", () => {
    const fn = vi.fn()
    const c = createCoalescer(fn, 500)
    c.schedule()
    vi.advanceTimersByTime(500)
    c.schedule()
    vi.advanceTimersByTime(500)
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it("cancel() prevents a pending fire (used on unmount)", () => {
    const fn = vi.fn()
    const c = createCoalescer(fn, 500)
    c.schedule()
    c.cancel()
    vi.advanceTimersByTime(1000)
    expect(fn).not.toHaveBeenCalled()
    expect(c.pending).toBe(false)
  })

  it("caps fires under continuous traffic (not one-per-event)", () => {
    const fn = vi.fn()
    const c = createCoalescer(fn, 500)
    // 10 events over 1s with a 500ms window -> ~2 fires, never 10.
    for (let i = 0; i < 10; i++) {
      c.schedule()
      vi.advanceTimersByTime(100)
    }
    expect(fn.mock.calls.length).toBeGreaterThanOrEqual(1)
    expect(fn.mock.calls.length).toBeLessThanOrEqual(2)
  })
})
