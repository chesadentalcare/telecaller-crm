"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  BookOpen, PhoneCall, CalendarClock, Repeat, XCircle, PhoneOff, PhoneMissed,
} from "lucide-react"

// In-app training guide for the telecaller flow (mirrors Telecaller_Flow_Guide.md).
// Plain language + flow charts so Neha can read "what happens when I enter a lead".

function Chart({ children }: { children: string }) {
  return (
    <pre className="mt-2 overflow-x-auto rounded-lg border bg-muted/40 p-3 text-[11px] leading-5 text-foreground/80">
      {children}
    </pre>
  )
}

function Section({ n, title, icon: Icon, children }: { n: string; title: string; icon?: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <span className="flex size-6 items-center justify-center rounded-md bg-primary/10 text-xs font-bold text-primary">{n}</span>
          {Icon ? <Icon className="size-4 text-primary" /> : null}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-muted-foreground">{children}</CardContent>
    </Card>
  )
}

const OUTCOMES = [
  { pick: "Interested", mean: "Wants to buy / know more", extra: "Ready now? + budget/product/when", icon: PhoneCall },
  { pick: "Call back later", mean: "Asked you to call again", extra: "Date & time to call", icon: CalendarClock },
  { pick: "Not interested", mean: "Doesn't want it", extra: "The reason", icon: XCircle },
  { pick: "No response", mean: "Didn't pick up", extra: "Nothing — just save", icon: PhoneOff },
  { pick: "Wrong number", mean: "Number is wrong", extra: "Nothing — just save", icon: PhoneMissed },
]

const CHEATS = [
  ["Wants to buy now", "Interested → Yes, ready now", "Books a meeting → Sales"],
  ["Wants it later", "Interested → Not yet", "Follow-up plan on their buy-timeline"],
  ["“Call me later”", "Call back later (+ time)", "Schedules the callback"],
  ["Not now — money/timing", "Not interested → Interested later", "6-month follow-up"],
  ["Already bought", "Not interested → Bought elsewhere", "Long-term check-ins"],
  ["Truly not interested", "Not interested → Not at all", "Closes the lead"],
  ["Didn't pick up", "No response", "Retries (system-timed), closes after 4"],
  ["Wrong number", "Wrong number", "Flags it (fix to re-open)"],
]

const STAGES = [
  ["Active", "Working now — freshly entered, being called. Your live pile."],
  ["Nurturing", "On an automatic follow-up plan — the system sends reminders on their buy-timeline."],
  ["No Response", "In the retry cycle — the system re-times the next call; it comes back to your Calls Due."],
  ["Idle", "Went quiet — stalled with no activity for a while. Give it a nudge."],
  ["Long-cycle", "Very long timeline (e.g. bought elsewhere) — occasional check-ins over a long horizon."],
  ["Re-qualify", "Came back / replied — re-check their need & budget before moving it forward."],
  ["Reactivation", "A dormant lead brought back for a fresh attempt — a cold lead being re-warmed."],
  ["Archived", "Closed — not interested / retries exhausted / follow-up finished. Can be revived."],
]

const STAGE_WHEN = [
  { stage: "Idle", when: "You sent a quote, then 14+ days passed with no activity on it.", act: "Call them — re-quote, book a meeting, or close it. You + your manager get pinged." },
  { stage: "Long-cycle", when: "You marked Not interested → “Bought elsewhere.”", act: "Nothing — the system drips gently for ~2 years in case they need another chair." },
  { stage: "Re-qualify", when: "A nurtured lead replies / changes details, OR a timing-budget lead's wait ends, OR you revive an archived lead.", act: "Open it and re-check need, budget & timeline — saving that clears the flag." },
  { stage: "Reactivation", when: "A “timing/budget” lead's 6-month wait is due within a week.", act: "Call them fresh — a warm second chance now their timing may be right." },
  { stage: "Archived", when: "Not interested “at all”, OR no answer after 4 attempts, OR a follow-up finished with no reply.", act: "Usually nothing. Revive with “Bring back as No Response” if needed." },
]

export function DocsView() {
  return (
    <div className="mx-auto max-w-3xl space-y-4 pb-8">
      <div className="rounded-xl border bg-muted/20 p-4">
        <div className="flex items-center gap-2 text-base font-semibold">
          <BookOpen className="size-5 text-primary" /> Telecaller Flow — How it works
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          You do two things: <b>call the doctor</b>, and <b>record what happened</b>. The system does the
          rest — reminders, follow-ups, scheduling. This guide shows exactly where each lead goes.
        </p>
      </div>

      <Section n="1" title="The big picture">
        <p>A lead comes from a Facebook / Meta ad → you call the doctor → you enter the lead and log
          &ldquo;what happened&rdquo; → the system automatically decides what happens next.</p>
        <Chart>{`  Facebook / Meta ad
        │
        ▼
  YOU call the doctor  ☎
        │
        ▼
  YOU enter the lead + pick "What happened on the call?"
        │
        ▼
  The SYSTEM routes it  ⇢  meeting / follow-up / callback / closed`}</Chart>
      </Section>

      <Section n="2" title="Entering a lead each day" icon={PhoneCall}>
        <ol className="ml-4 list-decimal space-y-1">
          <li>Tap <b>Add lead</b>.</li>
          <li>Fill the basics: <b>Name, Mobile, State, City</b> (from the ad).</li>
          <li>Choose <b>&ldquo;What happened on the call?&rdquo;</b> — the most important step.</li>
          <li>A few more boxes appear depending on your choice.</li>
          <li>Tap <b>Add lead</b> — saved and routed.</li>
        </ol>
        <p className="rounded-md bg-primary/5 p-2 text-foreground/80">💡 You call first, then enter — so you already know what happened. You&rsquo;re just telling the system.</p>
        <p className="rounded-md bg-emerald-500/10 p-2 text-foreground/80">✅ <b>No number verification step</b> — a lead you add here is call-ready right away. And if you pick the wrong outcome, just open the lead and log a corrected call. Nothing is lost.</p>
      </Section>

      <Section n="3" title="The 5 things that can happen on a call">
        <p>Not sure which to pick? Just follow this ladder:</p>
        <Chart>{`Did they pick up?
  │
  ├─ NO ───────────────►  "No response"    → just save (system retries)
  │                        wrong person?    → "Wrong number"  → just save
  │
  └─ YES ─ interested?
             │
             ├─ "call me later" ─►  "Call back later"  → pick date & time
             │
             ├─ NO ──────────────►  "Not interested"   → pick the reason
             │
             └─ YES ─────────────►  "Interested"       → buying now?
                                       ├─ Yes → book a meeting
                                       └─ No  → set WHEN they'll buy`}</Chart>
        <div className="divide-y rounded-lg border">
          {OUTCOMES.map((o) => (
            <div key={o.pick} className="flex items-start gap-3 p-2.5">
              <o.icon className="mt-0.5 size-4 shrink-0 text-primary" />
              <div>
                <div className="text-sm font-medium text-foreground">{o.pick} <span className="font-normal text-muted-foreground">— {o.mean}</span></div>
                <div className="text-xs text-muted-foreground">Extra to fill: {o.extra}</div>
              </div>
            </div>
          ))}
        </div>
        <Chart>{`                    WHAT HAPPENED ON THE CALL?
                              │
   ┌────────────┬────────────┼────────────┬────────────┐
   ▼            ▼            ▼            ▼            ▼
INTERESTED  CALL BACK   NOT INTEREST  NO RESPONSE  WRONG NUMBER
   │          LATER          │            │            │
   ▼            ▼            ▼            ▼            ▼
Meeting OR   Callback     Closed OR    Retry up to  Fix number
Follow-up    scheduled    Follow-up    4× then      to re-open
                                       closed`}</Chart>
      </Section>

      <Section n="4" title="Interested — the most important one" icon={PhoneCall}>
        <p>When you pick <b>Interested</b>, the system asks: <b>&ldquo;Do they want to buy now?&rdquo;</b></p>
        <Chart>{`               INTERESTED
                   │
        ┌──────────┴───────────┐
   Yes — buy now         Not yet — later
        │                     │
        ▼                     ▼
   BOOK A MEETING       FOLLOW-UP PLAN
   (Zoom / in-person)   (based on WHEN they plan to buy)
        │                     │
        ▼                     ▼
   Handed to SALES      System sends reminders automatically`}</Chart>
        <p><b>Ready now</b> → a <b>meeting</b> is set up and the lead is <b>handed to Sales</b> (you can still see it under
          Pipeline → &ldquo;Sent to Sales&rdquo;).</p>
        <p><b>Buying later</b> → pick <b>when they plan to buy</b> (Within a month / 1–3 months / 6+ months). That decides
          how often the system follows up. <b>Always set it</b> for an interested-but-later lead.</p>
      </Section>

      <Section n="5" title="Not interested — pick the reason" icon={XCircle}>
        <Chart>{`             NOT INTERESTED — why?
                     │
   ┌─────────────────┼──────────────────┐
   ▼                 ▼                  ▼
"Interested     "Bought           "Not interested
 later"          elsewhere"         at all"
(timing/budget)      │                  │
   ▼                 ▼                  ▼
6-month         Long-term          CLOSED
follow-up       check-ins          (no follow-up)`}</Chart>
        <ul className="ml-4 list-disc space-y-1">
          <li><b>Interested later (timing/budget)</b> → they do want it, not now → <b>6-month follow-up</b>.</li>
          <li><b>Bought elsewhere</b> → <b>long-term occasional check-ins</b>.</li>
          <li><b>Not interested at all</b> → <b>closed</b>.</li>
        </ul>
      </Section>

      <Section n="6" title="The follow-up plan (automatic reminders)" icon={Repeat}>
        <p>A follow-up plan means the system <b>automatically sends WhatsApp / call reminders</b> on a schedule, so no lead
          is forgotten. If the doctor <b>replies</b>, the lead <b>comes back to you</b> to re-engage. If the plan finishes
          with no reply, the lead is <b>parked</b> (and can re-open later).</p>
        <Chart>{`Interested-but-later ──► Follow-up plan ──► reminders go out on schedule
                                 │
                     ┌───────────┴───────────┐
                     ▼                       ▼
              Doctor REPLIES           Plan finishes, no reply
                     │                       │
                     ▼                       ▼
              Back to YOU               Parked (can re-open)`}</Chart>
      </Section>

      <Section n="7" title="Call back / No response / Wrong number" icon={PhoneOff}>
        <p><b>Call back later</b> — enter the date &amp; time; the system schedules the callback (a couple of retries, then a follow-up plan).</p>
        <p><b>No response</b> — just save. The system then <b>schedules the next attempt itself and decides when</b> to call
          (same day or another day). When it&rsquo;s time, the lead <b>shows up again in your Calls Due</b>. This repeats up to
          <b> 4 attempts</b>; still no answer after the 4th → <b>closed</b>.</p>
        <Chart>{`No response ──► System schedules next attempt (same day / another day — it decides)
                     │
                     ▼
        Appears in your CALLS DUE at the right time  ──►  you call again
                     │
             (repeat up to 4 attempts)
                     │
                     ▼
        Still no answer after 4th  ──►  Closed`}</Chart>
        <p><b>Wrong number</b> — flagged; add a corrected number in time and it re-opens for a fresh first call.</p>
      </Section>

      <Section n="8" title="Where to find your leads" icon={CalendarClock}>
        <Chart>{`SIDEBAR
├─ Home      →  your day at a glance
├─ Due       →  today's work:  [ Calls ]  [ Meetings ]
│                 • Calls    = who to call today (+ overdue + upcoming)
│                 • Meetings = scheduled meetings
└─ Pipeline  →  full lead book: [ My Leads ]  [ Sent to Sales ]
                  • My Leads   = all your leads, by stage
                  • Sent to Sales = leads you handed over (tracking)`}</Chart>
        <p className="pt-1 font-medium text-foreground">What the stages mean:</p>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-xs">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="p-2 text-left font-medium">Stage</th>
                <th className="p-2 text-left font-medium">What it means</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {STAGES.map((row) => (
                <tr key={row[0]}>
                  <td className="p-2 font-medium text-foreground">{row[0]}</td>
                  <td className="p-2 text-muted-foreground">{row[1]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section n="9" title="When a lead moves to Idle / Long-cycle / Re-qualify / Reactivation / Archived" icon={Repeat}>
        <p>You never move leads into these yourself — the system files them based on what you logged. Here&rsquo;s exactly when each happens:</p>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-xs">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="p-2 text-left font-medium">Stage</th>
                <th className="p-2 text-left font-medium">When it happens</th>
                <th className="p-2 text-left font-medium">What you do</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {STAGE_WHEN.map((row) => (
                <tr key={row.stage}>
                  <td className="p-2 align-top font-medium text-foreground">{row.stage}</td>
                  <td className="p-2 align-top text-muted-foreground">{row.when}</td>
                  <td className="p-2 align-top text-muted-foreground">{row.act}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="rounded-md bg-primary/5 p-2 text-foreground/80">Only <b>Idle</b>, <b>Re-qualify</b> and <b>Reactivation</b> need your hands — and all three <b>come to you</b> (notification / pipeline). You never have to hunt for them.</p>
      </Section>

      <Section n="10" title="Cheat sheet — keep this handy">
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-xs">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="p-2 text-left font-medium">On the call…</th>
                <th className="p-2 text-left font-medium">You pick</th>
                <th className="p-2 text-left font-medium">System does</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {CHEATS.map((row) => (
                <tr key={row[1]}>
                  <td className="p-2 text-foreground">{row[0]}</td>
                  <td className="p-2 font-medium text-foreground">{row[1]}</td>
                  <td className="p-2 text-muted-foreground">{row[2]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="rounded-md bg-primary/5 p-3 text-foreground/80">
          <b>Two golden rules:</b>
          <ol className="ml-4 mt-1 list-decimal space-y-0.5">
            <li>Always log the truthful outcome — the follow-ups are only as good as what you record.</li>
            <li>For an interested lead who isn&rsquo;t buying today, always set <b>&ldquo;when they plan to buy&rdquo;</b>.</li>
          </ol>
        </div>
      </Section>
    </div>
  )
}
