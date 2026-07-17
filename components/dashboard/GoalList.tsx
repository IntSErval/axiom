"use client";
import { useEffect, useState, useTransition } from "react";
import { motion } from "framer-motion";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassModal } from "@/components/ui/GlassModal";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { WheelDatePicker, WheelSelect } from "@/components/ui/WheelDatePicker";
import { EditIcon, DeleteIcon } from "@/components/ui/icons";
import type { Goal, Milestone, MilestoneStatus, GoalCheckin, Habit, HabitLog, Budget, Transaction } from "@/lib/database";
import { deriveCurrent, activityDates } from "@/lib/goal-progress";
import {
    createGoal,
    updateGoal,
    updateGoalProgress,
    deleteGoal,
    createMilestone,
    toggleMilestone,
} from "@/app/dashboard/goals/actions";

const inputCls = "w-full rounded-lg bg-white/[0.05] border border-white/[0.08] px-3 py-2 text-zinc-50 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-blue-500";
const selectCls = `${inputCls} appearance-none`;
const labelCls = "block text-xs text-zinc-500 mb-1";

const DAY_MS = 86400000;

// ── Pace / retrospective math ──────────────────────────────────────────────
function computePace(goal: Goal, current: number) {
    if (!goal.deadline || goal.target_amount <= 0) return null;
    const created = new Date(goal.created_at).getTime();
    const deadline = new Date(goal.deadline + "T00:00:00").getTime();
    const totalDays = (deadline - created) / DAY_MS;
    if (totalDays <= 0) return null;
    const elapsedDays = Math.max((Date.now() - created) / DAY_MS, 0);
    // + = behind schedule, − = ahead. Linear expectation from creation → deadline.
    const behindDays = elapsedDays - (current / goal.target_amount) * totalDays;
    const velocity = elapsedDays > 0.04 ? current / elapsedDays : 0;
    const projected = velocity > 0 ? new Date(created + (goal.target_amount / velocity) * DAY_MS) : null;
    return { behindDays, projected };
}

function computeRetro(goal: Goal, activity: string[]) {
    const finished = goal.completed_at ?? goal.created_at;
    const days = Math.max(1, Math.round((new Date(finished).getTime() - new Date(goal.created_at).getTime()) / DAY_MS));
    // ponytail: UTC day buckets for streaks — switch to local-tz buckets if anyone notices
    const dayKeys = [...new Set(activity)].sort();
    let longest = dayKeys.length ? 1 : 0;
    let run = 1;
    for (let i = 1; i < dayKeys.length; i++) {
        const gap = (new Date(dayKeys[i] + "T00:00:00Z").getTime() - new Date(dayKeys[i - 1] + "T00:00:00Z").getTime()) / DAY_MS;
        run = gap === 1 ? run + 1 : 1;
        if (run > longest) longest = run;
    }
    return { days, count: activity.length, longest };
}

function fmtDate(d: Date) {
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// ── Goal form (create / edit) ──────────────────────────────────────────────
function GoalForm({ initial, habits, budgets, onDone }: { initial?: Goal; habits: Habit[]; budgets: Budget[]; onDone: () => void }) {
    const [pending, startTransition] = useTransition();
    const [deadline, setDeadline] = useState(initial?.deadline ?? "");
    const [habitId, setHabitId] = useState(initial?.habit_id ?? "");
    const [category, setCategory] = useState(initial?.category ?? "");
    const categories = [...new Set(budgets.map((b) => b.category))];

    function submit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        fd.set("deadline", deadline);
        fd.set("habit_id", habitId);
        fd.set("category", category);
        startTransition(async () => {
            try {
                if (initial) {
                    fd.set("id", initial.id);
                    await updateGoal(fd);
                } else {
                    await createGoal(fd);
                }
                onDone();
            } catch (err) {
                alert((err as Error).message);
            }
        });
    }
    return (
        <form onSubmit={submit} className="space-y-4 mt-2">
            <div>
                <label htmlFor="goal-title" className={labelCls}>Title</label>
                <input id="goal-title" name="title" type="text" required defaultValue={initial?.title} placeholder="Goal title" className={inputCls} />
            </div>
            <div>
                <label htmlFor="goal-target" className={labelCls}>Target Amount</label>
                <input id="goal-target" name="target_amount" type="number" required min="0" step="any" defaultValue={initial?.target_amount} placeholder="0" className={inputCls} />
            </div>
            <div>
                <span className={labelCls}>Deadline (optional)</span>
                <WheelDatePicker value={deadline} onChange={setDeadline} placeholder="No deadline" />
            </div>
            <div>
                <span className={labelCls}>Linked habit (optional) — each habit log counts toward this goal</span>
                <WheelSelect
                    options={[{ value: "", label: "None" }, ...habits.map((h) => ({ value: h.id, label: h.name }))]}
                    value={habitId}
                    onChange={setHabitId}
                />
            </div>
            <div>
                <span className={labelCls}>Linked category (optional) — progress auto-tracks its transactions</span>
                <WheelSelect
                    options={[{ value: "", label: "None" }, ...categories.map((c) => ({ value: c, label: c }))]}
                    value={category}
                    onChange={setCategory}
                />
            </div>
            {initial && (
                <div>
                    <label htmlFor="goal-status" className={labelCls}>Status</label>
                    <select id="goal-status" name="status" defaultValue={initial.status} className={selectCls}>
                        <option value="active">Active</option>
                        <option value="completed">Completed</option>
                        <option value="abandoned">Abandoned</option>
                    </select>
                </div>
            )}
            <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={onDone} className="px-4 py-2 rounded-lg text-zinc-400 hover:text-zinc-50 text-sm">
                    Cancel
                </button>
                <button type="submit" disabled={pending} className="px-4 py-2 rounded-lg bg-violet-500/20 hover:bg-violet-500/30 text-violet-400 border border-violet-500/30 text-sm disabled:opacity-50">
                    {pending ? "Saving…" : initial ? "Save" : "Create"}
                </button>
            </div>
        </form>
    );
}

// ── Milestone form ─────────────────────────────────────────────────────────
function MilestoneForm({ goalId, onDone }: { goalId: string; onDone: () => void }) {
    const [pending, startTransition] = useTransition();
    const [dueDate, setDueDate] = useState("");
    function submit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        fd.set("goal_id", goalId);
        fd.set("due_date", dueDate);
        startTransition(async () => {
            try {
                await createMilestone(fd);
                onDone();
            } catch (err) {
                alert((err as Error).message);
            }
        });
    }
    return (
        <form onSubmit={submit} className="space-y-4 mt-2">
            <div>
                <label htmlFor="ms-title" className={labelCls}>Title</label>
                <input id="ms-title" name="title" type="text" required placeholder="Milestone title" className={inputCls} />
            </div>
            <div>
                <label htmlFor="ms-target" className={labelCls}>Target Amount</label>
                <input id="ms-target" name="target_amount" type="number" required min="0" step="any" placeholder="0" className={inputCls} />
            </div>
            <div>
                <span className={labelCls}>Due Date (optional)</span>
                <WheelDatePicker value={dueDate} onChange={setDueDate} placeholder="No due date" />
            </div>
            <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={onDone} className="px-4 py-2 rounded-lg text-zinc-400 hover:text-zinc-50 text-sm">
                    Cancel
                </button>
                <button type="submit" disabled={pending} className="px-4 py-2 rounded-lg bg-violet-500/20 hover:bg-violet-500/30 text-violet-400 border border-violet-500/30 text-sm disabled:opacity-50">
                    {pending ? "Adding…" : "Add"}
                </button>
            </div>
        </form>
    );
}

// ── Main component ─────────────────────────────────────────────────────────
export function GoalList({
    goals: initialGoals,
    milestones: initialMilestones,
    checkins: initialCheckins,
    habits,
    budgets,
    habitLogs,
    transactions,
}: {
    goals: Goal[];
    milestones: Milestone[];
    checkins: GoalCheckin[];
    habits: Habit[];
    budgets: Budget[];
    habitLogs: HabitLog[];
    transactions: Transaction[];
}) {
    const [goals, setGoals] = useState(initialGoals);
    const [milestones, setMilestones] = useState(initialMilestones);
    const [checkins, setCheckins] = useState(initialCheckins);

    // Re-sync when server data refreshes after revalidatePath
    useEffect(() => setGoals(initialGoals), [initialGoals]);
    useEffect(() => setMilestones(initialMilestones), [initialMilestones]);
    useEffect(() => setCheckins(initialCheckins), [initialCheckins]);

    const [insight, setInsight] = useState<string | null>(null);

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
        fetch("/api/nim/goals-agent", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ goals: initialGoals, milestones: initialMilestones }),
        })
            .then(r => r.json())
            .then(d => setInsight(d.insight ?? null))
            .catch(() => {}); // silently fail — AI is non-critical
    }, []);

    const [newGoalOpen, setNewGoalOpen] = useState(false);
    const [editGoal, setEditGoal] = useState<Goal | null>(null);
    const [msGoalId, setMsGoalId] = useState<string | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<Goal | null>(null);

    const [progressInputs, setProgressInputs] = useState<Record<string, string>>(
        () => Object.fromEntries(initialGoals.map((g) => [g.id, String(g.current_amount)]))
    );
    const [, startTransition] = useTransition();

    function handleDelete(goal: Goal) {
        const prev = goals;
        setGoals((gs) => gs.filter((g) => g.id !== goal.id));
        startTransition(async () => {
            try {
                await deleteGoal(goal.id);
            } catch (err) {
                setGoals(prev);
                alert((err as Error).message);
            }
        });
    }

    function handleProgressUpdate(goal: Goal) {
        const val = Number(progressInputs[goal.id]);
        if (isNaN(val) || val < 0) { alert("Invalid amount"); return; }
        const prevGoals = goals;
        const prevCheckins = checkins;
        const now = new Date().toISOString();
        const done = val >= goal.target_amount && goal.status === "active";
        setGoals((gs) => gs.map((g) => g.id === goal.id
            ? { ...g, current_amount: val, ...(done && { status: "completed" as const, completed_at: now }) }
            : g));
        setCheckins((cs) => [...cs, { id: `tmp-${now}`, goal_id: goal.id, amount: val, created_at: now }]);
        setProgressInputs((p) => ({ ...p, [goal.id]: String(val) }));
        startTransition(async () => {
            try {
                await updateGoalProgress(goal.id, val);
            } catch (err) {
                setGoals(prevGoals);
                setCheckins(prevCheckins);
                setProgressInputs((p) => ({ ...p, [goal.id]: String(goal.current_amount) }));
                alert((err as Error).message);
            }
        });
    }

    function handleToggleMilestone(ms: Milestone) {
        const prev = milestones;
        const next: MilestoneStatus = ms.status === "achieved" ? "pending" : "achieved";
        setMilestones((all) => all.map((m) => m.id === ms.id ? { ...m, status: next } : m));
        startTransition(async () => {
            try {
                await toggleMilestone(ms.id, ms.status);
            } catch (err) {
                setMilestones(prev);
                alert((err as Error).message);
            }
        });
    }

    function renderGoalCard(goal: Goal) {
        const linkedHabit = goal.habit_id ? habits.find((h) => h.id === goal.habit_id) : undefined;
        const derived = deriveCurrent(goal, habitLogs, transactions);
        const current = derived ?? goal.current_amount;
        const pct = Math.min(100, goal.target_amount > 0 ? (current / goal.target_amount) * 100 : 0);
        const goalMilestones = milestones.filter((m) => m.goal_id === goal.id);
        const activity = activityDates(goal, habitLogs, transactions)
            ?? checkins.filter((c) => c.goal_id === goal.id).map((c) => c.created_at.slice(0, 10));
        const isCompleted = goal.status === "completed";
        const pace = isCompleted ? null : computePace(goal, current);
        const retro = isCompleted ? computeRetro(goal, activity) : null;

        return (
            <GlassCard key={goal.id} className="p-5 group relative">
                <div className="flex justify-between mb-2">
                    <span className="text-zinc-50 font-medium">{goal.title}</span>
                    <div className="flex items-center gap-3">
                        <span className="text-violet-400 italic">{pct.toFixed(0)}%</span>
                        <button
                            type="button"
                            onClick={() => setEditGoal(goal)}
                            className="text-zinc-600 hover:text-zinc-50 opacity-0 group-hover:opacity-100 transition-opacity"
                            aria-label="Edit goal"
                        >
                            <EditIcon />
                        </button>
                        <button
                            type="button"
                            onClick={() => setDeleteTarget(goal)}
                            className="text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                            aria-label="Delete goal"
                        >
                            <DeleteIcon />
                        </button>
                    </div>
                </div>

                <div className="h-2 rounded-full bg-white/[0.05] overflow-hidden mb-2">
                    <motion.div
                        className={`h-full rounded-full ${isCompleted ? "bg-emerald-400" : "bg-violet-500"}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                    />
                </div>

                {pace && (
                    <div className={`text-[11px] mb-2 ${
                        pace.behindDays >= 1 ? "text-rose-300"
                        : pace.behindDays <= -1 ? "text-emerald-300"
                        : "text-white/45"
                    }`}>
                        {pace.behindDays >= 1
                            ? `⌛ ${Math.round(pace.behindDays)}d behind pace`
                            : pace.behindDays <= -1
                            ? `⚡ ${Math.round(-pace.behindDays)}d ahead of pace`
                            : "● on pace"}
                        {pace.projected
                            ? ` · projected ${fmtDate(pace.projected)}`
                            : " · no progress yet"}
                        {goal.deadline && ` · due ${fmtDate(new Date(goal.deadline + "T00:00:00"))}`}
                    </div>
                )}

                {retro && (
                    <div className="mb-2 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.07] px-3 py-2 text-[11px] text-emerald-300">
                        ✓ Finished in {retro.days} {retro.days === 1 ? "day" : "days"}
                        {" · "}{retro.count} check-in{retro.count === 1 ? "" : "s"}
                        {retro.longest > 1 && <> · 🔥 longest streak {retro.longest}d</>}
                    </div>
                )}

                {(goal.category || linkedHabit) && (
                    <div className="flex flex-col gap-1 mb-3 text-[11px]">
                        {goal.category && (
                            <div className="text-[#4fd8c8]">💰 Auto-tracked from <b>{goal.category}</b> transactions</div>
                        )}
                        {linkedHabit && (
                            <div className="text-[#5fd9a4]">
                                🔥 {linkedHabit.streak}-day streak on <b>{linkedHabit.name}</b>
                                {!goal.category && " · each log counts toward this goal"}
                            </div>
                        )}
                    </div>
                )}

                {!isCompleted && derived === null && (
                    <div className="flex items-center gap-2 mb-3">
                        <input
                            type="number"
                            min="0"
                            max={goal.target_amount}
                            step="any"
                            value={progressInputs[goal.id] ?? ""}
                            onChange={(e) => setProgressInputs((p) => ({ ...p, [goal.id]: e.target.value }))}
                            className="w-32 rounded-lg bg-white/[0.05] border border-white/[0.08] px-2 py-1 text-sm text-zinc-50 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            aria-label="Current amount"
                        />
                        <span className="text-zinc-500 text-sm">/ {goal.target_amount}</span>
                        <button
                            type="button"
                            onClick={() => handleProgressUpdate(goal)}
                            className="px-3 py-1 rounded-lg bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.08] text-zinc-300 text-sm"
                        >
                            Update
                        </button>
                    </div>
                )}
                {!isCompleted && derived !== null && (
                    <div className="mb-3 text-sm text-zinc-500">
                        {current.toLocaleString()} / {goal.target_amount.toLocaleString()}
                    </div>
                )}

                <div className="flex gap-2 flex-wrap items-center">
                    {goalMilestones.map((m) => (
                        <button
                            key={m.id}
                            type="button"
                            onClick={() => handleToggleMilestone(m)}
                            className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                                m.status === "achieved"
                                    ? "border-green-500/30 text-green-400 hover:border-green-500/60"
                                    : "border-white/[0.08] text-zinc-500 hover:text-zinc-300"
                            }`}
                        >
                            {m.title}
                        </button>
                    ))}
                    {!isCompleted && (
                        <button
                            type="button"
                            onClick={() => setMsGoalId(goal.id)}
                            className="text-xs text-zinc-500 hover:text-zinc-50 px-2 py-1 transition-colors"
                        >
                            + Milestone
                        </button>
                    )}
                </div>
            </GlassCard>
        );
    }

    const activeGoals = goals.filter((g) => g.status === "active");
    const completedGoals = goals.filter((g) => g.status === "completed");

    return (
        <div className="max-w-2xl mx-auto py-8 space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold italic text-zinc-50">Goals</h1>
                <button
                    type="button"
                    onClick={() => setNewGoalOpen(true)}
                    className="px-4 py-2 rounded-lg bg-violet-500/20 hover:bg-violet-500/30 text-violet-400 border border-violet-500/30 text-sm font-medium"
                >
                    + New Goal
                </button>
            </div>
            {insight && (
                <div className="mt-3 flex items-center gap-2 text-sm">
                    <span className="px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 italic">
                        ✦ {insight}
                    </span>
                </div>
            )}

            {activeGoals.map(renderGoalCard)}

            {completedGoals.length > 0 && (
                <>
                    <div className="pt-4 text-[11px] font-semibold uppercase tracking-[.14em] text-white/45">
                        Completed
                    </div>
                    {completedGoals.map(renderGoalCard)}
                </>
            )}

            <GlassModal open={newGoalOpen} onOpenChange={setNewGoalOpen} title="New Goal">
                <GoalForm habits={habits} budgets={budgets} onDone={() => setNewGoalOpen(false)} />
            </GlassModal>

            <GlassModal open={!!editGoal} onOpenChange={(v) => { if (!v) setEditGoal(null); }} title="Edit Goal">
                {editGoal && <GoalForm key={editGoal.id} initial={editGoal} habits={habits} budgets={budgets} onDone={() => setEditGoal(null)} />}
            </GlassModal>

            <GlassModal open={!!msGoalId} onOpenChange={(v) => { if (!v) setMsGoalId(null); }} title="Add Milestone">
                {msGoalId && <MilestoneForm goalId={msGoalId} onDone={() => setMsGoalId(null)} />}
            </GlassModal>

            <ConfirmModal
                open={!!deleteTarget}
                onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}
                title="Delete goal?"
                message={deleteTarget ? `Delete "${deleteTarget.title}"? Its milestones and check-in history go with it. This cannot be undone.` : ""}
                onConfirm={() => { if (deleteTarget) handleDelete(deleteTarget); }}
            />
        </div>
    );
}
