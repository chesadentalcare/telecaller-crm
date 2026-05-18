# Lead Lifecycle & Decision Tree

This README captures the two explanations of how a lead moves through the
telecaller CRM. The first section is the system-level picture (state model,
decisions, stages, parallel state machines, view mapping, gates). The second
section walks one lead through its whole journey like a story.

---

Here's the full picture, mapped to the code you have running.

## 1. The state model — one lead's journey

```
                                                      ┌─────────────────┐
                                                      │   NEW (intake)  │
                                                      │  5 fields only  │
                                                      └────────┬────────┘
                                                               │
                                                       Telecaller calls
                                                               │
                          ┌────────────────────────────────────┴────────────────────────────────────┐
                          │                                                                          │
                  ┌───────▼────────┐                                                       ┌─────────▼────────┐
                  │   ENGAGED      │                                                       │   NO RESPONSE    │
                  │  (got someone) │                                                       │ (no one picked)  │
                  └───────┬────────┘                                                       └─────────┬────────┘
                          │                                                                          │
                  Phase 1: Rapid Qualification                                                Try again — up to 4 attempts
                  (phone verified, dentist type,                                                     │
                   practice type, timeline, budget)                                  ┌───────────────┴─────────────────┐
                          │                                                          │                                 │
              First-call ROUTE decision                                  4 failed attempts                      Got engaged
                          │                                                          │                                 │
              ┌───────────┼────────────────────┐                            Send WhatsApp Recovery                Continue to
              │           │                    │                          (chesa_recovery_v1 template)         Rapid Qualification
              ▼           ▼                    ▼                                       │
        ONLINE MTG   PHYSICAL MTG          DRIP INFO                            7-day wait for reply
              │           │                    │                                       │
      Zoom + designer  Need full-qual    Enter drip track                ┌─────────────┴─────────────┐
              │       to schedule!        (1m / 3m / 6m+)                │                           │
              │           │                    │                       Reply                      No reply
              │     Phase 2: Full Qual         │                         │                           │
              │   (decision_maker,              │                         │                  60-DAY DORMANT
              │    timeline, budget,           ▼                          ▼                           │
              │    competitors, funding,    Drip sends scheduled    Back to rapid qual         ┌──────┴──────┐
              │    dentist+practice)         WhatsApp messages                                Engaged    No response
              │           │                    │                                                │           │
              │           │              Exit conditions:                                  Rapid qual    ARCHIVED
              │           │              - replied → rapid qual                                            (dead)
              │           │              - meeting CTA → physical mtg
              │           │              - track ends → dormant
              │           │              - manual exit
              │           │
              │           ▼
              │   PHYSICAL MEETING SCHEDULED  ◀── fires "lead.handoff_to_sales" event ──▶  Track 2 (sales) takes over
              │           │
              │     [LEAD LEAVES TELECALLER OWNERSHIP]
              │           │
              │   Sales may hand back via "lead.reactivation_handback" → returns to telecaller as REACTIVATION
              │
              ▼
        ZOOM DONE → still telecaller-owned → eventually progress to physical meeting or back to drip
```

## 2. The five hard decisions a telecaller makes

Every lead boils down to these five forks. The UI surfaces them all:

| # | Decision | Where you make it | What it triggers |
|---|---|---|---|
| 1 | **Did the call connect?** | Calls tab → "Log Attempt" → outcome dropdown | `no_response` triggers attempt counter; anything else lets you qualify |
| 2 | **What's the first-call route?** (after a successful call) | Qualification tab → 3 route buttons | Online / Physical / Drip — the path the lead takes next |
| 3 | **Is it ready for a physical meeting?** | Meetings tab → Schedule Physical | Backend's `qualificationGate` blocks if any of 6 full-qual fields missing |
| 4 | **Should I keep nurturing or exit drip?** | Drip tab → Manual Exit (reason required) | Lead returns to active pipeline or moves toward dormant |
| 5 | **Has 4 calls failed?** | Banner appears automatically | "Send Recovery WhatsApp" → starts the 60-day dormant clock |

## 3. The 7 "stages" stored in `lead_extensions.stage`

This is the column the dashboard reads to know where a lead is. Every transition flips this field:

| Stage | How it gets here | Visible in which view |
|---|---|---|
| `new` | Intake form submit | Pipeline |
| `rapid_qualified` | Rapid-qualify form saved | Pipeline (with badge) |
| `full_qualified` | Edit Full Qualification dialog saved | Pipeline (with badge) |
| `zoom_meeting_done` | Zoom meeting card submitted | Pipeline |
| `physical_meeting_scheduled` | Physical Meeting submitted (gate passed) | Disappears — handed off to sales (Track 2) |
| `dormant` *(via `dormant_since` timestamp)* | Recovery WhatsApp sent + 7d no reply | Dormant queue |
| `archived` | After 60-day dormant retry fails | Removed from all queues |

## 4. The three parallel state machines

Three pieces of state move **at the same time** for one lead. Understanding the three independently is the unlock:

### A. Call-attempt machine (`lead_attempts` table)

Counts only `attempt_type IN ('call', 'retry_call')`. Each row is one logged attempt.

```
attempt 1 (no_response) →
attempt 2 (no_response) →
attempt 3 (no_response) →
attempt 4 (no_response) → backend response: { triggerRecovery: true }
                          ↓
                  Recovery banner appears in UI
                          ↓
                  Telecaller clicks "Send Recovery WhatsApp"
                          ↓
                  whatsapp_messages row + dormant_since set
```

Any non-no-response outcome (`engaged`, `replied`, etc.) **stops** this machine — the lead moves on to Rapid Qualification.

### B. Drip machine (`drip_sequence_state` table)

Only exists if the lead was routed to drip or added from the Idle queue. One row per lead, `status='active'` while in nurture.

```
enterDrip(track=1_month|3_month|6_plus_month)
       ↓
   active (cron worker — not built yet — sends next message)
       ↓
   Exit reasons:
   ├── exited_replied         (WhatsApp inbound webhook fires)
   ├── exited_meeting_booked  (CTA click in template)
   ├── exited_completed       (track ended without engagement)
   └── exited_manual          (telecaller clicked Exit Drip, reason required)
```

### C. Ownership / handoff (`assigned_to` column)

This is who owns the lead. Two transitions:

```
Telecaller owns it (assigned_to = "tester")
       ↓
Physical Meeting scheduled (with qualificationGate passed)
       ↓
backend round-robin picks salesperson → assigned_to = "sales:<id>"
       ↓
[Track 2 territory — sales runs their own state machine here]
       ↓
Sales hands back (lead.reactivation_handback event)
       ↓
assigned_to flips back to telecaller, lead appears in REACTIVATION queue
```

## 5. UI views → backend reality map

Each sidebar item is a SQL filter on `lead_extensions`. This is what each one is asking:

| Sidebar item | Underlying query | What it shows |
|---|---|---|
| **Pipeline** | `assigned_to = me AND stage NOT IN (won/lost/dormant/archived/physical_mtg_sched) AND dormant_since IS NULL` | Active work — leads where calls/qualifying happens |
| **No Response** | `failed_attempt_count < 4 AND latest_outcome = 'no_response'` | Leads needing another call try |
| **Drip** | `drip_sequence_state.status = 'active'` | Leads on autopilot WhatsApp nurture |
| **Idle** | `DATEDIFF(NOW(), last_activity) >= IDLE_THRESHOLD_DAYS` (default 14) | Lost track of these — call or push to drip |
| **Dormant** | `dormant_since IS NOT NULL` | Recovery WhatsApp didn't get a reply — 60-day cooldown |
| **Reactivation** | Track 2 handback (empty today — needs Track 2 events) | Sales returned the lead |
| **6+ Month** | `stage = 'six_month_funnel'` (set on certain reactivations) | Long-cycle nurture pool |

## 6. Spec-required gates the backend enforces

These are non-negotiable rules baked into middleware. They protect data quality.

1. **`qualificationGate`** — Refuses to schedule a physical meeting unless **all 6 full-qual fields** (decision_maker, dentist_type, practice_type, budget_range, funding_method, plus a competitor entry) are filled. Without this, a half-qualified lead would hit the sales team unprepared.

2. **`designGate`** — Refuses a Zoom meeting save unless `layout_shared` and `design_fee_discussed` decisions are made. Forces the telecaller to ask the questions the Zoom SOP requires.

3. **JWT auth** — Every endpoint except `/login` and `/ping` requires a valid token. 12-hour expiry.

4. **Test-mode tagging** — While `TEST_MODE=true`, every SAP BP/Opportunity is prepended with `[TELECALLER-TEST]` so cleanup can find them.

## 7. What happens **today** vs what's deferred

| Capability | State |
|---|---|
| Manual call attempts → state machine update | ✅ Live |
| Recovery WhatsApp on attempt 4 | ✅ Backend logs to `whatsapp_messages` + sets dormant clock |
| Drip enter / exit | ✅ Persists state |
| Full lifecycle handoff to sales | ✅ Backend fires the event (flips `assigned_to`, sets `handed_off_at`) |
| **Drip cron worker that actually sends messages on cadence** | ❌ Not built — only the persistence layer is. Track1 spec §8 Day 4. |
| **No-response 7-day reply checker → set `dormant_since`** | ❌ Not built. Currently you set dormant manually via the recovery flow. |
| **60-day retry-call surfacer** | ❌ Not built. Dormant queue exists; no scheduled "now retry these" job. |
| **Idle scanner cron (02:00 IST daily)** | ❌ Not built. Queue shows correct leads on demand, but no auto-flag-then-escalate. |
| **WhatsApp inbound webhook → auto-exit drip on reply** | ❌ Needs Track 2's webhook integration. |
| **Real WhatsApp template sends** | ❌ Currently `WHATSAPP_DRY_RUN=true` — logs to console instead of sending. Flip when Meta approves `chesa_recovery_v1`. |
| **Round-robin / territory salesperson picker** | ⚠️ Simple lowest-load picker exists. Real territory logic is Week 2 per spec §9.2. |
| **Reactivation receiver** | ⚠️ Schema ready, view shows empty list. Needs Track 2 to fire `lead.reactivation_handback`. |

## 8. The mental model in one sentence

**A lead is a row in `lead_extensions` with three parallel state machines (call attempts / drip / ownership), and every UI view is just a different filter over those.**

If you remember that, the rest follows from the SQL — `lead_extensions.stage` says where in the funnel, `lead_attempts` says what call activity has happened, `drip_sequence_state` says whether it's on autopilot, and `assigned_to` says who's holding the bag.

---

If you want, the next step would be picking one of the "deferred" cron jobs above (likely the drip worker or the idle scanner) and shipping it — those are what turn this from a manually-driven app into a self-running funnel. Tell me which one matters most for your tests.

---

Let me walk you through it like a story — one lead, from birth to one of its possible endings. Every fork is something a real telecaller decides.

## The lead's journey

### Step 0 — A name comes in

Someone tells you about Dr. Suresh. You open **Sidebar → Add New Lead**, fill 5 mandatory fields (name, phone, location, equipment interest, source), pick the salesperson who'll own it, hit Create.

**What happens:**
- SAP creates a BusinessPartner (the customer record) and a SalesOpportunity (the deal record)
- MySQL inserts a row in `lead_extensions` with `stage = 'new'`
- Lead now appears in your **Pipeline** view

### Step 1 — You call them

You click into the lead → **Calls tab → Log Attempt**. Two things can happen:

```
   📞 You call
       │
       ├──────────────► They picked up.  Outcome: engaged / call_back / etc.
       │                    │
       │                    └──► Continue to Step 2 (Rapid Qualification)
       │
       └──────────────► No one picked up. Outcome: no_response
                            │
                            └──► Continue to Step 1b (No-Response loop)
```

### Step 1b — Nobody picked up (the no-response loop)

You retry — up to **4 calls** at sensible spacing. Backend keeps the count for you.

```
   Call 1: no response → try later
   Call 2: no response → try later
   Call 3: no response → try later
   Call 4: no response → 🚨 Recovery banner appears in the UI
                              │
                              └──► You click "Send Recovery WhatsApp"
                                        │
                                        ├── 7 days, lead replies   → back to Step 2 (Rapid Qualify)
                                        └── 7 days, silence        → lead becomes DORMANT (60-day cooldown)
                                                                          │
                                                                          ├── After 60 days, you retry
                                                                          │   ├── engaged   → Step 2
                                                                          │   └── no response → ARCHIVED ☠️
```

### Step 2 — Rapid Qualification (you're talking to them now)

This is **Phase 1 of qualification** — 5 quick questions on the call:

1. Is the phone verified? *(yes — you're literally talking to them)*
2. What kind of dentist? *(GP / orthodontist / endodontist / …)*
3. What kind of practice? *(solo / group / hospital / …)*
4. When do they want to buy? *(immediate / 1m / 3m / 6m+)*
5. What's their budget? *(<5L / 5–10L / 10–25L / 25L+)*

Then **the most important decision in the whole app**: which of the three routes does this lead go on?

```
   ┌───────────────────────────────┐
   │  Pick the first-call route    │
   └────────────┬──────────────────┘
                │
   ┌────────────┼─────────────────┐
   │            │                 │
   ▼            ▼                 ▼
 ONLINE      PHYSICAL           DRIP
 MEETING     MEETING            INFO
 (Zoom)      (in-person demo)   (nurture over time)
```

### Step 3a — Route picked: ONLINE MEETING (Zoom)

You go to **Meetings tab → Schedule Zoom**. You record:
- Meeting time
- Was a layout shared with the designer? (yes/no)
- Was a design fee discussed? Paid / declined / just discussed
- If paid: upload payment proof

After the Zoom you're back to the same lead — usually progressing toward a physical meeting next.

### Step 3b — Route picked: PHYSICAL MEETING

This is the **handoff point** — the moment the lead leaves you and goes to a salesperson.

But first you must complete **Phase 2 qualification** (6 fields, deeper than Phase 1):
- Decision maker (who actually signs?)
- Timeline (firmer than Phase 1 bucket)
- Budget range (re-confirmed)
- Competitors (Carestream, Vatech, etc.)
- Funding method (cash / loan / not sure)
- Confirmed dentist + practice type

The **backend refuses** to schedule a physical meeting until all 6 are filled (that's the `qualificationGate`). When you try, it returns **422 with `missingFields: [...]`** so you know exactly what's blocking.

Once full-qualified → **Schedule Physical Meeting** fires:
- A `meeting_records` row is inserted
- The lead's `assigned_to` flips from you → a salesperson (round-robin picks one)
- `handed_off_at` is timestamped
- Lead disappears from your queues — **Track 2 (sales) now owns it**

### Step 3c — Route picked: DRIP

The lead isn't ready to buy yet but is real. You put them on an automated WhatsApp nurture sequence.

You pick (or it's chosen automatically) one of 3 tracks:

| Track | Cadence | Length |
|---|---|---|
| **1-month** | Days 1, 2, 3, then every 3 days | ~9 messages over 17 days |
| **3-month** | Every 5 days | ~19 messages over 90 days |
| **6+ month** | Every 14 days | ~13 messages over 168 days |

Lead lives in **Drip view** with status `active`. While there:

```
   Drip is running
       │
       ├──► Dentist replies on WhatsApp     → exits to Rapid Qualify (Step 2 again)
       │
       ├──► Dentist clicks a meeting CTA    → exits to Physical Meeting flow (Step 3b)
       │
       ├──► Track finishes, no engagement   → moves to DORMANT
       │
       └──► You manually exit (reason req.) → exits with the reason stored
```

> ⚠️ The cron job that *actually sends* drip messages isn't built yet. The state is tracked correctly; messages aren't going out on cadence yet.

### Step 4 — The lead comes back (REACTIVATION)

Sometimes the salesperson decides "this isn't ready" and hands it back. Track 2 fires a `lead.reactivation_handback` event, ownership flips back to you, and the lead shows up in **Reactivation Inbox**.

You typically put these back on a long drip (3 or 6 months) and keep nurturing.

### Step 5 — The "where did this go?" guard rails

Two background concerns watch over the whole app:

**IDLE SCANNER** — if a lead has had **no activity in 14 days** (no call, no meeting, no qualification update), it shows up in **Idle queue** with a yellow warning. You either log activity, push it to drip, or let it slide further toward dormant.

**RECOVERY CLOCK** — once the 7-day "did they reply?" timer fires after a recovery WhatsApp, dormancy starts. Once dormant for 60 days, retry surfaces it.

## The whole thing in one picture

```
                         ┌─────┐
                         │ NEW │
                         └──┬──┘
                            │ first call
              ┌─────────────┴─────────────┐
              │                           │
       NO RESPONSE LOOP             RAPID QUALIFICATION
       (4 calls, then               (5 fields + route pick)
        WhatsApp recovery)                  │
              │                  ┌─────────┼─────────┐
              │                  ▼         ▼         ▼
         DORMANT                ZOOM   PHYSICAL    DRIP
            │                    │       │           │
        retry-call               │   full-qualify    │
            │                    │    (6 fields)     │ replies / CTA / done
       engaged  no-response      │       │           │
         │         │             │   HANDOFF ──► [SALES, Track 2]
         │      ARCHIVED          ▲                  │
         │                        │ reactivation     │ on drip-exit
         └────────────────────────┴──────────────────┘
```

## What the views are really showing you

| You see | Mental model |
|---|---|
| **Pipeline** | "Leads I should be calling today" |
| **No Response** | "Leads stuck mid-call-loop, retry due" |
| **Drip** | "Leads I've put on autopilot — don't bother them" |
| **Idle** | "Leads I've forgotten about — pick one up" |
| **Dormant** | "Leads where the trail went cold — long shot" |
| **Reactivation** | "Sales sent it back to me — re-engage" |
| **6+ month** | "Long-cycle pool — slow burn nurture" |

## The 3 questions to ask yourself for any lead

If you ever feel lost on a lead, ask these:

1. **Has the contact even happened yet?** → look at `lead_attempts`. If no engaged entry, you're in Step 1.
2. **Is the lead qualified?** → look at `lead_extensions.dentist_type / decision_maker`. If null, you're in Step 2 or 3b prerequisites.
3. **Who owns it right now?** → `lead_extensions.assigned_to`. If `tester` (you), it's yours. If `sales:*`, it's been handed off.

That's the full lifecycle. The whole app is just helping you walk leads through this funnel without losing any along the way.
