"use client"

import * as React from "react"
import { Loader2 } from "lucide-react"
import type { VariantProps } from "class-variance-authority"

import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type PendingButtonProps = Omit<React.ComponentProps<"button">, "disabled"> &
  VariantProps<typeof buttonVariants> & {
    pending?: boolean
    disabled?: boolean
    spinnerClassName?: string
  }

export function PendingButton({
  pending = false,
  disabled = false,
  children,
  spinnerClassName,
  ...props
}: PendingButtonProps) {
  return (
    <Button {...props} disabled={disabled || pending} aria-busy={pending || undefined}>
      {pending && <Loader2 className={cn("size-4 animate-spin", spinnerClassName)} />}
      {children}
    </Button>
  )
}
