"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import {
  BookOpen, PhoneCall, CalendarClock, Repeat, XCircle, PhoneOff, PhoneMissed,
  Droplets, Clock, Send, Route, LogOut,
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
   Handed to SALES      System sends reminders automatically`}</Chart>
        <p><b>Ready now</b> → a <b>meeting</b> is set up and the lead is <b>handed to Sales</b> (you can still see it under
          Pipeline → &ldquo;Sent to Sales&rdquo;).</p>
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
          is forgotten. If the doctor <b>replies</b>, the lead <b>comes back to you</b> to re-engage. If the plan finishes
          with no reply, the lead is <b>parked</b> (and can re-open later). The exact schedule lives in the <b>Drip Engine</b> tab.</p>
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
        <Chart>{`A lead comes OFF a drip when ANY of these happen:

  Doctor REPLIES on WhatsApp      ──►  pulled out, comes back to YOU (re-qualify)
  You log a NEW call outcome      ──►  old drip cancelled, lead re-routed
  Doctor sends STOP / opts out    ──►  removed from all messaging
  Lead is won / lost / closed     ──►  removed
  Track FINISHES with no reply    ──►  parked as dormant (Long-cycle)
                                        …EXCEPT 24-Month, which loops back
                                        to a fresh start for the re-buy`}</Chart>
        <p className="rounded-md bg-emerald-500/10 p-2 text-foreground/80">✅ The golden rule still holds: the second a doctor engages, the robot steps aside and the lead is back in your hands.</p>
      </Section>
    </div>
  )
}

const TABS = [
  { key: "flow" as const, label: "Telecaller Flow", icon: BookOpen },
  { key: "drip" as const, label: "Drip Engine", icon: Droplets },
]

export function DocsView() {
  const [tab, setTab] = useState<"flow" | "drip">("flow")

  return (
    <div className="mx-auto max-w-3xl space-y-4 pb-8">
      <div className="grid grid-cols-2 gap-1.5 rounded-xl border bg-muted/30 p-1">
        {TABS.map((t) => {
          const active = tab === t.key
          const Icon = t.icon
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={cn(
                "flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition",
                active ? "bg-card text-foreground shadow-sm ring-1 ring-border" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="size-4" />
              {t.label}
            </button>
          )
        })}
      </div>

      {tab === "flow" ? <TelecallerFlowGuide /> : <DripEngineGuide />}
    </div>
  )
}
