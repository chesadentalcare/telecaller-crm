import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { renderHook, act } from "@testing-library/react"

import { useIsMobile } from "@/hooks/use-mobile"

type ChangeHandler = () => void

function stubMatchMedia(initialWidth: number) {
  const handlers = new Set<ChangeHandler>()
  Object.defineProperty(window, "innerWidth", {
    writable: true,
    configurable: true,
    value: initialWidth,
  })
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: (_: string, fn: ChangeHandler) => handlers.add(fn),
    removeEventListener: (_: string, fn: ChangeHandler) => handlers.delete(fn),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia
  return {
    resizeTo(width: number) {
      ;(window as unknown as { innerWidth: number }).innerWidth = width
      handlers.forEach((fn) => fn())
    },
    listenerCount: () => handlers.size,
  }
}

describe("useIsMobile", () => {
  const originalMatchMedia = window.matchMedia
  const originalInnerWidth = window.innerWidth

  beforeEach(() => vi.clearAllMocks())
  afterEach(() => {
    window.matchMedia = originalMatchMedia
    ;(window as unknown as { innerWidth: number }).innerWidth = originalInnerWidth
  })

  it("reports mobile when the viewport is under the 768px breakpoint", () => {
    stubMatchMedia(500)
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(true)
  })

  it("reports not-mobile at and above the breakpoint", () => {
    stubMatchMedia(1024)
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(false)
  })

  it("treats exactly 768px as desktop (breakpoint is exclusive)", () => {
    stubMatchMedia(768)
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(false)
  })

  it("updates when the media query change event fires", () => {
    const mql = stubMatchMedia(1200)
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(false)

    act(() => mql.resizeTo(400))
    expect(result.current).toBe(true)

    act(() => mql.resizeTo(900))
    expect(result.current).toBe(false)
  })

  it("removes its change listener on unmount", () => {
    const mql = stubMatchMedia(500)
    const { unmount } = renderHook(() => useIsMobile())
    expect(mql.listenerCount()).toBe(1)
    unmount()
    expect(mql.listenerCount()).toBe(0)
  })
})
