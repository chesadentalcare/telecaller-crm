"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import {
  BookOpen, PhoneCall, CalendarClock, Repeat, XCircle, PhoneOff, PhoneMissed,
  Droplets, Clock, Send, Route, LogOut,
  CheckCircle2, Search, PhoneForwarded, Bell,
  Gauge, TrendingUp, TrendingDown, Flag, Target,
} from "lucide-react"

// In-app training guide. Two tabs:
//   • Telecaller Flow — what happens when Neha enters a lead (plain language).
//   • Drip Engine     — how the automatic follow-up engine works in the backend,
//                       plus the exact schedule of every track.

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
  ["Wants to buy now", "Interested → Yes, ready now", "Books meeting → Sales + keeps WhatsApp drip running"],
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

// ── Drip Engine tab data ─────────────────────────────────────────────
const TRACKS_GLANCE = [
  ["1-Month", "9 touches · ~17 days", "Fast & high-intent — buying within a month", "☎ Anchor call"],
  ["3-Month", "19 touches · 90 days", "Steady education, a touch every ~5 days", "☎ Anchor call"],
  ["6-Month+", "13 touches · 24 weeks", "Gentle nurture, a touch every 2 weeks", "💬 WhatsApp re-open"],
  ["24-Month", "16 touches · ~24 months", "Post-purchase care, then win the re-buy", "💬 Thank-you"],
]

const ENTRY_MAP = [
  ["Interested — buying within a month", "1-Month track"],
  ["Interested — 1 to 3 months", "3-Month track"],
  ["Interested — 6+ months away", "6-Month+ track"],
  ["Interested — ready now, meeting booked (physical or Zoom)", "Their buy-timeline track — and it keeps running through the meeting"],
  ["Not interested — timing / budget (wants it, not now)", "6-Month+ track (nurture)"],
  ["Not interested — already bought elsewhere", "24-Month track (post-purchase)"],
  ["Callback chased but never answered", "Their timeline track (or 6-Month+ if unknown)"],
]

function TelecallerFlowGuide() {
  return (
    <div className="space-y-4">
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
   Handed to SALES      System sends reminders automatically
   AND stays in drip
   (WhatsApp nurture
    keeps running)`}</Chart>
        <p><b>Ready now</b> → a <b>meeting</b> is set up and the lead is <b>handed to Sales</b> (you can still see it under
          Pipeline → &ldquo;Sent to Sales&rdquo;).</p>
        <p className="rounded-md bg-emerald-500/10 p-2 text-foreground/80">🆕 <b>The doctor also STAYS in the WhatsApp drip.</b> Booking a physical or Zoom meeting <b>no longer stops</b> the follow-up — the system keeps sending nurture messages on the doctor&rsquo;s buy-timeline track <b>while the meeting/sale is in progress</b>, so a doctor never goes silent if the order doesn&rsquo;t close right away. It keeps running <b>even if the doctor replies</b>, and stops only when the sale is <b>won / lost</b>, they send <b>STOP</b>, or the track finishes. Full details in <b>Drip Engine → &ldquo;How a lead leaves a drip&rdquo;</b>.</p>
        <div className="rounded-md border border-primary/30 bg-primary/5 p-2.5 text-foreground/80">
          <b>🆕 If sales doesn&rsquo;t follow up — automatic reminders to the salesperson.</b> Once a lead is <b>handed to a
          salesperson</b> (or a <b>physical meeting</b> is booked), the system WhatsApps the rep&rsquo;s own phone if they don&rsquo;t
          update the lead — <b>1st at ~4h, then every 24h, max 3</b>. On the 3rd, the <b>manager + you</b> get an in-app alert and the
          WhatsApp reminders <b>stop</b>. <b>Any update the rep makes pauses reminders for 48h</b>; <b>Won / Lost / Returned</b> stops
          them for good. Full schedule in the <b>&ldquo;Sales Handover&rdquo;</b> tab.
        </div>
        <p><b>Buying later</b> → pick <b>when they plan to buy</b> (Within a month / 1–3 months / 6+ months). That decides
          which <b>drip track</b> the lead goes on (see the Drip Engine tab). <b>Always set it</b> for an interested-but-later lead.</p>
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
          <li><b>Bought elsewhere</b> → <b>long-term occasional check-ins</b> (24-month track).</li>
          <li><b>Not interested at all</b> → <b>closed</b>.</li>
        </ul>
      </Section>

      <Section n="6" title="The follow-up plan (automatic reminders)" icon={Repeat}>
        <p>A follow-up plan means the system <b>automatically sends WhatsApp / call reminders</b> on a schedule, so no lead
          is forgotten. Every reply the doctor sends is <b>captured and pinged to you</b> so you can jump in — but the plan
          <b> keeps running</b>; a reply no longer stops it (not even an automated &ldquo;thanks for contacting us&rdquo;). The
          plan stops only when the deal is <b>won / lost</b>, the doctor sends <b>STOP</b>, or the schedule <b>finishes</b>.
          The exact schedule lives in the <b>Drip Engine</b> tab.</p>
        <Chart>{`Interested-but-later ──► Follow-up plan ──► reminders go out on schedule
                                 │                    (keeps running)
                     ┌───────────┴───────────┐
                     ▼                       ▼
          Doctor replies → you're pinged    Ends only on:
          (plan KEEPS running)              won / lost / STOP / finished`}</Chart>
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

function DripEngineGuide() {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-muted/20 p-4">
        <div className="flex items-center gap-2 text-base font-semibold">
          <Droplets className="size-5 text-primary" /> Drip Engine — the automatic follow-up robot
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          The drip engine is a background robot on the server. Once a lead is <b>interested-but-later</b> (or
          <b> not-interested for a reason we can nurture</b>), the engine takes over and keeps in touch on a fixed
          calendar — sending WhatsApp messages and dropping reminder calls into your Calls Due — so no lead is ever forgotten.
        </p>
      </div>

      <Section n="1" title="What it is (in one line)" icon={Droplets}>
        <p>A <b>drip</b> is a pre-planned sequence of <b>touches</b>. Each touch is either a
          <b> WhatsApp message</b> (sent automatically) or a <b>reminder call</b> (added to your Calls Due for you to make).
          Which sequence a lead gets is called its <b>track</b>. There are four tracks: <b>1-Month, 3-Month, 6-Month+ and 24-Month</b>.</p>
      </Section>

      <Section n="2" title="When it runs — the 5-minute heartbeat" icon={Clock}>
        <p>The engine starts with the backend and then <b>wakes up every 5 minutes</b>, all day. On each wake-up it asks one
          question: <b>&ldquo;Is any lead due for its next touch right now?&rdquo;</b> — and handles the ones that are.</p>
        <Chart>{`Backend starts  ──►  drip worker turns on  (every 5 minutes) ⏱
                                   │
                                   ▼
        Find leads where  next-touch time ≤ now  (and not closed / stopped)
                                   │
                        ┌──────────┴───────────┐
                        ▼                      ▼
                  It's a CALL touch      It's a WhatsApp touch
                        │                      │
                        ▼                      ▼
          Drop a reminder call        Send the WhatsApp template
          into Calls Due (AM/PM)      automatically
                        │                      │
                        └──────────┬───────────┘
                                   ▼
              Book the NEXT touch on the track's calendar`}</Chart>
        <p className="rounded-md bg-primary/5 p-2 text-foreground/80">A lead only moves <b>one touch per due-time</b> — the engine never blasts the whole sequence at once. Gaps between touches are set by each track (below).</p>
      </Section>

      <Section n="3" title="How a lead gets onto a track" icon={Route}>
        <p>The moment you log the outcome, the system picks the track automatically, starts it at <b>touch 1</b>, and writes a
          <b> predicted closing date</b> (also pushed to SAP). You never pick a track by hand.</p>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-xs">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="p-2 text-left font-medium">What you logged on the call</th>
                <th className="p-2 text-left font-medium">Track the lead enters</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {ENTRY_MAP.map((row) => (
                <tr key={row[0]}>
                  <td className="p-2 text-muted-foreground">{row[0]}</td>
                  <td className="p-2 font-medium text-foreground">{row[1]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="rounded-md bg-amber-500/10 p-2 text-foreground/80">If a lead already had an older plan, entering a new one <b>replaces</b> it (the old one is filed in history). Logging a fresh call outcome later also cancels the current drip and re-routes the lead.</p>
      </Section>

      <Section n="4" title="What happens at each touch" icon={Send}>
        <ul className="ml-4 list-disc space-y-1.5">
          <li><b>☎ Call touch</b> → a reminder call appears in your <b>Calls Due</b> (morning or evening slot), assigned to the lead&rsquo;s owner. You make the call; the engine has done its job by reminding you.</li>
          <li><b>💬 WhatsApp touch</b> → the engine sends the approved template itself. It is <b>de-duplicated</b>, so the same touch can never send twice.</li>
          <li><b>Template not approved yet?</b> The engine <b>waits</b> on that touch (it does not skip ahead) until the template is live in Meta.</li>
          <li><b>Send keeps failing?</b> After <b>5 tries</b> the lead is <b>parked</b> for a human to look at, instead of looping forever.</li>
        </ul>
        <p>After a touch succeeds, the engine schedules the next one by adding the track&rsquo;s gap (in days) to today, and refreshes the predicted closing date.</p>
      </Section>

      <Section n="5" title="The four tracks at a glance" icon={Repeat}>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-xs">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="p-2 text-left font-medium">Track</th>
                <th className="p-2 text-left font-medium">Size</th>
                <th className="p-2 text-left font-medium">Feel</th>
                <th className="p-2 text-left font-medium">Opens with</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {TRACKS_GLANCE.map((row) => (
                <tr key={row[0]}>
                  <td className="p-2 font-medium text-foreground">{row[0]}</td>
                  <td className="p-2 text-muted-foreground">{row[1]}</td>
                  <td className="p-2 text-muted-foreground">{row[2]}</td>
                  <td className="p-2 text-muted-foreground">{row[3]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="rounded-md bg-primary/5 p-2 text-foreground/80">
          <b>Why the shapes differ:</b> the sooner someone plans to buy, the <b>harder and faster</b> we push (calls + WhatsApp,
          every few days). The further out they are, the <b>gentler and slower</b> (mostly WhatsApp, weeks apart).
        </p>
      </Section>

      <Section n="6" title="Track by track — exactly what goes out, and when">
        <p className="font-medium text-foreground">① 1-Month track — 9 touches over ~17 days (fast, alternating call &amp; WhatsApp)</p>
        <Chart>{`Day 0   ☎  Anchor call — warm re-open
Day 1   💬  Recap + brochure
Day 2   ☎  Nudge call — handle the objection you captured
Day 3   💬  Social proof — a nearby clinic / model
Day 6   ☎  Decision call — offer a meeting
Day 9   💬  Offer — financing / demo slot
Day 12  ☎  Last-value call — final objection handling
Day 15  💬  Soft close — hold a demo slot this week
Day 17  💬  Breakup — "closing your enquiry"`}</Chart>

        <p className="pt-2 font-medium text-foreground">② 3-Month track — 19 touches over 90 days (a touch every ~5 days)</p>
        <Chart>{`Day 0   ☎  Anchor call — confirm the 3-month timeline
Day 5   💬  Education — product deep-dive
Day 10  💬  Education — ROI
Day 15  💬  Education — clinic story
Day 20  💬  Education — comparison guide
Day 25  ☎  Check-in call — timeline / budget
Day 30  💬  Nurture — comparison
Day 35  💬  Nurture — demo invite
Day 40  💬  Nurture — feature spotlight
Day 45  💬  Nurture — financing
Day 50  ☎  Mid-cycle call — objections / Zoom walkthrough
Day 55  💬  Nurture — seasonal offer
Day 60  💬  Nurture — case study
Day 65  💬  Nurture — event invite
Day 70  💬  Nurture — reminder
Day 75  💬  Nurture — value recap
Day 80  ☎  Pre-close call — lock a visit before quarter-end
Day 85  💬  Soft close
Day 90  💬  Breakup — "closing your enquiry"`}</Chart>

        <p className="pt-2 font-medium text-foreground">③ 6-Month+ track — 13 touches over 24 weeks (a touch every 2 weeks, mostly WhatsApp)</p>
        <Chart>{`Day 0    💬  Seeded re-open — low pressure
Day 14   💬  Education — long-horizon value
Day 28   💬  Education — no ask
Day 42   ☎  Anchor call — confirm still 6m+
Day 56   💬  Nurture — new models
Day 70   💬  Nurture — events
Day 84   💬  Nurture — clinic features
Day 98   💬  Nurture — case study
Day 112  ☎  Anchor call — timeline firming up?
Day 126  💬  Nurture — seasonal offer
Day 140  💬  Nurture — financing
Day 154  💬  Nurture — reminder
Day 168  💬  Breakup — "closing your enquiry"`}</Chart>

        <p className="pt-2 font-medium text-foreground">④ 24-Month track — 16 touches over ~24 months (post-purchase care, for &ldquo;bought elsewhere&rdquo;)</p>
        <Chart>{`Day 0    💬  Thank-you & welcome
Day 10   💬  Onboarding & setup tips
Day 28   💬  Daily-use & maintenance guide
Day 60   ☎  Satisfaction check-in call
Day 105  💬  AMC & warranty reassurance
Day 160  💬  Consumables & accessories reorder
Day 220  💬  Referral & testimonial ask
Day 285  💬  Clinical education / CDE invite
Day 320  ☎  Mid-cycle relationship call
Day 390  💬  1-year loyalty + new-model awareness
Day 470  💬  Expansion / second operatory
Day 545  💬  Upgrade ROI story
Day 600  ☎  Replacement-window warm-up call
Day 645  💬  Trade-in & financing offer
Day 685  💬  Seasonal / year-end upgrade offer
Day 715  ☎  24-month replacement re-open call
   │
   └─►  then the lead RESTARTS as a fresh enquiry (re-purchase cycle)`}</Chart>
      </Section>

      <Section n="7" title="How a lead leaves a drip" icon={LogOut}>
        <Chart>{`A drip stops ONLY when one of these happens:

  Lead is won / lost / closed     ──►  removed from the drip
  Doctor sends STOP / opts out    ──►  removed from all messaging
  Track FINISHES                  ──►  parked as dormant (Long-cycle)
                                        …EXCEPT 24-Month, which loops back
                                        to a fresh start for the re-buy
  You log a NEW call outcome      ──►  old drip cancelled, lead re-routed

  A doctor's REPLY does NOT stop the drip — it keeps running.
  (Even an automated "thanks for contacting us" won't stop it.)`}</Chart>
        <p className="rounded-md bg-emerald-500/10 p-2 text-foreground/80">✅ <b>A reply never stops a drip.</b> Whatever the doctor sends — even an automated &ldquo;thank you for contacting the clinic&rdquo; — the plan <b>keeps running</b>; the reply is still captured and pinged to you to act on. A drip stops <b>only</b> on <b>won / lost</b>, <b>STOP</b>, or the <b>schedule finishing</b>.</p>
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
          <div className="text-sm font-semibold text-foreground">A meeting was booked (physical or Zoom)?</div>
          <p className="mt-1">The doctor still runs their <b>buy-timeline track</b> (1-Month / 3-Month / 6-Month+ — the exact schedules shown above) so sales can keep the deal warm — and it <b>starts straight into WhatsApp</b> (the opening &ldquo;call the doctor&rdquo; reminder is skipped, since the lead is already with sales).</p>
        </div>
      </Section>
    </div>
  )
}

// ── No Response tab ──────────────────────────────────────────────────
function NoResponseGuide() {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-muted/20 p-4">
        <div className="flex items-center gap-2 text-base font-semibold">
          <PhoneOff className="size-5 text-primary" /> No Response — the retry cycle, day by day
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          When a doctor doesn&rsquo;t pick up and you log <b>&ldquo;No response&rdquo;</b>, the lead is <b>not lost</b> — the
          system keeps trying for you and drops the next reminder <b>call</b> into your Calls Due on set days. It handles this in
          <b> two different ways</b>, depending on where the lead is:
        </p>
        <ul className="ml-4 mt-2 list-disc space-y-1 text-sm text-muted-foreground">
          <li><b>Case 1 — a brand-new lead you have never reached</b> (the very first call didn&rsquo;t connect).</li>
          <li><b>Case 2 — a lead you already reached once, now on a follow-up plan (drip),</b> that stops answering.</li>
        </ul>
        <p className="mt-2 text-sm text-muted-foreground">
          Both end the same way: <b>4 no-answer calls in a row → the lead is parked and one recovery WhatsApp goes out.</b>
        </p>
      </div>

      <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
        <b>The reminder calls now come back-to-back.</b> After a no-answer call, the next reminder call is scheduled for the
        <b> next working morning</b> (11:00) and an evening WhatsApp goes out the <b>same day</b>. A lead you enter today is back
        in Calls Due <b>tomorrow morning</b>, and every working morning after that — no multi-day gaps.
      </div>

      <Section n="1" title="Case 1 — a brand-new lead you have never reached" icon={PhoneOff}>
        <p>The very first call didn&rsquo;t connect. The lead enters the <b>opening sequence</b> — a tight <b>4-day plan</b>: a
          reminder <b>call every morning</b> and an automatic &ldquo;we tried to reach you&rdquo; <b>WhatsApp every evening</b>.
          Your first call already counts as <b>attempt 1 of 4</b>.</p>
        <Chart>{`Day 0   ☎  You call (call #1) — no answer  →  log "No response"  (attempt 1 of 4)
Day 0   💬  Evening WhatsApp — "we tried to reach you today…"
Day 1   ☎  CALL #2  ← back in your CALLS DUE next morning        → you call
Day 1   💬  Evening WhatsApp
Day 2   ☎  CALL #3  → appears in your Calls Due                  → you call
Day 2   💬  Evening WhatsApp
Day 3   ☎  CALL #4  → appears in your Calls Due                  → you call
Day 3   💬  Evening WhatsApp
   │
   └─►  still no answer after call #4
         ──►  PARKED (archived) + one recovery WhatsApp goes out
              "No response — first contact, all attempts done"`}</Chart>
        <p className="rounded-md bg-primary/5 p-2 text-foreground/80">
          So a never-reached lead gets <b>4 calls on 4 back-to-back working days</b> (days 0–3), each with an <b>evening WhatsApp</b>
          follow-up. You never schedule these — each call appears in <b>Calls Due</b> on its morning (overdue ones stay at the top).
          Days are <b>working days</b>: a weekend/holiday pushes the touch to the next working morning.
        </p>
      </Section>

      <Section n="2" title="Case 2 — no answer while already on a follow-up plan (drip)" icon={Droplets}>
        <p>Here the doctor was <b>reached at least once</b> and is being nurtured on a drip track
          (1-Month / 3-Month / 6-Month+ / 24-Month). A no-answer now behaves <b>differently</b>:</p>
        <ul className="ml-4 list-disc space-y-1.5">
          <li>The <b>WhatsApp nurture keeps running</b> — a missed call does <b>not</b> pause the drip. The messages that go out
            are the <b>track&rsquo;s own nurture messages</b>, not the first-contact ones.</li>
          <li>The reminder calls are the drip&rsquo;s built-in <b>&ldquo;anchor calls&rdquo;</b>, spaced across the track (see the
            <b> Drip Engine</b> tab) — not the back-to-back first-contact opening cadence.</li>
          <li>The counter is <b>&ldquo;4 in a row&rdquo;</b>: any call the doctor <b>answers resets it to zero</b>, and the drip
            simply carries on.</li>
          <li>Only when <b>4 anchor calls in a row</b> get no answer is the lead <b>pulled out of the drip and parked</b> — and the
            same one-time recovery WhatsApp goes out.</li>
        </ul>
        <Chart>{`Lead is nurturing on a drip  (WhatsApp + anchor calls)
      │
      ▼  an anchor call gets no answer  →  log "No response"
   drip KEEPS running · count = 1 in a row
      │
      ├─ doctor answers ANY later call ──►  count resets to 0, drip continues
      │
      ▼  4 anchor calls in a row, all no answer
   PULLED from the drip  +  PARKED  +  one recovery WhatsApp
   "No response — attempts exhausted"`}</Chart>
        <p className="rounded-md bg-emerald-500/10 p-2 text-foreground/80">
          ✅ The big difference: in Case 2 the lead <b>stays warm</b> — nurture messages keep flowing while you keep trying to
          reach them, and a single pickup puts it fully back on track.
        </p>
      </Section>

      <Section n="3" title="The recovery WhatsApp — the final nudge" icon={Send}>
        <p>In <b>both</b> cases, the moment the <b>4th no-answer</b> is logged the system does two things at once:</p>
        <ul className="ml-4 list-disc space-y-1.5">
          <li><b>Parks the lead</b> (archived) so it stops cluttering your Calls Due — it moves to the <b>No Response</b> pile and
            can be revived any time.</li>
          <li>Offers a one-tap <b>&ldquo;Send recovery WhatsApp&rdquo;</b> on the lead — a final <b>&ldquo;we tried to reach
            you&rdquo;</b> message. You can also fire it for a whole batch from the <b>No Response</b> queue.</li>
        </ul>
        <p className="rounded-md bg-primary/5 p-2 text-foreground/80">
          This is the <b>one recovery message</b> — a last re-engagement after the 4 calls. If the doctor replies to it, the lead
          is pulled back to <b>you</b> to re-qualify.
        </p>
      </Section>

      <Section n="4" title="What you do at each return" icon={PhoneCall}>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-xs">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="p-2 text-left font-medium">On the retry call…</th>
                <th className="p-2 text-left font-medium">You pick</th>
                <th className="p-2 text-left font-medium">System does</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              <tr><td className="p-2">They finally pick up &amp; are interested</td><td className="p-2 font-medium text-foreground">Interested</td><td className="p-2 text-muted-foreground">Books a meeting / starts a follow-up plan</td></tr>
              <tr><td className="p-2">&ldquo;Call me later&rdquo;</td><td className="p-2 font-medium text-foreground">Call back later</td><td className="p-2 text-muted-foreground">Schedules the callback at your time</td></tr>
              <tr><td className="p-2">Still no answer</td><td className="p-2 font-medium text-foreground">No response</td><td className="p-2 text-muted-foreground">Waits for the next scheduled call day (in a drip, the drip keeps running)</td></tr>
              <tr><td className="p-2">Not interested</td><td className="p-2 font-medium text-foreground">Not interested</td><td className="p-2 text-muted-foreground">Routes by reason (closed / nurture)</td></tr>
            </tbody>
          </table>
        </div>
        <p className="rounded-md bg-primary/5 p-2 text-foreground/80">
          Reaching the doctor on <b>any</b> retry — in either case — <b>resets the &ldquo;4 in a row&rdquo; count</b> and routes the
          lead on the real outcome.
        </p>
      </Section>

      <Section n="5" title="How it ends" icon={LogOut}>
        <Chart>{`Leaves the No-Response cycle when ANY of these happen:

  You reach the doctor            ──►  log the real outcome → routed
                                        (in a drip, one pickup resets the count)
  Doctor REPLIES on WhatsApp      ──►  pulled out, comes back to YOU (re-qualify)
  4 calls in a row, still no answer──►  PARKED (archived) + one recovery WhatsApp
                                        — revivable any time`}</Chart>
        <p className="rounded-md bg-emerald-500/10 p-2 text-foreground/80">
          ✅ A parked no-response lead isn&rsquo;t gone — you can <b>revive</b> it (&ldquo;Bring back as No Response&rdquo;) and it
          re-enters the cycle from the top.
        </p>
      </Section>
    </div>
  )
}

// ── Wrong Number tab ─────────────────────────────────────────────────
function WrongNumberGuide() {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-muted/20 p-4">
        <div className="flex items-center gap-2 text-base font-semibold">
          <PhoneMissed className="size-5 text-primary" /> Wrong Number — flagged, with a 7-day fix window
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          When the number is wrong and you log <b>&ldquo;Wrong number&rdquo;</b>, the lead is <b>paused</b> — no calls or
          WhatsApps go out. You get <b>7 days</b> to find a correct number; add one and it re-opens like new. If not, it closes.
        </p>
      </div>

      <Section n="1" title="The full timeline" icon={CalendarClock}>
        <Chart>{`Day 0      ☎  You call — number is wrong  →  log "Wrong number"
                 Lead is FLAGGED & PAUSED (no automation runs on it)

Day 0–7    🔎  Recovery window — find a correct number
                 (from the ad / Facebook / an alternate contact)
               Add the corrected number  ──►  lead RE-OPENS
                                               → fresh first call, cadence
                                                 restarts from Day 0

Day 7      ⛔  Still no correct number
               ──►  CLOSED (archived)
                    "Wrong number — not recovered within 7 days"`}</Chart>
        <p className="rounded-md bg-primary/5 p-2 text-foreground/80">
          While it&rsquo;s flagged, the lead sits out of Calls Due on purpose — there&rsquo;s no point calling a number you
          know is wrong. Fixing the number is the only thing that brings it back.
        </p>
      </Section>

      <Section n="2" title="What you do" icon={Search}>
        <ul className="ml-4 list-disc space-y-1.5">
          <li>Open the lead and <b>add a corrected mobile number</b> if you can find one — it re-opens for a fresh first call immediately.</li>
          <li>No better number? Do nothing — the system <b>auto-closes</b> it after 7 days so it doesn&rsquo;t clutter your list.</li>
          <li>Closed by mistake / found a number later? <b>Revive</b> it and add the number.</li>
        </ul>
      </Section>
    </div>
  )
}

// ── Call Back Later tab ──────────────────────────────────────────────
function CallBackGuide() {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-muted/20 p-4">
        <div className="flex items-center gap-2 text-base font-semibold">
          <PhoneForwarded className="size-5 text-primary" /> Call Back Later — scheduled to the minute you set
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          When a doctor says &ldquo;call me later&rdquo; and you log <b>&ldquo;Call back later&rdquo;</b> with a date &amp; time,
          the system drops the callback into your Calls Due <b>at that exact time</b>. Miss it, and it gives you <b>one</b>
          automatic retry before moving the lead onto a follow-up plan.
        </p>
      </div>

      <Section n="1" title="The full timeline" icon={CalendarClock}>
        <Chart>{`Day 0          ☎  Doctor: "call me later"  →  log "Call back later"
                     + pick the DATE & TIME
                   System schedules the callback for that exact time

At your time   ☎  The CALLBACK appears in your Calls Due  → you call
                     ├─ reached      ──►  log the real outcome → routed
                     │                     (meeting / follow-up / etc.)
                     └─ no answer    ──►  system schedules ONE more callback

2nd callback   ☎  Callback appears again in Calls Due  → you call
                     ├─ reached      ──►  log outcome → routed
                     └─ no answer    ──►  lead moves to an automatic
                                          FOLLOW-UP PLAN (drip)`}</Chart>
        <p className="rounded-md bg-primary/5 p-2 text-foreground/80">
          Unlike a no-response retry (which uses morning/evening slots), a callback lands at the <b>exact date &amp; time you
          chose</b>. If you set no time, it defaults to the next evening call slot.
        </p>
      </Section>

      <Section n="2" title="After two misses — the follow-up plan" icon={Repeat}>
        <p>
          If the doctor doesn&rsquo;t answer <b>either</b> callback, the lead stops being chased by phone and goes onto an
          automatic <b>follow-up plan</b> (drip) based on the buy-timeline you captured — or the <b>6-Month+</b> plan if no
          timeline was set. From there the Drip Engine keeps in touch by WhatsApp and reminder calls (see the <b>Drip Engine</b> tab).
        </p>
        <Chart>{`Callback missed twice ──► automatic follow-up plan
                              │
              ┌───────────────┴───────────────┐
        timeline known                 no timeline set
              │                               │
              ▼                               ▼
     their timeline track              6-Month+ nurture track`}</Chart>
      </Section>

      <Section n="3" title="Good to know" icon={CheckCircle2}>
        <ul className="ml-4 list-disc space-y-1.5">
          <li>The moment you <b>reach</b> them on any callback, log the true outcome — it routes like any normal call.</li>
          <li>The callback is assigned to <b>you</b> (the lead&rsquo;s owner) and shows in <b>Calls Due</b> when its time comes.</li>
          <li>Setting an accurate time matters — the reminder is only as good as the time you enter.</li>
        </ul>
      </Section>
    </div>
  )
}

// ── Sales Handover tab ───────────────────────────────────────────────
function SalesHandoverGuide() {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-muted/20 p-4">
        <div className="flex items-center gap-2 text-base font-semibold">
          <Bell className="size-5 text-primary" /> Sales Handover — reminders to the salesperson
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          When a lead is <b>handed to a salesperson</b> — or a <b>physical meeting</b> is booked for them — the system keeps
          the deal moving by <b>WhatsApping the rep&rsquo;s own phone</b> if they go quiet. It never spams: a few nudges, then it
          escalates to a manager and stops.
        </p>
      </div>

      <Section n="1" title="When the reminders start" icon={Send}>
        <p>The clock starts the moment a lead <b>leaves the telecaller for sales</b>:</p>
        <ul className="ml-4 list-disc space-y-1">
          <li>you booked a <b>physical meeting</b> (the rep needs to visit), or</li>
          <li>the lead was <b>handed over to a salesperson</b> to close.</li>
        </ul>
        <p>From there, the system watches whether the rep <b>updates the lead</b> (Visited, Quoted, Order created, Won, Lost…).</p>
      </Section>

      <Section n="2" title="If the rep stays silent — the reminder schedule" icon={Bell}>
        <Chart>{`Handover / physical meeting booked   ← clock starts
      │
      ▼  ~4 hours later, still no update
  Reminder 1   →  WhatsApp to the salesperson's phone
      │
      ▼  +24 hours, still silent
  Reminder 2
      │
      ▼  +24 hours, still silent
  Reminder 3   +  in-app alert to the MANAGER and the
                  telecaller who handed the lead over
      │
      ▼
  STOP — no more WhatsApp (max 3 per silent streak).
         From here it's the manager's job on the dashboard.`}</Chart>
        <p className="rounded-md bg-primary/5 p-2 text-foreground/80">The watcher checks every 2 hours, so the first reminder lands about <b>4–6 hours</b> after handover. WhatsApp is <b>capped at 3</b> so we never pester a rep — or run up messaging costs — endlessly.</p>
      </Section>

      <Section n="3" title="The moment the rep updates — the clock resets" icon={Repeat}>
        <p>Any update the rep records <b>pauses</b> the reminders — someone who just acted doesn&rsquo;t need chasing again straight away.</p>
        <Chart>{`Rep marks  Visited / Quoted / Order created / Rescheduled
      │
      ▼  reminders PAUSE for 48 hours
  (and the "3 reminders" counter resets to zero)
      │
      ▼  if the rep goes quiet again for 48h+
  reminders can resume — again capped at 3`}</Chart>
        <p className="rounded-md bg-emerald-500/10 p-2 text-foreground/80">✅ So a rep who&rsquo;s actively working the lead won&rsquo;t get pestered: <b>each update buys 48 hours of quiet</b>. Only genuine silence brings the reminders back.</p>
      </Section>

      <Section n="4" title="When reminders stop for good" icon={LogOut}>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-xs">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="p-2 text-left font-medium">Rep marks the lead…</th>
                <th className="p-2 text-left font-medium">What happens</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              <tr><td className="p-2 font-medium text-foreground">Won</td><td className="p-2 text-muted-foreground">Deal closed in SAP — reminders stop permanently.</td></tr>
              <tr><td className="p-2 font-medium text-foreground">Lost</td><td className="p-2 text-muted-foreground">Opportunity closed — reminders stop permanently.</td></tr>
              <tr><td className="p-2 font-medium text-foreground">Returned</td><td className="p-2 text-muted-foreground">Lead goes back to the telecaller to re-nurture — reminders stop.</td></tr>
            </tbody>
          </table>
        </div>
        <p className="rounded-md bg-amber-500/10 p-2 text-foreground/80"><b>Quoted is different:</b> a quote doesn&rsquo;t close the deal, so it <b>doesn&rsquo;t stop</b> the reminders for good — it just resets the 48-hour clock. The lead is still open, so if the rep then goes silent, gentle reminders can come back.</p>
      </Section>

      <Section n="5" title="Good to know" icon={CheckCircle2}>
        <ul className="ml-4 list-disc space-y-1.5">
          <li>Reminders go to the <b>salesperson&rsquo;s own WhatsApp</b> (their phone on file), not the customer.</li>
          <li>The rep&rsquo;s WhatsApp <b>replies</b> come back onto the lead under the <b>&ldquo;Sales rep&rdquo;</b> tab in Replies.</li>
          <li>On the 3rd reminder, <b>you (who handed it over) and the manager</b> both get an in-app &ldquo;rep unresponsive&rdquo; alert — a stalled deal never goes unnoticed.</li>
          <li>Never more than <b>3 WhatsApp reminders</b> per silent streak — after that it&rsquo;s handled on the dashboard, not by more messages.</li>
        </ul>
      </Section>
    </div>
  )
}

// ── Lead Score (CRI) tab ─────────────────────────────────────────────
const GEARS = [
  ["Gear 1 · Closing", "70–100 + recent activity", "Act today — the doctor is deciding now. Change the offer, book the visit, close it."],
  ["Gear 2 · Warming", "45–69", "Keep working it — genuine interest, not quite at the finish line yet."],
  ["Gear 3 · Nurture", "20–44", "Let the drip do the work — light touches, no heavy chasing."],
  ["Gear 4 · Dormant", "0–19", "Very cold — minimal effort until something changes."],
]

const INGREDIENTS = [
  ["Quotation", "up to 30", "Has a price quotation gone out — and did the doctor react to it (reply, ask, or ask for a revision)? The strongest “they’re serious” signal, so it carries the most weight."],
  ["Two-way talk", "up to 25", "Is the doctor talking back, or is it all us? A lead that replies and calls back scores high; one we only push messages at scores low."],
  ["Recency & speed", "up to 25", "How recently did they last reply, and are they replying faster than they used to? A doctor who messaged today is hotter than one who went quiet weeks ago."],
  ["Meetings", "up to 12", "Has a meeting or demo been booked or attended? A completed demo or site visit counts the most."],
  ["Real conversations", "up to 8", "How many times we have actually reached and spoken to them. A small helper so a well-worked lead edges ahead of an untouched one."],
]

const PENALTIES = [
  ["Quote gone cold", "−15", "A quotation was sent 30+ days ago and the doctor has said nothing since."],
  ["No-show", "−10", "Booked a meeting and did not turn up. (Not switched on yet — we do not record no-shows.)"],
  ["All one-way", "−10", "The last few touches are all from us — we keep messaging, they have gone silent."],
]

function LeadScoreGuide() {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-muted/20 p-4">
        <div className="flex items-center gap-2 text-base font-semibold">
          <Gauge className="size-5 text-primary" /> Lead Score (CRI) — how close is this lead to buying?
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          <b>CRI</b> stands for <b>Close Readiness Index</b>. It is a single number from <b>0 to 100</b> on every open lead
          that answers one question: <b>how close is this doctor to actually buying a chair right now?</b> The system works it
          out automatically every night — you never calculate it. Higher = hotter. It lets you spend your day on the handful of
          leads that are actually deciding, instead of treating everyone the same.
        </p>
      </div>

      <Section n="1" title="What the number means — the 4 gears" icon={Target}>
        <p>The score sorts every lead into one of <b>four gears</b>, from &ldquo;close it today&rdquo; down to &ldquo;leave it to the robot&rdquo;:</p>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-xs">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="p-2 text-left font-medium">Gear</th>
                <th className="p-2 text-left font-medium">Score</th>
                <th className="p-2 text-left font-medium">What it means for you</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {GEARS.map((row) => (
                <tr key={row[0]}>
                  <td className="p-2 align-top font-medium text-foreground">{row[0]}</td>
                  <td className="p-2 align-top text-muted-foreground">{row[1]}</td>
                  <td className="p-2 align-top text-muted-foreground">{row[2]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Chart>{`  Score
  100 ┐
      │  Gear 1 · CLOSING     ── act today (needs a recent quote/meeting too)
   70 ┤
      │  Gear 2 · WARMING     ── keep working it
   45 ┤
      │  Gear 3 · NURTURE     ── let the drip run
   20 ┤
      │  Gear 4 · DORMANT     ── very cold
    0 ┘`}</Chart>
        <p className="rounded-md bg-primary/5 p-2 text-foreground/80">💡 Gear 1 needs <b>both</b> a high score <b>and</b> a live event (a quote or meeting in the last ~3 weeks). A high score built only from <b>old</b> activity stays in Gear 2 — so a stale lead can never masquerade as a live deal.</p>
      </Section>

      <Section n="2" title="What lifts the score — the 5 ingredients" icon={TrendingUp}>
        <p>The score is built from <b>five things the doctor does</b>. Each is worth a different number of points — the ones that best predict a real sale are worth the most:</p>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-xs">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="p-2 text-left font-medium">Ingredient</th>
                <th className="p-2 text-left font-medium">Worth</th>
                <th className="p-2 text-left font-medium">What it measures</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {INGREDIENTS.map((row) => (
                <tr key={row[0]}>
                  <td className="p-2 align-top font-medium text-foreground">{row[0]}</td>
                  <td className="p-2 align-top font-semibold text-emerald-600 dark:text-emerald-400">{row[1]}</td>
                  <td className="p-2 align-top text-muted-foreground">{row[2]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="rounded-md bg-primary/5 p-2 text-foreground/80">Notice the theme: the score rewards <b>what the doctor does back</b> (replies, quotes reacted to, meetings attended) — not how many messages <b>we</b> send. Blasting an unresponsive lead does not raise its score.</p>
      </Section>

      <Section n="3" title="What pulls the score down — penalties" icon={TrendingDown}>
        <p>A few warning signs <b>subtract</b> points, so a lead that looks busy but is actually going cold does not sit near the top:</p>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-xs">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="p-2 text-left font-medium">Warning sign</th>
                <th className="p-2 text-left font-medium">Points</th>
                <th className="p-2 text-left font-medium">When it applies</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {PENALTIES.map((row) => (
                <tr key={row[0]}>
                  <td className="p-2 align-top font-medium text-foreground">{row[0]}</td>
                  <td className="p-2 align-top font-semibold text-rose-600 dark:text-rose-400">{row[1]}</td>
                  <td className="p-2 align-top text-muted-foreground">{row[2]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="rounded-md bg-amber-500/10 p-2 text-foreground/80">All penalties together are <b>capped at −35</b>, so a lead is never buried by warnings alone.</p>
      </Section>

      <Section n="4" title="The rep flag — the human override" icon={Flag}>
        <p>
          The score reads the doctor&rsquo;s <b>behaviour</b>, but sometimes <b>you</b> know something the numbers cannot see —
          you spoke to the doctor and could tell the sale is <b>near closing</b>. That is what the <b>Flag</b> is for.
        </p>
        <div className="rounded-lg border border-amber-400/50 bg-amber-500/10 p-3 text-foreground/80">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Flag className="size-4 text-amber-600" /> When you flag a lead, two things happen:
          </div>
          <ul className="ml-4 mt-1.5 list-disc space-y-1">
            <li>Its score gets a <b>+15 boost</b>.</li>
            <li>It is <b>guaranteed to sit at least in Gear 2 (Warming)</b> — a flag can never fall into the ignore pile, no matter what the behaviour numbers say.</li>
          </ul>
        </div>
        <p>
          A flagged lead shows a bright <b>amber &ldquo;Flagged&rdquo; badge</b> and is <b>pinned to the top</b> of the pipeline
          list, so it follows the doctor everywhere and never gets lost.
        </p>
        <p className="rounded-md bg-primary/5 p-2 text-foreground/80">
          <b>Why it deserves points:</b> a human who actually heard the doctor&rsquo;s tone of voice is a stronger signal than any
          automatic guess. The flag says <b>&ldquo;trust me, this one is hot&rdquo;</b> — and the score listens.
        </p>
      </Section>

      <Section n="5" title="A real example — why counting calls is not enough" icon={Target}>
        <Chart>{`Two leads, same intake week, both were sent a quotation:

  Dr. A  ──  replied to the quote, asked for a revision, demo done,
             now messaging faster than before, flagged by the rep
             ►  Score 85  ·  Gear 1  ·  ACT TODAY

  Dr. B  ──  never replied to the quote, ignored 6 drip messages,
             silent for weeks
             ►  Score 0   ·  Gear 4  ·  leave it to the drip

  We sent BOTH the same number of messages.
  Counting calls would make them look similar — the score is what
  tells them apart, so your time goes to Dr. A.`}</Chart>
      </Section>

      <Section n="6" title="Where you see it & when it updates" icon={Clock}>
        <ul className="ml-4 list-disc space-y-1.5">
          <li>In <b>Pipeline</b>, each lead shows a colour-coded <b>Score</b> badge, and the list is sorted with the <b>hottest (and flagged) leads on top</b>.</li>
          <li>The score is recalculated <b>automatically every night (~2:30 AM)</b>. So the calls, replies and meetings you log <b>today</b> show up in the score <b>tomorrow morning</b>.</li>
          <li>You never edit the score by hand — the only lever you control directly is the <b>Flag</b>.</li>
        </ul>
      </Section>

      <Section n="7" title="The formula (for the curious)" icon={Gauge}>
        <p>Put together, the whole thing is just this — you never need to do the maths, the system does:</p>
        <Chart>{`  CRI  =   30 × Quotation
        +  25 × Two-way talk
        +  25 × Recency & speed
        +  12 × Meetings
        +   8 × Real conversations
        −   Penalties            (at most −35)
        ( +15  if a rep FLAGGED the lead )
      ─────────────────────────────────────
        =  a number from 0 to 100  →  a gear`}</Chart>
        <p className="rounded-md bg-primary/5 p-2 text-foreground/80">Each ingredient is scored from 0 to 1 first (e.g. &ldquo;quote sent and replied to&rdquo; = high, &ldquo;no quote&rdquo; = 0), then multiplied by its points above. That is why the numbers shown are the <b>maximum</b> each part can contribute.</p>
      </Section>
    </div>
  )
}

type DocTab = "flow" | "drip" | "lead_score" | "sales_handover" | "no_response" | "wrong_number" | "callback"

const TABS: { key: DocTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "flow", label: "Telecaller Flow", icon: BookOpen },
  { key: "drip", label: "Drip Engine", icon: Droplets },
  { key: "lead_score", label: "Lead Score (CRI)", icon: Gauge },
  { key: "sales_handover", label: "Sales Handover", icon: Bell },
  { key: "no_response", label: "No Response", icon: PhoneOff },
  { key: "wrong_number", label: "Wrong Number", icon: PhoneMissed },
  { key: "callback", label: "Call Back Later", icon: CalendarClock },
]

export function DocsView() {
  const [tab, setTab] = useState<DocTab>("flow")

  return (
    <div className="mx-auto max-w-3xl space-y-4 pb-8">
      <div className="grid grid-cols-2 gap-1.5 rounded-xl border bg-muted/30 p-1 sm:grid-cols-3 lg:grid-cols-7">
        {TABS.map((t) => {
          const active = tab === t.key
          const Icon = t.icon
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={cn(
                "flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition",
                active ? "bg-card text-foreground shadow-sm ring-1 ring-border" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="size-4" />
              {t.label}
            </button>
          )
        })}
      </div>

      {tab === "flow" ? <TelecallerFlowGuide />
        : tab === "drip" ? <DripEngineGuide />
        : tab === "lead_score" ? <LeadScoreGuide />
        : tab === "sales_handover" ? <SalesHandoverGuide />
        : tab === "no_response" ? <NoResponseGuide />
        : tab === "wrong_number" ? <WrongNumberGuide />
        : <CallBackGuide />}
    </div>
  )
}
