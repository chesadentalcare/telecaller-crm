"use client"

import { Suspense, useMemo, useState } from "react"
import dynamic from "next/dynamic"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { SidebarNav } from "@/components/telecaller/sidebar-nav"
import { BottomTabNav } from "@/components/telecaller/bottom-tab-nav"
import { ViewSkeleton } from "@/components/telecaller/view-skeleton"
import { ViewErrorBoundary } from "@/components/telecaller/error-boundary"
import { useQueueCounts } from "@/hooks/use-queue-counts"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, Bell, Phone } from "lucide-react"

// ─── Lazy-loaded views ──────────────────────────────────────────────────
// Each view is split into its own chunk so the initial bundle only contains
// the shell + the active view. Switching tabs fetches the chunk on demand;
// `ViewSkeleton` covers the load. `ssr: false` is safe here — these views
// are client-only and use browser APIs.
const HomeDashboard = dynamic(
  () => import("@/components/telecaller/home-dashboard").then((m) => ({ default: m.HomeDashboard })),
  { loading: () => <ViewSkeleton /> },
)
const PipelineView = dynamic(
  () => import("@/components/telecaller/pipeline-view").then((m) => ({ default: m.PipelineView })),
  { loading: () => <ViewSkeleton /> },
)
const LeadDetailView = dynamic(
  () => import("@/components/telecaller/lead-detail-view").then((m) => ({ default: m.LeadDetailView })),
  { loading: () => <ViewSkeleton /> },
)
const LeadIntakeForm = dynamic(
  () => import("@/components/telecaller/lead-intake-form").then((m) => ({ default: m.LeadIntakeForm })),
  { loading: () => <ViewSkeleton /> },
)
const RapidQualificationForm = dynamic(
  () => import("@/components/telecaller/rapid-qualification-form").then((m) => ({ default: m.RapidQualificationForm })),
  { loading: () => <ViewSkeleton /> },
)
const DripQueueView = dynamic(
  () => import("@/components/telecaller/drip-queue-view").then((m) => ({ default: m.DripQueueView })),
  { loading: () => <ViewSkeleton /> },
)
const NoResponseView = dynamic(
  () => import("@/components/telecaller/no-response-view").then((m) => ({ default: m.NoResponseView })),
  { loading: () => <ViewSkeleton /> },
)
const IdleQueueView = dynamic(
  () => import("@/components/telecaller/idle-queue-view").then((m) => ({ default: m.IdleQueueView })),
  { loading: () => <ViewSkeleton /> },
)
const DormantQueueView = dynamic(
  () => import("@/components/telecaller/dormant-queue-view").then((m) => ({ default: m.DormantQueueView })),
  { loading: () => <ViewSkeleton /> },
)
const ReactivationView = dynamic(
  () => import("@/components/telecaller/reactivation-view").then((m) => ({ default: m.ReactivationView })),
  { loading: () => <ViewSkeleton /> },
)
const SixMonthFunnelView = dynamic(
  () => import("@/components/telecaller/six-month-funnel-view").then((m) => ({ default: m.SixMonthFunnelView })),
  { loading: () => <ViewSkeleton /> },
)

// ─── View registry ───────────────────────────────────────────────────
// Open/closed: registering a new view = one entry. The dashboard switch
// (the only thing that knew about every view) is gone.
//
// Each entry: page metadata + a render function receiving the navigation
// context. Adding a view doesn't touch the dispatcher.

interface ViewContext {
  selectedLeadId: string | null
  setActiveView: (view: string) => void
  openLead: (id: string) => void
}

interface ViewDefinition {
  title: string
  subtitle: string
  render: (ctx: ViewContext) => React.ReactNode
}

const VIEW_REGISTRY: Record<string, ViewDefinition> = {
  home: {
    title: "Dashboard",
    subtitle: "Analytics & performance overview",
    render: ({ setActiveView }) => <HomeDashboard onNavigate={setActiveView} />,
  },
  pipeline: {
    title: "Pipeline",
    subtitle: "Active leads ready for calls",
    render: ({ openLead }) => <PipelineView onOpenLead={openLead} />,
  },
  "lead-detail": {
    title: "Lead Detail",
    subtitle: "Full lifecycle view",
    render: ({ selectedLeadId, setActiveView }) => (
      <LeadDetailView leadId={selectedLeadId ?? undefined} onBack={() => setActiveView("pipeline")} />
    ),
  },
  "new-lead": {
    title: "Add New Lead",
    subtitle: "Capture lead information",
    render: () => (
      <div className="max-w-xl mx-auto"><LeadIntakeForm /></div>
    ),
  },
  qualification: {
    title: "Rapid Qualification",
    subtitle: "Qualify lead for next steps",
    render: () => (
      <div className="max-w-xl mx-auto"><RapidQualificationForm /></div>
    ),
  },
  drip: {
    title: "Drip Queue",
    subtitle: "Leads in nurture campaigns",
    render: () => <DripQueueView />,
  },
  "no-response": {
    title: "No Response",
    subtitle: "Leads with failed contact attempts",
    render: () => <NoResponseView />,
  },
  idle: {
    title: "Idle Queue",
    subtitle: "Leads with no recent activity",
    render: () => <IdleQueueView />,
  },
  dormant: {
    title: "Dormant",
    subtitle: "Inactive leads for archival",
    render: () => <DormantQueueView />,
  },
  reactivation: {
    title: "Reactivation Inbox",
    subtitle: "Leads returned from sales",
    render: ({ openLead }) => <ReactivationView onOpenLead={openLead} />,
  },
  "six-month": {
    title: "6+ Month Funnel",
    subtitle: "Long-cycle nurture pool",
    render: ({ openLead }) => <SixMonthFunnelView onOpenLead={openLead} />,
  },
}

const FALLBACK_VIEW = VIEW_REGISTRY.home

// Suspense wrapper is required by Next.js when the inner component reads
// useSearchParams — otherwise the build fails for statically-rendered pages.
export default function TelecallerDashboard() {
  return (
    <Suspense fallback={<ShellSkeleton />}>
      <TelecallerDashboardInner />
    </Suspense>
  )
}

function TelecallerDashboardInner() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Source of truth: URL. Lets refresh / browser-back / bookmark / share work.
  const activeView = searchParams.get("view") ?? "home"
  const selectedLeadId = searchParams.get("leadId")

  const [searchQuery, setSearchQuery] = useState("")
  const queueCounts = useQueueCounts()

  // Stable callback identity so memoized children don't re-render needlessly.
  const setActiveView = useMemo(
    () => (view: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (view === "home") {
        params.delete("view")
        params.delete("leadId")
      } else {
        params.set("view", view)
        if (view !== "lead-detail") params.delete("leadId")
      }
      const query = params.toString()
      router.push(query ? `${pathname}?${query}` : pathname)
    },
    [pathname, router, searchParams],
  )

  const openLead = useMemo(
    () => (leadId: string) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set("view", "lead-detail")
      params.set("leadId", leadId)
      router.push(`${pathname}?${params.toString()}`)
    },
    [pathname, router, searchParams],
  )

  const view = VIEW_REGISTRY[activeView] ?? FALLBACK_VIEW
  const pageInfo = { title: view.title, subtitle: view.subtitle }
  const renderContent = () => view.render({ selectedLeadId, setActiveView, openLead })

  return (
    <SidebarProvider>
      <SidebarNav
        activeView={activeView}
        onViewChange={setActiveView}
        queueCounts={queueCounts}
      />
      <SidebarInset className="bg-background">
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between gap-4 border-b bg-card px-4 shadow-sm">
          <div className="flex items-center gap-3">
            <SidebarTrigger className="-ml-1 text-muted-foreground hover:text-foreground" />
            <Separator orientation="vertical" className="h-5" />
            <div className="min-w-0">
              <h1 className="text-sm font-semibold text-foreground truncate">{pageInfo.title}</h1>
              <p className="hidden sm:block text-[11px] text-muted-foreground truncate">{pageInfo.subtitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative hidden md:block">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search leads..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 w-64 pl-9 bg-background"
              />
            </div>

            <Button size="sm" className="gap-2 bg-success hover:bg-success/90 text-success-foreground">
              <Phone className="size-4" />
              <span className="hidden sm:inline">Quick Dial</span>
            </Button>

            <Button variant="ghost" size="icon" className="relative">
              <Bell className="size-4" />
              <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground">
                3
              </span>
            </Button>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 lg:p-6 pb-24 md:pb-6">
          <ViewErrorBoundary resetKey={activeView}>
            {renderContent()}
          </ViewErrorBoundary>
        </main>
      </SidebarInset>

      <BottomTabNav
        activeView={activeView}
        onViewChange={setActiveView}
        queueCounts={queueCounts}
      />
    </SidebarProvider>
  )
}

// Shown briefly while Next resolves searchParams. Kept inline because it's
// trivial and only used here.
function ShellSkeleton() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <div className="size-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
    </div>
  )
}
