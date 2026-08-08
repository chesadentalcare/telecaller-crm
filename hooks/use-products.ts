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

// Full priced catalogue (/products_all on the shared chesa gateway) — carries the
// price tiers (mrp/msp/dp/sdp), warranty and description. Used by the quotation
// builder's "Add product" so a picked product brings its MRP in, unlike /crmpro
// (id + name only) which the equipment-interest dropdowns use.
export interface CatalogueProduct {
  id: number
  name: string
  code: string
  mrp: number
  msp: number
  dp: number
  sdp: number
  warranty: string
  description: string
  category: string
}

async function fetchProductCatalogue(): Promise<CatalogueProduct[]> {
  const res = await fetch(sharedApiUrl(endpoints.productsAll), { method: "GET" })
  if (!res.ok) {
    throw new Error(`Product catalogue fetch failed: ${res.status} ${res.statusText}`)
  }
  const json = (await res.json()) as Array<Record<string, unknown>>
  if (!Array.isArray(json)) return []
  return json
    .map((p) => ({
      id: Number(p.id) || 0,
      name: String(p.name ?? ""),
      code: String(p.code ?? ""),
      mrp: Number(p.mrp) || 0,
      msp: Number(p.msp) || 0,
      dp: Number(p.dp) || 0,
      sdp: Number(p.sdp) || 0,
      warranty: String(p.warranty_period ?? ""),
      description: String(p.description ?? ""),
      category: String(p.cat_name ?? ""),
    }))
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
