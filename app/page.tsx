"use client"

import { useState } from "react"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { SidebarNav } from "@/components/telecaller/sidebar-nav"
import { BottomTabNav } from "@/components/telecaller/bottom-tab-nav"
import { LeadIntakeForm } from "@/components/telecaller/lead-intake-form"
import { LeadDetailView } from "@/components/telecaller/lead-detail-view"
import { RapidQualificationForm } from "@/components/telecaller/rapid-qualification-form"
import { DripQueueView } from "@/components/telecaller/drip-queue-view"
import { PipelineView } from "@/components/telecaller/pipeline-view"
import { HomeDashboard } from "@/components/telecaller/home-dashboard"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  Search,
  Bell,
  Phone,
  PhoneOff,
  Clock,
  Archive,
  Plus,
  RefreshCw,
  Inbox,
  CalendarClock,
  RotateCcw,
} from "lucide-react"

export default function TelecallerDashboard() {
  const [activeView, setActiveView] = useState("home")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null)

  // Helper that any list/queue can call to open a lead's detail page.
  const openLead = (leadId: string) => {
    setSelectedLeadId(leadId)
    setActiveView("lead-detail")
  }
  
  const queueCounts = {
    pipeline: 12,
    noResponse: 4,
    drip: 8,
    idle: 3,
    dormant: 2,
    reactivation: 2,    // leads handed back from sales — Gap #8
    sixMonth: 5,        // 6+ month funnel sub-state — Gap #11
  }

  const renderContent = () => {
    switch (activeView) {
      case "home":
        return <HomeDashboard />
      case "pipeline":
        return <PipelineView onOpenLead={openLead} />
      case "lead-detail":
        return (
          <LeadDetailView
            leadId={selectedLeadId ?? undefined}
            onBack={() => setActiveView("pipeline")}
          />
        )
      case "new-lead":
        return (
          <div className="max-w-xl mx-auto">
            <LeadIntakeForm />
          </div>
        )
      case "qualification":
        return (
          <div className="max-w-xl mx-auto">
            <RapidQualificationForm />
          </div>
        )
      case "drip":
        return <DripQueueView />
      case "no-response":
        return <NoResponseView />
      case "idle":
        return <IdleQueueView />
      case "dormant":
        return <DormantQueueView />
      case "reactivation":
        return <ReactivationView onOpenLead={openLead} />
      case "six-month":
        return <SixMonthFunnelView onOpenLead={openLead} />
      default:
        return <HomeDashboard />
    }
  }

  const getPageInfo = () => {
    const pages: Record<string, { title: string; subtitle: string }> = {
      home: { title: "Dashboard", subtitle: "Analytics & performance overview" },
      pipeline: { title: "Pipeline", subtitle: "Active leads ready for calls" },
      "lead-detail": { title: "Lead Detail", subtitle: "Full lifecycle view" },
      "new-lead": { title: "Add New Lead", subtitle: "Capture lead information" },
      qualification: { title: "Rapid Qualification", subtitle: "Qualify lead for next steps" },
      drip: { title: "Drip Queue", subtitle: "Leads in nurture campaigns" },
      "no-response": { title: "No Response", subtitle: "Leads with failed contact attempts" },
      idle: { title: "Idle Queue", subtitle: "Leads with no recent activity" },
      dormant: { title: "Dormant", subtitle: "Inactive leads for archival" },
      reactivation: { title: "Reactivation Inbox", subtitle: "Leads returned from sales" },
      "six-month": { title: "6+ Month Funnel", subtitle: "Long-cycle nurture pool" },
    }
    return pages[activeView] || pages.pipeline
  }

  const pageInfo = getPageInfo()

  return (
    <SidebarProvider>
      <SidebarNav 
        activeView={activeView} 
        onViewChange={setActiveView}
        queueCounts={queueCounts}
      />
      <SidebarInset className="bg-background">
        {/* Top Header Bar */}
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
            {/* Search */}
            <div className="relative hidden md:block">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search leads..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 w-64 pl-9 bg-background"
              />
            </div>

            {/* Quick Call Button */}
            <Button size="sm" className="gap-2 bg-success hover:bg-success/90 text-success-foreground">
              <Phone className="size-4" />
              <span className="hidden sm:inline">Quick Dial</span>
            </Button>

            {/* Notifications */}
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="size-4" />
              <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground">
                3
              </span>
            </Button>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-auto p-4 lg:p-6 pb-24 md:pb-6">
          {renderContent()}
        </main>
      </SidebarInset>

      {/* Mobile-only bottom tab navigation. Hidden on md+ — desktop uses the sidebar. */}
      <BottomTabNav
        activeView={activeView}
        onViewChange={setActiveView}
        queueCounts={queueCounts}
      />
    </SidebarProvider>
  )
}

// No Response Queue View
function NoResponseView() {
  const leads = [
    { id: "1", name: "Dr. Neha Gupta", phone: "9123456780", attempts: 5, lastAttempt: "30 min ago", equipment: "X-Ray Unit" },
    { id: "2", name: "Dr. Rahul Mehta", phone: "9876123456", attempts: 4, lastAttempt: "2 hours ago", equipment: "Dental Chair" },
    { id: "3", name: "Dr. Priya Sharma", phone: "9567891234", attempts: 6, lastAttempt: "1 day ago", equipment: "Autoclave" },
    { id: "4", name: "Dr. Amit Patel", phone: "9432198765", attempts: 4, lastAttempt: "3 hours ago", equipment: "Compressor" },
  ]

  return (
    <div className="space-y-4">
      {/* Recovery Actions */}
      <Card className="border-warning/30 bg-warning/5">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-warning/20">
              <PhoneOff className="size-5 text-warning" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">{leads.length} leads need recovery</p>
              <p className="text-xs text-muted-foreground">Send bulk WhatsApp to all or call individually</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-2">
              <RefreshCw className="size-3.5" />
              Retry All
            </Button>
            <Button size="sm" className="gap-2 bg-[#25D366] hover:bg-[#128C7E] text-white">
              <svg className="size-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              Bulk WhatsApp
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Leads List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Failed Contact Attempts</CardTitle>
          <CardDescription>Leads with 4+ failed call attempts</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {leads.map((lead) => (
              <div key={lead.id} className="flex flex-wrap items-center justify-between gap-3 p-4 hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="flex size-10 items-center justify-center rounded-full bg-destructive/10 text-destructive font-medium text-sm">
                    {lead.name.split(" ").map(n => n[0]).join("")}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{lead.name}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{lead.phone}</span>
                      <span>•</span>
                      <span>{lead.equipment}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 text-[10px]">
                      {lead.attempts} attempts
                    </Badge>
                    <p className="text-[10px] text-muted-foreground mt-1">Last: {lead.lastAttempt}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="size-8">
                      <Phone className="size-4 text-success" />
                    </Button>
                    <Button variant="ghost" size="icon" className="size-8">
                      <svg className="size-4 text-[#25D366]" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                      </svg>
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Idle Queue View  
function IdleQueueView() {
  const leads = [
    { id: "1", name: "Dr. Kavita Singh", phone: "9876123450", idleDays: 12, lastActivity: "Viewed proposal", equipment: "Imaging System" },
    { id: "2", name: "Dr. Suresh Patel", phone: "9123456789", idleDays: 8, lastActivity: "Email opened", equipment: "Dental Chair" },
    { id: "3", name: "Dr. Meena Reddy", phone: "9567891234", idleDays: 15, lastActivity: "Call scheduled", equipment: "X-Ray Unit" },
  ]

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="size-4 text-warning" />
              Idle Leads
            </CardTitle>
            <CardDescription>No activity in the last 7+ days</CardDescription>
          </div>
          <Button variant="outline" size="sm" className="gap-2">
            <Plus className="size-3.5" />
            Add to Drip
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {leads.map((lead) => (
            <div key={lead.id} className="flex flex-wrap items-center justify-between gap-3 p-4 hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-4">
                <div className="flex size-10 items-center justify-center rounded-full bg-warning/10 text-warning font-medium text-sm">
                  {lead.name.split(" ").map(n => n[0]).join("")}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{lead.name}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{lead.phone}</span>
                    <span>•</span>
                    <span>{lead.equipment}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30 text-[10px]">
                    {lead.idleDays} days idle
                  </Badge>
                  <p className="text-[10px] text-muted-foreground mt-1">{lead.lastActivity}</p>
                </div>
                <Button variant="outline" size="sm">Follow Up</Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// Dormant Queue View
function DormantQueueView() {
  const leads = [
    { id: "1", name: "Dr. Rajesh Sharma", phone: "9876543210", dormantDays: 92, reason: "Budget constraints" },
    { id: "2", name: "Dr. Anita Verma", phone: "9123456780", dormantDays: 78, reason: "Went silent" },
  ]

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Archive className="size-4 text-muted-foreground" />
              Dormant Leads
            </CardTitle>
            <CardDescription>Inactive for 60+ days - consider archiving</CardDescription>
          </div>
          <Button variant="outline" size="sm" className="text-muted-foreground">
            Archive All
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {leads.map((lead) => (
            <div key={lead.id} className="flex flex-wrap items-center justify-between gap-3 p-4 hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-4">
                <div className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground font-medium text-sm">
                  {lead.name.split(" ").map(n => n[0]).join("")}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{lead.name}</p>
                  <p className="text-xs text-muted-foreground">{lead.phone}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <Badge variant="outline" className="bg-muted text-muted-foreground text-[10px]">
                    {lead.dormantDays} days
                  </Badge>
                  <p className="text-[10px] text-muted-foreground mt-1">{lead.reason}</p>
                </div>
                <div className="flex gap-1">
                  <Button variant="outline" size="sm">Revive</Button>
                  <Button variant="ghost" size="sm" className="text-muted-foreground">Archive</Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Gap #8: Reactivation Inbox — leads handed back from sales ──────────
function ReactivationView({ onOpenLead }: { onOpenLead: (id: string) => void }) {
  const leads = [
    {
      id: "R-1",
      name: "Dr. Manish Joshi",
      phone: "9001122334",
      handedBackAt: "2 days ago",
      handedBackBy: "Ravi Kumar",
      reason: "Customer asked to follow up in 3 months — budget cycle starts in Q3",
    },
    {
      id: "R-2",
      name: "Dr. Sneha Iyer",
      phone: "9665544332",
      handedBackAt: "5 hours ago",
      handedBackBy: "Anita Verma",
      reason: "Lost competitor; revisit when their AMC expires",
    },
  ]

  return (
    <div className="space-y-4">
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-primary/15">
              <RotateCcw className="size-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">{leads.length} leads returned from sales</p>
              <p className="text-xs text-muted-foreground">Re-assume ownership and decide next step</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Inbox className="size-4 text-primary" />
                Reactivation Inbox
              </CardTitle>
              <CardDescription>Leads bounced back from sales for telecaller follow-up</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {leads.map((lead) => (
              <div key={lead.id} className="flex flex-wrap items-start justify-between gap-3 p-4 hover:bg-muted/50 transition-colors">
                <div className="flex items-start gap-4 min-w-0 flex-1">
                  <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary font-medium text-sm shrink-0">
                    {lead.name.split(" ").slice(-2).map((n) => n[0]).join("")}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{lead.name}</p>
                    <p className="text-xs text-muted-foreground">{lead.phone}</p>
                    <p className="mt-1.5 text-xs">
                      <span className="text-muted-foreground">From {lead.handedBackBy} · {lead.handedBackAt}: </span>
                      <span className="text-foreground">{lead.reason}</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => onOpenLead(lead.id)}>
                    Open
                  </Button>
                  <Button size="sm">Assume Ownership</Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Gap #11: 6+ Month Funnel — long-cycle nurture pool ─────────────────
function SixMonthFunnelView({ onOpenLead }: { onOpenLead: (id: string) => void }) {
  const leads = [
    { id: "F-1", name: "Dr. Tanvi Bose", phone: "9442211009", reactivateBy: "Aug 2026", source: "Reactivated", reason: "Budget Q3" },
    { id: "F-2", name: "Dr. Praveen Nair", phone: "9112233445", reactivateBy: "Jul 2026", source: "Cold-cycle drip exit", reason: "Long timeline" },
    { id: "F-3", name: "Dr. Vinod Menon", phone: "9221100887", reactivateBy: "Sep 2026", source: "Reactivated", reason: "AMC expiry" },
    { id: "F-4", name: "Dr. Lata Kulkarni", phone: "9778899001", reactivateBy: "Dec 2026", source: "Reactivated", reason: "New clinic Q4" },
    { id: "F-5", name: "Dr. Rakesh Pillai", phone: "9554433221", reactivateBy: "Oct 2026", source: "Cold-cycle drip exit", reason: "Watching market" },
  ]

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarClock className="size-4 text-violet-500" />
              6+ Month Funnel
            </CardTitle>
            <CardDescription>Long-cycle leads — surface when their reactivation window opens</CardDescription>
          </div>
          <Badge variant="outline" className="text-[10px]">{leads.length} in funnel</Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {leads.map((lead) => (
            <div key={lead.id} className="flex flex-wrap items-center justify-between gap-3 p-4 hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-4 min-w-0">
                <div className="flex size-10 items-center justify-center rounded-full bg-violet-500/10 text-violet-600 font-medium text-sm shrink-0">
                  {lead.name.split(" ").slice(-2).map((n) => n[0]).join("")}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{lead.name}</p>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                    <span>{lead.phone}</span>
                    <span>•</span>
                    <span>{lead.source}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <Badge variant="outline" className="bg-violet-500/10 text-violet-700 border-violet-500/30 text-[10px]">
                    Reactivate by {lead.reactivateBy}
                  </Badge>
                  <p className="text-[10px] text-muted-foreground mt-1">{lead.reason}</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => onOpenLead(lead.id)}>Open</Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
