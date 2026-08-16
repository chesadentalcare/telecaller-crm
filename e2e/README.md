# Telecaller CRM — E2E / cross-browser QA

Playwright suite that runs the QA test plan against a **deployed** build (the app
is a static export that needs the real backend, so we test a URL, not `next dev`).

Engines covered: **Chromium** (Chrome), **WebKit** (Safari, desktop + iOS), and
**Edge** (msedge channel) — the three the reps use.

## One-time setup

```bash
cd telecaller-crm
npm install                 # if you haven't already
npx playwright install      # downloads the browser engines (chromium, webkit)
# Edge uses your installed msedge; if you don't have it, remove the "edge" project
# from playwright.config.ts.
```

## Run

```bash
# No-auth smoke (login page) — works against any deployment:
BASE_URL=https://telecaller-staging.example npm run e2e -- login-page

# Full authenticated suite — needs a real login:
BASE_URL=https://telecaller-staging.example \
E2E_USER=neha E2E_PASS=•••• \
  npm run e2e

# One engine only:
... npm run e2e -- --project=webkit          # Safari engine
... npm run e2e -- --project=chromium
... npm run e2e -- --project=mobile-safari

# Open the HTML report after a run:
npm run e2e:report
```

## What's here

| File | Needs auth? | Test-plan IDs |
|------|-------------|---------------|
| `login-page.spec.ts` | no | TC-03 (dvh full-height), DM-04 login (no double-submit) |
| `authenticated.spec.ts` | yes (BASE_URL + E2E_USER + E2E_PASS) | NAV-01 (SPA nav), NQ-01 (drip idle-quiet), TC-01 (dialog width) |

The authenticated specs are **templates** mapped to `qa-audit/03-test-plan.md`.
Some selectors (outcome-explainer trigger, lead-row) may need tuning to the
current build — each is annotated where that applies. Extend them with the rest
of the ~160 cases in the test plan as coverage grows.

## Notes
- `playwright-report/`, `test-results/`, and `e2e/.auth/` are build artifacts — git-ignored.
- Fast unit/behaviour tests (no browser) live alongside the code as `*.test.ts(x)`
  and run with `npm test` (Vitest). Those already guard F1/F2/F3/F6 logic.
