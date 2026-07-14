import { callNim } from "@/lib/nim";
import type { Account, Transaction, Budget } from "@/lib/database";

const MODEL = "meta/llama-3.1-70b-instruct";

export async function getFinanceInsight(
    accounts: Account[],
    transactions: Transaction[],
    budgets: Budget[]
): Promise<string> {
    if (accounts.length === 0) return "Add an account to get financial insights.";

    const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0);

    const thisMonth = new Date().toISOString().slice(0, 7); // "YYYY-MM"
    const recentTxns = [...transactions]
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 50);

    const spendByCategory: Record<string, number> = {};
    for (const t of recentTxns) {
        if (t.amount < 0 && t.date.startsWith(thisMonth)) {
            spendByCategory[t.category] = (spendByCategory[t.category] ?? 0) + Math.abs(t.amount);
        }
    }

    const budgetLines = budgets.map((b) => {
        const spent = spendByCategory[b.category] ?? 0;
        const pct = b.limit_amount > 0 ? Math.round((spent / b.limit_amount) * 100) : 0;
        return `${b.category}: $${spent.toFixed(0)} / $${b.limit_amount} (${pct}%)`;
    });

    const summary = [
        `Total balance: $${totalBalance.toLocaleString()}`,
        `Month: ${thisMonth}`,
        budgetLines.length > 0 ? `Budget utilization:\n${budgetLines.join("\n")}` : "No budgets set.",
        Object.keys(spendByCategory).length > 0
            ? `Spending by category:\n${Object.entries(spendByCategory).map(([k, v]) => `${k}: $${v.toFixed(0)}`).join("\n")}`
            : "No expenses this month.",
    ].join("\n\n");

    const result = await callNim(MODEL, [
        {
            role: "system",
            content: "You are a financial analyst. Given a financial summary, return ONE insight — a savings rate observation OR a spending anomaly if something stands out (max 25 words). No preamble, no markdown, just the insight.",
        },
        {
            role: "user",
            content: summary,
        },
    ]);

    return result?.choices?.[0]?.message?.content?.trim() ?? "Track your spending to unlock financial insights.";
}
