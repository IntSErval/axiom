"use client";
import { useState } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassModal } from "@/components/ui/GlassModal";
import { DeleteIcon } from "@/components/ui/icons";
import { createTransaction, createAccount, deleteTransaction } from "@/app/dashboard/finance/actions";
import type { Account, Transaction, Budget } from "@/lib/database";

function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function FinanceDashboard({ accounts, transactions: initialTxns, budgets }: {
    accounts: Account[]; transactions: Transaction[]; budgets: Budget[];
}) {
    const TODAY = new Date().toISOString().slice(0, 10);
    const [txns, setTxns] = useState(initialTxns);
    const [txnOpen, setTxnOpen] = useState(false);
    const [accOpen, setAccOpen] = useState(false);

    const spendByCategory = (category: string) =>
        txns.filter((t) => t.category === category && t.amount < 0)
            .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const sorted = [...txns].sort((a, b) => b.date.localeCompare(a.date));

    async function handleDeleteTxn(id: string) {
        if (!window.confirm("Delete this transaction?")) return;
        const prev = txns;
        setTxns((curr) => curr.filter((t) => t.id !== id)); // ponytail: optimistic, rolls back on error
        try { await deleteTransaction(id); }
        catch { setTxns(prev); }
    }

    return (
        <div className="max-w-2xl mx-auto py-8 space-y-8">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold italic text-zinc-50">Finance</h1>
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={() => setAccOpen(true)}
                        className="px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition-colors"
                    >
                        + Add Account
                    </button>
                    <button
                        type="button"
                        onClick={() => setTxnOpen(true)}
                        className="px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition-colors"
                    >
                        + Add Transaction
                    </button>
                </div>
            </div>

            {/* Accounts */}
            <div className="grid grid-cols-2 gap-4">
                {accounts.map((acc) => (
                    <GlassCard key={acc.id} className="p-4">
                        <p className="text-sm text-zinc-500">{acc.name}</p>
                        <p className="text-xl font-bold text-zinc-50">${acc.balance.toLocaleString()}</p>
                        <p className="text-xs text-zinc-500 mt-1 capitalize">{acc.type}</p>
                    </GlassCard>
                ))}
            </div>

            {/* Transactions */}
            <div className="space-y-3">
                <h2 className="text-lg font-bold text-zinc-50">Recent Transactions</h2>
                {sorted.length === 0 ? (
                    <p className="italic text-zinc-500 text-sm">No transactions this month</p>
                ) : (
                    <div className="space-y-1">
                        {sorted.map((t) => (
                            <GlassCard key={t.id} className="px-4 py-3 flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="text-sm text-zinc-50 truncate">{t.description || t.category}</p>
                                    <p className="text-xs text-zinc-500">{t.category} · {fmtDate(t.date)}</p>
                                </div>
                                <div className="flex items-center gap-3 shrink-0">
                                    <span className={`text-sm font-semibold tabular-nums ${t.amount >= 0 ? "text-green-400" : "text-rose-400"}`}>
                                        {t.amount >= 0 ? "+" : ""}${Math.abs(t.amount).toFixed(2)}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => handleDeleteTxn(t.id)}
                                        className="text-zinc-600 hover:text-rose-400 transition-colors"
                                        aria-label="Delete transaction"
                                    >
                                        <DeleteIcon />
                                    </button>
                                </div>
                            </GlassCard>
                        ))}
                    </div>
                )}
            </div>

            {/* Budgets */}
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
                                <div className={`h-full rounded-full ${over ? "bg-amber-500" : "bg-blue-500"}`} style={{ width: `${pct}%` }} />
                            </div>
                        </GlassCard>
                    );
                })}
            </div>

            {/* Add Transaction Modal */}
            <GlassModal open={txnOpen} onOpenChange={setTxnOpen} title="Add Transaction">
                <form action={async (fd) => { try { await createTransaction(fd); setTxnOpen(false); } catch (e) { alert((e as Error).message); } }} className="space-y-4 mt-2">
                    <div>
                        <label htmlFor="txn-description" className="block text-xs text-zinc-500 mb-1">Description (optional)</label>
                        <input
                            id="txn-description"
                            name="description"
                            type="text"
                            placeholder="e.g. Coffee"
                            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-zinc-50 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label htmlFor="txn-amount" className="block text-xs text-zinc-500 mb-1">Amount <span className="text-zinc-600">(negative = expense)</span></label>
                        <input
                            id="txn-amount"
                            name="amount"
                            type="number"
                            step="0.01"
                            required
                            placeholder="-25.00"
                            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-zinc-50 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label htmlFor="txn-category" className="block text-xs text-zinc-500 mb-1">Category</label>
                        <input
                            id="txn-category"
                            name="category"
                            type="text"
                            required
                            placeholder="e.g. Food"
                            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-zinc-50 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label htmlFor="txn-account" className="block text-xs text-zinc-500 mb-1">Account</label>
                        <select
                            id="txn-account"
                            name="account_id"
                            required
                            className="w-full appearance-none bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-zinc-50 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                            <option value="" disabled>Select account</option>
                            {accounts.map((a) => (
                                <option key={a.id} value={a.id} className="bg-zinc-900">{a.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="txn-date" className="block text-xs text-zinc-500 mb-1">Date</label>
                        <input
                            id="txn-date"
                            name="date"
                            type="date"
                            required
                            defaultValue={TODAY}
                            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-zinc-50 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-sm font-semibold text-white transition-colors"
                    >
                        Add Transaction
                    </button>
                </form>
            </GlassModal>

            {/* Add Account Modal */}
            <GlassModal open={accOpen} onOpenChange={setAccOpen} title="Add Account">
                <form action={async (fd) => { try { await createAccount(fd); setAccOpen(false); } catch (e) { alert((e as Error).message); } }} className="space-y-4 mt-2">
                    <div>
                        <label htmlFor="acc-name" className="block text-xs text-zinc-500 mb-1">Account Name</label>
                        <input
                            id="acc-name"
                            name="name"
                            type="text"
                            required
                            placeholder="e.g. Chase Checking"
                            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-zinc-50 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label htmlFor="acc-type" className="block text-xs text-zinc-500 mb-1">Type</label>
                        <select
                            id="acc-type"
                            name="type"
                            required
                            className="w-full appearance-none bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-zinc-50 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                            <option value="checking" className="bg-zinc-900">Checking</option>
                            <option value="savings" className="bg-zinc-900">Savings</option>
                            <option value="investment" className="bg-zinc-900">Investment</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="acc-balance" className="block text-xs text-zinc-500 mb-1">Initial Balance</label>
                        <input
                            id="acc-balance"
                            name="balance"
                            type="number"
                            step="0.01"
                            defaultValue="0"
                            placeholder="0.00"
                            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-zinc-50 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-sm font-semibold text-white transition-colors"
                    >
                        Add Account
                    </button>
                </form>
            </GlassModal>
        </div>
    );
}
