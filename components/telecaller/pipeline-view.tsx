"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu"
import { LeadQueueRow } from "./lead-queue-row"
import { LeadCockpitPanel } from "./lead-cockpit-panel"
import { SendCatalogueButton } from "./send-catalogue-button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Phone,
  MoreHorizontal,
  Filter,
  ArrowUpDown,
  TrendingUp,
  Users,
  CheckCircle2,
  Clock,
  ChevronRight,
  ChevronDown,
  SlidersHorizontal,
  Calendar,
  MessageSquare,
  ShieldCheck,
  ShieldAlert,
  Flag,
} from "lucide-react"
import { NoResponseBanner } from "./no-response-banner"
import { usePipelineLeads } from "@/hooks/use-leads"
import { useEngagementMode, isEngagedOutcome } from "@/lib/engagement-mode"
import { lastOutcomeLabel } from "@/lib/calls/flatten-upcoming"
import { repColor } from "@/lib/rep-color"
import { useFlagLead, useRecoveryWhatsapp } from "@/hooks/use-lead-mutations"
import { toast } from "sonner"
import { ApiError } from "@/lib/api/client"
import type { PipelineLead, DripTrack } from "@/lib/types/lead"

function getStatusConfig(status: PipelineLead["status"]) {
  switch (status) {
    case "new":
      return {
        label: "New",
        className: "bg-primary/10 text-primary border-primary/20",
      }
    case "contacted":
      return {
        label: "Contacted",
        className: "bg-chart-3/10 text-chart-3 border-chart-3/20",
      }
    case "qualified":
      return {
        label: "Qualified",
        className: "bg-chart-2/10 text-chart-2 border-chart-2/20",
      }
    case "unqualified":
      return {
        label: "Unqualified",
        className: "bg-warning/10 text-warning border-warning/30",
      }
    case "meeting-scheduled":
      return {
        label: "Meeting Set",
        className: "bg-success/10 text-success border-success/20",
      }
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
  const { mode, setMode } = useEngagementMode()
  const { mutate: flagLead } = useFlagLead()

  const [dismissedBanners, setDismissedBanners] = useState<Set<string>>(new Set())
  const [activeTab, setActiveTab] = useState("all")

  // Inline cockpit
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const toggle = (id: string) =>
    setExpandedIds((cur) => {
      const next = new Set(cur)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const [repliedOnly, setRepliedOnly] = useState(false)
  const [meetingPendingOnly, setMeetingPendingOnly] = useState(false)
  const [unverifiedOnly, setUnverifiedOnly] = useState(false)
  const [flaggedOnly, setFlaggedOnly] = useState(false)
  const [sortBy, setSortBy] = useState("recent")
  const [trackFilter, setTrackFilter] = useState<
    "all" | DripTrack | "none"
  >("all")

  useEffect(() => {
    if (
      activeTab === "unqualified" &&
      !leads.some((l) => l.status === "unqualified")
    ) {
      setActiveTab("all")
    }

    if (flaggedOnly && !leads.some((l) => l.flagged)) {
      setFlaggedOnly(false)
    }
  }, [activeTab, flaggedOnly, leads])

  const leadWithNoResponse = leads.find(
    (lead) =>
      lead.failedAttempts >= 4 && !dismissedBanners.has(lead.id),
  )
  const { mutateAsync: sendRecovery } = useRecoveryWhatsapp(leadWithNoResponse?.id ?? "")

  if (isLoading) return <PipelineViewSkeleton />

  const isReplied = (l: PipelineLead) =>
    !!(l.replied?.hasUnread || l.replied?.awaitingReply)

  const inFocus = (l: PipelineLead) =>
    mode === "all" ||
    isEngagedOutcome(l.lastOutcome) === (mode === "engaged")

  const focusLeads = leads.filter(inFocus)

  const activeFilters =
    (repliedOnly ? 1 : 0) +
    (meetingPendingOnly ? 1 : 0) +
    (unverifiedOnly ? 1 : 0)

  const repliedTotal = focusLeads.filter(isReplied).length

  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)

  const newTodayCount = focusLeads.filter(
    (l) => l.createdAt.getTime() >= startOfToday.getTime(),
  ).length

  const returnedTodayCount = focusLeads.filter((l) => {
    if (l.createdAt.getTime() >= startOfToday.getTime()) return false

    const repliedAt = l.replied?.at
      ? new Date(l.replied.at).getTime()
      : NaN

    return (
      !Number.isNaN(repliedAt) &&
      repliedAt >= startOfToday.getTime()
    )
  }).length

  const newTodayTotal = newTodayCount + returnedTodayCount

  const tabLeads =
    activeTab === "all"
      ? leads
      : leads.filter((l) => l.status === activeTab)

  const scopeLeads = tabLeads.filter(inFocus)

  const focusLabel =
    mode === "engaged"
      ? "Engaged"
      : mode === "not_engaged"
        ? "Not engaged"
        : null

  const focusHidden = tabLeads.length - scopeLeads.length

  const repliedInScope = scopeLeads.filter(isReplied).length

  const flaggedCount = leads.filter((l) => l.flagged).length

  const filteredLeads = scopeLeads
    .filter((l) => !repliedOnly || isReplied(l))
    .filter((l) => !meetingPendingOnly || !!l.meetingPending)
    .filter((l) => !unverifiedOnly || !l.phoneVerified)
    .filter((l) => !flaggedOnly || !!l.flagged)
    .filter(
      (l) =>
        trackFilter === "all" ||
        (trackFilter === "none"
          ? !l.dripTrack
          : l.dripTrack === trackFilter),
    )
    .sort((a, b) => {
      // Flagged leads always float to the top.
      if (!!a.flagged !== !!b.flagged) {
        return a.flagged ? -1 : 1
      }

      if (sortBy === "oldest") {
        return a.createdAt.getTime() - b.createdAt.getTime()
      }

      if (sortBy === "name") {
        return a.name.localeCompare(b.name)
      }

      if (sortBy === "status") {
        return a.status.localeCompare(b.status)
      }

      return b.createdAt.getTime() - a.createdAt.getTime()
    })

  const trackCounts = {
    "1-month": scopeLeads.filter((l) => l.dripTrack === "1-month").length,
    "3-month": scopeLeads.filter((l) => l.dripTrack === "3-month").length,
    "6-month": scopeLeads.filter((l) => l.dripTrack === "6-month").length,
    none: scopeLeads.filter((l) => !l.dripTrack).length,
  }

  const anyFilterActive =
    activeTab !== "all" ||
    repliedOnly ||
    meetingPendingOnly ||
    unverifiedOnly ||
    flaggedOnly ||
    mode !== "all" ||
    trackFilter !== "all"

  const clearAllFilters = () => {
    setActiveTab("all")
    setRepliedOnly(false)
    setMeetingPendingOnly(false)
    setUnverifiedOnly(false)
    setFlaggedOnly(false)
    setMode("all")
    setTrackFilter("all")
  }

  const stats = [
    {
      label: focusLabel ? `Pipeline · ${focusLabel}` : "Total Pipeline",
      value: focusLeads.length,
      sub: null as string | null,
      icon: Users,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      label: "New Today",
      value: newTodayTotal,
      sub: `${newTodayCount} new + ${returnedTodayCount} re-engaged`,
      icon: Clock,
      color: "text-chart-3",
      bg: "bg-chart-3/10",
    },
    {
      label: "Qualified",
      value: focusLeads.filter(
        (l) =>
          l.status === "qualified" ||
          l.status === "meeting-scheduled",
      ).length,
      sub: null as string | null,
      icon: CheckCircle2,
      color: "text-success",
      bg: "bg-success/10",
    },
    {
      label: "WhatsApp Replies",
      value: repliedTotal,
      sub: null as string | null,
      icon: MessageSquare,
      color: "text-chart-1",
      bg: "bg-chart-1/10",
    },
    {
      label: "Conversion",
      value: focusLeads.length
        ? `${Math.round(
            (focusLeads.filter(
              (l) => l.status === "meeting-scheduled",
            ).length /
              focusLeads.length) *
              100,
          )}%`
        : "0%",
      sub: null as string | null,
      icon: TrendingUp,
      color: "text-chart-2",
      bg: "bg-chart-2/10",
    },
  ]

  return (
    <div className="space-y-4">
      {focusLabel && (
        <div className="flex items-center justify-between gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <span className="flex items-center gap-1.5">
            <Filter className="size-3.5 shrink-0" />
            Focus filter active:{" "}
            <strong className="font-semibold">{focusLabel}</strong>
            {focusHidden > 0 && (
              <span>
                — {focusHidden} lead{focusHidden === 1 ? "" : "s"} hidden
              </span>
            )}
          </span>

          <Button
            size="sm"
            variant="outline"
            className="h-7 shrink-0 border-amber-300 bg-white text-amber-800 hover:bg-amber-100"
            onClick={() => setMode("all")}
          >
            Show all
          </Button>
        </div>
      )}

      {leadWithNoResponse && leadWithNoResponse.lastAttemptTime && (
        <NoResponseBanner
          leadName={leadWithNoResponse.name}
          leadPhone={leadWithNoResponse.phone}
          failedAttempts={leadWithNoResponse.failedAttempts}
          lastAttemptTime={leadWithNoResponse.lastAttemptTime}
          onSendWhatsApp={async () => {
            try {
              const res = await sendRecovery({
                phone: leadWithNoResponse.phone,
                dentistName: leadWithNoResponse.name,
                equipmentInterest: leadWithNoResponse.equipment,
              })
              toast.success(res?.dryRun ? "Recovery WhatsApp queued (dry-run)" : "Recovery WhatsApp sent")
            } catch (err) {
              toast.error(err instanceof ApiError ? err.message : "Failed to send recovery WhatsApp")
            }
          }}
          onDismiss={() =>
            setDismissedBanners(
              (prev) => new Set([...prev, leadWithNoResponse.id]),
            )
          }
        />
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {stats.map((stat) => (
          <Card key={stat.label} className="border shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div
                  className={`flex size-10 items-center justify-center rounded-lg ${stat.bg}`}
                >
                  <stat.icon className={`size-5 ${stat.color}`} />
                </div>

                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {stat.value}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {stat.label}
                  </p>

                  {stat.sub && (
                    <p className="text-[10px] text-muted-foreground/70">
                      {stat.sub}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="shadow-sm">
        <CardHeader className="pb-3 border-b">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base font-semibold">
              Active Leads
            </CardTitle>

            <div className="flex flex-wrap items-center gap-2">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="h-8 bg-muted/50">
                  <TabsTrigger
                    value="all"
                    className="text-xs px-3 h-6"
                  >
                    All ({focusLeads.length})
                  </TabsTrigger>

                  <TabsTrigger
                    value="new"
                    className="text-xs px-3 h-6"
                  >
                    New
                  </TabsTrigger>

                  <TabsTrigger
                    value="contacted"
                    className="text-xs px-3 h-6"
                  >
                    Contacted
                  </TabsTrigger>

                  <TabsTrigger
                    value="qualified"
                    className="text-xs px-3 h-6"
                  >
                    Qualified
                  </TabsTrigger>

                  {leads.some(
                    (l) => l.status === "unqualified",
                  ) && (
                    <TabsTrigger
                      value="unqualified"
                      className="text-xs px-3 h-6"
                    >
                      Unqualified
                    </TabsTrigger>
                  )}
                </TabsList>
              </Tabs>

              {flaggedCount > 0 && (
                <button
                  onClick={() => setFlaggedOnly((v) => !v)}
                  className={[
                    "inline-flex items-center gap-1 rounded-md border px-2.5 h-8 text-xs font-medium transition-colors",
                    flaggedOnly
                      ? "border-amber-400 bg-amber-50 text-amber-700"
                      : "border-border bg-background text-muted-foreground hover:text-foreground hover:bg-muted/50",
                  ].join(" ")}
                  title={
                    flaggedOnly
                      ? "Clear flagged filter"
                      : "Show flagged leads only"
                  }
                >
                  <Flag className="size-3" />

                  Flagged

                  <span
                    className={[
                      "ml-0.5 inline-flex items-center justify-center rounded-full px-1.5 min-w-[1.1rem] h-4 text-[10px] font-semibold",
                      flaggedOnly
                        ? "bg-amber-200 text-amber-800"
                        : "bg-muted text-muted-foreground",
                    ].join(" ")}
                  >
                    {flaggedCount}
                  </span>
                </button>
              )}

              <Button
                variant={repliedOnly ? "default" : "outline"}
                size="sm"
                onClick={() => setRepliedOnly((v) => !v)}
                className="h-8 gap-1.5"
                title="Show only leads that replied on WhatsApp"
              >
                <MessageSquare className="size-3.5" />
                Replies

                {repliedInScope > 0 && (
                  <Badge
                    variant="secondary"
                    className="ml-0.5 h-4 min-w-4 px-1 text-[10px]"
                  >
                    {repliedInScope}
                  </Badge>
                )}
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5"
                  >
                    <Filter className="size-3.5" />
                    Filter

                    {activeFilters > 0 && (
                      <Badge
                        variant="secondary"
                        className="ml-0.5 h-4 min-w-4 px-1 text-[10px]"
                      >
                        {activeFilters}
                      </Badge>
                    )}
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent
                  align="end"
                  className="w-48"
                >
                  <DropdownMenuLabel className="text-xs">
                    Filter leads
                  </DropdownMenuLabel>

                  <DropdownMenuCheckboxItem
                    checked={repliedOnly}
                    onCheckedChange={(v) =>
                      setRepliedOnly(!!v)
                    }
                    className="text-xs"
                  >
                    Replied on WhatsApp
                  </DropdownMenuCheckboxItem>

                  <DropdownMenuCheckboxItem
                    checked={meetingPendingOnly}
                    onCheckedChange={(v) =>
                      setMeetingPendingOnly(!!v)
                    }
                    className="text-xs"
                  >
                    Meeting pending
                  </DropdownMenuCheckboxItem>

                  <DropdownMenuCheckboxItem
                    checked={unverifiedOnly}
                    onCheckedChange={(v) =>
                      setUnverifiedOnly(!!v)
                    }
                    className="text-xs"
                  >
                    Unverified number
                  </DropdownMenuCheckboxItem>

                  {activeFilters > 0 && (
                    <>
                      <DropdownMenuSeparator />

                      <DropdownMenuItem
                        className="text-xs"
                        onClick={() => {
                          setRepliedOnly(false)
                          setMeetingPendingOnly(false)
                          setUnverifiedOnly(false)
                        }}
                      >
                        Clear filters
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5"
                  >
                    <ArrowUpDown className="size-3.5" />
                    Sort
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent
                  align="end"
                  className="w-40"
                >
                  <DropdownMenuLabel className="text-xs">
                    Sort by
                  </DropdownMenuLabel>

                  <DropdownMenuRadioGroup
                    value={sortBy}
                    onValueChange={setSortBy}
                  >
                    <DropdownMenuRadioItem
                      value="recent"
                      className="text-xs"
                    >
                      Newest added
                    </DropdownMenuRadioItem>

                    <DropdownMenuRadioItem
                      value="oldest"
                      className="text-xs"
                    >
                      Oldest added
                    </DropdownMenuRadioItem>

                    <DropdownMenuRadioItem
                      value="name"
                      className="text-xs"
                    >
                      Name (A–Z)
                    </DropdownMenuRadioItem>

                    <DropdownMenuRadioItem
                      value="status"
                      className="text-xs"
                    >
                      Status
                    </DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">
              Drip track
            </span>

            <Tabs
              value={trackFilter}
              onValueChange={(v) =>
                setTrackFilter(v as typeof trackFilter)
              }
            >
              <TabsList className="h-8 bg-muted/50">
                <TabsTrigger
                  value="all"
                  className="text-xs px-3 h-6"
                >
                  All
                </TabsTrigger>

                <TabsTrigger
                  value="1-month"
                  className="text-xs px-3 h-6"
                >
                  1-Month ({trackCounts["1-month"]})
                </TabsTrigger>

                <TabsTrigger
                  value="3-month"
                  className="text-xs px-3 h-6"
                >
                  3-Month ({trackCounts["3-month"]})
                </TabsTrigger>

                <TabsTrigger
                  value="6-month"
                  className="text-xs px-3 h-6"
                >
                  6-Month ({trackCounts["6-month"]})
                </TabsTrigger>

                <TabsTrigger
                  value="none"
                  className="text-xs px-3 h-6"
                >
                  Not in drip ({trackCounts.none})
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {filteredLeads.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <p className="text-sm text-muted-foreground">
                {anyFilterActive
                  ? "No leads match the current filters"
                  : "No leads in this view"}
              </p>

              {anyFilterActive && (
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  onClick={clearAllFilters}
                >
                  <Filter className="size-3.5" />
                  Clear all filters
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y">
              {filteredLeads.map((lead) => {
                const statusConfig = getStatusConfig(lead.status)
                const tel = lead.phone.replace(/\D/g, "")
                const expanded = expandedIds.has(lead.id)

                return (
                  <div key={lead.id}>
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => onOpenLead?.(lead.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          onOpenLead?.(lead.id)
                        }
                      }}
                      className="cursor-pointer"
                    >
                      <LeadQueueRow
                        id={lead.id}
                        name={lead.name}
                        phone={lead.phone}
                        equipment={lead.equipment}
                        location={[
                          lead.city,
                          lead.state,
                        ]
                          .filter(
                            (v) => v && v !== "—",
                          )
                          .join(", ") || undefined}
                        replied={lead.replied}
                        onOpen={onOpenLead}
                        urgent={
                          lead.lastOutcome ===
                          "wrong_number"
                            ? {
                                label: "Wrong number",
                              }
                            : undefined
                        }
                        flag={
                          lead.meetingPending
                            ? {
                                label:
                                  "Meeting pending",
                              }
                            : undefined
                        }

                        className={[
                          lead.flagged
                            ? "bg-slate-900 text-white border-l-4 border-l-amber-400 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)] hover:bg-slate-900 [&_*]:text-white [&_*]:hover:text-white"
                            : lead.lastOutcome ===
                                "wrong_number"
                              ? "bg-destructive/[0.04]"
                              : "",
                        ]
                          .filter(Boolean)
                          .join(" ") ||
                          undefined
                        }

                        meta={
                          <span className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                            {lead.value && (
                              <>
                                <span
                                  className={[
                                    "font-medium",
                                    lead.flagged
                                      ? "text-white"
                                      : "text-foreground",
                                  ].join(" ")}
                                >
                                  {lead.value}
                                </span>
                                <span>•</span>
                              </>
                            )}

                            <span>{lead.source}</span>
                            <span>•</span>

                            <span>
                              added{" "}
                              {formatTime(
                                lead.createdAt,
                              )}
                            </span>

                            {lead.phoneVerified ? (
                              <span className="inline-flex items-center gap-0.5 text-success">
                                <ShieldCheck className="size-3" />
                                verified
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-0.5 text-destructive">
                                <ShieldAlert className="size-3" />
                                unverified
                              </span>
                            )}

                            {lead.lastOutcome &&
                              lead.lastOutcomeBy && (
                                <>
                                  <span>•</span>

                                  <span>
                                    {
                                      lastOutcomeLabel(
                                        lead.lastOutcome,
                                      )
                                    }{" "}
                                    by{" "}
                                    <span
                                      className="font-bold"
                                      style={{
                                        color:
                                          lead.flagged
                                            ? "#fbbf24"
                                            : repColor(
                                                lead.lastOutcomeBy,
                                              ),
                                      }}
                                    >
                                      {
                                        lead.lastOutcomeBy
                                      }
                                    </span>

                                    {lead.lastOutcomeAt
                                      ? ` · ${new Date(
                                          lead.lastOutcomeAt,
                                        ).toLocaleString(
                                          undefined,
                                          {
                                            day: "2-digit",
                                            month: "short",
                                            hour: "2-digit",
                                            minute: "2-digit",
                                          },
                                        )}`
                                      : ""}
                                  </span>
                                </>
                              )}
                          </span>
                        }

                        badge={
                          <Badge
                            variant="outline"
                            className={[
                              "text-[10px] font-medium",
                              lead.flagged
                                ? "border-slate-500 bg-slate-800 text-white"
                                : statusConfig.className,
                            ].join(" ")}
                          >
                            {statusConfig.label}
                          </Badge>
                        }

                        actions={
                          <div className="flex items-center gap-1">
                            {/* Flag toggle */}
                            <Button
                              size="sm"
                              variant="ghost"
                              className={[
                                "h-8 w-8 p-0 transition-colors",
                                lead.flagged
                                  ? "text-amber-400 hover:text-amber-300 hover:bg-slate-800"
                                  : "text-muted-foreground/40 hover:text-amber-400 hover:bg-amber-50/50",
                              ].join(" ")}
                              title={
                                lead.flagged
                                  ? "Remove flag"
                                  : "Flag as high-priority"
                              }
                              onClick={(e) => {
                                e.stopPropagation()
                                flagLead({
                                  id: lead.id,
                                  flagged:
                                    !lead.flagged,
                                })
                              }}
                            >
                              <Flag
                                className={`size-3.5 ${
                                  lead.flagged
                                    ? "fill-amber-400"
                                    : ""
                                }`}
                              />
                            </Button>

                            {/* Call */}
                            {tel.length >= 10 ? (
                              <Button
                                asChild
                                size="sm"
                                className="h-8 px-2.5 gap-1.5 bg-success hover:bg-success/90 text-success-foreground"
                              >
                                <a
                                  href={`tel:${tel}`}
                                  onClick={(e) =>
                                    e.stopPropagation()
                                  }
                                >
                                  <Phone className="size-3" />
                                  Call
                                </a>
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                disabled
                                className="h-8 px-2.5 gap-1.5"
                              >
                                <Phone className="size-3" />
                                Call
                              </Button>
                            )}

                            {/* Cockpit */}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation()
                                toggle(lead.id)
                              }}
                              className={[
                                "h-8 px-2.5 gap-1",
                                lead.flagged
                                  ? "border-slate-600 bg-slate-800 text-white hover:bg-slate-700 hover:text-white"
                                  : "",
                              ].join(" ")}
                              title="Open cockpit"
                            >
                              {expanded ? (
                                <ChevronDown className="size-3.5" />
                              ) : (
                                <ChevronRight className="size-3.5" />
                              )}

                              <SlidersHorizontal className="size-3.5" />
                              Cockpit
                            </Button>

                            {/* Send Catalogue */}
                            <SendCatalogueButton
                              leadId={lead.id}
                              phone={lead.phone}
                              iconOnly
                              variant="outline"
                              className={[
                                "h-8 w-8 p-0",
                                lead.flagged
                                  ? "border-slate-600 bg-slate-800 text-white hover:bg-slate-700"
                                  : "",
                              ].join(" ")}
                            />

                            {/* More */}
                            <DropdownMenu>
                              <DropdownMenuTrigger
                                asChild
                              >
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className={[
                                    "h-8 w-8 p-0",
                                    lead.flagged
                                      ? "text-white hover:bg-slate-800 hover:text-white"
                                      : "",
                                  ].join(" ")}
                                  onClick={(e) =>
                                    e.stopPropagation()
                                  }
                                >
                                  <MoreHorizontal className="size-4" />
                                </Button>
                              </DropdownMenuTrigger>

                              <DropdownMenuContent align="end" className="w-40">
                                <DropdownMenuItem className="text-xs">
                                  <MessageSquare className="mr-2 size-3.5" />
                                  WhatsApp
                                </DropdownMenuItem>

                                <DropdownMenuItem className="text-xs">
                                  <Calendar className="mr-2 size-3.5" />
                                  Schedule
                                </DropdownMenuItem>

                                <DropdownMenuSeparator />

                                <DropdownMenuItem
                                  className="text-xs"
                                  onClick={() =>
                                    onOpenLead?.(
                                      lead.id,
                                    )
                                  }
                                >
                                  <ChevronRight className="mr-2 size-3.5" />
                                  View Details
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        }
                      />
                    </div>

                    {expanded && (
                      <LeadCockpitPanel
                        leadId={lead.id}
                        onOpenFull={onOpenLead}
                      />
                    )}
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
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton
                key={i}
                className="h-3.5 w-3/4"
              />
            ))}
          </div>

          {Array.from({ length: 8 }).map((_, row) => (
            <div
              key={row}
              className="border-b p-3 grid grid-cols-6 gap-2 items-center"
            >
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