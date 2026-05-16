"use client"

import { useEffect, useState } from "react"
import { apiUrl, endpoints } from "@/lib/api-config"

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

/**
 * Fetches the product catalog from the configured backend.
 *
 * Currently a hand-rolled fetch + cache hook. When the app adopts TanStack
 * Query, swap the body for:
 *
 *   const { data, isLoading, error, refetch } = useQuery({
 *     queryKey: ['products'],
 *     queryFn: () => fetch(apiUrl(endpoints.products)).then(r => r.json()),
 *     staleTime: 60 * 60 * 1000,
 *   })
 *
 * Public shape (`data / isLoading / error / refetch`) stays identical so call
 * sites don't change.
 */

// Module-level cache so multiple components mounting the hook don't refetch.
// TanStack Query removes the need for this.
let cachedProducts: Product[] | null = null
let inflight: Promise<Product[]> | null = null

async function fetchProducts(): Promise<Product[]> {
  if (cachedProducts) return cachedProducts
  if (inflight) return inflight

  inflight = (async () => {
    const res = await fetch(apiUrl(endpoints.products), { method: "GET" })
    if (!res.ok) {
      inflight = null
      throw new Error(`Products fetch failed: ${res.status} ${res.statusText}`)
    }
    const json = (await res.json()) as Product[]
    cachedProducts = Array.isArray(json) ? json : []
    inflight = null
    return cachedProducts
  })()

  return inflight
}

export function useProducts(): UseProductsResult {
  const [data, setData] = useState<Product[]>(cachedProducts ?? [])
  const [isLoading, setIsLoading] = useState<boolean>(!cachedProducts)
  const [error, setError] = useState<string | null>(null)

  const run = () => {
    setIsLoading(true)
    setError(null)
    fetchProducts()
      .then((list) => setData(list))
      .catch((err: Error) => setError(err.message))
      .finally(() => setIsLoading(false))
  }

  useEffect(() => {
    if (cachedProducts) {
      setData(cachedProducts)
      setIsLoading(false)
      return
    }
    run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const refetch = () => {
    cachedProducts = null
    run()
  }

  return { data, isLoading, error, refetch }
}
