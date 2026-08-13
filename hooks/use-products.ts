"use client"

import { useQuery } from "@tanstack/react-query"
import { sharedApiUrl, endpoints } from "@/lib/api-config"

export interface Product {
  id: number
  pname: string
}

interface UseProductsResult {
  data: Product[]
  isLoading: boolean
  error: string | null
  refetch: () => void
}

async function fetchProducts(): Promise<Product[]> {
  // Products live in the deployed chesa_api_gateway, not the local telecaller
  // backend. See sharedApiUrl in lib/api-config.ts.
  const res = await fetch(sharedApiUrl(endpoints.products), { method: "GET" })
  if (!res.ok) {
    throw new Error(`Products fetch failed: ${res.status} ${res.statusText}`)
  }
  const json = (await res.json()) as Product[]
  return Array.isArray(json) ? json : []
}

// Public shape preserved so existing call sites compile unchanged. TanStack
// Query handles caching, dedup, and background refetch — the module-level
// `cachedProducts` / `inflight` mutexes that used to live here are gone.
export function useProducts(): UseProductsResult {
  const query = useQuery({
    queryKey: ["products"],
    queryFn: fetchProducts,
  })

  return {
    data: query.data ?? [],
    isLoading: query.isPending,
    error: query.error ? query.error.message : null,
    refetch: () => {
      void query.refetch()
    },
  }
}

// Product catalogue for the quotation builder's "Add product" — the SAME source the
// Admin "Products & Prices" page uses (/product-price-list): the curated sellable
// products with their SAP MRP. Only MRP is needed for a quote; the other price tiers
// and warranty stay on the type for compatibility but are unused here.
export interface CatalogueProduct {
  id: number
  name: string
  code: string
  mrp: number
  gstRate: number
  msp: number
  dp: number
  sdp: number
  warranty: string
  description: string
  category: string
}

async function fetchProductCatalogue(): Promise<CatalogueProduct[]> {
  const res = await fetch(sharedApiUrl(endpoints.productPriceList), { method: "GET" })
  if (!res.ok) {
    throw new Error(`Product catalogue fetch failed: ${res.status} ${res.statusText}`)
  }
  const json = (await res.json()) as { products?: Array<Record<string, unknown>> }
  const rows = Array.isArray(json?.products) ? json.products : []
  return rows
    .map((p) => {
      const prices = (p.prices ?? {}) as Record<string, { pre?: number; post?: number } | null>
      return {
        id: 0,
        name: String(p.name ?? ""),
        code: String(p.code ?? ""),
        mrp: Number(prices.MRP?.post) || Number(prices.MRP?.pre) || 0,
        gstRate: Number(p.gstRate) || 0,
        msp: 0,
        dp: 0,
        sdp: 0,
        warranty: "",
        description: "",
        category: String(p.category ?? ""),
      }
    })
    .filter((p) => p.name)
}

export function useProductCatalogue() {
  const query = useQuery({
    queryKey: ["product-catalogue"],
    queryFn: fetchProductCatalogue,
  })
  return {
    data: query.data ?? [],
    isLoading: query.isPending,
    error: query.error ? (query.error as Error).message : null,
  }
}
