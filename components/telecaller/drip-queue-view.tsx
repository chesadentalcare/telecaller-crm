"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Droplets, Send, MoreHorizontal, Phone, Calendar, Timer, MessageSquare, Trash2, ClipboardList, AlertTriangle,
} from "lucide-react"
import { useDripLeads, usePendingFollowUps } from "@/hooks/use-leads"
import { useExitDrip } from "@/hooks/use-lead-mutations"
import { ApiError } from "@/lib/api/client"
import type { DripLead, DripTrack } from "@/lib/types/lead"

// wa.me wants a country-coded number with no punctuation; strip everything but
// digits and prefix the India dial code when the number isn't already coded.
function toWhatsappNumber(phone: string): string {
  const digits = phone.replace(/\D/g, "")
  if (!digits) return ""
  return digits.length === 10 ? `91${digits}` : digits
}

function formatCountdown(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  return hours > 0 ? `${days}d ${hours}h` : `${days}d`
}

function formatDate(date: Date): string {
  const diffMs = Date.now() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return "Today"
  if (diffDays === 1) return "Yesterday"
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
  return `${Math.floor(diffDays / 30)} months ago`
}

function getTrackConfig(track: string) {
  switch (track) {
    case "1-month": return { label: "1 Month", className: "bg-chart-2/10 text-chart-2 border-chart-2/20" }
    case "3-month": return { label: "3 Month", className: "bg-primary/10 text-primary border-primary/20" }
    case "6-month": return { label: "6 Month", className: "bg-chart-4/10 text-chart-4 border-chart-4/20" }
    default:        return { label: track,    className: "bg-muted text-muted-foreground" }
  }
}

export function DripQueueView() {
  const { data, isLoading } = useDripLeads()
  // Mirror server data locally so we can tick down `nextMessageIn` every second
  // without thrashing the query cache. Re-syncs whenever the query updates.
  const [leads, setLeads] = useState<DripLead[]>([])
  const [activeTab, setActiveTab] = useState<"all" | DripTrack>("all")

  useEffect(() => {
    if (data) setLeads(data)
  }, [data])

  useEffect(() => {
    const interval = setInterval(() => {
      setLeads((prev) => prev.map((l) => ({ ...l, nextMessageIn: Math.max(0, l.nextMessageIn - 1) })))
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  if (isLoading) return <DripQueueViewSkeleton />

  const filteredLeads = activeTab === "all" ? leads : leads.filter((l) => l.track === activeTab)
  const trackCounts: Record<DripTrack, number> = {
    "1-month": leads.filter((l) => l.track === "1-month").length,
    "3-month": leads.filter((l) => l.track === "3-month").length,
    "6-month": leads.filter((l) => l.track === "6-month").length,
  }
  const urgentLeads = leads.filter((l) => l.nextMessageIn < 3600).length

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={Droplets} bgColor="bg-primary/10" iconColor="text-primary" value={leads.length} label="Total in Drip" />
        <StatCard icon={Timer} bgColor="bg-chart-2/10" iconColor="text-chart-2" value={trackCounts["1-month"]} label="1-Month Track" />
        <StatCard icon={Calendar} bgColor="bg-chart-4/10" iconColor="text-chart-4" value={trackCounts["3-month"] + trackCounts["6-month"]} label="Long Term" />
        <StatCard icon={Send} bgColor="bg-warning/10" iconColor="text-warning" value={urgentLeads} label="Due in 1 hour" warning={urgentLeads > 0} />
      </div>

      <Card className="shadow-sm">
        <CardHeader className="pb-3 border-b">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base font-semibold">Active Drip Campaigns</CardTitle>
              <CardDescription className="text-xs">Automated nurture sequences</CardDescription>
            </div>
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
              <TabsList className="h-8 bg-muted/50">
                <TabsTrigger value="all" className="text-xs px-3 h-6">All</TabsTrigger>
                <TabsTrigger value="1-month" className="text-xs px-3 h-6">1-Month</TabsTrigger>
                <TabsTrigger value="3-month" className="text-xs px-3 h-6">3-Month</TabsTrigger>
                <TabsTrigger value="6-month" className="text-xs px-3 h-6">6-Month</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="text-xs font-semibold text-muted-foreground w-[220px]">Lead</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground">Track</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground w-[180px]">Progress</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground">
                    <div className="flex items-center gap-1"><Timer className="size-3" />Next Message</div>
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground">Last Engaged</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLeads.map((lead) => {
                  const trackConfig = getTrackConfig(lead.track)
                  const isUrgent = lead.nextMessageIn < 3600
                  const progress = (lead.messagesSent / lead.totalMessages) * 100
                  return (
                    <TableRow key={lead.id} className="group hover:bg-muted/50">
                      <TableCell className="py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary font-medium text-xs">
                            {lead.name.split(" ").slice(1).map((n) => n[0]).join("")}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">{lead.name}</p>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <span>{lead.phone}</span><span>•</span><span>{lead.equipment}</span>
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] font-medium ${trackConfig.className}`}>{trackConfig.label}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Progress value={progress} className="h-1.5 w-16" />
                          <span className="text-xs text-muted-foreground font-medium">{lead.messagesSent}/{lead.totalMessages}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className={`flex items-center gap-1.5 ${isUrgent ? "text-warning font-medium" : "text-foreground"}`}>
                          <Timer className={`size-3.5 ${isUrgent ? "text-warning" : "text-muted-foreground"}`} />
                          <span className="text-sm font-mono">{formatCountdown(lead.nextMessageIn)}</span>
                        </div>
                      </TableCell>
                      <TableCell><span className="text-xs text-muted-foreground">{formatDate(lead.lastEngagement)}</span></TableCell>
                      <TableCell className="text-right">
                        <DripRowActions lead={lead} />
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <PendingFollowUpsCard />
    </div>
  )
}

// ─── Row actions — Remove from Drip (wired) + Call / WhatsApp shortcuts ──
function DripRowActions({ lead }: { lead: DripLead }) {
  const [exitOpen, setExitOpen] = useState(false)
  const [exitReason, setExitReason] = useState("")
  const { mutateAsync: exitDrip, isPending: exiting } = useExitDrip(lead.id)

  const handleExit = async () => {
    if (!exitReason) {
      toast.error("Please select a reason")
      return
    }
    try {
      await exitDrip({ reason: exitReason })
      toast.success("Lead removed from drip")
      setExitOpen(false)
      setExitReason("")
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to remove from drip")
    }
  }

  const waNumber = toWhatsappNumber(lead.phone)
  const callHref = lead.phone ? `tel:${lead.phone.replace(/\s/g, "")}` : undefined

  return (
    <>
      <div className="flex items-center justify-end gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
        {waNumber ? (
          <Button asChild size="sm" variant="outline" className="h-9 md:h-7 px-2.5 gap-1.5">
            <a href={`https://wa.me/${waNumber}`} target="_blank" rel="noopener noreferrer">
              <Send className="size-3" />Send Now
            </a>
          </Button>
        ) : (
          <Button size="sm" variant="outline" className="h-9 md:h-7 px-2.5 gap-1.5" disabled>
            <Send className="size-3" />Send Now
          </Button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-9 w-9 md:h-7 md:w-7 p-0">
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem
              className="text-xs"
              disabled={!callHref}
              asChild={!!callHref}
            >
              {callHref ? (
                <a href={callHref}><Phone className="mr-2 size-3.5" />Call Lead</a>
              ) : (
                <span><Phone className="mr-2 size-3.5" />Call Lead</span>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-xs"
              disabled={!waNumber}
              asChild={!!waNumber}
            >
              {waNumber ? (
                <a href={`https://wa.me/${waNumber}`} target="_blank" rel="noopener noreferrer">
                  <MessageSquare className="mr-2 size-3.5" />WhatsApp
                </a>
              ) : (
                <span><MessageSquare className="mr-2 size-3.5" />WhatsApp</span>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-xs text-destructive"
              onSelect={(e) => { e.preventDefault(); setExitOpen(true) }}
            >
              <Trash2 className="mr-2 size-3.5" />Remove from Drip
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Dialog open={exitOpen} onOpenChange={setExitOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove lead from drip</DialogTitle>
            <DialogDescription>
              Select a reason. The lead will be removed from the sequence and a record kept for audit.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label className="text-xs">Reason</Label>
            <Select value={exitReason} onValueChange={setExitReason}>
              <SelectTrigger>
                <SelectValue placeholder="Select reason" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="replied">Replied — re-enter qualification</SelectItem>
                <SelectItem value="meeting_booked">Meeting booked via CTA</SelectItem>
                <SelectItem value="opted_out">Opted out</SelectItem>
                <SelectItem value="purchased_elsewhere">Purchased elsewhere</SelectItem>
                <SelectItem value="wrong_lead">Wrong lead / spam</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExitOpen(false)}>Cancel</Button>
            <Button onClick={handleExit} disabled={exiting}>
              {exiting ? "Removing…" : "Confirm Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

// ─── Pending Follow-Ups — surfaces the per-user worklist endpoint ───────
function PendingFollowUpsCard() {
  const { data, isLoading } = usePendingFollowUps()
  const tasks = data ?? []

  if (isLoading) {
    return (
      <Card className="shadow-sm">
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <ClipboardList className="size-4 text-muted-foreground" />Follow-Ups Due
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    )
  }

  if (tasks.length === 0) return null

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3 border-b">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <ClipboardList className="size-4 text-muted-foreground" />Follow-Ups Due
            </CardTitle>
            <CardDescription className="text-xs">Pending and overdue follow-ups assigned to you</CardDescription>
          </div>
          <Badge variant="outline" className="text-[10px]">{tasks.length}</Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {tasks.map((task) => {
            const overdue = task.status === "overdue" || new Date(task.due_at).getTime() < Date.now()
            const due = new Date(task.due_at)
            return (
              <div key={task.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {task.customer_name || `Lead #${task.opportunity_doc_entry}`}
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                    {task.quote_number && <span>{task.quote_number}</span>}
                    {task.quote_number && task.equipment_interest && <span>•</span>}
                    {task.equipment_interest && <span className="truncate">{task.equipment_interest}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-muted-foreground">
                    {due.toLocaleDateString()}
                  </span>
                  {overdue && (
                    <Badge variant="outline" className="text-[10px] gap-1 bg-destructive/10 text-destructive border-destructive/20">
                      <AlertTriangle className="size-3" />Overdue
                    </Badge>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

interface StatCardProps {
  icon: React.ComponentType<{ className?: string }>
  bgColor: string
  iconColor: string
  value: number | string
  label: string
  warning?: boolean
}

function StatCard({ icon: Icon, bgColor, iconColor, value, label, warning }: StatCardProps) {
  return (
    <Card className={`shadow-sm ${warning ? "border-warning" : ""}`}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`flex size-10 items-center justify-center rounded-lg ${bgColor}`}>
            <Icon className={`size-5 ${iconColor}`} />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{value}</p>
            <p className="text-[11px] text-muted-foreground">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function DripQueueViewSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-3 flex items-center gap-3">
              <Skeleton className="h-9 w-9 rounded-md" />
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-5 w-12" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="flex items-center justify-between gap-2">
        <Skeleton className="h-9 w-60" />
        <Skeleton className="h-9 w-28" />
      </div>
      <Card>
        <CardContent className="p-0">
          {Array.from({ length: 6 }).map((_, row) => (
            <div key={row} className="border-b p-4 flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-40" />
                <Skeleton className="h-3 w-56" />
              </div>
              <div className="hidden md:flex flex-col items-end gap-1.5">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-2 w-32" />
              </div>
              <Skeleton className="h-8 w-20" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
