"use client"

import { Suspense, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion, useReducedMotion, type Variants, type Target } from "framer-motion"
import { Stethoscope, Workflow, RefreshCw, FileText, ShieldCheck } from "lucide-react"
import { LoginForm } from "@/components/auth/login-form"
import { useAuth } from "@/lib/auth/AuthContext"
import { cn } from "@/lib/utils"

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

  useEffect(() => {
    if (status === "authed") router.replace("/")
  }, [status, router])

  if (status === "loading" || status === "authed") {
    return <LoginShellSkeleton />
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <BrandHero />
      <FormPane />
    </div>
  )
}

// ── Motion variants ────────────────────────────────────────────────────
const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.12 } },
}
const item: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
}

// A slow-drifting blurred orb. Disabled under prefers-reduced-motion.
function Orb({
  className, animate, duration, delay = 0,
}: {
  className: string
  animate: Target
  duration: number
  delay?: number
}) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      aria-hidden
      className={cn("pointer-events-none absolute rounded-full blur-3xl", className)}
      animate={reduce ? undefined : animate}
      transition={reduce ? undefined : { duration, delay, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }}
    />
  )
}

// ── Form pane (right) — animated aurora behind a glass card ─────────────
function FormPane() {
  return (
    <div className="relative flex flex-col overflow-hidden bg-background px-6 py-10 sm:px-10">
      {/* Aurora background behind the form */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-sky-50/60 via-background to-indigo-50/40 dark:from-sky-950/20 dark:to-indigo-950/20" />
      <Orb className="left-[-10%] top-[-8%] size-72 bg-sky-400/20 dark:bg-sky-500/10" animate={{ x: [0, 40, 0], y: [0, 26, 0], scale: [1, 1.12, 1] }} duration={18} />
      <Orb className="bottom-[-12%] right-[-6%] size-80 bg-indigo-400/20 dark:bg-indigo-500/10" animate={{ x: [0, -34, 0], y: [0, -30, 0], scale: [1, 1.1, 1] }} duration={22} delay={1.5} />
      <Orb className="bottom-[20%] left-[12%] size-56 bg-violet-300/15 dark:bg-violet-500/10" animate={{ x: [0, 24, 0], y: [0, -20, 0] }} duration={26} delay={0.8} />

      <div className="relative z-10 flex flex-1 items-center justify-center">
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="w-full max-w-sm rounded-2xl border bg-card/80 p-7 shadow-xl shadow-black/[0.06] backdrop-blur-xl sm:p-8"
        >
          <motion.div variants={item} className="mb-6 flex items-center gap-2.5">
            <LogoMark />
            <div className="leading-tight">
              <p className="text-sm font-semibold tracking-tight">Ashva CRM</p>
              <p className="text-[11px] text-muted-foreground">Chesa Dental Care</p>
            </div>
          </motion.div>

          <motion.div variants={item} className="mb-6 space-y-1.5">
            <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
            <p className="text-sm text-muted-foreground">Sign in to your account to continue.</p>
          </motion.div>

          <motion.div variants={item}>
            <LoginForm />
          </motion.div>

          <motion.div variants={item} className="mt-6 rounded-lg border bg-muted/30 px-4 py-3">
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Staging build.</span> Use the seeded
              credentials your administrator shared.
            </p>
          </motion.div>
        </motion.div>
      </div>

      <p className="relative z-10 mt-8 text-center text-[11px] text-muted-foreground">
        © {new Date().getFullYear()} Chesa Dental Care · Ashva CRM
      </p>
    </div>
  )
}

// ── Branded hero (left) ────────────────────────────────────────────────
function BrandHero() {
  const features = [
    { icon: Workflow, title: "Guided lead lifecycle", desc: "From first call to closed deal, every stage gated by the SOP." },
    { icon: RefreshCw, title: "Real-time SAP B1 sync", desc: "Opportunities, stages and orders mirrored into Ashva Live." },
    { icon: FileText, title: "Quotes, follow-ups & closures", desc: "Build, send and track quotations end to end." },
  ]

  return (
    <div className="relative hidden overflow-hidden bg-[#0c1f38] text-white lg:flex lg:flex-col lg:justify-between lg:p-12">
      {/* Gradient + animated orbs + grid */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#0c1f38] via-[#112a4a] to-[#1b1f54]" />
      <Orb className="left-[-12%] top-[-10%] size-96 bg-indigo-500/25" animate={{ x: [0, 46, 0], y: [0, 34, 0], scale: [1, 1.15, 1] }} duration={16} />
      <Orb className="bottom-[-16%] right-[-8%] size-[28rem] bg-sky-500/20" animate={{ x: [0, -36, 0], y: [0, -44, 0], scale: [1, 1.12, 1] }} duration={20} delay={1} />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
          backgroundSize: "34px 34px",
        }}
      />

      {/* Top — brand */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative flex items-center gap-3"
      >
        <LogoMark large />
        <div className="leading-tight">
          <p className="text-base font-semibold tracking-tight">Ashva CRM</p>
          <p className="text-xs text-white/60">Chesa Dental Care</p>
        </div>
      </motion.div>

      {/* Middle — headline + features */}
      <motion.div variants={container} initial="hidden" animate="show" className="relative max-w-md">
        <motion.h2 variants={item} className="text-3xl font-semibold leading-tight tracking-tight">
          Sell dental equipment,
          <br />
          the disciplined way.
        </motion.h2>
        <motion.p variants={item} className="mt-3 text-sm leading-relaxed text-white/70">
          One workspace for telecallers and sales — calls, qualification, meetings,
          quotations and closures, all in sync with SAP.
        </motion.p>

        <ul className="mt-9 space-y-5">
          {features.map((f) => (
            <motion.li key={f.title} variants={item} className="flex items-start gap-3.5">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/15 backdrop-blur">
                <f.icon className="size-[18px] text-sky-300" />
              </div>
              <div>
                <p className="text-sm font-medium">{f.title}</p>
                <p className="text-xs leading-relaxed text-white/55">{f.desc}</p>
              </div>
            </motion.li>
          ))}
        </ul>
      </motion.div>

      {/* Bottom — trust line */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.6 }}
        className="relative flex items-center gap-2 text-xs text-white/55"
      >
        <ShieldCheck className="size-4 text-emerald-300/80" />
        Secured with role-based access · 12-hour sessions
      </motion.div>
    </div>
  )
}

// ── Logo mark ──────────────────────────────────────────────────────────
function LogoMark({ large = false }: { large?: boolean }) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      animate={reduce ? undefined : { y: [0, -4, 0] }}
      transition={reduce ? undefined : { duration: 4, repeat: Infinity, ease: "easeInOut" }}
      className={cn(
        "flex items-center justify-center bg-gradient-to-br from-sky-400 to-indigo-500",
        large
          ? "size-11 rounded-xl shadow-lg shadow-indigo-900/40"
          : "size-9 rounded-lg shadow-md shadow-indigo-500/20",
      )}
    >
      <Stethoscope className={large ? "size-6 text-white" : "size-5 text-white"} />
    </motion.div>
  )
}

function LoginShellSkeleton() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="size-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
    </div>
  )
}
