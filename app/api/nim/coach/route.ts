import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { getCoachResponse, type ChatMessage } from "@/lib/agents/coach-agent";

export async function POST(req: NextRequest) {
    try {
        const { messages } = await req.json() as { messages: ChatMessage[] };
        const supabase = await supabaseServer();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ reply: "Please sign in to chat with your coach." }, { status: 200 });

        const today = new Date().toISOString().slice(0, 10);
        const monthStart = today.slice(0, 7) + "-01";
        const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
        const fourteenDaysAgo = new Date(Date.now() - 14 * 86400000).toISOString();
        const txnSince = monthStart < thirtyDaysAgo ? monthStart : thirtyDaysAgo;

        const [{ data: tasks }, { data: habits }, { data: accounts }, { data: goals }, { data: transactions }, { data: budgets }] = await Promise.all([
            supabase.from("tasks").select("title,priority,status,due_date").eq("user_id", user.id).neq("status", "done").order("priority").limit(10),
            supabase.from("habits").select("id,name,streak").eq("user_id", user.id),
            supabase.from("accounts").select("name,balance").eq("user_id", user.id),
            supabase.from("goals").select("title,target_amount,current_amount,deadline").eq("user_id", user.id).eq("status", "active"),
            supabase.from("transactions").select("amount,category,date").eq("user_id", user.id).gte("date", txnSince),
            supabase.from("budgets").select("category,limit_amount").eq("user_id", user.id),
        ]);

        const openTasks = tasks ?? [];
        const overdue = openTasks.filter(t => t.due_date && t.due_date < today).length;

        let habitSummary = "No habits tracked";
        if (habits && habits.length > 0) {
            const { data: logs } = await supabase
                .from("habit_logs").select("habit_id")
                .in("habit_id", habits.map(h => h.id))
                .gte("completed_at", fourteenDaysAgo);
            const counts: Record<string, number> = {};
            for (const log of logs ?? []) counts[log.habit_id] = (counts[log.habit_id] ?? 0) + 1;
            habitSummary = habits.map(h => `${h.name}: ${counts[h.id] ?? 0}/14 days, streak ${h.streak}`).join("; ");
        }

        const accountSummary = (accounts ?? []).length > 0
            ? (accounts ?? []).map(a => `${a.name} $${a.balance.toFixed(2)}`).join(", ")
            : "No accounts";

        // Expenses are stored negative; only sum those, keyed by category
        const spend30: Record<string, number> = {};
        const spendMTD: Record<string, number> = {};
        for (const tx of transactions ?? []) {
            if (tx.amount >= 0 || !tx.category) continue;
            const amt = Math.abs(tx.amount);
            if (tx.date >= thirtyDaysAgo) spend30[tx.category] = (spend30[tx.category] ?? 0) + amt;
            if (tx.date >= monthStart) spendMTD[tx.category] = (spendMTD[tx.category] ?? 0) + amt;
        }
        const spendSummary = Object.keys(spend30).length > 0
            ? Object.entries(spend30).map(([cat, amt]) => `${cat}: $${amt.toFixed(2)}`).join(", ")
            : "No spending recorded";

        const budgetSummary = (budgets ?? []).length > 0
            ? (budgets ?? []).map(b => `${b.category}: $${(spendMTD[b.category] ?? 0).toFixed(2)}/$${b.limit_amount.toFixed(2)} MTD`).join(", ")
            : "No budgets set";

        const goalSummary = (goals ?? []).length > 0
            ? (goals ?? []).map(g => {
                const pct = g.target_amount > 0 ? Math.round((g.current_amount / g.target_amount) * 100) : 0;
                const days = g.deadline ? Math.ceil((new Date(g.deadline).getTime() - Date.now()) / 86400000) : null;
                return `${g.title}: ${pct}% ($${g.current_amount}/$${g.target_amount})${days !== null ? `, ${days}d left` : ""}`;
            }).join("; ")
            : "No active goals";

        const context = [
            `Open tasks: ${JSON.stringify(openTasks)} (${overdue} overdue vs today)`,
            `Habits (last 14 days): ${habitSummary}`,
            `Accounts: ${accountSummary}`,
            `Spending last 30 days: ${spendSummary}`,
            `Budgets (month-to-date): ${budgetSummary}`,
            `Active goals: ${goalSummary}`,
        ].join("\n");

        const reply = await getCoachResponse(messages ?? [], context);
        return NextResponse.json({ reply });
    } catch {
        return NextResponse.json({ reply: "I'm having trouble connecting right now — try again in a moment." }, { status: 200 });
    }
}
