"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  PhoneOff, 
  X,
  Clock,
  AlertTriangle
} from "lucide-react"

interface NoResponseBannerProps {
  leadName: string
  leadPhone: string
  failedAttempts: number
  lastAttemptTime: Date
  onSendWhatsApp: () => void
  onDismiss: () => void
}

export function NoResponseBanner({
  leadName,
  leadPhone,
  failedAttempts,
  lastAttemptTime,
  onSendWhatsApp,
  onDismiss,
}: NoResponseBannerProps) {
  const [isSending, setIsSending] = useState(false)

  if (failedAttempts < 4) return null

  const handleSendWhatsApp = async () => {
    setIsSending(true)
    await new Promise(resolve => setTimeout(resolve, 1000))
    onSendWhatsApp()
    setIsSending(false)
  }

  const timeSinceLastAttempt = () => {
    const diff = Date.now() - lastAttemptTime.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    if (hours < 1) return "just now"
    if (hours < 24) return `${hours}h ago`
    return `${Math.floor(hours / 24)}d ago`
  }

  return (
    <div className="relative rounded-lg border border-warning/40 bg-warning/5 p-4">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-warning/20">
          <AlertTriangle className="size-5 text-warning" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-sm font-semibold text-foreground">No Response Recovery Needed</h4>
            <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 text-[10px]">
              {failedAttempts} failed calls
            </Badge>
          </div>
          
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <PhoneOff className="size-3" />
              <span className="font-medium text-foreground">{leadName}</span>
              <span>({leadPhone})</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="size-3" />
              <span>Last attempt: {timeSinceLastAttempt()}</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            onClick={handleSendWhatsApp}
            disabled={isSending}
            className="h-8 gap-1.5 bg-[#25D366] hover:bg-[#128C7E] text-white"
          >
            <svg className="size-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            {isSending ? "Sending..." : "Send Recovery WhatsApp"}
          </Button>
        </div>
      </div>
      
      <Button
        variant="ghost"
        size="sm"
        className="absolute top-2 right-2 h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
        onClick={onDismiss}
      >
        <X className="size-4" />
        <span className="sr-only">Dismiss</span>
      </Button>
    </div>
  )
}
