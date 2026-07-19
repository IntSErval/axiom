--
-- Enable Row Level Security (RLS) on all AXIOM tables.
--
-- Instructions:
--   1. Open the Supabase dashboard: https://app.supabase.com/project/[project-id]/sql/
--   2. Click "New Query"
--   3. Copy and paste the entire contents of this file
--   4. Click "Run"
--
-- Note: The service-role API key bypasses RLS, so server-side admin operations
-- (e.g., backfills, migrations) remain unaffected. All client-side and
-- authenticated server actions already filter by user_id and are safe.
--

-- ============================================================================
-- Tables WITH user_id column (direct ownership)
-- ============================================================================

-- tasks
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tasks owner all"
  ON public.tasks
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- projects
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "projects owner all"
  ON public.projects
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- habits
ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "habits owner all"
  ON public.habits
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- accounts
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "accounts owner all"
  ON public.accounts
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- transactions
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "transactions owner all"
  ON public.transactions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- budgets
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "budgets owner all"
  ON public.budgets
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- goals
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "goals owner all"
  ON public.goals
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- Child tables WITHOUT user_id (accessed via parent foreign key)
-- ============================================================================

-- habit_logs (child of habits via habit_id)
ALTER TABLE public.habit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "habit_logs owner all"
  ON public.habit_logs
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.habits
      WHERE public.habits.id = public.habit_logs.habit_id
      AND public.habits.user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.habits
      WHERE public.habits.id = public.habit_logs.habit_id
      AND public.habits.user_id = (SELECT auth.uid())
    )
  );

-- milestones (child of goals via goal_id)
ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "milestones owner all"
  ON public.milestones
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.goals
      WHERE public.goals.id = public.milestones.goal_id
      AND public.goals.user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.goals
      WHERE public.goals.id = public.milestones.goal_id
      AND public.goals.user_id = (SELECT auth.uid())
    )
  );

-- goal_checkins (child of goals via goal_id)
ALTER TABLE public.goal_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "goal_checkins owner all"
  ON public.goal_checkins
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.goals
      WHERE public.goals.id = public.goal_checkins.goal_id
      AND public.goals.user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.goals
      WHERE public.goals.id = public.goal_checkins.goal_id
      AND public.goals.user_id = (SELECT auth.uid())
    )
  );
