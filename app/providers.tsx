"use client"

import { useState } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { AuthProvider } from "@/lib/auth/AuthContext"

// All client-side providers live here so app/layout.tsx stays a Server
// Component. Add new global providers (theme, auth) into this tree, not at the
// layout level.
export function Providers({ children }: { children: React.ReactNode }) {
  // Lazy-init via useState so the client gets a fresh QueryClient per browser
  // session but the same instance across re-renders. Module-level instantiation
  // would leak state between users on a shared server in SSR scenarios.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Most reference data (products, employees) is stable for the
            // session. Keep cached for an hour, only refetch on explicit
            // invalidation or mount-after-window.
            staleTime: 60 * 60 * 1000,
            gcTime: 24 * 60 * 60 * 1000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  )

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  )
}
