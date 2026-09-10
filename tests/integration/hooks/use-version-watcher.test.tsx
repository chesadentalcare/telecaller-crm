import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { renderHook, act } from "@testing-library/react"

function jsonResponse(body: unknown, ok = true): Response {
  return { ok, json: async () => body } as unknown as Response
}

async function loadWatcher() {
  vi.resetModules()
  return import("@/hooks/use-version-watcher")
}

describe("useVersionWatcher", () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal("fetch", fetchMock)
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it("records the running version on the first successful poll without flagging an update", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ version: 42, buildAt: "2026-09-10T00:00:00Z" }))
    const { useVersionWatcher } = await loadWatcher()

    const { result } = renderHook(() => useVersionWatcher())
    expect(result.current.updateAvailable).toBe(false)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1)
    })

    expect(result.current.runningVersion).toBe(42)
    expect(result.current.updateAvailable).toBe(false)
    expect(result.current.runningBuildAt).toBe("2026-09-10T00:00:00Z")
  })

  it("flags updateAvailable when a later poll reports a new build number", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ version: 1 }))
      .mockResolvedValue(jsonResponse({ version: 2 }))
    const { useVersionWatcher } = await loadWatcher()

    const { result } = renderHook(() => useVersionWatcher())

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1)
    })
    expect(result.current.runningVersion).toBe(1)
    expect(result.current.updateAvailable).toBe(false)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2 * 60 * 1000)
    })
    expect(result.current.updateAvailable).toBe(true)
    expect(result.current.runningVersion).toBe(1)
  })

  it("ignores a failed fetch (dev has no version.json)", async () => {
    fetchMock.mockRejectedValue(new Error("network"))
    const { useVersionWatcher } = await loadWatcher()

    const { result } = renderHook(() => useVersionWatcher())
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })

    expect(result.current.updateAvailable).toBe(false)
    expect(result.current.runningVersion).toBeNull()
  })

  it("ignores a non-ok response", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ version: 5 }, false))
    const { useVersionWatcher } = await loadWatcher()

    const { result } = renderHook(() => useVersionWatcher())
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })

    expect(result.current.runningVersion).toBeNull()
  })

  it("ignores a payload with no version field", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ buildAt: "x" }))
    const { useVersionWatcher } = await loadWatcher()

    const { result } = renderHook(() => useVersionWatcher())
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })

    expect(result.current.runningVersion).toBeNull()
    expect(result.current.updateAvailable).toBe(false)
  })

  it("shares one poll loop across subscribers (module singleton)", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ version: 7 }))
    const { useVersionWatcher } = await loadWatcher()

    renderHook(() => useVersionWatcher())
    renderHook(() => useVersionWatcher())

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it("forceUpdateReload clears caches and reloads the window", async () => {
    const { forceUpdateReload } = await loadWatcher()

    const reload = vi.fn()
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...window.location, reload },
    })
    const del = vi.fn().mockResolvedValue(true)
    vi.stubGlobal("caches", {
      keys: vi.fn().mockResolvedValue(["v1", "v2"]),
      delete: del,
    })

    await forceUpdateReload()

    expect(del).toHaveBeenCalledTimes(2)
    expect(reload).toHaveBeenCalledTimes(1)
  })
})
