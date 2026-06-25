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
import { useRole } from "@/hooks/use-role"
import { useLeadFullDetail } from "@/hooks/use-leads"
import type { UserRole } from "@/lib/auth/token"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, Phone, UserPlus } from "lucide-react"
import { NotificationBell } from "@/components/telecaller/notification-bell"
import { AuthGate } from "@/components/auth/auth-gate"
import { UserMenu } from "@/components/auth/user-menu"

// ─── Lazy-loaded views ──────────────────────────────────────────────────
// Each view is split into its own chunk so the initial bundle only contains
// the shell + the active view. Switching tabs fetches the chunk on demand;
// `ViewSkeleton` covers the load. `ssr: false` is safe here — these views
// are client-only and use browser APIs.
const HomeDashboard = dynamic(
  () => import("@/components/telecaller/home-dashboard").then((m) => ({ default: m.HomeDashboard })),
  { loading: () => <ViewSkeleton /> },
)
const PipelineHub = dynamic(
  () => import("@/components/telecaller/pipeline-hub").then((m) => ({ default: m.PipelineHub })),
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
const RequalificationView = dynamic(
  () => import("@/components/telecaller/requalification-view").then((m) => ({ default: m.RequalificationView })),
  { loading: () => <ViewSkeleton /> },
)
const ArchivedView = dynamic(
  () => import("@/components/telecaller/archived-view").then((m) => ({ default: m.ArchivedView })),
  { loading: () => <ViewSkeleton /> },
)
const CallsDueView = dynamic(
  () => import("@/components/telecaller/calls-due-view").then((m) => ({ default: m.CallsDueView })),
  { loading: () => <ViewSkeleton /> },
)
const PendingApprovalsView = dynamic(
  () => import("@/components/telecaller/pending-approvals"),
  { loading: () => <ViewSkeleton /> },
)
const SalesPipelineView = dynamic(
  () => import("@/components/telecaller/sales-pipeline-view").then((m) => ({ default: m.SalesPipelineView })),
  { loading: () => <ViewSkeleton /> },
)
const FlowOversightView = dynamic(
  () => import("@/components/telecaller/flow-oversight-view").then((m) => ({ default: m.FlowOversightView })),
  { loading: () => <ViewSkeleton /> },
)

// Wraps RapidQualificationForm so the screen header can confirm *which* lead
// is being qualified. The form supports a `lead` prop but the registry only
// has the leadId from the URL, so we fetch the extension here and map it.
function RapidQualificationScreen({ leadId }: { leadId?: string }) {
  const { data: detail } = useLeadFullDetail(leadId)
  const ext = detail?.extension
  const lead = ext
    ? {
        name: ext.customer_name ?? `Lead #${ext.opportunity_doc_entry}`,
        phone: ext.phone ?? "",
        equipment: ext.equipment_interest ?? "",
      }
    : undefined
  return <RapidQualificationForm leadId={leadId} lead={lead} />
}

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
  /** Roles allowed to open this view. Omitted/undefined ⇒ visible to all roles. */
  roles?: UserRole[]
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
    subtitle: "Your full book of leads — switch segments to filter",
    render: ({ openLead }) => <PipelineHub onOpenLead={openLead} />,
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
      <div className="max-w-4xl mx-auto"><LeadIntakeForm /></div>
    ),
  },
  qualification: {
    title: "Rapid Qualification",
    subtitle: "Qualify lead for next steps",
    render: ({ selectedLeadId }) => (
      <div className="max-w-xl mx-auto">
        <RapidQualificationScreen leadId={selectedLeadId ?? undefined} />
      </div>
    ),
  },
  drip: {
    title: "Drip Queue",
    subtitle: "Leads in nurture campaigns",
    render: ({ openLead }) => <DripQueueView onOpenLead={openLead} />,
  },
  "no-response": {
    title: "No Response",
    subtitle: "Leads with failed contact attempts",
    render: ({ openLead }) => <NoResponseView onOpenLead={openLead} />,
  },
  idle: {
    title: "Idle Queue",
    subtitle: "Leads with no recent activity",
    render: () => <IdleQueueView />,
  },
  dormant: {
    title: "Dormant",
    subtitle: "Inactive leads for archival",
    render: ({ openLead }) => <DormantQueueView onOpenLead={openLead} />,
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
  "calls-due": {
    title: "Calls Due",
    subtitle: "Your call worklist",
    roles: ["telecaller"],
    render: ({ openLead }) => <CallsDueView onOpenLead={openLead} />,
  },
  requalification: {
    title: "Re-qualification",
    subtitle: "Re-surfaced leads needing a fresh capture",
    roles: ["telecaller"],
    render: ({ openLead }) => <RequalificationView onOpenLead={openLead} />,
  },
  archived: {
    title: "Archived",
    subtitle: "Filed leads (re-open on inbound)",
    render: ({ openLead }) => <ArchivedView onOpenLead={openLead} />,
  },
  approvals: {
    title: "Pending Approvals",
    subtitle: "Discount requests awaiting review",
    roles: ["manager", "admin"],
    render: () => <PendingApprovalsView />,
  },
  "sales-pipeline": {
    title: "Sales Pipeline",
    subtitle: "Leads handed over for quotation & closure",
    roles: ["sale_staff", "coordinator", "sale_head", "manager", "admin"],
    render: ({ openLead }) => <SalesPipelineView onOpenLead={openLead} />,
  },
  "flow-oversight": {
    title: "Flow Oversight",
    subtitle: "Team-wide lead-flow analytics & engine health",
    roles: ["manager", "admin"],
    render: () => <FlowOversightView />,
  },
}

const FALLBACK_VIEW = VIEW_REGISTRY.home

// Suspense wrapper is required by Next.js when the inner component reads
// useSearchParams — otherwise the build fails for statically-rendered pages.
export default function TelecallerDashboard() {
  return (
    <AuthGate>
      <Suspense fallback={<ShellSkeleton />}>
        <TelecallerDashboardInner />
      </Suspense>
    </AuthGate>
  )
}

function TelecallerDashboardInner() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [searchQuery, setSearchQuery] = useState("")
  const queueCounts = useQueueCounts()
  const { role, hasRole, isManagerOrAbove } = useRole()

  // Worklist-first: a pure telecaller lands on Calls Due (where fresh leads now
  // appear), not the analytics dashboard. Everyone else defaults to Home.
  const defaultView = role === "telecaller" && !isManagerOrAbove ? "calls-due" : "home"
  // Source of truth: URL. Lets refresh / browser-back / bookmark / share work.
  const activeView = searchParams.get("view") ?? defaultView
  const selectedLeadId = searchParams.get("leadId")

  // Stable callback identity so memoized children don't re-render needlessly.
  const setActiveView = useMemo(
    () => (view: string) => {
      const params = new URLSearchParams(searchParams.toString())
      // `home` is kept EXPLICIT in the URL (not cleared) — telecallers default to
      // Calls Due on a bare URL, so clearing `view` would bounce them off the
      // Dashboard right back to Calls Due. Explicit ?view=home lets Home stick.
      params.set("view", view)
      if (view !== "lead-detail") params.delete("leadId")
      if (view !== "pipeline") params.delete("segment")
      router.push(`${pathname}?${params.toString()}`)
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

  const requested = VIEW_REGISTRY[activeView]
  // Role-gated views fall back to home when the user lacks the required role, so
  // a deep-link can't expose them. Managers/admins can view everything (the
  // sidebar already shows them every item) — without this, opening a
  // telecaller-only view (e.g. Calls Due) as an admin silently showed the Home
  // dashboard instead.
  const view =
    requested && (!requested.roles || isManagerOrAbove || (role !== null && hasRole(...requested.roles)))
      ? requested
      : FALLBACK_VIEW
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

            {(isManagerOrAbove || (role !== null && hasRole("telecaller"))) && (
              <Button
                size="sm"
                variant="outline"
                className="gap-2"
                onClick={() => setActiveView("new-lead")}
              >
                <UserPlus className="size-4" />
                <span className="hidden sm:inline">New Lead</span>
              </Button>
            )}

            <Button
              size="sm"
              className="gap-2 bg-success hover:bg-success/90 text-success-foreground"
              onClick={() => setActiveView("calls-due")}
            >
              <Phone className="size-4" />
              <span className="hidden sm:inline">Quick Dial</span>
            </Button>

            <NotificationBell />

            <UserMenu />
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
