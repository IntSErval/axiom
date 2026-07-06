"use client";
import { GlassCard } from "@/components/ui/GlassCard";
import type { Account, Transaction, Budget } from "@/lib/database";

export function FinanceDashboard({ accounts, transactions, budgets }: {
    accounts: Account[]; transactions: Transaction[]; budgets: Budget[];
}) {
    const spendByCategory = (category: string) =>
        transactions.filter((t) => t.category === category && t.amount < 0)
            .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    return (
        <div className="max-w-2xl mx-auto py-8 space-y-8">
            <h1 className="text-2xl font-bold italic text-zinc-50">Finance</h1>

            <div className="grid grid-cols-2 gap-4">
                {accounts.map((acc) => (
                    <GlassCard key={acc.id} className="p-4">
                        <p className="text-sm text-zinc-500">{acc.name}</p>
                        <p className="text-xl font-bold text-zinc-50">${acc.balance.toLocaleString()}</p>
                    </GlassCard>
                ))}
            </div>

            <div className="space-y-3">
                <h2 className="text-lg font-bold text-zinc-50">Budgets</h2>
                {budgets.map((b) => {
                    const spent = spendByCategory(b.category);
                    const pct = Math.min(100, (spent / b.limit_amount) * 100);
                    const over = spent > b.limit_amount;
                    return (
                        <GlassCard key={b.id} className="p-4">
                            <div className="flex justify-between text-sm mb-2">
                                <span className="text-zinc-50">{b.category}</span>
                                <span className={over ? "text-amber-400" : "text-zinc-500"}>
                                    ${spent.toFixed(0)} / ${b.limit_amount}
                                </span>
                            </div>
                            <div className="h-2 rounded-full bg-white/[0.05] overflow-hidden">
                                <div
                                    className={`h-full rounded-full ${over ? "bg-amber-500" : "bg-blue-500"}`}
                                    style={{ width: `${pct}%` }}
                                />
                            </div>
                        </GlassCard>
                    );
                })}
            </div>
        </div>
    );
}