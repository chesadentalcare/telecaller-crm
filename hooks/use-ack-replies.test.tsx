import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, act, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import React from "react"

const ackReplies = vi.hoisted(() => vi.fn())
vi.mock("@/lib/api/leads", () => ({ leadsApi: { ackReplies } }))

import { leadKeys } from "@/hooks/use-leads"
import { useAckReplies } from "@/hooks/use-lead-mutations"

function makeWrapper(qc: QueryClient) {
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  )
}

type Row = { id: number; replied?: { hasUnread?: boolean; awaitingReply?: boolean } }

function seed() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  qc.setQueryData(leadKeys.pipeline(), [
    { id: 7, replied: { awaitingReply: true, hasUnread: true } },
    { id: 8, replied: { awaitingReply: true, hasUnread: true } },
  ] as Row[])
  return qc
}

describe("useAckReplies optimistic badge clear", () => {
  beforeEach(() => vi.clearAllMocks())

  it("clears the awaiting-reply badge on the acked lead's row, leaving others", async () => {
    ackReplies.mockReturnValue(new Promise(() => {})) // stays pending
    const qc = seed()
    const { result } = renderHook(() => useAckReplies(7), { wrapper: makeWrapper(qc) })

    act(() => { result.current.mutate() })

    await waitFor(() => {
      const list = qc.getQueryData(leadKeys.pipeline()) as Row[]
      expect(list.find((l) => l.id === 7)?.replied?.awaitingReply).toBe(false)
    })
    const list = qc.getQueryData(leadKeys.pipeline()) as Row[]
    expect(list.find((l) => l.id === 7)?.replied?.hasUnread).toBe(false)
    expect(list.find((l) => l.id === 8)?.replied?.awaitingReply).toBe(true) // untouched
  })

  it("rolls back the badge on error", async () => {
    ackReplies.mockRejectedValue(new Error("boom"))
    const qc = seed()
    const { result } = renderHook(() => useAckReplies(7), { wrapper: makeWrapper(qc) })

    act(() => { result.current.mutate() })

    await waitFor(() => expect(result.current.isError).toBe(true))
    const list = qc.getQueryData(leadKeys.pipeline()) as Row[]
    expect(list.find((l) => l.id === 7)?.replied?.awaitingReply).toBe(true)
  })
})
