import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, act, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import React from "react"

const logAttempt = vi.hoisted(() => vi.fn())
vi.mock("@/lib/api/leads", () => ({ leadsApi: { logAttempt } }))

import { leadKeys } from "@/hooks/use-leads"
import { useLogAttempt } from "@/hooks/use-lead-mutations"

function makeWrapper(qc: QueryClient) {
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  )
}

function seed(attempts: Array<Record<string, unknown>>) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  qc.setQueryData(leadKeys.fullDetail("42"), { attempts })
  return qc
}

type Cache = { attempts: Array<Record<string, unknown>> }

describe("useLogAttempt optimistic append", () => {
  beforeEach(() => vi.clearAllMocks())

  it("appends the logged attempt to fullDetail immediately", async () => {
    logAttempt.mockReturnValue(new Promise(() => {})) // stays pending -> optimistic state persists
    const qc = seed([{ id: 1, attempt_number: 1, outcome: "no_response" }])
    const { result } = renderHook(() => useLogAttempt(42), { wrapper: makeWrapper(qc) })

    act(() => {
      result.current.mutate({ outcome: "engaged", notes: "picked up" })
    })

    await waitFor(() => {
      const d = qc.getQueryData(leadKeys.fullDetail("42")) as Cache
      expect(d.attempts).toHaveLength(2)
    })
    const last = (qc.getQueryData(leadKeys.fullDetail("42")) as Cache).attempts[1]
    expect(last.outcome).toBe("engaged")
    expect(last.attempt_number).toBe(2)
    expect(last.notes).toBe("picked up")
    expect(last.attempted_by).toBeTruthy()
  })

  it("rolls back the optimistic append when the server rejects", async () => {
    logAttempt.mockRejectedValue(new Error("boom"))
    const qc = seed([{ id: 1, attempt_number: 1, outcome: "no_response" }])
    const { result } = renderHook(() => useLogAttempt(42), { wrapper: makeWrapper(qc) })

    act(() => {
      result.current.mutate({ outcome: "engaged" })
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    const d = qc.getQueryData(leadKeys.fullDetail("42")) as Cache
    expect(d.attempts).toHaveLength(1)
  })
})
