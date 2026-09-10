import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, act, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import React from "react"

// mutationFn never resolves -> the mutation stays pending, so the optimistic
// onMutate state persists and onSettled's refetch never overwrites it.
// vi.hoisted so the fns exist before the hoisted vi.mock factory runs.
const { markNotificationRead, markAllNotificationsRead } = vi.hoisted(() => ({
  markNotificationRead: vi.fn(() => new Promise(() => {})),
  markAllNotificationsRead: vi.fn(() => new Promise(() => {})),
}))

vi.mock("@/lib/api/leads", () => ({
  leadsApi: { markNotificationRead, markAllNotificationsRead },
}))

import { leadKeys } from "@/hooks/use-leads"
import { useMarkNotificationRead, useMarkAllNotificationsRead } from "@/hooks/use-lead-mutations"

function makeWrapper(qc: QueryClient) {
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  )
}

function seed(count: number, list: Array<{ id: number; is_read: number }>) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  qc.setQueryData(leadKeys.notifications(), list)
  qc.setQueryData(leadKeys.notificationCount(), { count })
  return qc
}

describe("notification optimistic updates", () => {
  beforeEach(() => vi.clearAllMocks())

  it("mark-one decrements the unread badge and marks that item read immediately", async () => {
    const qc = seed(2, [{ id: 1, is_read: 0 }, { id: 2, is_read: 0 }])
    const { result } = renderHook(() => useMarkNotificationRead(), { wrapper: makeWrapper(qc) })
    act(() => { result.current.mutate(1) })

    await waitFor(() => expect(qc.getQueryData(leadKeys.notificationCount())).toEqual({ count: 1 }))
    const list = qc.getQueryData(leadKeys.notifications()) as Array<{ id: number; is_read: number }>
    expect(list.find((n) => n.id === 1)?.is_read).toBeTruthy()
    expect(list.find((n) => n.id === 2)?.is_read).toBeFalsy()
  })

  it("mark-one on an already-read item does not decrement below the current count", async () => {
    const qc = seed(0, [{ id: 1, is_read: 1 }])
    const { result } = renderHook(() => useMarkNotificationRead(), { wrapper: makeWrapper(qc) })
    act(() => { result.current.mutate(1) })
    await waitFor(() => expect(markNotificationRead).toHaveBeenCalled())
    expect(qc.getQueryData(leadKeys.notificationCount())).toEqual({ count: 0 })
  })

  it("mark-all clears the badge and marks every item read immediately", async () => {
    const qc = seed(2, [{ id: 1, is_read: 0 }, { id: 2, is_read: 0 }])
    const { result } = renderHook(() => useMarkAllNotificationsRead(), { wrapper: makeWrapper(qc) })
    act(() => { result.current.mutate() })

    await waitFor(() => expect(qc.getQueryData(leadKeys.notificationCount())).toEqual({ count: 0 }))
    const list = qc.getQueryData(leadKeys.notifications()) as Array<{ is_read: number }>
    expect(list.every((n) => n.is_read)).toBe(true)
  })
})
