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
