import { NextResponse } from "next/server";
import { supabaseUser } from "@/lib/supabase-server";
import { cached } from "@/lib/cache";

// Insights are proactive nudge cards polled on every dashboard mount. They're
// derived purely from the user's own data, so we cache the computed result
// per-user. TTL is the consistency model: a user's own write shows up within
// INSIGHTS_TTL_MS at worst (acceptable for dismissible nudges). Tighten, or add
// invalidate("insights:"+user.id) to the domain write actions, if instant.
const INSIGHTS_TTL_MS = 60_000;

interface Insight {
    id: string;
    domain: "tasks" | "habits" | "finance" | "coach";
    message: string;
    href?: string;
    action?: "open-coach";
}

export async function GET() {
    try {
        const { supabase, user } = await supabaseUser();
        if (!user) return NextResponse.json({ insights: [] });

        const insights = await cached(`insights:${user.id}`, INSIGHTS_TTL_MS, async () => {
        const today = new Date().toISOString().slice(0, 10);
        const monthStart = today.slice(0, 7) + "-01";
        const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();

        const [tasksRes, habitsRes, transactionsRes, budgetsRes, goalsRes] = await Promise.all([
            supabase
                .from("tasks")
                .select("id, due_date, status, priority")
                .eq("user_id", user.id)
                .neq("status", "done"),
            supabase
                .from("habits")
                .select("id, name")
                .eq("user_id", user.id),
            supabase
                .from("transactions")
                .select("amount, category")
                .eq("user_id", user.id)
                .gte("date", monthStart),
            supabase
                .from("budgets")
                .select("category, limit_amount")
                .eq("user_id", user.id),
            supabase
                .from("goals")
                .select("title, habit_id, category")
                .eq("user_id", user.id)
                .eq("status", "active"),
        ]);

        const openTasks = tasksRes.data ?? [];
        const habits = habitsRes.data ?? [];
        const transactions = transactionsRes.data ?? [];
        const budgets = budgetsRes.data ?? [];
        const activeGoals = goalsRes.data ?? [];

        // Habit logs — only fetch if there are habits
        let habitLogs: { habit_id: string }[] = [];
        if (habits.length > 0) {
            const habitIds = habits.map((h) => h.id);
            const { data } = await supabase
                .from("habit_logs")
                .select("habit_id")
                .in("habit_id", habitIds)
                .gte("completed_at", sevenDaysAgo);
            habitLogs = data ?? [];
        }

        const cards: Insight[] = [];

        // tasks-overdue
        const overdue = openTasks.filter((t) => t.due_date && t.due_date < today);
        if (overdue.length > 0) {
            cards.push({
                id: "tasks-overdue",
                domain: "tasks",
                message: `${overdue.length} task${overdue.length > 1 ? "s" : ""} overdue — knock out the oldest one first`,
                href: "/dashboard",
            });
        } else {
            // tasks-p1 (only if overdue didn't fire)
            const p1 = openTasks.filter((t) => t.priority === 1);
            if (p1.length > 0) {
                cards.push({
                    id: "tasks-p1",
                    domain: "tasks",
                    message: `You have ${p1.length} P1 task${p1.length > 1 ? "s" : ""} waiting`,
                    href: "/dashboard",
                });
            }
        }

        // habits-cold / habits-tasks-dip (dip suppresses cold when tasks are also overdue)
        const loggedHabitIds = new Set(habitLogs.map((l) => l.habit_id));
        const coldHabits = habits.filter((h) => !loggedHabitIds.has(h.id));
        const coldHabit = coldHabits[0];
        if (coldHabit && overdue.length > 0) {
            // habits-tasks-dip (cross-domain: cold habit + overdue tasks)
            cards.push({
                id: "habits-tasks-dip",
                domain: "habits",
                message: `Consistency is dipping — '${coldHabit.name}' has gone quiet and ${overdue.length} task${overdue.length > 1 ? "s" : ""} ${overdue.length > 1 ? "are" : "is"} overdue`,
                href: "/dashboard/habits",
            });
        } else if (coldHabit) {
            cards.push({
                id: "habits-cold",
                domain: "habits",
                message: `'${coldHabit.name}' has gone quiet — 7+ days without a log`,
                href: "/dashboard/habits",
            });
        }

        // finance-over-budget / finance-goal-drag (drag suppresses over-budget when the category feeds an active goal; first over-budget category only)
        if (budgets.length > 0) {
            // Sum absolute negative amounts per category
            const spendByCategory: Record<string, number> = {};
            for (const tx of transactions) {
                if (tx.amount < 0 && tx.category) {
                    spendByCategory[tx.category] =
                        (spendByCategory[tx.category] ?? 0) + Math.abs(tx.amount);
                }
            }
            const overBudget = budgets.find(
                (b) => (spendByCategory[b.category] ?? 0) > b.limit_amount
            );
            const draggedGoal = overBudget
                ? activeGoals.find((g) => g.category === overBudget.category)
                : undefined;
            if (overBudget && draggedGoal) {
                // finance-goal-drag (cross-domain: over-budget category feeds an active goal)
                cards.push({
                    id: "finance-goal-drag",
                    domain: "finance",
                    message: `'${overBudget.category}' is over budget — that's slowing your '${draggedGoal.title}' goal`,
                    href: "/dashboard/finance",
                });
            } else if (overBudget) {
                cards.push({
                    id: "finance-over-budget",
                    domain: "finance",
                    message: `'${overBudget.category}' is over budget this month`,
                    href: "/dashboard/finance",
                });
            }
        }

        // coach-weekly (Mondays only)
        if (new Date().getDay() === 1) {
            cards.push({
                id: "coach-weekly",
                domain: "coach",
                message: "Weekly review ready — open the coach to reflect on last week",
                action: "open-coach",
            });
        }

        // goal-habit-cold (cross-domain: active goal linked to a habit gone cold)
        // Intentionally coexists with habits-tasks-dip/habits-cold — the same habit may
        // surface in both a habits-domain card and this coach-domain card.
        const coldHabitIds = new Set(coldHabits.map((h) => h.id));
        const draggedGoalHabit = activeGoals.find(
            (g) => g.habit_id && coldHabitIds.has(g.habit_id)
        );
        if (draggedGoalHabit) {
            const linkedHabit = habits.find((h) => h.id === draggedGoalHabit.habit_id);
            cards.push({
                id: "goal-habit-cold",
                domain: "coach",
                message: `'${draggedGoalHabit.title}' depends on '${linkedHabit?.name}', which has gone quiet this week`,
                action: "open-coach",
            });
        }

            return cards;
        });

        return NextResponse.json({ insights });
    } catch {
        return NextResponse.json({ insights: [] });
    }
}
