"use client"

// Amendment 2 (Theme 1) — the call-log "cockpit". Mounted inline inside an expanded
// calls-due (or pipeline) row so the rep does EVERYTHING from one screen without hopping
// pages: log a call + qualify, change stage/route, book a Zoom or physical meeting, and
// edit every field of the lead. It reuses the exact same tab components the full
// lead-detail page uses (CallsTab / MeetingsTab / DripTab) so the surfaces stay
// identical everywhere, plus the full-field EditLeadForm.

import { useState } from "react"
import { Loader2, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useLeadFullDetail } from "@/hooks/use-leads"
import { mapDetail, CallsTab, MeetingsTab, DripTab } from "./lead-detail-view"
import { EditLeadForm } from "./edit-lead-form"

export function LeadCockpitPanel({
  leadId,
  onOpenFull,
}: {
  leadId: string
  /** Optional deep-link to the full lead-detail page. */
  onOpenFull?: (id: string) => void
}) {
  const { data, isLoading } = useLeadFullDetail(leadId)
  const [tab, setTab] = useState("log")

  if (isLoading || !data) {
    return (
      <div className="bg-muted/30 px-4 py-6 sm:pl-16 flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="size-3.5 animate-spin" /> Loading cockpit…
      </div>
    )
  }

  const lead = mapDetail(data)

  return (
    <div className="bg-muted/30 px-4 pb-4 pt-3 sm:pl-16 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold text-muted-foreground">
          Cockpit — do everything for this lead here
        </p>
        {onOpenFull && (
          <Button size="sm" variant="ghost" className="gap-1 h-7" onClick={() => onOpenFull(leadId)}>
            <ExternalLink className="size-3.5" /> Full detail
          </Button>
        )}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="log" className="text-xs">Log &amp; Qualify</TabsTrigger>
          <TabsTrigger value="meetings" className="text-xs">Meetings</TabsTrigger>
          <TabsTrigger value="drip" className="text-xs">Drip</TabsTrigger>
          <TabsTrigger value="edit" className="text-xs">Edit</TabsTrigger>
        </TabsList>

        {/* The Next-Action CTA inside CallsTab navigates to meetings/drip — wire it to
            the cockpit's own tabs so it stays on the same screen. */}
        <TabsContent value="log" className="mt-3">
          <CallsTab lead={lead} onNavigate={setTab} />
        </TabsContent>
        <TabsContent value="meetings" className="mt-3">
          <MeetingsTab lead={lead} />
        </TabsContent>
        <TabsContent value="drip" className="mt-3">
          <DripTab lead={lead} />
        </TabsContent>
        <TabsContent value="edit" className="mt-3">
          <EditLeadForm
            leadId={lead.id}
            initial={{
              name: lead.name,
              phone: lead.phone === "—" ? "" : lead.phone,
              whatsappNumber: lead.whatsappNumber ?? "",
              email: lead.email ?? "",
              city: lead.city === "—" ? "" : lead.city,
              state: lead.state ?? "",
              pincode: lead.pincode ?? "",
              address: lead.address ?? "",
              equipment: lead.equipment === "—" ? "" : lead.equipment,
              source: lead.source === "—" ? "" : lead.source,
              category: lead.category ?? "",
              interestLevel: lead.interestLevel ?? "",
              budgetRange: lead.budgetRange ?? "",
              purchaseType: lead.purchaseType ?? "",
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
