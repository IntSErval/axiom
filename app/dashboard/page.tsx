import { redirect } from "next/navigation";
import { supabaseUser } from "@/lib/supabase-server";
import { computeStreak } from "@/lib/streaks";
import { BentoHome, type BentoData, type BentoTask } from "@/components/dashboard/BentoHome";
import type { Habit, HabitLog, Account, Transaction, Goal } from "@/lib/database";

export default async function DashboardHomePage() {
    const { supabase, user } = await supabaseUser();
    if (!user) redirect("/login");

    const uid = user.id;
    const todayStr = new Date().toISOString().slice(0, 10);
    const monthStr = todayStr.slice(0, 7);
    const halfYearAgo = new Date(Date.now() - 190 * 864e5).toISOString().slice(0, 10);
    const ninetyDaysAgo = new Date(Date.now() - 90 * 864e5).toISOString();

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
            // keep done tasks visible (crossed out) — sorted last: todo > in_progress > done
            .order("status", { ascending: false })
            .order("priority", { ascending: true })
            .limit(10),
        supabase.from("habits").select("id,name").eq("user_id", uid),
        supabase.from("accounts").select("id,balance").eq("user_id", uid),
        supabase
            .from("transactions")
            .select("id,description,category,amount,date")
            .eq("user_id", uid)
            .gte("date", halfYearAgo)
            .order("date", { ascending: false })
            .limit(400),
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
            done: hLogs.some((l) => l.completed_at.slice(0, 10) === todayStr),
        };
    });

    // 12-week completion heatmap: total habit logs per day, oldest → today (84 cells)
    const heatCounts = new Map<string, number>();
    for (const l of logs) {
        const d = l.completed_at.slice(0, 10);
        heatCounts.set(d, (heatCounts.get(d) ?? 0) + 1);
    }
    const heat: number[] = [];
    for (let i = 83; i >= 0; i--) {
        const d = new Date(Date.now() - i * 864e5).toISOString().slice(0, 10);
        heat.push(heatCounts.get(d) ?? 0);
    }

    // --- Finance: balance, month income/spending, cumulative sparkline ---
    const accounts = (accountRows as Pick<Account, "id" | "balance">[] | null) ?? [];
    const total = accounts.reduce((sum, a) => sum + (a.balance ?? 0), 0);
    const txs = (txRows as Pick<Transaction, "id" | "description" | "category" | "amount" | "date">[] | null) ?? [];
    // This month's income / spending
    const monthTx = txs.filter((t) => t.date.slice(0, 7) === monthStr);
    const income = monthTx.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
    const spending = monthTx.filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);

    // Last 6 calendar months of income vs spending, oldest → newest
    const bucket = new Map<string, { income: number; spending: number }>();
    for (const t of txs) {
        const k = t.date.slice(0, 7);
        const b = bucket.get(k) ?? { income: 0, spending: 0 };
        if (t.amount > 0) b.income += t.amount;
        else b.spending += Math.abs(t.amount);
        bucket.set(k, b);
    }
    const bars = Array.from({ length: 6 }, (_, i) => {
        const d = new Date();
        d.setDate(1);
        d.setMonth(d.getMonth() - (5 - i));
        const k = d.toISOString().slice(0, 7);
        const b = bucket.get(k) ?? { income: 0, spending: 0 };
        return { month: d.toLocaleDateString("en-US", { month: "short" }), income: b.income, spending: b.spending };
    });

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
            bars,
            transactions: txs.slice(0, 8).map((t) => ({ ...t, description: t.description ?? t.category })),
        },
        habits,
        heat,
        goals,
        tasks,
        today,
    };

    return <BentoHome data={data} />;
}
