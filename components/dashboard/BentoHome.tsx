"use client";
import { useEffect, useOptimistic, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { updateTaskStatus, createTask } from "@/app/dashboard/tasks/actions";
import { logHabit } from "@/app/dashboard/habits/actions";
import { NotchRing, CheckBox } from "@/components/ui/neu";

// Neumorphic bento home — ported from the "Dashboard redesign: neumorphism style"
// claude.ai/design project and wired to live AXIOM data via existing server actions.

export interface BentoTask { id: string; title: string; priority: 1 | 2 | 3 | 4; status: string; due_date: string | null }
export interface BentoData {
    finance: {
        total: number;
        income: number;
        spending: number;
        bars: { month: string; income: number; spending: number }[];
        transactions: { id: string; description: string; category: string; date: string; amount: number }[];
    };
    habits: { id: string; name: string; streak: number; done: boolean }[];
    heat: number[];
    goals: { id: string; title: string; pct: number; current: string; target: string; deadline: string | null }[];
    tasks: BentoTask[];
    today: BentoTask[];
}

const COOL = "#6fd6c3";
const WARM = "#f2a86f";
const TX_COLORS = ["#6fd6c3", "#f2a86f", "#8fe4d4", "#c8813f", "#5fd9a4"];

const CARD =
    "glass p-7 transition-[transform,box-shadow] duration-200 [transition-timing-function:cubic-bezier(0.23,1,0.32,1)] " +
    "hover:-translate-y-[3px] hover:[box-shadow:-12px_-12px_30px_rgba(255,255,255,0.055),16px_16px_36px_rgba(0,0,0,0.62)]";
const H = "text-base font-semibold text-[#e3e6ec]";

function money(n: number) {
    return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtDay(d: string) {
    return new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/* ── Balance + 6-month bars ────────────────────────────────────────────────── */
function BalanceCard({ finance }: { finance: BentoData["finance"] }) {
    const [int, dec] = money(finance.total).split(".");
    const net = finance.income - finance.spending;
    const max = Math.max(1, ...finance.bars.flatMap((b) => [b.income, b.spending]));
    return (
        <>
            <div className="flex items-start justify-between gap-5">
                <div>
                    <div className="text-[13px] font-medium text-[#868da0]">Total balance</div>
                    <div className="mt-1 text-[46px] font-bold leading-none tracking-[-0.02em] tabular-nums text-[#f0f2f6]">
                        ${int}<span className="text-[26px] text-[#868da0]">.{dec}</span>
                    </div>
                    <div className="neu-pill mt-2.5 inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[12.5px] font-semibold" style={{ color: net >= 0 ? COOL : WARM }}>
                        {net >= 0 ? "▲" : "▼"} {net >= 0 ? "saved" : "over by"} ${money(Math.abs(net))} this month
                    </div>
                </div>
                <div className="flex flex-col gap-3">
                    {([["Income", finance.income, COOL], ["Spending", finance.spending, WARM]] as const).map(([label, amt, color]) => (
                        <div key={label} className="neu-inset flex items-center gap-2.5 rounded-[15px] px-4 py-3">
                            <span className="h-2.5 w-2.5 flex-none rounded-full" style={{ background: color, boxShadow: `0 0 8px ${color}99` }} />
                            <span className="text-[13px] text-[#868da0]">{label}</span>
                            <span className="ml-auto text-[15px] font-semibold tabular-nums text-[#e3e6ec]">${amt.toLocaleString("en-US", { maximumFractionDigits: 0 })}</span>
                        </div>
                    ))}
                </div>
            </div>
            <div className="mt-7 flex h-[158px] items-end gap-0">
                {finance.bars.map((b) => (
                    <div key={b.month} className="flex flex-1 flex-col items-center justify-end gap-2.5" style={{ height: "100%" }}>
                        <div className="flex flex-1 items-end gap-[7px]">
                            <div title={`Income $${b.income.toFixed(0)}`} style={{ width: 17, height: Math.max(3, (b.income / max) * 132), borderRadius: "7px 7px 3px 3px", background: "linear-gradient(180deg, rgba(111,214,195,0.85), rgba(111,214,195,0.45))", boxShadow: "-2px -2px 5px rgba(255,255,255,0.04), 3px 3px 7px rgba(0,0,0,0.4)" }} />
                            <div title={`Spending $${b.spending.toFixed(0)}`} style={{ width: 17, height: Math.max(3, (b.spending / max) * 132), borderRadius: "7px 7px 3px 3px", background: "linear-gradient(180deg, rgba(242,168,111,0.85), rgba(242,168,111,0.45))", boxShadow: "-2px -2px 5px rgba(255,255,255,0.04), 3px 3px 7px rgba(0,0,0,0.4)" }} />
                        </div>
                        <div className="text-[11.5px] font-medium text-[#5c6270]">{b.month}</div>
                    </div>
                ))}
            </div>
        </>
    );
}

/* ── Goals rings ───────────────────────────────────────────────────────────── */
function GoalsCard({ goals }: { goals: BentoData["goals"] }) {
    return (
        <>
            <div className={H}>Goals</div>
            <div className="mt-6 flex flex-wrap justify-between gap-3">
                {goals.length === 0 && <p className="text-sm text-[#868da0]">No active goals.</p>}
                {goals.slice(0, 3).map((g) => (
                    <div key={g.id} className="flex min-w-[96px] flex-1 flex-col items-center gap-3 text-center">
                        <div className="w-full max-w-[100px]" style={{ aspectRatio: "1" }}>
                            <NotchRing pct={g.pct} size={100} label={`${g.pct}%`} />
                        </div>
                        <div>
                            <div className="text-[13.5px] font-semibold text-[#d3d7e0]">{g.title}</div>
                            <div className="mt-0.5 text-[11.5px] tabular-nums text-[#868da0]">{g.current} / {g.target}</div>
                            <div className="mt-0.5 text-[11px]" style={{ color: g.deadline ? COOL : "#5c6270" }}>
                                {g.deadline ? `by ${fmtDay(g.deadline)}` : "no deadline"}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </>
    );
}

/* ── Habits list + heatmap ─────────────────────────────────────────────────── */
const HEAT = [
    { background: "rgba(0,0,0,0.22)", boxShadow: "inset 2px 2px 4px rgba(0,0,0,0.4), inset -1px -1px 3px rgba(255,255,255,0.03)" },
    { background: "rgba(111,214,195,0.22)" },
    { background: "rgba(111,214,195,0.42)" },
    { background: "rgba(111,214,195,0.68)" },
    { background: COOL, boxShadow: "0 0 6px rgba(111,214,195,0.45)" },
];

function HabitsCard({ habits, heat }: { habits: BentoData["habits"]; heat: number[] }) {
    const router = useRouter();
    const [, startTransition] = useTransition();
    const [optimistic, markDone] = useOptimistic(habits, (state, id: string) => state.map((h) => (h.id === id ? { ...h, done: true } : h)));
    const done = optimistic.filter((h) => h.done).length;
    const weeks = Math.round(heat.length / 7);
    return (
        <>
            <div className="flex items-baseline justify-between">
                <div className={H}>Habits</div>
                <div className="text-[12.5px] tabular-nums text-[#868da0]">{done} of {optimistic.length} today</div>
            </div>
            <div className="mt-5 flex flex-col gap-3">
                {optimistic.length === 0 && <p className="text-sm text-[#868da0]">No habits yet — add one in the Habits tab.</p>}
                {optimistic.slice(0, 5).map((h) => (
                    <div key={h.id} className="flex items-center gap-3">
                        <CheckBox
                            done={h.done}
                            round
                            label={h.name}
                            onClick={() => { if (!h.done) startTransition(async () => { markDone(h.id); await logHabit(h.id); router.refresh(); }); }}
                        />
                        <span className="min-w-0 truncate text-[13.5px] font-medium" style={{ color: h.done ? "#868da0" : "#d3d7e0" }}>{h.name}</span>
                        <span className="neu-pill ml-auto flex-none rounded-[10px] px-2.5 py-1 text-[11.5px] font-semibold tabular-nums" style={{ color: WARM }}>{h.streak} d</span>
                    </div>
                ))}
            </div>
            <div className="mt-6">
                <div className="mb-2.5 text-[12px] font-medium text-[#868da0]">Last {weeks} weeks</div>
                <div className="overflow-x-auto" style={{ display: "grid", gridTemplateRows: "repeat(7, 12px)", gridAutoFlow: "column", gridAutoColumns: "12px", gap: 4.5 }}>
                    {heat.map((c, i) => (
                        <div key={i} style={{ width: 12, height: 12, borderRadius: 3.5, ...HEAT[c <= 0 ? 0 : Math.min(4, c)] }} />
                    ))}
                </div>
            </div>
        </>
    );
}

/* ── Tasks ─────────────────────────────────────────────────────────────────── */
function TasksCard({ tasks }: { tasks: BentoTask[] }) {
    const router = useRouter();
    const [pending, startTransition] = useTransition();
    const [title, setTitle] = useState("");
    const [optimistic, apply] = useOptimistic(
        tasks,
        (state, action: { type: "add"; task: BentoTask } | { type: "toggle"; id: string }) =>
            action.type === "add"
                ? [...state, action.task]
                : state.map((t) => (t.id === action.id ? { ...t, status: t.status === "done" ? "todo" : "done" } : t)),
    );
    const remaining = optimistic.filter((t) => t.status !== "done").length;

    const add = () => {
        const label = title.trim();
        if (!label || pending) return;
        const fd = new FormData();
        fd.set("title", label);
        fd.set("priority", "3");
        setTitle("");
        startTransition(async () => {
            apply({ type: "add", task: { id: crypto.randomUUID(), title: label, priority: 3, status: "todo", due_date: null } });
            await createTask(fd);
            router.refresh();
        });
    };

    return (
        <>
            <div className="flex items-baseline justify-between">
                <div className={H}>Tasks</div>
                <div className="text-[12.5px] font-semibold tabular-nums" style={{ color: WARM }}>{remaining} left</div>
            </div>
            <div className="mt-5 flex flex-1 flex-col gap-3 overflow-y-auto">
                {optimistic.length === 0 && <p className="text-sm text-[#868da0]">All caught up 🎉</p>}
                {optimistic.map((t) => {
                    const done = t.status === "done";
                    return (
                        <div key={t.id} className="flex items-center gap-3">
                            <CheckBox done={done} label={t.title} onClick={() => startTransition(async () => { apply({ type: "toggle", id: t.id }); await updateTaskStatus(t.id, done ? "todo" : "done"); router.refresh(); })} />
                            <span className="min-w-0 truncate text-[13.5px] font-medium" style={{ color: done ? "#5c6270" : "#d3d7e0", textDecoration: done ? "line-through" : "none" }}>{t.title}</span>
                        </div>
                    );
                })}
            </div>
            <div className="mt-5 flex gap-3">
                <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") add(); }}
                    placeholder="Add a task"
                    aria-label="Add a task"
                    className="neu-inset min-w-0 flex-1 rounded-[14px] border-none px-4 py-3 text-[13.5px] text-[#d3d7e0] outline-none"
                />
                <button onClick={add} aria-label="Add task" className="neu-btn flex h-[43px] w-[43px] flex-none items-center justify-center rounded-[14px] text-[20px] font-semibold" style={{ color: COOL }}>+</button>
            </div>
        </>
    );
}

/* ── Today's agenda ────────────────────────────────────────────────────────── */
function TodayCard({ today }: { today: BentoTask[] }) {
    const now = new Date().toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
    const PRIO = { 1: "#f2a86f", 2: "#f2a86f", 3: COOL, 4: "#5c6270" } as const;
    return (
        <>
            <div className="flex items-baseline justify-between">
                <div className={H}>Today</div>
                <div className="text-[12.5px] text-[#868da0]">{now}</div>
            </div>
            <div className="mt-4 flex flex-1 flex-col gap-1 overflow-y-auto">
                {today.length === 0 && <p className="text-sm text-[#868da0]">Nothing due today.</p>}
                {today.map((t) => {
                    const overdue = t.due_date && new Date(t.due_date) < new Date(new Date().toDateString());
                    return (
                        <div key={t.id} className="flex gap-4 py-2.5">
                            <div className="w-11 flex-none pt-0.5 text-right text-[12.5px] font-semibold" style={{ color: overdue ? WARM : "#868da0" }}>{overdue ? "Late" : "Due"}</div>
                            <span className="mt-1.5 h-2 w-2 flex-none rounded-full" style={{ background: PRIO[t.priority], boxShadow: `0 0 7px ${PRIO[t.priority]}99` }} />
                            <div className="min-w-0">
                                <div className="truncate text-[13.5px] font-semibold text-[#d3d7e0]">{t.title}</div>
                                <div className="mt-0.5 text-[12px] text-[#868da0]">P{t.priority}{t.due_date ? ` · ${fmtDay(t.due_date)}` : ""}</div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </>
    );
}

/* ── Transactions ──────────────────────────────────────────────────────────── */
function TransactionsCard({ transactions }: { transactions: BentoData["finance"]["transactions"] }) {
    return (
        <>
            <div className="flex items-center justify-between">
                <div className={H}>Transactions</div>
                <Link href="/dashboard/finance" className="neu-btn rounded-xl px-4 py-2 text-[12.5px] font-semibold" style={{ color: COOL }}>View all</Link>
            </div>
            <div className="mt-3.5 flex flex-col gap-1.5">
                {transactions.length === 0 && <p className="text-sm text-[#868da0]">No transactions yet.</p>}
                {transactions.map((t, i) => {
                    const color = TX_COLORS[i % TX_COLORS.length];
                    return (
                        <div key={t.id} className="flex items-center gap-4 rounded-[14px] px-1 py-2.5 transition-colors hover:bg-white/[0.025]">
                            <div className="flex h-9 w-9 flex-none items-center justify-center rounded-full text-[13px] font-bold text-[#1d1f24]" style={{ background: color }}>
                                {(t.description || t.category || "?").charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="truncate text-[13.5px] font-semibold text-[#d3d7e0]">{t.description || t.category}</div>
                                <div className="mt-0.5 text-[12px] text-[#868da0]">{t.category} · {fmtDay(t.date)}</div>
                            </div>
                            <div className="text-[13.5px] font-semibold tabular-nums" style={{ color: t.amount > 0 ? COOL : "#d3d7e0" }}>
                                {t.amount > 0 ? "+" : "−"}${money(Math.abs(t.amount))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </>
    );
}

/* ── Quick notes ───────────────────────────────────────────────────────────── */
function NotesCard() {
    const [note, setNote] = useState("");
    const [status, setStatus] = useState("Saved");
    const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    useEffect(() => { setNote(localStorage.getItem("axiom-quick-note") ?? ""); }, []);
    return (
        <>
            <div className="flex items-baseline justify-between">
                <div className={H}>Quick notes</div>
                <div className="text-[12px] text-[#868da0]">{status}</div>
            </div>
            <textarea
                value={note}
                onChange={(e) => {
                    setNote(e.target.value);
                    setStatus("Typing…");
                    clearTimeout(timer.current);
                    timer.current = setTimeout(() => {
                        localStorage.setItem("axiom-quick-note", e.target.value);
                        setStatus("Saved");
                    }, 900);
                }}
                placeholder="Jot something down…"
                className="neu-inset mt-4 min-h-[170px] flex-1 resize-none rounded-[18px] border-none px-5 py-4 text-[14px] leading-[1.6] text-[#d3d7e0] outline-none"
            />
        </>
    );
}

export function BentoHome({ data }: { data: BentoData }) {
    const greeting = (() => {
        const h = new Date().getHours();
        return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
    })();
    const sub = new Date().toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
    return (
        <div style={{ animation: "paneIn 320ms cubic-bezier(0.23,1,0.32,1) both" }}>
            <div className="mt-9">
                <div className="text-[27px] font-semibold tracking-[-0.01em] text-[#eceef3]">{greeting}</div>
                <div className="mt-0.5 text-[14px] text-[#868da0]">{sub}</div>
            </div>
            <main className="mt-7 grid grid-cols-1 gap-7 lg:grid-cols-12">
                <section className={`${CARD} lg:col-span-7`}><BalanceCard finance={data.finance} /></section>
                <section className={`${CARD} lg:col-span-5`}><GoalsCard goals={data.goals} /></section>
                <section className={`${CARD} flex flex-col lg:col-span-4`}><HabitsCard habits={data.habits} heat={data.heat} /></section>
                <section className={`${CARD} flex flex-col lg:col-span-4`}><TasksCard tasks={data.tasks} /></section>
                <section className={`${CARD} flex flex-col lg:col-span-4`}><TodayCard today={data.today} /></section>
                <section className={`${CARD} lg:col-span-7`}><TransactionsCard transactions={data.finance.transactions} /></section>
                <section className={`${CARD} flex flex-col lg:col-span-5`}><NotesCard /></section>
            </main>
        </div>
    );
}
