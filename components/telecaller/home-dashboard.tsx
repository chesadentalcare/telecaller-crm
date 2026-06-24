"use client"

import { useEffect, useMemo, useState } from "react"
import { useAuth } from "@/lib/auth/AuthContext"
import { useRole } from "@/hooks/use-role"
import { useDashboardAnalytics } from "@/hooks/use-leads"
import { useQueueCounts } from "@/hooks/use-queue-counts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  Phone,
  PhoneCall,
  Users,
  TrendingUp,
  Calendar,
  Clock,
  CheckCircle2,
  Target,
  BarChart3,
  Activity,
  Zap,
  Trophy,
  Crown,
} from "lucide-react"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import { HomeHeroBanner, type HeroBannerStats } from "./home-hero-banner"

// ─── Stage label / color mappings for charts ────────────────────────
const STAGE_COLORS: Record<string, string> = {
  new_lead: "#3b82f6",
  unqualified: "#94a3b8",
  qualified: "#8b5cf6",
  rapid_qualified: "#6366f1",
  full_qualified: "#a855f7",
  meeting_scheduled: "#f59e0b",
  meeting_done: "#f97316",
  quotation_sent: "#06b6d4",
  follow_up: "#10b981",
  drip: "#64748b",
  requalification: "#eab308",
  no_response: "#ef4444",
  idle: "#9ca3af",
  dormant: "#6b7280",
  six_month_funnel: "#14b8a6",
  closed_won: "#22c55e",
  closed_lost: "#ef4444",
}

const STAGE_LABELS: Record<string, string> = {
  new_lead: "New Lead",
  unqualified: "Unqualified",
  qualified: "Qualified",
  rapid_qualified: "Rapid Qualified",
  full_qualified: "Full Qualified",
  meeting_scheduled: "Meeting Set",
  meeting_done: "Meeting Done",
  quotation_sent: "Quote Sent",
  follow_up: "Follow Up",
  drip: "Drip",
  requalification: "Re-qualification",
  no_response: "No Response",
  idle: "Idle",
  dormant: "Dormant",
  six_month_funnel: "6+ Month",
  closed_won: "Won",
  closed_lost: "Lost",
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

interface HomeDashboardProps {
  onNavigate?: (view: string) => void
}

export function HomeDashboard({ onNavigate }: HomeDashboardProps = {}) {
  const { user } = useAuth()
  const { isManagerOrAbove } = useRole()
  const { data: analytics, isLoading } = useDashboardAnalytics()
  const queueCounts = useQueueCounts()

  const firstName =
    (user?.fullName?.split(/\s+/)[0]) || user?.username || "there"

  const [now, setNow] = useState<Date | null>(null)

  useEffect(() => {
    setNow(new Date())
    const interval = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(interval)
  }, [])

  // Derive chart data from analytics response
  const callsData = analytics?.weekly ?? []

  const pipelineDistribution = useMemo(() => {
    if (!analytics?.pipeline?.stages) return []
    return Object.entries(analytics.pipeline.stages).map(([stage, count]) => ({
      name: STAGE_LABELS[stage] || stage,
      value: count,
      color: STAGE_COLORS[stage] || "#6b7280",
    }))
  }, [analytics?.pipeline?.stages])

  const conversionData = useMemo(() => {
    if (!analytics?.pipeline?.stages) return []
    const funnelOrder = ["new_lead", "qualified", "meeting_scheduled", "meeting_done", "quotation_sent", "closed_won"]
    return funnelOrder
      .filter(s => (analytics.pipeline.stages[s] ?? 0) > 0)
      .map((stage, i) => ({
        stage: STAGE_LABELS[stage] || stage,
        value: analytics.pipeline.stages[stage] ?? 0,
        fill: `hsl(var(--chart-${(i % 5) + 1}))`,
      }))
  }, [analytics?.pipeline?.stages])

  const recentActivity = analytics?.recentActivity ?? []

  if (isLoading) return <HomeDashboardSkeleton />

  const hour = now?.getHours() ?? 0
  const greeting =
    now === null
      ? "Hello"
      : hour < 12
        ? "Good Morning"
        : hour < 17
          ? "Good Afternoon"
          : "Good Evening"

  const timeLabel =
    now?.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) ?? "--:--"

  const today = analytics?.today ?? { totalCalls: 0, connected: 0, noAnswer: 0, meetings: 0, conversions: 0 }
  const targetCalls = 60
  const todayStats = {
    totalCalls: today.totalCalls,
    connected: today.connected,
    meetings: today.meetings,
    conversions: today.conversions,
    targetCalls,
  }

  const closures = analytics?.closures ?? { won: 0, lost: 0 }
  const quotations = analytics?.quotations ?? { total: 0, sent: 0, read: 0, pipelineValue: 0 }
  const pipelineTotal = analytics?.pipeline?.total ?? 0

  // Real figures fed to the rotating hero banner so its slides reflect the
  // logged-in user's live workload instead of hardcoded placeholders.
  // hotLeads uses the qualified-stage count as a proxy (no dedicated "<30 day"
  // bucket exists); recovery/drip come from the live queue counts.
  const heroStats: HeroBannerStats = {
    hotLeads: analytics?.pipeline?.stages?.qualified ?? 0,
    noResponse: queueCounts.noResponse,
    drip: queueCounts.drip,
    callsToday: todayStats.totalCalls,
    callTarget: todayStats.targetCalls,
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header — flex-wrap so badges drop below greeting on
          tight screens instead of overflowing. min-w-0 + truncate keeps
          long names/subtitles from pushing badges off-screen. */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-xl font-bold text-foreground sm:text-2xl">{greeting}, {firstName}</h2>
          <p className="truncate text-sm text-muted-foreground">
            {isManagerOrAbove ? "Team performance overview" : "Here\u0027s your performance overview for today"}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Badge variant="outline" className="gap-1 py-1.5 px-3">
            <Clock className="size-3.5" />
            <span className="font-medium">{timeLabel}</span>
          </Badge>
          <Badge className="gap-1 py-1.5 px-3 bg-success text-success-foreground">
            <Zap className="size-3.5" />
            <span className="font-medium">Online</span>
          </Badge>
        </div>
      </div>

      {/* Rotating hero banner — auto-advances every 5s, pause on hover.
          Fed real per-user figures so slides reflect live workload. */}
      <HomeHeroBanner onNavigate={onNavigate} stats={heroStats} />

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Calls */}
        <Card className="relative overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                <Phone className="size-5 text-primary" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-bold">{todayStats.totalCalls}</p>
              <p className="text-xs text-muted-foreground">Total Calls Today</p>
            </div>
            <Progress value={todayStats.targetCalls > 0 ? (todayStats.totalCalls / todayStats.targetCalls) * 100 : 0} className="mt-3 h-1.5" />
            <p className="text-[10px] text-muted-foreground mt-1">{Math.max(0, todayStats.targetCalls - todayStats.totalCalls)} more to reach target</p>
          </CardContent>
        </Card>

        {/* Connected Calls */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex size-10 items-center justify-center rounded-lg bg-success/10">
                <PhoneCall className="size-5 text-success" />
              </div>
              <div className="text-right">
                <span className="text-lg font-bold text-success">
                  {todayStats.totalCalls > 0 ? Math.round((todayStats.connected / todayStats.totalCalls) * 100) : 0}%
                </span>
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-bold">{todayStats.connected}</p>
              <p className="text-xs text-muted-foreground">Connected Calls</p>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-success rounded-full" style={{ width: `${todayStats.totalCalls > 0 ? (todayStats.connected / todayStats.totalCalls) * 100 : 0}%` }} />
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">{todayStats.totalCalls - todayStats.connected} missed/no answer</p>
          </CardContent>
        </Card>

        {/* Meetings This Week */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex size-10 items-center justify-center rounded-lg bg-chart-3/10">
                <Calendar className="size-5 text-chart-3" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-bold">{todayStats.meetings}</p>
              <p className="text-xs text-muted-foreground">Meetings This Week</p>
            </div>
            <div className="mt-3 flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className={`h-1.5 flex-1 rounded-full ${i <= todayStats.meetings ? 'bg-chart-3' : 'bg-muted'}`}
                />
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">Target: 5 meetings/week</p>
          </CardContent>
        </Card>

        {/* Conversions */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex size-10 items-center justify-center rounded-lg bg-chart-5/10">
                <CheckCircle2 className="size-5 text-chart-5" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-bold">{todayStats.conversions}</p>
              <p className="text-xs text-muted-foreground">Conversions (Won)</p>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <Target className="size-3.5 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground">Monthly: {closures.won} won / {closures.lost} lost</span>
            </div>
            {quotations.pipelineValue > 0 && (
              <p className="text-[10px] text-success mt-1">Pipeline: ₹{(quotations.pipelineValue / 100000).toFixed(1)}L</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Call Activity Chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Call Activity</CardTitle>
                <CardDescription>Daily calls vs connected this week</CardDescription>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="size-2.5 rounded-full bg-primary" />
                  <span className="text-muted-foreground">Total Calls</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="size-2.5 rounded-full bg-success" />
                  <span className="text-muted-foreground">Connected</span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={callsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="callsGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="connectedGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} className="text-muted-foreground" />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} className="text-muted-foreground" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="calls"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    fill="url(#callsGradient)"
                  />
                  <Area
                    type="monotone"
                    dataKey="connected"
                    stroke="hsl(var(--success))"
                    strokeWidth={2}
                    fill="url(#connectedGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Pipeline Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Pipeline Distribution</CardTitle>
            <CardDescription>Lead temperature breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[140px] flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pipelineDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={60}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pipelineDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 mt-2">
              {pipelineDistribution.map((item) => (
                <div key={item.name} className="flex items-center gap-1.5 text-xs">
                  <div className="size-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-muted-foreground">{item.name}</span>
                  <span className="font-medium">{item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Conversion Funnel */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="size-4 text-primary" />
              Conversion Funnel
            </CardTitle>
            <CardDescription>This month&apos;s pipeline progress</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={conversionData} layout="vertical" margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <XAxis type="number" hide />
                  <YAxis
                    dataKey="stage"
                    type="category"
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    width={80}
                    className="text-muted-foreground"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="size-4 text-primary" />
                  Recent Activity
                </CardTitle>
                <CardDescription>{isManagerOrAbove ? "Team\u0027s latest actions" : "Your latest actions"}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y max-h-[220px] overflow-auto">
              {recentActivity.length === 0 ? (
                <p className="px-4 py-6 text-center text-xs text-muted-foreground">No recent activity</p>
              ) : (
                recentActivity.map((a, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 transition-colors">
                    <div className={`size-8 rounded-full flex items-center justify-center ${
                      a.type === 'call' && (a.result === 'no_answer' || a.result === 'phone_off')
                        ? 'bg-destructive/10 text-destructive'
                        : 'bg-success/10 text-success'
                    }`}>
                      {a.type === 'call' ? <Phone className="size-3.5" /> : <Calendar className="size-3.5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{a.leadName}</p>
                      <p className="text-[11px] text-muted-foreground">{a.type === 'call' ? 'Called' : 'Meeting'} — {a.result?.replace(/_/g, ' ')}</p>
                    </div>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">{timeAgo(a.time)}</span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quotation & SLA Stats */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="size-4 text-primary" />
              Quotation & SLA
            </CardTitle>
            <CardDescription>This month&apos;s quotation performance</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border p-3">
                <p className="text-[11px] text-muted-foreground">Quotes Sent</p>
                <p className="text-xl font-bold">{quotations.sent}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-[11px] text-muted-foreground">Quotes Read</p>
                <p className="text-xl font-bold">{quotations.read}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-[11px] text-muted-foreground">Total Quotes</p>
                <p className="text-xl font-bold">{quotations.total}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-[11px] text-muted-foreground">SLA Breaches</p>
                <p className="text-xl font-bold text-destructive">
                  {(analytics?.sla?.summaryBreaches ?? 0) + (analytics?.sla?.quoteBreaches ?? 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Team Leaderboard — manager/admin only */}
      {isManagerOrAbove && analytics?.teamBreakdown && analytics.teamBreakdown.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Crown className="size-4 text-amber-500" />
              Team Leaderboard
            </CardTitle>
            <CardDescription>Today&apos;s telecaller performance at a glance</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">#</th>
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">Telecaller</th>
                    <th className="px-4 py-2 text-center font-medium text-muted-foreground">Leads</th>
                    <th className="px-4 py-2 text-center font-medium text-muted-foreground">Calls Today</th>
                    <th className="px-4 py-2 text-center font-medium text-muted-foreground">Connected</th>
                    <th className="px-4 py-2 text-center font-medium text-muted-foreground">Meetings</th>
                    <th className="px-4 py-2 text-center font-medium text-muted-foreground">Won</th>
                    <th className="px-4 py-2 text-center font-medium text-muted-foreground">Lost</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {analytics.teamBreakdown.map((t, i) => (
                    <tr key={t.username} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-2.5 font-medium">
                        {i === 0 ? <Trophy className="size-3.5 text-amber-500 inline" /> : i + 1}
                      </td>
                      <td className="px-4 py-2.5 font-medium">{t.username}</td>
                      <td className="px-4 py-2.5 text-center">{t.totalLeads}</td>
                      <td className="px-4 py-2.5 text-center font-semibold">{t.callsToday}</td>
                      <td className="px-4 py-2.5 text-center">
                        <span className="text-success font-semibold">{t.connectedToday}</span>
                        {t.callsToday > 0 && (
                          <span className="text-muted-foreground ml-1">
                            ({Math.round((t.connectedToday / t.callsToday) * 100)}%)
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-center">{t.meetingsWeek}</td>
                      <td className="px-4 py-2.5 text-center text-success font-semibold">{t.won}</td>
                      <td className="px-4 py-2.5 text-center text-destructive">{t.lost}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Stats Footer */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="py-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              <div className="flex items-center gap-2">
                <Users className="size-4 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">Total Pipeline</p>
                  <p className="text-sm font-semibold">{pipelineTotal} leads</p>
                </div>
              </div>
              <div className="hidden sm:block w-px h-8 bg-border" />
              <div className="flex items-center gap-2">
                <TrendingUp className="size-4 text-success" />
                <div>
                  <p className="text-xs text-muted-foreground">Closures This Month</p>
                  <p className="text-sm font-semibold">{closures.won} won / {closures.lost} lost</p>
                </div>
              </div>
              {quotations.pipelineValue > 0 && (
                <>
                  <div className="hidden sm:block w-px h-8 bg-border" />
                  <div className="flex items-center gap-2">
                    <Target className="size-4 text-primary" />
                    <div>
                      <p className="text-xs text-muted-foreground">Pipeline Value</p>
                      <p className="text-sm font-semibold">₹{(quotations.pipelineValue / 100000).toFixed(1)}L</p>
                    </div>
                  </div>
                </>
              )}
            </div>
            <Button size="sm" className="gap-2" onClick={() => onNavigate?.("pipeline")}>
              <Phone className="size-4" />
              Start Calling
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Skeleton placeholder ───────────────────────────────────────────────
// Mirrors HomeDashboard's layout so the page doesn't jump when content arrives.
function HomeDashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-7 w-24" />
          <Skeleton className="h-7 w-20" />
        </div>
      </div>

      {/* KPI cards row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <CardContent className="p-4 space-y-3">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-3 w-28" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Two charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-3 w-56" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-56 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Lists row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <Skeleton className="h-5 w-44" />
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-9 w-9 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <Skeleton className="h-6 w-14" />
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-2">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-2/3" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
                <Skeleton className="h-6 w-16" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Bottom action bar */}
      <Card>
        <CardContent className="flex items-center justify-between p-4">
          <div className="flex items-center gap-6">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-px" />
            <Skeleton className="h-8 w-28" />
          </div>
          <Skeleton className="h-9 w-28" />
        </CardContent>
      </Card>
    </div>
  )
}
