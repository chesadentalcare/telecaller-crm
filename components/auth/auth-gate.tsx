"use client"

// AuthGate wraps the dashboard page. If the user is not authenticated, it
// redirects to /login and renders a tiny spinner in the interim so we don't
// flash the protected UI for a frame.
//
// Pairs with the 401 handler in lib/api/client.ts — that bounces the user
// here after an expired token gets used. The ?next= query keeps deep links
// intact across the round-trip.

import { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth/AuthContext"

export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { status } = useAuth()

  useEffect(() => {
    if (status === "anon") {
      const next = encodeURIComponent(pathname || "/")
      router.replace(`/login?next=${next}`)
    }
  }, [status, pathname, router])

  if (status !== "authed") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="size-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
      </div>
    )
  }

  return <>{children}</>
}
