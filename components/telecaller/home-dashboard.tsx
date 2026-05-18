"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth/AuthContext"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  Phone,
  PhoneCall,
  PhoneOff,
  Users,
  TrendingUp,
  TrendingDown,
  Calendar,
  Clock,
  CheckCircle2,
  Target,
  Timer,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  Activity,
  Zap,
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
import { HomeHeroBanner } from "./home-hero-banner"

// Mock data for charts
const callsData = [
  { day: "Mon", calls: 45, connected: 32 },
  { day: "Tue", calls: 52, connected: 38 },
  { day: "Wed", calls: 48, connected: 35 },
  { day: "Thu", calls: 61, connected: 44 },
  { day: "Fri", calls: 55, connected: 40 },
  { day: "Sat", calls: 30, connected: 22 },
  { day: "Sun", calls: 15, connected: 10 },
]

const conversionData = [
  { stage: "New Leads", value: 45, fill: "hsl(var(--chart-1))" },
  { stage: "Qualified", value: 28, fill: "hsl(var(--chart-2))" },
  { stage: "Meeting Set", value: 15, fill: "hsl(var(--chart-3))" },
  { stage: "Demo Done", value: 8, fill: "hsl(var(--chart-4))" },
  { stage: "Converted", value: 5, fill: "hsl(var(--chart-5))" },
]

const pipelineDistribution = [
  { name: "Hot", value: 12, color: "#ef4444" },
  { name: "Warm", value: 18, color: "#f59e0b" },
  { name: "Cold", value: 8, color: "#6b7280" },
]

const recentActivity = [
  { id: 1, action: "Called", lead: "Dr. Neha Gupta", result: "Meeting Scheduled", time: "5 min ago", status: "success" },
  { id: 2, action: "WhatsApp sent", lead: "Dr. Rahul Mehta", result: "Message delivered", time: "12 min ago", status: "success" },
  { id: 3, action: "Called", lead: "Dr. Priya Sharma", result: "No answer", time: "18 min ago", status: "failed" },
  { id: 4, action: "Qualified", lead: "Dr. Amit Patel", result: "Added to drip", time: "25 min ago", status: "success" },
  { id: 5, action: "Called", lead: "Dr. Kavita Singh", result: "Call back later", time: "32 min ago", status: "pending" },
]

const topLeads = [
  { id: 1, name: "Dr. Suresh Verma", city: "Mumbai", interest: "X-Ray Unit", value: "₹4.5L", score: 92 },
  { id: 2, name: "Dr. Meena Reddy", city: "Bangalore", interest: "Dental Chair", value: "₹2.8L", score: 88 },
  { id: 3, name: "Dr. Rajesh Kumar", city: "Delhi", interest: "Autoclave", value: "₹1.2L", score: 85 },
]

interface HomeDashboardProps {
  onNavigate?: (view: string) => void
}

export function HomeDashboard({ onNavigate }: HomeDashboardProps = {}) {
  const { user } = useAuth()
  // First name only — keeps the greeting punchy. Falls back to username, then
  // a generic "there" so the layout never collapses if user info is missing.
  const firstName =
    (user?.fullName?.split(/\s+/)[0]) || user?.username || "there"

  // Live clock — updates every minute. Initialised to null to avoid SSR/CSR
  // hydration mismatch (server-rendered time won't match the client's first paint).
  const [now, setNow] = useState<Date | null>(null)

  // Brief simulated loading — gives the skeleton a chance to render. Swap the
  // setTimeout for a real data-fetch loading flag if/when this view hits an API.
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setNow(new Date())
    const interval = setInterval(() => setNow(new Date()), 60_000)
    const t = setTimeout(() => setIsLoading(false), 700)
    return () => {
      clearInterval(interval)
      clearTimeout(t)
    }
  }, [])

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

  const todayStats = {
    totalCalls: 47,
    connected: 32,
    meetings: 5,
    conversions: 2,
    avgCallDuration: "4:32",
    targetCalls: 60,
  }

  const weeklyChange = {
    calls: 12,
    conversions: 25,
    meetings: -8,
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header — flex-wrap so badges drop below greeting on
          tight screens instead of overflowing. min-w-0 + truncate keeps
          long names/subtitles from pushing badges off-screen. */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-xl font-bold text-foreground sm:text-2xl">{greeting}, {firstName}</h2>
          <p className="truncate text-sm text-muted-foreground">Here&apos;s your performance overview for today</p>
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

      {/* Rotating hero banner — auto-advances every 5s, pause on hover */}
      <HomeHeroBanner onNavigate={onNavigate} />

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Calls */}
        <Card className="relative overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                <Phone className="size-5 text-primary" />
              </div>
              <Badge variant="secondary" className={`gap-1 text-xs ${weeklyChange.calls >= 0 ? 'text-success' : 'text-destructive'}`}>
                {weeklyChange.calls >= 0 ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
                {Math.abs(weeklyChange.calls)}%
              </Badge>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-bold">{todayStats.totalCalls}</p>
              <p className="text-xs text-muted-foreground">Total Calls Today</p>
            </div>
            <Progress value={(todayStats.totalCalls / todayStats.targetCalls) * 100} className="mt-3 h-1.5" />
            <p className="text-[10px] text-muted-foreground mt-1">{todayStats.targetCalls - todayStats.totalCalls} more to reach target</p>
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
                <span className="text-lg font-bold text-success">{Math.round((todayStats.connected / todayStats.totalCalls) * 100)}%</span>
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-bold">{todayStats.connected}</p>
              <p className="text-xs text-muted-foreground">Connected Calls</p>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-success rounded-full" style={{ width: `${(todayStats.connected / todayStats.totalCalls) * 100}%` }} />
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">{todayStats.totalCalls - todayStats.connected} missed/no answer</p>
          </CardContent>
        </Card>

        {/* Meetings Scheduled */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex size-10 items-center justify-center rounded-lg bg-chart-3/10">
                <Calendar className="size-5 text-chart-3" />
              </div>
              <Badge variant="secondary" className={`gap-1 text-xs ${weeklyChange.meetings >= 0 ? 'text-success' : 'text-destructive'}`}>
                {weeklyChange.meetings >= 0 ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
                {Math.abs(weeklyChange.meetings)}%
              </Badge>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-bold">{todayStats.meetings}</p>
              <p className="text-xs text-muted-foreground">Meetings Scheduled</p>
            </div>
            <div className="mt-3 flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className={`h-1.5 flex-1 rounded-full ${i <= todayStats.meetings ? 'bg-chart-3' : 'bg-muted'}`}
                />
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">Target: 5 meetings/day</p>
          </CardContent>
        </Card>

        {/* Conversions */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex size-10 items-center justify-center rounded-lg bg-chart-5/10">
                <CheckCircle2 className="size-5 text-chart-5" />
              </div>
              <Badge variant="secondary" className={`gap-1 text-xs ${weeklyChange.conversions >= 0 ? 'text-success' : 'text-destructive'}`}>
                {weeklyChange.conversions >= 0 ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
                {Math.abs(weeklyChange.conversions)}%
              </Badge>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-bold">{todayStats.conversions}</p>
              <p className="text-xs text-muted-foreground">Conversions Today</p>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <Target className="size-3.5 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground">Monthly: 12/20</span>
            </div>
            <p className="text-[10px] text-success mt-1">Great progress this month!</p>
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
                <CardDescription>Your latest actions</CardDescription>
              </div>
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y max-h-[220px] overflow-auto">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 transition-colors">
                  <div className={`size-8 rounded-full flex items-center justify-center ${
                    activity.status === 'success' ? 'bg-success/10 text-success' :
                    activity.status === 'failed' ? 'bg-destructive/10 text-destructive' :
                    'bg-warning/10 text-warning'
                  }`}>
                    {activity.action === 'Called' && <Phone className="size-3.5" />}
                    {activity.action === 'WhatsApp sent' && (
                      <svg className="size-3.5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                      </svg>
                    )}
                    {activity.action === 'Qualified' && <CheckCircle2 className="size-3.5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{activity.lead}</p>
                    <p className="text-[11px] text-muted-foreground">{activity.action} - {activity.result}</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">{activity.time}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Hot Leads */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="size-4 text-destructive" />
                  Hot Leads
                </CardTitle>
                <CardDescription>High-priority leads to call</CardDescription>
              </div>
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {topLeads.map((lead) => (
                <div key={lead.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors group">
                  <div className="flex size-9 items-center justify-center rounded-full bg-destructive/10 text-destructive font-medium text-xs">
                    {lead.name.split(" ").slice(1).map(n => n[0]).join("")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground truncate">{lead.name}</p>
                      <Badge variant="secondary" className="text-[10px] py-0 px-1.5 bg-destructive/10 text-destructive border-0">
                        {lead.score}%
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground">{lead.city} - {lead.interest}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-foreground">{lead.value}</p>
                    <Button variant="ghost" size="sm" className="h-7 md:h-6 px-2 text-[10px] md:opacity-0 md:group-hover:opacity-100 transition-opacity text-success">
                      <Phone className="size-3 mr-1" />
                      Call
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats Footer */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="py-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              <div className="flex items-center gap-2">
                <Timer className="size-4 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">Avg Call Duration</p>
                  <p className="text-sm font-semibold">{todayStats.avgCallDuration}</p>
                </div>
              </div>
              <div className="hidden sm:block w-px h-8 bg-border" />
              <div className="flex items-center gap-2">
                <Users className="size-4 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">Total Pipeline</p>
                  <p className="text-sm font-semibold">38 leads</p>
                </div>
              </div>
              <div className="hidden sm:block w-px h-8 bg-border" />
              <div className="flex items-center gap-2">
                <TrendingUp className="size-4 text-success" />
                <div>
                  <p className="text-xs text-muted-foreground">Conversion Rate</p>
                  <p className="text-sm font-semibold">18.5%</p>
                </div>
              </div>
            </div>
            <Button size="sm" className="gap-2">
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
