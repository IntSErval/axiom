"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateTaskStatus, createTask } from "@/app/dashboard/tasks/actions";
import { logHabit } from "@/app/dashboard/habits/actions";
import { ParticleBrain } from "@/components/background/ParticleBrain";

// Bento-grid dashboard home, ported from the Productivity Dashboard claude.ai/design project
// and wired to live AXIOM data via existing server actions.

export interface BentoTask { id: string; title: string; priority: 1 | 2 | 3 | 4; status: string; due_date: string | null }
export interface BentoData {
    finance: {
        total: number;
        income: number;
        spending: number;
        spark: number[];
        transactions: { id: string; description: string; category: string; date: string; amount: number }[];
    };
    habits: { id: string; name: string; streak: number; week: number; done: boolean }[];
    goals: { id: string; title: string; pct: number; current: string; target: string; deadline: string | null }[];
    tasks: BentoTask[];
    today: BentoTask[];
}

const ACCENTS = ["#4fd8c8", "#8da6ff", "#a78bfa", "#5fd9a4", "#f2a5c0"];
const PRIO_DOT: Record<number, string> = {
    1: "rgba(242,140,140,0.8)",
    2: "rgba(240,200,120,0.7)",
    3: "rgba(141,166,255,0.5)",
    4: "rgba(255,255,255,0.18)",
};
const LABEL = "text-[11px] font-semibold uppercase tracking-[0.14em] text-white/45";

function money(n: number) {
    return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtDay(d: string) {
    return new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function tiltAllowed() {
    return window.matchMedia("(hover: hover) and (pointer: fine)").matches
        && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function TiltCard({ className = "", children }: { className?: string; children: React.ReactNode }) {
    const ref = useRef<HTMLElement>(null);
    return (
        <section
            ref={ref}
            data-tilt
            className={`glass flex flex-col overflow-hidden p-6 ${className}`}
            onMouseMove={(e) => {
                const el = ref.current;
                if (!el || !tiltAllowed()) return;
                const r = el.getBoundingClientRect();
                const px = (e.clientX - r.left) / r.width - 0.5;
                const py = (e.clientY - r.top) / r.height - 0.5;
                el.style.transform = `perspective(1100px) rotateX(${(-py * 4.5).toFixed(2)}deg) rotateY(${(px * 6.5).toFixed(2)}deg) translateY(-5px) scale(1.012)`;
            }}
            onMouseEnter={() => {
                const el = ref.current;
                if (!el || !tiltAllowed()) return;
                el.style.transition = "transform .16s ease-out, filter .5s ease, opacity .5s ease";
                el.style.zIndex = "5";
            }}
            onMouseLeave={() => {
                const el = ref.current;
                if (!el) return;
                el.style.transition = "transform .7s cubic-bezier(.22,1,.36,1), filter .5s ease, opacity .5s ease";
                el.style.transform = "perspective(1100px) rotateX(0deg) rotateY(0deg) translateY(0) scale(1)";
                el.style.zIndex = "";
            }}
        >
            {children}
        </section>
    );
}

function Sparkline({ values }: { values: number[] }) {
    const v = values.length >= 2 ? values : [0, 0];
    const min = Math.min(...v), max = Math.max(...v);
    const span = max - min || 1;
    const pts = v.map((y, i) => `${(i * 260 / (v.length - 1)).toFixed(1)},${(60 - ((y - min) / span) * 51).toFixed(1)}`);
    const last = pts[pts.length - 1].split(",");
    return (
        <svg viewBox="0 0 260 70" className="mt-6 h-[76px] w-full overflow-visible">
            <polygon points={`${pts.join(" ")} 260,70 0,70`} fill="rgba(120,170,255,0.12)" />
            <polyline points={pts.join(" ")} fill="none" stroke="rgba(130,175,255,0.9)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx={last[0]} cy={last[1]} r="4" fill="#a5c6ff" />
        </svg>
    );
}

function FinanceCard({ finance }: { finance: BentoData["finance"] }) {
    const [view, setView] = useState<"ov" | "tx">("ov");
    const [int, dec] = money(finance.total).split(".");
    if (view === "tx") {
        return (
            <div className="flex h-full flex-col">
                <div className="flex items-center gap-2.5">
                    <button
                        onClick={() => setView("ov")}
                        className="h-[30px] w-[30px] cursor-pointer rounded-[10px] border border-white/[0.12] bg-white/[0.06] text-[15px] text-white/80 transition-colors hover:bg-white/[0.12]"
                        aria-label="Back to overview"
                    >‹</button>
                    <span className={LABEL}>Transactions</span>
                </div>
                <div className="-mr-2 mt-4 flex flex-1 flex-col gap-1.5 overflow-y-auto pr-2">
                    {finance.transactions.length === 0 && <p className="text-sm text-white/40">No transactions yet.</p>}
                    {finance.transactions.map((t) => (
                        <div key={t.id} className="flex items-center justify-between rounded-[14px] px-3 py-2.5 transition-colors hover:bg-white/[0.05]">
                            <div className="min-w-0">
                                <div className="truncate text-[13.5px] font-medium">{t.description}</div>
                                <div className="mt-0.5 text-[11px] text-white/40">{t.category} · {fmtDay(t.date)}</div>
                            </div>
                            <span className={`text-[13.5px] font-semibold ${t.amount > 0 ? "text-[#5fd9a4]" : "text-white/80"}`}>
                                {t.amount > 0 ? "+" : "−"}${money(Math.abs(t.amount))}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        );
    }
    return (
        <div className="flex h-full flex-col">
            <div className="flex items-center justify-between">
                <span className={LABEL}>Finance</span>
                <span className="h-2 w-2 rounded-full bg-[rgba(120,170,255,0.9)] shadow-[0_0_12px_rgba(120,170,255,0.8)]" />
            </div>
            <div className="mt-5 text-[13px] text-white/50">Total balance</div>
            <div className="mt-1 text-[42px] font-semibold leading-[1.1] tracking-[-1.5px]">
                ${int}<span className="text-2xl text-white/50">.{dec}</span>
            </div>
            <Sparkline values={finance.spark} />
            <div className="mt-5 grid grid-cols-2 gap-3">
                {([["Income", finance.income, "linear-gradient(90deg,#5fd9a4,#4fc9d8)"], ["Spending", finance.spending, "linear-gradient(90deg,#a78bfa,#8da6ff)"]] as const).map(([label, amt, grad]) => {
                    const denom = Math.max(finance.income, finance.spending) || 1;
                    return (
                        <div key={label} className="rounded-2xl border border-white/[0.07] bg-white/[0.04] p-3.5">
                            <div className="text-[11px] text-white/45">{label}</div>
                            <div className="mt-0.5 text-lg font-semibold">${amt.toLocaleString("en-US", { maximumFractionDigits: 0 })}</div>
                            <div className="mt-2.5 h-1 overflow-hidden rounded-sm bg-white/[0.08]">
                                <div className="h-full rounded-sm" style={{ width: `${Math.round((amt / denom) * 100)}%`, background: grad }} />
                            </div>
                        </div>
                    );
                })}
            </div>
            <div className="flex-1" />
            <button
                onClick={() => setView("tx")}
                className="mt-4 w-full cursor-pointer rounded-[14px] border border-white/[0.12] bg-white/[0.06] p-3 text-[13px] font-semibold text-white/85 transition-[background,transform] hover:-translate-y-px hover:bg-white/[0.11] active:scale-[0.98]"
            >
                View transactions →
            </button>
        </div>
    );
}

function HabitsCard({ habits }: { habits: BentoData["habits"] }) {
    const router = useRouter();
    const [, startTransition] = useTransition();
    return (
        <>
            <div className="flex items-center justify-between">
                <span className={LABEL}>Habits</span>
                <span className="text-xs text-white/40">{habits.filter(h => h.done).length} of {habits.length} today</span>
            </div>
            <div className="mt-2 flex flex-1 flex-wrap items-center justify-around gap-2">
                {habits.length === 0 && <p className="text-sm text-white/40">No habits yet — add one in the Habits tab.</p>}
                {habits.map((h, i) => {
                    const color = ACCENTS[i % ACCENTS.length];
                    // ponytail: ring = completions in the last 7 days, matching the design; per-frequency targets when needed
                    const dash = (Math.min(h.week / 7, 1) * 163.4).toFixed(1);
                    return (
                        <button
                            key={h.id}
                            title={h.done ? "Done today" : "Mark done today"}
                            onClick={() => { if (!h.done) startTransition(async () => { await logHabit(h.id); router.refresh(); }); }}
                            className="flex cursor-pointer flex-col items-center gap-2 rounded-[18px] border-none bg-transparent px-2.5 py-2 transition-[background,transform] hover:-translate-y-[3px] hover:bg-white/[0.05] active:scale-95"
                        >
                            <span className="relative block h-[62px] w-[62px]">
                                <svg width="62" height="62" viewBox="0 0 62 62" className="block">
                                    <circle cx="31" cy="31" r="26" fill="none" stroke="rgba(255,255,255,0.09)" strokeWidth="5" />
                                    <circle cx="31" cy="31" r="26" fill="none" stroke={h.done ? color : "rgba(255,255,255,0.35)"} strokeWidth="5" strokeLinecap="round" strokeDasharray={`${dash} 163.4`} transform="rotate(-90 31 31)" style={{ transition: "stroke-dasharray .7s cubic-bezier(.34,1.4,.5,1), stroke .4s ease" }} />
                                </svg>
                                <span className="absolute inset-0 flex flex-col items-center justify-center text-base font-bold" style={{ color: h.done ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.55)" }}>
                                    {h.streak}
                                    <span className="-mt-px text-[8px] font-semibold uppercase tracking-[0.1em] text-white/35">day</span>
                                </span>
                            </span>
                            <span className="text-xs font-medium" style={{ color: h.done ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.45)" }}>{h.name}</span>
                            <span className="h-[5px] w-[5px] rounded-full" style={{ background: h.done ? color : "rgba(255,255,255,0.15)", boxShadow: h.done ? `0 0 8px ${color}` : "none" }} />
                        </button>
                    );
                })}
            </div>
        </>
    );
}

function GoalsCard({ goals }: { goals: BentoData["goals"] }) {
    const [expanded, setExpanded] = useState<string | null>(null);
    return (
        <>
            <span className={LABEL}>Goals</span>
            <div className="-mr-2 mt-3.5 flex flex-1 flex-col gap-1 overflow-y-auto pr-2">
                {goals.length === 0 && <p className="text-sm text-white/40">No active goals.</p>}
                {goals.map((g, i) => {
                    const color = ACCENTS[(i + 1) % ACCENTS.length];
                    return (
                        <div key={g.id} className="rounded-[14px] transition-colors hover:bg-white/[0.04]">
                            <button onClick={() => setExpanded(expanded === g.id ? null : g.id)} className="w-full cursor-pointer border-none bg-transparent px-2.5 pb-3 pt-2.5 text-left text-inherit">
                                <div className="flex items-baseline justify-between gap-2">
                                    <span className="text-[13.5px] font-medium">{g.title}</span>
                                    <span className="text-xs font-semibold" style={{ color }}>{g.pct}%</span>
                                </div>
                                <div className="mt-2 h-1.5 overflow-hidden rounded-[3px] bg-white/[0.08]">
                                    <div className="h-full rounded-[3px] transition-[width] duration-700" style={{ width: `${g.pct}%`, background: `linear-gradient(90deg,${color}cc,${color})`, boxShadow: `0 0 10px ${color}55` }} />
                                </div>
                            </button>
                            {expanded === g.id && (
                                <div className="flex gap-2.5 px-2.5 pb-3.5 pt-0.5">
                                    {([["Current", g.current, undefined], ["Target", g.target, undefined], ["Deadline", g.deadline ? fmtDay(g.deadline) : "—", "#5fd9a4"]] as const).map(([label, val, valColor]) => (
                                        <div key={label} className="flex-1 rounded-xl border border-white/[0.07] bg-white/[0.04] p-2.5">
                                            <div className="text-[10px] uppercase tracking-[0.06em] text-white/40">{label}</div>
                                            <div className="mt-0.5 text-[13px] font-semibold" style={valColor ? { color: valColor } : undefined}>{val}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </>
    );
}

function TasksCard({ tasks }: { tasks: BentoTask[] }) {
    const router = useRouter();
    const [pending, startTransition] = useTransition();
    const [title, setTitle] = useState("");
    const remaining = tasks.filter(t => t.status !== "done").length;

    const add = () => {
        const label = title.trim();
        if (!label || pending) return;
        const fd = new FormData();
        fd.set("title", label);
        fd.set("priority", "3");
        setTitle("");
        startTransition(async () => { await createTask(fd); router.refresh(); });
    };

    return (
        <>
            <div className="flex items-center justify-between">
                <span className={LABEL}>Tasks</span>
                <span className="rounded-full border border-white/10 bg-white/[0.07] px-2.5 py-0.5 text-[11px] font-semibold text-white/60">{remaining} left</span>
            </div>
            <div className="mt-3.5 flex gap-2">
                <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") add(); }}
                    placeholder="Add a task…"
                    aria-label="Add a task"
                    className="min-w-0 flex-1 rounded-[13px] border border-white/10 bg-white/[0.05] px-3.5 py-2.5 text-[13px] text-white/90 transition-colors focus:border-[rgba(130,175,255,0.5)] focus:bg-white/[0.08]"
                />
                <button
                    onClick={add}
                    aria-label="Add task"
                    className="w-10 cursor-pointer rounded-[13px] border border-[rgba(130,175,255,0.35)] bg-[rgba(130,175,255,0.15)] text-[19px] text-[#a5c6ff] transition-[background,transform] hover:bg-[rgba(130,175,255,0.25)] active:scale-[0.94]"
                >+</button>
            </div>
            <div className="-mr-2 mt-3 flex flex-1 flex-col gap-[3px] overflow-y-auto pr-2">
                {tasks.length === 0 && <p className="text-sm text-white/40">All caught up 🎉</p>}
                {tasks.map((t) => {
                    const done = t.status === "done";
                    return (
                        <button
                            key={t.id}
                            onClick={() => startTransition(async () => { await updateTaskStatus(t.id, done ? "todo" : "done"); router.refresh(); })}
                            className="flex cursor-pointer items-center gap-3 rounded-[13px] border-none bg-transparent p-2.5 text-left text-inherit transition-colors hover:bg-white/[0.05]"
                        >
                            <span
                                className="flex h-[21px] w-[21px] flex-none items-center justify-center rounded-full border-[1.5px] text-[11px] font-extrabold text-[#0a0c14] transition-colors"
                                style={{ borderColor: done ? "#8da6ff" : "rgba(255,255,255,0.3)", background: done ? "linear-gradient(135deg,#a5c6ff,#8da6ff)" : "transparent" }}
                            >{done ? "✓" : ""}</span>
                            <span className={`flex-1 truncate text-[13.5px] font-medium ${done ? "text-white/35 line-through" : "text-white/90"}`}>{t.title}</span>
                            <span className="h-1.5 w-1.5 flex-none rounded-full" style={{ background: done ? "transparent" : PRIO_DOT[t.priority] }} />
                        </button>
                    );
                })}
            </div>
        </>
    );
}

function TodayCard({ today }: { today: BentoTask[] }) {
    const now = new Date().toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
    return (
        <>
            <div className="flex items-center justify-between">
                <span className={LABEL}>Today</span>
                <span className="text-xs text-white/40">{now}</span>
            </div>
            <div className="-mr-2 mt-3.5 flex flex-1 flex-col gap-[5px] overflow-y-auto pr-2">
                {today.length === 0 && <p className="text-sm text-white/40">Nothing due today.</p>}
                {today.map((t) => {
                    const overdue = t.due_date && new Date(t.due_date) < new Date(new Date().toDateString());
                    return (
                        <div key={t.id} className="flex items-center gap-3 rounded-xl px-2.5 py-2 transition-colors hover:bg-white/[0.05]">
                            <span className={`w-[52px] flex-none text-[11.5px] font-semibold ${overdue ? "text-[#f28c8c]" : "text-white/50"}`}>
                                {overdue ? "Overdue" : "Due"}
                            </span>
                            <span className="h-[26px] w-[3px] flex-none rounded-sm" style={{ background: PRIO_DOT[t.priority] }} />
                            <div className="min-w-0">
                                <div className="truncate text-[13px] font-medium">{t.title}</div>
                                <div className="text-[11px] text-white/40">P{t.priority}{t.due_date ? ` · ${fmtDay(t.due_date)}` : ""}</div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </>
    );
}

function NotesCard() {
    const [note, setNote] = useState("");
    const [status, setStatus] = useState("Saved");
    const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    // ponytail: localStorage persistence — move to a Supabase notes table when cross-device sync matters
    useEffect(() => { setNote(localStorage.getItem("axiom-quick-note") ?? ""); }, []);
    return (
        <>
            <div className="flex items-center justify-between">
                <span className={LABEL}>Quick notes</span>
                <span className="text-[11px] text-white/30">{status}</span>
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
                className="mt-3 flex-1 resize-none border-none bg-transparent font-sans text-[13.5px] leading-[1.65] text-white/85"
            />
        </>
    );
}

export function BentoHome({ data }: { data: BentoData }) {
    return (
        <main className="bento grid grid-cols-1 gap-5 py-8 md:grid-cols-2 lg:auto-rows-[minmax(240px,auto)] lg:grid-cols-12">
            <TiltCard className="lg:col-span-3 lg:row-span-3"><FinanceCard finance={data.finance} /></TiltCard>
            <TiltCard className="lg:col-span-6"><HabitsCard habits={data.habits} /></TiltCard>
            <div className="hidden lg:col-span-3 lg:row-span-2 lg:block"><ParticleBrain /></div>
            <TiltCard className="lg:col-span-3"><GoalsCard goals={data.goals} /></TiltCard>
            <TiltCard className="lg:col-span-3 lg:row-span-2"><TasksCard tasks={data.tasks} /></TiltCard>
            <TiltCard className="lg:col-span-3"><TodayCard today={data.today} /></TiltCard>
            <TiltCard className="lg:col-span-3"><NotesCard /></TiltCard>
        </main>
    );
}
