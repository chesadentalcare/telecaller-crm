"use client"

import { PhoneOff, RefreshCw, Phone } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { WhatsAppIcon } from "@/components/icons/whatsapp-icon"
import { ViewSkeleton } from "./view-skeleton"
import { useNoResponseLeads } from "@/hooks/use-leads"

export function NoResponseView() {
  const { data: leads = [], isLoading } = useNoResponseLeads()
  if (isLoading) return <ViewSkeleton />

  return (
    <div className="space-y-4">
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
              <WhatsAppIcon className="size-4" />
              Bulk WhatsApp
            </Button>
          </div>
        </CardContent>
      </Card>

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
                    {lead.name.split(" ").map((n) => n[0]).join("")}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{lead.name}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{lead.phone}</span><span>•</span><span>{lead.equipment}</span>
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
                      <WhatsAppIcon className="size-4 text-[#25D366]" />
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
