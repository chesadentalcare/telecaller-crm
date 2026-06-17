"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { motion, type Variants } from "framer-motion"
import { Eye, EyeOff, Loader2, Lock, ArrowRight, User } from "lucide-react"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth/AuthContext"
import { ApiError } from "@/lib/api/client"
import { cn } from "@/lib/utils"
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
    <motion.form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-5"
      noValidate
      variants={formStagger}
      initial="hidden"
      animate="show"
    >
      <motion.div variants={fieldItem} className="space-y-1.5">
        <Label htmlFor="username" className="text-sm font-medium">Username</Label>
        <div className="relative">
          <User className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="username"
            autoComplete="username"
            autoFocus
            placeholder="e.g. tester"
            className={cn("h-11 pl-10", errors.username && "border-destructive focus-visible:ring-destructive")}
            aria-invalid={!!errors.username}
            {...register("username")}
          />
        </div>
        {errors.username && <p className="text-xs text-destructive">{errors.username.message}</p>}
      </motion.div>

      <motion.div variants={fieldItem} className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="password" className="text-sm font-medium">Password</Label>
          <button
            type="button"
            onClick={() => toast.info("Contact your CRM administrator to reset your password.")}
            className="text-xs font-medium text-primary/80 hover:text-primary"
          >
            Forgot password?
          </button>
        </div>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="password"
            type={showPwd ? "text" : "password"}
            autoComplete="current-password"
            placeholder="••••••••"
            className={cn("h-11 pl-10 pr-10", errors.password && "border-destructive focus-visible:ring-destructive")}
            aria-invalid={!!errors.password}
            {...register("password")}
          />
          <button
            type="button"
            onClick={() => setShowPwd((s) => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
            aria-label={showPwd ? "Hide password" : "Show password"}
          >
            {showPwd ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
        {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
      </motion.div>

      <motion.div variants={fieldItem}>
        <Button type="submit" className="h-11 w-full gap-1.5 text-sm font-semibold" disabled={submitting}>
          {submitting ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Signing in…
            </>
          ) : (
            <>
              Sign in
              <ArrowRight className="size-4" />
            </>
          )}
        </Button>
      </motion.div>
    </motion.form>
  )
}

const formStagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.25 } },
}
const fieldItem: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
}
