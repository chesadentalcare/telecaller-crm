"use client"

import { useState } from "react"
import { PhoneMissed, Send, Loader2 } from "lucide-react"
import { toast } from "sonner"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useRecoveryWhatsapp } from "@/hooks/use-lead-mutations"

type BtnSize = "sm" | "default" | "lg" | "icon"
type BtnVariant = "default" | "outline" | "ghost" | "secondary"

interface SendRecoveryButtonProps {
  leadId: string | number
  phone?: string
  dentistName?: string
  equipmentInterest?: string
  iconOnly?: boolean
  label?: string
  size?: BtnSize
  variant?: BtnVariant
  className?: string
  disabled?: boolean
  onSent?: () => void
}

export function SendRecoveryButton({
  leadId,
  phone,
  dentistName,
  equipmentInterest,
  iconOnly = false,
  label = "Tried to call",
  size = "sm",
  variant = "outline",
  className,
  disabled = false,
  onSent,
}: SendRecoveryButtonProps) {
  const [open, setOpen] = useState(false)
  const { mutateAsync, isPending } = useRecoveryWhatsapp(leadId)

  const handleSend = async () => {
    if (!phone) {
      toast.error("This lead has no phone number")
      return
    }
    try {
      await mutateAsync({ phone: phone.replace(/\D/g, ""), dentistName, equipmentInterest })
      toast.success("“Tried to call” message sent on WhatsApp")
      setOpen(false)
      onSent?.()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send the message")
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          size={iconOnly ? "icon" : size}
          variant={variant}
          className={className}
          disabled={disabled}
          onClick={(e) => e.stopPropagation()}
          title="Send a 'we tried to call you' WhatsApp"
        >
          <PhoneMissed className="size-3.5" />
          {!iconOnly && <span className="ml-1.5">{label}</span>}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PhoneMissed className="size-4" />
            Send “we tried to call you”
          </DialogTitle>
          <DialogDescription>
            Sends the approved WhatsApp letting the doctor know you tried to reach them and asking them to reply
            here or call back{phone ? ` (${phone})` : ""}. Template-based — works at any stage, no reply needed first.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
          This logs a WhatsApp-recovery attempt on the lead and opens the 7-day reply window, so if the doctor replies
          it comes straight back to you.
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button
            type="button"
            className="gap-1.5 bg-green-600 hover:bg-green-700"
            onClick={handleSend}
            disabled={isPending || !phone}
          >
            {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
            Send on WhatsApp
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
