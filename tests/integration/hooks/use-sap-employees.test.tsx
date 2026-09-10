import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"
import { QueryClientProvider } from "@tanstack/react-query"
import React from "react"

import { makeTestQueryClient } from "@/tests/helpers/render"
import { endpoints } from "@/lib/api-config"
import type { SapEmployee } from "@/hooks/use-sap-employees"

const get = vi.hoisted(() => vi.fn())
vi.mock("@/lib/api/client", () => ({ api: { get } }))

import { useSapEmployees } from "@/hooks/use-sap-employees"

const employees: SapEmployee[] = [
  {
    employeeId: 101,
    salesPersonCode: 14,
    name: "Rakesh Kumar",
    jobTitle: "Sales Executive",
    department: "Sales",
  },
  {
    employeeId: 102,
    salesPersonCode: 15,
    name: "Priya Menon",
    jobTitle: null,
    department: null,
  },
]

function wrapper() {
  const qc = makeTestQueryClient()
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  )
}

describe("useSapEmployees", () => {
  beforeEach(() => vi.clearAllMocks())

  it("unwraps the envelope and returns the employee list", async () => {
    get.mockResolvedValue({ success: true, data: employees })
    const { result } = renderHook(() => useSapEmployees(), { wrapper: wrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(employees)
    expect(result.current.data?.[1].jobTitle).toBeNull()
    expect(get).toHaveBeenCalledWith(endpoints.sapEmployees)
  })

  it("surfaces a query error when the request rejects", async () => {
    get.mockRejectedValue(new Error("sap down"))
    const { result } = renderHook(() => useSapEmployees(), { wrapper: wrapper() })
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.data).toBeUndefined()
  })
})
