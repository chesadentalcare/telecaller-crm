import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { QueryClientProvider } from "@tanstack/react-query"
import React from "react"

import { makeTestQueryClient } from "@/tests/helpers/render"

const getToken = vi.hoisted(() => vi.fn())
vi.mock("@/lib/auth/token", () => ({ tokenStorage: { get: getToken } }))

import { leadKeys } from "@/hooks/use-leads"
import { useConversationStream } from "@/hooks/use-conversation-stream"

type Handlers = Record<string, EventListener[]>

class FakeEventSource {
  static instances: FakeEventSource[] = []
  url: string
  handlers: Handlers = {}
  close = vi.fn()
  constructor(url: string) {
    this.url = url
    FakeEventSource.instances.push(this)
  }
  addEventListener(type: string, fn: EventListener) {
    ;(this.handlers[type] ??= []).push(fn)
  }
  removeEventListener(type: string, fn: EventListener) {
    this.handlers[type] = (this.handlers[type] ?? []).filter((h) => h !== fn)
  }
  emit(type: string) {
    ;(this.handlers[type] ?? []).forEach((h) => h(new Event(type)))
  }
}

const EventSourceCtor = vi.fn((url: string) => new FakeEventSource(url))

function makeWrapper() {
  const qc = makeTestQueryClient()
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  )
  return { wrapper, qc }
}

describe("useConversationStream", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    FakeEventSource.instances = []
    getToken.mockReturnValue("jwt-token-123")
    ;(globalThis as unknown as { EventSource: unknown }).EventSource =
      EventSourceCtor as unknown as typeof EventSource
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    delete (globalThis as unknown as { EventSource?: unknown }).EventSource
  })

  it("opens one EventSource with the token in the query string and subscribes to `conversation`", () => {
    const { wrapper } = makeWrapper()
    renderHook(() => useConversationStream(), { wrapper })

    expect(EventSourceCtor).toHaveBeenCalledTimes(1)
    const es = FakeEventSource.instances[0]
    expect(es.url).toContain("token=jwt-token-123")
    expect(es.handlers["conversation"]).toHaveLength(1)
  })

  it("invalidates the lead query group when a conversation event arrives (coalesced)", () => {
    const { wrapper, qc } = makeWrapper()
    const invalidate = vi.spyOn(qc, "invalidateQueries")
    renderHook(() => useConversationStream(), { wrapper })

    const es = FakeEventSource.instances[0]
    act(() => {
      es.emit("conversation")
    })
    expect(invalidate).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(600)
    })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: leadKeys.all })
  })

  it("closes the EventSource on unmount", () => {
    const { wrapper } = makeWrapper()
    const { unmount } = renderHook(() => useConversationStream(), { wrapper })

    const es = FakeEventSource.instances[0]
    unmount()
    expect(es.close).toHaveBeenCalledTimes(1)
  })

  it("does nothing when there is no auth token", () => {
    getToken.mockReturnValue(null)
    const { wrapper } = makeWrapper()
    renderHook(() => useConversationStream(), { wrapper })

    expect(EventSourceCtor).not.toHaveBeenCalled()
  })
})
