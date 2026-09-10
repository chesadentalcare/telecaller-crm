import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"
import { QueryClientProvider } from "@tanstack/react-query"
import React from "react"

import { makeTestQueryClient } from "@/tests/helpers/render"
import { endpoints } from "@/lib/api-config"
import type { SapSource } from "@/hooks/use-sap-sources"

const get = vi.hoisted(() => vi.fn())
vi.mock("@/lib/api/client", () => ({ api: { get } }))

import { useSapSources } from "@/hooks/use-sap-sources"

const sources: SapSource[] = [
  { sequenceNo: 14, description: "Facebook Paid" },
  { sequenceNo: 15, description: "Google Ads" },
  { sequenceNo: 16, description: "IndiaMart" },
]

function wrapper() {
  const qc = makeTestQueryClient()
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  )
}

describe("useSapSources", () => {
  beforeEach(() => vi.clearAllMocks())

  it("unwraps the envelope and returns the source list", async () => {
    get.mockResolvedValue({ success: true, data: sources })
    const { result } = renderHook(() => useSapSources(), { wrapper: wrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(sources)
    expect(get).toHaveBeenCalledWith(endpoints.sapSources)
  })

  it("handles an empty source list", async () => {
    get.mockResolvedValue({ success: true, data: [] })
    const { result } = renderHook(() => useSapSources(), { wrapper: wrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([])
  })

  it("surfaces a query error when the request rejects", async () => {
    get.mockRejectedValue(new Error("sap down"))
    const { result } = renderHook(() => useSapSources(), { wrapper: wrapper() })
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.data).toBeUndefined()
  })
})
