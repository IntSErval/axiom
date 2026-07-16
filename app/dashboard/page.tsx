import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase-server";
import { computeStreak } from "@/lib/streaks";
import { BentoHome, type BentoData, type BentoTask } from "@/components/dashboard/BentoHome";
import type { Habit, HabitLog, Account, Transaction, Goal } from "@/lib/database";

export default async function DashboardHomePage() {
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const uid = user.id;
    const todayStr = new Date().toISOString().slice(0, 10);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
    const ninetyDaysAgo = new Date(Date.now() - 90 * 864e5).toISOString();
    const sevenDaysAgo = new Date(Date.now() - 7 * 864e5);

    const [
        { data: taskRows },
        { data: habitRows },
        { data: accountRows },
        { data: txRows },
        { data: goalRows },
    ] = await Promise.all([
        supabase
            .from("tasks")
            .select("id,title,priority,status,due_date")
            .eq("user_id", uid)
            .neq("status", "done")
            .order("priority", { ascending: true })
            .limit(10),
        supabase.from("habits").select("id,name").eq("user_id", uid),
        supabase.from("accounts").select("id,balance").eq("user_id", uid),
        supabase
            .from("transactions")
            .select("id,description,category,amount,date")
            .eq("user_id", uid)
            .gte("date", thirtyDaysAgo)
            .order("date", { ascending: false })
            .limit(60),
        supabase
            .from("goals")
            .select("id,title,target_amount,current_amount,deadline")
            .eq("user_id", uid)
            .eq("status", "active"),
    ]);

    // --- Habits: streak, last-7-days ring fill, done today ---
    const habitList = (habitRows as Pick<Habit, "id" | "name">[] | null) ?? [];
    const habitIds = habitList.map((h) => h.id);
    const { data: logRows } = habitIds.length
        ? await supabase
            .from("habit_logs")
            .select("id,habit_id,completed_at")
            .in("habit_id", habitIds)
            .gte("completed_at", ninetyDaysAgo)
        : { data: [] };
    const logs = (logRows as Pick<HabitLog, "id" | "habit_id" | "completed_at">[] | null) ?? [];

    const habits = habitList.map((h) => {
        const hLogs = logs.filter((l) => l.habit_id === h.id);
        return {
            id: h.id,
            name: h.name,
            // ponytail: cast note:null — computeStreak only reads completed_at
            streak: computeStreak(hLogs.map((l) => ({ ...l, note: null }))),
            week: new Set(
                hLogs
                    .filter((l) => new Date(l.completed_at) >= sevenDaysAgo)
                    .map((l) => l.completed_at.slice(0, 10)),
            ).size,
            done: hLogs.some((l) => l.completed_at.slice(0, 10) === todayStr),
        };
    });

    // --- Finance: balance, month income/spending, cumulative sparkline ---
    const accounts = (accountRows as Pick<Account, "id" | "balance">[] | null) ?? [];
    const total = accounts.reduce((sum, a) => sum + (a.balance ?? 0), 0);
    const txs = (txRows as Pick<Transaction, "id" | "description" | "category" | "amount" | "date">[] | null) ?? [];
    const income = txs.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
    const spending = txs.filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);

    const byDay = new Map<string, number>();
    for (const t of txs) byDay.set(t.date, (byDay.get(t.date) ?? 0) + t.amount);
    let running = 0;
    const spark = [...byDay.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([, net]) => (running += net));

    // --- Goals ---
    const goals = ((goalRows as Pick<Goal, "id" | "title" | "target_amount" | "current_amount" | "deadline">[] | null) ?? []).map((g) => ({
        id: g.id,
        title: g.title,
        pct: g.target_amount > 0 ? Math.min(100, Math.round((g.current_amount / g.target_amount) * 100)) : 0,
        current: `$${g.current_amount.toLocaleString("en-US", { maximumFractionDigits: 0 })}`,
        target: `$${g.target_amount.toLocaleString("en-US", { maximumFractionDigits: 0 })}`,
        deadline: g.deadline,
    }));

    // --- Tasks + today's agenda ---
    const tasks = (taskRows as BentoTask[] | null) ?? [];
    const today = tasks.filter((t) => t.due_date && t.due_date <= todayStr);

    const data: BentoData = {
        finance: {
            total,
            income,
            spending,
            spark,
            transactions: txs.slice(0, 8).map((t) => ({ ...t, description: t.description ?? t.category })),
        },
        habits,
        goals,
        tasks,
        today,
    };

    return <BentoHome data={data} />;
}
