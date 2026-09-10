import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, act, waitFor } from "@testing-library/react"
import { QueryClientProvider } from "@tanstack/react-query"
import React from "react"

import { makeTestQueryClient } from "@/test-utils/render"

const addSalesUpdate = vi.hoisted(() => vi.fn())
const closeLead = vi.hoisted(() => vi.fn())
const allocateSales = vi.hoisted(() => vi.fn())
const editAttempt = vi.hoisted(() => vi.fn())

vi.mock("@/lib/api/leads", () => ({
  leadsApi: { addSalesUpdate, closeLead, allocateSales, editAttempt },
}))

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}))

import { toast } from "sonner"
import { leadKeys } from "@/hooks/use-leads"
import {
  useAddSalesUpdate,
  useCloseLead,
  useAllocateSales,
  useEditAttempt,
} from "@/hooks/use-lead-mutations"

function makeWrapper() {
  const qc = makeTestQueryClient()
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  )
  return { wrapper, qc }
}

describe("useAddSalesUpdate", () => {
  beforeEach(() => vi.clearAllMocks())

  it("calls the api with the lead id + body, invalidates callsDue + all, and toasts success", async () => {
    addSalesUpdate.mockResolvedValue({ ok: true })
    const { wrapper, qc } = makeWrapper()
    const invalidate = vi.spyOn(qc, "invalidateQueries")

    const { result } = renderHook(() => useAddSalesUpdate(77), { wrapper })

    const body = { notes: "rep visited", event: "meeting_done", amount: 5000 }
    await act(async () => {
      await result.current.mutateAsync(body)
    })

    expect(addSalesUpdate).toHaveBeenCalledWith(77, body)
    expect(invalidate).toHaveBeenCalledWith({ queryKey: leadKeys.callsDue() })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: leadKeys.all })
    expect(toast.success).toHaveBeenCalledWith("Sales rep's response logged")
  })
})

describe("useCloseLead", () => {
  beforeEach(() => vi.clearAllMocks())

  it("passes the FormData through to the api and invalidates the lead group", async () => {
    closeLead.mockResolvedValue({ ok: true })
    const { wrapper, qc } = makeWrapper()
    const invalidate = vi.spyOn(qc, "invalidateQueries")

    const { result } = renderHook(() => useCloseLead("L-9"), { wrapper })

    const fd = new FormData()
    fd.append("outcome", "won")
    await act(async () => {
      await result.current.mutateAsync(fd)
    })

    expect(closeLead).toHaveBeenCalledWith("L-9", fd)
    expect(invalidate).toHaveBeenCalledWith({ queryKey: leadKeys.all })
  })
})

describe("useAllocateSales", () => {
  beforeEach(() => vi.clearAllMocks())

  it("toasts a success with the sales person name when SAP synced", async () => {
    allocateSales.mockResolvedValue({ salesPersonName: "Ravi", sapSynced: true })
    const { wrapper, qc } = makeWrapper()
    const invalidate = vi.spyOn(qc, "invalidateQueries")

    const { result } = renderHook(() => useAllocateSales(5), { wrapper })

    await act(async () => {
      await result.current.mutateAsync({ salesUsername: "ravi" })
    })

    expect(allocateSales).toHaveBeenCalledWith(5, { salesUsername: "ravi" })
    expect(toast.success).toHaveBeenCalledWith("Allocated to Ravi")
    expect(toast.warning).not.toHaveBeenCalled()
    expect(invalidate).toHaveBeenCalledWith({ queryKey: leadKeys.all })
  })

  it("toasts a warning when SAP sync failed", async () => {
    allocateSales.mockResolvedValue({ salesPersonName: "Ravi", sapSynced: false })
    const { wrapper } = makeWrapper()

    const { result } = renderHook(() => useAllocateSales(5), { wrapper })

    await act(async () => {
      await result.current.mutateAsync({ salesUsername: "ravi" })
    })

    expect(toast.warning).toHaveBeenCalledWith(
      expect.stringContaining("SAP sync failed"),
    )
    expect(toast.success).not.toHaveBeenCalled()
  })
})

describe("useEditAttempt", () => {
  beforeEach(() => vi.clearAllMocks())

  it("calls the api with lead id, attempt id + patch and invalidates detail + all", async () => {
    editAttempt.mockResolvedValue({ ok: true })
    const { wrapper, qc } = makeWrapper()
    const invalidate = vi.spyOn(qc, "invalidateQueries")

    const { result } = renderHook(() => useEditAttempt(3), { wrapper })

    await act(async () => {
      await result.current.mutateAsync({ attemptId: 88, outcome: "engaged", notes: "fixed" })
    })

    expect(editAttempt).toHaveBeenCalledWith(3, 88, { outcome: "engaged", notes: "fixed" })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: leadKeys.detail("3") })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: leadKeys.all })
  })

  it("toasts the fallback error when the api rejects", async () => {
    editAttempt.mockRejectedValue(new Error("nope"))
    const { wrapper } = makeWrapper()

    const { result } = renderHook(() => useEditAttempt(3), { wrapper })

    await act(async () => {
      await result.current.mutateAsync({ attemptId: 1, outcome: "engaged" }).catch(() => {})
    })

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Failed to correct the attempt"),
    )
  })
})
