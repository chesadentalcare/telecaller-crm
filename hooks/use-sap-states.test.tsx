import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"
import { QueryClientProvider } from "@tanstack/react-query"
import React from "react"

import { makeTestQueryClient } from "@/test-utils/render"
import { sapStates } from "@/test-utils/fixtures"
import { endpoints } from "@/lib/api-config"

const get = vi.hoisted(() => vi.fn())
vi.mock("@/lib/api/client", () => ({ api: { get } }))

import { useSapStates } from "@/hooks/use-sap-states"

function wrapper() {
  const qc = makeTestQueryClient()
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  )
}

describe("useSapStates", () => {
  beforeEach(() => vi.clearAllMocks())

  it("unwraps the envelope and returns the state list", async () => {
    get.mockResolvedValue({ success: true, data: sapStates })
    const { result } = renderHook(() => useSapStates(), { wrapper: wrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(sapStates)
    expect(result.current.data?.[0]).toEqual({ code: "KT", name: "Karnataka" })
  })

  it("calls the sap states endpoint", async () => {
    get.mockResolvedValue({ success: true, data: sapStates })
    const { result } = renderHook(() => useSapStates(), { wrapper: wrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(get).toHaveBeenCalledWith(endpoints.sapStates)
  })

  it("surfaces a query error when the request rejects", async () => {
    get.mockRejectedValue(new Error("sap down"))
    const { result } = renderHook(() => useSapStates(), { wrapper: wrapper() })
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.data).toBeUndefined()
  })
})
