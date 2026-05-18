"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Eye, EyeOff, Loader2, Lock, LogIn, User } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth/AuthContext"
import { ApiError } from "@/lib/api/client"
import { loginSchema, loginDefaults, type LoginValues } from "@/lib/schemas/login"

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login } = useAuth()
  const [showPwd, setShowPwd] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: loginDefaults,
  })

  const onSubmit = async (values: LoginValues) => {
    setSubmitting(true)
    try {
      await login(values.username, values.password)
      toast.success("Welcome back")
      // Honor ?next=/some/path so a 401 redirect lands the user back where they were.
      const next = searchParams.get("next") || "/"
      router.replace(next)
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : err instanceof Error ? err.message : "Login failed"
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card className="w-full max-w-sm shadow-xl border-border/60">
      <CardHeader className="space-y-2 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <LogIn className="size-6" />
        </div>
        <CardTitle className="text-xl">Telecaller Sign in</CardTitle>
        <CardDescription>Use your CRM credentials to continue.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="username">Username</Label>
            <div className="relative">
              <User className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="username"
                autoComplete="username"
                autoFocus
                placeholder="e.g. tester"
                className="pl-9"
                aria-invalid={!!errors.username}
                {...register("username")}
              />
            </div>
            {errors.username && (
              <p className="text-xs text-destructive">{errors.username.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="password"
                type={showPwd ? "text" : "password"}
                autoComplete="current-password"
                placeholder="••••••••"
                className="pl-9 pr-9"
                aria-invalid={!!errors.password}
                {...register("password")}
              />
              <button
                type="button"
                onClick={() => setShowPwd((s) => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={showPwd ? "Hide password" : "Show password"}
              >
                {showPwd ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-xs text-destructive">{errors.password.message}</p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Signing in…
              </>
            ) : (
              "Sign in"
            )}
          </Button>

          <p className="pt-2 text-center text-[11px] text-muted-foreground">
            Staging build — use the seeded credentials your admin shared.
          </p>
        </form>
      </CardContent>
    </Card>
  )
}
