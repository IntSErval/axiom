import Link from "next/link";
import { redirect } from "next/navigation";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { GlassCard } from "@/components/ui/GlassCard";
import { supabaseServer } from "@/lib/supabase-server";
import { computeStreak } from "@/lib/streaks";
import type { Task, Habit, HabitLog, Account, Goal } from "@/lib/database";

const PRIORITY_COLORS: Record<1 | 2 | 3 | 4, string> = {
    1: "bg-violet-500/20 text-violet-300",
    2: "bg-blue-500/20 text-blue-300",
    3: "bg-amber-500/20 text-amber-300",
    4: "bg-zinc-500/20 text-zinc-400",
};

const QUICK = [
    { href: "/dashboard/tasks", label: "Tasks" },
    { href: "/dashboard/habits", label: "Habits" },
    { href: "/dashboard/finance", label: "Finance" },
    { href: "/dashboard/goals", label: "Goals" },
] as const;

export default async function DashboardHomePage() {
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const uid = user.id;
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

    const [
        { data: topTaskRows },
        { data: habits },
        { data: habitLogs },
        { data: accounts },
        { data: goals },
    ] = await Promise.all([
        supabase
            .from("tasks")
            .select("id,title,priority,due_date,status")
            .eq("user_id", uid)
            .neq("status", "done")
            .order("priority", { ascending: true })
            .limit(1),
        supabase
            .from("habits")
            .select("id,name,streak")
            .eq("user_id", uid),
        supabase
            .from("habit_logs")
            .select("id,habit_id,completed_at")
            .gte("completed_at", ninetyDaysAgo),
        supabase
            .from("accounts")
            .select("id,balance")
            .eq("user_id", uid),
        supabase
            .from("goals")
            .select("id,title,target_amount,current_amount")
            .eq("user_id", uid)
            .eq("status", "active"),
    ]);

    // --- Task widget ---
    const topTask = (topTaskRows as Task[] | null)?.[0] ?? null;
    const isOverdue = topTask?.due_date
        ? new Date(topTask.due_date) < new Date(new Date().toDateString())
        : false;

    // --- Habit streak widget ---
    const habitList = (habits as Pick<Habit, "id" | "name" | "streak">[] | null) ?? [];
    const logs = (habitLogs as Pick<HabitLog, "id" | "habit_id" | "completed_at">[] | null) ?? [];
    let bestStreak = 0;
    let bestHabitName = "";
    for (const h of habitList) {
        // ponytail: cast note:null — computeStreak only reads completed_at
        const hLogs = logs
            .filter((l) => l.habit_id === h.id)
            .map((l) => ({ ...l, note: null }));
        const s = computeStreak(hLogs);
        if (s > bestStreak) { bestStreak = s; bestHabitName = h.name; }
    }

    // --- Finance widget ---
    const accountList = (accounts as Pick<Account, "id" | "balance">[] | null) ?? [];
    const netWorth = accountList.reduce((sum, a) => sum + (a.balance ?? 0), 0);

    // --- Goals widget ---
    const goalList = (goals as Pick<Goal, "id" | "title" | "target_amount" | "current_amount">[] | null) ?? [];
    const topGoal = goalList.length
        ? goalList.reduce((best, g) => {
            const pct = g.target_amount > 0 ? g.current_amount / g.target_amount : 0;
            const bestPct = best.target_amount > 0 ? best.current_amount / best.target_amount : 0;
            return pct > bestPct ? g : best;
        })
        : null;
    const goalPct = topGoal && topGoal.target_amount > 0
        ? Math.min(100, (topGoal.current_amount / topGoal.target_amount) * 100)
        : 0;

    return (
        <main className="space-y-6 py-12">
            <GlassPanel className="p-8">
                <h1 className="font-serif text-3xl font-bold italic text-zinc-50">Intelligence Summary</h1>
                <p className="mt-2 text-zinc-500 text-sm">Your day at a glance.</p>
            </GlassPanel>

            <div className="grid grid-cols-2 gap-4">
                {/* Widget 1 — Top Task */}
                <Link href="/dashboard/tasks">
                    <GlassCard className="p-5 hover:bg-white/[0.05] transition-colors h-full">
                        <p className="text-xs text-zinc-500 uppercase tracking-wide mb-2">Top Priority</p>
                        {topTask ? (
                            <>
                                <p className="text-zinc-50 font-medium leading-snug">{topTask.title}</p>
                                <div className="mt-3 flex items-center gap-2 flex-wrap">
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_COLORS[topTask.priority as 1 | 2 | 3 | 4]}`}>
                                        P{topTask.priority}
                                    </span>
                                    {topTask.due_date && (
                                        <span className={`text-xs ${isOverdue ? "text-rose-400" : "text-zinc-500"}`}>
                                            {isOverdue ? "Overdue" : topTask.due_date}
                                        </span>
                                    )}
                                </div>
                            </>
                        ) : (
                            <p className="text-zinc-50 font-medium">All caught up 🎉</p>
                        )}
                    </GlassCard>
                </Link>

                {/* Widget 2 — Best Streak */}
                <Link href="/dashboard/habits">
                    <GlassCard className="p-5 hover:bg-white/[0.05] transition-colors h-full">
                        <p className="text-xs text-zinc-500 uppercase tracking-wide mb-2">Best Streak</p>
                        {bestStreak > 0 ? (
                            <>
                                <p className="text-2xl font-bold text-amber-400">{bestStreak} days 🔥</p>
                                <p className="text-zinc-500 text-sm mt-1">{bestHabitName}</p>
                            </>
                        ) : (
                            <p className="text-zinc-500 font-medium">No habits yet</p>
                        )}
                    </GlassCard>
                </Link>

                {/* Widget 3 — Net Worth */}
                <Link href="/dashboard/finance">
                    <GlassCard className="p-5 hover:bg-white/[0.05] transition-colors h-full">
                        <p className="text-xs text-zinc-500 uppercase tracking-wide mb-2">Net Worth</p>
                        <p className="text-2xl font-bold text-green-400">
                            ${netWorth.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                        <p className="text-zinc-500 text-sm mt-1">
                            {accountList.length > 0
                                ? `Across ${accountList.length} account${accountList.length !== 1 ? "s" : ""}`
                                : "No accounts"}
                        </p>
                    </GlassCard>
                </Link>

                {/* Widget 4 — Top Goal */}
                <Link href="/dashboard/goals">
                    <GlassCard className="p-5 hover:bg-white/[0.05] transition-colors h-full">
                        <p className="text-xs text-zinc-500 uppercase tracking-wide mb-2">Top Goal</p>
                        {topGoal ? (
                            <>
                                <p className="text-zinc-50 font-medium leading-snug">{topGoal.title}</p>
                                <p className="text-violet-400 text-sm mt-1">{goalPct.toFixed(0)}% complete</p>
                                <div className="mt-2 h-1 w-full rounded-full bg-white/[0.08]">
                                    <div
                                        className="h-1 rounded-full bg-violet-500"
                                        style={{ width: `${goalPct}%` }}
                                    />
                                </div>
                            </>
                        ) : (
                            <p className="text-zinc-500 font-medium">No active goals</p>
                        )}
                    </GlassCard>
                </Link>
            </div>

            <GlassPanel className="p-6">
                <h2 className="text-zinc-50 font-medium mb-3">Quick Actions</h2>
                <div className="flex gap-3 flex-wrap">
                    {QUICK.map((q) => (
                        <Link
                            key={q.href}
                            href={q.href}
                            className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-zinc-50 backdrop-blur-xl hover:bg-white/[0.06] transition-colors"
                        >
                            {q.label}
                        </Link>
                    ))}
                </div>
            </GlassPanel>
        </main>
    );
}
