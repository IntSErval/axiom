# AXIOM — Unfinished Phases Completion Plan (2026-07-19)

Branch: `phase-3-intelligence` (off `phase-2-domain-modules`). Project root: `axiom/`.

Codebase facts (verified):
- Auth is fully wired: `app/login/page.tsx`, `app/auth/callback/route.ts`, every server action calls `supabase.auth.getUser()` and filters by `user_id`.
- Tables in use (10): `tasks`, `projects`, `habits`, `habit_logs`, `accounts`, `transactions`, `budgets`, `goals`, `milestones`, `goal_checkins`. Child tables without `user_id`: `habit_logs` (→ habits), `milestones` (→ goals), `goal_checkins` (→ goals).
- Coach: `lib/agents/coach-agent.ts` (thin prompt wrapper, model `nvidia/llama-3.3-nemotron-super-49b-v1.5`) + `app/api/nim/coach/route.ts` (context = raw JSON dumps of tasks/habits/accounts/goals only). UI: `components/agents/ChatPanel.tsx`.
- Insights: `app/api/insights/route.ts` — 5 single-domain rules returning `{id, domain, message}`; UI `components/dashboard/InsightCard.tsx` + `InsightStack.tsx` with snooze/dismiss.
- Goals link to habits and budget categories (fields verified in `app/dashboard/goals/actions.ts` — implementers must check exact column names there).
- No tests exist. No SQL migration files exist (previous DDL run manually in Supabase SQL editor).

---

## Task 1 — RLS migration SQL

Create `supabase/migrations/20260719_enable_rls.sql` (new folder ok). For each of the 10 tables:
- `alter table X enable row level security;`
- Tables WITH `user_id` (tasks, projects, habits, accounts, transactions, budgets, goals): one policy `for all using (auth.uid() = user_id) with check (auth.uid() = user_id)`.
- Child tables (habit_logs, milestones, goal_checkins): `for all` policy using `exists` subquery joining parent table's `user_id` to `auth.uid()` (both `using` and `with check`).
- Verify child FK column names by reading `app/dashboard/habits/actions.ts` and `app/dashboard/goals/actions.ts` insert calls.
- Header comment: how to run (paste into Supabase SQL editor), note that service-role key bypasses RLS.
- No app code changes. Cannot be executed locally — correctness verified by review.

## Task 2 — Coach cross-domain context + proactive check-in

1. `app/api/nim/coach/route.ts`: enrich context, summarized not raw-dumped:
   - habit logs last 14 days → per-habit completion counts
   - transactions last 30 days → net spend per category (expenses only)
   - budgets → limit vs month-to-date spend per category
   - tasks → include overdue count vs today
   - goals → include % progress and days to deadline
   Keep total context compact (< ~1500 chars typical).
2. `lib/agents/coach-agent.ts`: system prompt gains explicit active-guidance charter: propose concrete challenges/micro-goals, propose goal recalibration when pace is off, reference specific numbers from context. When conversation is empty, open with a brief check-in citing ONE specific pattern from the data.
3. `components/agents/ChatPanel.tsx`: on first open with empty history, POST `{messages: []}` to `/api/nim/coach` to fetch the coach's check-in opener (show existing loading state). Route/agent must handle empty messages by generating the opener.

## Task 3 — Cross-domain correlation insights

Extend `app/api/insights/route.ts` (keep `{id, domain, message}` shape, follow existing style):
- `habits-tasks-dip` (domain habits): a cold habit (7+ days no log) exists AND overdue tasks > 0 → "consistency is dipping across habits and tasks" style message naming the habit and overdue count. When it fires, suppress `habits-cold`.
- `finance-goal-drag` (domain finance): an over-budget category matches an active goal's linked category → message naming category and goal. When it fires, suppress `finance-over-budget`.
- `goal-habit-cold` (domain coach): an active goal linked to a habit whose habit is cold → message naming goal and habit.
Fetch goals (with link fields — verify names in `app/dashboard/goals/actions.ts`) in the existing `Promise.all`.

## Task 4 — Actionable insight cards

- Insights API: add optional `href` (tasks→`/dashboard/tasks`, finance→`/dashboard/finance`, habits→`/dashboard/habits`) and for coach-domain insights an `action: "open-coach"` marker.
- `InsightCard.tsx`/`InsightStack.tsx`: `href` renders a small "View →" link (Next `Link`); `open-coach` renders "Open coach" button that opens the ChatPanel. Find how ChatPanel visibility is managed (check `app/dashboard/layout.tsx` / stores) and reuse it; if it's local state, lift via the simplest existing mechanism (custom window event acceptable). Keep glass styling consistent.

## Task 5 — E2E smoke tests (Playwright)

- Add `@playwright/test` dev-dependency, `playwright.config.ts` (baseURL `http://localhost:3000`, `webServer: npm run dev`, chromium only).
- `e2e/smoke.spec.ts`: (a) unauthenticated `/dashboard` redirects to `/login`; (b) `/login` renders email+password form; (c) gated on `TEST_USER_EMAIL`/`TEST_USER_PASSWORD` env (skip otherwise): sign in → dashboard renders, navigate all 4 tabs, open chat panel.
- Add `test:e2e` npm script. Verify config by running the unauthenticated specs locally.

## Task 6 — Accessibility + mobile pass

Audit dashboard shell and 4 tabs at 375px viewport; fix top issues only, no redesign:
- nav usable/not overflowing on mobile; tap targets ≥ 40px
- `aria-label` on all icon-only buttons (delete, close, snooze, chat toggle…)
- visible `:focus-visible` styles on interactive glass elements
- `prefers-reduced-motion`: disable/tone down framer-motion transitions and canvas effects (CursorTrail/Glowtrail, ParticleBrain)
- form inputs have associated labels

## Task 7 — Bundle/perf audit

- Run `next build`; record route bundle sizes.
- Ensure heavy visuals (Spline wrapper, ParticleBrain, Glowtrail) are `next/dynamic`/lazy with `ssr: false` where appropriate.
- Apply only cheap wins (dynamic imports, obvious dead weight); report sizes before/after. No speculative optimization.
