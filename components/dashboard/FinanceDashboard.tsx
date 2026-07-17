"use client";
import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { motion } from "framer-motion";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassModal } from "@/components/ui/GlassModal";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { WheelSelect, WheelDatePicker } from "@/components/ui/WheelDatePicker";
import { DeleteIcon, EditIcon } from "@/components/ui/icons";
import {
    createTransaction, deleteTransaction,
    createAccount, updateAccount, deleteAccount,
    createBudget, updateBudget, deleteBudget,
} from "@/app/dashboard/finance/actions";
import type { Account, AccountType, Transaction, Budget } from "@/lib/database";

const INPUT = "w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-zinc-50 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-blue-500";
const LABEL = "block text-xs text-zinc-500 mb-1";
const HEADER_BTN = "px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition-colors";
const CUSTOM = "__custom__";

const ACCOUNT_TYPE_OPTIONS = [
    { value: "checking", label: "Checking" },
    { value: "savings", label: "Savings" },
    { value: "investment", label: "Investment" },
];

function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/* Disables itself while the server action runs — fixes double-click duplicate inserts */
function SubmitButton({ children }: { children: React.ReactNode }) {
    const { pending } = useFormStatus();
    return (
        <button
            type="submit"
            disabled={pending}
            className="w-full py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-sm font-semibold text-white transition-colors disabled:opacity-50 disabled:pointer-events-none"
        >
            {pending ? "Saving…" : children}
        </button>
    );
}

/* ---------- Liquid envelope ---------- */

const BODY_TOP = 24;
const BODY_BOTTOM = 82;
const BODY_H = BODY_BOTTOM - BODY_TOP;

// Sine-ish wave, period 40, spanning wider than the envelope so a 40px drift loops seamlessly
const WAVE_D = (() => {
    let d = "M-160 0";
    for (let x = -160; x < 280; x += 40) d += ` Q ${x + 10} -5 ${x + 20} 0 T ${x + 40} 0`;
    return d + " V 70 H -160 Z";
})();

function Envelope({ id, spent, limit }: { id: string; spent: number; limit: number }) {
    const pct = limit > 0 ? Math.min(1, spent / limit) : 0;
    const over = spent > limit;
    const color = over ? "#f2a5c0" : "#8da6ff";
    const surfaceY = BODY_BOTTOM - BODY_H * pct;
    return (
        <svg viewBox="0 0 120 88" className="w-full" role="img" aria-label={`$${spent.toFixed(0)} of $${limit} spent`}>
            <defs>
                <clipPath id={`env-${id}`}>
                    <rect x="4" y={BODY_TOP} width="112" height={BODY_H} rx="8" />
                </clipPath>
            </defs>
            <g clipPath={`url(#env-${id})`}>
                <motion.g initial={{ y: BODY_BOTTOM }} animate={{ y: surfaceY }} transition={{ type: "spring", stiffness: 55, damping: 16 }}>
                    <path className="liquid-wave" d={WAVE_D} fill={color} opacity="0.3" />
                    <g transform="translate(0 2)">
                        <path className="liquid-wave-2" d={WAVE_D} fill={color} opacity="0.5" />
                    </g>
                </motion.g>
            </g>
            <rect x="4" y={BODY_TOP} width="112" height={BODY_H} rx="8" fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="1.5" />
            <path
                d={`M6 ${BODY_TOP + 4} L60 ${BODY_TOP + 32} L114 ${BODY_TOP + 4}`}
                fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round"
            />
            <text x="60" y="68" textAnchor="middle" fontSize="10" fontWeight="600" fill="rgba(255,255,255,0.92)">
                {`$${spent.toFixed(0)} / $${limit.toLocaleString()}`}
            </text>
        </svg>
    );
}

/* ---------- Forms ---------- */

function AccountForm({ account, onDone }: { account: Account | null; onDone: () => void }) {
    const [err, setErr] = useState<string | null>(null);
    const [type, setType] = useState<AccountType>(account?.type ?? "checking");
    return (
        <form
            action={async (fd) => {
                setErr(null);
                try {
                    if (account) await updateAccount(account.id, fd);
                    else await createAccount(fd);
                    onDone();
                } catch (e) { setErr((e as Error).message); }
            }}
            className="space-y-4 mt-2"
        >
            <div>
                <label htmlFor="acc-name" className={LABEL}>Account Name</label>
                <input id="acc-name" name="name" type="text" required defaultValue={account?.name} placeholder="e.g. Chase Checking" className={INPUT} />
            </div>
            <div>
                <span className={LABEL}>Type</span>
                <input type="hidden" name="type" value={type} />
                <WheelSelect options={ACCOUNT_TYPE_OPTIONS} value={type} onChange={(v) => setType(v as AccountType)} />
            </div>
            <div>
                <label htmlFor="acc-balance" className={LABEL}>{account ? "Balance" : "Initial Balance"}</label>
                <input id="acc-balance" name="balance" type="number" step="0.01" defaultValue={account?.balance ?? 0} placeholder="0.00" className={INPUT} />
            </div>
            {err && <p className="text-xs text-rose-400">{err}</p>}
            <SubmitButton>{account ? "Save Changes" : "Add Account"}</SubmitButton>
        </form>
    );
}

function TxnForm({ accounts, budgets, onDone }: { accounts: Account[]; budgets: Budget[]; onDone: () => void }) {
    const [err, setErr] = useState<string | null>(null);
    const [kind, setKind] = useState<"expense" | "income">("expense");
    const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
    const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
    const [cat, setCat] = useState(budgets[0]?.category ?? CUSTOM);
    const catOptions = [
        ...budgets.map((b) => ({ value: b.category, label: b.category })),
        { value: CUSTOM, label: "Custom…" },
    ];

    if (accounts.length === 0) {
        return <p className="text-sm text-zinc-500 italic mt-2">Create an account first — transactions need one to draw from.</p>;
    }

    return (
        <form
            action={async (fd) => {
                setErr(null);
                try { await createTransaction(fd); onDone(); }
                catch (e) { setErr((e as Error).message); }
            }}
            className="space-y-4 mt-2"
        >
            <div>
                <label htmlFor="txn-description" className={LABEL}>Description (optional)</label>
                <input id="txn-description" name="description" type="text" placeholder="e.g. Coffee" className={INPUT} />
            </div>
            <div>
                <span className={LABEL}>Type</span>
                <input type="hidden" name="kind" value={kind} />
                <div className="grid grid-cols-2 gap-2">
                    <button
                        type="button"
                        onClick={() => setKind("expense")}
                        className={`py-2 rounded-lg text-sm font-medium border transition-colors ${
                            kind === "expense"
                                ? "bg-rose-500/15 text-rose-400 border-rose-500/30"
                                : "bg-white/[0.04] text-zinc-500 border-white/[0.08] hover:text-zinc-300"
                        }`}
                    >
                        − Expense
                    </button>
                    <button
                        type="button"
                        onClick={() => setKind("income")}
                        className={`py-2 rounded-lg text-sm font-medium border transition-colors ${
                            kind === "income"
                                ? "bg-green-500/15 text-green-400 border-green-500/30"
                                : "bg-white/[0.04] text-zinc-500 border-white/[0.08] hover:text-zinc-300"
                        }`}
                    >
                        + Income
                    </button>
                </div>
            </div>
            <div>
                <label htmlFor="txn-amount" className={LABEL}>Amount</label>
                <input id="txn-amount" name="amount" type="number" step="0.01" min="0" required placeholder="25.00" className={INPUT} />
            </div>
            <div>
                <span className={LABEL}>Category</span>
                <WheelSelect options={catOptions} value={cat} onChange={setCat} />
                {/* Distinct keys: without them React reuses the input node and warns about a controlled input turning uncontrolled */}
                {cat === CUSTOM ? (
                    <input key="cat-custom" name="category" type="text" required placeholder="e.g. Food" className={`${INPUT} mt-2`} />
                ) : (
                    <input key="cat-fixed" type="hidden" name="category" value={cat} />
                )}
            </div>
            <div>
                <span className={LABEL}>Account</span>
                <input type="hidden" name="account_id" value={accountId} />
                <WheelSelect options={accounts.map((a) => ({ value: a.id, label: a.name }))} value={accountId} onChange={setAccountId} />
            </div>
            <div>
                <span className={LABEL}>Date</span>
                <input type="hidden" name="date" value={date} />
                <WheelDatePicker value={date} onChange={setDate} placeholder="Pick a date" />
            </div>
            {err && <p className="text-xs text-rose-400">{err}</p>}
            <SubmitButton>Add Transaction</SubmitButton>
        </form>
    );
}

function BudgetForm({ budget, onDone }: { budget: Budget | null; onDone: () => void }) {
    const [err, setErr] = useState<string | null>(null);
    return (
        <form
            action={async (fd) => {
                setErr(null);
                try {
                    if (budget) await updateBudget(budget.id, fd);
                    else await createBudget(fd);
                    onDone();
                } catch (e) { setErr((e as Error).message); }
            }}
            className="space-y-4 mt-2"
        >
            <div>
                <label htmlFor="budget-category" className={LABEL}>Category Name</label>
                <input id="budget-category" name="category" type="text" required defaultValue={budget?.category} placeholder="e.g. Food" className={INPUT} />
            </div>
            <div>
                <label htmlFor="budget-limit" className={LABEL}>Fund Limit <span className="text-zinc-600">(envelope is full at this amount)</span></label>
                <input id="budget-limit" name="limit_amount" type="number" step="0.01" min="0" required defaultValue={budget?.limit_amount} placeholder="500.00" className={INPUT} />
            </div>
            {err && <p className="text-xs text-rose-400">{err}</p>}
            <SubmitButton>{budget ? "Save Changes" : "Create Category"}</SubmitButton>
        </form>
    );
}

/* ---------- Dashboard ---------- */

type DeleteTarget = { kind: "transaction" | "account" | "category"; id: string; name: string };

export function FinanceDashboard({ accounts, transactions, budgets }: {
    accounts: Account[]; transactions: Transaction[]; budgets: Budget[];
}) {
    const [txnOpen, setTxnOpen] = useState(false);
    const [accModal, setAccModal] = useState<Account | "new" | null>(null);
    const [budgetModal, setBudgetModal] = useState<Budget | "new" | null>(null);
    const [confirmDel, setConfirmDel] = useState<DeleteTarget | null>(null);
    const [delErr, setDelErr] = useState<string | null>(null);
    const [insight, setInsight] = useState<string | null>(null);

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
        fetch("/api/nim/finance-agent", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ accounts, transactions, budgets }),
        })
            .then(r => r.json())
            .then(d => setInsight(d.insight ?? null))
            .catch(() => {}); // silently fail — AI is non-critical
    }, []);

    const spendByCategory = (category: string) =>
        transactions.filter((t) => t.category === category && t.amount < 0)
            .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const sorted = [...transactions].sort((a, b) => b.date.localeCompare(a.date));

    const DEL_MESSAGES: Record<DeleteTarget["kind"], string> = {
        transaction: `"${confirmDel?.name}" will be deleted and its amount returned to the account balance.`,
        account: `"${confirmDel?.name}" and all of its transactions will be deleted. This can't be undone.`,
        category: `The "${confirmDel?.name}" envelope will be deleted. Existing transactions keep their category label.`,
    };

    return (
        <div className="max-w-2xl mx-auto py-8 space-y-8">
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <h1 className="text-2xl font-bold italic text-zinc-50">Finance</h1>
                <div className="flex gap-2">
                    <button type="button" onClick={() => setAccModal("new")} className={HEADER_BTN}>+ Add Account</button>
                    <button type="button" onClick={() => setTxnOpen(true)} className={HEADER_BTN}>+ Add Transaction</button>
                </div>
            </div>
            {insight && (
                <div className="mt-3 flex items-center gap-2 text-sm">
                    <span className="px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 italic">
                        ✦ {insight}
                    </span>
                </div>
            )}
            {delErr && <p className="text-xs text-rose-400">{delErr}</p>}

            {/* Accounts */}
            <div className="grid grid-cols-2 gap-4">
                {accounts.length === 0 && (
                    <p className="col-span-2 italic text-zinc-500 text-sm">No accounts yet — add one to start tracking.</p>
                )}
                {accounts.map((acc) => (
                    <GlassCard key={acc.id} className="p-4 relative">
                        <div className="absolute right-3 top-3 flex gap-2">
                            <button
                                type="button"
                                onClick={() => setAccModal(acc)}
                                className="text-zinc-600 hover:text-zinc-300 transition-colors"
                                aria-label={`Edit ${acc.name}`}
                            >
                                <EditIcon />
                            </button>
                            <button
                                type="button"
                                onClick={() => { setDelErr(null); setConfirmDel({ kind: "account", id: acc.id, name: acc.name }); }}
                                className="text-zinc-600 hover:text-rose-400 transition-colors"
                                aria-label={`Delete ${acc.name}`}
                            >
                                <DeleteIcon />
                            </button>
                        </div>
                        <p className="text-sm text-zinc-500 pr-14 truncate">{acc.name}</p>
                        <p className="text-xl font-bold text-zinc-50">${acc.balance.toLocaleString()}</p>
                        <p className="text-xs text-zinc-500 mt-1 capitalize">{acc.type}</p>
                    </GlassCard>
                ))}
            </div>

            {/* Budget category envelopes */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-zinc-50">Categories</h2>
                    <button type="button" onClick={() => setBudgetModal("new")} className={HEADER_BTN}>+ Add Category</button>
                </div>
                {budgets.length === 0 ? (
                    <p className="italic text-zinc-500 text-sm">No categories yet — create an envelope to start budgeting.</p>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {budgets.map((b) => {
                            const spent = spendByCategory(b.category);
                            const over = spent > b.limit_amount;
                            const pct = b.limit_amount > 0 ? Math.round((spent / b.limit_amount) * 100) : 0;
                            return (
                                <GlassCard key={b.id} className="p-4">
                                    <div className="flex items-start justify-between gap-2">
                                        <p className="text-sm text-zinc-50 truncate">{b.category}</p>
                                        <div className="flex gap-2 shrink-0">
                                            <button
                                                type="button"
                                                onClick={() => setBudgetModal(b)}
                                                className="text-zinc-600 hover:text-zinc-300 transition-colors"
                                                aria-label={`Edit ${b.category} category`}
                                            >
                                                <EditIcon />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => { setDelErr(null); setConfirmDel({ kind: "category", id: b.id, name: b.category }); }}
                                                className="text-zinc-600 hover:text-rose-400 transition-colors"
                                                aria-label={`Delete ${b.category} category`}
                                            >
                                                <DeleteIcon />
                                            </button>
                                        </div>
                                    </div>
                                    <Envelope id={b.id} spent={spent} limit={b.limit_amount} />
                                    <div className="flex justify-between text-xs mt-1">
                                        <span className={over ? "text-amber-400" : "text-zinc-500"}>
                                            {over ? `over by $${(spent - b.limit_amount).toFixed(0)}` : `${pct}% full`}
                                        </span>
                                        <span className="text-zinc-500">limit ${b.limit_amount.toLocaleString()}</span>
                                    </div>
                                </GlassCard>
                            );
                        })}
                    </div>
                )}
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
                                        onClick={() => { setDelErr(null); setConfirmDel({ kind: "transaction", id: t.id, name: t.description || t.category }); }}
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

            {/* Add Transaction */}
            <GlassModal open={txnOpen} onOpenChange={setTxnOpen} title="Add Transaction">
                <TxnForm accounts={accounts} budgets={budgets} onDone={() => setTxnOpen(false)} />
            </GlassModal>

            {/* Add / Edit Account */}
            <GlassModal
                open={accModal !== null}
                onOpenChange={(v) => !v && setAccModal(null)}
                title={accModal === "new" ? "Add Account" : "Edit Account"}
            >
                <AccountForm
                    key={accModal === "new" ? "new" : accModal?.id}
                    account={accModal === "new" ? null : accModal}
                    onDone={() => setAccModal(null)}
                />
            </GlassModal>

            {/* Add / Edit Category */}
            <GlassModal
                open={budgetModal !== null}
                onOpenChange={(v) => !v && setBudgetModal(null)}
                title={budgetModal === "new" ? "New Category" : "Edit Category"}
            >
                <BudgetForm
                    key={budgetModal === "new" ? "new" : budgetModal?.id}
                    budget={budgetModal === "new" ? null : budgetModal}
                    onDone={() => setBudgetModal(null)}
                />
            </GlassModal>

            {/* Delete confirmation (replaces browser confirm dialogs) */}
            <ConfirmModal
                open={confirmDel !== null}
                onOpenChange={(v) => !v && setConfirmDel(null)}
                title={confirmDel ? `Delete ${confirmDel.kind}?` : "Delete?"}
                message={confirmDel ? DEL_MESSAGES[confirmDel.kind] : ""}
                onConfirm={async () => {
                    if (!confirmDel) return;
                    try {
                        if (confirmDel.kind === "transaction") await deleteTransaction(confirmDel.id);
                        else if (confirmDel.kind === "account") await deleteAccount(confirmDel.id);
                        else await deleteBudget(confirmDel.id);
                    } catch (e) {
                        setDelErr((e as Error).message);
                    }
                }}
            />
        </div>
    );
}
