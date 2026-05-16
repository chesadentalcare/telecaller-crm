"use client"

import { useEffect, useRef, useState } from "react"
import Autoplay from "embla-carousel-autoplay"
import {
  Flame, RefreshCw, Timer, Target, Lightbulb, ArrowRight,
} from "lucide-react"

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"

// ─── Slide definitions ──────────────────────────────────────────────────
// Each slide is self-contained: when a slide is added/removed/reordered,
// only this array changes — banner code is closed for modification (OCP).
interface SlideAction {
  label: string
  // Navigation target — matches a key in app/page.tsx VIEW_REGISTRY.
  view: string
}

interface HeroSlide {
  id: string
  // Tailwind gradient utilities — kept here so theming is one place.
  gradient: string
  iconBg: string
  iconColor: string
  icon: React.ComponentType<{ className?: string }>
  eyebrow: string          // Small uppercase label
  headline: string         // Big bold line
  body: string             // Supporting copy
  action?: SlideAction
  // Optional progress bar (0-100) shown under the body.
  progress?: { value: number; label: string }
}

const SLIDES: HeroSlide[] = [
  {
    id: "hot-leads",
    gradient: "bg-gradient-to-br from-red-500/15 via-orange-500/10 to-amber-500/5",
    iconBg: "bg-red-500/15",
    iconColor: "text-red-600",
    icon: Flame,
    eyebrow: "Today's focus",
    headline: "5 hot leads are waiting",
    body: "Highest-value calls first — these doctors are ready to buy in <30 days.",
    action: { label: "Open Pipeline", view: "pipeline" },
  },
  {
    id: "recovery",
    gradient: "bg-gradient-to-br from-amber-500/15 via-yellow-500/10 to-lime-500/5",
    iconBg: "bg-amber-500/15",
    iconColor: "text-amber-600",
    icon: RefreshCw,
    eyebrow: "Recovery queue",
    headline: "4 leads need a WhatsApp nudge",
    body: "Failed 4+ call attempts — a templated WhatsApp re-engages 38% of them.",
    action: { label: "Go to Recovery", view: "no-response" },
  },
  {
    id: "drip",
    gradient: "bg-gradient-to-br from-violet-500/15 via-purple-500/10 to-fuchsia-500/5",
    iconBg: "bg-violet-500/15",
    iconColor: "text-violet-600",
    icon: Timer,
    eyebrow: "Drip campaigns",
    headline: "8 messages queued for today",
    body: "Auto-send fires every 30 minutes. Skim the queue before it sends.",
    action: { label: "Review Drip", view: "drip" },
  },
  {
    id: "target",
    gradient: "bg-gradient-to-br from-emerald-500/15 via-teal-500/10 to-cyan-500/5",
    iconBg: "bg-emerald-500/15",
    iconColor: "text-emerald-600",
    icon: Target,
    eyebrow: "Daily target",
    headline: "78% of today's call goal",
    body: "13 calls to hit 60. You're ahead of your weekly pace — keep going.",
    progress: { value: 78, label: "47 / 60 calls" },
  },
  {
    id: "tip",
    gradient: "bg-gradient-to-br from-blue-500/15 via-sky-500/10 to-indigo-500/5",
    iconBg: "bg-blue-500/15",
    iconColor: "text-blue-600",
    icon: Lightbulb,
    eyebrow: "Smart tip",
    headline: "Call 11am–1pm to convert 3× more",
    body: "Based on the last 30 days — dentists are between patients in this window.",
  },
]

const AUTOPLAY_DELAY_MS = 5000

interface HomeHeroBannerProps {
  onNavigate?: (view: string) => void
}

export function HomeHeroBanner({ onNavigate }: HomeHeroBannerProps) {
  const [api, setApi] = useState<CarouselApi>()
  const [current, setCurrent] = useState(0)

  // Plugin instance lives in a ref — Autoplay() is a factory and must be
  // created exactly once. Recreating it per render restarts the timer and
  // breaks pause-on-hover. (Standard embla pattern.)
  const autoplayPlugin = useRef(
    Autoplay({
      delay: AUTOPLAY_DELAY_MS,
      stopOnInteraction: false,
      stopOnMouseEnter: true,
    }),
  )

  // Track selected slide for the dots indicator.
  useEffect(() => {
    if (!api) return
    setCurrent(api.selectedScrollSnap())
    const onSelect = () => setCurrent(api.selectedScrollSnap())
    api.on("select", onSelect)
    api.on("reInit", onSelect)
    return () => {
      api.off("select", onSelect)
      api.off("reInit", onSelect)
    }
  }, [api])

  const goTo = (index: number) => {
    api?.scrollTo(index)
    // Restart autoplay so the new slide gets its full dwell time.
    autoplayPlugin.current.reset()
  }

  return (
    <div className="relative">
      <Carousel
        setApi={setApi}
        plugins={[autoplayPlugin.current]}
        opts={{ loop: true, align: "start" }}
        className="overflow-hidden rounded-xl"
      >
        <CarouselContent className="ml-0">
          {SLIDES.map((slide) => {
            const Icon = slide.icon
            return (
              <CarouselItem key={slide.id} className="pl-0 basis-full">
                <div
                  className={cn(
                    "relative overflow-hidden rounded-xl border bg-card",
                    slide.gradient,
                  )}
                >
                  {/* Decorative orb — visible on lg+ */}
                  <div className="pointer-events-none absolute -right-10 -top-10 hidden size-48 rounded-full bg-white/30 blur-3xl lg:block" />

                  <div className="relative flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                    <div className="flex items-start gap-4 min-w-0 flex-1">
                      <div
                        className={cn(
                          "flex size-12 shrink-0 items-center justify-center rounded-xl shadow-sm",
                          slide.iconBg,
                        )}
                      >
                        <Icon className={cn("size-6", slide.iconColor)} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          {slide.eyebrow}
                        </p>
                        <h3 className="mt-0.5 text-base font-semibold text-foreground sm:text-lg">
                          {slide.headline}
                        </h3>
                        <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                          {slide.body}
                        </p>
                        {slide.progress && (
                          <div className="mt-3 flex items-center gap-3 max-w-sm">
                            <Progress value={slide.progress.value} className="h-1.5 flex-1" />
                            <span className="text-[11px] font-medium text-muted-foreground whitespace-nowrap">
                              {slide.progress.label}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {slide.action && (
                      <Button
                        size="sm"
                        variant="secondary"
                        className="shrink-0 gap-1.5 self-start sm:self-center"
                        onClick={() => onNavigate?.(slide.action!.view)}
                      >
                        {slide.action.label}
                        <ArrowRight className="size-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </CarouselItem>
            )
          })}
        </CarouselContent>
      </Carousel>

      {/* Dots indicator — outer button wraps tap target (min 32×32) so taps
          are forgiving on mobile; the visible bar sits centered inside. */}
      <div className="mt-2 flex items-center justify-center gap-0.5" role="tablist" aria-label="Banner slides">
        {SLIDES.map((slide, i) => {
          const active = current === i
          return (
            <button
              key={slide.id}
              type="button"
              onClick={() => goTo(i)}
              role="tab"
              aria-selected={active}
              aria-label={`Go to slide ${i + 1}: ${slide.headline}`}
              className="group flex h-8 items-center justify-center px-2"
            >
              <span
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  active
                    ? "w-6 bg-primary"
                    : "w-1.5 bg-muted-foreground/30 group-hover:bg-muted-foreground/50",
                )}
              />
            </button>
          )
        })}
      </div>
    </div>
  )
}
