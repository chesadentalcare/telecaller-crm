"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Droplets, 
  Send,
  MoreHorizontal,
  Phone,
  Calendar,
  Timer,
  MessageSquare,
} from "lucide-react"

interface DripLead {
  id: string
  name: string
  phone: string
  track: "1-month" | "3-month" | "6-month"
  nextMessageIn: number
  lastEngagement: Date
  messagesSent: number
  totalMessages: number
  equipment: string
}

const mockDripLeads: DripLead[] = [
  {
    id: "1",
    name: "Dr. Priya Mehta",
    phone: "9876543210",
    track: "1-month",
    nextMessageIn: 3600 * 2,
    lastEngagement: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
    messagesSent: 3,
    totalMessages: 8,
    equipment: "Dental Chair"
  },
  {
    id: "2",
    name: "Dr. Suresh Patel",
    phone: "9123456789",
    track: "3-month",
    nextMessageIn: 3600 * 24 * 3,
    lastEngagement: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7),
    messagesSent: 5,
    totalMessages: 12,
    equipment: "X-Ray Unit"
  },
  {
    id: "3",
    name: "Dr. Anita Sharma",
    phone: "9567891234",
    track: "6-month",
    nextMessageIn: 3600 * 24 * 14,
    lastEngagement: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30),
    messagesSent: 2,
    totalMessages: 6,
    equipment: "Autoclave"
  },
  {
    id: "4",
    name: "Dr. Rajesh Kumar",
    phone: "9432198765",
    track: "1-month",
    nextMessageIn: 60 * 45,
    lastEngagement: new Date(Date.now() - 1000 * 60 * 60 * 24),
    messagesSent: 6,
    totalMessages: 8,
    equipment: "Compressor"
  },
  {
    id: "5",
    name: "Dr. Kavita Singh",
    phone: "9876123450",
    track: "3-month",
    nextMessageIn: 3600 * 24 * 5,
    lastEngagement: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10),
    messagesSent: 8,
    totalMessages: 12,
    equipment: "Imaging System"
  },
  {
    id: "6",
    name: "Dr. Arun Nair",
    phone: "9988776655",
    track: "1-month",
    nextMessageIn: 3600 * 6,
    lastEngagement: new Date(Date.now() - 1000 * 60 * 60 * 48),
    messagesSent: 4,
    totalMessages: 8,
    equipment: "Light Cure"
  },
  {
    id: "7",
    name: "Dr. Deepa Joshi",
    phone: "9112233445",
    track: "6-month",
    nextMessageIn: 3600 * 24 * 21,
    lastEngagement: new Date(Date.now() - 1000 * 60 * 60 * 24 * 45),
    messagesSent: 1,
    totalMessages: 6,
    equipment: "Handpiece"
  },
  {
    id: "8",
    name: "Dr. Mohan Das",
    phone: "9556677889",
    track: "3-month",
    nextMessageIn: 3600 * 24 * 8,
    lastEngagement: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14),
    messagesSent: 3,
    totalMessages: 12,
    equipment: "Scaler"
  },
]

function formatCountdown(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`
  } else if (seconds < 3600) {
    const mins = Math.floor(seconds / 60)
    return `${mins}m`
  } else if (seconds < 86400) {
    const hours = Math.floor(seconds / 3600)
    return `${hours}h`
  } else {
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    return hours > 0 ? `${days}d ${hours}h` : `${days}d`
  }
}

function formatDate(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) return "Today"
  if (diffDays === 1) return "Yesterday"
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
  return `${Math.floor(diffDays / 30)} months ago`
}

function getTrackConfig(track: string) {
  switch (track) {
    case "1-month":
      return { label: "1 Month", className: "bg-chart-2/10 text-chart-2 border-chart-2/20" }
    case "3-month":
      return { label: "3 Month", className: "bg-primary/10 text-primary border-primary/20" }
    case "6-month":
      return { label: "6 Month", className: "bg-chart-4/10 text-chart-4 border-chart-4/20" }
    default:
      return { label: track, className: "bg-muted text-muted-foreground" }
  }
}

export function DripQueueView() {
  const [leads, setLeads] = useState<DripLead[]>(mockDripLeads)
  const [activeTab, setActiveTab] = useState("all")
  const [, setTick] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setLeads(prev => prev.map(lead => ({
        ...lead,
        nextMessageIn: Math.max(0, lead.nextMessageIn - 1)
      })))
      setTick(t => t + 1)
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  const filteredLeads = activeTab === "all" 
    ? leads 
    : leads.filter(l => l.track === activeTab)

  const trackCounts = {
    "1-month": leads.filter(l => l.track === "1-month").length,
    "3-month": leads.filter(l => l.track === "3-month").length,
    "6-month": leads.filter(l => l.track === "6-month").length,
  }

  const urgentLeads = leads.filter(l => l.nextMessageIn < 3600).length

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-3">
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                <Droplets className="size-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{leads.length}</p>
                <p className="text-[11px] text-muted-foreground">Total in Drip</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-chart-2/10">
                <Timer className="size-5 text-chart-2" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{trackCounts["1-month"]}</p>
                <p className="text-[11px] text-muted-foreground">1-Month Track</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-chart-4/10">
                <Calendar className="size-5 text-chart-4" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{trackCounts["3-month"] + trackCounts["6-month"]}</p>
                <p className="text-[11px] text-muted-foreground">Long Term</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={`shadow-sm ${urgentLeads > 0 ? "border-warning" : ""}`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-warning/10">
                <Send className="size-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{urgentLeads}</p>
                <p className="text-[11px] text-muted-foreground">Due in 1 hour</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Drip Table */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3 border-b">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base font-semibold">Active Drip Campaigns</CardTitle>
              <CardDescription className="text-xs">Automated nurture sequences</CardDescription>
            </div>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
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
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="text-xs font-semibold text-muted-foreground w-[220px]">Lead</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground">Track</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground w-[180px]">Progress</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Timer className="size-3" />
                    Next Message
                  </div>
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
                          {lead.name.split(" ").slice(1).map(n => n[0]).join("")}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{lead.name}</p>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <span>{lead.phone}</span>
                            <span>•</span>
                            <span>{lead.equipment}</span>
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[10px] font-medium ${trackConfig.className}`}>
                        {trackConfig.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Progress value={progress} className="h-1.5 w-16" />
                        <span className="text-xs text-muted-foreground font-medium">
                          {lead.messagesSent}/{lead.totalMessages}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className={`flex items-center gap-1.5 ${isUrgent ? "text-warning font-medium" : "text-foreground"}`}>
                        <Timer className={`size-3.5 ${isUrgent ? "text-warning" : "text-muted-foreground"}`} />
                        <span className="text-sm font-mono">
                          {formatCountdown(lead.nextMessageIn)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(lead.lastEngagement)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2.5 gap-1.5"
                        >
                          <Send className="size-3" />
                          Send Now
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem className="text-xs">
                              <Phone className="mr-2 size-3.5" />
                              Call Lead
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-xs">
                              <MessageSquare className="mr-2 size-3.5" />
                              WhatsApp
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-xs text-destructive">
                              Remove from Drip
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
