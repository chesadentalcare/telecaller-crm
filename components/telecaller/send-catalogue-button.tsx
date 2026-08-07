"use client"

import { useState } from "react"
import { BookOpen, Send, Loader2, ExternalLink, FileText } from "lucide-react"
import { toast } from "sonner"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { catalogueApi, type CatalogueInfo } from "@/lib/api/quotation"

type BtnSize = "sm" | "default" | "lg" | "icon"
type BtnVariant = "default" | "outline" | "ghost" | "secondary"

interface SendCatalogueButtonProps {
  leadId: string | number
  phone?: string
  iconOnly?: boolean
  label?: string
  size?: BtnSize
  variant?: BtnVariant
  className?: string
}

// Sends the approved Ashva catalogue (chesa_m1_recap) to the lead's WhatsApp on a
// manual click. Template-based, so it delivers at any stage — no 24h window needed.
// Preview the hosted PDF before sending.
export function SendCatalogueButton({
  leadId,
  phone,
  iconOnly = false,
  label = "Catalogue",
  size = "sm",
  variant = "outline",
  className,
}: SendCatalogueButtonProps) {
  const [open, setOpen] = useState(false)
  const [info, setInfo] = useState<CatalogueInfo | null>(null)
  const [loadingInfo, setLoadingInfo] = useState(false)
  const [sending, setSending] = useState(false)

  const loadInfo = async () => {
    if (info || loadingInfo) return
    setLoadingInfo(true)
    try {
      setInfo(await catalogueApi.info())
    } catch {
      // Non-fatal — preview link just won't render; sending still works.
    } finally {
      setLoadingInfo(false)
    }
  }

  const handleOpenChange = (next: boolean) => {
    setOpen(next)
    if (next) loadInfo()
  }

  const handleSend = async () => {
    setSending(true)
    try {
      const res = await catalogueApi.send(leadId)
      toast.success(res.dryRun ? "Catalogue queued (dry-run)" : "Catalogue sent on WhatsApp")
      setOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send catalogue")
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          type="button"
          size={iconOnly ? "icon" : size}
          variant={variant}
          className={className}
          onClick={(e) => e.stopPropagation()}
          title="Send catalogue on WhatsApp"
        >
          <BookOpen className="size-3.5" />
          {!iconOnly && <span className="ml-1.5">{label}</span>}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="size-4" />
            Send Catalogue
          </DialogTitle>
          <DialogDescription>
            Sends the approved Ashva product catalogue to the doctor on WhatsApp
            {phone ? ` (${phone})` : ""}. Works at any stage — no reply needed first.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-md border bg-muted/40 p-3 text-sm">
          {loadingInfo ? (
            <span className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" /> Loading catalogue…
            </span>
          ) : info ? (
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 truncate">
                <FileText className="size-4 shrink-0 text-muted-foreground" />
                <span className="truncate">{info.label}</span>
              </span>
              <a
                href={info.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex shrink-0 items-center gap-1 text-primary hover:underline"
              >
                <ExternalLink className="size-3.5" /> Preview PDF
              </a>
            </div>
          ) : (
            <span className="text-muted-foreground">The Ashva product catalogue (PDF).</span>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={sending}>
            Cancel
          </Button>
          <Button
            type="button"
            className="gap-1.5 bg-green-600 hover:bg-green-700"
            onClick={handleSend}
            disabled={sending}
          >
            {sending ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
            Send on WhatsApp
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
