"use client";
import { useEffect, useState, useTransition } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { NotchRing } from "@/components/ui/neu";
import { GlassModal } from "@/components/ui/GlassModal";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { WheelDatePicker, WheelSelect } from "@/components/ui/WheelDatePicker";
import { EditIcon, DeleteIcon } from "@/components/ui/icons";
import type { Goal, Milestone, MilestoneStatus, GoalCheckin, Habit, HabitLog, Budget, Transaction } from "@/lib/database";
import { deriveCurrent, activityDates } from "@/lib/goal-progress";
import { computePace, computeMomentum, formatGoalAmount } from "@/lib/goal-calc";
import {
    createGoal,
    updateGoal,
    updateGoalProgress,
    deleteGoal,
    createMilestone,
    toggleMilestone,
} from "@/app/dashboard/goals/actions";

const inputCls = "w-full neu-inset rounded-[12px] border-none px-3 py-2.5 text-[#d3d7e0] placeholder:text-[#5c6270] outline-none";
const selectCls = `${inputCls} appearance-none`;
const labelCls = "block text-xs text-[#868da0] mb-1";

const DAY_MS = 86400000;

// ── Retrospective math ─────────────────────────────────────────────────────
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
    const [goalType, setGoalType] = useState<"money" | "count">(initial?.goal_type ?? "money");
    const [unit, setUnit] = useState(initial?.unit ?? "");
    const categories = [...new Set(budgets.map((b) => b.category))];

    function submit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        fd.set("deadline", deadline);
        fd.set("habit_id", habitId);
        fd.set("category", category);
        fd.set("goal_type", goalType);
        fd.set("unit", goalType === "count" ? unit : "");
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
                <span className={labelCls}>Type</span>
                <div className="flex gap-2">
                    {(["money", "count"] as const).map((t) => (
                        <button
                            key={t}
                            type="button"
                            onClick={() => setGoalType(t)}
                            className={`neu-btn flex-1 rounded-[12px] px-3 py-2.5 text-sm font-semibold ${
                                goalType === t
                                    ? "text-[#6fd6c3] [box-shadow:inset_3px_3px_7px_rgba(0,0,0,0.5),inset_-3px_-3px_7px_rgba(255,255,255,0.035)]"
                                    : "text-[#868da0]"
                            }`}
                        >
                            {t === "money" ? "Money" : "Count"}
                        </button>
                    ))}
                </div>
            </div>
            <div>
                <label htmlFor="goal-title" className={labelCls}>Title</label>
                <input id="goal-title" name="title" type="text" required defaultValue={initial?.title} placeholder="Goal title" className={inputCls} />
            </div>
            <div className={goalType === "count" ? "flex gap-3" : ""}>
                <div className="flex-1">
                    <label htmlFor="goal-target" className={labelCls}>
                        {goalType === "money" ? "Target amount ($)" : "Target count"}
                    </label>
                    <input
                        id="goal-target"
                        name="target_amount"
                        type="number"
                        required
                        min="0"
                        step={goalType === "count" ? "1" : "any"}
                        defaultValue={initial?.target_amount}
                        placeholder="0"
                        className={inputCls}
                    />
                </div>
                {goalType === "count" && (
                    <div className="w-[42%]">
                        <label htmlFor="goal-unit" className={labelCls}>Unit (optional)</label>
                        <input
                            id="goal-unit"
                            type="text"
                            value={unit}
                            onChange={(e) => setUnit(e.target.value)}
                            placeholder="e.g. books, times"
                            className={inputCls}
                        />
                    </div>
                )}
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
                <button type="button" onClick={onDone} className="neu-btn px-4 py-2 rounded-[13px] text-sm font-semibold text-[#868da0] hover:text-[#d3d7e0]">
                    Cancel
                </button>
                <button type="submit" disabled={pending} className="neu-btn px-4 py-2 rounded-[13px] text-[#6fd6c3] text-sm font-semibold disabled:opacity-50">
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
                <button type="button" onClick={onDone} className="neu-btn px-4 py-2 rounded-[13px] text-sm font-semibold text-[#868da0] hover:text-[#d3d7e0]">
                    Cancel
                </button>
                <button type="submit" disabled={pending} className="neu-btn px-4 py-2 rounded-[13px] text-[#6fd6c3] text-sm font-semibold disabled:opacity-50">
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
        const momentum = isCompleted ? null : computeMomentum(goal, current, activity);
        const retro = isCompleted ? computeRetro(goal, activity) : null;

        const behind = !!pace && pace.behindDays >= 1;
        return (
            <GlassCard
                key={goal.id}
                className={`group flex gap-6 rounded-[24px] px-7 py-6 transition-[transform,box-shadow] duration-200 [transition-timing-function:cubic-bezier(0.23,1,0.32,1)] hover:-translate-y-[2px] hover:[box-shadow:-10px_-10px_24px_rgba(255,255,255,0.055),13px_13px_30px_rgba(0,0,0,0.62)] ${isCompleted ? "opacity-80" : ""}`}
            >
                <div className="self-center">
                    <NotchRing pct={pct} size={86} label={`${pct.toFixed(0)}%`} temp={momentum?.temp} />
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3.5">
                        <span className="text-base font-semibold text-[#e3e6ec]">{goal.title}</span>
                        <span className="flex flex-none items-center gap-3">
                            <span className="text-[12.5px] tabular-nums text-[#868da0]">
                                {formatGoalAmount(goal, current)} / {formatGoalAmount(goal, goal.target_amount)}
                            </span>
                            <button
                                type="button"
                                onClick={() => setEditGoal(goal)}
                                className="text-[#868da0] hover:text-[#d3d7e0] opacity-0 group-hover:opacity-100 transition-opacity"
                                aria-label="Edit goal"
                            >
                                <EditIcon />
                            </button>
                            <button
                                type="button"
                                onClick={() => setDeleteTarget(goal)}
                                className="text-[#868da0] hover:text-[#f2a86f] opacity-0 group-hover:opacity-100 transition-opacity"
                                aria-label="Delete goal"
                            >
                                <DeleteIcon />
                            </button>
                        </span>
                    </div>

                    {momentum && (
                        <div className="mt-2 flex items-center gap-2">
                            <span
                                className="neu-inset inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold"
                                style={{ color: momentum.temp === "hot" || momentum.temp === "warm" ? "#6fd6c3" : "#f2a86f" }}
                            >
                                <span aria-hidden>{momentum.temp === "hot" ? "🔥" : momentum.temp === "cold" ? "❄️" : "◐"}</span>
                                {momentum.temp === "hot" ? "Hot streak" : momentum.temp === "warm" ? "On track" : momentum.temp === "cool" ? "Cooling" : "Cold"}
                            </span>
                        </div>
                    )}

                    {pace && (
                        <div className={`mt-[7px] text-xs font-semibold ${behind ? "text-[#f2a86f]" : "text-[#6fd6c3]"}`}>
                            {pace.behindDays >= 1
                                ? `${Math.round(pace.behindDays)} d behind pace`
                                : pace.behindDays <= -1
                                ? `${Math.round(-pace.behindDays)} d ahead of pace`
                                : "On pace"}
                            {pace.projected
                                ? ` · projected ${fmtDate(pace.projected)}`
                                : " · no progress yet"}
                            {goal.deadline && ` · due ${fmtDate(new Date(goal.deadline + "T00:00:00"))}`}
                        </div>
                    )}

                    {retro && (
                        <div className="mt-[7px] text-xs text-[#868da0]">
                            Finished in {retro.days} {retro.days === 1 ? "day" : "days"}
                            {" · "}{retro.count} check-in{retro.count === 1 ? "" : "s"}
                            {retro.longest > 1 && <> · longest run {retro.longest} d</>}
                        </div>
                    )}

                    {(goal.category || linkedHabit) && (
                        <div className="mt-1 text-xs text-[#868da0]">
                            {goal.category
                                ? <>Auto-tracked from <b className="text-[#6fd6c3]">{goal.category}</b> transactions</>
                                : linkedHabit && (
                                    <>Linked to <b className="text-[#6fd6c3]">{linkedHabit.name}</b> — each log counts toward this goal</>
                                )}
                        </div>
                    )}

                    <div className="mt-3.5 flex flex-wrap items-center gap-2.5">
                        {goalMilestones.map((m) => {
                            const achieved = m.status === "achieved";
                            return (
                                <button
                                    key={m.id}
                                    type="button"
                                    onClick={() => handleToggleMilestone(m)}
                                    className={`neu-btn rounded-[11px] px-3.5 py-[7px] text-[11.5px] font-semibold ${
                                        achieved
                                            ? "text-[#6fd6c3] [box-shadow:inset_3px_3px_7px_rgba(0,0,0,0.5),inset_-3px_-3px_7px_rgba(255,255,255,0.035)]"
                                            : "text-[#868da0]"
                                    }`}
                                >
                                    {m.title}
                                </button>
                            );
                        })}
                        {!isCompleted && (
                            <button
                                type="button"
                                onClick={() => setMsGoalId(goal.id)}
                                className="rounded-[11px] px-2 py-[7px] text-[11.5px] font-semibold text-[#868da0] hover:text-[#d3d7e0] transition-colors"
                            >
                                + Milestone
                            </button>
                        )}
                        {!isCompleted && derived === null && (
                            <div className="ml-auto flex items-center gap-2">
                                <input
                                    type="number"
                                    min="0"
                                    max={goal.target_amount}
                                    step="any"
                                    value={progressInputs[goal.id] ?? ""}
                                    onChange={(e) => setProgressInputs((p) => ({ ...p, [goal.id]: e.target.value }))}
                                    className="neu-inset w-[86px] rounded-[11px] border-none px-3 py-2 text-right text-[12.5px] tabular-nums text-[#d3d7e0] outline-none"
                                    aria-label="Current amount"
                                />
                                <button
                                    type="button"
                                    onClick={() => handleProgressUpdate(goal)}
                                    className="neu-btn rounded-[11px] px-[15px] py-2 text-xs font-semibold text-[#6fd6c3]"
                                >
                                    Update
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </GlassCard>
        );
    }

    const activeGoals = goals.filter((g) => g.status === "active");
    const completedGoals = goals.filter((g) => g.status === "completed");

    return (
        <div className="flex flex-col gap-[22px] py-8 [animation:paneIn_320ms_cubic-bezier(0.23,1,0.32,1)_both]">
            <div className="flex items-center justify-between gap-4">
                <h1 className="text-[25px] font-semibold tracking-[-0.01em] text-[#eceef3]">Goals</h1>
                <button
                    type="button"
                    onClick={() => setNewGoalOpen(true)}
                    className="neu-btn px-5 py-3 rounded-[15px] text-[#6fd6c3] text-[13px] font-semibold"
                >
                    + New goal
                </button>
            </div>
            {insight && (
                <div className="self-start inline-flex items-center gap-2 neu-inset px-4 py-2 rounded-[13px] text-[12.5px] italic text-[#6fd6c3]">
                    ✦ {insight}
                </div>
            )}

            {activeGoals.map(renderGoalCard)}

            {completedGoals.length > 0 && (
                <>
                    <div className="pt-1.5 text-[11.5px] font-semibold uppercase tracking-[0.12em] text-[#5c6270]">
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
