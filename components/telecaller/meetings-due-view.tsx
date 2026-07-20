"use client"

import { CalendarClock, Video, MapPin, PhoneCall, AlertCircle, CheckCircle2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ViewSkeleton } from "./view-skeleton"
import { LeadQueueRow } from "./lead-queue-row"
import { useMeetingsDueLeads } from "@/hooks/use-leads"
import type { MeetingsDueLead } from "@/lib/types/lead"

interface MeetingsDueViewProps {
  onOpenLead: (id: string) => void
}

export function MeetingsDueView({ onOpenLead }: MeetingsDueViewProps) {
  const { data: meetings = [], isLoading } = useMeetingsDueLeads()
  if (isLoading) return <ViewSkeleton />

  const now = new Date()
  const endOfToday = new Date(now)
  endOfToday.setHours(23, 59, 59, 999)
  const today = meetings.filter((m) => m.meetingAt.getTime() <= endOfToday.getTime())
  const upcoming = meetings.filter((m) => m.meetingAt.getTime() > endOfToday.getTime())

  const renderRow = (m: MeetingsDueLead) => {
    const tel = m.phone.replace(/\D/g, "")
    const isZoom = m.meetingType === "zoom"
    const overdue = m.meetingAt.getTime() < now.getTime()
    return (
      <LeadQueueRow
        key={m.meetingId}
        id={m.id}
        name={m.name}
        phone={m.phone}
        equipment={m.equipment}
        onOpen={() => onOpenLead(m.id)}
        className={overdue && !m.summaryUploaded ? "bg-rose-50 hover:bg-rose-100/70" : undefined}
        meta={
          <span className="flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1 font-medium text-foreground">
              {isZoom ? <Video className="size-3" /> : <MapPin className="size-3" />}
              {m.meetingAt.toLocaleString()}
            </span>
            {!isZoom && m.location && <span>· {m.location}</span>}
            {m.assignedSalesperson && <span>· with {m.assignedSalesperson}</span>}
            {m.summaryUploaded ? (
              <span className="inline-flex items-center gap-1 text-success"><CheckCircle2 className="size-3" />Summary in</span>
            ) : overdue ? (
              <span className="inline-flex items-center gap-1 font-medium text-rose-600"><AlertCircle className="size-3" />Meeting time passed</span>
            ) : null}
          </span>
        }
        badge={<Badge variant="outline" className="text-[10px]">{isZoom ? "Zoom" : "Physical"}</Badge>}
        actions={
          <div className="flex items-center gap-1.5">
            {isZoom && m.joinUrl ? (
              <Button asChild size="sm" className="gap-1.5"><a href={m.joinUrl} target="_blank" rel="noreferrer"><Video className="size-3.5" />Join</a></Button>
            ) : tel.length >= 10 ? (
              <Button asChild size="sm" variant="outline" className="gap-1.5"><a href={`tel:${tel}`}><PhoneCall className="size-3.5" />Call</a></Button>
            ) : null}
            <Button size="sm" variant="ghost" onClick={() => onOpenLead(m.id)}>Open</Button>
          </div>
        }
      />
    )
  }

  return (
    <Tabs defaultValue="today" className="gap-4">
      <TabsList className="grid w-full max-w-md grid-cols-2">
        <TabsTrigger value="today" className="gap-1.5">
          <CalendarClock className="size-3.5" />Today
          {today.length > 0 && (
            <Badge variant="secondary" className="ml-0.5 h-4 min-w-4 px-1 text-[10px]">{today.length}</Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="upcoming" className="gap-1.5">
          <CalendarClock className="size-3.5" />Upcoming
          {upcoming.length > 0 && (
            <Badge variant="secondary" className="ml-0.5 h-4 min-w-4 px-1 text-[10px]">{upcoming.length}</Badge>
          )}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="today" className="mt-0 space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <CalendarClock className="size-4 text-primary" />Meetings Due — Today
                </CardTitle>
                <CardDescription>Zoom and physical meetings scheduled for today, earliest first. A meeting whose time has passed with no summary turns <span className="font-medium text-rose-600">pastel red</span>. Future meetings live under <span className="font-medium text-foreground">Upcoming</span> until their day.</CardDescription>
              </div>
              <Badge variant="outline" className="text-[10px]">{today.length} due</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {today.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10">No meetings due today</p>
            ) : (
              <div className="divide-y">{today.map(renderRow)}</div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="upcoming" className="mt-0">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <CalendarClock className="size-4 text-primary" />Upcoming Meetings
                </CardTitle>
                <CardDescription>Every future-dated meeting, earliest first.</CardDescription>
              </div>
              <Badge variant="outline" className="text-[10px]">{upcoming.length} upcoming</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10">No upcoming meetings</p>
            ) : (
              <div className="divide-y">{upcoming.map(renderRow)}</div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}
