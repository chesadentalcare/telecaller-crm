import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"
import { QueryClientProvider } from "@tanstack/react-query"
import React from "react"

import { makeTestQueryClient } from "@/tests/helpers/render"
import { sharedApiUrl, endpoints } from "@/lib/api-config"
import { useProducts, useProductCatalogue } from "@/hooks/use-products"

function wrapper() {
  const qc = makeTestQueryClient()
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  )
}

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    statusText: ok ? "OK" : "Error",
    json: async () => body,
  } as unknown as Response
}

describe("useProducts", () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal("fetch", fetchMock)
  })
  afterEach(() => vi.unstubAllGlobals())

  it("fetches products from the shared gateway and exposes the list", async () => {
    const products = [
      { id: 1, pname: "Dental Chair" },
      { id: 2, pname: "Intraoral Scanner" },
    ]
    fetchMock.mockResolvedValue(jsonResponse(products))

    const { result } = renderHook(() => useProducts(), { wrapper: wrapper() })

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.data).toEqual(products)
    expect(result.current.error).toBeNull()
    expect(fetchMock).toHaveBeenCalledWith(sharedApiUrl(endpoints.products), { method: "GET" })
  })

  it("starts loading with an empty data array", () => {
    fetchMock.mockReturnValue(new Promise(() => {}))
    const { result } = renderHook(() => useProducts(), { wrapper: wrapper() })
    expect(result.current.isLoading).toBe(true)
    expect(result.current.data).toEqual([])
  })

  it("coerces a non-array payload to an empty list", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ oops: true }))
    const { result } = renderHook(() => useProducts(), { wrapper: wrapper() })
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.data).toEqual([])
  })

  it("surfaces the HTTP error message on a non-ok response", async () => {
    fetchMock.mockResolvedValue(jsonResponse(null, false, 500))
    const { result } = renderHook(() => useProducts(), { wrapper: wrapper() })
    await waitFor(() => expect(result.current.error).not.toBeNull())
    expect(result.current.error).toContain("500")
    expect(result.current.data).toEqual([])
  })

  it("exposes a refetch function", async () => {
    fetchMock.mockResolvedValue(jsonResponse([{ id: 1, pname: "Dental Chair" }]))
    const { result } = renderHook(() => useProducts(), { wrapper: wrapper() })
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(typeof result.current.refetch).toBe("function")

    fetchMock.mockClear()
    result.current.refetch()
    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
  })
})

describe("useProductCatalogue", () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal("fetch", fetchMock)
  })
  afterEach(() => vi.unstubAllGlobals())

  it("maps the price-list payload into catalogue products", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        products: [
          {
            name: "Ashva Jwala Chair",
            code: "AJ-001",
            category: "Chairs",
            gstRate: 18,
            image: "https://cdn.example/chair.jpg",
            prices: { MRP: { pre: 400000, post: 472000 } },
          },
        ],
      }),
    )

    const { result } = renderHook(() => useProductCatalogue(), { wrapper: wrapper() })

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.data).toHaveLength(1)
    const p = result.current.data[0]
    expect(p.name).toBe("Ashva Jwala Chair")
    expect(p.code).toBe("AJ-001")
    expect(p.mrp).toBe(472000)
    expect(p.gstRate).toBe(18)
    expect(p.category).toBe("Chairs")
    expect(p.image).toBe("https://cdn.example/chair.jpg")
    expect(fetchMock).toHaveBeenCalledWith(sharedApiUrl(endpoints.productPriceList), { method: "GET" })
  })

  it("falls back to the pre-tax MRP when post is absent", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ products: [{ name: "X", code: "X1", prices: { MRP: { pre: 1000 } } }] }),
    )
    const { result } = renderHook(() => useProductCatalogue(), { wrapper: wrapper() })
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.data[0].mrp).toBe(1000)
  })

  it("drops rows without a name and defaults image to null", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        products: [
          { name: "", code: "EMPTY" },
          { name: "Valid", code: "V1" },
        ],
      }),
    )
    const { result } = renderHook(() => useProductCatalogue(), { wrapper: wrapper() })
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.data).toHaveLength(1)
    expect(result.current.data[0].name).toBe("Valid")
    expect(result.current.data[0].mrp).toBe(0)
    expect(result.current.data[0].image).toBeNull()
  })

  it("returns an empty list when products key is missing", async () => {
    fetchMock.mockResolvedValue(jsonResponse({}))
    const { result } = renderHook(() => useProductCatalogue(), { wrapper: wrapper() })
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.data).toEqual([])
  })

  it("surfaces the HTTP error message on a non-ok response", async () => {
    fetchMock.mockResolvedValue(jsonResponse(null, false, 404))
    const { result } = renderHook(() => useProductCatalogue(), { wrapper: wrapper() })
    await waitFor(() => expect(result.current.error).not.toBeNull())
    expect(result.current.error).toContain("404")
  })
})
