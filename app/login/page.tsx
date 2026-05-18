"use client"

import { Suspense, useEffect } from "react"
import { useRouter } from "next/navigation"
import { LoginForm } from "@/components/auth/login-form"
import { useAuth } from "@/lib/auth/AuthContext"

// Server-side wrapper kept lightweight; the inner client component reads
// auth state from context.
export default function LoginPage() {
  return (
    <Suspense fallback={<LoginShellSkeleton />}>
      <LoginPageInner />
    </Suspense>
  )
}

function LoginPageInner() {
  const router = useRouter()
  const { status } = useAuth()

  // Already-logged-in users shouldn't see the login screen.
  useEffect(() => {
    if (status === "authed") router.replace("/")
  }, [status, router])

  if (status === "loading" || status === "authed") {
    return <LoginShellSkeleton />
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">TeleCRM</h1>
          <p className="text-sm text-muted-foreground">Telecaller Dashboard · Chesa Dental Care</p>
        </div>
        <LoginForm />
      </div>
    </div>
  )
}

function LoginShellSkeleton() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="size-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
    </div>
  )
}
