import { redirect } from "next/navigation";
import { supabaseUser } from "@/lib/supabase-server";
import { GoalList } from "@/components/dashboard/GoalList";
import { deriveCurrent } from "@/lib/goal-progress";
import type { Goal } from "@/lib/database";

export default async function GoalsPage() {
    const { supabase, user } = await supabaseUser();

    if (!user) {
        redirect("/login");
    }

    const { data: goals } = await supabase
        .from("goals")
        .select("*")
        .eq("user_id", user.id)
        .in("status", ["active", "completed"])
        .order("created_at");
    const goalIds = (goals ?? []).map((g: { id: string }) => g.id);
    const habitIds = (goals ?? []).map((g: Goal) => g.habit_id).filter(Boolean) as string[];
    const categories = (goals ?? []).map((g: Goal) => g.category).filter(Boolean) as string[];

    const [{ data: milestones }, { data: checkins }, { data: habits }, { data: budgets }, { data: habitLogs }, { data: transactions }] = await Promise.all([
        supabase.from("milestones").select("*").in("goal_id", goalIds),
        supabase.from("goal_checkins").select("*").in("goal_id", goalIds).order("created_at"),
        supabase.from("habits").select("*").eq("user_id", user.id),
        supabase.from("budgets").select("*").eq("user_id", user.id).order("created_at"),
        habitIds.length
            ? supabase.from("habit_logs").select("*").in("habit_id", habitIds)
            : Promise.resolve({ data: [] }),
        categories.length
            ? supabase.from("transactions").select("*").eq("user_id", user.id).in("category", categories)
            : Promise.resolve({ data: [] }),
    ]);

    // Reconcile linked goals: write derived progress back so the home widget and
    // agents see fresh numbers, and auto-complete goals that reached their target.
    for (const goal of (goals ?? []) as Goal[]) {
        const derived = deriveCurrent(goal, habitLogs ?? [], transactions ?? []);
        if (derived === null) continue;
        const done = goal.status === "active" && derived >= goal.target_amount;
        if (done || Math.abs(derived - goal.current_amount) > 1e-9) {
            const patch = {
                current_amount: derived,
                ...(done && { status: "completed" as const, completed_at: new Date().toISOString() }),
            };
            await supabase.from("goals").update(patch).eq("id", goal.id).eq("user_id", user.id);
            Object.assign(goal, patch);
        }
    }

    return (
        <GoalList
            goals={goals ?? []}
            milestones={milestones ?? []}
            checkins={checkins ?? []}
            habits={habits ?? []}
            budgets={budgets ?? []}
            habitLogs={habitLogs ?? []}
            transactions={transactions ?? []}
        />
    );
}
