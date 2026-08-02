"use client";
import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
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

const INPUT = "w-full neu-inset rounded-[12px] border-none px-3 py-2.5 text-sm text-[#d3d7e0] placeholder:text-[#5c6270] outline-none";
const LABEL = "block text-xs text-[#868da0] mb-1";
const HEADER_BTN = "neu-btn px-4 py-2 rounded-[13px] text-sm font-semibold text-[#6fd6c3]";
const CARD_HOVER =
    "transition-[transform,box-shadow] duration-200 [transition-timing-function:cubic-bezier(0.23,1,0.32,1)] " +
    "hover:-translate-y-[2px] hover:[box-shadow:-10px_-10px_24px_rgba(255,255,255,0.055),13px_13px_30px_rgba(0,0,0,0.62)]";
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
            className="neu-btn w-full py-2.5 rounded-[14px] text-sm font-semibold text-[#6fd6c3] disabled:opacity-50 disabled:pointer-events-none"
        >
            {pending ? "Saving…" : children}
        </button>
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
            {err && <p className="text-xs text-[#f2a86f]">{err}</p>}
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
        return <p className="text-sm text-[#868da0] italic mt-2">Create an account first — transactions need one to draw from.</p>;
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
                        className={`neu-btn py-2 rounded-[13px] text-sm font-semibold ${
                            kind === "expense"
                                ? "text-[#f2a86f] [box-shadow:inset_3px_3px_7px_rgba(0,0,0,0.5),inset_-3px_-3px_7px_rgba(255,255,255,0.035)]"
                                : "text-[#868da0] hover:text-[#d3d7e0]"
                        }`}
                    >
                        − Expense
                    </button>
                    <button
                        type="button"
                        onClick={() => setKind("income")}
                        className={`neu-btn py-2 rounded-[13px] text-sm font-semibold ${
                            kind === "income"
                                ? "text-[#6fd6c3] [box-shadow:inset_3px_3px_7px_rgba(0,0,0,0.5),inset_-3px_-3px_7px_rgba(255,255,255,0.035)]"
                                : "text-[#868da0] hover:text-[#d3d7e0]"
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
            {err && <p className="text-xs text-[#f2a86f]">{err}</p>}
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
                <label htmlFor="budget-limit" className={LABEL}>Fund Limit <span className="text-[#5c6270]">(envelope is full at this amount)</span></label>
                <input id="budget-limit" name="limit_amount" type="number" step="0.01" min="0" required defaultValue={budget?.limit_amount} placeholder="500.00" className={INPUT} />
            </div>
            {err && <p className="text-xs text-[#f2a86f]">{err}</p>}
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
        <div className="flex flex-col gap-6 py-8 [animation:paneIn_320ms_cubic-bezier(0.23,1,0.32,1)_both]">
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <h1 className="text-[25px] font-semibold tracking-[-0.01em] text-[#eceef3]">Finance</h1>
                <div className="flex gap-3">
                    <button type="button" onClick={() => setAccModal("new")} className="neu-btn px-5 py-3 rounded-[15px] text-[#868da0] text-[13px] font-semibold">+ Account</button>
                    <button type="button" onClick={() => setTxnOpen(true)} className="neu-btn px-5 py-3 rounded-[15px] text-[#6fd6c3] text-[13px] font-semibold">+ Transaction</button>
                </div>
            </div>
            {insight && (
                <div className="self-start inline-flex items-center gap-2 neu-inset px-4 py-2 rounded-[13px] text-[12.5px] italic text-[#6fd6c3]">
                    ✦ {insight}
                </div>
            )}
            {delErr && <p className="text-xs text-[#f2a86f]">{delErr}</p>}

            {/* Accounts */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-[22px]">
                {accounts.length === 0 && (
                    <p className="col-span-full italic text-[#868da0] text-sm">No accounts yet — add one to start tracking.</p>
                )}
                {accounts.map((acc) => (
                    <GlassCard key={acc.id} className={`group rounded-[22px] px-6 py-[22px] ${CARD_HOVER}`}>
                        <div className="flex items-center justify-between gap-2.5">
                            <span className="min-w-0 truncate text-[13px] text-[#868da0]">{acc.name}</span>
                            <span className="flex flex-none items-center gap-2">
                                <span className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        type="button"
                                        onClick={() => setAccModal(acc)}
                                        className="text-[#868da0] hover:text-[#d3d7e0] transition-colors"
                                        aria-label={`Edit ${acc.name}`}
                                    >
                                        <EditIcon />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => { setDelErr(null); setConfirmDel({ kind: "account", id: acc.id, name: acc.name }); }}
                                        className="text-[#868da0] hover:text-[#f2a86f] transition-colors"
                                        aria-label={`Delete ${acc.name}`}
                                    >
                                        <DeleteIcon />
                                    </button>
                                </span>
                                <span
                                    className="h-[9px] w-[9px] flex-none rounded-full"
                                    style={{
                                        background: acc.type === "investment" ? "#f2a86f" : "#6fd6c3",
                                        boxShadow: `0 0 8px ${acc.type === "investment" ? "rgba(242,168,111,0.6)" : "rgba(111,214,195,0.6)"}`,
                                    }}
                                />
                            </span>
                        </div>
                        <p className="mt-[9px] text-2xl font-bold tabular-nums text-[#f0f2f6]">${acc.balance.toLocaleString()}</p>
                        <p className="mt-[5px] text-[11px] font-semibold uppercase tracking-[0.06em] text-[#5c6270]">{acc.type}</p>
                    </GlassCard>
                ))}
            </div>

            {/* Budget envelopes */}
            <GlassCard className="rounded-[26px] px-[30px] py-[26px]">
                <div className="flex items-center justify-between">
                    <h2 className="text-base font-semibold text-[#e3e6ec]">Budget envelopes</h2>
                    <button type="button" onClick={() => setBudgetModal("new")} className={HEADER_BTN}>+ Category</button>
                </div>
                {budgets.length === 0 ? (
                    <p className="mt-4 italic text-[#868da0] text-sm">No categories yet — create an envelope to start budgeting.</p>
                ) : (
                    <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 gap-[22px]">
                        {budgets.map((b) => {
                            const spent = spendByCategory(b.category);
                            const over = spent > b.limit_amount;
                            const pct = b.limit_amount > 0 ? Math.min(1, spent / b.limit_amount) : 0;
                            return (
                                <div key={b.id} className="group">
                                    <div className="neu-inset relative h-[110px] overflow-hidden rounded-[18px]">
                                        <div
                                            className="absolute inset-x-0 bottom-0 transition-[height] duration-[600ms] [transition-timing-function:cubic-bezier(0.23,1,0.32,1)]"
                                            style={{
                                                height: `${Math.round(pct * 100)}%`,
                                                background: over
                                                    ? "linear-gradient(180deg, rgba(242,168,111,0.45), rgba(242,168,111,0.22))"
                                                    : "linear-gradient(180deg, rgba(111,214,195,0.34), rgba(111,214,195,0.16))",
                                            }}
                                        />
                                        <div className="relative flex items-start justify-between px-4 py-3.5">
                                            <div className="min-w-0">
                                                <p
                                                    className="truncate text-[13.5px] font-semibold"
                                                    style={{
                                                        color: pct > 0.5 ? "#f5f7fa" : "#e3e6ec",
                                                        textShadow: pct > 0.5 ? "0 1px 3px rgba(0,0,0,0.55)" : "none",
                                                    }}
                                                >
                                                    {b.category}
                                                </p>
                                                <p
                                                    className="mt-[3px] text-[11.5px] tabular-nums"
                                                    style={{
                                                        color: pct > 0.5 ? "rgba(245,247,250,0.88)" : "#868da0",
                                                        textShadow: pct > 0.5 ? "0 1px 3px rgba(0,0,0,0.55)" : "none",
                                                    }}
                                                >
                                                    ${spent.toFixed(0)} spent
                                                </p>
                                            </div>
                                            <span className="flex flex-none gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    type="button"
                                                    onClick={() => setBudgetModal(b)}
                                                    className="text-[#868da0] hover:text-[#d3d7e0] transition-colors"
                                                    aria-label={`Edit ${b.category} category`}
                                                >
                                                    <EditIcon />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => { setDelErr(null); setConfirmDel({ kind: "category", id: b.id, name: b.category }); }}
                                                    className="text-[#868da0] hover:text-[#f2a86f] transition-colors"
                                                    aria-label={`Delete ${b.category} category`}
                                                >
                                                    <DeleteIcon />
                                                </button>
                                            </span>
                                        </div>
                                    </div>
                                    <div className="mt-2 flex justify-between px-1 text-[11.5px] tabular-nums">
                                        <span className={`font-semibold ${over ? "text-[#f2a86f]" : "text-[#868da0]"}`}>
                                            {over ? `over by $${(spent - b.limit_amount).toFixed(0)}` : `${Math.round(pct * 100)}% used`}
                                        </span>
                                        <span className="text-[#5c6270]">limit ${b.limit_amount.toLocaleString()}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </GlassCard>

            {/* Transactions */}
            <GlassCard className="rounded-[26px] px-[30px] py-[26px]">
                <h2 className="text-base font-semibold text-[#e3e6ec]">Recent transactions</h2>
                {sorted.length === 0 ? (
                    <p className="mt-3.5 italic text-[#868da0] text-sm">No transactions this month</p>
                ) : (
                    <div className="mt-3.5 flex flex-col gap-1.5">
                        {sorted.map((t) => (
                            <div key={t.id} className="group flex items-center gap-[15px] rounded-[14px] px-1 py-[9px] transition-colors hover:bg-white/[0.025]">
                                <div
                                    className="neu-pill flex h-10 w-10 flex-none items-center justify-center rounded-[13px] text-sm font-bold"
                                    style={{ color: t.amount >= 0 ? "#6fd6c3" : "#868da0" }}
                                >
                                    {(t.description || t.category).charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-[13.5px] font-semibold text-[#d3d7e0]">{t.description || t.category}</p>
                                    <p className="mt-px text-xs text-[#868da0]">{t.category} · {fmtDate(t.date)}</p>
                                </div>
                                <span className={`flex-none text-sm font-semibold tabular-nums ${t.amount >= 0 ? "text-[#6fd6c3]" : "text-[#c3c8d4]"}`}>
                                    {t.amount >= 0 ? "+" : "−"}${Math.abs(t.amount).toFixed(2)}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => { setDelErr(null); setConfirmDel({ kind: "transaction", id: t.id, name: t.description || t.category }); }}
                                    className="flex-none text-[#868da0] opacity-0 transition-opacity hover:text-[#f2a86f] group-hover:opacity-100"
                                    aria-label="Delete transaction"
                                >
                                    <DeleteIcon />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </GlassCard>

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
