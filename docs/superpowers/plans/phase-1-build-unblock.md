# AXIOM — Phase 1 Build-Unblock

**Goal:** Make the app compile + render a navigable dashboard so subsequent domain work has a baseline. No new features.

**Scope:** Eight mechanical scaffolding tasks that the codebase imports or CLAUDE.md promises, but that don't exist yet. Strictly unblock what's already started — no feature creep.

**Reference docs:**
- `C:\Users\Lhance\Desktop\project\AXIOM\CLAUDE.md` (project spec — schema, design tokens, phase plan)
- `C:\Users\Lhance\Desktop\project\AXIOM\axiom\package.json` (deps)
- `C:\Users\Lhance\Desktop\project\AXIOM\axiom\app\globals.css` (color tokens)

---

## Tasks

### T1 — Create `axiom/types/database.ts`

Match the schema defined in `CLAUDE.md` → "Database Schema (Supabase / PostgreSQL)" section verbatim.

Exports (named, no defaults):
```ts
export type TaskStatus    = 'todo' | 'in_progress' | 'done';
export type AccountType   = 'checking' | 'savings' | 'investment';
export type BudgetPeriod  = 'monthly' | 'weekly';
export type HabitFrequency= 'daily' | 'weekly' | 'monthly';
export type GoalStatus    = 'active' | 'completed' | 'abandoned';
export type MilestoneStatus = 'pending' | 'achieved';

export interface Task     { id: string; user_id: string; title: string; description: string | null; priority: 1|2|3|4; status: TaskStatus; project_id: string | null; due_date: string | null; created_at: string; updated_at: string }
export interface Project  { id: string; user_id: string; name: string; color: string; created_at: string }
export interface Habit    { id: string; user_id: string; name: string; frequency: HabitFrequency; target: number; streak: number; created_at: string }
export interface HabitLog { id: string; habit_id: string; completed_at: string; note: string | null }
export interface Account  { id: string; user_id: string; name: string; type: AccountType; balance: number; created_at: string }
export interface Transaction { id: string; user_id: string; account_id: string; amount: number; category: string; description: string | null; date: string }
export interface Budget   { id: string; user_id: string; category: string; limit_amount: number; period: BudgetPeriod; created_at: string }
export interface Goal     { id: string; user_id: string; title: string; target_amount: number; current_amount: number; deadline: string | null; status: GoalStatus; created_at: string }
export interface Milestone{ id: string; goal_id: string; title: string; target_amount: number; status: MilestoneStatus; due_date: string | null }
```

**Verify:** `npx tsc --noEmit` should now resolve imports in `lib/streaks.ts` and `components/dashboard/{TaskBoard,HabitList,FinanceDashboard,GoalList}.tsx`.

### T2 — Create `axiom/lib/supabase-server.ts`

Server-side Supabase client using `@supabase/ssr`. Must work in Next App Router server components + server actions.

```ts
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export function supabaseServer() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet) => { try { toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); } catch {} },
      },
    }
  );
}
```

Naming convention matches `lib/supabase.ts` (`supabaseBrowser`) — this export is `supabaseServer`.

### T6 — Implement `axiom/components/ui/GlassPanel.tsx`

Section-level glass container — sibling of `GlassCard`.

```tsx
import type { ReactNode } from 'react';
export function GlassPanel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <section className={`backdrop-blur-xl bg-white/[0.03] border border-white/[0.08] rounded-2xl ${className}`}>
      {children}
   </section>
  );
}
```

### T7 — Implement `axiom/components/ui/GlassModal.tsx`

Minimal accessible modal via `radix-ui` `Dialog`. No animations.

```tsx
'use client';
import type { ReactNode } from 'react';
import { Dialog } from 'radix-ui';

export function GlassModal({ open, onOpenChange, title, children }: {
  open: boolean; onOpenChange: (v: boolean) => void; title?: string; children: ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-40 -translate-x-1/2 -translate-y-1/2 w-[min(560px,90vw)] backdrop-blur-xl bg-white/[0.04] border border-white/[0.08] rounded-2xl p-6 text-zinc-50">
          {title && <Dialog.Title className="font-serif text-xl font-bold italic mb-3">{title</Dialog.Title>}
          {children}
          <Dialog.Close className="absolute right-3 top-3 text-zinc-500 hover:text-zinc-50" aria-label="Close">✕</Dialog.Close>
       </Dialog.Content>
     </Dialog.Portal>
   </Dialog.Root>
  );
}
```

### T5 — Mount cursor in `axiom/app/layout.tsx`

Add `<GlowCursor />` to body (uses named export from `components/background/Glowtrail.tsx`).

```tsx
import { GlowCursor } from '@/components/background/Glowtrail';
// inside RootLayout's body:
<GlowCursor />
{children}
```

### T4 — Create `axiom/app/dashboard/layout.tsx`

Tabbed nav shell wrapping all `/dashboard/*` routes. Active tab from `usePathname()`. Drops the layout in for tab children via Next.js' automatic nesting.

```tsx
'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { GlassPanel } from '@/components/ui/GlassPanel';

const TABS = [
  { href: '/dashboard', label: 'Home', exact: true },
  { href: '/dashboard/tasks', label: 'Tasks' },
  { href: '/dashboard/habits', label: 'Habits' },
  { href: '/dashboard/finance', label: 'Finance' },
  { href: '/dashboard/goals', label: 'Goals' },
] as const;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="min-h-screen w-full bg-[#080810]">
      <header className="sticky top-0 z-20 mx-auto max-w-3xl pt-6 px-6">
        <GlassPanel className="px-2 py-2 flex items-center gap-1">
          {TABS.map((t) => {
            const active = t.exact ? pathname === t.href : pathname?.startsWith(t.href);
            return (
              <Link key={t.href} href={t.href} className={cn(
                'rounded-xl px-3 py-1.5 text-sm transition-colors',
                active ? 'bg-white/[0.08] text-zinc-50' : 'text-zinc-500 hover:text-zinc-50 hover:bg-white/[0.04]'
              )}>
                {t.label}
              </Link>
            );
          })}
       </GlassPanel>
     </header>
      <div className="mx-auto max-w-3xl px-6">{children</div>
   </div>
  );
}
```

### T3 — Create `axiom/app/dashboard/page.tsx`

Dashboard home. Pure server component, no client JS. Static shell only — auth wiring is deferred.

```tsx
import Link from 'next/link';
import { GlassPanel } from '@/components/ui/GlassPanel';

const QUICK = [
  { href: '/dashboard/tasks', label: 'Tasks' },
  { href: '/dashboard/habits', label: 'Habits' },
  { href: '/dashboard/finance', label: 'Finance' },
  { href: '/dashboard/goals', label: 'Goals' },
] as const;

export default function DashboardHomePage() {
  return (
    <main className="space-y-6 py-12">
      <GlassPanel className="p-8">
        <h1 className="font-serif text-3xl font-bold italic text-zinc-50">Intelligence Summary</h1>
        <p className="mt-2 text-zinc-500 text-sm">Insights from your domain agents will surface here once wired up</p>
     </GlassPanel>
      <GlassPanel className="p-6">
        <h2 className="text-zinc-50 font-medium mb-3">Quick Actions</h2>
        <div className="flex gap-3 flex-wrap">
          {QUICK.map((q) => (
            <Link key={q.href} href={q.href} className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-zinc-50 backdrop-blur-xl hover:bg-white/[0.06] transition-colors">
              {q.label}
           </Link>
          ))}
       </div>
     </GlassPanel>
   </main>
  );
}
```

### T8 — Verify build (run last)

From `axiom/`:
```sh
npx tsc --noEmit
npx next lint
npx next build
```

Expected:
- `tsc --noEmit`: 0 errors.
- `next lint`: 0 errors (existing-style warnings OK).
- `next build`: success. `/` renders splash, `/dashboard` renders home with tabs, all four `/dashboard/*` tabs render.

If anything blows up, patch in this same step — don't move forward until green.

---

## Non-goals (explicit)

- No agent logic, no chat panel, no auth wiring, no RLS, no NIM routing, no domain-feature work. Those are Phase 3–5.
- No suppression files (`// @ts-ignore`, `eslint-disable`) except where Next itself does it.
- No new dependencies. Everything required is already in `package.json`.

---

## Order of work

T1 → T2 → T6 → T7 → T5 → T4 → T3 → T8.

T1 + T2 are pre-requisites for T8. The rest compose on top of T1 + T2's exports being importable.
