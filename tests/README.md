# Testing — how the telecaller CRM is tested (and how to add more)

This is the guided tour. Read it once top-to-bottom and you'll understand the
whole setup. This is a Next.js + TypeScript app; tests are TypeScript and live
under a single top-level `tests/` tree, split by layer.

## 1. The testing pyramid (why there are three kinds)

```
        /\        e2e         few · slow · real browser · whole app + real backend
       /  \       integration medium · a component + hooks + FAKE network
      /____\      unit        many · fast · one pure function / hook in isolation
```

- **Unit** — a single function/module/hook, no real network. Fast, pinpoints logic bugs.
- **Integration** — a React component rendered with its real dependencies
  (react-query, child components) but with the **API layer mocked**. Catches wiring bugs.
- **e2e** — the actual deployed app in a real browser, clicked like a rep would.
  Catches "it all falls apart together" bugs. Few of these — they're slow and need
  a live backend.

Rule of thumb: push a test as far DOWN the pyramid as it can go. Only test in the
browser what genuinely needs a browser.

## 2. The tools

| Layer               | Tool                         | Runs in                  |
| ------------------- | ---------------------------- | ------------------------ |
| unit + integration  | **Vitest** + Testing Library | jsdom (fake DOM in Node) |
| e2e                 | **Playwright**               | real Chromium / WebKit / Edge |

- **Vitest** = the test runner. Config lives in `vitest.config.mts` — it uses the
  same `@/…` path alias as the app, jsdom as the environment, `globals: true` (so
  `describe`/`it`/`expect`/`vi` need no import), and a prod-like jsdom URL.
- **@testing-library/react** = renders components and queries them the way a user
  sees them (by role/text/placeholder), not by internal class names.
- **@testing-library/user-event** = simulates real user interaction (typing,
  clicking) more faithfully than `fireEvent`.
- **jsdom** = a fake browser DOM in Node. No windows pop up.
- **Playwright** = launches a real browser and drives the deployed UI (see `tests/e2e/`).

## 3. Where things live

All tests live under one `tests/` tree, split by layer (each test mirrors its
source path under `unit/` / `integration/`):

```
tests/
├── unit/                    # pure logic — mirrors lib/ (schemas, api mappers, utils…)
│   └── lib/…                #   e.g. tests/unit/lib/coalesce.test.ts
├── integration/             # components + hooks (react-query wired, API mocked)
│   ├── hooks/…              #   e.g. tests/integration/hooks/use-log-attempt.test.tsx
│   └── components/…         #   e.g. tests/integration/components/ui/pending-button.test.tsx
├── e2e/                     # Playwright specs (real browser) — see tests/e2e/README.md
├── helpers/render.tsx       # renderWithProviders() + makeTestQueryClient() + user
├── fixtures/index.ts        # canned, type-correct API shapes (leadDetail, attempts…)
├── setup/vitest.setup.ts    # global setup: next/navigation mock + jsdom polyfills + cleanup
└── README.md                # this file

vitest.config.mts            # Vitest + coverage config (include: tests/**)
playwright.config.ts         # testDir: tests/e2e
```

Naming: unit/integration use `*.test.{ts,tsx}`. E2E uses `*.spec.ts` under
`tests/e2e/` (excluded from Vitest). JSX must live in a `.tsx` file. Tests import
source via the `@/…` alias, so a test's location never depends on the file it tests.

## 4. How to run

```bash
npm test               # all unit + integration once (CI mode)
npm run test:watch     # re-run on change while developing
npm run test:unit      # just tests/unit (pure logic)
npm run test:integration  # just tests/integration (hooks + components)
npm run test:coverage  # + a coverage report in ./coverage (open coverage/index.html)
npm run e2e            # Playwright, real browser (needs a deployed BASE_URL)
npm run e2e:ui         # Playwright's interactive UI mode (great for debugging)
npm run e2e:report     # open the last Playwright HTML report
```

E2E runs against a **deployed** URL (the app is a static export that needs the
real backend). See `e2e/README.md` for the `BASE_URL` / `E2E_USER` env vars and
one-time `npx playwright install`.

## 5. How each layer is wired

- **Vitest config** (`vitest.config.mts`): jsdom environment, the `@/…` alias, a
  prod-like jsdom URL (`https://telecaller.chesadentalcare.com/`), the setup file,
  `include: tests/**/*.test.{ts,tsx}`, and excludes `tests/e2e/` (Playwright's job).
  Coverage is `v8` with text/html/lcov reporters into `./coverage`.
- **Global setup** (`tests/setup/vitest.setup.ts`): adds jest-dom matchers, a global
  `next/navigation` mock (so any component that calls `useRouter`/`useSearchParams`
  renders without a Next app shell), jsdom polyfills Radix UI needs (`matchMedia`,
  `ResizeObserver`, `IntersectionObserver`, `scrollIntoView`, pointer-capture
  no-ops), and an `afterEach(cleanup)` to unmount between tests.
- **Playwright config** (`playwright.config.ts`): points at `tests/e2e/`, runs Chromium,
  WebKit, Edge, and mobile Safari against `BASE_URL`.

## 6. Patterns you'll reuse

**Render a component with react-query wired up:**

```tsx
import { renderWithProviders, screen } from "@/tests/helpers/render"

const { user } = renderWithProviders(<LeadRow lead={pipelineRows[0]} />)
await user.click(screen.getByRole("button", { name: /log call/i }))
expect(await screen.findByText(/engaged/i)).toBeInTheDocument()
```

`renderWithProviders` returns everything `render` does, plus `{ queryClient, user }`.
Pass your own client via `renderWithProviders(ui, { queryClient })` when you need to
seed the cache; otherwise it makes a fresh one with retries off.

**Test a hook (renderHook + a QueryClientProvider wrapper):**

```tsx
import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

const logAttempt = vi.hoisted(() => vi.fn())
vi.mock("@/lib/api/leads", () => ({ leadsApi: { logAttempt } }))
```

(See `tests/integration/hooks/use-log-attempt.test.tsx` for the full, real example.)

**Mock the API layer (integration — Vitest):** mock the module, not `fetch`. Hoist
the mock fns so they exist before the import graph is evaluated:

```tsx
const detail = vi.hoisted(() => vi.fn())
vi.mock("@/lib/api/leads", () => ({ leadsApi: { detail } }))
detail.mockResolvedValue(leadDetail) // from tests/fixtures
```

**Reuse canned data:** import from `@/tests/fixtures` (`leadDetail`,
`attempts`, `pipelineRows`, `salesUsers`, `sapStates`) — they're type-checked
against the real API row types, so a shape drift breaks the fixture, not just a test.

**Query like a user:** prefer `getByRole` / `getByPlaceholder` / `findByText`
(async) over CSS selectors. Use `findBy*` for anything that appears after an
effect/fetch settles.

## 7. Gotchas (this stack)

1. **jsdom URL matters.** Some code no-ops on `localhost` (treated as dev), so the
   config sets a prod-like URL. Assert behaviour against that, not `localhost`.
2. **Radix UI needs polyfills.** Radix reads `matchMedia`, `ResizeObserver`,
   `IntersectionObserver`, `scrollIntoView`, and pointer-capture APIs jsdom lacks.
   `tests/setup/vitest.setup.ts` stubs them all — a Radix Select/Dialog test crashes without them.
3. **`next/navigation` is globally mocked.** `useRouter().push` etc. are `vi.fn()`s.
   To assert navigation, re-mock the specific export in your test file with your own
   spy (a per-file `vi.mock` overrides the global one).
4. **Hoist mock fns with `vi.hoisted`.** `vi.mock` is hoisted above imports, so any
   fn it references must be created with `vi.hoisted` or it's undefined at mock time.
5. **`user-event` is async.** `await user.click(...)`, `await user.type(...)`.
6. **E2E is not run in CI.** It needs browsers + a live backend. CI runs only the
   Vitest suite (`.github/workflows/tests.yml`).
