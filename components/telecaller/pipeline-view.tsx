"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { LeadQueueRow } from "./lead-queue-row"
import { LeadCockpitPanel } from "./lead-cockpit-panel"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Phone, MoreHorizontal, Filter, ArrowUpDown, TrendingUp, Users, CheckCircle2, Clock,
  ChevronRight, ChevronDown, SlidersHorizontal, Calendar, MessageSquare, ShieldCheck, ShieldAlert,
} from "lucide-react"
import { NoResponseBanner } from "./no-response-banner"
import { usePipelineLeads } from "@/hooks/use-leads"
import type { PipelineLead } from "@/lib/types/lead"

function getStatusConfig(status: PipelineLead["status"]) {
  switch (status) {
    case "new":               return { label: "New",         className: "bg-primary/10 text-primary border-primary/20" }
    case "contacted":         return { label: "Contacted",   className: "bg-chart-3/10 text-chart-3 border-chart-3/20" }
    case "qualified":         return { label: "Qualified",   className: "bg-chart-2/10 text-chart-2 border-chart-2/20" }
    case "unqualified":       return { label: "Unqualified", className: "bg-warning/10 text-warning border-warning/30" }
    case "meeting-scheduled": return { label: "Meeting Set", className: "bg-success/10 text-success border-success/20" }
  }
}

function formatTime(date: Date): string {
  const diffMs = Date.now() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  return `${diffDays}d ago`
}

interface PipelineViewProps {
  onOpenLead?: (leadId: string) => void
}

export function PipelineView({ onOpenLead }: PipelineViewProps = {}) {
  const { data: leads = [], isLoading } = usePipelineLeads()
  const [dismissedBanners, setDismissedBanners] = useState<Set<string>>(new Set())
  const [activeTab, setActiveTab] = useState("all")
  // Inline cockpit (Amendment 2 Theme 1) — expand a lead in place to log/qualify/edit
  // without leaving the pipeline, mirroring the Calls-Due worklist.
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const toggle = (id: string) => setExpandedId((cur) => (cur === id ? null : id))

  if (isLoading) return <PipelineViewSkeleton />

  const leadWithNoResponse = leads.find(
    (lead) => lead.failedAttempts >= 4 && !dismissedBanners.has(lead.id),
  )
  const filteredLeads = activeTab === "all" ? leads : leads.filter((l) => l.status === activeTab)

  const stats = [
    { label: "Total Pipeline", value: leads.length, icon: Users, color: "text-primary", bg: "bg-primary/10" },
    { label: "New Today", value: leads.filter((l) => l.status === "new").length, icon: Clock, color: "text-chart-3", bg: "bg-chart-3/10" },
    { label: "Qualified", value: leads.filter((l) => l.status === "qualified" || l.status === "meeting-scheduled").length, icon: CheckCircle2, color: "text-success", bg: "bg-success/10" },
    {
      label: "Conversion",
      value: leads.length ? `${Math.round((leads.filter((l) => l.status === "meeting-scheduled").length / leads.length) * 100)}%` : "0%",
      icon: TrendingUp,
      color: "text-chart-2",
      bg: "bg-chart-2/10",
    },
  ]

  return (
    <div className="space-y-4">
      {leadWithNoResponse && leadWithNoResponse.lastAttemptTime && (
        <NoResponseBanner
          leadName={leadWithNoResponse.name}
          leadPhone={leadWithNoResponse.phone}
          failedAttempts={leadWithNoResponse.failedAttempts}
          lastAttemptTime={leadWithNoResponse.lastAttemptTime}
          onSendWhatsApp={() => console.log("Sending WhatsApp to:", leadWithNoResponse.phone)}
          onDismiss={() => setDismissedBanners((prev) => new Set([...prev, leadWithNoResponse.id]))}
        />
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="border shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`flex size-10 items-center justify-center rounded-lg ${stat.bg}`}>
                  <stat.icon className={`size-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-[11px] text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="shadow-sm">
        <CardHeader className="pb-3 border-b">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base font-semibold">Active Leads</CardTitle>
            <div className="flex items-center gap-2">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="h-8 bg-muted/50">
                  <TabsTrigger value="all" className="text-xs px-3 h-6">All ({leads.length})</TabsTrigger>
                  <TabsTrigger value="new" className="text-xs px-3 h-6">New</TabsTrigger>
                  <TabsTrigger value="contacted" className="text-xs px-3 h-6">Contacted</TabsTrigger>
                  <TabsTrigger value="qualified" className="text-xs px-3 h-6">Qualified</TabsTrigger>
                  {leads.some((l) => l.status === "unqualified") && (
                    <TabsTrigger value="unqualified" className="text-xs px-3 h-6">Unqualified</TabsTrigger>
                  )}
                </TabsList>
              </Tabs>
              <Button variant="outline" size="sm" className="h-8 gap-1.5">
                <Filter className="size-3.5" />Filter
              </Button>
              <Button variant="outline" size="sm" className="h-8 gap-1.5">
                <ArrowUpDown className="size-3.5" />Sort
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredLeads.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">No leads in this view</p>
          ) : (
            <div className="divide-y">
              {filteredLeads.map((lead) => {
                const statusConfig = getStatusConfig(lead.status)
                const tel = lead.phone.replace(/\D/g, "")
                const expanded = expandedId === lead.id
                return (
                  <div key={lead.id}>
                  {/* Whole card → details page; only the Cockpit button (below, with
                      stopPropagation) opens the inline cockpit. */}
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => onOpenLead?.(lead.id)}
                    onKeyDown={(e) => { if (e.key === "Enter") onOpenLead?.(lead.id) }}
                    className="cursor-pointer"
                  >
                  <LeadQueueRow
                    id={lead.id}
                    name={lead.name}
                    phone={lead.phone}
                    equipment={lead.equipment}
                    replied={lead.replied}
                    onOpen={onOpenLead}
                    meta={
                      <span className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                        {lead.value && <><span className="font-medium text-foreground">{lead.value}</span><span>•</span></>}
                        <span>{lead.source}</span>
                        <span>•</span>
                        <span>added {formatTime(lead.createdAt)}</span>
                        {lead.phoneVerified ? (
                          <span className="inline-flex items-center gap-0.5 text-success"><ShieldCheck className="size-3" />verified</span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 text-destructive"><ShieldAlert className="size-3" />unverified</span>
                        )}
                      </span>
                    }
                    badge={
                      <Badge variant="outline" className={`text-[10px] font-medium ${statusConfig.className}`}>
                        {statusConfig.label}
                      </Badge>
                    }
                    actions={
                      <div className="flex items-center gap-1">
                        {tel.length >= 10 ? (
                          <Button asChild size="sm" className="h-8 px-2.5 gap-1.5 bg-success hover:bg-success/90 text-success-foreground">
                            <a href={`tel:${tel}`} onClick={(e) => e.stopPropagation()}><Phone className="size-3" />Call</a>
                          </Button>
                        ) : (
                          <Button size="sm" disabled className="h-8 px-2.5 gap-1.5"><Phone className="size-3" />Call</Button>
                        )}
                        <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); toggle(lead.id) }} className="h-8 px-2.5 gap-1" title="Open cockpit">
                          {expanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
                          <SlidersHorizontal className="size-3.5" />Cockpit
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem className="text-xs"><MessageSquare className="mr-2 size-3.5" />WhatsApp</DropdownMenuItem>
                            <DropdownMenuItem className="text-xs"><Calendar className="mr-2 size-3.5" />Schedule</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-xs" onClick={() => onOpenLead?.(lead.id)}>
                              <ChevronRight className="mr-2 size-3.5" />View Details
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    }
                  />
                  </div>
                  {expanded && <LeadCockpitPanel leadId={lead.id} onOpenFull={onOpenLead} />}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function PipelineViewSkeleton() {
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
        <Skeleton className="h-9 w-72" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-20" />
        </div>
      </div>
      <Card>
        <CardContent className="p-0">
          <div className="border-b p-3 grid grid-cols-6 gap-2">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-3.5 w-3/4" />)}
          </div>
          {Array.from({ length: 8 }).map((_, row) => (
            <div key={row} className="border-b p-3 grid grid-cols-6 gap-2 items-center">
              <div className="flex items-center gap-2">
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-3.5 w-24" />
              </div>
              <Skeleton className="h-3.5 w-20" />
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-3.5 w-16" />
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-7 w-7 rounded-md ml-auto" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
